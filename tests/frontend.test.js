const { expect } = require('chai');

describe('Frontend Database Class Tests', () => {
    let db;
    
    beforeEach(() => {
        global.window = {
            fetch: async (url, options) => {
                if (url.includes('/api/data') && !options) {
                    return {
                        ok: true,
                        json: async () => ({
                            prompts: [],
                            categories: ['General', 'Code'],
                            folders: ['Default'],
                            customFolders: [],
                            settings: {},
                            metadata: { totalPrompts: 0 }
                        })
                    };
                }
                return { ok: true, json: async () => ({ success: true }) };
            },
            localStorage: {
                data: {},
                getItem: function(key) { return this.data[key] || null; },
                setItem: function(key, value) { this.data[key] = value; },
                removeItem: function(key) { delete this.data[key]; }
            }
        };
        
        global.fetch = window.fetch;
        global.localStorage = window.localStorage;
        
        class LocalJSONDatabase {
            constructor(apiBaseUrl = 'http://localhost:3001/api') {
                this.apiBaseUrl = apiBaseUrl;
                this.data = null;
                this.initialized = false;
            }

            async init() {
                const response = await fetch(`${this.apiBaseUrl}/data`);
                if (response.ok) {
                    this.data = await response.json();
                    this.initialized = true;
                    return this.data;
                }
                throw new Error('Failed to initialize');
            }

            generateUniqueId() {
                return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            async addPrompt(promptData) {
                if (!this.initialized) await this.init();
                
                const newPrompt = {
                    id: this.generateUniqueId(),
                    text: promptData.text,
                    category: promptData.category || 'General',
                    tags: promptData.tags || [],
                    folder: promptData.folder || 'Default',
                    rating: promptData.rating || 0,
                    createdAt: new Date().toISOString(),
                    metadata: { source: 'manual' }
                };

                this.data.prompts.push(newPrompt);
                return newPrompt;
            }

            async getPrompts(filters = {}) {
                if (!this.initialized) await this.init();
                
                let filtered = [...this.data.prompts];

                if (filters.category && filters.category !== 'All') {
                    filtered = filtered.filter(p => p.category === filters.category);
                }

                if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    filtered = filtered.filter(p => 
                        p.text.toLowerCase().includes(searchLower)
                    );
                }

                return filtered;
            }
        }
        
        db = new LocalJSONDatabase();
    });

    describe('Database Initialization', () => {
        it('should initialize successfully', async () => {
            await db.init();
            expect(db.initialized).to.be.true;
            expect(db.data).to.be.an('object');
        });

        it('should have required properties after init', async () => {
            await db.init();
            expect(db.data).to.have.property('prompts');
            expect(db.data).to.have.property('categories');
            expect(db.data).to.have.property('folders');
        });
    });

    describe('Prompt Management', () => {
        beforeEach(async () => {
            await db.init();
        });

        it('should add a new prompt', async () => {
            const promptData = {
                text: 'Test prompt',
                category: 'Code',
                tags: ['javascript', 'testing']
            };

            const newPrompt = await db.addPrompt(promptData);
            
            expect(newPrompt).to.have.property('id');
            expect(newPrompt.text).to.equal(promptData.text);
            expect(newPrompt.category).to.equal(promptData.category);
            expect(newPrompt.tags).to.deep.equal(promptData.tags);
        });

        it('should generate unique IDs', async () => {
            const prompt1 = await db.addPrompt({ text: 'Prompt 1' });
            const prompt2 = await db.addPrompt({ text: 'Prompt 2' });
            
            expect(prompt1.id).to.not.equal(prompt2.id);
        });

        it('should filter prompts by category', async () => {
            await db.addPrompt({ text: 'Code prompt', category: 'Code' });
            await db.addPrompt({ text: 'General prompt', category: 'General' });

            const codePrompts = await db.getPrompts({ category: 'Code' });
            expect(codePrompts).to.have.length(1);
            expect(codePrompts[0].category).to.equal('Code');
        });

        it('should filter prompts by search term', async () => {
            await db.addPrompt({ text: 'JavaScript debugging help' });
            await db.addPrompt({ text: 'Python data analysis' });

            const jsPrompts = await db.getPrompts({ search: 'javascript' });
            expect(jsPrompts).to.have.length(1);
            expect(jsPrompts[0].text).to.include('JavaScript');
        });
    });

    describe('ID Generation', () => {
        it('should generate valid prompt IDs', () => {
            const id = db.generateUniqueId();
            expect(id).to.be.a('string');
            expect(id).to.match(/^prompt_\d+_[a-z0-9]+$/);
        });

        it('should generate different IDs on subsequent calls', () => {
            const id1 = db.generateUniqueId();
            const id2 = db.generateUniqueId();
            expect(id1).to.not.equal(id2);
        });
    });
});