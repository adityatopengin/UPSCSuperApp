/**
 * ADAPTER.JS - Data Normalization Layer
 * Version: 5.2.0 (Universal Fix)
 * Standardizes raw JSON data into the app's internal schema.
 * Fix: Supports both { questions: [] } and raw [] Array formats.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Adapter = {
    /**
     * Main entry point to normalize a subject file.
     * Uses defensive programming to prevent crashes on invalid data.
     * @param {Object|Array} rawData - The JSON object/array loaded from fetch()
     */
    normalize(rawData) {
        // 1. Safety Check: Is the data completely empty or null?
        if (!rawData) {
            console.error("Adapter: Received null or undefined data.");
            return [];
        }

        // 2. UNIVERSAL FIX: Handle both Array and Object formats
        // Some files might be [ {q1}, {q2} ] (List)
        // Others might be { questions: [ {q1}, {q2} ] } (Object)
        let sourceArray = [];
        
        if (Array.isArray(rawData)) {
            // Case A: The file is just a raw list/array
            console.log("Adapter: Detected Raw Array Format.");
            sourceArray = rawData;
        } else if (rawData.questions && Array.isArray(rawData.questions)) {
            // Case B: The file is an object with a 'questions' key
            console.log("Adapter: Detected Standard Object Format.");
            sourceArray = rawData.questions;
        } else {
            // Case C: Invalid format
            console.error("Adapter: Invalid Data Format - Missing 'questions' array or valid list.", rawData);
            return [];
        }

        console.log(`Adapter: Processing ${sourceArray.length} items...`);

        // 3. Process each question safely
        // We use .reduce instead of .map to filter out invalid items immediately
        return sourceArray.reduce((validQuestions, q, index) => {
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

    // ... Continues in Part 2 ...
        /**
     * Normalizes a single question object with defensive programming.
     * @param {Object} q - Raw question object
     * @param {Number} index - Index for fallback ID generation
     */
    _normalizeQuestion(q, index) {
        // 1. Basic Validation: Must have text and options
        // Some JSONs use 'question', others 'text'
        const qText = q.question || q.text;
        
        // Safety: If no text or options are present, drop this question
        if (!qText || !Array.isArray(q.options)) {
            // Optional: Log specific missing fields for debugging
            // console.warn(`Adapter: Question at index ${index} missing text or options.`);
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


