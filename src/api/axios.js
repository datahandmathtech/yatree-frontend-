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

export default instance;
