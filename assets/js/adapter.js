/**
 * ADAPTER.JS - Data Normalization Layer
 * Version: 5.3.0 (Universal Fix)
 * Standardizes raw JSON data into the app's internal schema.
 * Features: Crash Protection, Null Safety, and Pro Schema Support.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Adapter = {
    /**
     * Main entry point to normalize a subject file.
     * wrapping in try-catch to prevent global app crash on bad data.
     * @param {Object|Array} rawData - The JSON object loaded from fetch()
     */
    normalize(rawData) {
        // 1. Safety Check: Is the data completely empty or null?
        if (!rawData) {
            console.error("Adapter: Received null or undefined data.");
            return [];
        }

        // 2. Universal Fix: Handle both Array and Object formats
        let questionsArray = [];

        if (Array.isArray(rawData)) {
            // Case A: The file is just a list [{}, {}, {}]
            // This matches your current ancient_history.json format
            questionsArray = rawData;
        } else if (rawData && Array.isArray(rawData.questions)) {
            // Case B: The file is an object { questions: [...] }
            // This is for future compatibility
            questionsArray = rawData.questions;
        } else {
            console.error("Adapter: Invalid Data Format - No array found.", rawData);
            return [];
        }

        console.log(`Adapter: Processing ${questionsArray.length} items...`);

        // 3. Process each question safely
        // We use .reduce instead of .map to filter out invalid items immediately
        return questionsArray.reduce((validQuestions, q, index) => {
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

