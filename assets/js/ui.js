/**
 * UI.JS - The View Layer (Part 1: Core & Navigation)
 * Version: 5.0.0 (Gyan Amala Edition)
 * Handles Header, Footer, and Core Utility Methods.
 * Organization: Gyan Amala | App: UPSCSuperApp
 */

const UI = {
    // ============================================================
    // 1. CORE UTILITIES
    // ============================================================
    
    /**
     * Sanitizes input to prevent XSS
     */
    sanitize(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    /**
     * Shows the "Glassmorphism" Loading Spinner
     */
    showLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.remove('hidden');
    },

    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) loader.classList.add('hidden');
    },

    /**
     * Updates the global background based on theme
     */
    updateTheme(isDark) {
        const body = document.body;
        if (isDark) {
            body.classList.add('dark');
            // Premium Dark Gradient
            body.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'; 
        } else {
            body.classList.remove('dark');
            // Premium Light Fusion
            body.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'; 
        }
    },

    // ============================================================
    // 2. HEADER RENDERING
    // ============================================================

    renderHeader(container, user) {
        const timeOfDay = new Date().getHours() < 12 ? 'Good Morning' : 'Good Evening';
        
        container.innerHTML = `
        <div class="flex items-center justify-between pb-6 animate-fade-in-down">
            <div class="flex items-center gap-4">
                <div class="relative group">
                    <div class="absolute inset-0 bg-blue-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                    <img src="assets/images/Omg.jpg" 
                         alt="Profile" 
                         class="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 relative z-10 shadow-lg"
                         onerror="this.src='https://ui-avatars.com/api/?name=Aspirant&background=0D8ABC&color=fff'">
                    <div class="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full z-20"></div>
                </div>
                <div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">${timeOfDay}</p>
                    <h1 class="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                        Future Officer <span class="text-blue-500">.</span>
                    </h1>
                </div>
            </div>

            <div class="premium-card px-4 py-2 rounded-2xl flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md">
                <i class="fa-solid fa-fire text-orange-500 animate-pulse"></i>
                <span class="text-sm font-black text-slate-700 dark:text-slate-200">
                    ${Store.get('streak', 1)} <span class="text-[9px] text-slate-400 uppercase">DAYS</span>
                </span>
            </div>
        </div>`;
    },

    // ============================================================
    // 3. FOOTER NAVIGATION (3D Floating Dock)
    // ============================================================

    renderFooter(container, activeTab = 'home') {
        const tabs = [
            { id: 'home', icon: 'fa-house', label: 'Home' },
            { id: 'notes', icon: 'fa-book-open', label: 'Notes' },
            { id: 'stats', icon: 'fa-chart-pie', label: 'Stats' }, // Command Center
            { id: 'settings', icon: 'fa-gear', label: 'Settings' }
        ];

        container.innerHTML = `
        <div class="absolute bottom-6 left-4 right-4 h-20 bg-white/80 dark:bg-slate-800/90 backdrop-blur-xl rounded-[32px] shadow-2xl shadow-blue-900/10 flex items-center justify-evenly border border-white/20 z-50 animate-slide-up">
            ${tabs.map(tab => {
                const isActive = tab.id === activeTab;
                return `
                <button onclick="Main.navigate('${tab.id}')" 
                        class="relative group flex flex-col items-center justify-center w-16 h-16 transition-all duration-300 ${isActive ? '-translate-y-4' : 'hover:-translate-y-1'}">
                    
                    ${isActive ? `
                    <div class="absolute -top-4 w-12 h-12 bg-blue-500/20 rounded-full blur-xl"></div>
                    <div class="absolute inset-0 bg-blue-600 rounded-[20px] shadow-lg shadow-blue-600/40 rotate-12 transition-transform"></div>
                    ` : ''}

                    <div class="relative z-10 w-12 h-12 flex items-center justify-center rounded-[18px] 
                                ${isActive ? 'bg-blue-600 text-white' : 'bg-transparent text-slate-400 dark:text-slate-500 group-hover:text-blue-500'} 
                                transition-colors">
                        <i class="fa-solid ${tab.icon} text-xl"></i>
                    </div>

                    ${isActive ? `
                    <span class="absolute -bottom-6 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-fade-in">
                        ${tab.label}
                    </span>` : ''}
                </button>`;
            }).join('')}
        </div>`;
    },

    // ============================================================
    // 4. MODAL SYSTEM (Base)
    // ============================================================

    showModal(contentHTML) {
        const modal = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        if (modal && content) {
            content.innerHTML = contentHTML;
            modal.classList.remove('hidden');
            // Disable scroll on body
            document.body.style.overflow = 'hidden';
        }
    },

    hideModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
        }
    },

    // IMPORTANT: Orientation Audio Logic moved here to be globally accessible
    modals: {
        orientation() {
            UI.showModal(`
            <div class="p-6 text-center">
                <div class="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full mx-auto flex items-center justify-center text-3xl mb-6 animate-pulse">
                    <i class="fa-solid fa-headphones"></i>
                </div>
                <h2 class="text-lg font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">Orientation 2026</h2>
                <p class="text-xs text-slate-500 font-bold uppercase mb-6 tracking-widest">Listen to Poet PRADEEP TRIPATHI</p>
                
                <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-100 dark:border-slate-700">
                    <audio controls class="w-full h-10 accent-blue-600">
                        <source src="assets/audio/disclaimer.mp3" type="audio/mpeg">
                        Your browser does not support audio.
                    </audio>
                </div>
                
                <p class="text-[11px] text-slate-400 italic mb-6">"Success comes to those who seek the path with an open heart."</p>
                
                <button onclick="UI.hideModal()" class="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-transform">
                    Start Journey
                </button>
            </div>`);
        }
        // Other specific modals (Disclaimer, About) will be added in Section 5
    },

    // ... Continues in Part 2 ...
