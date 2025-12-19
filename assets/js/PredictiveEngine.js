/**
 * PREDICTIVE-ENGINE.JS - The Oracle
 * Version: 5.0.0 (Behavioral Analytics Edition)
 * Uses Client-Side Heuristics & Weighted Regression to predict exam scores.
 * Privacy: All calculations happen locally. No data leaves the device.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const PredictiveEngine = {
    // ============================================================
    // 1. PUBLIC API
    // ============================================================

    /**
     * Generates a "Scary Accurate" prediction for a specific subject
     * @param {String} subjectId - The ID of the subject (e.g., 'polity')
     * @returns {Object} - { projectedScore, confidence, factors, message }
     */
    async predictScore(subjectId) {
        console.log(`🔮 Oracle: Analyzing past for ${subjectId}...`);
        
        // 1. Fetch Data
        const history = Store.get('history', []);
        
        // Filter for specific subject (or use all for General Studies prediction)
        const subjectHistory = subjectId === 'gs_overall' 
            ? history 
            : history.filter(h => h.subject === subjectId);

        // COLD START: Not enough data (Need at least 3 tests)
        if (subjectHistory.length < 3) {
            return {
                status: 'cold_start',
                projectedScore: 'N/A',
                trend: 'stable',
                message: "Need 3+ tests to unlock predictions.",
                factors: []
            };
        }

        // 2. BASELINE: Calculate Weighted Mastery (Recent tests matter more)
        const baseMetrics = this._calculateWeightedMastery(subjectHistory);
        
        // 3. CONTEXTUAL MODIFIERS (The "Secret Sauce")
        // These adjustments define the "Oracle" accuracy
        const forgettingFactor = this._calculateForgettingCurve(subjectHistory[0]); // Most recent attempt
        const sleepFactor = this._inferSleepQuality();
        const timeFactor = this._analyzeTimeOfDayPerformance(history);
        const fatigueFactor = this._detectBurnout(history);

        // 4. FINAL REGRESSION FORMULA
        // Predicted = Base * Forgetting * Sleep * Time * Fatigue
        let rawPrediction = baseMetrics.score * forgettingFactor.val * sleepFactor.val * timeFactor.val * fatigueFactor.val;
        
        // Clamp result (0 to 200 for GS standards)
        rawPrediction = Math.max(0, Math.min(200, rawPrediction));

        return {
            status: 'success',
            projectedScore: rawPrediction.toFixed(1),
            baseMastery: baseMetrics.score.toFixed(1),
            trend: baseMetrics.trend, // 'rising', 'falling', 'stable'
            factors: [
                forgettingFactor,
                sleepFactor,
                timeFactor,
                fatigueFactor
            ].filter(f => f.impact !== 'neutral'), // Only show relevant insights
            message: this._generateInsightMessage(forgettingFactor, sleepFactor, fatigueFactor)
        };
    },

    // ============================================================
    // 2. CORE ALGORITHMS
    // ============================================================

    /**
     * Calculates score based on recency-weighted average.
     * Last test counts 40%, previous 30%, etc.
     */
    _calculateWeightedMastery(attempts) {
        // Take last 5 attempts
        const recent = attempts.slice(0, 5);
        
        // Weights for last 5: [0.4, 0.25, 0.2, 0.1, 0.05]
        const weights = [0.4, 0.25, 0.2, 0.1, 0.05];
        let totalScore = 0;
        let totalWeight = 0;

        recent.forEach((attempt, i) => {
            if (weights[i]) {
                // Normalize score to 200 scale if stored differently
                const score = attempt.totalMarks || (attempt.score * 2); // Fallback assumption
                totalScore += score * weights[i];
                totalWeight += weights[i];
            }
        });

        const weightedScore = totalScore / totalWeight;

        // Determine Trend (Is the latest score better than the weighted average?)
        const latest = recent[0].totalMarks || (recent[0].score * 2);
        const trend = latest > weightedScore + 5 ? 'rising' : 
                      latest < weightedScore - 5 ? 'falling' : 'stable';

        return { score: weightedScore, trend };
    },

    /**
     * Ebbinghaus Forgetting Curve Implementation
     * Checks days since last test in this subject.
     */
    _calculateForgettingCurve(lastAttempt) {
        if (!lastAttempt) return { val: 1.0, impact: 'neutral' };

        const lastDate = new Date(lastAttempt.savedAt);
        const now = new Date();
        const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

        // Logic: Retention drops by ~5% every 7 days of inactivity
        if (diffDays > 21) return { val: 0.85, label: 'Memory Decay', impact: 'negative', text: 'Long gap since revision' };
        if (diffDays > 14) return { val: 0.90, label: 'Rusty', impact: 'negative', text: '2 weeks since last test' };
        if (diffDays > 7)  return { val: 0.95, label: 'Slight Decay', impact: 'negative', text: '1 week since last test' };
        
        // Bonus for recent practice
        if (diffDays < 2) return { val: 1.02, label: 'Fresh Mind', impact: 'positive', text: 'Recently revised' };

        return { val: 1.0, impact: 'neutral' };
    },

    /**
     * BEHAVIORAL BIOMETRICS: Inferred Sleep Tracking
     * Uses the data stored by StudyTracker.js
     */
    _inferSleepQuality() {
        const sleepData = Store.get('last_sleep');
        
        if (!sleepData) return { val: 1.0, impact: 'neutral' };

        // Impact Logic
        switch (sleepData.quality) {
            case 'Poor': // < 5 hours
                return { val: 0.92, label: 'Sleep Deprived', impact: 'negative', text: 'Low accuracy risk' };
            case 'Optimal': // 7-9 hours
                return { val: 1.05, label: 'Well Rested', impact: 'positive', text: 'High focus likely' };
            case 'Overslept': // > 9 hours (Grogginess)
                return { val: 0.98, label: 'Overslept', impact: 'negative', text: 'Potential lethargy' };
            default:
                return { val: 1.0, impact: 'neutral' };
        }
    },

    /**
     * Analyzes if user performs better in Morning, Afternoon, or Night
     * (Simplified heuristic for MVP)
     */
    _analyzeTimeOfDayPerformance(history) {
        if (history.length < 10) return { val: 1.0, impact: 'neutral' };

        // This is a placeholder for a more complex clustering algorithm.
        // For now, we return neutral to keep calculations fast.
        return { val: 1.0, impact: 'neutral' }; 
    },

    /**
     * Detects "Burnout" based on rapid test taking frequency
     */
    _detectBurnout(history) {
        // If user has taken > 5 tests in the last 24 hours, apply penalty
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentTests = history.filter(h => new Date(h.savedAt).getTime() > oneDayAgo).length;

        if (recentTests > 6) {
            return { val: 0.88, label: 'High Burnout', impact: 'negative', text: 'Heavy testing volume today' };
        }
        if (recentTests > 4) {
            return { val: 0.94, label: 'Fatigue Risk', impact: 'negative', text: 'Multiple tests taken recently' };
        }

        return { val: 1.0, impact: 'neutral' };
    },

    _generateInsightMessage(forgetting, sleep, fatigue) {
        if (sleep.impact === 'negative') return "⚠️ You seem sleep deprived. Expect a 8-10% score drop.";
        if (fatigue.impact === 'negative') return "⚠️ High test volume detected. Take a break to restore focus.";
        if (forgetting.impact === 'negative') return `⚠️ It's been a while since you studied this. Revision needed.`;
        if (sleep.impact === 'positive') return "🚀 You are well rested! Prime condition for a high score.";
        return "✨ You are consistent. Keep pushing your limits.";
    }
};

// Expose to Window
window.PredictiveEngine = PredictiveEngine;
