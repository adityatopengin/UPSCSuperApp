/**
 * ENGINE.JS - The Core Logic
 * Version: 6.1.0 (The Bridge Edition)
 * * Fixed: Added startSession() to fetch data from assets/data/
 * * Fixed: Connected Main.js trigger to actual file loading
 */

const Engine = {
    // ============================================================
    // 1. STATE MANAGEMENT
    // ============================================================
    state: {
        // Data Containers
        questions: [],          // The active set of questions
        totalQuestions: 0,
        
        // Navigation Trackers
        currentIndex: 0,        // 0-based index
        
        // Performance Data
        userAnswers: [],        // Array of { qId, selected, timeSpent }
        
        // Timer System
        timer: {
            totalSeconds: 0,    // Duration allowed
            remaining: 0,       // Seconds left
            intervalId: null,   // ID for clearing setInterval
            expected: null,     // For drift correction
            isActive: false     // Is timer running?
        },
        
        // Granular Metrics
        currentQuestionStart: null, // Timestamp when specific Q was shown
        sessionStart: null          // Timestamp when quiz began
    },

    // ============================================================
    // 1.5 DATA FETCHING (THE MISSING HANDSHAKE)
    // ============================================================

    /**
     * THE BRIDGE: Fetches, Normalizes, and Starts the Session.
     * This is the function Main.js is trying to call.
     * @param {String} subjectId - e.g. 'history', 'polity'
          /**
     * THE BRIDGE: Fetches, Normalizes, and Starts the Session.
     * NOW FIXED: Looks up the exact filename from CONFIG.
     */
    async startSession(subjectId) {
        console.log(`Engine: Attempting to load [${subjectId}]...`);
        
        // 1. GET CORRECT FILENAME FROM CONFIG
        // This fixes the mismatch (e.g., converting 'geo_ind' -> 'indian_geo.json')
        let fileName = subjectId + '.json'; // Default fallback
        
        if (typeof CONFIG !== 'undefined' && CONFIG.getFileName) {
            const configName = CONFIG.getFileName(subjectId);
            if (configName) fileName = configName;
        }

        // 2. Construct the Path
        const path = `assets/data/${fileName}`;

        try {
            // 3. Fetch the File
            const response = await fetch(path);
            
            if (!response.ok) {
                console.error(`Engine: 404 Error. File not found at ${path}`);
                if (typeof UI !== 'undefined') UI.showToast(`Missing file: ${fileName}`, "error");
                return false;
            }

            // 4. Parse JSON
            const rawData = await response.json();

            // 5. Normalize
            if (typeof Adapter === 'undefined') {
                console.error("Engine: Adapter.js missing!");
                return false;
            }
            const cleanQuestions = Adapter.normalize(rawData);

            // 6. Initialize
            return this.init(cleanQuestions, 'test');

        } catch (error) {
            console.error("Engine: Critical Fetch Error", error);
            return false;
        }
    },


    /**
     * Initialize the internal state with loaded questions.
     * @param {Array} questions - Normalized question array
     * @param {String} mode - 'test' or 'learning'
     */
    init(questions, mode = 'test') {
        // 1. Bulletproof Validation
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            console.error("Engine: Init failed. Empty or invalid question set.");
            return false;
        }

        // 2. Reset State (Clean Slate)
        this._resetState();

        // 3. Load Data into State
        this.state.questions = questions;
        this.state.totalQuestions = questions.length;
        this.state.userAnswers = new Array(questions.length).fill(null);
        this.state.sessionStart = Date.now();

        // 4. Configure Timer Strategy
        // We check if CONFIG exists (defined in config.js), otherwise use safe defaults
        const defaults = (window.CONFIG && CONFIG.defaults) ? CONFIG.defaults : { timer: { gs1: 72, csat: 90 } };
        
        const firstQ = questions[0];
        // Heuristic: If tags include 'math', treat as CSAT
        const isCsat = firstQ.tags && (firstQ.tags.includes('math') || firstQ.tags.includes('aptitude'));
        const timePerQ = isCsat ? defaults.timer.csat : defaults.timer.gs1;
        
        this.state.timer.totalSeconds = questions.length * timePerQ;
        this.state.timer.remaining = this.state.timer.totalSeconds;
        
        console.log(`⚙️ Engine: Ready. ${questions.length} Qs loaded. Mode: ${mode}`);
        return true;
    },

    /**
     * Internal: Resets all state variables.
     */
    _resetState() {
        this.stopTimer(); // Stop any running clocks
        this.state.questions = [];
        this.state.totalQuestions = 0;
        this.state.currentIndex = 0;
        this.state.userAnswers = [];
        this.state.timer = {
            totalSeconds: 0,
            remaining: 0,
            intervalId: null,
            expected: null,
            isActive: false
        };
        this.state.currentQuestionStart = null;
    },

    // ... Continues in Part 2 ...
    // ============================================================
    // 2. DRIFT-PROOF TIMER & TIME TRACKING
    // ============================================================
    
    /**
     * Starts the quiz timer. Uses Date.now() delta to prevent drift.
     * @param {Function} tickCallback - Called every second with remaining time
     * @param {Function} endCallback - Called when time runs out
     */
    startTimer(tickCallback, endCallback) {
        // Prevent double-starting
        if (this.state.timer.isActive) this.stopTimer();

        this.state.timer.isActive = true;
        this.state.timer.startTime = Date.now();
        this.state.timer.expected = Date.now() + 1000;
        
        // Start tracking time for the first question immediately
        this.state.currentQuestionStart = Date.now();

        // The recursive step function (Self-correcting loop)
        const step = () => {
            if (!this.state.timer.isActive) return;

            const now = Date.now();
            const dt = now - this.state.timer.expected; // The drift (lag)

            // If drift is huge (>1s), browser was likely sleeping/tab switched.
            // We accept the time loss (keep exam clock true to wall clock)
            // but reset the expectation to avoid a burst of fast ticks.
            if (dt > 1000) {
                this.state.timer.expected = now;
            }

            this.state.timer.remaining--;

            // Execute UI Callback (Update the visual display)
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
                // Schedule next tick, subtracting the drift time to stay accurate
                this.state.timer.expected += 1000;
                this.state.timer.intervalId = setTimeout(step, Math.max(0, 1000 - dt));
            }
        };

        // Start the loop
        this.state.timer.intervalId = setTimeout(step, 1000);
    },

    /**
     * Stops the timer completely.
     */
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

    /**
     * Returns the current active question object.
     */
    getCurrentQuestion() {
        // Safety check
        if (!this.state.questions || !this.state.questions[this.state.currentIndex]) {
            return { text: "Error: Question not found", options: [] };
        }
        return this.state.questions[this.state.currentIndex];
    },

    /**
     * Gets simple progress stats for the UI progress bar.
     */
    getProgress() {
        return {
            current: this.state.currentIndex,
            total: this.state.totalQuestions,
            percent: ((this.state.currentIndex + 1) / this.state.totalQuestions) * 100
        };
    },

    /**
     * Records the user's answer and the time spent on that specific question.
     * @param {Number} answerIndex - The index of the selected option (0-3)
     */
    submitAnswer(answerIndex) {
        const now = Date.now();
        // Calculate how long user looked at THIS question since entry
        const timeSpentOnThis = (now - this.state.currentQuestionStart) / 1000; 

        // Update the userAnswers array safely
        this.state.userAnswers[this.state.currentIndex] = {
            qId: this.state.questions[this.state.currentIndex].id,
            selected: answerIndex,
            // Accumulate time if they visited this question before (e.g., navigated back)
            timeSpent: (this.state.userAnswers[this.state.currentIndex]?.timeSpent || 0) + parseFloat(timeSpentOnThis.toFixed(1))
        };
        
        // Reset the question timer (so we don't double count if they change answer)
        this.state.currentQuestionStart = Date.now();
    },

    /**
     * Moves to the next question.
     * @returns {Boolean} True if moved, False if at end.
     */
    nextQuestion() {
        if (this.state.currentIndex < this.state.questions.length - 1) {
            this._updateTimeSpentBeforeMove(); // Save time stats before leaving
            this.state.currentIndex++;
            this.state.currentQuestionStart = Date.now(); // Start clock for new Q
            return true;
        }
        return false;
    },

    /**
     * Moves to the previous question.
     * @returns {Boolean} True if moved, False if at start.
     */
    prevQuestion() {
        if (this.state.currentIndex > 0) {
            this._updateTimeSpentBeforeMove(); // Save time stats before leaving
            this.state.currentIndex--;
            this.state.currentQuestionStart = Date.now(); // Start clock for prev Q
            return true;
        }
        return false;
    },

    /**
     * Internal: Updates the time spent on the current question before navigating away.
     * Ensures "thinking time" is captured even if no answer is selected yet.
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

    // ... Continues in Part 3 ...
    // ============================================================
    // 4. SCORING & ANALYTICS
    // ============================================================

    /**
     * Calculates the final result and generates performance metrics.
     * @param {String} subjectId - The ID of the subject being tested
     */
    calculateResult(subjectId) {
        // Ensure we stop the timer first
        this.stopTimer();

        const questions = this.state.questions;
        const answers = this.state.userAnswers;
        
        // Determine Scoring Schema
        // Default to GS1 (Correct: +2, Wrong: -0.66)
        // CSAT (Correct: +2.5, Wrong: -0.83)
        // Safety: Check CONFIG, fallback to hardcoded values
        const defaults = (window.CONFIG && CONFIG.defaults) ? CONFIG.defaults.scoring : {
            gs1: { correct: 2.0, wrong: 0.666 },
            csat: { correct: 2.5, wrong: 0.833 }
        };

        // Auto-detect CSAT based on subject ID or tags
        const isCsatSchema = (subjectId === 'csat' || 
                             subjectId === 'quant' || 
                             subjectId === 'reasoning' || 
                             questions[0]?.tags?.includes('math'));
                             
        const schema = isCsatSchema ? defaults.csat : defaults.gs1;

        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        let totalTimeSpent = 0;
        let mistakes = [];

        // Analysis Loop
        questions.forEach((q, i) => {
            const userAns = answers[i];
            
            // Check if skipped (null entry or null selection)
            if (!userAns || userAns.selected === null) {
                skipped++;
            } else {
                totalTimeSpent += (userAns.timeSpent || 0);
                
                // Compare with normalized correctIndex
                if (userAns.selected === q.correctIndex) {
                    correct++;
                } else {
                    wrong++;
                    // Push full question to mistakes array for Revision Mode
                    // We attach the user's wrong answer for context
                    mistakes.push({
                        ...q, 
                        userSelected: userAns.selected 
                    });
                }
            }
        });

        // Score Calculation (Negative Marking)
        const rawScore = (correct * schema.correct) - (wrong * schema.wrong);
        // Clamp to 0 (No negative total scores allowed in UI)
        const finalScore = Math.max(0, parseFloat(rawScore.toFixed(2))); 
        
        // Accuracy Calculation
        const attempted = correct + wrong;
        const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0;

        // Construct Result Object
        return {
            id: `res_${Date.now()}`, // Temporary ID, Store.js assigns the real one
            subject: subjectId,
            score: finalScore,
            totalMarks: questions.length * schema.correct,
            correct,
            wrong,
            skipped,
            accuracy: parseFloat(accuracy),
            totalDuration: parseFloat(totalTimeSpent.toFixed(1)), // Actual time spent interacting
            mistakes, // Passed to Store for "Spaced Repetition" later
            timestamp: Date.now()
        };
    },
    
    // ============================================================
    // 5. SESSION SAVER (THE HANDSHAKE END)
    // ============================================================

    /**
     * Calculates and saves the result to Store.js.
     * Called by Main.js when user clicks "Submit Test".
     * @returns {Promise<String>} The Result ID (for navigation)
     */
    async endSession() {
        if (typeof Store === 'undefined') {
            console.error("Engine: Store missing! Cannot save results.");
            return null;
        }

        // 1. Identify Subject
        // We retrieve the active subject from Main.js since Engine doesn't store the ID string directly
        const subject = (typeof Main !== 'undefined') ? Main.activeQuizSubject : 'unknown';
        
        // 2. Calculate Stats
        const result = this.calculateResult(subject);

        // 3. Save to Database (Async Handshake)
        try {
            const resultId = await Store.saveResult(result);
            
            // 4. Save Mistakes to Revision Deck
            if (result.mistakes && result.mistakes.length > 0) {
                Store.saveMistakes(result.mistakes);
            }

            console.log(`Engine: Session saved. Score: ${result.score}`);
            return resultId;

        } catch (error) {
            console.error("Engine: Save failed", error);
            return null;
        }
    }
};

// Expose to Window so Main.js can find it
window.Engine = Engine;

