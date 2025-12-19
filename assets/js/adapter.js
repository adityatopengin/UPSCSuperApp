/**
 * ADAPTER.JS - Data Normalization Layer
 * Version: 5.0.0 (Structured Learning Edition)
 * Standardizes raw JSON data into the app's internal schema.
 * Handles "Pro" features like Elimination Logic and Mnemonics.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const Adapter = {
    /**
     * Main entry point to normalize a subject file
     * @param {Object} rawData - The JSON object loaded from fetch()
     */
    normalize(rawData) {
        if (!rawData || !Array.isArray(rawData.questions)) {
            console.error("Adapter: Invalid Data Format", rawData);
            return [];
        }

        return rawData.questions.map(q => this._normalizeQuestion(q));
    },

    /**
     * Normalizes a single question object
     */
    _normalizeQuestion(q) {
        // 1. Detect and Normalize Explanation Structure
        // If it's a simple string (Legacy), convert to Pro Object schema
        let enrichedExplanation = q.explanation;
        
        if (typeof q.explanation === 'string') {
            enrichedExplanation = {
                core: q.explanation,
                expert_note: q.notes || "Focus on the core concepts derived from standard NCERTs.",
                elimination: null, // Legacy data won't have this
                mnemonics: null
            };
        } else if (typeof q.explanation === 'object') {
            // Already in Pro format, just ensure defaults
            enrichedExplanation = {
                core: q.explanation.core || "Detailed explanation not available.",
                expert_note: q.explanation.expert_note || q.notes || "Review this topic in detail.",
                elimination: q.explanation.elimination || null,
                mnemonics: q.explanation.mnemonics || null
            };
        }

        // 2. Return Standardized Internal Schema
        return {
            id: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
            text: q.question, // "question" key in JSON becomes "text" internally
            options: q.options, // Array of strings ["A", "B", "C", "D"]
            correctIndex: q.answer, // 0-3 index
            
            // Metadata for "Syllabus Tracker" & "Stats"
            topic: q.topic || "General", 
            difficulty: q.difficulty || "Moderate",
            tags: q.tags || [],

            // The Enriched Learning Content
            explanation: enrichedExplanation
        };
    },

    /**
     * Utility: Shuffles options for specific modes (Learning Mode)
     * Note: Not used in 'Test Mode' to preserve strict A,B,C,D patterns
     */
    shuffleOptions(question) {
        // Implementation reserved for future Learning Mode updates
        // Currently returns question as-is to maintain consistency
        return question;
    }
};

// Expose to Window
window.Adapter = Adapter;
