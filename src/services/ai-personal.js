/**
 * Personal AI Assistant & Enhancement Pipeline
 * 
 * AI-powered features optimized for personal use
 * Features: Batch processing, caching, insights, smart categorization
 */

const PersonalPerformanceMonitor = require('../utils/personal-monitor');

class PersonalAIAssistant {
    constructor(config = {}) {
        this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
        this.model = config.model || 'gpt-3.5-turbo';
        this.batchSize = config.batchSize || 5;
        this.requestDelay = config.requestDelay || 100; // ms
        this.monitor = new PersonalPerformanceMonitor();
        
        // In-memory cache for AI responses
        this.cache = new Map();
        this.cacheSize = config.cacheSize || 1000;
        this.cacheTTL = config.cacheTTL || 3600000; // 1 hour
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.requestCount = 0;
        this.rateLimitWindow = 60000; // 1 minute
        this.maxRequestsPerWindow = 60; // Conservative for personal use
        
        // Initialize OpenAI client if available
        this.openai = null;
        if (this.openaiKey) {
            try {
                // Try to load OpenAI SDK if available
                const { OpenAI } = require('openai');
                this.openai = new OpenAI({ apiKey: this.openaiKey });
                console.log('✓ OpenAI client initialized');
            } catch (error) {
                console.warn('OpenAI SDK not available, using direct API calls');
            }
        } else {
            console.warn('No OpenAI API key provided - AI features disabled');
        }
    }

    /**
     * Enhance prompts in batches with caching
     */
    async enhancePromptBatch(prompts) {
        const endTimer = this.monitor.startTimer('ai_batch_enhancement');
        
        try {
            if (!this.isAIAvailable()) {
                console.warn('AI not available, returning prompts unchanged');
                return prompts.map(p => ({ ...p, enhanced: false }));
            }

            console.log(`🧠 Enhancing ${prompts.length} prompts in batches of ${this.batchSize}...`);
            
            const enhanced = [];
            
            for (let i = 0; i < prompts.length; i += this.batchSize) {
                const batch = prompts.slice(i, i + this.batchSize);
                
                // Process batch
                const batchResults = await Promise.all(
                    batch.map(prompt => this.enhanceSinglePrompt(prompt))
                );
                
                enhanced.push(...batchResults);
                
                // Rate limiting delay
                if (i + this.batchSize < prompts.length) {
                    await this.delay(this.requestDelay);
                }
                
                console.log(`✓ Processed batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(prompts.length / this.batchSize)}`);
            }
            
            const result = endTimer();
            console.log(`✓ Enhanced ${enhanced.length} prompts in ${result.duration.toFixed(2)}ms`);
            
            return enhanced;
            
        } catch (error) {
            console.error('Batch enhancement failed:', error);
            return prompts.map(p => ({ ...p, enhanced: false, error: error.message }));
        }
    }

