/**
 * UI.js - The Visual Controller
 * Handles all DOM manipulation, animations, and the new Intro/Modal systems.
 */
var UI = {
    // State to track active modals and audio players
    activeModal: null,
    audioPlayer: null,

    // ============================================================
    // 1. GLOBAL HELPERS (Loading & Toast)
    // ============================================================

    /**
     * Shows the global loading spinner (The "Curtain")
     */
    showLoading() {
        // We look for 'loading-overlay' which we fixed in index.html
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.classList.remove('hidden');
            loader.classList.remove('opacity-0');
        }
    },

    /**
     * Hides the global loading spinner
     */
    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.classList.add('opacity-0');
            // Wait for transition to finish before hiding completely
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500);
        }
    },

    /**
     * Shows a temporary toast message at the bottom
     */
    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl z-50 text-sm font-bold flex items-center gap-2 animate-slide-up ${
            type === 'error' ? 'bg-rose-500 text-white' : 
            type === 'success' ? 'bg-emerald-500 text-white' : 
            'bg-slate-800 text-white'
        }`;
        
        toast.innerHTML = `
            <i class="fa-solid ${type === 'error' ? 'fa-circle-exclamation' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${msg}</span>
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    // ============================================================
    // 2. MODAL SYSTEM (The Envelope Logic)
    // ============================================================

    /**
     * Opens a generic modal with custom HTML content.
     * @param {String} htmlContent - The HTML to inject inside the envelope
     */
    openModal(htmlContent) {
        const overlay = document.getElementById('modal-overlay');
        const contentBox = document.getElementById('modal-content');

        if (!overlay || !contentBox) {
            console.error("UI: Modal containers missing in DOM!");
            return;
        }

        // 1. Inject Content
        contentBox.innerHTML = htmlContent;

        // 2. Show Overlay
        overlay.classList.remove('hidden');
        
        // 3. Close Logic (Clicking outside closes it)
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        };

        // 4. Trap 'Escape' key
        document.onkeydown = (e) => {
            if (e.key === 'Escape') this.closeModal();
        };

        this.activeModal = overlay;
    },

    /**
     * Closes the currently open modal and cleans up audio.
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }

        // Stop Audio if playing (Safety cleanup)
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        document.onkeydown = null;
        this.activeModal = null;
    },

    // ... Continues in Part 2 ...
    // ============================================================
    // 3. SWIPE DECK SYSTEM (The Intro Logic)
    // ============================================================

    /**
     * Initializes the Swipe Deck for new users.
     */
    initSwipeDeck() {
        const deckContainer = document.getElementById('intro-deck');
        if (!deckContainer) return;

        // 1. Show the Deck Container
        deckContainer.classList.remove('hidden');

        // 2. Define the Story Cards
        const cardsData = [
            {
                id: 'card-ai',
                title: 'The Brain',
                body: "Don't Just Guess. Predict.<br><br>Our WEMA-based AI analyzes your speed and accuracy to predict your actual UPSC score.",
                icon: 'fa-brain',
                color: 'from-indigo-600 to-purple-600'
            },
            {
                id: 'card-privacy',
                title: 'The Fortress',
                body: "Your Data. Your Device.<br><br>Zero Cloud. Zero Tracking. 100% Offline. Your study patterns never leave this phone.",
                icon: 'fa-shield-halved',
                color: 'from-emerald-600 to-teal-600'
            },
            {
                id: 'card-sensor',
                title: 'The Sensor',
                body: "More Than Just Hours.<br><br>We infer your sleep quality and focus levels to tell you *when* to study, not just *what*.",
                icon: 'fa-heart-pulse',
                color: 'from-rose-500 to-pink-600'
            },
            {
                id: 'card-final',
                title: 'Ready?',
                body: "System Primed. Connection Established.<br>Begin your journey now.",
                icon: 'fa-power-off',
                color: 'from-slate-700 to-slate-900',
                isLast: true // Special flag for the button
            }
        ];

        // 3. Render Cards (Reverse order so first is on top)
        deckContainer.innerHTML = '';
        cardsData.reverse().forEach((card, index) => {
            const el = document.createElement('div');
            el.className = `swipe-card bg-gradient-to-br ${card.color} text-white`;
            el.style.zIndex = index + 10; // Stack order
            
            // Mark the top card (last in DOM because of reverse)
            if (index === cardsData.length - 1) el.classList.add('current');
            else el.classList.add('next');

            el.innerHTML = `
                <i class="fa-solid ${card.icon} text-6xl mb-6 opacity-80 animate-float"></i>
                <h2 class="text-3xl font-display font-bold mb-4">${card.title}</h2>
                <p class="text-lg opacity-90 leading-relaxed">${card.body}</p>
                ${card.isLast ? 
                    `<button onclick="UI.finishIntro()" class="mt-8 px-8 py-3 bg-white text-slate-900 font-bold rounded-full shadow-lg hover:scale-105 transition-transform animate-pulse">
                        INITIALIZE SYSTEM
                    </button>` 
                    : '<div class="mt-8 text-sm opacity-50 uppercase tracking-widest"><i class="fa-solid fa-arrow-right"></i> Swipe</div>'
                }
            `;
            deckContainer.appendChild(el);
        });

        // 4. Attach Touch Physics
        this._attachSwipeListeners(deckContainer);
    },

    /**
     * Internal: Handles the Drag & Drop Physics
     */
    _attachSwipeListeners(container) {
        let startX = 0, currentX = 0;
        let activeCard = container.querySelector('.current');

        const handleStart = (e) => {
            activeCard = container.querySelector('.current'); // Refresh ref
            if (!activeCard) return;
            startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            activeCard.style.transition = 'none'; // Disable transition for instant drag
        };

        const handleMove = (e) => {
            if (!activeCard) return;
            e.preventDefault(); // Stop scrolling
            currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            // Calculate Rotation (max 15 degrees)
            const rotate = deltaX * 0.05;
            
            // Apply Transform
            activeCard.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
        };

        const handleEnd = (e) => {
            if (!activeCard) return;
            const deltaX = currentX - startX;
            const threshold = 100; // Pixels to trigger swipe

            if (Math.abs(deltaX) > threshold) {
                // Fly Away!
                const direction = deltaX > 0 ? 'fly-right' : 'fly-left';
                activeCard.classList.add(direction);
                
                // Promote next card
                setTimeout(() => {
                    activeCard.remove();
                    const nextCard = container.lastElementChild; // Since we reversed logic
                    if (nextCard) {
                        nextCard.classList.remove('next');
                        nextCard.classList.add('current');
                        // Reset vars for next card
                        activeCard = nextCard; 
                        startX = 0; currentX = 0;
                    }
                }, 300);
            } else {
                // Snap Back
                activeCard.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                activeCard.style.transform = 'translateX(0) rotate(0)';
            }
        };

        // Bind Events
        container.addEventListener('touchstart', handleStart);
        container.addEventListener('touchmove', handleMove);
        container.addEventListener('touchend', handleEnd);
    },

    /**
     * Called when user clicks "Initialize System" on the last card.
     */
    finishIntro() {
        const deck = document.getElementById('intro-deck');
        if (deck) {
            deck.classList.add('hidden'); // Hide deck
            
            // Trigger the Orientation Modal immediately
            setTimeout(() => {
                this.modals.orientation(); 
            }, 500);
        }
    },

    // ... Continues in Part 3 ...
    // ============================================================
    // 4. MODAL CONTENT GENERATORS (The "Letters" inside the Envelope)
    // ============================================================

    modals: {
        /**
         * STEP 1: ORIENTATION (Audio Experience)
         * Triggered after Intro Deck.
         */
        orientation() {
            const html = `
                <div class="p-8 flex flex-col items-center text-center relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    
                    <h3 class="text-2xl font-display font-bold text-slate-800 dark:text-white mb-2">Orientation 2026</h3>
                    <p class="text-sm text-slate-500 mb-8 font-mono">"Listen to the path before you walk it."</p>

                    <div class="my-4 relative">
                        <div class="audio-ripple-btn" onclick="UI._toggleAudio(this, 'assets/audio/disclaimer.mp3')">
                            <i class="fa-solid fa-play ml-1"></i> 
                        </div>
                    </div>
                    
                    <p class="text-xs text-slate-400 mt-6 mb-8">Tap circle to play/pause</p>

                    <button onclick="UI.modals.disclaimer()" class="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 transition-colors">
                        I am Ready <i class="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            `;
            UI.openModal(html);
        },

        /**
         * STEP 2: THE COVENANT (Disclaimer & Privacy)
         * Triggered by "I am Ready"
         */
        disclaimer() {
            const html = `
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-4 text-rose-500">
                        <i class="fa-solid fa-file-contract text-xl"></i>
                        <h3 class="text-xl font-display font-bold">The Covenant</h3>
                    </div>
                    
                    <div class="h-64 overflow-y-auto pr-2 text-sm text-slate-600 dark:text-slate-300 space-y-4 mb-6 font-serif border-l-2 border-rose-100 pl-4">
                        <p><strong>1. Non-Liability:</strong> This system uses AI to generate questions. While accuracy is high, the Creator (Aspirant) is not liable for errors in the real examination.</p>
                        <p><strong>2. Data Sovereignty:</strong> Your data (Scores, Sleep Patterns, Weaknesses) lives locally on this device. We do not own it. You do.</p>
                        <p><strong>3. The Goal:</strong> This tool is built to assist, not replace, standard text-books.</p>
                    </div>

                    <button onclick="UI.modals.motive()" class="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all">
                        Accept & Begin
                    </button>
                </div>
            `;
            UI.openModal(html);
        },

        /**
         * STEP 3: THE MOTIVE (Vision)
         * Triggered by "Accept & Begin"
         */
        motive() {
            const html = `
                <div class="p-8 text-center bg-slate-50 dark:bg-slate-800/50">
                    <i class="fa-solid fa-scale-balanced text-4xl text-emerald-500 mb-4 animate-bounce-small"></i>
                    <h3 class="text-2xl font-display font-bold text-slate-800 dark:text-white mb-4">Gyan Amala</h3>
                    
                    <p class="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                        "Elite preparation shouldn't cost a fortune. This is a Serverless, Zero-Cost, Pure Knowledge engine built by an aspirant, for aspirants."
                    </p>

                    <button onclick="UI._finalizeJourney()" class="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-transform hover:scale-105">
                        Enter the Dojo
                    </button>
                </div>
            `;
            UI.openModal(html);
        },

        /**
         * EXTRA: ABOUT CREATOR (Profile Card)
         * Accessed via Settings Menu
         */
        aboutCreator() {
            const html = `
                <div class="relative">
                    <div class="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    
                    <div class="px-6 pb-6">
                        <div class="relative -mt-12 mb-4">
                            <div class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 overflow-hidden flex items-center justify-center">
                                <span class="text-3xl font-display font-bold text-slate-400">AS</span>
                            </div>
                        </div>

                        <h3 class="text-2xl font-display font-bold text-slate-800 dark:text-white">Ekam Satyam</h3>
                        <p class="text-indigo-500 font-bold text-sm mb-4">The Architect</p>

                        <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">
                            B.A. (Hons) Pol. Science. No coding degree. Built this entirely with AI to prove that passion > qualifications.
                        </p>

                        <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-800 dark:text-amber-200 italic mb-6">
                            "Do not offer me security guard roles! I am currently serving the RAJA OF DHOLAKPUR."
                        </div>

                        <button class="w-full py-2 border-2 border-indigo-500 text-indigo-500 font-bold rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                            Offer a Job (Plan B)
                        </button>
                    </div>
                </div>
            `;
            UI.openModal(html);
        }
    },

    // ... Continues in Part 4 ...

    // ============================================================
    // 5. AUDIO PLAYER & JOURNEY LOGIC
    // ============================================================

    /**
     * Toggles Play/Pause for the custom audio button.
     * @param {HTMLElement} btn - The button element clicked
     * @param {String} src - Path to the audio file
     */
    _toggleAudio(btn, src) {
        const icon = btn.querySelector('i');

        // Case A: Audio is already playing -> Pause it
        if (this.audioPlayer && !this.audioPlayer.paused) {
            this.audioPlayer.pause();
            btn.classList.remove('playing');
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            return;
        }

        // Case B: Start new audio
        if (!this.audioPlayer) {
            this.audioPlayer = new Audio(src);
            
            // Handle End of Track
            this.audioPlayer.onended = () => {
                btn.classList.remove('playing');
                icon.classList.remove('fa-pause');
                icon.classList.add('fa-play');
            };
            
            // Handle Errors (File missing)
            this.audioPlayer.onerror = () => {
                this.showToast("Audio file missing. Check assets folder.", "error");
                btn.classList.remove('playing');
            };
        }

        // Play
        this.audioPlayer.play();
        btn.classList.add('playing'); // Triggers CSS ripple animation
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
    },

    /**
     * Called when the user clicks "Enter the Dojo".
     * Saves the flag and reveals the Dashboard.
     */
    _finalizeJourney() {
        // 1. Save to Persistent Store
        if (window.Store) {
            // Get current settings, update 'is_initiated', and save back
            const settings = Store.getAppSettings('settings', {});
            Store.setAppSettings('settings', { ...settings, is_initiated: true });
        }

        // 2. Close Modal
        this.closeModal();

        // 3. Show Success Toast
        this.showToast("Welcome to the brotherhood.", "success");

        // 4. Trigger Home Render (Navigate to Home)
        if (window.Main) {
            Main.navigate('home');
        }
    },

    // ============================================================
    // 6. STANDARD VIEW RENDERERS (Home & Stats)
    // ============================================================

    /**
     * Renders the Home Dashboard.
     * @param {HTMLElement} container - The main app container
     */
    async _renderHome(container) {
        // 1. Get Data from Store
        const name = Store.getAppSettings('user_name', 'Future Officer');
        const streak = Store.getAppSettings('streak', 0);
        
        // 2. Build the Resume Card HTML (The "Continue" Section)
        let resumeHTML = '';
        const lastResult = await Store.getLastResult(); // Async fetch
        
        if (lastResult) {
            resumeHTML = `
                <div class="mb-8 p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none text-white relative overflow-hidden group cursor-pointer" onclick="Main.showResult('${lastResult.id}')">
                    <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16 transform group-hover:scale-110 transition-transform"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Continue Learning</h3>
                                <p class="text-xl font-display font-bold">${lastResult.subject || 'General Studies'}</p>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <i class="fa-solid fa-play text-sm"></i>
                            </div>
                        </div>
                        <div class="flex items-center gap-4 text-sm">
                            <span class="bg-indigo-500/50 px-3 py-1 rounded-lg">Score: ${lastResult.score.toFixed(1)}</span>
                            <span class="opacity-70">${new Date(lastResult.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Empty State
            resumeHTML = `
                <div class="mb-8 p-6 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl text-center">
                    <p class="text-slate-500 font-bold">No active sessions.</p>
                    <p class="text-xs text-slate-400 mt-1">Select a subject to start.</p>
                </div>
            `;
        }

        // 3. Inject Full Home HTML
        container.innerHTML = `
            <div class="p-6 pb-32 animate-view-enter">
                <header class="flex justify-between items-center mb-8">
                    <div>
                        <h1 class="text-3xl font-display font-black text-slate-800 dark:text-white tracking-tight">
                            Good Morning,<br><span class="text-indigo-600 dark:text-indigo-400">${name}</span>
                        </h1>
                        <p class="text-sm text-slate-500 font-bold mt-1"><i class="fa-solid fa-fire text-orange-500 mr-1"></i> ${streak} Day Streak</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-lg overflow-hidden cursor-pointer" onclick="Main.navigate('settings')">
                        <img src="assets/img/profile.jpg" onerror="this.src='https://ui-avatars.com/api/?name=AS&background=0D8ABC&color=fff'" class="w-full h-full object-cover">
                    </div>
                </header>

                ${resumeHTML}

                <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-layer-group text-indigo-500"></i> Modules
                </h2>
                
                <div class="grid grid-cols-2 gap-4">
                    ${this._generateSubjectGrid()} 
                </div>
            </div>
            
            ${this._generateFooter('home')}
        `;
    },

    // ... Continues in Part 5 ...
    /**
     * INTERNAL: Generates the Subject Cards HTML based on Config.
     */
    _generateSubjectGrid() {
        if (!window.CONFIG) return '<p class="text-rose-500">Config Error</p>';
        
        return CONFIG.subjects.map(sub => `
            <div onclick="Main.startQuiz('${sub.id}')" class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md active:scale-95 transition-all cursor-pointer group">
                <div class="w-12 h-12 rounded-xl bg-${sub.color}-100 dark:bg-${sub.color}-900/30 flex items-center justify-center text-${sub.color}-600 dark:text-${sub.color}-400 mb-4 group-hover:rotate-6 transition-transform">
                    <i class="fa-solid ${sub.icon} text-xl"></i>
                </div>
                <h3 class="font-bold text-slate-700 dark:text-slate-200 text-sm">${sub.name}</h3>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">${sub.count} Qs</p>
            </div>
        `).join('');
    },

    /**
     * INTERNAL: Generates the Sticky Bottom Navigation.
     */
    _generateFooter(activeTab) {
        const tabs = [
            { id: 'home', icon: 'fa-house', label: 'Home' },
            { id: 'notes', icon: 'fa-book-open', label: 'Notes' },
            { id: 'stats', icon: 'fa-chart-pie', label: 'Stats' },
            { id: 'settings', icon: 'fa-gear', label: 'Settings' }
        ];

        return `
            <nav class="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40 max-w-md mx-auto left-0 right-0">
                <div class="flex justify-between items-end">
                    ${tabs.map(tab => {
                        const isActive = tab.id === activeTab;
                        return `
                        <button onclick="Main.navigate('${tab.id}')" class="flex flex-col items-center gap-1 p-2 w-16 transition-all duration-300 ${isActive ? '-translate-y-2' : 'opacity-50 hover:opacity-80'}">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 dark:text-slate-400'}">
                                <i class="fa-solid ${tab.icon} ${isActive ? 'text-sm' : 'text-lg'}"></i>
                            </div>
                            ${isActive ? `<span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 animate-slide-up">${tab.label}</span>` : ''}
                        </button>
                        `;
                    }).join('')}
                </div>
            </nav>
        `;
    },

    // ============================================================
    // 7. QUIZ INTERFACE RENDERER
    // ============================================================

    /**
     * Renders the active Quiz Interface (Question, Options, Timer).
     * @param {HTMLElement} container - The main app container
     */
    _drawQuiz(container) {
        // 1. Get Current Question Data from Engine
        const q = Engine.getCurrentQuestion();
        const progress = Engine.getProgress(); // Returns { current, total, percentage }
        
        if (!q) {
            console.error("UI: No active question found.");
            return;
        }

        // 2. Build Options HTML
        // We check if an option is selected to style it (Blue if selected)
        const optionsHTML = q.options.map((opt, idx) => {
            const isSelected = (Engine.state.answers[q.id] === idx);
            return `
                <button onclick="Main.handleAnswer(${idx})" class="w-full text-left p-4 rounded-xl border-2 transition-all mb-3 relative overflow-hidden group ${
                    isSelected 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }">
                    <div class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'
                    }">
                        ${isSelected ? '<i class="fa-solid fa-check text-[10px] text-white"></i>' : ''}
                    </div>
                    
                    <span class="pl-8 text-sm font-medium text-slate-700 dark:text-slate-200 block group-hover:translate-x-1 transition-transform">
                        ${opt}
                    </span>
                </button>
            `;
        }).join('');

        // 3. Render Full Quiz Layout
        container.innerHTML = `
            <div class="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 flex flex-col">
                
                <div class="sticky top-0 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md z-30 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-bold text-slate-400">Q.${progress.current + 1} / ${progress.total}</span>
                        <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <i class="fa-regular fa-clock text-indigo-500 text-xs"></i>
                            <span id="quiz-timer" class="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">--:--</span>
                        </div>
                    </div>
                    <div class="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 transition-all duration-500" style="width: ${progress.percent}%"></div>
                    </div>
                </div>

                <div class="flex-1 px-6 py-6 overflow-y-auto">
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6 animate-slide-up">
                        <h2 class="text-lg font-display font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                            ${q.text}
                        </h2>
                    </div>

                    <div class="animate-slide-up" style="animation-delay: 0.1s">
                        ${optionsHTML}
                    </div>
                </div>

                <div class="fixed bottom-0 left-0 w-full max-w-md mx-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex gap-4 z-40">
                    ${progress.current === progress.total - 1
                        ? `<button onclick="Main.finishQuiz()" class="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
                                Submit Test <i class="fa-solid fa-flag-checkered ml-2"></i>
                           </button>`
                        : `<button onclick="Engine.nextQuestion(); UI._drawQuiz(document.getElementById('app-container'));" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                                Next Question <i class="fa-solid fa-arrow-right ml-2"></i>
                           </button>`
                    }
                </div>
            </div>
        `;
    },

    /**
     * Updates the Timer Text (Called every second by Engine).
     * @param {String} timeString - The formatted time (e.g., "14:30")
     */
    _updateTimer(timeString) {
        const el = document.getElementById('quiz-timer');
        if (el) el.innerText = timeString;
    },

    // ... Continues in Part 6 ...
    // ============================================================
    // 8. RESULT ANALYSIS & SETTINGS
    // ============================================================

    /**
     * Renders the detailed Analysis View after a quiz.
     * @param {HTMLElement} container - App container
     * @param {String} resultId - ID of the result to fetch
     */
    async _drawAnalysis(container, resultId) {
        // 1. Fetch Result from Store
        const result = await Store.getResult(resultId);
        if (!result) {
            this.showToast("Result not found.", "error");
            Main.navigate('home');
            return;
        }

        // 2. Render Layout
        container.innerHTML = `
            <div class="p-6 pb-32 animate-slide-up">
                <div class="flex justify-between items-center mb-6">
                    <button onclick="Main.navigate('home')" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="font-display font-bold text-lg">Performance Analysis</h2>
                    <div class="w-10"></div> </div>

                <div class="bg-indigo-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-indigo-500/30 mb-8 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                    
                    <p class="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-2">Total Score</p>
                    <h1 class="text-5xl font-display font-black mb-2">${result.score.toFixed(2)}</h1>
                    <p class="text-sm opacity-80">Accuracy: ${result.accuracy}%</p>
                    
                    <div class="mt-6 h-32 w-full">
                        <canvas id="resultChart"></canvas>
                    </div>
                </div>

                <h3 class="font-bold text-slate-800 dark:text-white mb-4">Detailed Solutions</h3>
                <div class="space-y-4">
                    ${result.questions.map((q, idx) => {
                        const isCorrect = (q.userAnswer === q.correctAnswer);
                        const isSkipped = (q.userAnswer === -1);
                        const statusColor = isCorrect ? 'emerald' : isSkipped ? 'slate' : 'rose';
                        const statusIcon = isCorrect ? 'fa-check' : isSkipped ? 'fa-minus' : 'fa-xmark';

                        return `
                        <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div class="flex gap-3">
                                <div class="mt-1 w-6 h-6 rounded-full bg-${statusColor}-100 dark:bg-${statusColor}-900/30 text-${statusColor}-500 flex items-center justify-center flex-shrink-0">
                                    <i class="fa-solid ${statusIcon} text-xs"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Q${idx + 1}. ${q.text}</h4>
                                    <div class="flex flex-wrap gap-2 mb-3">
                                        <span class="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                                            Your: ${isSkipped ? 'Skipped' : ['A','B','C','D'][q.userAnswer]}
                                        </span>
                                        <span class="text-[10px] px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                                            Correct: ${['A','B','C','D'][q.correctAnswer]}
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <strong class="block text-indigo-500 mb-1">Explanation:</strong>
                                        ${q.explanation || 'No explanation provided.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        // 3. Initialize Mini Chart (Accuracy Donut)
        // We use a timeout to ensure DOM is painted
        setTimeout(() => {
            const ctx = document.getElementById('resultChart');
            if (ctx && window.Chart) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Correct', 'Wrong', 'Skipped'],
                        datasets: [{
                            data: [result.stats.correct, result.stats.wrong, result.stats.skipped],
                            backgroundColor: ['#ffffff', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.2)'],
                            borderRadius: 4,
                            barThickness: 12
                        }]
                    },
                    options: {
                        plugins: { legend: { display: false } },
                        scales: { 
                            x: { display: false }, 
                            y: { display: false } 
                        },
                        maintainAspectRatio: false
                    }
                });
            }
        }, 100);
    },

    /**
     * Renders the Settings Menu.
     */
    _renderSettings(container) {
        // Current Theme State
        const isDark = document.documentElement.classList.contains('dark');

        container.innerHTML = `
            <div class="p-6 pb-32 animate-view-enter">
                <h1 class="text-2xl font-display font-black text-slate-800 dark:text-white mb-6">Settings</h1>

                <div onclick="UI.modals.aboutCreator()" class="bg-indigo-600 p-6 rounded-3xl text-white mb-8 relative overflow-hidden cursor-pointer active:scale-95 transition-transform">
                     <div class="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
                     <div class="flex items-center gap-4 relative z-10">
                        <div class="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 overflow-hidden">
                            <img src="assets/img/profile.jpg" onerror="this.src='https://ui-avatars.com/api/?name=AS&background=random'" class="w-full h-full object-cover">
                        </div>
                        <div>
                            <h2 class="font-bold text-lg">Future Officer</h2>
                            <p class="text-indigo-200 text-xs">UPSC CSE 2026 Aspirant</p>
                        </div>
                     </div>
                </div>

                <div class="space-y-3">
                    <button onclick="Main.toggleTheme()" class="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-slate-700 text-indigo-500 flex items-center justify-center">
                                <i class="fa-solid fa-moon"></i>
                            </div>
                            <span class="font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
                        </div>
                        <div class="w-12 h-6 rounded-full transition-colors relative ${isDark ? 'bg-indigo-500' : 'bg-slate-300'}">
                            <div class="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${isDark ? 'left-7' : 'left-1'}"></div>
                        </div>
                    </button>

                    <button onclick="UI.modals.orientation()" class="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm active:bg-slate-50 transition-colors">
                        <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-slate-700 text-emerald-500 flex items-center justify-center">
                            <i class="fa-solid fa-headphones"></i>
                        </div>
                        <span class="font-bold text-slate-700 dark:text-slate-200">Replay Orientation</span>
                    </button>

                    <button onclick="UI.modals.aboutCreator()" class="w-full flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm active:bg-slate-50 transition-colors">
                        <div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-slate-700 text-amber-500 flex items-center justify-center">
                            <i class="fa-solid fa-code"></i>
                        </div>
                        <span class="font-bold text-slate-700 dark:text-slate-200">About Developer</span>
                    </button>
                    
                     <button onclick="localStorage.clear(); location.reload();" class="w-full flex items-center gap-3 p-4 mt-8 rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 active:bg-rose-100 transition-colors">
                        <div class="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-500 flex items-center justify-center">
                            <i class="fa-solid fa-trash"></i>
                        </div>
                        <span class="font-bold text-rose-600 dark:text-rose-400">Reset App Data</span>
                    </button>
                </div>
            </div>
            ${this._generateFooter('settings')}
        `;
    },

    /**
     * Updates global theme classes on the HTML tag.
     * @param {Boolean} isDark 
     */
    updateTheme(isDark) {
        const html = document.documentElement;
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }
};
