/**
 * SERVICE WORKER - The Offline Enabler
 * Version: 5.0.0 (Gyan Amala Edition)
 * Strategy: Stale-While-Revalidate for Data, Cache-First for Shell.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const CACHE_NAME = 'gyan-amala-v5-core';
const DATA_CACHE_NAME = 'gyan-amala-v5-data';

// 1. ASSETS TO CACHE IMMEDIATELY (The App Shell)
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './style.css',
    './assets/js/config.js',
    './assets/js/store.js',
    './assets/js/StudyTracker.js',
    './assets/js/PredictiveEngine.js',
    './assets/js/adapter.js',
    './assets/js/engine.js',
    './assets/js/ui.js',
    './assets/js/main.js',
    './assets/images/Omg.jpg',
    './assets/audio/disclaimer.mp3'
];

// 2. INSTALL EVENT (Cache The Shell)
self.addEventListener('install', (event) => {
    console.log('[SW] Installing New Version:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching App Shell...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting(); // Force new SW to take over
});

// 3. ACTIVATE EVENT (Cleanup Old Caches)
self.addEventListener('activate', (event) => {
    console.log('[SW] Activated');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[SW] Removing Old Cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 4. FETCH EVENT (The Traffic Controller)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // STRATEGY A: DATA REQUESTS (JSON Files) -> Network First, Fallback to Cache
    // We want the latest questions if online, but offline access if not.
    if (url.pathname.includes('/data/')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return fetch(event.request)
                    .then((response) => {
                        // If successful, update the cache
                        if (response.status === 200) {
                            cache.put(event.request.url, response.clone());
                        }
                        return response;
                    })
                    .catch(() => {
                        // If offline, return cached data
                        console.log('[SW] Offline! Serving cached data:', event.request.url);
                        return cache.match(event.request);
                    });
            })
        );
        return;
    }

    // STRATEGY B: STATIC ASSETS (App Shell) -> Cache First, Fallback to Network
    // This ensures instant loading speeds.
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
