/**
 * ENGINE.JS - The Core Logic
 * Version: 5.1.0 (Bulletproof Edition)
 * Handles Quiz State, Drift-Proof Timing, and Scoring Metrics.
 * Features: State Validation, Memory Leak Protection, and Metric Tracking.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Engine = {
    // ============================================================
    // 1. STATE MANAGEMENT
    // ============================================================
    state: {
        // Core Data
        questions: [],          // The active set of questions
        totalQuestions: 0,
        
        // Navigation State
        currentIndex: 0,        // 0-based index
        
        // Performance Tracking
        userAnswers: [],        // Array of { qId, selected, timeSpent }
        
        // Timing Systems
        timer: {
            totalSeconds: 0,    // Duration allowed
            remaining: 0,       // Seconds left
            intervalId: null,   // ID for clearing setInterval
            expected: null,     // For drift correction
            isActive: false     // Is timer running?
        },
        
        // Granular Metrics (For Predictive Engine)
        currentQuestionStart: null, // Timestamp when specific Q was shown
        sessionStart: null          // Timestamp when quiz began
    },

    /**
     * Initialize a new Quiz Session
     * @param {Array} questions - Normalized question array from Adapter
     * @param {String} mode - 'test' or 'learning' (from CONFIG)
     */
    init(questions, mode = 'test') {
        // 1. Bulletproof Validation
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            console.error("Engine: Init failed. Invalid questions array.");
            alert("Quiz Data Error: No questions available to start.");
            return false;
        }

        // 2. Reset State (Clean Slate)
        this._resetState();

        // 3. Load Data
        this.state.questions = questions;
        this.state.totalQuestions = questions.length;
        this.state.userAnswers = new Array(questions.length).fill(null);
        this.state.sessionStart = Date.now();

        // 4. Configure Timer Strategy
        // Logic: Heuristic check for CSAT (Math) vs GS
        // Safety: Check if CONFIG exists, fallback to defaults if not
        const defaults = (window.CONFIG && CONFIG.defaults) ? CONFIG.defaults : { timer: { gs1: 72, csat: 90 } };
        
        const firstQ = questions[0];
        const isCsat = firstQ.tags && (firstQ.tags.includes('math') || firstQ.tags.includes('aptitude'));
        const timePerQ = isCsat ? defaults.timer.csat : defaults.timer.gs1;
        
        this.state.timer.totalSeconds = questions.length * timePerQ;
        this.state.timer.remaining = this.state.timer.totalSeconds;
        
        console.log(`⚙️ Engine: Initialized ${questions.length} Qs. Mode: ${mode}. Time: ${this.state.timer.totalSeconds}s`);
        return true;
    },

    /**
     * Internal: Resets all state variables to prevent data bleeding
     * between different tests.
     */
    _resetState() {
        this.stopTimer(); // Ensure no old timers are ticking
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

    // ... Continues in Batch 2 ...
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

        const isCsatSchema = (subjectId === 'csat' || questions[0]?.tags?.includes('math'));
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
                    mistakes.push({
                        ...q, 
                        userSelected: userAns.selected // Store what they guessed
                    });
                }
            }
        });

        // Score Calculation
        const rawScore = (correct * schema.correct) - (wrong * schema.wrong);
        // Clamp to 0 (No negative total scores in this app logic)
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

    /**
     * Utility: Jump to specific question index
     * Used by the Question Palette (Future Feature)
     */
    jumpTo(index) {
        if (index >= 0 && index < this.state.questions.length) {
            this._updateTimeSpentBeforeMove();
            this.state.currentIndex = index;
            this.state.currentQuestionStart = Date.now();
            return true;
        }
        return false;
    }
};

// Expose to Window
window.Engine = Engine;