// ... Continues from Part 1 ...

    // ============================================================
    // 5. HOME VIEW (The Dashboard)
    // ============================================================

    _renderHome(container) {
        // 1. Header
        this.renderHeader(container);

        // 2. Resume Card (If history exists)
        const history = Store.get('history', []);
        if (history.length > 0) {
            const last = history[0];
            container.innerHTML += `
            <div onclick="Main.showResult('${last.id}')" class="premium-card p-5 rounded-[28px] mb-8 flex items-center justify-between cursor-pointer active:scale-95 transition-transform animate-slide-up">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xl">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-slate-800 dark:text-white">Resume Learning</h3>
                        <p class="text-[10px] font-bold text-slate-400 uppercase">LAST: ${last.subject.toUpperCase()} &bull; ${last.score} PTS</p>
                    </div>
                </div>
                <div class="w-8 h-8 rounded-full border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </div>
            </div>`;
        }

        // 3. Subject Grid (GS1)
        container.innerHTML += `<h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">General Studies</h2>`;
        
        const gridGS = document.createElement('div');
        gridGS.className = "grid grid-cols-2 gap-4 mb-8";
        
        CONFIG.subjectsGS1.forEach((sub, idx) => {
            gridGS.innerHTML += this._generateSubjectCard(sub, idx);
        });
        container.appendChild(gridGS);

        // 4. Subject Grid (CSAT)
        container.innerHTML += `<h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">CSAT & Aptitude</h2>`;
        
        const gridCSAT = document.createElement('div');
        gridCSAT.className = "grid grid-cols-2 gap-4 pb-24"; // Padding for footer
        
        CONFIG.subjectsCSAT.forEach((sub, idx) => {
            gridCSAT.innerHTML += this._generateSubjectCard(sub, idx + 10);
        });
        container.appendChild(gridCSAT);
    },

    _generateSubjectCard(sub, delayIdx) {
        // Color Mapping for visual variety
        const colors = {
            amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
            blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
            pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
            purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
            cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
            rose: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
            teal: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
            indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
            slate: 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        };
        const style = colors[sub.color] || colors.slate;

        return `
        <div onclick="Main.startQuiz('${sub.id}')" 
             class="premium-card p-5 rounded-[24px] flex flex-col gap-4 cursor-pointer active:scale-95 transition-transform animate-view-enter"
             style="animation-delay: ${delayIdx * 50}ms">
            <div class="w-10 h-10 rounded-2xl ${style} flex items-center justify-center text-lg shadow-sm">
                <i class="fa-solid fa-${sub.icon}"></i>
            </div>
            <div>
                <h3 class="text-sm font-black text-slate-700 dark:text-slate-200 leading-tight mb-1">${sub.name}</h3>
                <p class="text-[9px] font-bold text-slate-400 uppercase">START MOCK</p>
            </div>
        </div>`;
    },

    // ============================================================
    // 6. QUIZ INTERFACE (The Arena)
    // ============================================================

    _drawQuiz(container) {
        const q = Engine.getCurrentQuestion();
        const total = Engine.state.questions.length;
        const current = Engine.state.currentIndex + 1;
        const progress = (current / total) * 100;
        
        // Check if user has already answered this question
        const savedAnswer = Engine.state.userAnswers[Engine.state.currentIndex];
        const isAnswered = savedAnswer && savedAnswer.selected !== null;

        container.innerHTML = `
        <div class="h-full flex flex-col pb-6 animate-fade-in">
            <div class="flex items-center justify-between mb-6">
                <button onclick="Main.navigate('home')" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                
                <div class="flex flex-col items-center w-full px-4">
                    <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-2">
                        <div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question ${current} / ${total}</span>
                </div>

                <div class="relative">
                    <div class="absolute inset-0 bg-blue-500 blur opacity-20"></div>
                    <div class="relative bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900/30 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                        <i class="fa-solid fa-stopwatch text-blue-500 text-xs animate-pulse"></i>
                        <span id="quiz-timer" class="text-xs font-black font-mono text-slate-700 dark:text-white">00:00</span>
                    </div>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-1 custom-scrollbar">
                <div class="premium-card p-6 rounded-[32px] mb-6 border-t-4 border-t-blue-500">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            ${q.difficulty || 'MODERATE'}
                        </span>
                        <span class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wider">
                            +2.0 / -0.66
                        </span>
                    </div>
                    <h2 class="text-lg font-bold text-slate-800 dark:text-white leading-relaxed font-display">
                        ${this.sanitize(q.text)}
                    </h2>
                </div>

                <div class="space-y-3 mb-6">
                    ${q.options.map((opt, idx) => {
                        const isSelected = isAnswered && savedAnswer.selected === idx;
                        const letter = String.fromCharCode(65 + idx);
                        
                        return `
                        <button onclick="Main.handleAnswer(${idx})" 
                                class="w-full p-4 rounded-[20px] flex items-center gap-4 transition-all duration-200 group relative overflow-hidden border-2
                                ${isSelected 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-800 border-transparent hover:border-blue-200 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 shadow-sm'}">
                            
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors
                                ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}">
                                ${letter}
                            </div>
                            <span class="text-sm font-medium text-left flex-1">${this.sanitize(opt)}</span>
                            
                            ${isSelected ? '<i class="fa-solid fa-circle-check text-white text-lg animate-bounce-small"></i>' : ''}
                        </button>`;
                    }).join('')}
                </div>
            </div>

            <div class="pt-4 flex items-center justify-between gap-4">
                <button onclick="Engine.prevQuestion() && UI._drawQuiz(document.getElementById('app-container'))" 
                        class="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-200 disabled:opacity-50"
                        ${Engine.state.currentIndex === 0 ? 'disabled' : ''}>
                    <i class="fa-solid fa-arrow-left"></i>
                </button>

                ${current === total 
                    ? `<button onclick="Main.finishQuiz()" class="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
                         <span>Submit Test</span> <i class="fa-solid fa-flag-checkered"></i>
                       </button>`
                    : `<button onclick="Engine.nextQuestion() && UI._drawQuiz(document.getElementById('app-container'))" class="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
                         <span>Next Question</span> <i class="fa-solid fa-arrow-right"></i>
                       </button>`
                }
            </div>
        </div>`;
    },

    // Helper to update Timer without re-rendering whole UI
    _updateTimer(seconds) {
        const el = document.getElementById('quiz-timer');
        if (el) {
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            el.textContent = `${m}:${s}`;
            
            // Visual Alarm for last 60 seconds
            if (seconds < 60) el.classList.add('text-rose-500', 'animate-pulse');
        }
    },
    
    // ... Continues in Part 3 ...
  // ... Continues from Part 2 ...

    // ============================================================
    // 7. RESULT ANALYSIS (The Post-Mortem)
    // ============================================================

    _drawAnalysis(container, resultId) {
        const history = Store.get('history', []);
        const result = history.find(r => r.id === resultId);
        
        if (!result) {
            Main.navigate('home');
            return;
        }

        // Calculate visual metrics
        const percentage = (result.score / result.totalMarks) * 100;
        const colorClass = percentage >= 50 ? 'text-emerald-500' : 'text-rose-500';
        const bgClass = percentage >= 50 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20';
        const icon = percentage >= 50 ? 'fa-trophy' : 'fa-chart-simple';

        container.innerHTML = `
        <div class="h-full flex flex-col pb-6 animate-slide-up">
            <div class="flex items-center justify-between mb-6">
                <button onclick="Main.navigate('home')" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:bg-slate-200">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest">Performance Report</h2>
                <div class="w-10"></div> </div>

            <div class="premium-card p-6 rounded-[32px] mb-8 text-center relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 ${percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                
                <div class="w-20 h-20 mx-auto rounded-full ${bgClass} ${colorClass} flex items-center justify-center text-3xl mb-4 shadow-sm">
                    <i class="fa-solid ${icon}"></i>
                </div>
                
                <h1 class="text-5xl font-black text-slate-800 dark:text-white mb-1 font-display tracking-tight">
                    ${result.score.toFixed(1)}
                </h1>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">OUT OF ${result.totalMarks}</p>

                <div class="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700 pt-6">
                    <div>
                        <div class="text-emerald-500 font-black text-xl">${result.correct}</div>
                        <div class="text-[8px] text-slate-400 uppercase font-bold">Correct</div>
                    </div>
                    <div>
                        <div class="text-rose-500 font-black text-xl">${result.wrong}</div>
                        <div class="text-[8px] text-slate-400 uppercase font-bold">Wrong</div>
                    </div>
                    <div>
                        <div class="text-blue-500 font-black text-xl">${result.accuracy}%</div>
                        <div class="text-[8px] text-slate-400 uppercase font-bold">Accuracy</div>
                    </div>
                </div>
            </div>

            <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Detailed Solutions</h3>
            <div class="flex-1 overflow-y-auto space-y-8 px-1 custom-scrollbar">
                ${Engine.state.questions.map((q, idx) => {
                    const userAns = Engine.state.userAnswers[idx];
                    const isCorrect = userAns && userAns.selected === q.correctIndex;
                    const isSkipped = !userAns || userAns.selected === null;
                    const isWrong = !isCorrect && !isSkipped;

                    // Determine Status Badge
                    let statusBadge = '';
                    if (isCorrect) statusBadge = `<span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-bold uppercase"><i class="fa-solid fa-check"></i> Correct (+2.0)</span>`;
                    else if (isWrong) statusBadge = `<span class="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-[9px] font-bold uppercase"><i class="fa-solid fa-xmark"></i> Wrong (-0.66)</span>`;
                    else statusBadge = `<span class="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase">Skipped</span>`;

                    return `
                    <div class="group relative">
                        ${idx !== Engine.state.questions.length - 1 ? '<div class="absolute left-6 top-16 bottom-[-32px] w-0.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 transition-colors"></div>' : ''}
                        
                        <div class="flex gap-4">
                            <div class="flex-shrink-0 w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center font-black text-slate-300 shadow-sm z-10">
                                ${idx + 1}
                            </div>
                            
                            <div class="flex-1 pb-2">
                                <div class="flex items-center justify-between mb-2">
                                    ${statusBadge}
                                    <span class="text-[9px] font-mono text-slate-400">⏱️ ${userAns?.timeSpent || 0}s</span>
                                </div>
                                
                                <p class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 leading-relaxed">
                                    ${this.sanitize(q.text)}
                                </p>

                                <div class="space-y-2 mb-4">
                                    ${q.options.map((opt, oIdx) => {
                                        let optClass = "border-transparent bg-slate-50 dark:bg-slate-800/50 text-slate-500";
                                        let icon = `<div class="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center font-bold">${String.fromCharCode(65+oIdx)}</div>`;
                                        
                                        // Highlight Logic
                                        if (oIdx === q.correctIndex) {
                                            // Always show correct answer in Green
                                            optClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400";
                                            icon = `<div class="w-5 h-5 rounded-md bg-emerald-500 text-white text-[10px] flex items-center justify-center"><i class="fa-solid fa-check"></i></div>`;
                                        } else if (isWrong && oIdx === userAns.selected) {
                                            // Show user's wrong choice in Red
                                            optClass = "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400";
                                            icon = `<div class="w-5 h-5 rounded-md bg-rose-500 text-white text-[10px] flex items-center justify-center"><i class="fa-solid fa-xmark"></i></div>`;
                                        }

                                        return `
                                        <div class="p-3 rounded-xl border ${optClass} flex items-center gap-3 text-xs">
                                            ${icon}
                                            <span class="flex-1">${this.sanitize(opt)}</span>
                                        </div>`;
                                    }).join('')}
                                </div>

                                ${this._renderExplanation(q)}
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    // NEW: Structured Explanation Logic (Recreating your screenshot)
    _renderExplanation(q) {
        // Safe access for Legacy vs Pro schema
        const exp = typeof q.explanation === 'object' ? q.explanation : { core: q.explanation };
        const notes = exp.expert_note || q.notes || "Conceptual clarity is key.";
        
        return `
        <div class="mt-4 space-y-3 animate-view-enter">
            <div class="p-4 bg-emerald-50/80 dark:bg-emerald-900/20 rounded-[20px] border-l-4 border-emerald-500 shadow-sm">
                <h4 class="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i class="fa-solid fa-lightbulb"></i> Explanation
                </h4>
                <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed text-justify">
                    ${this.sanitize(exp.core)}
                </p>
            </div>
            
            <div class="p-3 bg-amber-50/80 dark:bg-amber-900/20 rounded-[16px] border-l-4 border-amber-500 flex gap-3 items-start">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xs mt-0.5"></i>
                <div>
                    <h4 class="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">Gyan Amala Insight</h4>
                    <p class="text-[10px] text-slate-600 dark:text-slate-300 italic">"${this.sanitize(notes)}"</p>
                </div>
            </div>

            <div class="flex flex-wrap gap-2 pt-1 pl-1">
                ${(q.tags || ['General']).map(tag => `
                    <span class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md text-[8px] font-bold uppercase tracking-tight border border-blue-100 dark:border-blue-800">
                        #${tag}
                    </span>`).join('')}
            </div>
        </div>`;
    },

    // ============================================================
    // 8. NOTES LIBRARY (Topper Resources)
    // ============================================================

    _renderNotes(container) {
        this.renderHeader(container); // Re-use header

        container.innerHTML += `
        <div class="pb-24 animate-view-enter">
            <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Quick Revision Cards</h2>
            
            <div class="grid grid-cols-2 gap-4">
                ${CONFIG.notesLibrary.map((note, idx) => `
                <div class="premium-card p-4 rounded-[24px] flex flex-col gap-3 group active:scale-95 transition-transform cursor-pointer relative overflow-hidden">
                    <div class="absolute inset-0 bg-gradient-to-br from-white to-${note.gradient}-50 dark:from-slate-800 dark:to-slate-900 opacity-50"></div>
                    
                    <div class="relative z-10 w-10 h-10 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-${note.gradient}-500 text-lg">
                        <i class="fa-solid fa-${note.icon}"></i>
                    </div>
                    
                    <div class="relative z-10">
                        <h3 class="text-xs font-black text-slate-700 dark:text-slate-200 mb-0.5 line-clamp-1">${note.title}</h3>
                        <p class="text-[9px] font-bold text-slate-400 uppercase">${note.subtitle}</p>
                    </div>

                    <div class="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                        <i class="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
                    </div>
                </div>`).join('')}
            </div>

            <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mt-8 mb-4 pl-2">Topper Answer Copies</h2>
            <div class="space-y-3">
                ${CONFIG.resources.institutes.map(ins => `
                <a href="${ins.url}" target="_blank" class="premium-card p-4 rounded-[20px] flex items-center justify-between active:scale-95 transition-transform">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-black text-slate-500 text-sm">
                            ${ins.char}
                        </div>
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${ins.name}</span>
                    </div>
                    <i class="fa-solid fa-external-link-alt text-slate-300 text-xs"></i>
                </a>`).join('')}
            </div>
        </div>`;

        this.renderFooter(container, 'notes');
    },

    // ... Continues in Part 4 ...
  // ... Continues from Part 3 ...

    // ============================================================
    // 9. COMMAND CENTER (The Stats Dashboard)
    // ============================================================

    async _renderStats(container) {
        // 1. Render Header
        this.renderHeader(container);

        // 2. Skeleton Loading State (The "Thinking" Phase)
        // Gives the user a sense that the AI is crunching numbers
        const skeletonHTML = `
            <div class="space-y-6 animate-pulse px-1">
                <div class="h-48 bg-slate-200 dark:bg-slate-800 rounded-[30px]"></div>
                <div class="h-32 bg-slate-200 dark:bg-slate-800 rounded-[24px]"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="h-40 bg-slate-200 dark:bg-slate-800 rounded-[24px]"></div>
                    <div class="h-40 bg-slate-200 dark:bg-slate-800 rounded-[24px]"></div>
                </div>
            </div>`;
        
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = skeletonHTML;
        container.appendChild(contentDiv);

        // 3. Fetch Data from Analytics Engines (Async)
        // We predict for 'General Studies' overall context
        const prediction = await PredictiveEngine.predictScore('gs_overall'); 
        const sleepData = StudyTracker.getLastSleepData();
        const studyHours = StudyTracker.getTodayStudyHours();

        // 4. Render Actual Dashboard
        contentDiv.innerHTML = `
            <div class="space-y-6 pb-24 animate-view-enter">
                
                ${this._generateOracleCard(prediction)}

                <div class="grid grid-cols-2 gap-4">
                    <div class="premium-card p-5 rounded-[24px] relative overflow-hidden flex flex-col justify-between">
                        <div class="absolute top-0 right-0 p-3 opacity-10">
                            <i class="fa-solid fa-clock text-4xl"></i>
                        </div>
                        <div>
                            <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Focus</h4>
                            <div class="flex items-baseline gap-1">
                                <span class="text-3xl font-display font-black text-slate-800 dark:text-white">${studyHours}</span>
                                <span class="text-xs text-slate-500 font-bold">hrs</span>
                            </div>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                            <div class="bg-blue-500 h-full rounded-full" style="width: ${Math.min((studyHours/8)*100, 100)}%"></div>
                        </div>
                    </div>

                    <div class="premium-card p-5 rounded-[24px] relative overflow-hidden flex flex-col justify-between">
                        <div class="absolute top-0 right-0 p-3 opacity-10">
                            <i class="fa-solid fa-bed text-4xl"></i>
                        </div>
                        <div>
                            <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rest Level</h4>
                            <div class="flex items-baseline gap-1">
                                <span class="text-3xl font-display font-black text-slate-800 dark:text-white">${sleepData.duration}</span>
                                <span class="text-xs text-slate-500 font-bold">hrs</span>
                            </div>
                        </div>
                        <span class="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider w-fit ${this._getSleepColor(sleepData.quality)}">
                            ${sleepData.quality}
                        </span>
                    </div>
                </div>

                <div class="premium-card p-6 rounded-[30px]">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-display font-bold text-lg text-slate-800 dark:text-white leading-none">Performance<br><span class="text-slate-400 text-xs font-sans font-normal">SPEED VS ACCURACY</span></h3>
                        <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-wide">
                            Last 10 Tests
                        </span>
                    </div>
                    <div class="relative h-48 w-full">
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // 5. Initialize Charts (Must happen after DOM insertion)
        setTimeout(() => this._initStatsCharts(), 50);

        this.renderFooter(container, 'stats');
    },

    // --- HELPER: The Oracle Card Visuals ---
    _generateOracleCard(data) {
        if (data.status === 'cold_start') {
            return `
            <div class="premium-card p-6 rounded-[30px] bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
                <div class="relative z-10 text-center py-4">
                    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4 backdrop-blur-md border border-white/10 animate-float">
                        <i class="fa-solid fa-crystal-ball text-2xl text-blue-300"></i>
                    </div>
                    <h3 class="font-display font-black text-xl mb-1">AI Calibration Active</h3>
                    <p class="text-slate-400 text-xs font-bold uppercase tracking-wide mb-0">Take 3 more tests to unlock prediction</p>
                </div>
                <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
            </div>`;
        }

        const scoreColor = data.trend === 'rising' ? 'text-emerald-300' : 'text-rose-300';
        const trendIcon = data.trend === 'rising' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

        return `
        <div class="premium-card p-0 rounded-[30px] overflow-hidden relative group shadow-xl shadow-blue-900/20">
            <div class="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-100"></div>
            <div class="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div class="relative z-10 p-6 text-white">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h4 class="text-blue-200 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Predicted Score</h4>
                        <div class="flex items-baseline gap-2">
                            <span class="font-display font-black text-6xl tracking-tight">${data.projectedScore}</span>
                            <span class="text-blue-200 text-sm font-bold opacity-60">/ 200</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-1">
                            <i class="fa-solid ${trendIcon} ${scoreColor} text-xl"></i>
                        </div>
                        <span class="text-[9px] font-bold uppercase text-blue-200 opacity-80">${data.trend}</span>
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 mb-4">
                    ${data.factors.map(f => `
                        <span class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide backdrop-blur-md border border-white/10 
                            ${f.impact === 'positive' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-rose-400/20 text-rose-100'}">
                            ${f.impact === 'positive' ? '<i class="fa-solid fa-caret-up mr-1"></i>' : '<i class="fa-solid fa-caret-down mr-1"></i>'} 
                            ${f.label}
                        </span>
                    `).join('')}
                </div>

                <p class="text-[10px] font-bold text-blue-100 border-t border-white/10 pt-3 flex gap-2 items-center">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> ${data.message}
                </p>
            </div>
        </div>`;
    },

    _getSleepColor(quality) {
        const map = {
            'Poor': 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
            'Average': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
            'Optimal': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
            'Overslept': 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
        };
        return map[quality] || map['Average'];
    },

    // ============================================================
    // 10. CHART.JS INTEGRATION (The "Science" Layer)
    // ============================================================
    
    _initStatsCharts() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        // Prevent memory leaks by destroying old instance if it exists
        if (window.myStatsChart) {
            window.myStatsChart.destroy();
        }

        // Fetch Data from Store
        const history = Store.get('history', []);
        
        // Prepare Data Points: X=Time (sec), Y=Accuracy (%)
        // Limit to last 10 tests for readability
        const recentHistory = history.slice(0, 10);
        const dataPoints = recentHistory.map(h => ({
            x: h.totalDuration ? (h.totalDuration / (h.correct + h.wrong + h.skipped)) : 60, // Avg time/question
            y: parseFloat(h.accuracy)
        }));

        // Fallback for empty state
        if (dataPoints.length === 0) {
            dataPoints.push({ x: 60, y: 50 }); // Placeholder center
        }

        window.myStatsChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Tests',
                    data: dataPoints,
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 9,
                    pointBackgroundColor: 'rgba(59, 130, 246, 0.8)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 10, weight: 'bold' },
                        bodyFont: { size: 10 },
                        callbacks: {
                            label: (ctx) => `Score: ${ctx.raw.y}% | Time: ${ctx.raw.x.toFixed(0)}s`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: true, text: 'Avg Time (sec)', color: '#94a3b8', font: { size: 9, weight: 'bold' } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)', borderDash: [5, 5] },
                        ticks: { color: '#94a3b8', font: { size: 9 } }
                    },
                    y: {
                        min: 0, max: 100,
                        title: { display: true, text: 'Accuracy (%)', color: '#94a3b8', font: { size: 9, weight: 'bold' } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#94a3b8', font: { size: 9 } }
                    }
                }
            }
        });
    },

    // ... Continues in Part 5 ...
