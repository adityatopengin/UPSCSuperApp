/**
 * Main.js - The Application Controller
 * Version: 6.1.0 (Seamless Boot Edition)
 * Orchestrates interaction between:
 * 1. UI (View Layer)
 * 2. Store (Data Layer)
 * 3. Engine (Logic Layer)
 */

// We use 'var' to ensure Main is globally accessible to the browser
var Main = {
    
    // ============================================================
    // 1. APP STATE TRACKING
    // ============================================================
    currentView: 'home',       // Tracks which screen is active
    activeQuizSubject: null,   // Tracks which subject is being taken
    quizTimerInterval: null,   // Holds the ID of the timer loop
    
    // ============================================================
    // 2. SYSTEM BOOT SEQUENCE
    // ============================================================
    
    /**
     * Called by window.onload when all scripts are ready.
     * Determines if the user is a Recruit (Intro) or Officer (Dashboard).
     */
    init: function() {
        console.log("Main: System Booting...");

        // 1. Initialize Data Layer (Safe Check)
        if (typeof Store !== 'undefined') {
            Store.init();
        } else {
            console.error("Main: Critical - Store.js not found!");
            document.body.innerHTML = "<h1 style='color:red; text-align:center; margin-top:50px'>Error: Data Layer Missing</h1>";
            return;
        }
        
        // 2. Initialize Logic Layer (Safe Check)
        // Note: Engine.init() is now internal; we don't call it here without data.
        if (typeof Engine === 'undefined') {
            console.error("Main: Critical - Engine.js not found!");
        }

        // 3. Apply Theme Preference (Dark/Light) immediately to prevent white flash
        this._applyTheme();

        // 4. Determine Start Screen (The Fork in the Road)
        // We check the persistent flag in the Store
        const settings = Store.getAppSettings('settings', {});
        const isInitiated = settings.is_initiated; 

        if (!isInitiated) {
            // CASE A: New User -> Launch The Intro Deck
            // We do NOT load the dashboard yet. We wait for the user to finish the "Covenant".
            console.log("Main: New Recruit Detected. Launching Intro Sequence.");
            
            // Wait slightly for the DOM to paint the black background
            setTimeout(function() {
                if (typeof UI !== 'undefined') {
                    UI.hideLoading(); // Lift the curtain
                    UI.initSwipeDeck(); // Start the Cards
                }
            }, 800);

        } else {
            // CASE B: Returning Officer -> Go straight to Dashboard
            console.log("Main: Officer Detected. Loading Dashboard.");
            
            // Navigate immediately
            this.navigate('home');
        }

        // 5. Global Error Handling (Prevents "White Screen of Death")
        window.onerror = function(msg, url, line) {
            console.error('Global Error: ' + msg + ' at line ' + line);
            // Try to show a toast if UI is alive
            if (typeof UI !== 'undefined' && UI.showToast) {
                UI.showToast("System Stability Error. Check Console.", "error");
            }
            return false;
        };
    },

    // ... Continues in Part 2 ...
    // ============================================================
    // 3. NAVIGATION ROUTER
    // ============================================================

    /**
     * Switches the App View (Home -> Settings -> Quiz, etc.)
     * @param {String} viewId - The ID of the view to show
     */
    navigate: function(viewId) {
        const app = document.getElementById('app-container');
        if (!app) return;

        console.log('Main: Navigating to [' + viewId + ']');

        // A. Cleanup: Stop any running quiz timers if leaving the quiz view
        if (this.currentView === 'quiz' && viewId !== 'quiz') {
            this._stopQuizTimer();
        }

        // B. Update State
        this.currentView = viewId;

        // C. Render the requested View
        if (typeof UI === 'undefined') return;

        switch (viewId) {
            case 'home':
                UI._renderHome(app);
                break;

            case 'settings':
                UI._renderSettings(app);
                break;
            
            case 'quiz':
                // The quiz view is populated by startQuiz(), 
                // but we handle the switch here for consistency.
                break;

            case 'stats':
                // Placeholder for Stats View (Coming in v6.2)
                app.innerHTML = '<div class="p-8 text-center mt-20 animate-view-enter">' +
                    '<i class="fa-solid fa-chart-pie text-6xl text-slate-200 dark:text-slate-700 mb-4"></i>' +
                    '<h2 class="text-xl font-display font-bold text-slate-800 dark:text-white">Analytics Module</h2>' +
                    '<p class="text-slate-500 mb-6">Detailed insights coming in next update.</p>' +
                    '<button onclick="Main.navigate(\'home\')" class="text-indigo-500 font-bold">Return Home</button>' +
                    '</div>' +
                    UI._generateFooter('stats');
                break;

            case 'notes':
                // Placeholder for Notes View
                app.innerHTML = '<div class="p-8 text-center mt-20 animate-view-enter">' +
                    '<i class="fa-solid fa-book-open text-6xl text-slate-200 dark:text-slate-700 mb-4"></i>' +
                    '<h2 class="text-xl font-display font-bold text-slate-800 dark:text-white">My Notebook</h2>' +
                    '<p class="text-slate-500 mb-6">Digital notes feature coming soon.</p>' +
                    '<button onclick="Main.navigate(\'home\')" class="text-indigo-500 font-bold">Return Home</button>' +
                    '</div>' +
                    UI._generateFooter('notes');
                break;

            default:
                UI._renderHome(app);
        }

        // D. Final Polish: Ensure Loading Screen is gone & Scroll to top
        UI.hideLoading();
        window.scrollTo(0, 0);
    },

    // ============================================================
    // 4. THEME & SETTINGS LOGIC
    // ============================================================

    /**
     * INTERNAL: Applies the saved theme on boot
     */
    _applyTheme: function() {
        var savedTheme = localStorage.getItem('theme');
        var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    /**
     * Toggle Light/Dark Mode (Called from Settings UI)
     */
    toggleTheme: function() {
        var html = document.documentElement;
        var isDark = html.classList.toggle('dark');
        
        // Persist choice
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Force re-render of current settings page to update the toggle switch visual
        if (this.currentView === 'settings' && typeof UI !== 'undefined') {
            UI._renderSettings(document.getElementById('app-container'));
        }
    },

    // ============================================================
    // 5. QUIZ WORKFLOW LOGIC (The Fixed Handshake)
    // ============================================================

    /**
     * Starts a new Quiz Session.
     * Called when a user clicks a Subject Card on the Dashboard.
     * @param {String} subjectId - e.g., 'history', 'polity'
     */
    startQuiz: async function(subjectId) {
        console.log('Main: Starting Quiz for [' + subjectId + ']');

        // 1. Show Loading Curtain
        if (typeof UI !== 'undefined') UI.showLoading();

        try {
            // 2. Initialize Engine Session
            if (typeof Engine === 'undefined') throw new Error("Engine missing");

            // CRITICAL FIX: We now call Engine.startSession which handles the fetching.
            // This connects Main.js -> Engine.js -> File System
            var success = await Engine.startSession(subjectId);

            if (!success) {
                throw new Error("Engine failed to load questions.");
            }

            // 3. Update Main State
            this.activeQuizSubject = subjectId;
            this.currentView = 'quiz';

            // 4. Start the Clock
            this._startQuizTimer();

            // 5. Render the Quiz View
            // We use a short timeout to ensure the DOM is ready
            setTimeout(function() {
                var app = document.getElementById('app-container');
                if (typeof UI !== 'undefined') {
                    UI._drawQuiz(app);
                    UI.hideLoading();
                }
            }, 600);

        } catch (error) {
            console.error("Main: Failed to start quiz", error);
            if (typeof UI !== 'undefined') {
                UI.hideLoading();
                UI.showToast("Could not download questions. Check assets/data folder.", "error");
            }
        }
    },

    // ... Continues in Part 3 ...
    /**
     * Handles User Selection during Quiz.
     * Called when user clicks an Option button.
     * @param {Number} optionIndex - 0, 1, 2, or 3
     */
    handleAnswer: function(optionIndex) {
        // 1. Register answer in Engine
        if (typeof Engine !== 'undefined') {
            Engine.submitAnswer(optionIndex);
        }

        // 2. Trigger UI Refresh
        // We re-render the quiz frame to show the visual selection state
        if (typeof UI !== 'undefined') {
            var app = document.getElementById('app-container');
            UI._drawQuiz(app);
        }
    },

    /**
     * Finishes the Quiz and saves data.
     * Called when user clicks "Submit Test".
     */
    finishQuiz: async function() {
        console.log("Main: Finishing Quiz...");

        // 1. Stop Timer
        this._stopQuizTimer();

        // 2. Show Processing UI
        if (typeof UI !== 'undefined') UI.showLoading();

        try {
            // 3. Calculate Results & Save to Store
            // Engine.endSession returns the ID of the saved result
            var resultId = await Engine.endSession();

            if (!resultId) throw new Error("Result generation failed");

            // 4. Navigate to Analysis View
            // We wait 1 sec to make it feel like "Calculating..." (UX Best Practice)
            var self = this; 
            setTimeout(function() {
                self.showResult(resultId);
            }, 1000);

        } catch (error) {
            console.error("Main: Error saving results", error);
            if (typeof UI !== 'undefined') {
                UI.hideLoading();
                UI.showToast("Error saving data.", "error");
            }
            this.navigate('home');
        }
    },

    // ============================================================
    // 6. TIMER & RESULT HELPERS
    // ============================================================

    /**
     * INTERNAL: Starts the MM:SS timer loop.
     */
    _startQuizTimer: function() {
        // Clear any existing timer first to prevent doubles
        this._stopQuizTimer();

        var seconds = 0;
        
        // We use arrow function to keep 'this' bound to Main object
        this.quizTimerInterval = setInterval(() => {
            seconds++;
            
            // Format time: MM:SS
            var m = Math.floor(seconds / 60).toString().padStart(2, '0');
            var s = (seconds % 60).toString().padStart(2, '0');
            var timeString = `${m}:${s}`;

            // Update the Timer UI directly
            if (typeof UI !== 'undefined') {
                UI._updateTimer(timeString);
            }

        }, 1000);
    },

    /**
     * INTERNAL: Stops the timer.
     */
    _stopQuizTimer: function() {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
    },

    /**
     * Loads and displays a specific Result Analysis.
     * Called after a quiz finishes OR from the "Continue Learning" card.
     * @param {String} resultId - unique ID of the result
     */
    showResult: function(resultId) {
        console.log('Main: Showing Result [' + resultId + ']');
        
        // 1. Update State
        this.currentView = 'analysis';

        // 2. Show Loading
        if (typeof UI !== 'undefined') UI.showLoading();

        // 3. Render Analysis View
        var app = document.getElementById('app-container');
        
        if (typeof UI !== 'undefined') {
            // Since _drawAnalysis might be async depending on implementation, handle promises
            Promise.resolve(UI._drawAnalysis(app, resultId))
                .then(() => {
                    UI.hideLoading();
                    window.scrollTo(0, 0);
                })
                .catch(err => {
                    console.error("Main: Result render failed", err);
                    UI.hideLoading();
                    UI.showToast("Could not load result.", "error");
                    this.navigate('home');
                });
        }
    }

}; // END OF MAIN OBJECT


// ============================================================
// SYSTEM IGNITION (THE SPARK)
// ============================================================

/**
 * Wait for the DOM and all scripts to fully load before starting.
 * This ensures UI, Store, and Engine objects are ready.
 */
window.addEventListener('load', function() {
    // 1. Start the App
    // We check if 'Main' is defined. Since we used 'var', this is safe.
    if (typeof Main !== 'undefined') {
        Main.init();
    } else {
        console.error("CRITICAL: Main.js failed to load!");
        document.body.innerHTML = '<div style="padding:20px; text-align:center; color:#e11d48;">' +
            '<h1>System Error</h1>' +
            '<p>Core Controller missing. Please reload.</p>' +
            '</div>';
    }

    // 2. Handle Browser Back Button (Physical Back Button on Android)
    window.addEventListener('popstate', function(event) {
        if (typeof Main !== 'undefined' && Main.currentView !== 'home') {
            // Instead of leaving the app, go back to Home Dashboard
            Main.navigate('home');
            // Push state back so the history stack isn't empty (keeps user in app)
            history.pushState(null, null, location.href);
        }
    });

    // 3. Prevent accidental "Pull-to-refresh" on mobile
    // This makes the app feel more native and prevents losing quiz progress
    document.body.style.overscrollBehavior = 'none';
});

