/**
 * MAIN.JS - The Master Controller
 * Version: 5.0.0 (Gyan Amala Edition)
 * Handles Routing, State Management, and App Initialization.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Main = {
    // Application State
    state: {
        currentView: 'home',
        darkMode: false,
        activeSubject: null
    },

    // ============================================================
    // 1. INITIALIZATION (Boot Sequence)
    // ============================================================

    async init() {
        console.log(`🚀 ${CONFIG.name} v${CONFIG.version} (Org: ${CONFIG.org}) Initializing...`);

        // 1. Initialize Theme (Check LocalStorage or System Preference)
        const savedTheme = Store.get('settings', {}).theme;
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.state.darkMode = savedTheme === 'dark' || (savedTheme === undefined && systemDark);
        UI.updateTheme(this.state.darkMode);

        // 2. Initialize The "Sensor" (StudyTracker)
        if (window.StudyTracker) window.StudyTracker.init();

        // 3. Handle Browser History (Back Button Support)
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.view) {
                this._renderView(e.state.view, false);
            } else {
                this._renderView('home', false);
            }
        });

        // 4. Check for "New User" (First Launch) -> Orientation
        const visited = Store.get('visited', false);
        if (!visited) {
            setTimeout(() => UI.modals.orientation(), 1000);
            Store.set('visited', true);
        }

        // 5. Render Initial View
        this.navigate('home');
    },

    // ============================================================
    // 2. ROUTING & NAVIGATION
    // ============================================================

    /**
     * Universal Navigation Method
     * @param {String} viewId - 'home', 'quiz', 'result', 'notes', 'stats', 'settings'
     */
    navigate(viewId) {
        // Push to History Stack (so Back button works)
        history.pushState({ view: viewId }, '', `#${viewId}`);
        this._renderView(viewId, true);
    },

    /**
     * Internal Renderer (Async because Stats/Notes might need data)
     */
    async _renderView(viewId, animate = true) {
        this.state.currentView = viewId;
        const container = document.getElementById('app-container');
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        // Clear Container
        container.innerHTML = '';

        // Switch Logic
        switch (viewId) {
            case 'home':
                UI._renderHome(container);
                break;
            
            case 'quiz':
                // Quiz is rendered via Engine updates, mostly initial setup here
                UI._drawQuiz(container);
                break;

            case 'result':
                // Expects resultId in state or query
                // usually triggered by showResult() directly
                break;

            case 'notes':
                UI._renderNotes(container);
                break;

            case 'stats':
                // Async render for the "Oracle"
                await UI._renderStats(container);
                break;

            case 'settings':
                UI._renderSettings(container);
                break;

            default:
                UI._renderHome(container);
        }
    },

    // ============================================================
    // 3. QUIZ CONTROLLER
    // ============================================================

    async startQuiz(subjectId) {
        UI.showLoading();
        this.state.activeSubject = subjectId;

        try {
            // 1. Fetch Data
            const fileName = CONFIG.getFileName(subjectId);
            const response = await fetch(`data/${fileName}`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const rawData = await response.json();
            
            // 2. Normalize Data (Adapter)
            const questions = Adapter.normalize(rawData);
            
            // 3. Initialize Engine
            Engine.init(questions, CONFIG.defaults.mode);

            // 4. Start Timer (Drift-Proof)
            Engine.startTimer(
                (remaining) => UI._updateTimer(remaining), // On Tick
                () => this.finishQuiz() // On Finish
            );

            // 5. Navigate UI
            this.navigate('quiz');

        } catch (error) {
            console.error("Quiz Load Error:", error);
            alert("Failed to load quiz data. Please check your connection.");
            this.navigate('home');
        } finally {
            UI.hideLoading();
        }
    },

    handleAnswer(optionIndex) {
        // 1. Submit to Engine (Records time & choice)
        Engine.submitAnswer(optionIndex);
        
        // 2. Refresh UI (Shows selection state)
        UI._drawQuiz(document.getElementById('app-container'));
    },

    finishQuiz() {
        Engine.stopTimer();

        // 1. Calculate Result
        const result = Engine.calculateResult(this.state.activeSubject);
        
        // 2. Save to Persistence Layer (Store)
        const resultId = Store.saveResult(result);
        
        // 3. Save "Mistakes" for revision
        if (result.mistakes.length > 0) {
            Store.saveMistakes(result.mistakes);
        }

        // 4. Navigate to Result View
        this.showResult(resultId);
    },

    showResult(resultId) {
        // Direct navigation without pushing history loop for 'quiz' -> 'result'
        this.state.currentView = 'result';
        const container = document.getElementById('app-container');
        window.scrollTo(0, 0);
        
        UI._drawAnalysis(container, resultId);
    },

    // ============================================================
    // 4. SYSTEM PREFERENCES
    // ============================================================

    toggleTheme() {
        this.state.darkMode = !this.state.darkMode;
        
        // Update UI
        UI.updateTheme(this.state.darkMode);
        
        // Save to Store
        const currentSettings = Store.get('settings', {});
        Store.set('settings', { ...currentSettings, theme: this.state.darkMode ? 'dark' : 'light' });
    }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Main.init();
});

// Expose to Window for global access
window.Main = Main;
