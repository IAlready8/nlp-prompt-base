class SemanticSearch {
    constructor(options = {}) {
        this.options = {
            apiKey: options.apiKey || '',
            model: options.model || 'text-embedding-ada-002',
            similarityThreshold: options.similarityThreshold || 0.7,
            maxResults: options.maxResults || 10,
            enableCaching: options.enableCaching !== false,
            ...options
        };
        
        this.embeddings = new Map(); // Cache for embeddings
        this.searchHistory = [];
        this.logger = options.logger || console;
    }
    
    async generateEmbedding(text) {
        if (!this.options.apiKey) {
            // Fallback to simple text similarity
            return this.generateSimpleEmbedding(text);
        }
        
        // Check cache first
        const cacheKey = this.hashString(text);
        if (this.options.enableCaching && this.embeddings.has(cacheKey)) {
            return this.embeddings.get(cacheKey);
        }
        
        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.options.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: text,
                    model: this.options.model
                })
            });
            
            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }
            
            const data = await response.json();
            const embedding = data.data[0].embedding;
            
            // Cache the embedding
            if (this.options.enableCaching) {
                this.embeddings.set(cacheKey, embedding);
            }
            
            return embedding;
        } catch (error) {
            this.logger.warn('Failed to generate OpenAI embedding, using fallback', { error: error.message });
            return this.generateSimpleEmbedding(text);
        }
    }
    
    generateSimpleEmbedding(text) {
        // Simple bag-of-words embedding for fallback
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
        
        const vocabulary = this.getCommonWords();
        const embedding = new Array(vocabulary.length).fill(0);
        
        words.forEach(word => {
            const index = vocabulary.indexOf(word);
            if (index !== -1) {
                embedding[index] += 1;
            }
        });
        
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            return embedding.map(val => val / magnitude);
        }
        
        return embedding;
    }
    
    getCommonWords() {
        return [
            'code', 'function', 'variable', 'class', 'method', 'algorithm', 'data', 'structure',
            'programming', 'development', 'software', 'application', 'system', 'design',
            'problem', 'solution', 'analysis', 'research', 'study', 'investigate',
            'create', 'generate', 'build', 'develop', 'implement', 'optimize',
            'write', 'content', 'article', 'document', 'text', 'information',
            'business', 'strategy', 'marketing', 'management', 'process', 'workflow',
            'creative', 'design', 'art', 'visual', 'aesthetic', 'inspiration',
            'help', 'assist', 'support', 'guide', 'tutorial', 'explanation',
            'question', 'answer', 'response', 'discussion', 'conversation',
            'technology', 'tool', 'framework', 'library', 'platform', 'service',
            'user', 'customer', 'client', 'audience', 'stakeholder', 'community',
            'project', 'task', 'goal', 'objective', 'requirement', 'specification',
            'test', 'validate', 'verify', 'check', 'review', 'evaluate',
            'improve', 'enhance', 'upgrade', 'optimize', 'refactor', 'modify',
            'learn', 'understand', 'knowledge', 'skill', 'expertise', 'experience'
        ];
    }
    
    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        if (normA === 0 || normB === 0) {
            return 0;
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    async search(query, prompts, options = {}) {
        const searchOptions = { ...this.options, ...options };
        
        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);
            
            // Calculate similarities for all prompts
            const similarities = [];
            
            for (const prompt of prompts) {
                const promptText = `${prompt.text} ${prompt.notes || ''} ${prompt.tags?.join(' ') || ''}`;
                const promptEmbedding = await this.generateEmbedding(promptText);
                const similarity = this.cosineSimilarity(queryEmbedding, promptEmbedding);
                
                if (similarity >= searchOptions.similarityThreshold) {
                    similarities.push({
                        prompt,
                        similarity,
                        score: this.calculateRelevanceScore(prompt, query, similarity)
                    });
                }
            }
            
            // Sort by relevance score (combination of similarity and other factors)
            similarities.sort((a, b) => b.score - a.score);
            
            // Return top results
            const results = similarities
                .slice(0, searchOptions.maxResults)
                .map(item => ({
                    ...item.prompt,
                    _similarity: item.similarity,
                    _score: item.score,
                    _matchReason: this.getMatchReason(item.prompt, query)
                }));
            
            // Store search in history
            this.addToSearchHistory(query, results.length);
            
            return {
                query,
                results,
                totalFound: similarities.length,
                searchTime: Date.now(),
                method: this.options.apiKey ? 'semantic' : 'keyword'
            };
            
        } catch (error) {
            this.logger.error('Semantic search failed', { error: error.message, query });
            throw error;
        }
    }
    
    calculateRelevanceScore(prompt, query, similarity) {
        let score = similarity;
        
        // Boost score based on various factors
        const queryLower = query.toLowerCase();
        const promptText = prompt.text.toLowerCase();
        const promptTags = prompt.tags?.map(tag => tag.toLowerCase()) || [];
        
        // Exact phrase matches get a boost
        if (promptText.includes(queryLower)) {
            score += 0.2;
        }
        
        // Tag matches get a boost
        const queryWords = queryLower.split(/\s+/);
        queryWords.forEach(word => {
            if (promptTags.some(tag => tag.includes(word))) {
                score += 0.1;
            }
        });
        
        // Recent prompts get a slight boost
        if (prompt.updatedAt) {
            const daysSinceUpdate = (Date.now() - new Date(prompt.updatedAt)) / (1000 * 60 * 60 * 24);
            if (daysSinceUpdate < 30) {
                score += 0.05;
            }
        }
        
        // Higher rated prompts get a boost
        if (prompt.rating) {
            score += (prompt.rating / 5) * 0.1;
        }
        
        // Frequently used prompts get a boost
        if (prompt.usage_count) {
            score += Math.min(prompt.usage_count / 100, 0.1);
        }
        
        return Math.min(score, 1.0); // Cap at 1.0
    }
    
    getMatchReason(prompt, query) {
        const reasons = [];
        const queryLower = query.toLowerCase();
        const promptText = prompt.text.toLowerCase();
        
        if (promptText.includes(queryLower)) {
            reasons.push('Exact text match');
        }
        
        if (prompt.tags?.some(tag => tag.toLowerCase().includes(queryLower))) {
            reasons.push('Tag match');
        }
        
        if (prompt.category.toLowerCase().includes(queryLower)) {
            reasons.push('Category match');
        }
        
        if (reasons.length === 0) {
            reasons.push('Semantic similarity');
        }
        
        return reasons.join(', ');
    }
    
    addToSearchHistory(query, resultCount) {
        this.searchHistory.push({
            query,
            resultCount,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 100 searches
        if (this.searchHistory.length > 100) {
            this.searchHistory = this.searchHistory.slice(-100);
        }
    }
    
    getSearchSuggestions(query, prompts) {
        const suggestions = new Set();
        const queryWords = query.toLowerCase().split(/\s+/);
        
        // Suggest based on tags
        prompts.forEach(prompt => {
            prompt.tags?.forEach(tag => {
                if (tag.toLowerCase().includes(query.toLowerCase()) && tag !== query) {
                    suggestions.add(tag);
                }
            });
        });
        
        // Suggest based on categories
        const categories = [...new Set(prompts.map(p => p.category))];
        categories.forEach(category => {
            if (category.toLowerCase().includes(query.toLowerCase()) && category !== query) {
                suggestions.add(category);
            }
        });
        
        // Suggest based on common phrases in prompts
        const commonPhrases = this.extractCommonPhrases(prompts);
        commonPhrases.forEach(phrase => {
            if (phrase.toLowerCase().includes(query.toLowerCase()) && phrase !== query) {
                suggestions.add(phrase);
            }
        });
        
        return Array.from(suggestions).slice(0, 10);
    }
    
    extractCommonPhrases(prompts) {
        const phrases = new Map();
        
        prompts.forEach(prompt => {
            const words = prompt.text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/);
            
            // Extract 2-3 word phrases
            for (let i = 0; i < words.length - 1; i++) {
                const phrase2 = `${words[i]} ${words[i + 1]}`;
                phrases.set(phrase2, (phrases.get(phrase2) || 0) + 1);
                
                if (i < words.length - 2) {
                    const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
                    phrases.set(phrase3, (phrases.get(phrase3) || 0) + 1);
                }
            }
        });
        
        // Return phrases that appear more than once
        return Array.from(phrases.entries())
            .filter(([phrase, count]) => count > 1 && phrase.length > 5)
            .sort((a, b) => b[1] - a[1])
            .map(([phrase]) => phrase)
            .slice(0, 20);
    }
    
    async findSimilarPrompts(targetPrompt, allPrompts, limit = 5) {
        const targetText = `${targetPrompt.text} ${targetPrompt.notes || ''} ${targetPrompt.tags?.join(' ') || ''}`;
        const targetEmbedding = await this.generateEmbedding(targetText);
        
        const similarities = [];
        
        for (const prompt of allPrompts) {
            if (prompt.id === targetPrompt.id) continue; // Skip the target prompt itself
            
            const promptText = `${prompt.text} ${prompt.notes || ''} ${prompt.tags?.join(' ') || ''}`;
            const promptEmbedding = await this.generateEmbedding(promptText);
            const similarity = this.cosineSimilarity(targetEmbedding, promptEmbedding);
            
            if (similarity > 0.3) { // Lower threshold for similar prompts
                similarities.push({ prompt, similarity });
            }
        }
        
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(item => ({ ...item.prompt, _similarity: item.similarity }));
    }
    
    getSearchAnalytics() {
        const recentSearches = this.searchHistory.slice(-50);
        const queryFrequency = new Map();
        
        recentSearches.forEach(search => {
            const query = search.query.toLowerCase();
            queryFrequency.set(query, (queryFrequency.get(query) || 0) + 1);
        });
        
        return {
            totalSearches: this.searchHistory.length,
            recentSearches: recentSearches.length,
            topQueries: Array.from(queryFrequency.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10),
            averageResults: recentSearches.reduce((sum, search) => sum + search.resultCount, 0) / recentSearches.length || 0,
            cacheHitRate: this.embeddings.size / Math.max(this.searchHistory.length, 1)
        };
    }
    
    hashString(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString();
    }
    
    clearCache() {
        this.embeddings.clear();
    }
    
    exportEmbeddings() {
        return Array.from(this.embeddings.entries());
    }
    
    importEmbeddings(embeddings) {
        this.embeddings.clear();
        embeddings.forEach(([key, value]) => {
            this.embeddings.set(key, value);
        });
    }
}

module.exports = SemanticSearch;