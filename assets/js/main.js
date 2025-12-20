/**
 * MAIN.JS - The Master Controller
 * Version: 5.3.0 (Fixed Routing & Crash Protection)
 * Handles Routing, State Management, and App Initialization.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Main = {
    // Application State
    state: {
        currentView: 'home',
        darkMode: false,
        activeSubject: null,
        isQuizActive: false, // Prevents accidental navigation
        // Timer State moved here for global access
        timer: {
            totalSeconds: 0,
            remaining: 0,
            intervalId: null,
            expected: null,
            isActive: false,
            startTime: null
        },
        // Metric Tracking
        currentIndex: 0,
        currentQuestionStart: null,
        userAnswers: [],
        questions: []
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
                StudyTracker.init();
            } else {
                console.warn("Main: StudyTracker module missing.");
            }

            // 4. Handle Browser History (Back Button Support)
            window.addEventListener('popstate', (e) => {
                const view = e.state && e.state.view ? e.state.view : 'home';
                this._renderView(view, false);
            });

            // 5. Check for "New User" (First Launch) -> Orientation
            const visited = Store.checkVisited(); 
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
            
            // CRITICAL FIX: Hide loading screen safely
            setTimeout(() => {
                if (window.UI) UI.hideLoading();
            }, 500);

            this.navigate(startView);

        } catch (error) {
            console.error("Main: Critical Init Error", error);
            if(window.UI) UI.hideLoading(); // Ensure spinner goes away
            alert("App Initialization Error: " + error.message);
        }
    },

    // ============================================================
    // 2. ROUTING & NAVIGATION (THE MISSING LINK)
    // ============================================================

    /**
     * Universal Navigation Method
     */
    navigate(viewId) {
        if (!viewId) return;

        // Push to History Stack (so Back button works)
        if (this.state.currentView !== viewId) {
            history.pushState({ view: viewId }, '', `#${viewId}`);
        }
        
        // Render View
        this._renderView(viewId, true);
    },

    /**
     * INTERNAL: Swaps the screen content based on viewId.
     * This was missing in your previous version, causing the crash.
     */
    async _renderView(viewId, isNewNav = true) {
        this.state.currentView = viewId;
        const container = document.getElementById('app-container');
        if (!container) return;

        // Smooth Scroll to top
        if (isNewNav) window.scrollTo(0, 0);

        // Clear Container safely
        container.innerHTML = '';

        // Routing Logic
        switch (viewId) {
            case 'home':
                if (window.UI) await UI._renderHome(container);
                break;
            case 'notes':
                if (window.UI) UI._renderNotes(container);
                break;
            case 'stats':
                if (window.UI) await UI._renderStats(container);
                break;
            case 'settings':
                if (window.UI) UI._renderSettings(container);
                break;
            case 'quiz':
                // Quiz is drawn by startQuiz(), but if user reloads on #quiz without data, go home
                if (!this.state.isQuizActive) this.navigate('home');
                break;
            case 'result':
                // Result handled by showResult, fallback to home
                this.navigate('home');
                break;
            default:
                this.navigate('home');
        }
    },

    // ============================================================
    // 3. QUIZ ORCHESTRATION (THE ENGINE BRIDGE)
    // ============================================================

    async startQuiz(subjectId) {
        // 1. Get File Name from Config
        const fileName = CONFIG.getFileName(subjectId);
        if (!fileName) {
            alert("Subject file not defined in Config.");
            return;
        }

        if (window.UI) UI.showLoading();

        try {
            // 2. Fetch Data
            const response = await fetch(`data/${fileName}`);
            if (!response.ok) throw new Error("File not found");
            const rawData = await response.json();

            // 3. Normalize Data (Using our FIXED Adapter)
            const questions = Adapter.normalize(rawData);

            // 4. Initialize Engine
            // We pass 'test' mode by default
            const success = Engine.init(questions, 'test');
            
            if (success) {
                this.state.activeSubject = subjectId;
                this.state.isQuizActive = true;
                this.state.questions = questions; // Sync local state for safety
                
                // 5. Draw UI
                this.state.currentView = 'quiz';
                history.pushState({ view: 'quiz' }, '', '#quiz');
                const container = document.getElementById('app-container');
                container.innerHTML = '';
                
                // 6. Start Timer (Delegating to Engine)
                // We pass a callback to update the UI timer every second
                Engine.startTimer(
                    (timeLeft) => {
                        if (window.UI) UI._updateTimer(timeLeft);
                    },
                    () => {
                        // Time's up callback
                        this.finishQuiz(true);
                    }
                );
                
                // 7. Initial Draw
                UI._drawQuiz(container);
            }

        } catch (error) {
            console.error("Start Quiz Failed:", error);
            alert("Failed to load quiz: " + error.message);
        } finally {
            if (window.UI) UI.hideLoading();
        }
    },

    /**
     * Handles user click on an option.
     */
    handleAnswer(idx) {
        // Submit to Engine logic
        Engine.submitAnswer(idx);
        // Refresh UI to show selected state
        if (window.UI) UI._drawQuiz(document.getElementById('app-container'));
    },

    /**
     * Ends the quiz, calculates score, and saves data.
     */
    async finishQuiz(autoSubmit = false) {
        Engine.stopTimer();
        this.state.isQuizActive = false;
        
        if (window.UI) UI.showLoading();

        // 1. Calculate Result
        const result = Engine.calculateResult(this.state.activeSubject);
        
        // 2. Save to DB (Async)
        let resultId = result.id;
        if (window.Store) {
            try {
                resultId = await Store.saveResult(result);
                // Save mistakes for revision
                if (result.mistakes && result.mistakes.length > 0) {
                    Store.saveMistakes(result.mistakes);
                }
            } catch (e) {
                console.error("Save result failed", e);
                // Proceed anyway with the ID we have
            }
        }
        
        // 3. Show Result
        this.showResult(resultId);
    },

    /**
     * Navigates to the Result Analysis view.
     */
    showResult(resultId) {
        this.state.currentView = 'result';
        const container = document.getElementById('app-container');
        window.scrollTo(0, 0);
        
        // UI handles the fetching and rendering
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
}; // <--- CLOSING THE MAIN OBJECT

// ============================================================
// 5. GLOBAL EVENT LISTENERS (THE TRIGGER)
// ============================================================

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if dependent modules are loaded
    if (!window.CONFIG || !window.Store || !window.UI) {
        console.error("CRITICAL: Core modules (Config, Store, UI) are missing!");
        // We do not alert here because defer scripts might still be parsing.
        // We trust the Main.init() try/catch block to handle errors.
    } 
    
    // Launch the App
    if (window.Main) {
        Main.init();
    }
});

// Expose to Window for global access
window.Main = Main;
