/**
 * STORE.JS - Production Data Persistence
 * Version: 5.0.0 (Cloudless Sync Edition)
 * Handles LocalStorage, Quota Management, and Backup/Restore.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Store = {
    _prefix: 'upsc_pro_',

    /**
     * Internal: Safe Storage Set with Quota Handling
     */
    _safeSet(key, value) {
        try {
            localStorage.setItem(this._prefix + key, JSON.stringify(value));
            return true;
        } catch (e) {
            // Check if it's a QuotaExceededError
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn('Storage Quota Exceeded. Attempting automatic cleanup...');
                this._cleanupOldHistory();
                // Try one more time after cleanup
                try {
                    localStorage.setItem(this._prefix + key, JSON.stringify(value));
                    return true;
                } catch (retryError) {
                    console.error('Critical Storage Failure:', retryError);
                    return false;
                }
            }
            console.error('Storage Write Error:', e);
            return false;
        }
    },

    /**
     * Internal: Automatic Cleanup for Quota Management
     * Removes oldest history items if storage is full.
     */
    _cleanupOldHistory() {
        const history = this.get('history', []);
        if (history.length > 5) {
            // Keep only the 5 most recent results to free up space
            const reduced = history.slice(0, 5);
            this.set('history', reduced);
        }
    },

    /**
     * Get data with safe parsing
     */
    get(key, fallback = null) {
        try {
            const data = localStorage.getItem(this._prefix + key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error(`Storage Read Error [${key}]:`, e);
            return fallback;
        }
    },

    /**
     * Set data safely
     */
    set(key, value) {
        return this._safeSet(key, value);
    },

    /**
     * Specialized: Save Quiz Result with Unique ID and Timestamp
     */
    saveResult(result) {
        if (!result) return null;

        const history = this.get('history', []);
        
        // Add unique ID and collision-proof metadata
        const enrichedResult = {
            ...result,
            id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            savedAt: new Date().toISOString()
        };

        // Add to top of list
        history.unshift(enrichedResult);

        // Maintain a healthy history limit (50 items)
        const cappedHistory = history.slice(0, 50);
        
        const success = this.set('history', cappedHistory);
        return success ? enrichedResult.id : null;
    },

    /**
     * Specialized: Save Mistake questions for future revision
     */
    saveMistakes(newMistakes) {
        if (!Array.isArray(newMistakes) || newMistakes.length === 0) return;

        const current = this.get('mistakes', []);
        
        // Merge and remove duplicates based on question text
        const merged = [...newMistakes, ...current];
        const unique = merged.filter((q, index, self) =>
            index === self.findIndex((t) => t.text === q.text)
        );

        // Keep top 100 hard questions for the user
        this.set('mistakes', unique.slice(0, 100));
    },

    /**
     * Clear all specific app data
     */
    clearAll() {
        const appKeys = ['history', 'mistakes', 'settings', 'visited', 'study_stats', 'last_sleep'];
        appKeys.forEach(k => localStorage.removeItem(this._prefix + k));
        window.location.reload();
    },

    // ============================================================
    // NEW: CLOUDLESS BACKUP & RESTORE SYSTEMS
    // ============================================================

    /**
     * Packages all app data into a JSON file and triggers download
     */
    exportData() {
        try {
            const data = {
                meta: {
                    app: "UPSCSuperApp",
                    version: CONFIG.version,
                    org: CONFIG.org,
                    exportedAt: new Date().toISOString()
                },
                history: this.get('history', []),
                mistakes: this.get('mistakes', []),
                settings: this.get('settings', {}),
                study_stats: this.get('study_stats', {}),
                last_sleep: this.get('last_sleep', null),
                visited: this.get('visited', false)
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create invisible link to trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `GyanAmala_Backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Simple visual feedback (alert is acceptable for MVP, UI.showModal better later)
            alert("✅ Backup downloaded successfully!");
        } catch (err) {
            console.error("Export Failed:", err);
            alert("❌ Export failed. Check storage permissions.");
        }
    },

    /**
     * Opens file picker and overwrites local data with backup
     */
    importData() {
        // Create invisible file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const backup = JSON.parse(event.target.result);
                    
                    // Basic Validation
                    if (backup.meta && backup.meta.app === "UPSCSuperApp") {
                        if (confirm(`Restore backup from ${new Date(backup.meta.exportedAt).toLocaleDateString()}? This will overwrite current data.`)) {
                            
                            // Restore Keys
                            if (backup.history) this.set('history', backup.history);
                            if (backup.mistakes) this.set('mistakes', backup.mistakes);
                            if (backup.settings) this.set('settings', backup.settings);
                            if (backup.study_stats) this.set('study_stats', backup.study_stats);
                            if (backup.last_sleep) this.set('last_sleep', backup.last_sleep);
                            this.set('visited', true); // Ensure they don't see orientation again

                            alert("✅ Restore Complete! Reloading...");
                            window.location.reload();
                        }
                    } else {
                        alert("❌ Invalid Backup File: Not a UPSCSuperApp file.");
                    }
                } catch (err) {
                    console.error("Import Parse Error:", err);
                    alert("❌ Failed to read backup file.");
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }
};

// Ensure Store is globally accessible
window.Store = Store;
