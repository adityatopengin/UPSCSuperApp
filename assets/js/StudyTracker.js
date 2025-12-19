/**
 * STUDY-TRACKER.JS - The Sensor
 * Version: 5.0.0 (Privacy-First Edition)
 * Tracks Study Hours (Foreground) & Infers Sleep (Digital Silence).
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const StudyTracker = {
    // Configuration for "Sleep" Inference logic
    config: {
        minSleepHours: 4,   // Gaps smaller than this are just "Breaks"
        maxSleepHours: 12,  // Gaps larger than this are likely "Abandoned App"
        sleepStartWindow: 20, // 8 PM (Start looking for sleep gaps)
        sleepEndWindow: 11    // 11 AM (End looking for sleep gaps)
    },

    state: {
        sessionStart: null,
        isActive: false,
        heartbeatTimer: null
    },

    /**
     * Initialize the Tracker
     * Called by Main.init()
     */
    init() {
        console.log("🌙 StudyTracker: Sensor Active");
        
        // 1. Check for "Sleep Gap" immediately upon load (Did user just wake up?)
        this._analyzeGap();

        // 2. Start specific session tracking
        this._startSession();

        // 3. Set up listeners to track "Active" state
        document.addEventListener('visibilitychange', () => this._handleVisibilityChange());
        window.addEventListener('beforeunload', () => this._endSession());
        
        // 4. Heartbeat: Save "Last Active" timestamp every minute
        // This ensures if phone dies/crashes, we still know when user stopped.
        this.state.heartbeatTimer = setInterval(() => {
            if (this.state.isActive) {
                const now = Date.now();
                Store.set('last_active_ts', now);
                this._updateDailyStudyTime(1); // Add 1 minute to today's total
            }
        }, 60 * 1000);
    },

    // ============================================================
    // 1. SLEEP INFERENCE ENGINE (Digital Silence)
    // ============================================================

    /**
     * Checks the gap between "Now" and the last time the app was used.
     * If the gap is significant and overnight, we count it as sleep.
     */
    _analyzeGap() {
        const lastTs = Store.get('last_active_ts');
        if (!lastTs) return; // First install or cleared data

        const now = Date.now();
        const gapHours = (now - lastTs) / (1000 * 60 * 60);
        const lastDate = new Date(lastTs);
        const currentHour = new Date().getHours();

        // LOGIC: Did this gap happen overnight?
        // (Gap > 4h AND Gap < 12h)
        if (gapHours >= this.config.minSleepHours && gapHours <= this.config.maxSleepHours) {
            
            // Refinement: Only count as "Sleep" if the gap bridges the night
            // e.g., Last active was > 6 PM, Now is < 11 AM
            const isNightGap = lastDate.getHours() >= 18 || currentHour <= 11;
            
            if (isNightGap) {
                console.log(`🛌 Sleep Detected: ${gapHours.toFixed(1)} hours`);
                this._logSleep(gapHours);
            } else {
                console.log(`☕ Long Break Detected: ${gapHours.toFixed(1)} hours`);
            }
        }
    },

    _logSleep(hours) {
        // Save to Store.js (Last Sleep)
        // We overwrite this daily. PredictiveEngine reads this.
        const sleepData = {
            duration: parseFloat(hours.toFixed(1)),
            date: new Date().toLocaleDateString(), // Today's sleep
            quality: this._rateSleep(hours)
        };
        Store.set('last_sleep', sleepData);
    },

    _rateSleep(hours) {
        if (hours < 5) return 'Poor';
        if (hours < 6.5) return 'Average';
        if (hours > 9) return 'Overslept';
        return 'Optimal';
    },

    // ============================================================
    // 2. STUDY HOURS TRACKING
    // ============================================================

    _startSession() {
        this.state.sessionStart = Date.now();
        this.state.isActive = true;
        // Mark immediate activity
        Store.set('last_active_ts', Date.now());
    },

    _endSession() {
        this.state.isActive = false;
        Store.set('last_active_ts', Date.now());
        // Note: Actual time addition happens in the heartbeat to prevent data loss
    },

    _handleVisibilityChange() {
        if (document.hidden) {
            this.state.isActive = false;
            // App went to background -> Update timestamp immediately
            Store.set('last_active_ts', Date.now());
        } else {
            this.state.isActive = true;
            this.state.sessionStart = Date.now();
            // App came to foreground -> Check if we missed a huge gap (Sleep?)
            this._analyzeGap();
        }
    },

    /**
     * Increment daily study counter (in minutes)
     */
    _updateDailyStudyTime(minutes) {
        const today = new Date().toLocaleDateString();
        let tracker = Store.get('study_stats', { date: today, totalMinutes: 0 });

        // Reset if date changed
        if (tracker.date !== today) {
            tracker = { date: today, totalMinutes: 0 };
        }

        tracker.totalMinutes += minutes;
        Store.set('study_stats', tracker);
    },

    // ============================================================
    // 3. PUBLIC API (For Predictive Engine & UI)
    // ============================================================

    getTodayStudyHours() {
        const tracker = Store.get('study_stats');
        const today = new Date().toLocaleDateString();
        
        if (!tracker || tracker.date !== today) return 0;
        return (tracker.totalMinutes / 60).toFixed(1);
    },

    getLastSleepData() {
        return Store.get('last_sleep', { duration: 0, quality: 'Unknown' });
    }
};

// Expose to Window
window.StudyTracker = StudyTracker;
