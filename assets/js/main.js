/**
 * MAIN.JS - The Master Controller
 * Version: 5.2.0 (Async/Await Edition)
 * Handles Routing, State Management, and App Initialization.
 * Features: Async Store Integration, Robust Routing, and Sensor Integration.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Main = {
    // Application State
    state: {
        currentView: 'home',
        darkMode: false,
        activeSubject: null,
        isQuizActive: false // Prevents accidental navigation
    },

    // ============================================================
    // 1. INITIALIZATION (BOOT SEQUENCE)
    // ============================================================

    async init() {
        console.log(`🚀 ${CONFIG.name} v${CONFIG.version} Initializing...`);

        try {
            // 1. Initialize the Hybrid Store (Wait for DB Connection)
            if (window.Store) {
                console.log("Main: Connecting to Database...");
                await Store.init(); 
            } else {
                throw new Error("Store module is missing.");
            }

            // 2. Initialize Theme (Sync LocalStorage is fine here)
            const savedTheme = Store.getAppSettings('settings', {}).theme;
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.state.darkMode = savedTheme === 'dark' || (savedTheme === undefined && systemDark);
            
            if (window.UI) UI.updateTheme(this.state.darkMode);

            // 3. Initialize The "Sensor" (StudyTracker)
            if (window.StudyTracker) {
                // If StudyTracker needs DB, it should be async too, 
                // but for now we just start the listeners.
                StudyTracker.init();
            } else {
                console.warn("Main: StudyTracker module missing.");
            }

            // 4. Handle Browser History (Back Button Support)
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.view) {
                    this._renderView(e.state.view, false);
                } else {
                    this._renderView('home', false);
                }
            });

            // 5. Check for "New User" (First Launch) -> Orientation
            const visited = Store.checkVisited(); // Sync check is fine
            if (!visited) {
                setTimeout(() => {
                    if (window.UI) UI.modals.orientation();
                }, 1500);
                Store.setVisited();
            }

            // 6. Initial Router Check (Handle refresh on #stats, etc.)
            const initialHash = window.location.hash.replace('#', '');
            const validViews = ['home', 'notes', 'stats', 'settings'];
            const startView = validViews.includes(initialHash) ? initialHash : 'home';
            
            this.navigate(startView);

        } catch (error) {
            console.error("Main: Critical Init Error", error);
            alert("App initialization failed. Please reload.");
        }
    },

    // ============================================================
    // 2. ROUTING & NAVIGATION
    // ============================================================

    /**
     * Universal Navigation Method
     * @param {String} viewId - 'home', 'quiz', 'result', 'notes', 'stats', 'settings'
     */
    navigate(viewId) {
        // Safety: Don't navigate if undefined
        if (!viewId) return;

        // Push to History Stack (so Back button works)
        if (this.state.currentView !== viewId) {
            history.pushState({ view: viewId }, '', `#${viewId}`);
        }
        
        // Render View (Now Async)
        this._renderView(viewId, true);
    },

    // ... Continues in Batch 2 (Unchanged) ...
    // ============================================================
    // 2. DRIFT-PROOF TIMER & TIME TRACKING
    // ============================================================
    
    /**
     * Starts the quiz timer. Uses Date.now() delta to prevent drift.
     * @param {Function} tickCallback - Called every second with remaining time
     * @param {Function} endCallback - Called when time runs out
     */
    startTimer(tickCallback, endCallback) {
        if (this.state.timer.isActive) this.stopTimer();

        this.state.timer.isActive = true;
        this.state.timer.startTime = Date.now();
        this.state.timer.expected = Date.now() + 1000;
        
        // Start tracking the first question immediately
        this.state.currentQuestionStart = Date.now();

        // The recursive step function
        const step = () => {
            if (!this.state.timer.isActive) return;

            const now = Date.now();
            const dt = now - this.state.timer.expected; // The drift

            // If drift is huge (>1s), browser was likely sleeping.
            // We accept the time loss (exam simulation) but reset the drift target.
            if (dt > 1000) {
                // Optional: You could pause here, but for UPSC mocks, clock keeps ticking.
                this.state.timer.expected = now;
            }

            this.state.timer.remaining--;

            // Execute UI Callback (Update Timer Display)
            if (tickCallback) {
                try {
                    tickCallback(this.state.timer.remaining);
                } catch (e) {
                    console.error("Engine: Tick callback failed", e);
                }
            }

            // Check End Condition
            if (this.state.timer.remaining <= 0) {
                this.stopTimer();
                if (endCallback) endCallback();
            } else {
                // Schedule next tick, subtracting the drift time
                this.state.timer.expected += 1000;
                this.state.timer.intervalId = setTimeout(step, Math.max(0, 1000 - dt));
            }
        };

        // Start the loop
        this.state.timer.intervalId = setTimeout(step, 1000);
    },

    stopTimer() {
        if (this.state.timer.intervalId) {
            clearTimeout(this.state.timer.intervalId);
        }
        this.state.timer.intervalId = null;
        this.state.timer.isActive = false;
    },

    // ============================================================
    // 3. INTERACTION & NAVIGATION LOGIC
    // ============================================================

    getCurrentQuestion() {
        // Safety check
        if (!this.state.questions || !this.state.questions[this.state.currentIndex]) {
            return { text: "Error: Question not found", options: [] };
        }
        return this.state.questions[this.state.currentIndex];
    },

    /**
     * Records the user's answer and the time spent on that specific question.
     * @param {Number} answerIndex - The index of the selected option (0-3)
     */
    submitAnswer(answerIndex) {
        const now = Date.now();
        // Calculate time spent on THIS question since it was displayed
        const timeSpentOnThis = (now - this.state.currentQuestionStart) / 1000; 

        // Update the userAnswers array safely
        this.state.userAnswers[this.state.currentIndex] = {
            qId: this.state.questions[this.state.currentIndex].id,
            selected: answerIndex,
            // Accumulate time if they visited this question before
            timeSpent: (this.state.userAnswers[this.state.currentIndex]?.timeSpent || 0) + parseFloat(timeSpentOnThis.toFixed(1))
        };
        
        // Reset the question timer for accurate tracking if they stay on page
        this.state.currentQuestionStart = Date.now();
    },

    nextQuestion() {
        if (this.state.currentIndex < this.state.questions.length - 1) {
            this._updateTimeSpentBeforeMove(); // Record time for current Q before leaving
            this.state.currentIndex++;
            this.state.currentQuestionStart = Date.now(); // Start timer for new Q
            return true;
        }
        return false;
    },

    prevQuestion() {
        if (this.state.currentIndex > 0) {
            this._updateTimeSpentBeforeMove(); // Record time for current Q before leaving
            this.state.currentIndex--;
            this.state.currentQuestionStart = Date.now(); // Start timer for previous Q
            return true;
        }
        return false;
    },

    /**
     * Internal: Updates the time spent on the current question before navigating away.
     * Ensures that time spent "thinking" but not answering is still captured.
     */
    _updateTimeSpentBeforeMove() {
        const now = Date.now();
        const timeSpent = (now - this.state.currentQuestionStart) / 1000;
        
        const existingRecord = this.state.userAnswers[this.state.currentIndex] || { 
            qId: this.state.questions[this.state.currentIndex].id, 
            selected: null, 
            timeSpent: 0 
        };

        existingRecord.timeSpent += parseFloat(timeSpent.toFixed(1));
        this.state.userAnswers[this.state.currentIndex] = existingRecord;
    },

    // ... Continues in Batch 3 ...

    handleAnswer(optionIndex) {
        // 1. Submit to Engine (Records time & choice)
        Engine.submitAnswer(optionIndex);
        
        // 2. Refresh UI (Shows selection state immediately)
        if (window.UI) {
            UI._drawQuiz(document.getElementById('app-container'));
        }
    },

    async finishQuiz() {
        Engine.stopTimer();
        this.state.isQuizActive = false;

        // 1. Calculate Result
        const result = Engine.calculateResult(this.state.activeSubject);
        
        if (!result) {
            console.error("Main: Result calculation failed.");
            this.navigate('home');
            return;
        }

        // 2. Save to Persistence Layer (Async Store)
        let resultId = null;
        if (window.Store) {
            if (window.UI) UI.showLoading(); // Show spinner while saving to DB
            try {
                // Await the IndexedDB write operation
                resultId = await Store.saveResult(result);
                
                // 3. Save "Mistakes" for revision (Fire and forget is usually fine here, but handled by Store)
                if (result.mistakes && result.mistakes.length > 0) {
                    Store.saveMistakes(result.mistakes);
                }
            } catch (error) {
                console.error("Main: Failed to save result to DB", error);
                // Fallback: use the temporary ID generated by Engine
                resultId = result.id;
            } finally {
                if (window.UI) UI.hideLoading();
            }
        } else {
            console.warn("Main: Store unavailable, result not saved.");
            resultId = result.id;
        }

        // 4. Navigate to Result View
        this.showResult(resultId);
    },

    showResult(resultId) {
        // Direct navigation to Result View
        this.state.currentView = 'result';
        const container = document.getElementById('app-container');
        window.scrollTo(0, 0);
        
        // UI._drawAnalysis will handle fetching the specific result
        if (window.UI) UI._drawAnalysis(container, resultId);
    },

    // ============================================================
    // 4. SYSTEM PREFERENCES
    // ============================================================

    toggleTheme() {
        this.state.darkMode = !this.state.darkMode;
        
        // Update UI
        if (window.UI) UI.updateTheme(this.state.darkMode);
        
        // Save to Store (Sync LocalStorage is fine for settings)
        if (window.Store) {
            const currentSettings = Store.getAppSettings('settings', {});
            Store.setAppSettings('settings', { ...currentSettings, theme: this.state.darkMode ? 'dark' : 'light' });
        }
    }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if dependent modules are loaded
    if (!window.CONFIG || !window.Store || !window.UI) {
        console.error("CRITICAL: Core modules (Config, Store, UI) are missing!");
        alert("System Error: Core modules failed to load. Check console.");
    } else {
        Main.init();
    }
});

// Expose to Window for global access
window.Main = Main;
