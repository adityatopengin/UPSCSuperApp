/**
 * MAIN.JS - The Master Controller
 * Version: 5.3.0 (Fixed Routing & Infinite Spinner)
 * Handles Routing, State Management, and App Initialization.
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
            // We check if a setting exists, otherwise default to system preference
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
            
            // Launch the app by navigating to the start view
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

    // ... Continues in Part 2 (The Render Logic) ...
        /**
     * INTERNAL: Handles the actual DOM updates for views.
     * FIX: This function contains the 'finally' block that removes the loading screen.
     */
    async _renderView(viewId, isNavigation = true) {
        // Safety: If UI module isn't loaded yet, abort.
        if (!window.UI) return;

        // 1. Show Loading briefly for smooth transition
        UI.showLoading();
        const container = document.getElementById('app-container');
        
        // 2. Clean Container & Reset Scroll
        container.innerHTML = '';
        this.state.currentView = viewId;
        window.scrollTo(0, 0);

        try {
            // 3. Route Logic: Switch based on viewId
            switch (viewId) {
                case 'home':
                    await UI._renderHome(container);
                    break;
                case 'notes':
                    UI._renderNotes(container);
                    break;
                case 'stats':
                    await UI._renderStats(container);
                    break;
                case 'settings':
                    UI._renderSettings(container);
                    break;
                case 'quiz':
                    // Quiz UI is handled by startQuiz
                    break;
                case 'result':
                    // Result UI is handled by showResult
                    break;
                default:
                    console.warn(`Main: Unknown view '${viewId}', defaulting to Home.`);
                    await UI._renderHome(container);
            }
        } catch (e) {
            console.error(`Main: Error rendering view '${viewId}'`, e);
            container.innerHTML = `<div class="p-8 text-center text-rose-500">Error loading content.</div>`;
        } finally {
            // 4. CRITICAL FIX: Hide Loading Screen
            // This is the specific part that removes the "Initializing AI Core" overlay.
            setTimeout(() => {
                UI.hideLoading();
            }, 300);
        }
    },

    // ============================================================
    // 3. QUIZ CONTROLLER
    // ============================================================

    /**
     * Starts a new quiz session for a specific subject.
     * @param {String} subjectId - The ID of the subject (from CONFIG)
     */
    async startQuiz(subjectId) {
        // 1. Get Filename from Registry
        const fileName = CONFIG.getFileName(subjectId);
        if (!fileName) {
            console.error("Main: Subject ID not found in CONFIG:", subjectId);
            alert("Subject data not found in configuration.");
            return;
        }

        UI.showLoading();

        try {
            // 2. Fetch Data from the 'data' folder
            const response = await fetch(`./data/${fileName}`);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            
            const rawData = await response.json();
            
            // 3. Normalize via Adapter (Uses the Universal Fix from Adapter.js)
            const questions = Adapter.normalize(rawData);
            
            // 4. Initialize Engine
            // We pass 'test' mode by default. Future: Add 'learning' mode toggle.
            if (Engine.init(questions, 'test')) {
                this.state.activeSubject = subjectId;
                this.state.isQuizActive = true;
                this.state.currentView = 'quiz';
                
                // 5. Render Quiz UI
                const container = document.getElementById('app-container');
                container.innerHTML = ''; // Clear previous view
                UI._drawQuiz(container);

                // 6. Start the Engine Timer
                // We pass callbacks to update the UI Timer and handle Finish
                Engine.startTimer(
                    (timeLeft) => UI._updateTimer(timeLeft), // Tick Callback
                    () => this.finishQuiz() // End Callback (Time's up)
                );
            } else {
                throw new Error("Engine initialization returned false.");
            }

        } catch (err) {
            console.error("Main: Start Quiz Failed", err);
            alert("Failed to load quiz data. Check if JSON file exists in /data folder.");
            this.navigate('home');
        } finally {
            UI.hideLoading();
        }
    },

    // ... Continues in Part 3 ...
        /**
     * Bridge between UI and Engine for handling answer selection.
     * Called when a user clicks an option button in the UI.
     * @param {Number} optionIndex - Index of the selected option (0-3)
     */
    handleAnswer(optionIndex) {
        // 1. Submit to Engine (Records choice & time spent)
        Engine.submitAnswer(optionIndex);
        
        // 2. Refresh UI (Shows selection state immediately)
        // We re-draw the quiz to reflect the "Active" state of the button
        if (window.UI) {
            UI._drawQuiz(document.getElementById('app-container'));
        }
    },

    /**
     * Finishes the quiz, calculates score, and saves data.
     * Triggered by: "Submit" button OR Timer running out.
     */
    async finishQuiz() {
        // 1. Stop the Timer immediately
        Engine.stopTimer();
        this.state.isQuizActive = false;

        // 2. Calculate Result using Engine's Logic
        const result = Engine.calculateResult(this.state.activeSubject);
        
        if (!result) {
            console.error("Main: Result calculation failed.");
            this.navigate('home');
            return;
        }

        // 3. Save to Persistence Layer (Async Store)
        let resultId = result.id; // Use generated ID by default
        
        if (window.Store) {
            if (window.UI) UI.showLoading(); // Show spinner while saving
            
            try {
                // Await the IndexedDB write operation
                // This returns the confirmed ID from the DB
                resultId = await Store.saveResult(result);
                
                // 4. Save "Mistakes" for Revision Mode
                // If there are mistakes, push them to the specific 'mistakes' store
                if (result.mistakes && result.mistakes.length > 0) {
                    Store.saveMistakes(result.mistakes);
                }
            } catch (error) {
                console.error("Main: Failed to save result to DB", error);
                // Note: We continue even if save fails, so the user can at least see their score.
            } finally {
                // UI.hideLoading() is handled by the next view render,
                // but we can call it here if we weren't navigating immediately.
            }
        } else {
            console.warn("Main: Store unavailable, result not saved.");
        }

        // 5. Navigate to Result View
        this.showResult(resultId);
    },

    /**
     * Direct navigation to the Result Analysis screen.
     * @param {String} resultId - The ID of the result to fetch and display
     */
    showResult(resultId) {
        this.state.currentView = 'result';
        const container = document.getElementById('app-container');
        window.scrollTo(0, 0);
        
        // UI._drawAnalysis will handle fetching the specific result from DB
        if (window.UI) {
            UI._drawAnalysis(container, resultId);
        }
    },

    // ... Continues in Part 4 ...
        // ============================================================
    // 4. SYSTEM PREFERENCES
    // ============================================================

    /**
     * Toggles between Dark and Light mode.
     * Updates UI immediately and saves preference to LocalStorage.
     */
    toggleTheme() {
        this.state.darkMode = !this.state.darkMode;
        
        // 1. Update Visuals
        if (window.UI) {
            UI.updateTheme(this.state.darkMode);
        }
        
        // 2. Save to Store (Sync LocalStorage is fine for settings)
        if (window.Store) {
            const currentSettings = Store.getAppSettings('settings', {});
            // Merge with existing settings to avoid overwriting other keys
            Store.setAppSettings('settings', { 
                ...currentSettings, 
                theme: this.state.darkMode ? 'dark' : 'light' 
            });
        }
    }
};

// ============================================================
// 5. BOOTSTRAP (ENTRY POINT)
// ============================================================

// Initialize App when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // strict check: Are all dependent modules loaded?
    if (!window.CONFIG || !window.Store || !window.UI) {
        console.error("CRITICAL: Core modules (Config, Store, UI) are missing!");
        alert("System Error: Core modules failed to load. Check console for details.");
    } else {
        // Start the Main Engine
        Main.init();
    }
});

// Expose to Window for global access (e.g., onclick handlers in HTML)
window.Main = Main;




