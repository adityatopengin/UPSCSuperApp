/**
 * STORE.JS - The Hybrid Persistence Layer
 * Version: 5.2.0 (IndexedDB + LocalStorage)
 * Strategy: 
 * - LocalStorage: For lightweight Settings, Streaks, and User Metadata (Sync)
 * - IndexedDB: For massive History, Mistakes, and Analytics Data (Async)
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Store = {
    // Configuration
    _dbName: 'UPSCSuperApp_DB',
    _dbVersion: 1,
    _prefix: 'upsc_lite_', // Prefix for LocalStorage keys

    // ============================================================
    // 1. SYNCHRONOUS LAYER (LocalStorage)
    // Used for: Settings, Theme, Auth Tokens, Simple Flags
    // ============================================================

    /**
     * Get lightweight setting (Sync)
     */
    getAppSettings(key, fallback = null) {
        try {
            const data = localStorage.getItem(this._prefix + key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error(`Store (Sync): Read Error [${key}]`, e);
            return fallback;
        }
    },

    /**
     * Save lightweight setting (Sync)
     */
    setAppSettings(key, value) {
        try {
            localStorage.setItem(this._prefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Store (Sync): Write Error. Storage might be full.', e);
            return false;
        }
    },

    /**
     * Specific helper for the "Visited" flag (Orientation)
     */
    checkVisited() {
        return this.getAppSettings('visited', false);
    },

    setVisited() {
        return this.setAppSettings('visited', true);
    },

    // ============================================================
    // 2. ASYNCHRONOUS LAYER (IndexedDB Setup)
    // Used for: Quiz History, Mistake Logs, Detailed Analytics
    // ============================================================

    db: null, // Will hold the DB connection object

    /**
     * Opens the IndexedDB connection.
     * Must be called during App Initialization.
     */
    async init() {
        if (this.db) return this.db; // Already open

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._dbName, this._dbVersion);

            // 1. Schema Upgrade (Runs only on version change/first run)
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`💾 Store: Upgrading Database to v${this._dbVersion}`);

                // Store A: Quiz History
                // KeyPath: 'id' (Unique ID for every test result)
                // Indices: 'subject' (for filtering), 'timestamp' (for sorting)
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id' });
                    historyStore.createIndex('subject', 'subject', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Store B: Mistakes (The Revision Deck)
                // KeyPath: 'id' (Question ID)
                if (!db.objectStoreNames.contains('mistakes')) {
                    const mistakesStore = db.createObjectStore('mistakes', { keyPath: 'id' });
                    mistakesStore.createIndex('subject', 'topic', { unique: false });
                }
            };

            // 2. Success Handler
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("💾 Store: IndexedDB Connected Successfully.");
                resolve(this.db);
            };

            // 3. Error Handler
            request.onerror = (event) => {
                console.error("💾 Store: IndexedDB Connection Failed", event.target.error);
                reject("Database Error");
            };
        });
    },

    // ... Continues in Batch 2 ...

    // ============================================================
    // 3. CORE ASYNC METHODS (The Heavy Lifting)
    // ============================================================

    /**
     * Saves a quiz result to IndexedDB (Async).
     * @param {Object} result - The result object from Engine
     * @returns {Promise<String>} The ID of the saved result
     */
    saveResult(result) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.warn("Store: DB not initialized, attempting init...");
                this.init().then(() => this.saveResult(result).then(resolve));
                return;
            }

            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');

            // Add collision-proof ID if missing
            if (!result.id) {
                result.id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }
            result.savedAt = new Date().toISOString();

            const request = store.add(result);

            request.onsuccess = () => {
                // Also update the "Streak" in Sync Storage
                this._updateStreak(result.timestamp);
                resolve(result.id);
            };

            request.onerror = (e) => {
                console.error("Store: Save Result Failed", e);
                reject(e);
            };
        });
    },

    /**
     * Retrieves history items (Async).
     * @param {Number} limit - Max items to return (default 50)
     * @returns {Promise<Array>} List of result objects
     */
    getHistory(limit = 50) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                // Fallback: If DB isn't ready, try init or return empty
                this.init().then(() => this.getHistory(limit).then(resolve)).catch(() => resolve([]));
                return;
            }

            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('timestamp');
            
            // We want latest first, so we iterate backwards (prev)
            const request = index.openCursor(null, 'prev');
            const results = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && results.length < limit) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = (e) => {
                console.error("Store: Get History Failed", e);
                resolve([]); // Fail safe: return empty array
            };
        });
    },

    /**
     * Saves unique mistakes to the 'mistakes' store.
     * Uses 'put' to overwrite if ID exists (updating the record).
     */
    saveMistakes(mistakesArray) {
        if (!this.db || !Array.isArray(mistakesArray) || mistakesArray.length === 0) return;

        const transaction = this.db.transaction(['mistakes'], 'readwrite');
        const store = transaction.objectStore('mistakes');

        mistakesArray.forEach(q => {
            // Ensure ID exists
            if (!q.id) q.id = `q_${Date.now()}_${Math.random()}`;
            store.put(q);
        });

        transaction.oncomplete = () => console.log(`💾 Store: Saved ${mistakesArray.length} mistakes.`);
    },

    /**
     * Internal: Updates the daily streak counter in LocalStorage
     */
    _updateStreak(timestamp) {
        const lastDate = this.getAppSettings('last_activity_date');
        const today = new Date(timestamp).toLocaleDateString();
        
        if (lastDate !== today) {
            // It's a new day
            let currentStreak = this.getAppSettings('streak', 0);
            
            // Check if it's consecutive (yesterday)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastDate === yesterday.toLocaleDateString()) {
                currentStreak++;
            } else {
                currentStreak = 1; // Streak broken or new
            }
            
            this.setAppSettings('streak', currentStreak);
            this.setAppSettings('last_activity_date', today);
        }
    },

    // ... Continues in Batch 3 ...
    // ============================================================
    // 4. CLOUDLESS BACKUP & RESTORE (Hybrid)
    // ============================================================

    /**
     * Packages all app data (Sync + Async) into a JSON file.
     */
    async exportData() {
        if (window.UI) UI.showLoading();
        console.log("Store: Starting Export...");

        try {
            // 1. Fetch LocalStorage Data (Sync)
            const backup = {
                meta: {
                    app: "UPSCSuperApp",
                    version: CONFIG.version,
                    exportedAt: new Date().toISOString()
                },
                settings: this.getAppSettings('settings', {}),
                study_stats: this.getAppSettings('study_stats', {}),
                last_sleep: this.getAppSettings('last_sleep', null),
                streak: this.getAppSettings('streak', 0),
                visited: this.getAppSettings('visited', false)
            };

            // 2. Fetch IndexedDB Data (Async)
            // We need to fetch ALL history and mistakes, not just the top 50
            if (this.db) {
                backup.history = await this._getAllFromStore('history');
                backup.mistakes = await this._getAllFromStore('mistakes');
            } else {
                console.warn("Store: DB not ready, exporting only settings.");
                backup.history = [];
                backup.mistakes = [];
            }

            // 3. Generate File
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `GyanAmala_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert("✅ Backup downloaded successfully!");

        } catch (err) {
            console.error("Export Failed:", err);
            alert("❌ Export failed. Check console for details.");
        } finally {
            if (window.UI) UI.hideLoading();
        }
    },

    /**
     * Restores data from a JSON file to both LocalStorage and IndexedDB.
     */
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (window.UI) UI.showLoading();
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    // Validation
                    if (!backup.meta || backup.meta.app !== "UPSCSuperApp") {
                        throw new Error("Invalid Backup File");
                    }

                    if (confirm(`Restore data from ${new Date(backup.meta.exportedAt).toLocaleDateString()}? Current data will be merged/overwritten.`)) {
                        
                        // 1. Restore LocalStorage
                        if (backup.settings) this.setAppSettings('settings', backup.settings);
                        if (backup.study_stats) this.setAppSettings('study_stats', backup.study_stats);
                        if (backup.last_sleep) this.setAppSettings('last_sleep', backup.last_sleep);
                        if (backup.streak) this.setAppSettings('streak', backup.streak);
                        this.setAppSettings('visited', true);

                        // 2. Restore IndexedDB
                        if (this.db) {
                            await this._restoreStore('history', backup.history);
                            await this._restoreStore('mistakes', backup.mistakes);
                        }

                        alert("✅ Restore Complete! Reloading app...");
                        window.location.reload();
                    }
                } catch (err) {
                    console.error("Import Failed:", err);
                    alert("❌ Failed to restore backup. Invalid file format.");
                } finally {
                    if (window.UI) UI.hideLoading();
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },

    /**
     * Helper: Get all items from an Object Store
     */
    _getAllFromStore(storeName) {
        return new Promise((resolve) => {
            const tx = this.db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    },

    /**
     * Helper: Bulk add items to an Object Store
     */
    _restoreStore(storeName, items) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(items) || items.length === 0) {
                resolve();
                return;
            }

            const tx = this.db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);

            items.forEach(item => store.put(item)); // 'put' updates if exists

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    },

    /**
     * Clear everything (Factory Reset)
     */
    async clearAll() {
        if (confirm("⚠️ Factory Reset: This will delete ALL history and settings. Are you sure?")) {
            // Clear LocalStorage
            localStorage.clear();

            // Clear IndexedDB
            if (this.db) {
                const tx = this.db.transaction(['history', 'mistakes'], 'readwrite');
                tx.objectStore('history').clear();
                tx.objectStore('mistakes').clear();
            }

            window.location.reload();
        }
    }
};

// Expose to Window
window.Store = Store;
