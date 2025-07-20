class LocalJSONDatabase {
    constructor(apiBaseUrl = 'http://localhost:3001/api') {
        this.apiBaseUrl = apiBaseUrl;
        this.data = null;
        this.initialized = false;
        this.autoSaveEnabled = true;
        this.autoSaveDelay = 500; // ms
        this.autoSaveTimeout = null;
    }

    async init() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/data`);
            if (response.ok) {
                this.data = await response.json();
                console.log('✓ Database loaded from server');
            } else {
                console.warn('Server not available, using default data');
                this.data = this.getDefaultData();
            }
            this.initialized = true;
            return this.data;
        } catch (error) {
            console.warn('Could not connect to server, using default data:', error);
            this.data = this.getDefaultData();
            this.initialized = true;
            return this.data;
        }
    }

    getDefaultData() {
        return {
            prompts: [],
            categories: ["All", "Code", "Cognitive", "Jailbreak", "Dev", "Writing", "Business", "General", "Creative", "Analysis", "Research"],
            folders: ["All", "Favorites", "Archive", "Default"],
            customFolders: [],
            settings: {
                openaiApiKey: "",
                autoCategorizationEnabled: true,
                lastBackup: null
            },
            metadata: {
                version: "1.0.0",
                created: new Date().toISOString().split('T')[0],
                totalPrompts: 0
            }
        };
    }

    async save(immediate = false) {
        try {
            this.data.metadata.totalPrompts = this.data.prompts.length;
            this.data.metadata.lastSaved = new Date().toISOString();
            
            const endpoint = immediate ? '/data' : '/autosave';
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.data)
            });

            if (response.ok) {
                const result = await response.json();
                if (immediate) {
                    console.log('✓ Database saved immediately');
                } else {
                    console.log('✓ Auto-save queued');
                }
                localStorage.setItem('nlp_prompts_database', JSON.stringify(this.data));
                return true;
            } else {
                console.warn('Server save failed, using localStorage only');
                localStorage.setItem('nlp_prompts_database', JSON.stringify(this.data));
                return false;
            }
        } catch (error) {
            console.error('Failed to save database:', error);
            localStorage.setItem('nlp_prompts_database', JSON.stringify(this.data));
            return false;
        }
    }

    autoSave() {
        if (!this.autoSaveEnabled) return;
        
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.save(false); // Auto-save (debounced)
        }, this.autoSaveDelay);
    }

    async loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('nlp_prompts_database');
            if (stored) {
                this.data = JSON.parse(stored);
                this.initialized = true;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return false;
        }
    }

    // Generate unique ID with duplicate prevention
    generateUniqueId() {
        let id;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            const timestamp = Date.now();
            const randomPart = Math.random().toString(36).substr(2, 9);
            const counterPart = Math.random().toString(36).substr(2, 3);
            id = `prompt_${timestamp}_${randomPart}_${counterPart}`;
            attempts++;
            
            // Add small delay to ensure different timestamps if needed
            if (attempts > 1) {
                const now = Date.now();
                while (Date.now() === now) {
                    // Wait for next millisecond
                }
            }
        } while (this.data.prompts.some(p => p.id === id) && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            // Fallback to UUID-like generation
            id = `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
        }
        
        return id;
    }

    // Check for duplicate prompts based on text similarity
    checkForDuplicates(text, threshold = 0.9) {
        const normalizedText = text.toLowerCase().trim().replace(/\s+/g, ' ');
        
        return this.data.prompts.filter(prompt => {
            const normalizedPromptText = prompt.text.toLowerCase().trim().replace(/\s+/g, ' ');
            
            // Exact match
            if (normalizedText === normalizedPromptText) {
                return true;
            }
            
            // Similarity check for near-duplicates
            const similarity = this.calculateSimilarity(normalizedText, normalizedPromptText);
            return similarity >= threshold;
        });
    }

    // Simple similarity calculation (Jaccard similarity)
    calculateSimilarity(str1, str2) {
        const words1 = new Set(str1.split(' '));
        const words2 = new Set(str2.split(' '));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size;
    }

    async addPrompt(promptData) {
        if (!this.initialized) await this.init();
        
        // Check for duplicates
        const duplicates = this.checkForDuplicates(promptData.text);
        if (duplicates.length > 0) {
            const error = new Error('Duplicate prompt detected');
            error.code = 'DUPLICATE_PROMPT';
            error.duplicates = duplicates;
            throw error;
        }
        
        const newPrompt = {
            id: this.generateUniqueId(),
            text: promptData.text,
            category: promptData.category || 'General',
            tags: promptData.tags || [],
            folder: promptData.folder || 'Default',
            rating: promptData.rating || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usage_count: 0,
            notes: promptData.notes || '',
            metadata: {
                source: promptData.source || 'manual',
                confidence: promptData.confidence || 1.0
            }
        };

        this.data.prompts.unshift(newPrompt);
        this.autoSave();
        return newPrompt;
    }

    // Add prompt without duplicate checking (for override scenarios)
    async addPromptForced(promptData) {
        if (!this.initialized) await this.init();
        
        const newPrompt = {
            id: this.generateUniqueId(),
            text: promptData.text,
            category: promptData.category || 'General',
            tags: promptData.tags || [],
            folder: promptData.folder || 'Default',
            rating: promptData.rating || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usage_count: 0,
            notes: promptData.notes || '',
            metadata: {
                source: promptData.source || 'manual',
                confidence: promptData.confidence || 1.0,
                duplicateOverride: true
            }
        };

        this.data.prompts.unshift(newPrompt);
        this.autoSave();
        return newPrompt;
    }

    async updatePrompt(id, updates) {
        if (!this.initialized) await this.init();
        
        const index = this.data.prompts.findIndex(p => p.id === id);
        if (index !== -1) {
            this.data.prompts[index] = {
                ...this.data.prompts[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.autoSave();
            return this.data.prompts[index];
        }
        return null;
    }

    async deletePrompt(id) {
        if (!this.initialized) await this.init();
        
        const index = this.data.prompts.findIndex(p => p.id === id);
        if (index !== -1) {
            const deleted = this.data.prompts.splice(index, 1)[0];
            this.autoSave();
            return deleted;
        }
        return null;
    }

    async deletePrompts(ids) {
        if (!this.initialized) await this.init();
        
        const deleted = [];
        for (const id of ids) {
            const index = this.data.prompts.findIndex(p => p.id === id);
            if (index !== -1) {
                deleted.push(this.data.prompts.splice(index, 1)[0]);
            }
        }
        if (deleted.length > 0) {
            this.autoSave();
        }
        return deleted;
    }

    async getPrompts(filters = {}) {
        if (!this.initialized) await this.init();
        
        let filtered = [...this.data.prompts];

        if (filters.category && filters.category !== 'All') {
            filtered = filtered.filter(p => p.category === filters.category);
        }

        if (filters.folder && filters.folder !== 'All') {
            filtered = filtered.filter(p => p.folder === filters.folder);
        }

        if (filters.minRating !== undefined) {
            filtered = filtered.filter(p => p.rating >= filters.minRating);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                p.text.toLowerCase().includes(searchLower) ||
                p.notes.toLowerCase().includes(searchLower) ||
                p.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(p => 
                filters.tags.some(tag => p.tags.includes(tag))
            );
        }

        return filtered;
    }

    async getCategories() {
        if (!this.initialized) await this.init();
        return [...this.data.categories];
    }

    async addCategory(category) {
        if (!this.initialized) await this.init();
        
        if (!this.data.categories.includes(category)) {
            this.data.categories.push(category);
            this.autoSave();
            return true;
        }
        return false;
    }

    async getFolders() {
        if (!this.initialized) await this.init();
        return [...this.data.folders, ...this.data.customFolders];
    }

    async addFolder(folder) {
        if (!this.initialized) await this.init();
        
        const allFolders = [...this.data.folders, ...this.data.customFolders];
        if (!allFolders.includes(folder)) {
            this.data.customFolders.push(folder);
            this.autoSave();
            return true;
        }
        return false;
    }

    async getAllTags() {
        if (!this.initialized) await this.init();
        
        const tagSet = new Set();
        this.data.prompts.forEach(prompt => {
            prompt.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
    }

    async getSettings() {
        if (!this.initialized) await this.init();
        return { ...this.data.settings };
    }

    async updateSettings(settings) {
        if (!this.initialized) await this.init();
        
        this.data.settings = { ...this.data.settings, ...settings };
        this.autoSave();
        return this.data.settings;
    }

    async exportData() {
        if (!this.initialized) await this.init();
        
        const exportData = {
            ...this.data,
            exported: new Date().toISOString(),
            exportVersion: '1.0.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nlp_prompts_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        return true;
    }

    async importData(jsonData) {
        try {
            const importedData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            
            if (importedData.prompts && Array.isArray(importedData.prompts)) {
                importedData.prompts.forEach(prompt => {
                    if (!this.data.prompts.find(p => p.id === prompt.id)) {
                        this.data.prompts.push({
                            ...prompt,
                            importedAt: new Date().toISOString()
                        });
                    }
                });

                if (importedData.customFolders) {
                    importedData.customFolders.forEach(folder => {
                        if (!this.data.customFolders.includes(folder)) {
                            this.data.customFolders.push(folder);
                        }
                    });
                }

                this.autoSave();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    async getAnalytics() {
        if (!this.initialized) await this.init();
        
        const prompts = this.data.prompts;
        const categoryCounts = {};
        const tagCounts = {};
        const monthlyStats = {};

        prompts.forEach(prompt => {
            categoryCounts[prompt.category] = (categoryCounts[prompt.category] || 0) + 1;
            
            prompt.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });

            const month = prompt.createdAt.substring(0, 7);
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        });

        return {
            totalPrompts: prompts.length,
            categories: categoryCounts,
            tags: tagCounts,
            monthlyStats: monthlyStats,
            averageRating: prompts.length > 0 ? 
                prompts.reduce((sum, p) => sum + p.rating, 0) / prompts.length : 0,
            topTags: Object.entries(tagCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([tag, count]) => ({ tag, count }))
        };
    }
}

window.LocalJSONDatabase = LocalJSONDatabase;