/**
 * STUDY_TRACKER.JS - The Passive Sensor
 * Version: 5.2.0 (Real-Time Activity Tracking)
 * Purpose: Tracks study hours and infers sleep quality based on usage gaps.
 * Logic:
 * - Study Time: Accumulates seconds when the tab is visible and active.
 * - Sleep Inference: Calculates gap between "Last Active Yesterday" and "First Active Today".
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const StudyTracker = {
    // Configuration
    _config: {
        idleThreshold: 300, // 5 minutes of no clicks = Idle (Stop tracking)
        minSleepDuration: 3, // Hours (To filter out short naps)
        maxSleepDuration: 14 // Hours (To filter out "I quit the app for a week")
    },

    // Runtime State
    state: {
        isActive: false,
        sessionStart: null,
        lastActivity: Date.now(),
        idleTimer: null,
        todayBuffer: 0 // Seconds accumulated in current session
    },

    /**
     * Initialize the Sensor.
     * Called by Main.js on app launch.
     */
    init() {
        console.log("Sensor: StudyTracker Active.");
        
        // 1. Setup Activity Listeners (Detect presence)
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(evt => document.addEventListener(evt, () => this._resetIdleTimer(), { passive: true }));

        // 2. Setup Visibility Listeners (Detect tab switching)
        document.addEventListener('visibilitychange', () => this._handleVisibilityChange());

        // 3. Check for Sleep (The "Good Morning" Check)
        this._analyzeSleepPattern();

        // 4. Start first session
        this._startSession();
    },

    /**
     * INTERNAL: Starts a tracking session.
     */
    _startSession() {
        if (this.state.isActive) return;
        
        this.state.isActive = true;
        this.state.sessionStart = Date.now();
        this.state.lastActivity = Date.now();
        this._resetIdleTimer();
    },

    /**
     * INTERNAL: Stops tracking (User left or went idle).
     * Saves accumulated time to Store.
     */
    _endSession() {
        if (!this.state.isActive) return;

        const now = Date.now();
        // Calculate duration in seconds
        const sessionDuration = (now - this.state.sessionStart) / 1000;
        
        // Sanity Check: Ignore negative or impossibly long sessions (system clock changes)
        if (sessionDuration > 0 && sessionDuration < 43200) { // Max 12 hours per session cap
            this._saveStudyTime(sessionDuration);
        }

        this.state.isActive = false;
        this.state.sessionStart = null;
        this.state.todayBuffer = 0;
        
        // Also update "Last Seen" timestamp for Sleep Tracking
        if (window.Store) {
            Store.setAppSettings('last_seen', now);
        }
    },

    /**
     * INTERNAL: Handles Idle State (User walked away but left tab open).
     */
    _resetIdleTimer() {
        this.state.lastActivity = Date.now();
        
        if (!this.state.isActive) {
            this._startSession(); // Woke up from idle
        }

        clearTimeout(this.state.idleTimer);
        
        // If no activity for 5 mins, end session automatically
        this.state.idleTimer = setTimeout(() => {
            console.log("Sensor: User Idle. Pausing tracker.");
            this._endSession();
        }, this._config.idleThreshold * 1000);
    },

    /**
     * INTERNAL: Handle Tab Switch / Minimize
     */
    _handleVisibilityChange() {
        if (document.hidden) {
            this._endSession(); // Pause when tab hidden
        } else {
            this._startSession(); // Resume when tab visible
        }
    },

    // ... Continues in Batch 2 ...
    /**
     * INTERNAL: Persists study duration to the Store.
     * Uses LocalStorage (via Store) for fast synchronous access.
     */
    _saveStudyTime(seconds) {
        if (!window.Store) return;

        const today = new Date().toLocaleDateString();
        const stats = Store.getAppSettings('study_stats', {});

        // Initialize today if missing
        if (!stats[today]) {
            stats[today] = 0;
            // Optional: Clean up old keys here to save space (keep last 7 days)
            const keys = Object.keys(stats);
            if (keys.length > 30) delete stats[keys[0]]; 
        }

        // Add duration
        stats[today] += seconds;
        Store.setAppSettings('study_stats', stats);
    },

    /**
     * INTERNAL: Infers sleep based on the "Silent Gap".
     * Logic: If the gap between Last Seen and Now is 3-14 hours, we assume sleep.
     */
    _analyzeSleepPattern() {
        if (!window.Store) return;

        const lastSeen = Store.getAppSettings('last_seen', 0);
        if (!lastSeen) return; // First install, no history

        const now = Date.now();
        const gapHours = (now - lastSeen) / (1000 * 60 * 60);

        // Only calculate sleep if the gap is realistic (3h to 14h)
        if (gapHours >= this._config.minSleepDuration && gapHours <= this._config.maxSleepDuration) {
            
            let quality = 'Average';
            if (gapHours < 5) quality = 'Poor';
            else if (gapHours >= 6 && gapHours <= 9) quality = 'Optimal';
            else if (gapHours > 9) quality = 'Overslept';

            const sleepData = {
                date: new Date().toLocaleDateString(),
                duration: parseFloat(gapHours.toFixed(1)),
                quality: quality
            };

            Store.setAppSettings('last_sleep', sleepData);
            console.log(`Sensor: Sleep Detected (${gapHours.toFixed(1)}h - ${quality})`);
        }
    },

    // ============================================================
    // PUBLIC ACCESSORS (Used by UI.js)
    // ============================================================

    /**
     * Returns total study hours for today.
     * Includes both saved time + current active session time (Real-time).
     */
    getTodayStudyHours() {
        if (!window.Store) return 0;

        const today = new Date().toLocaleDateString();
        const stats = Store.getAppSettings('study_stats', {});
        const savedSeconds = stats[today] || 0;
        
        // Add current buffer if active
        let currentBuffer = 0;
        if (this.state.isActive && this.state.sessionStart) {
            currentBuffer = (Date.now() - this.state.sessionStart) / 1000;
        }

        const totalSeconds = savedSeconds + currentBuffer;
        return parseFloat((totalSeconds / 3600).toFixed(1)); // Convert to Hours
    },

    /**
     * Returns the last recorded sleep data.
     */
    getLastSleepData() {
        if (!window.Store) return { duration: 0, quality: 'Unknown' };
        
        const data = Store.getAppSettings('last_sleep', null);
        
        // If no data exists, or data is old (not from last night), return defaults
        if (!data) return { duration: 0, quality: 'Unknown' };
        
        return data;
    }
};

// Expose to Window
window.StudyTracker = StudyTracker;