    /**
     * Enhance a single prompt with AI categorization and suggestions
     */
    async enhanceSinglePrompt(prompt) {
        try {
            // Check cache first
            const cacheKey = this.getCacheKey('enhance', prompt.text);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return { ...prompt, ...cached, enhanced: true, fromCache: true };
            }

            if (!this.isAIAvailable()) {
                return { ...prompt, enhanced: false, reason: 'AI not available' };
            }

            // Check rate limit
            if (!this.checkRateLimit()) {
                return { ...prompt, enhanced: false, reason: 'Rate limit exceeded' };
            }

            const enhancementPrompt = this.buildEnhancementPrompt(prompt);
            const response = await this.callOpenAI(enhancementPrompt);
            
            const enhancement = this.parseEnhancementResponse(response);
            
            // Cache the result
            this.setCache(cacheKey, enhancement);
            
            return {
                ...prompt,
                ...enhancement,
                enhanced: true,
                fromCache: false
            };
            
        } catch (error) {
            console.error(`Failed to enhance prompt ${prompt.id}:`, error.message);
            return { ...prompt, enhanced: false, error: error.message };
        }
    }

    /**
     * Generate personal insights from prompt data
     */
    async generatePersonalInsights(prompts = []) {
        const endTimer = this.monitor.startTimer('generate_insights');
        
        try {
            console.log('📊 Generating personal insights...');
            
            const insights = {
                totalPrompts: prompts.length,
                averageRating: this.calculateAverageRating(prompts),
                mostUsedCategories: this.analyzeCategories(prompts),
                topTags: this.analyzeTopTags(prompts),
                productivityTrends: this.analyzeProductivityTrends(prompts),
                suggestions: [],
                efficiency: this.calculateEfficiencyScore(prompts),
                usage: this.analyzeUsagePatterns(prompts),
                qualityMetrics: this.analyzeQualityMetrics(prompts)
            };

            // Generate AI-powered suggestions if available
            if (this.isAIAvailable() && prompts.length > 0) {
                insights.suggestions = await this.generateAISuggestions(insights);
            } else {
                insights.suggestions = this.generateBasicSuggestions(insights);
            }

            const result = endTimer();
            console.log(`✓ Generated insights in ${result.duration.toFixed(2)}ms`);
            
            return insights;
            
        } catch (error) {
            console.error('Failed to generate insights:', error);
            return this.getBasicInsights(prompts);
        }
    }

    /**
     * Smart categorization for new prompts
     */
    async smartCategorizePrompt(text, existingCategories = []) {
        try {
            // Check cache first
            const cacheKey = this.getCacheKey('categorize', text);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            if (!this.isAIAvailable()) {
                return { category: 'General', confidence: 0.5, source: 'fallback' };
            }

            if (!this.checkRateLimit()) {
                return { category: 'General', confidence: 0.5, source: 'rate_limited' };
            }

            const categorizationPrompt = this.buildCategorizationPrompt(text, existingCategories);
            const response = await this.callOpenAI(categorizationPrompt);
            
            const result = this.parseCategorizationResponse(response, existingCategories);
            
            // Cache the result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('Smart categorization failed:', error);
            return { category: 'General', confidence: 0.3, source: 'error', error: error.message };
        }
    }

    /**
     * Generate smart tags for prompts
     */
    async generateSmartTags(text, existingTags = []) {
        try {
            // Check cache first
            const cacheKey = this.getCacheKey('tags', text);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            if (!this.isAIAvailable()) {
                return { tags: [], confidence: 0.5, source: 'fallback' };
            }

            if (!this.checkRateLimit()) {
                return { tags: [], confidence: 0.5, source: 'rate_limited' };
            }

            const taggingPrompt = this.buildTaggingPrompt(text, existingTags);
            const response = await this.callOpenAI(taggingPrompt);
            
            const result = this.parseTaggingResponse(response);
            
            // Cache the result
            this.setCache(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('Smart tagging failed:', error);
            return { tags: [], confidence: 0.3, source: 'error', error: error.message };
        }
    }

    /**
     * Build enhancement prompt for AI
     */
    buildEnhancementPrompt(prompt) {
        return {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a personal AI assistant helping organize NLP prompts. 
                    Analyze the given prompt and suggest improvements for category, tags, and quality rating.
                    Respond with valid JSON only: {"category": "string", "suggestedTags": ["tag1", "tag2"], "qualityRating": 1-5, "improvements": "string"}`
                },
                {
                    role: 'user',
                    content: `Analyze this prompt: "${prompt.text}"\nCurrent category: ${prompt.category || 'None'}\nCurrent tags: ${prompt.tags?.join(', ') || 'None'}`
                }
            ],
            max_tokens: 500,
            temperature: 0.3
        };
    }

    /**
     * Build categorization prompt
     */
    buildCategorizationPrompt(text, categories) {
        return {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a smart categorization assistant. Categorize NLP prompts into the most appropriate category.
                    Available categories: ${categories.join(', ')}
                    Respond with valid JSON only: {"category": "string", "confidence": 0.0-1.0, "reasoning": "string"}`
                },
                {
                    role: 'user',
                    content: `Categorize this prompt: "${text}"`
                }
            ],
            max_tokens: 200,
            temperature: 0.2
        };
    }

    /**
     * Build tagging prompt
     */
    buildTaggingPrompt(text, existingTags) {
        return {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a smart tagging assistant. Generate 3-5 relevant tags for NLP prompts.
                    Prefer existing tags when appropriate: ${existingTags.slice(0, 20).join(', ')}
                    Respond with valid JSON only: {"tags": ["tag1", "tag2"], "confidence": 0.0-1.0}`
                },
                {
                    role: 'user',
                    content: `Generate tags for: "${text}"`
                }
            ],
            max_tokens: 200,
            temperature: 0.4
        };
    }

    /**
     * Generate AI-powered suggestions
     */
    async generateAISuggestions(insights) {
        try {
            if (!this.checkRateLimit()) {
                return this.generateBasicSuggestions(insights);
            }

            const suggestionPrompt = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a personal productivity assistant. Based on the user's prompt database analytics, 
                        suggest 3-5 actionable improvements for their NLP prompt organization and usage.
                        Respond with valid JSON only: {"suggestions": [{"type": "string", "title": "string", "description": "string", "priority": "high|medium|low"}]}`
                    },
                    {
                        role: 'user',
                        content: `My prompt analytics: ${JSON.stringify(insights, null, 2)}`
                    }
                ],
                max_tokens: 600,
                temperature: 0.6
            };

            const response = await this.callOpenAI(suggestionPrompt);
            const parsed = this.parseJSONResponse(response);
            
            return parsed.suggestions || this.generateBasicSuggestions(insights);
            
        } catch (error) {
            console.error('AI suggestion generation failed:', error);
            return this.generateBasicSuggestions(insights);
        }
    }

    /**
     * Call OpenAI API with error handling
     */
    async callOpenAI(prompt) {
        this.requestCount++;
        this.lastRequestTime = Date.now();
        
        try {
            if (this.openai) {
                // Use official SDK
                const response = await this.openai.chat.completions.create(prompt);
                return response.choices[0]?.message?.content || '';
            } else {
                // Fallback to direct API call
                const response = await this.directOpenAICall(prompt);
                return response;
            }
            
        } catch (error) {
            console.error('OpenAI API call failed:', error.message);
            throw error;
        }
    }

    /**
     * Direct OpenAI API call fallback
     */
    async directOpenAICall(prompt) {
        const fetch = require('node-fetch');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(prompt)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    /**
     * Parse enhancement response from AI
     */
    parseEnhancementResponse(response) {
        try {
            const parsed = this.parseJSONResponse(response);
            return {
                suggestedCategory: parsed.category || null,
                suggestedTags: parsed.suggestedTags || [],
                qualityRating: parsed.qualityRating || null,
                improvements: parsed.improvements || null
            };
        } catch (error) {
            return { suggestedCategory: null, suggestedTags: [], qualityRating: null, improvements: null };
        }
    }

    /**
     * Parse categorization response
     */
    parseCategorizationResponse(response, categories) {
        try {
            const parsed = this.parseJSONResponse(response);
            const category = categories.includes(parsed.category) ? parsed.category : 'General';
            return {
                category,
                confidence: parsed.confidence || 0.5,
                reasoning: parsed.reasoning || '',
                source: 'ai'
            };
        } catch (error) {
            return { category: 'General', confidence: 0.3, source: 'parse_error' };
        }
    }

    /**
     * Parse tagging response
     */
    parseTaggingResponse(response) {
        try {
            const parsed = this.parseJSONResponse(response);
            return {
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                confidence: parsed.confidence || 0.5,
                source: 'ai'
            };
        } catch (error) {
            return { tags: [], confidence: 0.3, source: 'parse_error' };
        }
    }

    /**
     * Parse JSON response with error handling
     */
    parseJSONResponse(response) {
        try {
            // Try to extract JSON from response
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
            return JSON.parse(response);
        } catch (error) {
            throw new Error(`Invalid JSON response: ${response}`);
        }
    }

    /**
     * Analysis methods
     */
    
    calculateAverageRating(prompts) {
        if (prompts.length === 0) return 0;
        const total = prompts.reduce((sum, p) => sum + (p.rating || 0), 0);
        return Math.round((total / prompts.length) * 100) / 100;
    }

    analyzeCategories(prompts) {
        const counts = {};
        prompts.forEach(p => {
            const cat = p.category || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([category, count]) => ({ category, count }));
    }

    analyzeTopTags(prompts) {
        const counts = {};
        prompts.forEach(p => {
            (p.tags || []).forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        
        return Object.entries(counts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
    }

    analyzeProductivityTrends(prompts) {
        const trends = {};
        prompts.forEach(p => {
            const date = new Date(p.createdAt || p.created_at || Date.now());
            const month = date.toISOString().slice(0, 7); // YYYY-MM
            trends[month] = (trends[month] || 0) + 1;
        });
        
        return Object.entries(trends)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 12)
            .map(([month, count]) => ({ month, count }));
    }

    calculateEfficiencyScore(prompts) {
        if (prompts.length === 0) return 0;
        
        const avgRating = this.calculateAverageRating(prompts);
        const categorizedRatio = prompts.filter(p => p.category && p.category !== 'General').length / prompts.length;
        const taggedRatio = prompts.filter(p => p.tags && p.tags.length > 0).length / prompts.length;
        
        return Math.round(((avgRating / 5) * 0.4 + categorizedRatio * 0.3 + taggedRatio * 0.3) * 100);
    }

    analyzeUsagePatterns(prompts) {
        return {
            byRating: this.groupByRating(prompts),
            byLength: this.groupByLength(prompts),
            byRecency: this.groupByRecency(prompts)
        };
    }

    analyzeQualityMetrics(prompts) {
        return {
            highQuality: prompts.filter(p => (p.rating || 0) >= 4).length,
            needsImprovement: prompts.filter(p => (p.rating || 0) <= 2).length,
            wellTagged: prompts.filter(p => p.tags && p.tags.length >= 3).length,
            categorized: prompts.filter(p => p.category && p.category !== 'General').length
        };
    }

    groupByRating(prompts) {
        const groups = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        prompts.forEach(p => {
            const rating = p.rating || 0;
            if (rating >= 1 && rating <= 5) {
                groups[rating.toString()]++;
            }
        });
        return groups;
    }

    groupByLength(prompts) {
        const groups = { short: 0, medium: 0, long: 0 };
        prompts.forEach(p => {
            const length = (p.text || '').length;
            if (length < 100) groups.short++;
            else if (length < 500) groups.medium++;
            else groups.long++;
        });
        return groups;
    }

    groupByRecency(prompts) {
        const now = new Date();
        const groups = { recent: 0, older: 0, old: 0 };
        
        prompts.forEach(p => {
            const created = new Date(p.createdAt || p.created_at || now);
            const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
            
            if (daysDiff <= 7) groups.recent++;
            else if (daysDiff <= 30) groups.older++;
            else groups.old++;
        });
        
        return groups;
    }

    generateBasicSuggestions(insights) {
        const suggestions = [];
        
        if (insights.efficiency < 70) {
            suggestions.push({
                type: 'organization',
                title: 'Improve Organization',
                description: 'Add more categories and tags to your prompts for better organization',
                priority: 'high'
            });
        }
        
        if (insights.averageRating < 3) {
            suggestions.push({
                type: 'quality',
                title: 'Review Prompt Quality',
                description: 'Consider reviewing and rating your prompts to maintain quality',
                priority: 'medium'
            });
        }
        
        if (insights.totalPrompts > 100) {
            suggestions.push({
                type: 'maintenance',
                title: 'Archive Old Prompts',
                description: 'Consider archiving unused prompts to keep your collection focused',
                priority: 'low'
            });
        }
        
        return suggestions;
    }

    getBasicInsights(prompts) {
        return {
            totalPrompts: prompts.length,
            averageRating: this.calculateAverageRating(prompts),
            mostUsedCategories: this.analyzeCategories(prompts),
            suggestions: this.generateBasicSuggestions({ totalPrompts: prompts.length, averageRating: this.calculateAverageRating(prompts), efficiency: 50 }),
            efficiency: this.calculateEfficiencyScore(prompts)
        };
    }

    /**
     * Cache management
     */
    
    getCacheKey(operation, text) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(`${operation}:${text}`).digest('hex');
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        // Clean cache if too large
        if (this.cache.size >= this.cacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('✓ AI cache cleared');
    }

    /**
     * Utility methods
     */
    
    isAIAvailable() {
        return !!this.openaiKey && (!!this.openai || typeof fetch !== 'undefined');
    }

    checkRateLimit() {
        const now = Date.now();
        if (now - this.lastRequestTime > this.rateLimitWindow) {
            this.requestCount = 0;
        }
        return this.requestCount < this.maxRequestsPerWindow;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            cacheSize: this.cache.size,
            requestCount: this.requestCount,
            aiAvailable: this.isAIAvailable(),
            model: this.model,
            batchSize: this.batchSize
        };
    }
}

module.exports = PersonalAIAssistant;