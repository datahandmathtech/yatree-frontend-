import axios from 'axios';

const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '' ||
    import.meta.env.DEV
);

const API_URL = isLocal ? '' : (import.meta.env.VITE_API_URL || '');

const instance = axios.create({
    baseURL: API_URL,
    timeout: 30000, 
});

// In-memory GET response cache & in-flight request deduplication for instant page transitions
const GET_CACHE = new Map();
const IN_FLIGHT_GETS = new Map();
const GET_CACHE_TTL_MS = 15 * 1000; // 15s fast cache, immediately cleared on any mutation

export const clearApiCache = () => {
    GET_CACHE.clear();
    IN_FLIGHT_GETS.clear();
};

instance.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const parsed = JSON.parse(userInfo);
                if (parsed && parsed.token) {
                    config.headers.Authorization = `Bearer ${parsed.token}`;
                }
            } catch (e) {
                console.error('Error parsing userInfo from localStorage', e);
            }
        }

        // Clear all cached GET responses whenever any write/mutation happens
        const method = (config.method || 'get').toLowerCase();
        if (method !== 'get') {
            GET_CACHE.clear();
        }
        return config;
    },
    (error) => Promise.reject(error)
);

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        
        // Auto-retry on 503 Service Unavailable (e.g. cold start) up to 2 times
        if (error.response && error.response.status === 503 && config && !config.__isRetry503) {
            config.__isRetry503 = (config.__isRetry503 || 0) + 1;
            if (config.__isRetry503 <= 2) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                return instance(config);
            }
        }

        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Wrap instance.get for in-flight deduplication and short-lived caching
const originalGet = instance.get.bind(instance);
instance.get = function (url, config = {}) {
    const bypass =
        config?.bypassCache ||
        url.includes('refresh=true') ||
        url.includes('bypassCache=true') ||
        url.includes('_t=') ||
        url.includes('/next-client-code/') ||
        url.includes('/check-phone/');

    const paramsKey = config?.params ? JSON.stringify(config.params) : '';
    const cacheKey = `${url}|${paramsKey}`;

    if (bypass) {
        GET_CACHE.delete(cacheKey);
    } else {
        const cached = GET_CACHE.get(cacheKey);
        if (cached && (Date.now() - cached.time < GET_CACHE_TTL_MS)) {
            return Promise.resolve({
                ...cached.response,
                data: Array.isArray(cached.response.data)
                    ? [...cached.response.data]
                    : (cached.response.data && typeof cached.response.data === 'object' ? { ...cached.response.data } : cached.response.data)
            });
        }
        if (IN_FLIGHT_GETS.has(cacheKey)) {
            return IN_FLIGHT_GETS.get(cacheKey);
        }
    }

    const reqPromise = originalGet(url, config)
        .then((res) => {
            if (!bypass && res && res.status === 200) {
                GET_CACHE.set(cacheKey, { response: res, time: Date.now() });
            }
            IN_FLIGHT_GETS.delete(cacheKey);
            return res;
        })
        .catch((err) => {
            IN_FLIGHT_GETS.delete(cacheKey);
            throw err;
        });

    if (!bypass) {
        IN_FLIGHT_GETS.set(cacheKey, reqPromise);
    }
    return reqPromise;
};

export default instance;
