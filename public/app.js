class NLPPromptDatabase {
    constructor() {
        this.db = new LocalJSONDatabase();
        this.ai = new OpenAIIntegration();
        this.state = {
            prompts: [],
            filteredPrompts: [],
            categories: ['All', 'Code', 'Cognitive', 'Jailbreak', 'Dev', 'Writing', 'Business', 'General', 'Creative', 'Analysis', 'Research'],
            folders: ['All', 'Favorites', 'Archive', 'Default'],
            customFolders: [],
            activeFolder: 'All',
            activeCategory: 'All',
            activeView: 'prompts',
            searchTerm: '',
            minRating: 0,
            selectedTags: [],
            allTags: [],
            selectedIds: new Set(),
            lastSelectedId: null,
            editingPromptId: null,
            settings: {
                openaiApiKey: '',
                autoCategorizationEnabled: true,
                autoTagsEnabled: true,
                darkMode: true,
                compactView: false,
                showPreview: true,
                autoBackup: true
            },
            isLoading: false,
            draggedItem: null,
            dropTarget: null,
            bulkMode: false,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            viewMode: 'grid'
        };
        this.init();
    }

    async init() {
        if (localStorage.getItem('nlp_prompts_database')) {
            await this.db.loadFromLocalStorage();
        }
        await this.loadData();
        this.setupEventListeners();
        this.render();
        this.updateLastSavedIndicator();
    }

    async loadData() {
        try {
            const data = await this.db.init();
            this.state.prompts = data.prompts || [];
            this.state.categories = data.categories || this.state.categories;
            this.state.folders = data.folders || this.state.folders;
            this.state.customFolders = data.customFolders || [];
            this.state.settings = { ...this.state.settings, ...data.settings };
            this.setupAutoSave();
            this.state.allTags = await this.db.getAllTags();
            
            this.ai.setApiKey(this.state.settings.openaiApiKey);
            this.updateFilteredPrompts();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showToast('Failed to load data', 'error');
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        document.getElementById('add-prompt-btn')?.addEventListener('click', () => this.showQuickAddModal());
        document.getElementById('quick-add-save')?.addEventListener('click', () => this.handleQuickAdd());
        document.getElementById('quick-add-cancel')?.addEventListener('click', () => this.hideQuickAddModal());
        
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportData());
        document.getElementById('import-btn')?.addEventListener('click', () => this.triggerImport());
        document.getElementById('import-file')?.addEventListener('change', (e) => this.handleImport(e));
        document.getElementById('summarize-btn')?.addEventListener('click', () => this.showSummaryModal());
        document.getElementById('backup-btn')?.addEventListener('click', () => this.createBackup());
        document.getElementById('help-button')?.addEventListener('click', () => this.showShortcutsModal());
        
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        document.addEventListener('click', this.handleDocumentClick.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        document.addEventListener('change', this.handleChange.bind(this));
        document.addEventListener('submit', this.handleFormSubmit.bind(this));
        
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
        
        // Context menu
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.addEventListener('click', this.hideContextMenu.bind(this));
        
        // Command palette
        this.setupCommandPalette();
        
        // Enhanced search
        this.setupEnhancedSearch();
        
        // Connection monitoring
        this.monitorConnection();
        
        // Performance monitoring
        if (this.state.settings.showPerformanceMonitor) {
            this.startPerformanceMonitoring();
        }
        
        // Keyboard shortcuts help
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.target.matches('input, textarea')) {
                this.showShortcutsModal();
            }
        });
    }

    setupAutoSave() {
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 5000;
        this.autoSaveTimer = null;
        this.hasUnsavedChanges = false;
        
        setInterval(() => {
            if (this.hasUnsavedChanges && this.autoSaveEnabled) {
                this.saveToLocalStorage();
                this.hasUnsavedChanges = false;
                this.showAutoSaveIndicator();
            }
        }, this.autoSaveInterval);
    }

    saveToLocalStorage() {
        try {
            const dataToSave = {
                prompts: this.state.prompts,
                categories: this.state.categories,
                folders: this.state.folders,
                customFolders: this.state.customFolders,
                settings: this.state.settings,
                metadata: {
                    version: '1.0.0',
                    lastSaved: new Date().toISOString(),
                    totalPrompts: this.state.prompts.length
                }
            };
            localStorage.setItem('nlp_prompts_database', JSON.stringify(dataToSave, null, 2));
            this.updateLastSavedIndicator();
            return true;
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.showToast('Auto-save failed', 'error');
            return false;
        }
    }

    showAutoSaveIndicator() {
        const indicator = document.getElementById('auto-save-indicator');
        if (indicator) {
            indicator.style.display = 'flex';
            indicator.classList.add('fade-in');
            setTimeout(() => {
                indicator.classList.remove('fade-in');
                indicator.classList.add('fade-out');
                setTimeout(() => {
                    indicator.style.display = 'none';
                    indicator.classList.remove('fade-out');
                }, 500);
            }, 1500);
        }
    }

    updateLastSavedIndicator() {
        const indicator = document.getElementById('last-saved-time');
        if (indicator) {
            const saved = localStorage.getItem('nlp_prompts_database');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const lastSaved = data.metadata?.lastSaved;
                    if (lastSaved) {
                        indicator.textContent = `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`;
                    } else {
                        indicator.textContent = `Last saved: ${new Date().toLocaleTimeString()}`;
                    }
                } catch (error) {
                    indicator.textContent = 'Save status unknown';
                }
            } else {
                indicator.textContent = 'Never saved';
            }
        }
        
        const unsavedIndicator = document.getElementById('unsaved-indicator');
        if (unsavedIndicator) {
            unsavedIndicator.style.display = 'none';
        }
        this.hasUnsavedChanges = false;
    }

    markAsChanged() {
        this.hasUnsavedChanges = true;
        const indicator = document.getElementById('unsaved-indicator');
        if (indicator) {
            indicator.style.display = 'inline';
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    this.toggleCommandPalette();
                    break;
                case 'n':
                    e.preventDefault();
                    this.showQuickAddModal();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('search-input')?.focus();
                    break;
                case 's':
                    e.preventDefault();
                    this.exportData();
                    break;
                case '1':
                    e.preventDefault();
                    this.switchView('prompts');
                    break;
                case '2':
                    e.preventDefault();
                    this.switchView('categories');
                    break;
                case '3':
                    e.preventDefault();
                    this.switchView('ai-assistant');
                    break;
                case '4':
                    e.preventDefault();
                    this.switchView('analytics');
                    break;
                case '5':
                    e.preventDefault();
                    this.switchView('settings');
                    break;
                case 'a':
                    e.preventDefault();
                    this.selectAllPrompts();
                    break;
                case 'd':
                    e.preventDefault();
                    this.duplicateSelectedPrompts();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    this.deleteSelectedPrompts();
                    break;
                case 'b':
                    e.preventDefault();
                    this.toggleBulkMode();
                    break;
                case 'g':
                    e.preventDefault();
                    this.toggleViewMode();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.hideQuickAddModal();
            this.state.editingPromptId = null;
            this.state.selectedIds.clear();
            this.state.bulkMode = false;
            this.render();
        }
        
        // Arrow key navigation
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            this.handleArrowNavigation(e);
        }
    }

    showQuickAddModal() {
        const modal = document.getElementById('quick-add-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('quick-prompt-input')?.focus();
        }
    }

    hideQuickAddModal() {
        const modal = document.getElementById('quick-add-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('quick-prompt-input').value = '';
        }
    }

    async handleQuickAdd() {
        const input = document.getElementById('quick-prompt-input');
        const text = input?.value?.trim();
        
        if (!text) {
            this.showToast('Please enter a prompt', 'warning');
            return;
        }

        this.setLoading(true, 'Processing prompts...');
        
        try {
            // Split by '---' for multiple prompts
            const promptTexts = text.split('---').map(p => p.trim()).filter(p => p);
            const addedPrompts = [];
            
            const skippedPrompts = [];
            
            for (const promptText of promptTexts) {
                try {
                    let category = 'General';
                    let tags = [];
                    let enhancedText = promptText;
                    
                    // Check auto-enhance option
                    if (document.getElementById('auto-enhance')?.checked && this.state.settings.openaiApiKey) {
                        try {
                            const enhanced = await this.ai.enhancePrompt(promptText);
                            enhancedText = enhanced.enhanced || promptText;
                        } catch (error) {
                            console.warn('Enhancement failed:', error);
                        }
                    }

                    // Auto-categorization
                    if (document.getElementById('auto-categorize')?.checked && this.state.settings.openaiApiKey && this.state.settings.autoCategorizationEnabled) {
                        category = await this.ai.categorizePrompt(enhancedText);
                    } else {
                        category = this.ai.fallbackCategorization(enhancedText);
                    }

                    // Auto-tagging
                    if (document.getElementById('auto-tag')?.checked && this.state.settings.openaiApiKey && this.state.settings.autoTagsEnabled) {
                        tags = await this.ai.generateTags(enhancedText);
                    } else {
                        tags = this.ai.fallbackTagGeneration(enhancedText);
                    }

                    const newPrompt = await this.db.addPrompt({
                        text: enhancedText,
                        category: category,
                        tags: tags,
                        folder: 'Default',
                        rating: 0,
                        notes: promptText !== enhancedText ? `Original: ${promptText}` : ''
                    });

                    addedPrompts.push(newPrompt);
                } catch (error) {
                    if (error.code === 'DUPLICATE_PROMPT') {
                        skippedPrompts.push({
                            text: promptText,
                            duplicates: error.duplicates
                        });
                        console.warn('Duplicate prompt skipped:', promptText);
                    } else {
                        throw error; // Re-throw other errors
                    }
                }
            }
            
            // Reload data from database instead of manually adding to state
            await this.loadData();
            this.hideQuickAddModal();
            
            // Show results with duplicate information
            let message = '';
            
            if (addedPrompts.length > 0 && skippedPrompts.length === 0) {
                message = addedPrompts.length === 1 
                    ? `Prompt added and categorized as "${addedPrompts[0].category}"`
                    : `Added ${addedPrompts.length} prompts successfully`;
                this.showToast(message, 'success');
            } else if (addedPrompts.length === 0 && skippedPrompts.length > 0) {
                message = skippedPrompts.length === 1 
                    ? 'Prompt already exists - duplicate skipped'
                    : `All ${skippedPrompts.length} prompts already exist - duplicates skipped`;
                this.showToast(message, 'warning');
                this.showDuplicateModal(skippedPrompts);
            } else if (addedPrompts.length > 0 && skippedPrompts.length > 0) {
                message = `Added ${addedPrompts.length} new prompts, skipped ${skippedPrompts.length} duplicates`;
                this.showToast(message, 'info');
                this.showDuplicateModal(skippedPrompts);
            }
            
            // Only hide modal if something was actually processed
            if (addedPrompts.length > 0 || skippedPrompts.length > 0) {
                this.hideQuickAddModal();
            }
        } catch (error) {
            console.error('Failed to add prompt:', error);
            this.showToast('Failed to add prompt', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        const indicator = document.getElementById('loading-indicator');
        if (indicator) {
            indicator.style.display = isLoading ? 'flex' : 'none';
        }
    }

    updateFilteredPrompts() {
        this.state.filteredPrompts = this.state.prompts.filter(prompt => {
            const folderMatch = this.state.activeFolder === 'All' || prompt.folder === this.state.activeFolder;
            const categoryMatch = this.state.activeCategory === 'All' || prompt.category === this.state.activeCategory;
            const ratingMatch = prompt.rating >= this.state.minRating;
            
            // Advanced search with operators
            const searchMatch = this.advancedSearch(prompt, this.state.searchTerm);
            
            const tagMatch = this.state.selectedTags.length === 0 || 
                this.state.selectedTags.some(tag => prompt.tags.includes(tag));

            return folderMatch && categoryMatch && ratingMatch && searchMatch && tagMatch;
        });
        
        // Apply sorting
        this.state.filteredPrompts.sort((a, b) => {
            let aVal = a[this.state.sortBy];
            let bVal = b[this.state.sortBy];
            
            if (this.state.sortBy === 'text') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            } else if (this.state.sortBy === 'createdAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (this.state.sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    switchView(view) {
        this.state.activeView = view;
        this.render();
    }

    render() {
        this.renderSidebar();
        this.renderMainContent();
        this.renderModal();
    }

    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const allFolders = [...this.state.folders, ...this.state.customFolders];
        const folderCounts = this.getFolderCounts();
        const recentPrompts = this.getRecentPrompts(3);
        const categoryStats = this.getCategoryStats();

        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h2>📁 Folders</h2>
                <button id="sidebar-toggle-btn" class="sidebar-toggle" title="Toggle Sidebar">«</button>
            </div>
            
            <div class="sidebar-content">
                <div class="folder-section">
                    <div class="folder-list">
                        ${allFolders.map(folder => `
                            <button class="folder-btn ${this.state.activeFolder === folder ? 'active' : ''}" 
                                    data-folder="${folder}">
                                <span class="folder-icon">${this.getFolderIcon(folder)}</span>
                                <span class="folder-name">${folder}</span>
                                <span class="folder-count">${folderCounts[folder] || 0}</span>
                                ${folderCounts[folder] > 0 ? `<div class="folder-activity-bar" style="width: ${Math.min((folderCounts[folder] / Math.max(...Object.values(folderCounts))) * 100, 100)}%"></div>` : ''}
                            </button>
                        `).join('')}
                    </div>
                    <form class="new-folder-form">
                        <input type="text" placeholder="➕ New folder..." required>
                        <button type="submit" title="Create Folder">+</button>
                    </form>
                </div>
                
                <div class="sidebar-section collapsible ${this.getSidebarSectionState('recent') ? 'expanded' : 'collapsed'}">
                    <div class="section-header" data-section="recent">
                        <h3>🕒 Recent</h3>
                        <span class="section-toggle">${this.getSidebarSectionState('recent') ? '−' : '+'}</span>
                    </div>
                    <div class="section-content">
                        <div class="recent-prompts">
                            ${recentPrompts.length > 0 ? recentPrompts.map(prompt => `
                                <div class="recent-prompt-item" data-id="${prompt.id}" title="${prompt.text.substring(0, 100)}...">
                                    <div class="recent-prompt-category">${prompt.category}</div>
                                    <div class="recent-prompt-text">${prompt.text.substring(0, 40)}${prompt.text.length > 40 ? '...' : ''}</div>
                                    <div class="recent-prompt-time">${this.getRelativeTime(prompt.updatedAt)}</div>
                                </div>
                            `).join('') : '<div class="empty-state">No recent prompts</div>'}
                        </div>
                    </div>
                </div>
                
                <div class="sidebar-section collapsible ${this.getSidebarSectionState('stats') ? 'expanded' : 'collapsed'}">
                    <div class="section-header" data-section="stats">
                        <h3>📊 Quick Stats</h3>
                        <span class="section-toggle">${this.getSidebarSectionState('stats') ? '−' : '+'}</span>
                    </div>
                    <div class="section-content">
                        <div class="quick-stats">
                            <div class="stat-item">
                                <span class="stat-label">Total</span>
                                <span class="stat-value">${this.state.prompts.length}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">This Week</span>
                                <span class="stat-value">${this.getPromptsThisWeek()}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Avg Rating</span>
                                <span class="stat-value">${this.getAverageRating().toFixed(1)}</span>
                            </div>
                        </div>
                        <div class="category-mini-stats">
                            ${Object.entries(categoryStats).slice(0, 4).map(([category, count]) => `
                                <div class="mini-stat" data-category="${category}">
                                    <div class="mini-stat-bar" style="width: ${(count / Math.max(...Object.values(categoryStats))) * 100}%"></div>
                                    <span class="mini-stat-label">${category}</span>
                                    <span class="mini-stat-count">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="sidebar-section collapsible ${this.getSidebarSectionState('tags') ? 'expanded' : 'collapsed'}">
                    <div class="section-header" data-section="tags">
                        <h3>🏷️ Tags</h3>
                        <span class="section-toggle">${this.getSidebarSectionState('tags') ? '−' : '+'}</span>
                    </div>
                    <div class="section-content">
                        <div class="tag-cloud">
                            ${this.state.allTags.slice(0, 12).map(tag => {
                                const tagCount = this.getTagCount(tag);
                                return `
                                    <button class="tag-chip ${this.state.selectedTags.includes(tag) ? 'active' : ''}" 
                                            data-tag="${tag}" title="${tagCount} prompts">
                                        ${tag}
                                        <span class="tag-count">${tagCount}</span>
                                    </button>
                                `;
                            }).join('')}
                            ${this.state.allTags.length > 12 ? `
                                <button class="tag-chip expand-tags" data-action="expand-tags">
                                    +${this.state.allTags.length - 12} more
                                </button>
                            ` : ''}
                        </div>
                        ${this.state.selectedTags.length > 0 ? `
                            <button class="clear-tags-btn">🗑️ Clear filters (${this.state.selectedTags.length})</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add collapsible section handlers
        this.setupSidebarInteractions();
    }
    
    getFolderIcon(folder) {
        const icons = {
            'All': '📂',
            'Favorites': '⭐',
            'Archive': '📦',
            'Default': '📁'
        };
        return icons[folder] || '📁';
    }
    
    getRecentPrompts(limit = 3) {
        return this.state.prompts
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, limit);
    }
    
    getCategoryStats() {
        const stats = {};
        this.state.prompts.forEach(prompt => {
            if (prompt.category !== 'All') {
                stats[prompt.category] = (stats[prompt.category] || 0) + 1;
            }
        });
        return stats;
    }
    
    getPromptsThisWeek() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return this.state.prompts.filter(prompt => 
            new Date(prompt.createdAt) > weekAgo
        ).length;
    }
    
    getAverageRating() {
        if (this.state.prompts.length === 0) return 0;
        const totalRating = this.state.prompts.reduce((sum, prompt) => sum + (prompt.rating || 0), 0);
        return totalRating / this.state.prompts.length;
    }
    
    getTagCount(tag) {
        return this.state.prompts.filter(prompt => prompt.tags.includes(tag)).length;
    }
    
    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    }
    
    getSidebarSectionState(section) {
        const sidebarState = JSON.parse(localStorage.getItem('nlp_sidebar_state') || '{}');
        return sidebarState[section] !== false; // Default to expanded
    }
    
    setSidebarSectionState(section, expanded) {
        const sidebarState = JSON.parse(localStorage.getItem('nlp_sidebar_state') || '{}');
        sidebarState[section] = expanded;
        localStorage.setItem('nlp_sidebar_state', JSON.stringify(sidebarState));
    }
    
    setupSidebarInteractions() {
        // Section collapsing
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const section = header.dataset.section;
                const sectionElement = header.closest('.sidebar-section');
                const isExpanded = sectionElement.classList.contains('expanded');
                
                if (isExpanded) {
                    sectionElement.classList.remove('expanded');
                    sectionElement.classList.add('collapsed');
                } else {
                    sectionElement.classList.remove('collapsed');
                    sectionElement.classList.add('expanded');
                }
                
                this.setSidebarSectionState(section, !isExpanded);
                header.querySelector('.section-toggle').textContent = isExpanded ? '+' : '−';
            });
        });
        
        // Recent prompt clicks
        document.querySelectorAll('.recent-prompt-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const promptId = item.dataset.id;
                this.state.editingPromptId = promptId;
                this.switchView('prompts');
                this.render();
            });
        });
        
        // Mini stat clicks
        document.querySelectorAll('.mini-stat').forEach(stat => {
            stat.addEventListener('click', (e) => {
                const category = stat.dataset.category;
                this.state.activeCategory = category;
                this.updateFilteredPrompts();
                this.render();
            });
        });
    }

    getFolderCounts() {
        const counts = {};
        this.state.folders.concat(this.state.customFolders).forEach(folder => {
            counts[folder] = folder === 'All' 
                ? this.state.prompts.length 
                : this.state.prompts.filter(p => p.folder === folder).length;
        });
        return counts;
    }

    getCategoryDescription(category) {
        const descriptions = {
            'Code': 'Programming, debugging, algorithms, and technical solutions',
            'Cognitive': 'Problem-solving, decision making, and analytical thinking',
            'Jailbreak': 'Advanced techniques and limitation bypassing strategies',
            'Dev': 'Development tools, workflows, and software engineering',
            'Writing': 'Content creation, editing, and communication',
            'Business': 'Marketing, strategy, operations, and professional tasks',
            'General': 'Everyday questions, basic information, and general topics',
            'Creative': 'Art, design, brainstorming, and creative thinking',
            'Analysis': 'Data analysis, evaluation, and research methods',
            'Research': 'Academic research, investigations, and information gathering'
        };
        return descriptions[category] || 'Custom category for specialized prompts';
    }

    filterByCategory(category) {
        this.state.activeCategory = category;
        this.switchView('prompts');
    }

    manageCategoryPrompts(category) {
        // Implementation for managing prompts in a specific category
        this.state.activeCategory = category;
        this.switchView('prompts');
        this.showToast(`Managing ${category} prompts`, 'info');
    }

    showCategoryManager() {
        // Implementation for adding new categories
        this.showToast('Category management feature coming soon!', 'info');
    }

    autoCategorizeBatch() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for auto-categorization', 'error');
            return;
        }
        this.showToast('Auto-categorizing all prompts...', 'info');
        // Implementation for batch categorization
    }

    exportCategorizedData() {
        const categorizedData = this.state.categories.reduce((acc, cat) => {
            if (cat !== 'All') {
                acc[cat] = this.state.prompts.filter(p => p.category === cat);
            }
            return acc;
        }, {});
        
        const blob = new Blob([JSON.stringify(categorizedData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `categorized_prompts_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Categorized data exported successfully!', 'success');
    }

    renderMainContent() {
        const container = document.getElementById('view-container');
        if (!container) return;

        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.state.activeView);
        });

        switch (this.state.activeView) {
            case 'prompts':
                container.innerHTML = this.getPromptsViewHTML();
                break;
            case 'categories':
                container.innerHTML = this.getCategoriesViewHTML();
                break;
            case 'ai-assistant':
                container.innerHTML = this.getAIAssistantViewHTML();
                break;
            case 'analytics':
                container.innerHTML = this.getAnalyticsViewHTML();
                this.renderCharts();
                break;
            case 'settings':
                container.innerHTML = this.getSettingsViewHTML();
                break;
        }
    }

    getPromptsViewHTML() {
        this.updateFilteredPrompts();
        
        return `
            <div class="prompts-view-controls">
                <div class="search-and-filters">
                    <div class="search-bar">
                        <div class="search-input-container">
                            <input type="text" id="search-input" placeholder="🔍 Search prompts... (try: tag:code, rating:5, folder:favorites)" 
                                   value="${this.state.searchTerm}">
                            <button id="clear-search" class="clear-btn" ${!this.state.searchTerm ? 'style="display: none;"' : ''}>×</button>
                        </div>
                    </div>
                    <div class="filter-section">
                        <select id="category-filter">
                            ${this.state.categories.map(c => `
                                <option value="${c}" ${this.state.activeCategory === c ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                        <select id="rating-filter">
                            ${[0,1,2,3,4,5].map(r => `
                                <option value="${r}" ${this.state.minRating == r ? 'selected' : ''}>${r}+ Stars</option>
                            `).join('')}
                        </select>
                        <select id="sort-filter">
                            <option value="createdAt-desc" ${this.state.sortBy === 'createdAt' && this.state.sortOrder === 'desc' ? 'selected' : ''}>Newest First</option>
                            <option value="createdAt-asc" ${this.state.sortBy === 'createdAt' && this.state.sortOrder === 'asc' ? 'selected' : ''}>Oldest First</option>
                            <option value="rating-desc" ${this.state.sortBy === 'rating' && this.state.sortOrder === 'desc' ? 'selected' : ''}>Highest Rated</option>
                            <option value="usage_count-desc" ${this.state.sortBy === 'usage_count' && this.state.sortOrder === 'desc' ? 'selected' : ''}>Most Used</option>
                            <option value="text-asc" ${this.state.sortBy === 'text' && this.state.sortOrder === 'asc' ? 'selected' : ''}>Alphabetical</option>
                        </select>
                    </div>
                </div>
                
                <div class="view-actions">
                    <div class="view-stats">
                        <span>Showing ${this.state.filteredPrompts.length} of ${this.state.prompts.length} prompts</span>
                        ${this.state.selectedIds.size > 0 ? `<span class="selected-count">${this.state.selectedIds.size} selected</span>` : ''}
                    </div>
                    
                    <div class="view-controls">
                        <button id="bulk-mode-btn" class="control-btn ${this.state.bulkMode ? 'active' : ''}" title="Bulk Select Mode (Cmd+B)">
                            <span class="bulk-icon">☑️</span>
                        </button>
                        <button id="view-mode-btn" class="control-btn ${this.state.viewMode === 'list' ? 'active' : ''}" title="Toggle View Mode (Cmd+G)">
                            <span class="view-icon">${this.state.viewMode === 'grid' ? '📋' : '⚏'}</span>
                        </button>
                        <button id="refresh-btn" class="control-btn" title="Refresh">
                            <span class="refresh-icon">🔄</span>
                        </button>
                    </div>
                </div>
                
                ${this.state.selectedIds.size > 0 ? `
                    <div class="bulk-actions">
                        <button id="bulk-delete" class="bulk-btn danger">🗑️ Delete (${this.state.selectedIds.size})</button>
                        <button id="bulk-move" class="bulk-btn">📁 Move to Folder</button>
                        <button id="bulk-categorize" class="bulk-btn">🏷️ Set Category</button>
                        <button id="bulk-export" class="bulk-btn">💾 Export Selected</button>
                        <button id="bulk-duplicate" class="bulk-btn">📋 Duplicate</button>
                        <button id="deselect-all" class="bulk-btn secondary">Clear Selection</button>
                    </div>
                ` : ''}
            </div>
            
            <div class="prompts-container ${this.state.viewMode}">
                ${this.state.filteredPrompts.length > 0 
                    ? this.state.filteredPrompts.map(prompt => this.getPromptCardHTML(prompt)).join('')
                    : '<div class="empty-state">📝 No prompts found. <button onclick="app.showQuickAddModal()">Add your first prompt</button></div>'
                }
            </div>
        `;
    }

    getPromptCardHTML(prompt) {
        const isSelected = this.state.selectedIds.has(prompt.id);
        const highlight = (text) => {
            if (!this.state.searchTerm || !text) return text;
            const regex = new RegExp(`(${this.state.searchTerm})`, 'gi');
            return text.replace(regex, '<mark>$1</mark>');
        };

        const previewText = prompt.text.length > 150 ? prompt.text.substring(0, 150) + '...' : prompt.text;
        const isListView = this.state.viewMode === 'list';

        return `
            <div class="prompt-card ${isSelected ? 'selected' : ''} ${isListView ? 'list-view' : 'grid-view'}" 
                 data-id="${prompt.id}" 
                 draggable="true"
                 ondragstart="app.handleDragStart(event)"
                 ondragover="app.handleDragOver(event)"
                 ondrop="app.handleDrop(event)">
                 
                ${this.state.bulkMode ? `
                    <div class="select-checkbox">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} 
                               onchange="app.togglePromptSelection('${prompt.id}', event)">
                    </div>
                ` : ''}
                
                <!-- Quick Actions Overlay -->
                <div class="quick-actions-overlay">
                    <button class="quick-action-btn copy" data-action="copy" data-id="${prompt.id}" data-tooltip="Copy">
                        📋
                    </button>
                    <button class="quick-action-btn favorite ${prompt.folder === 'Favorites' ? 'active' : ''}" 
                            data-action="favorite" data-id="${prompt.id}" data-tooltip="Favorite">
                        ${prompt.folder === 'Favorites' ? '★' : '☆'}
                    </button>
                    <button class="quick-action-btn duplicate" data-action="duplicate" data-id="${prompt.id}" data-tooltip="Duplicate">
                        📄
                    </button>
                    <button class="quick-action-btn edit" data-action="edit" data-id="${prompt.id}" data-tooltip="Edit">
                        ✏️
                    </button>
                    <button class="quick-action-btn delete" data-action="delete" data-id="${prompt.id}" data-tooltip="Delete">
                        🗑️
                    </button>
                </div>
                
                <div class="card-header">
                    <div class="header-left">
                        <span class="category-badge category-${prompt.category.toLowerCase()}">${prompt.category}</span>
                        ${prompt.folder !== 'Default' ? `<span class="folder-badge">📁 ${prompt.folder}</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="action-btn favorite-btn ${prompt.folder === 'Favorites' ? 'active' : ''}" 
                                data-action="favorite" data-id="${prompt.id}" title="Add to favorites">⭐</button>
                        <button class="action-btn enhance-btn" data-action="enhance" data-id="${prompt.id}" title="AI Enhance">✨</button>
                        <button class="action-btn duplicate-btn" data-action="duplicate" data-id="${prompt.id}" title="Duplicate">📋</button>
                        <button class="action-btn edit-btn" data-action="edit" data-id="${prompt.id}" title="Edit">✏️</button>
                        <button class="action-btn copy-btn" data-action="copy" data-id="${prompt.id}" title="Copy to clipboard">📄</button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${prompt.id}" title="Delete">🗑️</button>
                    </div>
                </div>
                
                <div class="card-content">
                    <div class="prompt-text" ${!isListView ? 'onclick="app.expandPrompt(\'' + prompt.id + '\')"' : ''}>
                        ${highlight(previewText)}
                        ${prompt.text.length > 150 ? '<span class="expand-indicator">... click to expand</span>' : ''}
                    </div>
                    ${prompt.notes ? `<div class="prompt-notes">${highlight(prompt.notes)}</div>` : ''}
                </div>
                
                <div class="card-footer">
                    <div class="footer-left">
                        <div class="rating-stars" data-id="${prompt.id}">
                            ${[1, 2, 3, 4, 5].map(i => `
                                <span class="star ${prompt.rating >= i ? 'filled' : ''}" 
                                      data-value="${i}" data-id="${prompt.id}">★</span>
                            `).join('')}
                        </div>
                        
                        <div class="prompt-tags">
                            ${prompt.tags.slice(0, 3).map(tag => `<span class="tag" onclick="app.searchByTag('${tag}')">${tag}</span>`).join('')}
                            ${prompt.tags.length > 3 ? `<span class="tag-more">+${prompt.tags.length - 3}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="footer-right">
                        <div class="prompt-meta">
                            <span class="created-date" title="Created: ${new Date(prompt.createdAt).toLocaleString()}">
                                ${this.getRelativeTime(prompt.createdAt)}
                            </span>
                            ${prompt.usage_count > 0 ? `<span class="usage-count" title="Used ${prompt.usage_count} times">🔄 ${prompt.usage_count}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${isSelected ? '<div class="selection-overlay"></div>' : ''}
            </div>
        `;
    }

    getSettingsViewHTML() {
        return `
            <div class="settings-view">
                <h2>⚙️ Settings</h2>
                
                <div class="settings-section">
                    <h3>🤖 AI Integration</h3>
                    <div class="form-group">
                        <label for="openai-api-key">OpenAI API Key:</label>
                        <div class="api-key-input">
                            <input type="password" id="openai-api-key" 
                                   value="${this.state.settings.openaiApiKey}" 
                                   placeholder="sk-...">
                            <button id="test-api-key" class="btn-secondary">Test Connection</button>
                        </div>
                        <small>Required for automatic categorization and tag generation</small>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-categorization" 
                                   ${this.state.settings.autoCategorizationEnabled ? 'checked' : ''}>
                            Enable automatic categorization
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-tags" 
                                   ${this.state.settings.autoTagsEnabled ? 'checked' : ''}>
                            Enable automatic tag generation
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto-save" 
                                   ${this.autoSaveEnabled ? 'checked' : ''}>
                            Enable auto-save (saves every 5 seconds)
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>💾 Data Management</h3>
                    <div class="data-actions">
                        <button id="backup-data" class="btn-primary">Create Backup</button>
                        <button id="clear-data" class="btn-secondary danger">Clear All Data</button>
                    </div>
                    <small>Total prompts: ${this.state.prompts.length}</small>
                </div>
                
                <div class="settings-section">
                    <h3>⌨️ Keyboard Shortcuts</h3>
                    <div class="shortcuts-list">
                        <div class="shortcut"><kbd>Cmd/Ctrl + N</kbd> Add new prompt</div>
                        <div class="shortcut"><kbd>Cmd/Ctrl + F</kbd> Focus search</div>
                        <div class="shortcut"><kbd>Cmd/Ctrl + S</kbd> Export data</div>
                        <div class="shortcut"><kbd>Cmd/Ctrl + 1/2/3/4/5</kbd> Switch views</div>
                        <div class="shortcut"><kbd>Escape</kbd> Close modals</div>
                    </div>
                </div>
            </div>
        `;
    }

    getCategoriesViewHTML() {
        const categoryCounts = this.state.categories.reduce((acc, cat) => {
            acc[cat] = cat === 'All' ? this.state.prompts.length : 
                       this.state.prompts.filter(p => p.category === cat).length;
            return acc;
        }, {});

        return `
            <div class="categories-view">
                <h2>🏷️ Categories Management</h2>
                <div class="categories-overview">
                    <div class="category-stats">
                        <div class="stat-card">
                            <h3>📊 Total Categories</h3>
                            <div class="stat-value">${this.state.categories.length - 1}</div>
                        </div>
                        <div class="stat-card">
                            <h3>📝 Total Prompts</h3>
                            <div class="stat-value">${this.state.prompts.length}</div>
                        </div>
                        <div class="stat-card">
                            <h3>🎯 Most Used</h3>
                            <div class="stat-value">${Object.entries(categoryCounts).filter(([k]) => k !== 'All').sort(([,a], [,b]) => b - a)[0] ? Object.entries(categoryCounts).filter(([k]) => k !== 'All').sort(([,a], [,b]) => b - a)[0][0] : 'N/A'}</div>
                        </div>
                    </div>
                </div>
                
                <div class="categories-grid">
                    ${this.state.categories.filter(cat => cat !== 'All').map(category => `
                        <div class="category-card category-${category.toLowerCase()}">
                            <div class="category-header">
                                <h3>${category}</h3>
                                <span class="category-count">${categoryCounts[category] || 0}</span>
                            </div>
                            <div class="category-body">
                                <div class="category-description">${this.getCategoryDescription(category)}</div>
                                <div class="category-actions">
                                    <button class="btn-secondary" data-action="filter-category" data-category="${category}">
                                        🔍 View Prompts
                                    </button>
                                    <button class="btn-secondary" data-action="manage-category" data-category="${category}">
                                        ⚙️ Manage
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="categories-actions">
                    <h3>📈 Category Analytics</h3>
                    <div class="analytics-quick-view">
                        <canvas id="category-mini-chart" width="300" height="200"></canvas>
                    </div>
                    <div class="action-buttons">
                        <button class="btn-primary" data-action="show-category-manager">
                            ➕ Add Category
                        </button>
                        <button class="btn-secondary" data-action="auto-categorize-batch">
                            🤖 Auto-Categorize All
                        </button>
                        <button class="btn-secondary" data-action="export-categorized">
                            💾 Export by Category
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getAIAssistantViewHTML() {
        return `
            <div class="ai-assistant-view">
                <h2>🤖 AI Assistant</h2>
                <div class="ai-assistant-grid">
                    <div class="ai-card">
                        <h3>✨ Smart Enhancements</h3>
                        <div class="ai-features">
                            <div class="feature-item">
                                <h4>🎯 Auto-Categorization</h4>
                                <p>Automatically categorize your prompts using AI</p>
                                <button class="btn-primary" data-action="run-batch-categorization">
                                    🚀 Categorize All
                                </button>
                            </div>
                            <div class="feature-item">
                                <h4>🏷️ Smart Tagging</h4>
                                <p>Generate relevant tags for better organization</p>
                                <button class="btn-primary" data-action="run-batch-tagging">
                                    🚀 Tag All
                                </button>
                            </div>
                            <div class="feature-item">
                                <h4>📈 Quality Enhancement</h4>
                                <p>Improve prompt quality and effectiveness</p>
                                <button class="btn-primary" data-action="run-batch-enhancement">
                                    🚀 Enhance All
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ai-card">
                        <h3>🔍 AI Analysis</h3>
                        <div class="ai-analysis">
                            <div class="analysis-item">
                                <h4>📊 Collection Summary</h4>
                                <div class="analysis-result" id="collection-summary">
                                    <p>Get AI-powered insights about your prompt collection</p>
                                    <button class="btn-secondary" data-action="generate-collection-summary">
                                        📋 Generate Summary
                                    </button>
                                </div>
                            </div>
                            <div class="analysis-item">
                                <h4>🎯 Effectiveness Rating</h4>
                                <div class="analysis-result" id="effectiveness-rating">
                                    <p>Analyze the effectiveness of your prompts</p>
                                    <button class="btn-secondary" data-action="analyze-effectiveness">
                                        📊 Analyze
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ai-card">
                        <h3>🎨 Prompt Generator</h3>
                        <div class="prompt-generator">
                            <div class="generator-form">
                                <label for="prompt-topic">Topic or Theme:</label>
                                <input type="text" id="prompt-topic" placeholder="e.g., content writing, coding, analysis">
                                <label for="prompt-style">Style:</label>
                                <select id="prompt-style">
                                    <option value="professional">Professional</option>
                                    <option value="creative">Creative</option>
                                    <option value="analytical">Analytical</option>
                                    <option value="conversational">Conversational</option>
                                </select>
                                <label for="prompt-length">Length:</label>
                                <select id="prompt-length">
                                    <option value="short">Short & Concise</option>
                                    <option value="medium">Medium Detail</option>
                                    <option value="long">Long & Comprehensive</option>
                                </select>
                                <button class="btn-primary" data-action="generate-ai-prompt">
                                    ✨ Generate Prompt
                                </button>
                            </div>
                            <div class="generated-prompt" id="generated-prompt-result" style="display: none;">
                                <h4>Generated Prompt:</h4>
                                <div class="prompt-preview"></div>
                                <div class="prompt-actions">
                                    <button class="btn-secondary" data-action="copy-generated-prompt">
                                        📋 Copy
                                    </button>
                                    <button class="btn-primary" data-action="save-generated-prompt">
                                        💾 Save to Collection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ai-card">
                        <h3>🔧 AI Configuration</h3>
                        <div class="ai-config">
                            <div class="config-item">
                                <label>API Status:</label>
                                <span id="ai-status" class="status-indicator">
                                    ${this.state.settings.openaiApiKey ? '🟢 Connected' : '🔴 Not Connected'}
                                </span>
                            </div>
                            <div class="config-item">
                                <label>Auto-Categorization:</label>
                                <span class="status-indicator">
                                    ${this.state.settings.autoCategorizationEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                                </span>
                            </div>
                            <div class="config-item">
                                <label>Auto-Tagging:</label>
                                <span class="status-indicator">
                                    ${this.state.settings.autoTagsEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                                </span>
                            </div>
                            <div class="config-actions">
                                <button class="btn-secondary" data-action="switch-to-settings">
                                    ⚙️ Configure AI
                                </button>
                                <button class="btn-secondary" data-action="test-ai-connection">
                                    🔍 Test Connection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAnalyticsViewHTML() {
        return `
            <div class="analytics-view">
                <h2>📊 Analytics</h2>
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <canvas id="category-chart"></canvas>
                    </div>
                    <div class="analytics-card">
                        <canvas id="monthly-chart"></canvas>
                    </div>
                    <div class="analytics-card">
                        <canvas id="rating-chart"></canvas>
                    </div>
                    <div class="analytics-card">
                        <canvas id="tags-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    async renderCharts() {
        const analytics = await this.db.getAnalytics();
        
        setTimeout(() => {
            this.createCategoryChart(analytics.categories);
            this.createMonthlyChart(analytics.monthlyStats);
            this.createRatingChart();
            this.createTagsChart(analytics.topTags);
        }, 100);
    }

    createCategoryChart(data) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    data: Object.values(data),
                    backgroundColor: [
                        '#8A2BE2', '#FF6B6B', '#4ECDC4', '#45B7D1',
                        '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Prompts by Category' }
                }
            }
        });
    }

    createMonthlyChart(data) {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(data).sort(),
                datasets: [{
                    label: 'Prompts Added',
                    data: Object.keys(data).sort().map(month => data[month]),
                    borderColor: '#8A2BE2',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Prompts Added Over Time' }
                }
            }
        });
    }

    createRatingChart() {
        const ctx = document.getElementById('rating-chart');
        if (!ctx) return;

        const ratingCounts = [0,1,2,3,4,5].map(rating => 
            this.state.prompts.filter(p => p.rating === rating).length
        );

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0★', '1★', '2★', '3★', '4★', '5★'],
                datasets: [{
                    label: 'Number of Prompts',
                    data: ratingCounts,
                    backgroundColor: '#8A2BE2'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Prompts by Rating' }
                }
            }
        });
    }

    createTagsChart(topTags) {
        const ctx = document.getElementById('tags-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: topTags.map(t => t.tag),
                datasets: [{
                    label: 'Usage Count',
                    data: topTags.map(t => t.count),
                    backgroundColor: '#8A2BE2'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Most Used Tags' }
                }
            }
        });
    }

    renderModal() {
        const container = document.getElementById('modal-container');
        if (!this.state.editingPromptId) {
            container.innerHTML = '';
            return;
        }

        const prompt = this.state.prompts.find(p => p.id === this.state.editingPromptId);
        if (!prompt) return;

        container.innerHTML = `
            <div class="modal-overlay">
                <div class="modal edit-prompt-modal">
                    <h2>✏️ Edit Prompt</h2>
                    <form id="edit-prompt-form">
                        <div class="form-group">
                            <label>Prompt Text</label>
                            <textarea name="text" rows="6" required>${prompt.text}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Category</label>
                                <select name="category">
                                    ${this.state.categories.filter(c => c !== 'All').map(c => `
                                        <option value="${c}" ${prompt.category === c ? 'selected' : ''}>${c}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Folder</label>
                                <select name="folder">
                                    ${[...this.state.folders.filter(f => f !== 'All'), ...this.state.customFolders].map(f => `
                                        <option value="${f}" ${prompt.folder === f ? 'selected' : ''}>${f}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes (optional)</label>
                            <textarea name="notes" rows="2" placeholder="Additional notes or context...">${prompt.notes || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Tags</label>
                            <div class="tag-input-container">
                                <div class="current-tags">
                                    ${prompt.tags.map(tag => `
                                        <span class="tag-item">
                                            ${tag}
                                            <button type="button" data-remove-tag="${tag}">×</button>
                                        </span>
                                    `).join('')}
                                </div>
                                <input type="text" id="tag-input" placeholder="Add tags (comma separated)">
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn-delete" onclick="app.deletePrompt('${prompt.id}')">🗑️ Delete</button>
                            <div class="right-actions">
                                <button type="button" class="btn-secondary" onclick="app.state.editingPromptId = null; app.render();">Cancel</button>
                                <button type="submit" class="btn-primary">💾 Save Changes</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    handleDocumentClick(e) {
        const target = e.target;
        
        if (target.matches('.folder-btn')) {
            this.state.activeFolder = target.dataset.folder;
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (target.matches('.tag-chip')) {
            const tag = target.dataset.tag;
            if (this.state.selectedTags.includes(tag)) {
                this.state.selectedTags = this.state.selectedTags.filter(t => t !== tag);
            } else {
                this.state.selectedTags.push(tag);
            }
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (target.matches('.clear-tags-btn')) {
            this.state.selectedTags = [];
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (target.matches('.star')) {
            const id = target.dataset.id;
            const rating = parseInt(target.dataset.value);
            this.updatePromptRating(id, rating);
        }
        
        if (target.matches('.action-btn') || target.matches('.quick-action-btn')) {
            e.stopPropagation();
            const action = target.dataset.action;
            const id = target.dataset.id;
            this.handlePromptAction(action, id);
        }
        
        if (target.matches('.prompt-card') && !target.closest('.card-actions') && !target.closest('.rating-stars') && !target.closest('.select-checkbox') && !target.closest('.quick-actions-overlay')) {
            const id = target.dataset.id || target.closest('.prompt-card').dataset.id;
            if (this.state.bulkMode && (e.metaKey || e.ctrlKey || e.shiftKey)) {
                this.togglePromptSelection(id, e);
            } else if (!this.state.bulkMode) {
                this.state.editingPromptId = id;
                this.render();
            }
        }
        
        if (target.matches('[data-remove-tag]')) {
            const tagToRemove = target.dataset.removeTag;
            const tagItem = target.closest('.tag-item');
            if (tagItem) {
                tagItem.remove();
            }
        }
        
        // New bulk action handlers
        if (target.matches('#bulk-mode-btn')) {
            this.toggleBulkMode();
        }
        
        if (target.matches('#view-mode-btn')) {
            this.toggleViewMode();
        }
        
        if (target.matches('#refresh-btn')) {
            this.refreshView();
        }
        
        if (target.matches('#clear-search')) {
            this.clearSearch();
        }
        
        if (target.matches('#bulk-delete')) {
            this.deleteSelectedPrompts();
        }
        
        if (target.matches('#bulk-move')) {
            this.showBulkMoveModal();
        }
        
        if (target.matches('#bulk-categorize')) {
            this.showBulkCategorizeModal();
        }
        
        if (target.matches('#bulk-export')) {
            this.exportSelectedPrompts();
        }
        
        if (target.matches('#bulk-duplicate')) {
            this.duplicateSelectedPrompts();
        }
        
        if (target.matches('#deselect-all')) {
            this.deselectAllPrompts();
        }
        
        if (target.matches('#test-api-key')) {
            this.testApiConnection();
        }
        
        if (target.matches('#backup-data')) {
            this.exportData();
        }
        
        if (target.matches('#clear-data')) {
            this.clearAllData();
        }
        
        // New view action handlers
        if (target.matches('[data-action]')) {
            const action = target.dataset.action;
            const category = target.dataset.category;
            
            switch (action) {
                case 'filter-category':
                    this.filterByCategory(category);
                    break;
                case 'manage-category':
                    this.manageCategoryPrompts(category);
                    break;
                case 'show-category-manager':
                    this.showCategoryManager();
                    break;
                case 'auto-categorize-batch':
                    this.autoCategorizeBatch();
                    break;
                case 'export-categorized':
                    this.exportCategorizedData();
                    break;
                case 'run-batch-categorization':
                    this.runBatchCategorization();
                    break;
                case 'run-batch-tagging':
                    this.runBatchTagging();
                    break;
                case 'run-batch-enhancement':
                    this.runBatchEnhancement();
                    break;
                case 'generate-collection-summary':
                    this.generateCollectionSummary();
                    break;
                case 'analyze-effectiveness':
                    this.analyzeEffectiveness();
                    break;
                case 'generate-ai-prompt':
                    this.generateAIPrompt();
                    break;
                case 'copy-generated-prompt':
                    this.copyGeneratedPrompt();
                    break;
                case 'save-generated-prompt':
                    this.saveGeneratedPrompt();
                    break;
                case 'switch-to-settings':
                    this.switchView('settings');
                    break;
                case 'test-ai-connection':
                    this.testAIConnection();
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
                    break;
            }
        }
    }

    setupEnhancedSearch() {
        this.searchState = {
            recentSearches: JSON.parse(localStorage.getItem('nlp_recent_searches') || '[]'),
            selectedSuggestionIndex: -1,
            suggestionCache: new Map(),
            debounceTimer: null
        };
        
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        // Enhanced input handling
        searchInput.addEventListener('focus', () => this.showSearchSuggestions());
        searchInput.addEventListener('blur', (e) => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => this.hideSearchSuggestions(), 150);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(e);
        });
    }
    
    showSearchSuggestions() {
        const searchInput = document.getElementById('search-input');
        const suggestions = document.getElementById('search-suggestions');
        
        if (!searchInput || !suggestions) return;
        
        const rect = searchInput.getBoundingClientRect();
        suggestions.style.top = `${rect.bottom}px`;
        suggestions.style.left = `${rect.left}px`;
        suggestions.style.width = `${rect.width}px`;
        suggestions.style.display = 'block';
        
        this.updateSearchSuggestions(searchInput.value);
    }
    
    hideSearchSuggestions() {
        const suggestions = document.getElementById('search-suggestions');
        if (suggestions) {
            suggestions.style.display = 'none';
        }
        this.searchState.selectedSuggestionIndex = -1;
    }
    
    updateSearchSuggestions(query) {
        const recentSearches = document.getElementById('recent-searches');
        const quickFilters = document.getElementById('quick-filters');
        const autocomplete = document.getElementById('search-autocomplete');
        
        if (!recentSearches || !quickFilters || !autocomplete) return;
        
        // Recent searches
        const filteredRecent = this.searchState.recentSearches
            .filter(search => search.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3);
            
        recentSearches.innerHTML = filteredRecent.map(search => `
            <div class="suggestion-item" data-type="recent" data-value="${search}">
                <span class="suggestion-icon">🕒</span>
                <span class="suggestion-text">${this.highlightMatch(search, query)}</span>
            </div>
        `).join('');
        
        // Quick filters
        const filters = [
            { text: 'rating:5', description: 'High rated prompts', icon: '⭐' },
            { text: 'category:Code', description: 'Code prompts', icon: '💻' },
            { text: 'folder:Favorites', description: 'Favorite prompts', icon: '❤️' },
            { text: 'tag:javascript', description: 'JavaScript related', icon: '🏷️' },
            { text: 'has:notes', description: 'With notes', icon: '📝' }
        ];
        
        const matchingFilters = filters
            .filter(f => f.text.toLowerCase().includes(query.toLowerCase()) || 
                        f.description.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3);
            
        quickFilters.innerHTML = matchingFilters.map(filter => `
            <div class="suggestion-item" data-type="filter" data-value="${filter.text}">
                <span class="suggestion-icon">${filter.icon}</span>
                <span class="suggestion-text">${this.highlightMatch(filter.text, query)}</span>
                <span class="suggestion-description">${filter.description}</span>
            </div>
        `).join('');
        
        // Auto-complete based on existing data
        const suggestions = this.generateAutocompleteSuggestions(query).slice(0, 4);
        autocomplete.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" data-type="autocomplete" data-value="${suggestion.value}">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-text">${this.highlightMatch(suggestion.text, query)}</span>
                ${suggestion.count ? `<span class="suggestion-description">${suggestion.count} results</span>` : ''}
            </div>
        `).join('');
        
        // Add click handlers
        document.querySelectorAll('.suggestion-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.applySuggestion(item.dataset.value);
            });
        });
    }
    
    generateAutocompleteSuggestions(query) {
        const suggestions = [];
        const queryLower = query.toLowerCase();
        
        if (queryLower.length < 2) return suggestions;
        
        // Tag suggestions
        this.state.allTags.forEach(tag => {
            if (tag.toLowerCase().includes(queryLower)) {
                const count = this.state.prompts.filter(p => p.tags.includes(tag)).length;
                suggestions.push({
                    text: `tag:${tag}`,
                    value: `tag:${tag}`,
                    icon: '🏷️',
                    count
                });
            }
        });
        
        // Category suggestions
        this.state.categories.forEach(category => {
            if (category.toLowerCase().includes(queryLower) && category !== 'All') {
                const count = this.state.prompts.filter(p => p.category === category).length;
                suggestions.push({
                    text: `category:${category}`,
                    value: `category:${category}`,
                    icon: '📂',
                    count
                });
            }
        });
        
        // Content suggestions
        const words = this.state.prompts
            .flatMap(p => p.text.toLowerCase().split(/\s+/))
            .filter(word => word.length > 3 && word.includes(queryLower))
            .reduce((acc, word) => {
                acc[word] = (acc[word] || 0) + 1;
                return acc;
            }, {});
            
        Object.entries(words)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .forEach(([word, count]) => {
                suggestions.push({
                    text: word,
                    value: word,
                    icon: '💬',
                    count
                });
            });
        
        return suggestions.slice(0, 6);
    }
    
    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    
    handleSearchKeydown(e) {
        const suggestions = document.querySelectorAll('.suggestion-item');
        const suggestionsContainer = document.getElementById('search-suggestions');
        
        if (!suggestionsContainer || suggestionsContainer.style.display === 'none') return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.searchState.selectedSuggestionIndex = 
                    Math.min(this.searchState.selectedSuggestionIndex + 1, suggestions.length - 1);
                this.updateSuggestionSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.searchState.selectedSuggestionIndex = 
                    Math.max(this.searchState.selectedSuggestionIndex - 1, -1);
                this.updateSuggestionSelection();
                break;
                
            case 'Enter':
                if (this.searchState.selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    const selectedSuggestion = suggestions[this.searchState.selectedSuggestionIndex];
                    this.applySuggestion(selectedSuggestion.dataset.value);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSearchSuggestions();
                break;
        }
    }
    
    updateSuggestionSelection() {
        const suggestions = document.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => {
            item.classList.toggle('selected', index === this.searchState.selectedSuggestionIndex);
        });
    }
    
    applySuggestion(value) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = value;
            this.state.searchTerm = value;
            
            // Add to recent searches
            this.addToRecentSearches(value);
            
            this.updateFilteredPrompts();
            this.render();
        }
        this.hideSearchSuggestions();
    }
    
    addToRecentSearches(search) {
        if (!search || search.length < 2) return;
        
        // Remove if already exists
        this.searchState.recentSearches = this.searchState.recentSearches.filter(s => s !== search);
        
        // Add to beginning
        this.searchState.recentSearches.unshift(search);
        
        // Keep only last 10
        this.searchState.recentSearches = this.searchState.recentSearches.slice(0, 10);
        
        // Save to localStorage
        localStorage.setItem('nlp_recent_searches', JSON.stringify(this.searchState.recentSearches));
    }

    handleInput(e) {
        if (e.target.matches('#search-input')) {
            clearTimeout(this.searchState?.debounceTimer);
            
            const value = e.target.value;
            this.state.searchTerm = value;
            
            // Debounced search with suggestions
            this.searchState.debounceTimer = setTimeout(() => {
                this.updateFilteredPrompts();
                this.render();
                if (value.length > 0) {
                    this.updateSearchSuggestions(value);
                }
            }, 200);
        }
        
        if (e.target.matches('#openai-api-key')) {
            this.state.settings.openaiApiKey = e.target.value;
            this.ai.setApiKey(e.target.value);
            this.db.updateSettings(this.state.settings);
        }
    }

    handleChange(e) {
        if (e.target.matches('#category-filter')) {
            this.state.activeCategory = e.target.value;
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (e.target.matches('#rating-filter')) {
            this.state.minRating = parseInt(e.target.value);
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (e.target.matches('#sort-filter')) {
            const [sortBy, sortOrder] = e.target.value.split('-');
            this.state.sortBy = sortBy;
            this.state.sortOrder = sortOrder;
            this.updateFilteredPrompts();
            this.render();
        }
        
        if (e.target.matches('#auto-categorization')) {
            this.state.settings.autoCategorizationEnabled = e.target.checked;
            this.db.updateSettings(this.state.settings);
        }
        
        if (e.target.matches('#auto-tags')) {
            this.state.settings.autoTagsEnabled = e.target.checked;
            this.db.updateSettings(this.state.settings);
        }
        
        if (e.target.matches('#auto-save')) {
            this.autoSaveEnabled = e.target.checked;
            if (this.autoSaveEnabled) {
                this.showToast('Auto-save enabled', 'success');
            } else {
                this.showToast('Auto-save disabled', 'warning');
            }
        }
    }

    async handlePromptAction(action, id) {
        const prompt = this.state.prompts.find(p => p.id === id);
        if (!prompt) return;

        switch (action) {
            case 'favorite':
                const newFolder = prompt.folder === 'Favorites' ? 'Default' : 'Favorites';
                await this.db.updatePrompt(id, { folder: newFolder });
                prompt.folder = newFolder;
                this.markAsChanged();
                this.render();
                this.showToast(`${newFolder === 'Favorites' ? 'Added to' : 'Removed from'} favorites`);
                break;
                
            case 'edit':
                this.state.editingPromptId = id;
                this.render();
                break;
                
            case 'copy':
                try {
                    await navigator.clipboard.writeText(prompt.text);
                    await this.db.updatePrompt(id, { usage_count: (prompt.usage_count || 0) + 1 });
                    prompt.usage_count = (prompt.usage_count || 0) + 1;
                    this.markAsChanged();
                    this.render();
                    this.showToast('Copied to clipboard');
                } catch (error) {
                    this.showToast('Failed to copy', 'error');
                }
                break;
                
            case 'duplicate':
                try {
                    const duplicated = await this.db.addPrompt({
                        text: `[COPY] ${prompt.text}`,
                        category: prompt.category,
                        tags: [...prompt.tags, 'copy'],
                        folder: prompt.folder,
                        rating: prompt.rating,
                        notes: prompt.notes
                    });
                    
                    this.state.prompts.unshift(duplicated);
                    this.updateFilteredPrompts();
                    this.markAsChanged();
                    this.render();
                    this.showToast('Prompt duplicated');
                } catch (error) {
                    this.showToast('Failed to duplicate', 'error');
                }
                break;
                
            case 'delete':
                await this.deletePrompt(id);
                break;
                
            case 'enhance':
                if (this.state.settings.openaiApiKey) {
                    this.enhancePrompt(id);
                } else {
                    this.showToast('OpenAI API key required for enhancement', 'warning');
                }
                break;
        }
    }

    async updatePromptRating(id, rating) {
        await this.db.updatePrompt(id, { rating });
        const prompt = this.state.prompts.find(p => p.id === id);
        if (prompt) {
            prompt.rating = rating;
            this.markAsChanged();
            this.render();
        }
    }

    async exportData() {
        try {
            await this.db.exportData();
            this.showToast('Data exported successfully');
        } catch (error) {
            this.showToast('Export failed', 'error');
        }
    }

    triggerImport() {
        document.getElementById('import-file')?.click();
    }

    async handleImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const success = await this.db.importData(text);
            
            if (success) {
                await this.loadData();
                this.render();
                this.showToast('Data imported successfully');
            } else {
                this.showToast('Import failed - invalid format', 'error');
            }
        } catch (error) {
            this.showToast('Import failed', 'error');
        }
    }

    handleFormSubmit(e) {
        if (e.target.matches('#edit-prompt-form')) {
            e.preventDefault();
            this.handleEditFormSubmit(e.target);
        }
        
        if (e.target.matches('.new-folder-form')) {
            e.preventDefault();
            this.handleNewFolderSubmit(e.target);
        }
    }

    async handleEditFormSubmit(form) {
        const formData = new FormData(form);
        const updates = {
            text: formData.get('text'),
            category: formData.get('category'),
            folder: formData.get('folder'),
            notes: formData.get('notes') || ''
        };

        const tagInput = form.querySelector('#tag-input');
        const existingTags = Array.from(form.querySelectorAll('.tag-item')).map(item => 
            item.textContent.replace('×', '').trim()
        );
        
        if (tagInput && tagInput.value.trim()) {
            const newTags = tagInput.value.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
            updates.tags = [...existingTags, ...newTags];
        } else {
            updates.tags = existingTags;
        }

        try {
            await this.db.updatePrompt(this.state.editingPromptId, updates);
            const promptIndex = this.state.prompts.findIndex(p => p.id === this.state.editingPromptId);
            if (promptIndex !== -1) {
                this.state.prompts[promptIndex] = { ...this.state.prompts[promptIndex], ...updates };
            }
            
            this.state.allTags = await this.db.getAllTags();
            this.state.editingPromptId = null;
            this.markAsChanged();
            this.render();
            this.showToast('Prompt updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update prompt:', error);
            this.showToast('Failed to update prompt', 'error');
        }
    }

    async handleNewFolderSubmit(form) {
        const folderName = form.querySelector('input').value.trim();
        if (!folderName) return;

        if (await this.db.addFolder(folderName)) {
            this.state.customFolders.push(folderName);
            this.markAsChanged();
            this.render();
            this.showToast(`Folder "${folderName}" created`, 'success');
            form.reset();
        } else {
            this.showToast('Folder already exists', 'warning');
        }
    }

    setupCommandPalette() {
        const commandPalette = document.getElementById('command-palette');
        const commandInput = document.getElementById('command-input');
        const commandResults = document.getElementById('command-results');
        
        if (!commandPalette || !commandInput || !commandResults) return;
        
        this.commandPaletteState = {
            isOpen: false,
            selectedIndex: 0,
            commands: [],
            filteredCommands: []
        };
        
        // Click backdrop to close
        commandPalette.querySelector('.command-palette-backdrop')?.addEventListener('click', () => {
            this.hideCommandPalette();
        });
        
        // Handle input
        commandInput.addEventListener('input', (e) => {
            this.filterCommands(e.target.value);
        });
        
        // Handle keyboard navigation
        commandInput.addEventListener('keydown', (e) => {
            this.handleCommandPaletteKeydown(e);
        });
        
        // Click on command items
        commandResults.addEventListener('click', (e) => {
            const commandItem = e.target.closest('.command-item');
            if (commandItem) {
                this.executeCommand(commandItem.dataset.action, commandItem.dataset);
            }
        });
        
        // Initialize commands
        this.initializeCommands();
    }
    
    initializeCommands() {
        this.commandPaletteState.commands = [
            { action: 'add-prompt', text: 'Add New Prompt', icon: '➕', shortcut: '⌘N', category: 'Quick Actions' },
            { action: 'export', text: 'Export Data', icon: '💾', shortcut: '⌘S', category: 'Quick Actions' },
            { action: 'backup', text: 'Create Backup', icon: '🔒', shortcut: '', category: 'Quick Actions' },
            { action: 'import', text: 'Import Data', icon: '📁', shortcut: '', category: 'Quick Actions' },
            { action: 'view-prompts', text: 'View Prompts', icon: '📝', shortcut: '⌘1', category: 'Navigation' },
            { action: 'view-categories', text: 'View Categories', icon: '🏷️', shortcut: '⌘2', category: 'Navigation' },
            { action: 'view-analytics', text: 'View Analytics', icon: '📊', shortcut: '⌘4', category: 'Navigation' },
            { action: 'view-settings', text: 'View Settings', icon: '⚙️', shortcut: '⌘5', category: 'Navigation' },
            { action: 'search-focus', text: 'Focus Search', icon: '🔍', shortcut: '⌘F', category: 'Navigation' },
            { action: 'bulk-mode', text: 'Toggle Bulk Mode', icon: '☑️', shortcut: '⌘B', category: 'Selection' },
            { action: 'select-all', text: 'Select All', icon: '✅', shortcut: '⌘A', category: 'Selection' },
            { action: 'help', text: 'Show Keyboard Shortcuts', icon: '❓', shortcut: '?', category: 'Help' }
        ];
    }
    
    toggleCommandPalette() {
        if (this.commandPaletteState.isOpen) {
            this.hideCommandPalette();
        } else {
            this.showCommandPalette();
        }
    }
    
    showCommandPalette() {
        const commandPalette = document.getElementById('command-palette');
        const commandInput = document.getElementById('command-input');
        
        if (!commandPalette || !commandInput) return;
        
        this.commandPaletteState.isOpen = true;
        commandPalette.style.display = 'flex';
        
        // Reset state
        commandInput.value = '';
        this.commandPaletteState.selectedIndex = 0;
        this.filterCommands('');
        
        // Focus input
        setTimeout(() => commandInput.focus(), 100);
    }
    
    hideCommandPalette() {
        const commandPalette = document.getElementById('command-palette');
        if (!commandPalette) return;
        
        this.commandPaletteState.isOpen = false;
        commandPalette.style.display = 'none';
    }
    
    filterCommands(query) {
        const searchTerm = query.toLowerCase();
        
        if (searchTerm === '') {
            this.commandPaletteState.filteredCommands = [...this.commandPaletteState.commands];
        } else {
            this.commandPaletteState.filteredCommands = this.commandPaletteState.commands.filter(cmd =>
                cmd.text.toLowerCase().includes(searchTerm) ||
                cmd.category.toLowerCase().includes(searchTerm)
            );
        }
        
        this.commandPaletteState.selectedIndex = 0;
        this.renderCommandResults();
    }
    
    renderCommandResults() {
        const commandResults = document.getElementById('command-results');
        if (!commandResults) return;
        
        // Group commands by category
        const grouped = this.commandPaletteState.filteredCommands.reduce((acc, cmd, index) => {
            if (!acc[cmd.category]) {
                acc[cmd.category] = [];
            }
            acc[cmd.category].push({ ...cmd, originalIndex: index });
            return acc;
        }, {});
        
        const html = Object.entries(grouped).map(([category, commands]) => `
            <div class="command-section">
                <div class="command-section-title">${category}</div>
                ${commands.map(cmd => `
                    <div class="command-item ${cmd.originalIndex === this.commandPaletteState.selectedIndex ? 'selected' : ''}" 
                         data-action="${cmd.action}">
                        <span class="command-icon">${cmd.icon}</span>
                        <span class="command-text">${cmd.text}</span>
                        ${cmd.shortcut ? `<span class="command-shortcut">${cmd.shortcut}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
        
        commandResults.innerHTML = html;
    }
    
    handleCommandPaletteKeydown(e) {
        const filteredCount = this.commandPaletteState.filteredCommands.length;
        
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                this.hideCommandPalette();
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.commandPaletteState.selectedIndex = 
                    (this.commandPaletteState.selectedIndex + 1) % filteredCount;
                this.renderCommandResults();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.commandPaletteState.selectedIndex = 
                    (this.commandPaletteState.selectedIndex - 1 + filteredCount) % filteredCount;
                this.renderCommandResults();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (filteredCount > 0) {
                    const selectedCommand = this.commandPaletteState.filteredCommands[this.commandPaletteState.selectedIndex];
                    this.executeCommand(selectedCommand.action);
                }
                break;
        }
    }
    
    executeCommand(action, data = {}) {
        this.hideCommandPalette();
        
        switch (action) {
            case 'add-prompt':
                this.showQuickAddModal();
                break;
            case 'export':
                this.exportData();
                break;
            case 'backup':
                this.createBackup();
                break;
            case 'import':
                this.triggerImport();
                break;
            case 'view-prompts':
                this.switchView('prompts');
                break;
            case 'view-categories':
                this.switchView('categories');
                break;
            case 'view-analytics':
                this.switchView('analytics');
                break;
            case 'view-settings':
                this.switchView('settings');
                break;
            case 'search-focus':
                document.getElementById('search-input')?.focus();
                break;
            case 'bulk-mode':
                this.toggleBulkMode();
                break;
            case 'select-all':
                this.selectAllPrompts();
                break;
            case 'help':
                this.showShortcutsModal();
                break;
            default:
                this.showToast(`Command "${action}" not implemented`, 'warning');
        }
    }

    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        // Add click to dismiss
        toast.addEventListener('click', () => {
            this.dismissToast(toast);
        });
        
        // Add hover pause functionality
        let timeoutId;
        let remainingTime = duration;
        let startTime = Date.now();
        
        const startTimer = (time) => {
            timeoutId = setTimeout(() => {
                this.dismissToast(toast);
            }, time);
        };
        
        toast.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            remainingTime = remainingTime - (Date.now() - startTime);
        });
        
        toast.addEventListener('mouseleave', () => {
            startTime = Date.now();
            startTimer(remainingTime);
        });
        
        container.appendChild(toast);
        
        // Show animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Start auto-dismiss timer
        startTime = Date.now();
        startTimer(duration);
        
        // Auto-cleanup old toasts if too many
        const toasts = container.querySelectorAll('.toast');
        if (toasts.length > 5) {
            this.dismissToast(toasts[0]);
        }
    }
    
    dismissToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    showToastWithActions(message, type = 'info', actions = []) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type} with-actions`;
        
        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.className = 'toast-message';
        toast.appendChild(messageSpan);
        
        if (actions.length > 0) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'toast-actions';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.text;
                button.className = 'toast-action-btn';
                button.addEventListener('click', () => {
                    action.handler();
                    this.dismissToast(toast);
                });
                actionsDiv.appendChild(button);
            });
            
            toast.appendChild(actionsDiv);
        }
        
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto-dismiss after longer duration for action toasts
        setTimeout(() => {
            this.dismissToast(toast);
        }, 5000);
    }

    async showSummaryModal() {
        this.setLoading(true);
        
        try {
            const analytics = await this.db.getAnalytics();
            const summary = await this.generateDataSummary(analytics);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.id = 'summary-modal';
            modal.innerHTML = `
                <div class="modal summary-modal">
                    <h2>📊 Data Summary & Insights</h2>
                    <div class="summary-content">
                        <div class="summary-stats">
                            <div class="stat-card">
                                <h3>Total Prompts</h3>
                                <div class="stat-value">${analytics.totalPrompts}</div>
                            </div>
                            <div class="stat-card">
                                <h3>Categories</h3>
                                <div class="stat-value">${Object.keys(analytics.categories).length}</div>
                            </div>
                            <div class="stat-card">
                                <h3>Unique Tags</h3>
                                <div class="stat-value">${Object.keys(analytics.tags).length}</div>
                            </div>
                            <div class="stat-card">
                                <h3>Avg Rating</h3>
                                <div class="stat-value">${analytics.averageRating.toFixed(1)}★</div>
                            </div>
                        </div>
                        
                        <div class="summary-insights">
                            <h3>🧠 AI Insights</h3>
                            <div class="insights-text">${summary}</div>
                        </div>
                        
                        <div class="category-breakdown">
                            <h3>📝 Category Breakdown</h3>
                            <div class="category-list">
                                ${Object.entries(analytics.categories)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([cat, count]) => `
                                        <div class="category-item">
                                            <span class="category-name">${cat}</span>
                                            <span class="category-count">${count} prompts</span>
                                            <div class="category-bar">
                                                <div class="category-fill" style="width: ${(count / analytics.totalPrompts) * 100}%"></div>
                                            </div>
                                        </div>
                                    `).join('')}
                            </div>
                        </div>
                        
                        <div class="top-tags">
                            <h3>🏷️ Most Used Tags</h3>
                            <div class="tags-list">
                                ${analytics.topTags.slice(0, 10).map(({tag, count}) => `
                                    <span class="tag-summary">${tag} (${count})</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="document.getElementById('summary-modal').remove()">Close</button>
                        <button class="btn-primary" onclick="app.exportSummaryReport()">📄 Export Report</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Failed to generate summary:', error);
            this.showToast('Failed to generate summary', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async generateDataSummary(analytics) {
        if (!this.state.settings.openaiApiKey) {
            return this.generateFallbackSummary(analytics);
        }

        const prompt = `Analyze this prompt database data and provide insights:

Total Prompts: ${analytics.totalPrompts}
Categories: ${JSON.stringify(analytics.categories, null, 2)}
Top Tags: ${analytics.topTags.map(t => `${t.tag}(${t.count})`).join(', ')}
Average Rating: ${analytics.averageRating.toFixed(2)}

Provide 3-4 key insights about usage patterns, popular categories, and recommendations for organization. Keep it concise and actionable.`;
        
        try {
            const summary = await this.ai.generateInsights(prompt);
            return summary || this.generateFallbackSummary(analytics);
        } catch (error) {
            console.warn('AI summary failed, using fallback:', error);
            return this.generateFallbackSummary(analytics);
        }
    }

    generateFallbackSummary(analytics) {
        const topCategory = Object.entries(analytics.categories).sort(([,a], [,b]) => b - a)[0];
        const insights = [];
        
        insights.push(`Your most used category is "${topCategory[0]}" with ${topCategory[1]} prompts (${((topCategory[1] / analytics.totalPrompts) * 100).toFixed(1)}% of total).`);
        
        if (analytics.averageRating > 3) {
            insights.push(`High quality content: Your prompts have an average rating of ${analytics.averageRating.toFixed(1)} stars, indicating well-curated content.`);
        } else if (analytics.averageRating < 2) {
            insights.push(`Consider reviewing and rating your prompts to identify the most valuable ones.`);
        }
        
        if (Object.keys(analytics.tags).length > analytics.totalPrompts * 0.5) {
            insights.push(`Rich tagging: You have ${Object.keys(analytics.tags).length} unique tags, showing good organization habits.`);
        }
        
        if (analytics.totalPrompts > 50) {
            insights.push(`Extensive collection: With ${analytics.totalPrompts} prompts, consider creating custom folders to better organize by project or use case.`);
        }
        
        return insights.join(' ');
    }

    async enhancePrompt(id) {
        const prompt = this.state.prompts.find(p => p.id === id);
        if (!prompt) return;
        
        this.setLoading(true);
        try {
            const enhanced = await this.ai.enhancePrompt(prompt.text);
            
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal enhance-modal">
                    <h2>✨ AI Enhanced Prompt</h2>
                    <div class="enhancement-content">
                        <div class="original-prompt">
                            <h3>Original:</h3>
                            <div class="prompt-text">${prompt.text}</div>
                        </div>
                        
                        <div class="enhanced-prompt">
                            <h3>Enhanced:</h3>
                            <div class="prompt-text">${enhanced.enhanced}</div>
                        </div>
                        
                        ${enhanced.suggestions.length > 0 ? `
                            <div class="suggestions">
                                <h3>💡 Suggestions:</h3>
                                <ul>
                                    ${enhanced.suggestions.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button class="btn-primary" onclick="app.applyEnhancement('${id}', '${enhanced.enhanced.replace(/'/g, "\\'")}')">Apply Enhancement</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Enhancement failed:', error);
            this.showToast('Enhancement failed', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    async applyEnhancement(id, enhancedText) {
        try {
            await this.db.updatePrompt(id, { text: enhancedText });
            const prompt = this.state.prompts.find(p => p.id === id);
            if (prompt) {
                prompt.text = enhancedText;
                this.markAsChanged();
                this.render();
                this.showToast('Prompt enhanced successfully', 'success');
            }
            document.querySelector('.modal-overlay')?.remove();
        } catch (error) {
            console.error('Failed to apply enhancement:', error);
            this.showToast('Failed to apply enhancement', 'error');
        }
    }
    
    async exportSummaryReport() {
        try {
            const analytics = await this.db.getAnalytics();
            const summary = await this.generateDataSummary(analytics);
            
            const report = {
                title: 'NLP Prompt Database Summary Report',
                generatedAt: new Date().toISOString(),
                overview: {
                    totalPrompts: analytics.totalPrompts,
                    totalCategories: Object.keys(analytics.categories).length,
                    totalTags: Object.keys(analytics.tags).length,
                    averageRating: analytics.averageRating
                },
                insights: summary,
                categoryBreakdown: analytics.categories,
                topTags: analytics.topTags,
                monthlyStats: analytics.monthlyStats,
                prompts: this.state.prompts.map(p => ({
                    id: p.id,
                    category: p.category,
                    tags: p.tags,
                    rating: p.rating,
                    createdAt: p.createdAt,
                    usageCount: p.usage_count || 0
                }))
            };
            
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-database-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showToast('Summary report exported', 'success');
            document.getElementById('summary-modal')?.remove();
        } catch (error) {
            console.error('Failed to export summary:', error);
            this.showToast('Failed to export summary', 'error');
        }
    }

    async testApiConnection() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('Please enter an API key first', 'warning');
            return;
        }

        this.setLoading(true);
        try {
            const result = await this.ai.testConnection();
            if (result.success) {
                this.showToast(result.message, 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast('Connection test failed', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            try {
                localStorage.removeItem('nlp_prompts_database');
                this.state.prompts = [];
                this.state.customFolders = [];
                this.state.allTags = [];
                this.updateFilteredPrompts();
                this.markAsChanged();
                this.render();
                this.showToast('All data cleared', 'success');
            } catch (error) {
                this.showToast('Failed to clear data', 'error');
            }
        }
    }

    async deletePrompt(id) {
        if (confirm('Are you sure you want to delete this prompt?')) {
            try {
                await this.db.deletePrompt(id);
                this.state.prompts = this.state.prompts.filter(p => p.id !== id);
                this.state.allTags = await this.db.getAllTags();
                this.state.editingPromptId = null;
                this.state.selectedIds.delete(id);
                this.updateFilteredPrompts();
                this.markAsChanged();
                this.render();
                this.showToast('Prompt deleted', 'success');
            } catch (error) {
                console.error('Failed to delete prompt:', error);
                this.showToast('Failed to delete prompt', 'error');
            }
        }
    }
    
    // Advanced search with operators
    advancedSearch(prompt, searchTerm) {
        if (!searchTerm) return true;
        
        const term = searchTerm.toLowerCase();
        
        // Check for advanced operators
        if (term.includes('tag:')) {
            const tagMatch = term.match(/tag:(\w+)/);
            if (tagMatch) {
                return prompt.tags.some(tag => tag.toLowerCase().includes(tagMatch[1]));
            }
        }
        
        if (term.includes('rating:')) {
            const ratingMatch = term.match(/rating:(\d)/);
            if (ratingMatch) {
                return prompt.rating >= parseInt(ratingMatch[1]);
            }
        }
        
        if (term.includes('folder:')) {
            const folderMatch = term.match(/folder:(\w+)/);
            if (folderMatch) {
                return prompt.folder.toLowerCase().includes(folderMatch[1]);
            }
        }
        
        if (term.includes('category:')) {
            const categoryMatch = term.match(/category:(\w+)/);
            if (categoryMatch) {
                return prompt.category.toLowerCase().includes(categoryMatch[1]);
            }
        }
        
        // Default text search
        return prompt.text.toLowerCase().includes(term) ||
               prompt.notes.toLowerCase().includes(term) ||
               prompt.tags.some(tag => tag.toLowerCase().includes(term));
    }
    
    // Bulk operations
    toggleBulkMode() {
        this.state.bulkMode = !this.state.bulkMode;
        if (!this.state.bulkMode) {
            this.state.selectedIds.clear();
        }
        this.render();
        this.showToast(`Bulk mode ${this.state.bulkMode ? 'enabled' : 'disabled'}`);
    }
    
    togglePromptSelection(id, event) {
        if (event && event.shiftKey && this.state.lastSelectedId) {
            // Range selection
            const currentIndex = this.state.filteredPrompts.findIndex(p => p.id === id);
            const lastIndex = this.state.filteredPrompts.findIndex(p => p.id === this.state.lastSelectedId);
            const start = Math.min(currentIndex, lastIndex);
            const end = Math.max(currentIndex, lastIndex);
            
            for (let i = start; i <= end; i++) {
                this.state.selectedIds.add(this.state.filteredPrompts[i].id);
            }
        } else if (this.state.selectedIds.has(id)) {
            this.state.selectedIds.delete(id);
        } else {
            this.state.selectedIds.add(id);
        }
        
        this.state.lastSelectedId = id;
        this.render();
    }
    
    selectAllPrompts() {
        this.state.filteredPrompts.forEach(prompt => {
            this.state.selectedIds.add(prompt.id);
        });
        this.render();
        this.showToast(`Selected ${this.state.selectedIds.size} prompts`);
    }
    
    deselectAllPrompts() {
        this.state.selectedIds.clear();
        this.render();
    }
    
    async deleteSelectedPrompts() {
        if (this.state.selectedIds.size === 0) return;
        
        if (confirm(`Delete ${this.state.selectedIds.size} selected prompts? This cannot be undone.`)) {
            try {
                const idsToDelete = Array.from(this.state.selectedIds);
                await this.db.deletePrompts(idsToDelete);
                
                this.state.prompts = this.state.prompts.filter(p => !this.state.selectedIds.has(p.id));
                this.state.selectedIds.clear();
                this.state.allTags = await this.db.getAllTags();
                this.updateFilteredPrompts();
                this.markAsChanged();
                this.render();
                
                this.showToast(`Deleted ${idsToDelete.length} prompts`, 'success');
            } catch (error) {
                console.error('Failed to delete prompts:', error);
                this.showToast('Failed to delete prompts', 'error');
            }
        }
    }
    
    async duplicateSelectedPrompts() {
        if (this.state.selectedIds.size === 0) return;
        
        try {
            const selectedPrompts = this.state.prompts.filter(p => this.state.selectedIds.has(p.id));
            const duplicated = [];
            
            for (const prompt of selectedPrompts) {
                const newPrompt = await this.db.addPrompt({
                    text: `[COPY] ${prompt.text}`,
                    category: prompt.category,
                    tags: [...prompt.tags, 'copy'],
                    folder: prompt.folder,
                    rating: prompt.rating,
                    notes: prompt.notes
                });
                duplicated.push(newPrompt);
            }
            
            this.state.prompts.unshift(...duplicated);
            this.state.selectedIds.clear();
            this.updateFilteredPrompts();
            this.markAsChanged();
            this.render();
            
            this.showToast(`Duplicated ${duplicated.length} prompts`, 'success');
        } catch (error) {
            console.error('Failed to duplicate prompts:', error);
            this.showToast('Failed to duplicate prompts', 'error');
        }
    }
    
    exportSelectedPrompts() {
        if (this.state.selectedIds.size === 0) return;
        
        const selectedPrompts = this.state.prompts.filter(p => this.state.selectedIds.has(p.id));
        const exportData = {
            prompts: selectedPrompts,
            exported: new Date().toISOString(),
            count: selectedPrompts.length
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `selected_prompts_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`Exported ${selectedPrompts.length} prompts`, 'success');
    }
    
    toggleViewMode() {
        this.state.viewMode = this.state.viewMode === 'grid' ? 'list' : 'grid';
        this.render();
    }
    
    refreshView() {
        this.updateFilteredPrompts();
        this.render();
        this.showToast('View refreshed');
    }
    
    clearSearch() {
        this.state.searchTerm = '';
        this.updateFilteredPrompts();
        this.render();
    }
    
    searchByTag(tag) {
        this.state.searchTerm = `tag:${tag}`;
        this.updateFilteredPrompts();
        this.render();
    }
    
    expandPrompt(id) {
        this.state.editingPromptId = id;
        this.render();
    }
    
    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    
    // Drag and drop functionality
    handleDragStart(event) {
        this.state.draggedItem = event.target.dataset.id;
        event.dataTransfer.effectAllowed = 'move';
        event.target.style.opacity = '0.5';
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const card = event.currentTarget;
        if (card.dataset.id !== this.state.draggedItem) {
            card.classList.add('drag-over');
        }
    }
    
    handleDragLeave(event) {
        event.currentTarget.classList.remove('drag-over');
    }
    
    async handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const draggedId = this.state.draggedItem;
        const targetId = event.currentTarget.dataset.id;
        
        if (draggedId && targetId && draggedId !== targetId) {
            // Reorder prompts
            const draggedIndex = this.state.prompts.findIndex(p => p.id === draggedId);
            const targetIndex = this.state.prompts.findIndex(p => p.id === targetId);
            
            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [draggedPrompt] = this.state.prompts.splice(draggedIndex, 1);
                this.state.prompts.splice(targetIndex, 0, draggedPrompt);
                
                this.updateFilteredPrompts();
                this.markAsChanged();
                this.render();
                this.showToast('Prompts reordered');
            }
        }
        
        // Reset drag state
        document.querySelectorAll('.prompt-card').forEach(card => {
            card.style.opacity = '1';
        });
        this.state.draggedItem = null;
    }
    
    // Arrow key navigation
    handleArrowNavigation(e) {
        if (this.state.activeView !== 'prompts') return;
        
        const cards = document.querySelectorAll('.prompt-card');
        const currentSelected = document.querySelector('.prompt-card.keyboard-selected');
        let targetIndex = 0;
        
        if (currentSelected) {
            const currentIndex = Array.from(cards).indexOf(currentSelected);
            currentSelected.classList.remove('keyboard-selected');
            
            switch (e.key) {
                case 'ArrowDown':
                    targetIndex = Math.min(currentIndex + 1, cards.length - 1);
                    break;
                case 'ArrowUp':
                    targetIndex = Math.max(currentIndex - 1, 0);
                    break;
                case 'ArrowRight':
                    targetIndex = Math.min(currentIndex + 3, cards.length - 1); // Assuming 3 columns
                    break;
                case 'ArrowLeft':
                    targetIndex = Math.max(currentIndex - 3, 0);
                    break;
            }
        }
        
        if (cards[targetIndex]) {
            cards[targetIndex].classList.add('keyboard-selected');
            cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        e.preventDefault();
    }
    
    // Context menu functionality
    handleContextMenu(e) {
        const promptCard = e.target.closest('.prompt-card');
        if (promptCard) {
            e.preventDefault();
            this.showContextMenu(e.clientX, e.clientY, promptCard.dataset.id);
        }
    }
    
    showContextMenu(x, y, promptId) {
        const menu = document.getElementById('context-menu');
        if (menu) {
            menu.style.display = 'block';
            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.dataset.promptId = promptId;
            
            // Adjust position if menu goes off screen
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${x - rect.width}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${y - rect.height}px`;
            }
            
            // Add click handlers for menu items
            menu.querySelectorAll('.context-menu-item').forEach(item => {
                item.onclick = () => {
                    const action = item.dataset.action;
                    this.handlePromptAction(action, promptId);
                    this.hideContextMenu();
                };
            });
        }
    }
    
    hideContextMenu() {
        const menu = document.getElementById('context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }
    
    // Bulk operation modals
    showBulkMoveModal() {
        if (this.state.selectedIds.size === 0) return;
        
        const modal = document.getElementById('bulk-move-modal');
        const select = document.getElementById('bulk-move-folder');
        
        // Populate folder options
        const allFolders = [...this.state.folders.filter(f => f !== 'All'), ...this.state.customFolders];
        select.innerHTML = allFolders.map(folder => 
            `<option value="${folder}">${folder}</option>`
        ).join('');
        
        modal.style.display = 'flex';
    }
    
    showBulkCategorizeModal() {
        if (this.state.selectedIds.size === 0) return;
        
        const modal = document.getElementById('bulk-categorize-modal');
        const select = document.getElementById('bulk-categorize-category');
        
        // Populate category options
        select.innerHTML = this.state.categories.filter(c => c !== 'All').map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
        
        modal.style.display = 'flex';
    }
    
    async executeBulkMove() {
        const folder = document.getElementById('bulk-move-folder').value;
        const selectedIds = Array.from(this.state.selectedIds);
        
        try {
            for (const id of selectedIds) {
                await this.db.updatePrompt(id, { folder });
                const prompt = this.state.prompts.find(p => p.id === id);
                if (prompt) {
                    prompt.folder = folder;
                }
            }
            
            this.state.selectedIds.clear();
            this.updateFilteredPrompts();
            this.markAsChanged();
            this.render();
            
            document.getElementById('bulk-move-modal').style.display = 'none';
            this.showToast(`Moved ${selectedIds.length} prompts to ${folder}`, 'success');
        } catch (error) {
            console.error('Bulk move failed:', error);
            this.showToast('Bulk move failed', 'error');
        }
    }
    
    async executeBulkCategorize() {
        const category = document.getElementById('bulk-categorize-category').value;
        const selectedIds = Array.from(this.state.selectedIds);
        
        try {
            for (const id of selectedIds) {
                await this.db.updatePrompt(id, { category });
                const prompt = this.state.prompts.find(p => p.id === id);
                if (prompt) {
                    prompt.category = category;
                }
            }
            
            this.state.selectedIds.clear();
            this.updateFilteredPrompts();
            this.markAsChanged();
            this.render();
            
            document.getElementById('bulk-categorize-modal').style.display = 'none';
            this.showToast(`Categorized ${selectedIds.length} prompts as ${category}`, 'success');
        } catch (error) {
            console.error('Bulk categorize failed:', error);
            this.showToast('Bulk categorize failed', 'error');
        }
    }
    
    // Connection monitoring
    async monitorConnection() {
        const indicator = document.getElementById('connection-status');
        if (!indicator) return;
        
        try {
            const response = await fetch('/api/health');
            if (response.ok) {
                indicator.textContent = '🟢';
                indicator.className = 'connection-status connected';
                indicator.title = 'Connected to server';
            } else {
                throw new Error('Server error');
            }
        } catch (error) {
            indicator.textContent = '🔴';
            indicator.className = 'connection-status disconnected';
            indicator.title = 'Disconnected from server';
        }
        
        // Check again in 30 seconds
        setTimeout(() => this.monitorConnection(), 30000);
    }
    
    // Performance monitoring
    startPerformanceMonitoring() {
        const monitor = document.getElementById('performance-monitor');
        if (!monitor) return;
        
        monitor.style.display = 'block';
        
        let lastTime = performance.now();
        let frames = 0;
        
        const updateStats = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                document.getElementById('fps-counter').textContent = fps;
                
                if (performance.memory) {
                    const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
                    document.getElementById('memory-usage').textContent = memoryMB;
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updateStats);
        };
        
        requestAnimationFrame(updateStats);
    }
    
    // Shortcuts modal
    showShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    // Backup functionality
    async createBackup() {
        try {
            const response = await fetch('/api/backup', { method: 'POST' });
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Backup created successfully', 'success');
            } else {
                this.showToast('Backup failed', 'error');
            }
        } catch (error) {
            console.error('Backup failed:', error);
            this.showToast('Backup failed', 'error');
        }
    }
    
    // Enhanced loading with custom messages
    setLoading(isLoading, message = 'Processing with AI...') {
        this.state.isLoading = isLoading;
        const indicator = document.getElementById('loading-indicator');
        const loadingText = document.getElementById('loading-text');
        
        if (indicator) {
            indicator.style.display = isLoading ? 'flex' : 'none';
        }
        
        if (loadingText && isLoading) {
            loadingText.textContent = message;
        }
    }

    // AI Assistant Methods
    async runBatchCategorization() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for batch categorization', 'error');
            return;
        }
        
        this.showLoadingIndicator(true, 'AI is categorizing your prompts...');
        let processed = 0;
        const total = this.state.prompts.filter(p => !p.category || p.category === 'General').length;
        
        for (const prompt of this.state.prompts) {
            if (!prompt.category || prompt.category === 'General') {
                try {
                    const category = await this.ai.categorizePrompt(prompt.text);
                    prompt.category = category;
                    prompt.updatedAt = new Date().toISOString();
                    processed++;
                    this.showLoadingIndicator(true, `Categorizing... ${processed}/${total}`);
                    this.hasUnsavedChanges = true;
                } catch (error) {
                    console.error('Failed to categorize prompt:', error);
                }
            }
        }
        
        this.showLoadingIndicator(false);
        this.showToast(`Successfully categorized ${processed} prompts!`, 'success');
        this.render();
    }

    async runBatchTagging() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for batch tagging', 'error');
            return;
        }
        
        this.showLoadingIndicator(true, 'AI is generating tags for your prompts...');
        let processed = 0;
        const total = this.state.prompts.filter(p => !p.tags || p.tags.length === 0).length;
        
        for (const prompt of this.state.prompts) {
            if (!prompt.tags || prompt.tags.length === 0) {
                try {
                    const tags = await this.ai.generateTags(prompt.text);
                    prompt.tags = tags;
                    prompt.updatedAt = new Date().toISOString();
                    processed++;
                    this.showLoadingIndicator(true, `Generating tags... ${processed}/${total}`);
                    this.hasUnsavedChanges = true;
                } catch (error) {
                    console.error('Failed to generate tags:', error);
                }
            }
        }
        
        this.showLoadingIndicator(false);
        this.showToast(`Successfully tagged ${processed} prompts!`, 'success');
        this.render();
    }

    async runBatchEnhancement() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for batch enhancement', 'error');
            return;
        }
        
        this.showLoadingIndicator(true, 'AI is enhancing your prompts...');
        let processed = 0;
        const total = this.state.prompts.filter(p => p.rating < 4).length;
        
        for (const prompt of this.state.prompts) {
            if (prompt.rating < 4) {
                try {
                    const enhanced = await this.ai.enhancePrompt(prompt.text);
                    prompt.notes = `Enhanced version: ${enhanced}`;
                    prompt.updatedAt = new Date().toISOString();
                    processed++;
                    this.showLoadingIndicator(true, `Enhancing... ${processed}/${total}`);
                    this.hasUnsavedChanges = true;
                } catch (error) {
                    console.error('Failed to enhance prompt:', error);
                }
            }
        }
        
        this.showLoadingIndicator(false);
        this.showToast(`Successfully enhanced ${processed} prompts!`, 'success');
        this.render();
    }

    async generateCollectionSummary() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for collection summary', 'error');
            return;
        }
        
        const summaryElement = document.getElementById('collection-summary');
        if (!summaryElement) return;
        
        this.showLoadingIndicator(true, 'AI is analyzing your collection...');
        
        try {
            const stats = {
                totalPrompts: this.state.prompts.length,
                categories: this.state.categories.length - 1,
                avgRating: this.state.prompts.reduce((sum, p) => sum + (p.rating || 0), 0) / this.state.prompts.length,
                topCategory: this.state.prompts.reduce((acc, p) => {
                    acc[p.category] = (acc[p.category] || 0) + 1;
                    return acc;
                }, {})
            };
            
            const summary = await this.ai.generateCollectionSummary(stats);
            summaryElement.innerHTML = `
                <div class="summary-result">
                    <h5>📊 Collection Analysis</h5>
                    <p>${summary}</p>
                    <div class="summary-stats">
                        <span>📝 ${stats.totalPrompts} prompts</span>
                        <span>⭐ ${stats.avgRating.toFixed(1)} avg rating</span>
                        <span>🏷️ ${stats.categories} categories</span>
                    </div>
                </div>
            `;
        } catch (error) {
            summaryElement.innerHTML = '<p class="error">❌ Failed to generate summary</p>';
        }
        
        this.showLoadingIndicator(false);
    }

    async analyzeEffectiveness() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for effectiveness analysis', 'error');
            return;
        }
        
        const analysisElement = document.getElementById('effectiveness-rating');
        if (!analysisElement) return;
        
        this.showLoadingIndicator(true, 'AI is analyzing prompt effectiveness...');
        
        try {
            const highRatedPrompts = this.state.prompts.filter(p => p.rating >= 4);
            const lowRatedPrompts = this.state.prompts.filter(p => p.rating <= 2);
            
            const analysis = await this.ai.analyzeEffectiveness({
                highRated: highRatedPrompts.slice(0, 5),
                lowRated: lowRatedPrompts.slice(0, 5)
            });
            
            analysisElement.innerHTML = `
                <div class="analysis-result">
                    <h5>🎯 Effectiveness Analysis</h5>
                    <p>${analysis}</p>
                    <div class="effectiveness-tips">
                        <h6>💡 Tips for Better Prompts:</h6>
                        <ul>
                            <li>Be specific and clear in your instructions</li>
                            <li>Provide context and examples when needed</li>
                            <li>Use structured formats for complex tasks</li>
                            <li>Test and iterate on your prompts</li>
                        </ul>
                    </div>
                </div>
            `;
        } catch (error) {
            analysisElement.innerHTML = '<p class="error">❌ Failed to analyze effectiveness</p>';
        }
        
        this.showLoadingIndicator(false);
    }

    async generateAIPrompt() {
        const topic = document.getElementById('prompt-topic')?.value;
        const style = document.getElementById('prompt-style')?.value;
        const length = document.getElementById('prompt-length')?.value;
        
        if (!topic) {
            this.showToast('Please enter a topic for the prompt', 'error');
            return;
        }
        
        if (!this.state.settings.openaiApiKey) {
            this.showToast('OpenAI API key required for prompt generation', 'error');
            return;
        }
        
        this.showLoadingIndicator(true, 'AI is generating your prompt...');
        
        try {
            const generatedPrompt = await this.ai.generatePrompt(topic, style, length);
            const resultElement = document.getElementById('generated-prompt-result');
            
            if (resultElement) {
                resultElement.style.display = 'block';
                resultElement.querySelector('.prompt-preview').textContent = generatedPrompt;
                this.generatedPrompt = generatedPrompt;
            }
            
            this.showToast('Prompt generated successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to generate prompt', 'error');
        }
        
        this.showLoadingIndicator(false);
    }

    copyGeneratedPrompt() {
        if (this.generatedPrompt) {
            navigator.clipboard.writeText(this.generatedPrompt);
            this.showToast('Prompt copied to clipboard!', 'success');
        }
    }

    async saveGeneratedPrompt() {
        if (!this.generatedPrompt) return;
        
        const topic = document.getElementById('prompt-topic')?.value;
        const style = document.getElementById('prompt-style')?.value;
        
        const newPrompt = {
            id: this.generateId(),
            text: this.generatedPrompt,
            category: 'General',
            tags: [topic, style, 'ai-generated'],
            folder: 'Default',
            rating: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usage_count: 0,
            notes: `Generated by AI for topic: ${topic}`
        };
        
        this.state.prompts.unshift(newPrompt);
        this.hasUnsavedChanges = true;
        this.render();
        this.showToast('Generated prompt saved to collection!', 'success');
        
        // Clear the form
        document.getElementById('prompt-topic').value = '';
        document.getElementById('generated-prompt-result').style.display = 'none';
    }

    async testAIConnection() {
        if (!this.state.settings.openaiApiKey) {
            this.showToast('Please set your OpenAI API key first', 'error');
            return;
        }
        
        this.showLoadingIndicator(true, 'Testing AI connection...');
        
        try {
            const result = await this.ai.testConnection();
            if (result) {
                this.showToast('AI connection successful!', 'success');
                document.getElementById('ai-status').textContent = '🟢 Connected';
            } else {
                this.showToast('AI connection failed', 'error');
                document.getElementById('ai-status').textContent = '🔴 Failed';
            }
        } catch (error) {
            this.showToast('AI connection test failed', 'error');
            document.getElementById('ai-status').textContent = '🔴 Error';
        }
        
        this.showLoadingIndicator(false);
    }

    // Show duplicate detection modal
    showDuplicateModal(skippedPrompts) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal duplicate-modal">
                <h2>⚠️ Duplicate Prompts Detected</h2>
                <p>The following prompts were skipped because they already exist:</p>
                <div class="duplicate-list">
                    ${skippedPrompts.map(item => `
                        <div class="duplicate-item">
                            <div class="duplicate-text">${this.truncateText(item.text, 100)}</div>
                            <div class="duplicate-matches">
                                <strong>Similar to:</strong>
                                ${item.duplicates.map(dup => `
                                    <div class="match-item">
                                        <span class="match-text">${this.truncateText(dup.text, 80)}</span>
                                        <span class="match-category">${dup.category}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.remove();">Close</button>
                    <button class="btn-primary" onclick="app.handleDuplicateOverride(${JSON.stringify(skippedPrompts).replace(/"/g, '&quot;')}); this.parentElement.parentElement.remove();">Add Anyway</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Handle user choosing to override duplicate detection
    async handleDuplicateOverride(skippedPrompts) {
        this.showLoadingIndicator(true, 'Adding prompts...');
        
        try {
            const addedPrompts = [];
            
            for (const item of skippedPrompts) {
                // Force add without duplicate check
                const newPrompt = await this.db.addPromptForced({
                    text: item.text,
                    category: 'General',
                    tags: [],
                    folder: 'Default',
                    rating: 0,
                    notes: 'Added as duplicate override'
                });
                
                addedPrompts.push(newPrompt);
            }
            
            await this.loadData();
            this.showToast(`Added ${addedPrompts.length} prompts (duplicates overridden)`, 'success');
        } catch (error) {
            console.error('Failed to add duplicate prompts:', error);
            this.showToast('Failed to add prompts', 'error');
        } finally {
            this.showLoadingIndicator(false);
        }
    }

    // Helper method to truncate text
    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    // Utility methods for safe DOM operations
    safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    }

    safeQuerySelector(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Element with selector '${selector}' not found`);
        }
        return element;
    }

    safeSetTextContent(id, content) {
        const element = this.safeGetElement(id);
        if (element) {
            element.textContent = content;
            return true;
        }
        return false;
    }

    safeSetInnerHTML(id, content) {
        const element = this.safeGetElement(id);
        if (element) {
            element.innerHTML = content;
            return true;
        }
        return false;
    }

    safeSetStyle(id, property, value) {
        const element = this.safeGetElement(id);
        if (element) {
            element.style[property] = value;
            return true;
        }
        return false;
    }

    // Error boundary for async operations
    async safeAsyncOperation(operation, errorMessage = 'Operation failed') {
        try {
            return await operation();
        } catch (error) {
            console.error(errorMessage, error);
            this.showToast(errorMessage, 'error');
            return null;
        }
    }

    // Validation helpers
    validatePrompt(prompt) {
        const errors = [];
        
        if (!prompt.text || prompt.text.trim().length === 0) {
            errors.push('Prompt text is required');
        }
        
        if (prompt.text && prompt.text.length > 10000) {
            errors.push('Prompt text too long (max 10,000 characters)');
        }
        
        if (prompt.rating && (prompt.rating < 0 || prompt.rating > 5)) {
            errors.push('Rating must be between 0 and 5');
        }
        
        if (prompt.tags && !Array.isArray(prompt.tags)) {
            errors.push('Tags must be an array');
        }
        
        return errors;
    }

    // Enhanced error handling for API calls
    async apiCall(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API call failed for ${url}:`, error);
            this.showToast(`Network error: ${error.message}`, 'error');
            throw error;
        }
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NLPPromptDatabase();
    
    // Initialize keyboard shortcuts help
    const helpButton = document.getElementById('help-button');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            app.showShortcutsModal();
        });
    }
    
    // Initialize performance monitoring toggle
    if (localStorage.getItem('showPerformanceMonitor') === 'true') {
        app.state.settings.showPerformanceMonitor = true;
        app.startPerformanceMonitoring();
    }
    
    // Add visibility change handler for performance optimization
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause expensive operations when tab is hidden
            app.pauseOperations?.();
        } else {
            // Resume operations when tab is visible
            app.resumeOperations?.();
        }
    });
});