// ... Continues from Part 4 ...

    // ============================================================
    // 11. SETTINGS DASHBOARD (Advanced)
    // ============================================================

    _renderSettings(container) {
        this.renderHeader(container);

        container.innerHTML += `
        <div class="px-2 pt-2 space-y-8 pb-32 animate-view-enter">
            
            <div class="space-y-3">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">System Preferences</label>
                
                <div class="premium-card p-5 rounded-[28px] flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                            <i class="fa-solid fa-moon"></i>
                        </div>
                        <div><h3 class="text-xs font-black">Appearance</h3><p class="text-[8px] font-bold text-slate-400 uppercase">DARK MODE</p></div>
                    </div>
                    <button onclick="Main.toggleTheme()" class="w-12 h-7 bg-slate-200 dark:bg-blue-600 rounded-full relative transition-all shadow-inner">
                        <div class="w-5 h-5 bg-white rounded-full absolute top-1 left-1 dark:left-6 transition-all shadow-md"></div>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="Store.exportData()" class="premium-card p-4 rounded-[24px] flex flex-col gap-2 active:scale-95 transition-transform">
                        <i class="fa-solid fa-cloud-arrow-down text-blue-500 text-xl"></i>
                        <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Backup Data</span>
                    </button>
                    <button onclick="Store.importData()" class="premium-card p-4 rounded-[24px] flex flex-col gap-2 active:scale-95 transition-transform">
                        <i class="fa-solid fa-file-import text-emerald-500 text-xl"></i>
                        <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Restore</span>
                    </button>
                </div>

                <button onclick="Store.clearAll()" class="w-full premium-card p-5 rounded-[28px] flex items-center justify-between border-red-100 dark:border-red-900/30 text-rose-500 active:scale-95 transition-transform group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center"><i class="fa-solid fa-trash-can"></i></div>
                        <div class="text-left"><h3 class="text-xs font-black">Reset App</h3><p class="text-[8px] font-bold opacity-60 uppercase">Clear Local Storage</p></div>
                    </div>
                    <i class="fa-solid fa-chevron-right opacity-30"></i>
                </button>
            </div>

            <div class="space-y-3">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">Mission Universal</label>
                
                <button onclick="UI.modals.orientation()" class="w-full premium-card p-5 rounded-[28px] flex items-center justify-between active:scale-95 transition-transform">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><i class="fa-solid fa-microphone-lines"></i></div>
                        <div class="text-left"><h3 class="text-xs font-black">Orientation</h3><p class="text-[8px] font-bold text-slate-400 uppercase">POET PRADEEP TRIPATHI</p></div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-300"></i>
                </button>
                
                <button onclick="UI.modals.motive()" class="w-full premium-card p-5 rounded-[28px] flex items-center justify-between active:scale-95 transition-transform">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-600 flex items-center justify-center"><i class="fa-solid fa-heart"></i></div>
                        <div class="text-left"><h3 class="text-xs font-black">Our Motive</h3><p class="text-[8px] font-bold text-slate-400 uppercase">THE GYAN AMALA VISION</p></div>
                    </div>
                    <i class="fa-solid fa-chevron-right text-slate-300"></i>
                </button>
            </div>

            <div class="space-y-3">
                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">The Estate</label>
                <button onclick="UI.modals.aboutCreator()" class="w-full premium-card p-6 rounded-[32px] bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-900 border-amber-200/50 flex flex-col items-center text-center gap-2 active:scale-95 transition-transform shadow-lg shadow-amber-500/10">
                    <div class="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center text-xl mb-1 shadow-sm"><i class="fa-solid fa-user-tie"></i></div>
                    <h3 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">About Creator</h3>
                    <p class="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">EKAM SATYAM</p>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-4">
                <button onclick="UI.modals.disclaimer()" class="premium-card p-4 rounded-[22px] flex items-center gap-3 active:scale-95 transition-transform">
                    <i class="fa-solid fa-circle-exclamation text-rose-500"></i>
                    <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Disclaimer</span>
                </button>
                <button onclick="UI.modals.contact()" class="premium-card p-4 rounded-[22px] flex items-center gap-3 active:scale-95 transition-transform">
                    <i class="fa-solid fa-headset text-indigo-500"></i>
                    <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Feedback</span>
                </button>
                <button onclick="UI.modals.terms()" class="premium-card p-4 rounded-[22px] flex items-center gap-3 active:scale-95 transition-transform">
                    <i class="fa-solid fa-scale-balanced text-slate-500"></i>
                    <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Terms</span>
                </button>
                <button onclick="UI.modals.privacy()" class="premium-card p-4 rounded-[22px] flex items-center gap-3 active:scale-95 transition-transform">
                    <i class="fa-solid fa-user-shield text-teal-500"></i>
                    <span class="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Privacy</span>
                </button>
            </div>

            <div class="text-center pt-8 opacity-40">
                <p class="text-[8px] font-black tracking-[0.3em] uppercase">Gyan Amala &bull; v${CONFIG.version}</p>
            </div>
        </div>`;
        
        this.renderFooter(container, 'settings');
    },

    // ============================================================
    // 12. SETTINGS MODALS (Content Implementation)
    // ============================================================

    // Extends the 'modals' object initiated in Part 1
    // Note: We use Object.assign to merge these new methods into UI.modals if needed, 
    // but in this single-file assembly structure, we can just define them on the object.
};

