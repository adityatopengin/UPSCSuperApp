/**
 * PREDICTIVE_ENGINE.JS - The AI Analyst
 * Version: 5.2.0 (Statistical Real-Time Analysis)
 * Core Logic: Weighted Exponential Moving Average (WEMA)
 * Purpose: Predicts future performance based on past behavior, not just averages.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const PredictiveEngine = {
    
    // Configuration for the Algorithm
    _config: {
        minTestsForPrediction: 3, // Need at least 3 tests to form a trend
        recentWeight: 0.6,        // Recent tests account for 60% of the weight
        decayFactor: 0.95,        // Score decays by 5% every week of inactivity
        optimalTimePerQ: 45       // Seconds (Ideal speed for high accuracy)
    },

    /**
     * The Main Oracle Function.
     * Called by UI.js (Stats Dashboard).
     * @param {String} subjectId - 'gs_overall', 'csat', or specific subject ID
     * @param {Array} fullHistory - Raw history array from Store.getHistory()
     */
    async predictScore(subjectId, fullHistory) {
        // 1. Safety Check
        if (!fullHistory || !Array.isArray(fullHistory) || fullHistory.length === 0) {
            return this._getColdStartResponse();
        }

        // 2. Filter Data based on Context
        const relevantData = this._filterData(subjectId, fullHistory);

        // 3. Check sufficiency
        if (relevantData.length < this._config.minTestsForPrediction) {
            return this._getColdStartResponse(relevantData.length);
        }

        // 4. Run Analysis Modules (Batches 2 & 3)
        // We calculate base metrics here for use in next batches
        const metrics = this._calculateMetrics(relevantData);
        
        // Return promise resolving to the final prediction (to be built in Batch 3)
        return this._generatePrediction(metrics);
    },

    /**
     * INTERNAL: Filters history based on the requested subject scope.
     */
    _filterData(subjectId, history) {
        // Sort by date ascending (oldest -> newest) for trend analysis
        const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);

        if (subjectId === 'gs_overall') {
            // Include all subjects EXCEPT CSAT/Math
            return sorted.filter(h => h.subject !== 'csat' && h.subject !== 'quant' && h.subject !== 'reasoning');
        } else if (subjectId === 'csat_overall') {
            return sorted.filter(h => h.subject === 'csat' || h.subject === 'quant' || h.subject === 'reasoning');
        } else {
            // Specific subject match
            return sorted.filter(h => h.subject === subjectId);
        }
    },

    /**
     * INTERNAL: Calculates the Weighted Average Score.
     * Uses a linear decay weight so recent tests matter most.
     */
    _calculateMetrics(data) {
        let weightedScoreSum = 0;
        let weightedAccuracySum = 0;
        let totalWeight = 0;
        let speedSum = 0;

        data.forEach((test, index) => {
            // Weight increases with index (Older = 1, Newest = data.length)
            // This makes the latest test the most significant factor.
            const weight = index + 1; 
            
            weightedScoreSum += (test.score * weight);
            weightedAccuracySum += (test.accuracy * weight);
            
            // Calculate Average Time Per Question
            const questionCount = test.correct + test.wrong + test.skipped;
            const avgTime = questionCount > 0 ? (test.totalDuration / questionCount) : 0;
            speedSum += avgTime;

            totalWeight += weight;
        });

        // Basic Linear Regression (Slope) for Trend
        // Simple comparison: First half vs Second half average
        const midPoint = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, midPoint);
        const secondHalf = data.slice(midPoint);
        
        const avgFirst = firstHalf.reduce((acc, t) => acc + t.score, 0) / (firstHalf.length || 1);
        const avgSecond = secondHalf.reduce((acc, t) => acc + t.score, 0) / (secondHalf.length || 1);

        return {
            projectedScore: weightedScoreSum / totalWeight,
            projectedAccuracy: weightedAccuracySum / totalWeight,
            avgSpeed: speedSum / data.length,
            trendSlope: avgSecond - avgFirst, // Positive = Improving, Negative = Declining
            testCount: data.length,
            lastTestDate: data[data.length - 1].timestamp
        };
    },

    // ... Continues in Batch 2 ...
    /**
     * INTERNAL: Identifies Positive/Negative performance drivers.
     * Returns an array of factors for the UI Oracle Card.
     */
    _identifyFactors(metrics) {
        const factors = [];

        // 1. Analyze Speed (The "Rushing" Factor)
        if (metrics.avgSpeed < 30) {
            // Too fast (<30s per question)
            if (metrics.projectedAccuracy < 60) {
                factors.push({ label: 'Rushing', impact: 'negative' });
            } else {
                factors.push({ label: 'Rapid Fire', impact: 'positive' });
            }
        } else if (metrics.avgSpeed > 80) {
            // Too slow (>80s per question)
            factors.push({ label: 'Overthinking', impact: 'negative' });
        }

        // 2. Analyze Trend (The "Consistency" Factor)
        if (metrics.trendSlope > 5) {
            factors.push({ label: 'Improving', impact: 'positive' });
        } else if (metrics.trendSlope < -5) {
            factors.push({ label: 'Sliding', impact: 'negative' });
        } else {
            factors.push({ label: 'Stable', impact: 'positive' });
        }

        // 3. Analyze Sleep Impact (Cross-Reference with StudyTracker)
        // We check if StudyTracker exists and has data
        if (window.StudyTracker) {
            const sleep = StudyTracker.getLastSleepData();
            if (sleep.quality === 'Poor') {
                factors.push({ label: 'Fatigue', impact: 'negative' });
            } else if (sleep.quality === 'Optimal') {
                factors.push({ label: 'Well Rested', impact: 'positive' });
            }
        }

        return factors;
    },

    /**
     * INTERNAL: Default response for new users (Cold Start).
     */
    _getColdStartResponse(count = 0) {
        return {
            status: 'cold_start',
            projectedScore: 'N/A',
            projectedAccuracy: 0,
            trend: 'collecting_data',
            factors: [],
            message: `Need ${this._config.minTestsForPrediction - count} more tests to calibrate AI.`
        };
    },

    // ... Continues in Batch 3 ...
    /**
     * INTERNAL: Assembles the final prediction object.
     * Applies time-decay (Forgetting Curve) to the raw metrics.
     */
    _generatePrediction(metrics) {
        // 1. Calculate Forgetting Curve Penalty
        // How many days since the last test?
        const now = Date.now();
        const daysSinceLast = (now - metrics.lastTestDate) / (1000 * 60 * 60 * 24);
        
        let decayMultiplier = 1.0;
        
        if (daysSinceLast > 7) {
            // After 1 week, knowledge starts decaying by 5% per week
            const weeksInactive = Math.floor(daysSinceLast / 7);
            decayMultiplier = Math.pow(this._config.decayFactor, weeksInactive);
        }

        // Apply decay to score (but not accuracy, as skill remains, memory fades)
        const finalScore = Math.round(metrics.projectedScore * decayMultiplier);

        // 2. Determine Trend String
        let trend = 'stable';
        if (metrics.trendSlope > 2) trend = 'rising';
        if (metrics.trendSlope < -2) trend = 'falling';

        // 3. Generate Insight Message
        let message = "Consistency is your superpower.";
        if (decayMultiplier < 0.9) {
            message = "Resume practice! Your recall is fading.";
        } else if (metrics.projectedAccuracy > 80 && metrics.avgSpeed > 60) {
            message = "High accuracy. Try increasing speed.";
        } else if (metrics.projectedAccuracy < 50) {
            message = "Focus on concepts, not just speed.";
        } else if (trend === 'rising') {
            message = "Excellent momentum! Keep pushing.";
        }

        // 4. Return Final Data Structure (Matched to UI.js requirements)
        return {
            status: 'active',
            projectedScore: finalScore,
            projectedAccuracy: Math.round(metrics.projectedAccuracy),
            trend: trend,
            factors: this._identifyFactors(metrics), // From Batch 2
            message: message,
            confidence: decayMultiplier * 100 // Internal metric
        };
    }
};

// Expose to Window
window.PredictiveEngine = PredictiveEngine;