window.app = app;

// Expose methods for global access
window.app.enhancePrompt = window.app.enhancePrompt;
window.app.applyEnhancement = window.app.applyEnhancement;
window.app.searchByTag = window.app.searchByTag;
window.app.expandPrompt = window.app.expandPrompt;
window.app.togglePromptSelection = window.app.togglePromptSelection;
window.app.handleDragStart = window.app.handleDragStart;
window.app.handleDragOver = window.app.handleDragOver;
window.app.handleDrop = window.app.handleDrop;
window.app.showBulkMoveModal = window.app.showBulkMoveModal;
window.app.showBulkCategorizeModal = window.app.showBulkCategorizeModal;
window.app.executeBulkMove = window.app.executeBulkMove;
window.app.executeBulkCategorize = window.app.executeBulkCategorize;

// Performance optimization: Debounce search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to search function once app is initialized
document.addEventListener('DOMContentLoaded', () => {
    if (app) {
        const originalHandleInput = app.handleInput.bind(app);
        app.handleInput = debounce(originalHandleInput, 300);
    }
});

// Add global keyboard listener for accessibility
document.addEventListener('keydown', (e) => {
    // Prevent default behavior when navigating with keyboard
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && 
        e.target.matches('.prompt-card, .prompt-card *')) {
        e.preventDefault();
    }
});

// Add drag event listeners
document.addEventListener('dragend', (e) => {
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.style.opacity = '1';
        card.classList.remove('drag-over');
    });
});

// Performance monitoring
const performanceObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.duration > 100) {
            console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
    }
});

if ('PerformanceObserver' in window) {
    performanceObserver.observe({ entryTypes: ['measure'] });
}