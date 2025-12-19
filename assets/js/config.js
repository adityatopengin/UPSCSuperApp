/**
 * CONFIG.JS - The Central Registry
 * Version: 5.0.0 (Gyan Amala Edition)
 * Handles Subject Mappings, Resource Links, and UI Constants.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const CONFIG = {
    // 1. APP METADATA
    version: "5.0.0",
    name: "UPSCSuperApp",
    org: "Gyan Amala",
    targetYear: "Universal", // Applicable for all aspirants (No batch restriction)

    // 2. QUIZ PROTOCOLS (Strict Production Values)
    defaults: {
        mode: 'test',       // 'test' or 'learning'
        qCount: 10,         // Default questions
        timer: {
            gs1: 72,        // 72s per question (UPSC Standard)
            csat: 90        // 90s per question (UPSC Standard)
        },
        scoring: {
            gs1: { correct: 2.0, wrong: 0.666 },
            csat: { correct: 2.5, wrong: 0.833 }
        }
    },

    // 3. RESOURCE DIRECTORY (Topper Copies & Drives)
    resources: {
        psir: {
            drive: "https://drive.google.com/drive/folders/1-2kk78IRyyhx3TFV2_87cm_iGgdWMwQH",
            topperRepo: "https://t.me/PSIR_Toppers_Copies"
        },
        institutes: [
            { id: 'vision', name: 'Vision IAS', char: 'V', url: 'http://www.visionias.in/resources/toppers_answers.php' },
            { id: 'forum', name: 'Forum IAS', char: 'F', url: 'https://forumias.com/blog/testimonials/' },
            { id: 'insights', name: 'Insights', char: 'I', url: 'https://www.insightsonindia.com/upsc-toppers-answer-copies-download-ias-topper-mains-copies-by-insightsias/' },
            { id: 'next', name: 'Next IAS', char: 'N', url: 'https://www.nextias.com/toppers-answers-ias' },
            { id: 'drishti', name: 'Drishti IAS', char: 'D', url: 'https://www.drishtiias.com/free-downloads/toppers-copy/' },
            { id: 'vajiram', name: 'Vajiram', char: 'VR', url: 'https://vajiramandravi.com/upsc-ias-toppers-copy-and-answer-sheets/' },
            { id: 'shubhra', name: 'Shubhra Ranjan', char: 'SR', url: 'https://www.shubhraviraj.com/' },
            { id: 'raus', name: 'Rau\'s IAS', char: 'R', url: 'https://www.rauias.com/toppers-copies/' },
            { id: 'iasbaba', name: 'IAS Baba', char: 'IB', url: 'https://iasbaba.com/toppers-answer-copies/' }
        ]
    },

    // 4. NOTES LIBRARY (Eyecatcher Cards)
    notesLibrary: [
        { title: "Ancient India", subtitle: "Timeline & Maps", icon: "monument", gradient: "gold" },
        { title: "Modern History", subtitle: "Freedom Struggle", icon: "scroll", gradient: "royal" },
        { title: "Indian Polity", subtitle: "Articles & Amendments", icon: "gavel", gradient: "purple" },
        { title: "Economy", subtitle: "Budget & Survey", icon: "chart-line", gradient: "emerald" },
        { title: "Environment", subtitle: "Conventions & Parks", icon: "leaf", gradient: "emerald" },
        { title: "Art & Culture", subtitle: "Dance, Music & Arch", icon: "palette", gradient: "gold" },
        { title: "Geography", subtitle: "Physical & Human", icon: "earth-asia", gradient: "royal" },
        { title: "Science & Tech", subtitle: "Space & Defense", icon: "rocket", gradient: "purple" },
        { title: "Ethics (GS4)", subtitle: "Key Definitions", icon: "scale-balanced", gradient: "gold" },
        { title: "Essay Quotes", subtitle: "Topic-wise List", icon: "quote-left", gradient: "royal" },
        { title: "Govt Schemes", subtitle: "Ministry-wise", icon: "building-columns", gradient: "purple" },
        { title: "Maps & Places", subtitle: "News Locations", icon: "map-location-dot", gradient: "emerald" }
    ],

    // 5. SUBJECTS REGISTRY
    subjectsGS1: [
        { id: 'ancient', name: 'Ancient History', icon: 'land-mine-on', color: 'amber', file: 'ancient_history.json' },
        { id: 'medieval', name: 'Medieval History', icon: 'chess-rook', color: 'amber', file: 'medieval_history.json' },
        { id: 'modern', name: 'Modern History', icon: 'monument', color: 'amber', file: 'modern_history.json' },
        { id: 'art', name: 'Art & Culture', icon: 'palette', color: 'pink', file: 'art_culture.json' },
        { id: 'polity', name: 'Indian Polity', icon: 'landmark', color: 'blue', file: 'polity.json' },
        { id: 'geo_ind', name: 'Indian Geography', icon: 'map-location-dot', color: 'cyan', file: 'indian_geo.json' },
        { id: 'geo_world', name: 'World Geography', icon: 'earth-americas', color: 'cyan', file: 'world_geo.json' },
        { id: 'env', name: 'Environment', icon: 'leaf', color: 'green', file: 'environment.json' },
        { id: 'eco', name: 'Indian Economy', icon: 'indian-rupee-sign', color: 'emerald', file: 'economy.json' },
        { id: 'sci', name: 'Science & Tech', icon: 'microchip', color: 'indigo', file: 'science_tech.json' },
        { id: 'ir', name: 'Intl. Relations', icon: 'handshake', color: 'purple', file: 'ir.json' }
    ],

    subjectsCSAT: [
        { id: 'quant', name: 'Mathematics', icon: 'calculator', color: 'slate', file: 'csat_math.json' },
        { id: 'reasoning', name: 'Reasoning', icon: 'brain', color: 'rose', file: 'csat_reasoning.json' },
        { id: 'rc', name: 'Reading Passage', icon: 'book-open-reader', color: 'teal', file: 'csat_passage.json' }
    ],

    // 6. UTILITY METHODS
    getFileName(subjectName) {
        const all = [...this.subjectsGS1, ...this.subjectsCSAT];
        const match = all.find(s => s.name === subjectName || s.id === subjectName);
        return match ? match.file : 'ancient_history.json';
    }
};

// Freeze object to prevent runtime tampering in production
Object.freeze(CONFIG);
