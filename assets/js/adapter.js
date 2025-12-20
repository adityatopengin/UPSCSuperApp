/**
 * ADAPTER.JS - The Universal Translator
 * Version: 6.1.0 (Smart Scan Edition)
 * Purpose: Ensures the Engine receives clean data, regardless of the JSON format.
 * Feature: Case-insensitive key mapping (Fixes "Question" vs "question" mismatches).
 */

const Adapter = {
    /**
     * Main Entry Point: Normalizes raw data into App Schema.
     * @param {Object|Array} rawData - The JSON loaded from the file.
     */
    normalize(rawData) {
        // 1. Safety Check: Dead Data
        if (!rawData) {
            console.error("Adapter: Received null data.");
            return [];
        }

        // 2. Format Detection (Array vs Object)
        let sourceArray = [];
        
        // Scenario A: It's already a list [ {q1}, {q2} ]
        if (Array.isArray(rawData)) {
            sourceArray = rawData;
        } 
        // Scenario B: It's wrapped { "questions": [...] }
        else if (rawData.questions && Array.isArray(rawData.questions)) {
            sourceArray = rawData.questions;
        }
        // Scenario C: It's wrapped { "data": [...] }
        else if (rawData.data && Array.isArray(rawData.data)) {
            sourceArray = rawData.data;
        }
        // Scenario D: Case-insensitive scan for any array
        else {
            const keys = Object.keys(rawData);
            for (let key of keys) {
                if (Array.isArray(rawData[key])) {
                    console.log(`Adapter: Auto-detected array in key ['${key}']`);
                    sourceArray = rawData[key];
                    break;
                }
            }
        }

        if (sourceArray.length === 0) {
            console.error("Adapter: Could not find a question array inside the JSON.");
            return [];
        }

        console.log(`Adapter: Processing ${sourceArray.length} items...`);

        // 3. Process & Clean
        return sourceArray.reduce((validItems, item, index) => {
            const cleanItem = this._normalizeItem(item, index);
            if (cleanItem) {
                validItems.push(cleanItem);
            }
            return validItems;
        }, []);
    },

    /**
     * Smart Item Normalizer
     * Uses fuzzy matching to find text/options/answer fields.
     */
    _normalizeItem(q, index) {
        // HELPER: Case-insensitive property finder
        // usage: findKey(q, 'question', 'text', 'title')
        const getVal = (obj, ...candidates) => {
            const keys = Object.keys(obj).map(k => k.toLowerCase());
            for (let c of candidates) {
                // Exact match check
                if (obj[c]) return obj[c];
                // Case-insensitive check
                const matchIndex = keys.indexOf(c.toLowerCase());
                if (matchIndex > -1) {
                    const realKey = Object.keys(obj)[matchIndex];
                    return obj[realKey];
                }
            }
            return null;
        };

        // 1. Extract Core Fields (Smart Scan)
        const qText = getVal(q, 'question', 'text', 'q', 'title', 'statement');
        const qOptions = getVal(q, 'options', 'choices', 'answers', 'alternatives');
        
        // 2. Validate
        if (!qText || !Array.isArray(qOptions) || qOptions.length < 2) {
            // console.warn(`Adapter: Item ${index} is malformed (missing text or options).`);
            return null; 
        }

        // 3. Extract Correct Answer
        // Supports index (0-3) or string ("A", "Option A")
        let rawAns = getVal(q, 'answer', 'correct', 'correctIndex', 'ans');
        let correctIndex = 0; // Default

        if (typeof rawAns === 'number') {
            correctIndex = rawAns;
        } else if (typeof rawAns === 'string') {
            // Logic to convert "B" or "Option B" to index 1
            const char = rawAns.trim().charAt(0).toUpperCase();
            const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            if (map[char] !== undefined) correctIndex = map[char];
        }

        // ... Continues in Part 2 ...

        // 4. Safe Explanation Handling (The "Crash Fix")
        // Converts legacy string explanations into the new "Pro Object" format
        // This ensures the UI never crashes when trying to read explanation.core
        
        const rawExpl = getVal(q, 'explanation', 'solution', 'rationale', 'desc');
        
        let finalExplanation = {
            core: "Detailed explanation not available for this question.",
            expert_note: null,
            elimination: null
        };

        if (rawExpl) {
            if (typeof rawExpl === 'string') {
                // Case A: It's just a string -> Put it in 'core'
                finalExplanation.core = rawExpl;
                
                // Check if there's a separate 'notes' field for extra info
                const notes = getVal(q, 'notes', 'remark', 'tip');
                if (notes) finalExplanation.expert_note = notes;
            } 
            else if (typeof rawExpl === 'object') {
                // Case B: It's already an object -> Map keys safely
                finalExplanation = {
                    core: getVal(rawExpl, 'core', 'text', 'main') || finalExplanation.core,
                    expert_note: getVal(rawExpl, 'expert_note', 'note', 'extra') || null,
                    elimination: getVal(rawExpl, 'elimination', 'trick') || null
                };
            }
        }

        // 5. Construct & Return the Clean Object
        // This schema matches exactly what Engine.js expects
        return {
            id: q.id || `q_${Date.now()}_${index}`, // Fallback ID
            text: qText,
            options: qOptions,
            correctIndex: correctIndex,
            
            // Metadata
            topic: getVal(q, 'topic', 'subject', 'category') || "General",
            difficulty: getVal(q, 'difficulty', 'level') || "Moderate",
            tags: getVal(q, 'tags', 'keywords') || [],

            // The Rich Content
            explanation: finalExplanation
        };
    }
};

// Expose to Window
window.Adapter = Adapter;
