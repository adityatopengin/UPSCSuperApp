/**
 * SERVICE WORKER - The Offline Guardian
 * Version: 5.2.0
 * Strategy:
 * 1. App Shell (HTML/JS/CSS): Cache First (Instant Load)
 * 2. Data (JSON): Stale-While-Revalidate (Instant Load + Background Update)
 * 3. External (Fonts/Icons): Cache First
 */

const CACHE_NAME = 'upsc-superapp-v5.2.0';
const DATA_CACHE_NAME = 'upsc-data-v5.2.0';

// CORE ASSETS: These must be present for the app to start.
// If any of these fail to fetch, the Service Worker will not install.
const APP_SHELL = [
    './',
    './index.html',
    './assets/css/style.css',
    './assets/js/config.js',
    './assets/js/store.js',
    './assets/js/adapter.js',
    './assets/js/engine.js',
    './assets/js/ui.js',
    './assets/js/PredictiveEngine.js',
    './assets/js/StudyTracker.js',
    './assets/js/main.js',
    // Include the manifest if you have one
    // './manifest.json' 
];

// 1. INSTALL PHASE
// Triggers when the browser sees a new service worker version.
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version:', CACHE_NAME);

    // Force this SW to become the active one immediately, 
    // skipping the "waiting" state.
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching App Shell');
                return cache.addAll(APP_SHELL);
            })
            .catch((error) => {
                console.error('[SW] Pre-cache failed:', error);
                // If pre-caching fails, we don't want to install a broken SW
                throw error;
            })
    );
});

// ... Continues in Batch 2 ...
// 2. ACTIVATE PHASE
// Triggers when the new SW takes control. Used for cleanup.
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version...');

    // Take control of all open tabs immediately
    event.waitUntil(self.clients.claim());

    // Clean up old caches (Memory Management)
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // If the cache key doesn't match current version, delete it.
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[SW] Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// 3. FETCH STRATEGIES (The Router)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // STRATEGY A: STALE-WHILE-REVALIDATE (For Data/JSON)
    // 1. Return cached data immediately (Fast).
    // 2. Fetch fresh data from network in background.
    // 3. Update cache with fresh data for next time.
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // Define the network fetch logic
                    const fetchPromise = fetch(event.request)
                        .then((networkResponse) => {
                            // Update cache with new data
                            if (networkResponse.status === 200) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch((err) => {
                            console.warn('[SW] Background update failed:', err);
                            // It's okay if this fails, user has cached version
                        });

                    // Return cached response if available, else wait for network
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return; // Exit fetch handler for data requests
    }

    // ... Continues in Batch 3 ...

    // STRATEGY B: CACHE FIRST, FALLBACK TO NETWORK
    // Applied to: App Shell files, CSS, JS, Images, Fonts
    event.respondWith(
        caches.match(event.request).then((response) => {
            // 1. Cache Hit - Return immediately
            if (response) {
                return response;
            }

            // 2. Cache Miss - Fetch from Network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    // External resources (like CDNs) have type 'cors', pass them through
                    if (networkResponse && networkResponse.type === 'cors') {
                        return networkResponse; 
                    }
                    return networkResponse;
                }

                // 3. Dynamic Caching
                // We clone the response because it's a stream and can only be consumed once.
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch((err) => {
                // 4. OFFLINE FALLBACK (The Safety Net)
                console.error('[SW] Network request failed (Offline):', err);

                // If the user tried to navigate to a page (HTML) and failed,
                // return the cached Home Screen (index.html).
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                // Optional: You could return a placeholder image for failed image loads here
                // if (event.request.destination === 'image') { ... }
            });
        })
    );
});
