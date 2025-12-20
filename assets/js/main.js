/**
 * Main.js - The Application Controller
 * Orchestrates interaction between UI, Data Store, and Logic Engine.
 */
const Main = {
    // State Tracking
    currentView: 'home',
    activeQuizSubject: null,
    quizTimerInterval: null,
    
    /**
     * SYSTEM BOOT SEQUENCE
     * Called by index.html when scripts are loaded.
     */
    init() {
        console.log("Main: System Booting...");

        // 1. Initialize Data Layer
        if (window.Store) Store.init();
        
        // 2. Initialize Logic Layer
        if (window.Engine) Engine.init();

        // 3. Apply Theme Preference (Dark/Light)
        this._applyTheme();

        // 4. Determine Start Screen (The "Missing Link" Fix)
        // We check if the user has completed the "Initiation Ceremony"
        const settings = Store.getAppSettings('settings', {});
        const isInitiated = settings.is_initiated; 

        if (!isInitiated) {
            console.log("Main: New User Detected. Launching Intro Deck.");
            
            // Wait a moment for the loading spinner to spin, then show Deck
            setTimeout(() => {
                UI.hideLoading();
                UI.initSwipeDeck(); // Launch the Swipe Cards
            }, 1200);
        } else {
            console.log("Main: Returning User. Loading Dashboard.");
            this.navigate('home');
        }

        // 5. Global Error Handling (Prevents white screen of death)
        window.onerror = function(msg, url, line) {
            console.error(`Global Error: ${msg} at line ${line}`);
            // If UI exists, try to show a toast
            if (window.UI && UI.showToast) UI.showToast("System Error. Reloading...", "error");
            return false;
        };
    },

    /**
     * NAVIGATION ROUTER
     * Switches between different screens (Home, Settings, Quiz, etc.)
     * @param {String} viewId - The ID of the view to show
     */
    navigate(viewId) {
        const app = document.getElementById('app-container');
        if (!app) return;

        console.log(`Main: Navigating to [${viewId}]`);

        // A. Cleanup: Stop any running quiz timers if leaving the quiz
        if (this.currentView === 'quiz' && viewId !== 'quiz') {
            this._stopQuizTimer();
        }

        // B. Update State
        this.currentView = viewId;

        // C. Render the requested View
        switch (viewId) {
            case 'home':
                UI._renderHome(app);
                break;

            case 'settings':
                UI._renderSettings(app);
                break;

            case 'stats':
                // Placeholder for Stats View (Can be expanded later)
                app.innerHTML = `
                    <div class="p-8 text-center mt-20 animate-view-enter">
                        <i class="fa-solid fa-chart-pie text-6xl text-slate-200 dark:text-slate-700 mb-4"></i>
                        <h2 class="text-xl font-display font-bold text-slate-800 dark:text-white">Detailed Analytics</h2>
                        <p class="text-slate-500 mb-6">Deep insights coming in the next update.</p>
                        <button onclick="Main.navigate('home')" class="text-indigo-500 font-bold">Go Back</button>
                    </div>
                    ${UI._generateFooter('stats')}
                `;
                break;

            case 'notes':
                // Placeholder for Notes View
                app.innerHTML = `
                    <div class="p-8 text-center mt-20 animate-view-enter">
                        <i class="fa-solid fa-book-open text-6xl text-slate-200 dark:text-slate-700 mb-4"></i>
                        <h2 class="text-xl font-display font-bold text-slate-800 dark:text-white">My Notes</h2>
                        <p class="text-slate-500 mb-6">Your digital notebook is being built.</p>
                        <button onclick="Main.navigate('home')" class="text-indigo-500 font-bold">Go Back</button>
                    </div>
                    ${UI._generateFooter('notes')}
                `;
                break;

            default:
                UI._renderHome(app);
        }

        // D. Final Polish: Ensure Loading Screen is gone
        UI.hideLoading();
        
        // E. Scroll to top
        window.scrollTo(0, 0);
    },

    /**
     * INTERNAL: Applies the saved theme on boot
     */
    _applyTheme() {
        // Check LocalStorage first, then System Preference
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    },

    /**
     * Toggle Light/Dark Mode (Called from Settings)
     */
    toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.toggle('dark');
        
        // Persist choice
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Update UI (If we were using UI.updateTheme)
        if (UI.updateTheme) UI.updateTheme(isDark);
        
        // Force re-render of current settings page to update the toggle switch visual
        if (this.currentView === 'settings') {
            UI._renderSettings(document.getElementById('app-container'));
        }
    },

    // ... Continues in Part 2 ...
    // ============================================================
    // QUIZ WORKFLOW LOGIC
    // ============================================================

    /**
     * Starts a new Quiz Session.
     * Called when a user clicks a Subject Card on the Dashboard.
     * @param {String} subjectId - e.g., 'history', 'polity'
     */
    async startQuiz(subjectId) {
        console.log(`Main: Starting Quiz for [${subjectId}]`);

        // 1. Show Loading Curtain (Simulate data prep)
        UI.showLoading();

        try {
            // 2. Initialize Engine Session
            // Engine.startSession loads questions and resets state
            const success = await Engine.startSession(subjectId);

            if (!success) {
                throw new Error("Engine returned false");
            }

            // 3. Update Main State
            this.activeQuizSubject = subjectId;
            this.currentView = 'quiz';

            // 4. Start the Clock
            this._startQuizTimer();

            // 5. Render the Quiz View
            // We use a short timeout to allow the transition to look smooth
            setTimeout(() => {
                const app = document.getElementById('app-container');
                UI._drawQuiz(app);
                UI.hideLoading();
            }, 600);

        } catch (error) {
            console.error("Main: Failed to start quiz", error);
            UI.hideLoading();
            UI.showToast("Failed to load module. check config.", "error");
        }
    },

    /**
     * Handles User Selection during Quiz.
     * Called when user clicks an Option button.
     * @param {Number} optionIndex - 0, 1, 2, or 3
     */
    handleAnswer(optionIndex) {
        // 1. Register answer in Engine (Updates state.answers)
        Engine.submitAnswer(optionIndex);

        // 2. Trigger UI Refresh
        // We re-render the quiz frame to show the visual selection state (blue border/check)
        // Since UI._drawQuiz reads directly from Engine state, this updates the UI perfectly.
        const app = document.getElementById('app-container');
        UI._drawQuiz(app);
    },

    /**
     * Finishes the Quiz and saves data.
     * Called when user clicks "Submit Test".
     */
    async finishQuiz() {
        console.log("Main: Finishing Quiz...");

        // 1. Stop Timer
        this._stopQuizTimer();

        // 2. Show Processing UI
        UI.showLoading();

        try {
            // 3. Calculate Results & Save to Store (via Engine)
            // Engine.endSession returns the ID of the saved result
            const resultId = await Engine.endSession();

            // 4. Navigate to Analysis View
            // We wait 1 sec to make it feel like "Calculating..."
            setTimeout(() => {
                this.showResult(resultId);
            }, 1000);

        } catch (error) {
            console.error("Main: Error saving results", error);
            UI.hideLoading();
            UI.showToast("Error saving data.", "error");
            this.navigate('home');
        }
    },

    /**
     * INTERNAL: Starts the MM:SS timer.
     */
    _startQuizTimer() {
        // Clear any existing timer first
        this._stopQuizTimer();

        let seconds = 0;
        
        this.quizTimerInterval = setInterval(() => {
            seconds++;
            
            // Format time: MM:SS
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            const timeString = `${m}:${s}`;

            // Update the Timer UI directly (Efficient DOM update)
            UI._updateTimer(timeString);

        }, 1000);
    },

    /**
     * INTERNAL: Stops the timer.
     */
    _stopQuizTimer() {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
    },

    // ... Continues in Part 3 ...
    // ============================================================
    // RESULT & NAVIGATION HELPERS
    // ============================================================

    /**
     * Loads and displays a specific Result Analysis.
     * Called after a quiz finishes OR from the "Continue Learning" card.
     * @param {String} resultId - unique ID of the result
     */
    showResult(resultId) {
        console.log(`Main: Showing Result [${resultId}]`);
        
        // 1. Update State
        this.currentView = 'analysis';

        // 2. Show Loading (fetching data from IndexedDB can take a few ms)
        UI.showLoading();

        // 3. Render Analysis View
        // We use the UI helper which handles the async data fetch
        const app = document.getElementById('app-container');
        UI._drawAnalysis(app, resultId)
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

}; // END OF MAIN OBJECT

// ============================================================
// SYSTEM IGNITION (The Spark)
// ============================================================

/**
 * Wait for the DOM and all scripts to fully load before starting.
 * This ensures UI, Store, and Engine objects are ready.
 */
window.addEventListener('load', () => {
    // 1. Start the App
    if (window.Main) {
        Main.init();
    } else {
        console.error("CRITICAL: Main.js failed to load!");
        document.body.innerHTML = '<h1 style="color:red; padding:20px;">System Error: Core missing.</h1>';
    }

    // 2. Handle Browser Back Button
    // If user presses physical back button, we go to Home instead of closing app
    window.addEventListener('popstate', (event) => {
        if (Main.currentView !== 'home') {
            Main.navigate('home');
        }
    });

    // 3. Prevent accidental refresh on mobile (Pull-to-refresh)
    // We disable this because it feels "App-like" and prevents losing quiz state
    document.body.style.overscrollBehavior = 'none';
});

