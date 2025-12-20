/**
 * SERVICE WORKER - The Offline Guardian
 * Updated Version: 6.0.0 (Intro Deck & Audio Support)
 */

const CACHE_NAME = 'upsc-superapp-v6.0.0'; // CHANGED: Version bump triggers update
const DATA_CACHE_NAME = 'upsc-data-v6.0.0';

// CORE ASSETS: These must be present for the app to start.
// I have added the new Audio file here so it works offline immediately.
const APP_SHELL = [
    './',
    './index.html',
    './manifest.json', // Enabled: Vital for installation
    './assets/css/style.css',
    
    // Core Logic
    './assets/js/config.js',
    './assets/js/store.js',
    './assets/js/adapter.js',
    './assets/js/engine.js',
    './assets/js/ui.js',
    './assets/js/PredictiveEngine.js',
    './assets/js/StudyTracker.js',
    './assets/js/main.js',

    // NEW ASSETS (Crucial for the new Intro)
    './assets/audio/disclaimer.mp3' 
];

// 1. INSTALL PHASE
// Triggers when the browser sees the new 'v6.0.0' name above.
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version:', CACHE_NAME);

    // Force this SW to become the active one immediately, 
    // skipping the "waiting" state.
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching App Shell & Audio');
                return cache.addAll(APP_SHELL);
            })
            .catch((error) => {
                console.error('[SW] Pre-cache failed. Check if all files exist:', error);
                // If the audio file is missing in the folder, the SW will fail to install here.
                // This is a safety feature to ensure broken apps don't get cached.
            })
    );
});
// 2. ACTIVATE PHASE
// Triggers when the new SW takes control. Used for cleanup.
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating new version...');

    // Take control of all open tabs immediately
    event.waitUntil(self.clients.claim());

    // Clean up old caches (Memory Management)
    // This looks for any cache starting with 'upsc-' that matches OLD versions
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                // If the cache key doesn't match current version, delete it.
                // This deletes 'upsc-superapp-v5.2.0' automatically.
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
    // Used for question banks.
    // Logic: "Show me what you have in memory NOW (Fast), but go get the new version for next time."
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    // 1. Define the network fetch logic (The background update)
                    const fetchPromise = fetch(event.request)
                        .then((networkResponse) => {
                            // Update cache with new data if successful
                            if (networkResponse.status === 200) {
                                cache.put(event.request, networkResponse.clone());
                            }
                            return networkResponse;
                        })
                        .catch((err) => {
                            console.warn('[SW] Background update failed:', err);
                            // It's okay if this fails, user still sees cached data
                        });

                    // 2. Return cached response immediately if available, else wait for network
                    return cachedResponse || fetchPromise;
                });
            })
        );
        return; // Exit fetch handler here specifically for data requests
    }

    // ... Continues in Batch 3 ...
    // STRATEGY B: CACHE FIRST, FALLBACK TO NETWORK
    // Applied to: App Shell files, CSS, JS, Audio, Fonts
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
                    // External resources (like Google Fonts) have type 'cors', pass them through
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
                // This ensures the PWA opens even without internet.
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                // Fallback for missing audio (Optional)
                // If they try to play audio offline and it's not cached, we could return nothing
                // or handle it gracefully.
            });
        })
    );
});
