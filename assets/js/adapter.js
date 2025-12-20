/**
 * ADAPTER.JS - Data Normalization Layer
 * Version: 5.1.0 (Bulletproof Edition)
 * Standardizes raw JSON data into the app's internal schema.
 * Features: Crash Protection, Null Safety, and Pro Schema Support.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Adapter = {
    /**
     * Main entry point to normalize a subject file.
     * wrapping in try-catch to prevent global app crash on bad data.
     * @param {Object} rawData - The JSON object loaded from fetch()
     */
    normalize(rawData) {
        // 1. Safety Check: Is the data completely empty or null?
        if (!rawData) {
            console.error("Adapter: Received null or undefined data.");
            return [];
        }

        // 2. Safety Check: Does it have the 'questions' array?
        if (!Array.isArray(rawData.questions)) {
            console.error("Adapter: Invalid Data Format - 'questions' array missing.", rawData);
            return [];
        }

        console.log(`Adapter: Processing ${rawData.questions.length} items from ${rawData.subject || 'Unknown Subject'}...`);

        // 3. Process each question safely
        // We use .reduce instead of .map to filter out invalid items immediately
        return rawData.questions.reduce((validQuestions, q, index) => {
            try {
                const normalized = this._normalizeQuestion(q, index);
                if (normalized) {
                    validQuestions.push(normalized);
                }
            } catch (err) {
                console.warn(`Adapter: Skipped corrupt question at index ${index}`, err);
            }
            return validQuestions;
        }, []);
    },

    // ... Continues in Batch 2 ...
    /**
     * Normalizes a single question object with defensive programming.
     * @param {Object} q - Raw question object
     * @param {Number} index - Index for fallback ID generation
     */
    _normalizeQuestion(q, index) {
        // 1. Basic Validation: Must have text and options
        // Some JSONs use 'question', others 'text'
        const qText = q.question || q.text;
        if (!qText || !Array.isArray(q.options)) {
            console.warn(`Adapter: Question at index ${index} missing text or options. Dropping.`);
            return null; // Signals the reduce loop to skip this
        }

        // 2. Safe Explanation Handling (The Crash Fix)
        // Detect if it's a simple string (Legacy), null, or a Pro Object
        let finalExplanation = {
            core: "Detailed explanation not available for this question.",
            expert_note: "Focus on the core concept.",
            elimination: null,
            mnemonics: null
        };

        if (q.explanation) {
            if (typeof q.explanation === 'string') {
                // Legacy Format: Convert string to Pro Schema
                finalExplanation.core = q.explanation;
                // Check if there's a separate 'notes' field in raw data
                if (q.notes) finalExplanation.expert_note = q.notes;
            } 
            else if (typeof q.explanation === 'object') {
                // Pro Format: Validate keys
                finalExplanation = {
                    core: q.explanation.core || finalExplanation.core,
                    expert_note: q.explanation.expert_note || q.notes || finalExplanation.expert_note,
                    elimination: q.explanation.elimination || null,
                    mnemonics: q.explanation.mnemonics || null
                };
            }
        }

        // 3. Return Standardized Internal Schema
        return {
            // Generate ID if missing (Essential for React/DOM keys later)
            id: q.id || `q_${Date.now()}_${index}`,
            
            // Core Content
            text: qText,
            options: q.options, // Array of strings ["A", "B", "C", "D"]
            
            // Answer Handling: Support 'answer' (Legacy) or 'correctIndex'
            // Default to 0 if missing to prevent calculation errors
            correctIndex: (typeof q.answer === 'number') ? q.answer : (q.correctIndex || 0),
            
            // Metadata for "Syllabus Tracker" & "Stats"
            topic: q.topic || "General", 
            difficulty: q.difficulty || "Moderate",
            tags: Array.isArray(q.tags) ? q.tags : ["General"],

            // The Enriched Learning Content
            explanation: finalExplanation
        };
    },

    /**
     * Utility: Shuffles options for Learning Mode.
     * Currently returns question as-is for Test Mode stability.
     */
    shuffleOptions(question) {
        if (!question) return null;
        // Future implementation: Logic to shuffle options array 
        // and adjust correctIndex accordingly.
        return question;
    }
};

// Expose to Window
window.Adapter = Adapter;

