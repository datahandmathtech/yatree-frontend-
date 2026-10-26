import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.jsx'

import { ThemeProvider } from './context/ThemeContext'
import axios from 'axios'

// Prevent browser caching globally for all GET requests in the software
axios.interceptors.request.use((config) => {
    if (config.method === 'get') {
        config.params = { ...config.params, _t: new Date().getTime() };
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
    }
    return config;
});

createRoot(document.getElementById('root')).render(
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
)

// ⚡ Auto-reload when dynamic chunk fails due to a new deployment (Vite preload error)
window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const lastReload = sessionStorage.getItem('chunk_reload_retry');
    const now = Date.now();
    // Only reload once every 10 seconds to avoid reload loops
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('chunk_reload_retry', String(now));
        window.location.reload();
    }
});

// ⚡ Register Service Worker for PWA (Installability)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => { /* Service Worker registered silently */ })
            .catch(err => console.log('LogKaro PWA: Service Worker Failed', err));
    });
}