// Merging the rest of the modals into UI.modals manually for clarity in this snippet
Object.assign(UI.modals, {
    
    motive() {
        UI.showModal(`
        <div class="p-8 text-center">
            <div class="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 text-pink-600 rounded-full mx-auto flex items-center justify-center text-2xl mb-6"><i class="fa-solid fa-heart"></i></div>
            <h2 class="text-xl font-black text-slate-800 dark:text-white mb-4 uppercase tracking-tight">The Vision</h2>
            <p class="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify mb-4">
                <b>Gyan Amala</b> (Pure Knowledge) was founded on the principle that elite-level preparation shouldn't cost a fortune.
            </p>
            <p class="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                We leverage <b>Serverless Architecture</b> to provide you with tools like the <b>Predictive Oracle</b> and <b>Behavioral Analytics</b> at zero cost. Your device is the server. Your data is yours.
            </p>
            <button onclick="UI.hideModal()" class="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Close</button>
        </div>`);
    },

    aboutCreator() {
        UI.showModal(`
        <div class="p-0 overflow-hidden rounded-[32px]">
            <div class="bg-indigo-900 text-white p-8 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                <div class="relative z-10">
                    <h2 class="text-2xl font-display font-black mb-2 text-amber-400">Ekam Satyam</h2>
                    <p class="text-lg font-serif italic opacity-90 mb-1">“Ekam sat vipra bahudha vadanti”</p>
                    <p class="text-[10px] uppercase tracking-widest opacity-60">(Truth is one, but the wise speak of it in many ways)</p>
                </div>
            </div>

            <div class="p-6 bg-white dark:bg-slate-900 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div>
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">The Story</h3>
                    <p class="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
                        I am just the creator of this app—a <b>B.A. (Hons) Political Science</b> graduate with absolutely no background in formal coding.
                        <br><br>
                        <b>UPSCSuperApp</b> is an amateur fun project born out of a week of intense, around-the-clock hard work by myself and <b>Artificial Intelligence</b>. AI helped me bridge the gap between my ideas and the code you see today.
                    </p>
                </div>

                <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Professional Inquiry</h3>
                    <p class="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                        While I am committed to UPSC, I believe in a solid 'Plan B'. If you like this app's logic and want to offer a professional opportunity, let's talk.
                        <br><br>
                        <span class="text-rose-500 font-bold">Important:</span> Do not offer me security guard roles! I am currently serving the <b>RAJA OF DHOLAKPUR</b> in his security detail, and I am quite satisfied! 🛡️
                    </p>
                    
                    <a href="mailto:?subject=Professional Opportunity: Creator of UPSCSuperApp&body=Dear Creator,%0D%0A%0D%0AI was impressed by the UPSCSuperApp architecture you built in one week.%0D%0A%0D%0AI would like to discuss a potential opportunity:%0D%0A[Enter Details Here]%0D%0A%0D%0ABest regards," 
                       class="block w-full py-3 bg-blue-600 text-white text-center rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-transform">
                        Offer a Job (Plan B)
                    </a>
                </div>
            </div>
            
            <div class="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                <button onclick="UI.hideModal()" class="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black uppercase text-[10px]">Close</button>
            </div>
        </div>`);
    },

    disclaimer() {
        UI.showModal(`
        <div class="p-8">
            <div class="flex items-center gap-3 mb-4 text-rose-500">
                <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
                <h2 class="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Legal Disclaimer</h2>
            </div>
            <ul class="space-y-4 text-[12px] text-slate-600 dark:text-slate-300 list-disc pl-4 leading-relaxed">
                <li><b>AI-Generated Content:</b> Questions and predictions are generated using AI. <b>Gyan Amala</b> does not guarantee 100% factual accuracy.</li>
                <li><b>Limitation of Liability:</b> The creator is not liable for any discrepancies or errors in the content.</li>
                <li><b>Educational Use:</b> This is a non-commercial project. Always cross-verify with official UPSC notifications.</li>
            </ul>
            <button onclick="UI.hideModal()" class="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px]">I Understand</button>
        </div>`);
    },

    contact() {
        UI.showModal(`
        <div class="p-8 text-center">
            <h2 class="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase">Contact & Support</h2>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <a href="#" class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex flex-col items-center gap-2 text-blue-600">
                    <i class="fa-brands fa-telegram text-2xl"></i>
                    <span class="text-[9px] font-black uppercase">Telegram</span>
                </a>
                <a href="mailto:hello@gyanamala.org" class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex flex-col items-center gap-2 text-emerald-600">
                    <i class="fa-solid fa-envelope text-2xl"></i>
                    <span class="text-[9px] font-black uppercase">Email</span>
                </a>
            </div>
            <button onclick="UI.hideModal()" class="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px]">Close</button>
        </div>`);
    },

    privacy() {
        UI.showModal(`
        <div class="p-8">
            <h2 class="text-xl font-black mb-4 uppercase tracking-tighter text-teal-600">Privacy Mandate</h2>
            <p class="text-xs text-slate-500 mb-4">Effective Date: 2025-01-01</p>
            <ul class="space-y-4 text-[12px] text-slate-600 dark:text-slate-300">
                <li class="flex gap-3"><i class="fa-solid fa-check text-teal-500 mt-1"></i> <b>100% Local:</b> Your data never leaves this device.</li>
                <li class="flex gap-3"><i class="fa-solid fa-check text-teal-500 mt-1"></i> <b>Digital Silence:</b> We infer sleep from app inactivity, not health data.</li>
                <li class="flex gap-3"><i class="fa-solid fa-check text-teal-500 mt-1"></i> <b>Zero Collection:</b> We do not store IPs, emails, or names.</li>
            </ul>
            <button onclick="UI.hideModal()" class="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px]">Back</button>
        </div>`);
    },

    terms() {
        UI.showModal(`
        <div class="p-8">
            <h2 class="text-xl font-black mb-4 uppercase tracking-tighter text-slate-600">Terms of Service</h2>
            <p class="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                By using <b>UPSCSuperApp</b>, you agree to a 'Local-First' experience. The app is provided 'as is' for educational purposes under the <b>Gyan Amala</b> initiative.
            </p>
            <p class="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                We are not responsible for data loss due to browser cache clearing. Please use the <b>Backup</b> feature regularly.
            </p>
            <button onclick="UI.hideModal()" class="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-[10px]">Accept</button>
        </div>`);
    }

});

// Expose to Window
window.UI = UI;

  

