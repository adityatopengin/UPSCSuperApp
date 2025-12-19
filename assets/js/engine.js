/**
 * ENGINE.JS - The Core Logic
 * Version: 5.0.0 (Behavioral Metrics Edition)
 * Handles Quiz State, Drift-Proof Timing, and Scoring.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Engine = {
    // ============================================================
    // 1. STATE MANAGEMENT
    // ============================================================
    state: {
        questions: [],
        currentIndex: 0,
        userAnswers: [], // Array of { index, answerIndex, timeSpent }
        timer: {
            totalSeconds: 0,
            remaining: 0,
            intervalId: null,
            startTime: null,
            expected: null // For drift correction
        },
        questionStartTime: null // To track time per specific question
    },

    /**
     * Initialize a new Quiz Session
     * @param {Array} questions - Normalized question array from Adapter
     * @param {String} mode - 'test' or 'learning' (from CONFIG)
     */
    init(questions, mode = 'test') {
        this.state.questions = questions;
        this.state.currentIndex = 0;
        this.state.userAnswers = new Array(questions.length).fill(null);
        
        // Calculate Timer based on Subject Type (GS vs CSAT)
        // Heuristic: If first question has math tags, assume CSAT logic, else GS
        const isCsat = questions[0]?.tags?.includes('math') || false;
        const timePerQ = isCsat ? CONFIG.defaults.timer.csat : CONFIG.defaults.timer.gs1;
        
        this.state.timer.totalSeconds = questions.length * timePerQ;
        this.state.timer.remaining = this.state.timer.totalSeconds;
        
        console.log(`⚙️ Engine: Initialized with ${questions.length} Qs in ${mode} mode.`);
    },

    // ============================================================
    // 2. DRIFT-PROOF TIMER
    // ============================================================
    
    startTimer(tickCallback, endCallback) {
        if (this.state.timer.intervalId) clearInterval(this.state.timer.intervalId);

        this.state.timer.startTime = Date.now();
        this.state.timer.expected = Date.now() + 1000;
        this.state.questionStartTime = Date.now(); // Start tracking Q1 time

        this.state.timer.intervalId = setTimeout(function step() {
            const now = Date.now();
            const dt = now - Engine.state.timer.expected; // The drift

            if (dt > 1000) {
                // Browser was asleep/tab switched
                // We recover simply by relying on the 'expected' time target
            }

            Engine.state.timer.remaining--;
            
            // Execute UI Callback
            if (tickCallback) tickCallback(Engine.state.timer.remaining);

            if (Engine.state.timer.remaining <= 0) {
                Engine.stopTimer();
                if (endCallback) endCallback();
            } else {
                Engine.state.timer.expected += 1000;
                // Schedule next tick, subtracting the drift time
                Engine.state.timer.intervalId = setTimeout(step, Math.max(0, 1000 - dt));
            }
        }, 1000);
    },

    stopTimer() {
        clearTimeout(this.state.timer.intervalId);
        this.state.timer.intervalId = null;
    },

    // ============================================================
    // 3. INTERACTION LOGIC
    // ============================================================

    getCurrentQuestion() {
        return this.state.questions[this.state.currentIndex];
    },

    /**
     * Records the user's answer and the time spent on that question
     */
    submitAnswer(answerIndex) {
        const now = Date.now();
        const timeSpentOnThis = (now - this.state.questionStartTime) / 1000; // Seconds

        this.state.userAnswers[this.state.currentIndex] = {
            qId: this.state.questions[this.state.currentIndex].id,
            selected: answerIndex,
            timeSpent: parseFloat(timeSpentOnThis.toFixed(1))
        };
    },

    nextQuestion() {
        if (this.state.currentIndex < this.state.questions.length - 1) {
            this.state.currentIndex++;
            this.state.questionStartTime = Date.now(); // Reset metric timer
            return true;
        }
        return false;
    },

    prevQuestion() {
        if (this.state.currentIndex > 0) {
            this.state.currentIndex--;
            this.state.questionStartTime = Date.now();
            return true;
        }
        return false;
    },

    /**
     * Jump to specific question (e.g., via Question Palette)
     */
    jumpTo(index) {
        if (index >= 0 && index < this.state.questions.length) {
            this.state.currentIndex = index;
            this.state.questionStartTime = Date.now();
            return true;
        }
        return false;
    },

    // ============================================================
    // 4. SCORING & ANALYTICS
    // ============================================================

    calculateResult(subjectId) {
        const questions = this.state.questions;
        const answers = this.state.userAnswers;
        
        // Determine Scoring Schema (GS vs CSAT)
        const schema = (subjectId === 'csat' || questions[0]?.tags?.includes('math')) 
            ? CONFIG.defaults.scoring.csat 
            : CONFIG.defaults.scoring.gs1;

        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        let totalTimeSpent = 0;
        let mistakes = [];

        questions.forEach((q, i) => {
            const userAns = answers[i];
            
            if (!userAns || userAns.selected === null) {
                skipped++;
            } else {
                totalTimeSpent += userAns.timeSpent || 0;
                
                if (userAns.selected === q.correctIndex) {
                    correct++;
                } else {
                    wrong++;
                    mistakes.push(q); // Collect for "Mistakes Revision"
                }
            }
        });

        const rawScore = (correct * schema.correct) - (wrong * schema.wrong);
        const finalScore = Math.max(0, parseFloat(rawScore.toFixed(2))); // No negative total score
        const accuracy = correct + wrong > 0 ? ((correct / (correct + wrong)) * 100).toFixed(1) : 0;

        return {
            subject: subjectId,
            score: finalScore,
            totalMarks: questions.length * schema.correct,
            correct,
            wrong,
            skipped,
            accuracy: parseFloat(accuracy),
            totalDuration: parseFloat(totalTimeSpent.toFixed(1)),
            mistakes, // Passed to Store for revision
            timestamp: Date.now()
        };
    }
};

// Expose to Window
window.Engine = Engine;
