class EnhancedAI {
    constructor(options = {}) {
        this.providers = {
            openai: options.openaiKey ? new OpenAIProvider(options.openaiKey, options.openaiOptions) : null,
            anthropic: options.anthropicKey ? new AnthropicProvider(options.anthropicKey, options.anthropicOptions) : null,
            local: new LocalAIProvider(options.localOptions)
        };
        
        this.defaultProvider = options.defaultProvider || 'openai';
        this.fallbackProvider = options.fallbackProvider || 'local';
        this.enableFallback = options.enableFallback !== false;
        this.logger = options.logger || console;
        
        this.requestHistory = [];
        this.performanceMetrics = new Map();
    }
    
    async categorizePrompt(promptText, options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'categorizePrompt',
                [promptText, options]
            );
            
            this.recordMetrics('categorizePrompt', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('categorizePrompt', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async generateTags(promptText, options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'generateTags',
                [promptText, options]
            );
            
            this.recordMetrics('generateTags', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('generateTags', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async enhancePrompt(promptText, options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'enhancePrompt',
                [promptText, options]
            );
            
            this.recordMetrics('enhancePrompt', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('enhancePrompt', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async generatePrompt(topic, style = 'professional', length = 'medium', options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'generatePrompt',
                [topic, style, length, options]
            );
            
            this.recordMetrics('generatePrompt', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('generatePrompt', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async analyzeCollection(prompts, options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'analyzeCollection',
                [prompts, options]
            );
            
            this.recordMetrics('analyzeCollection', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('analyzeCollection', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async generateRecommendations(userPrompts, allPrompts, options = {}) {
        const provider = options.provider || this.defaultProvider;
        const startTime = Date.now();
        
        try {
            const result = await this.executeWithFallback(
                provider,
                'generateRecommendations',
                [userPrompts, allPrompts, options]
            );
            
            this.recordMetrics('generateRecommendations', provider, Date.now() - startTime, true);
            return result;
        } catch (error) {
            this.recordMetrics('generateRecommendations', provider, Date.now() - startTime, false);
            throw error;
        }
    }
    
    async executeWithFallback(providerName, method, args) {
        // Try primary provider
        if (this.providers[providerName] && this.providers[providerName][method]) {
            try {
                return await this.providers[providerName][method](...args);
            } catch (error) {
                this.logger.warn(`${providerName} provider failed for ${method}`, { error: error.message });
                
                if (!this.enableFallback) {
                    throw error;
                }
            }
        }
        
        // Try fallback provider
        if (this.enableFallback && this.providers[this.fallbackProvider] && this.providers[this.fallbackProvider][method]) {
            this.logger.info(`Using fallback provider ${this.fallbackProvider} for ${method}`);
            return await this.providers[this.fallbackProvider][method](...args);
        }
        
        throw new Error(`No available provider for method ${method}`);
    }
    
    recordMetrics(operation, provider, duration, success) {
        const key = `${operation}_${provider}`;
        
        if (!this.performanceMetrics.has(key)) {
            this.performanceMetrics.set(key, {
                operation,
                provider,
                totalRequests: 0,
                successfulRequests: 0,
                totalDuration: 0,
                averageDuration: 0,
                lastRequest: null
            });
        }
        
        const metrics = this.performanceMetrics.get(key);
        metrics.totalRequests++;
        metrics.totalDuration += duration;
        metrics.averageDuration = metrics.totalDuration / metrics.totalRequests;
        metrics.lastRequest = new Date().toISOString();
        
        if (success) {
            metrics.successfulRequests++;
        }
        
        // Store in history
        this.requestHistory.push({
            operation,
            provider,
            duration,
            success,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 1000 requests
        if (this.requestHistory.length > 1000) {
            this.requestHistory = this.requestHistory.slice(-1000);
        }
    }
    
    getProviderStatus() {
        const status = {};
        
        for (const [name, provider] of Object.entries(this.providers)) {
            if (provider) {
                status[name] = {
                    available: true,
                    connected: provider.isConnected ? provider.isConnected() : true,
                    lastUsed: this.getLastUsedTime(name),
                    metrics: this.getProviderMetrics(name)
                };
            } else {
                status[name] = {
                    available: false,
                    connected: false,
                    reason: 'No API key provided'
                };
            }
        }
        
        return status;
    }
    
    getLastUsedTime(providerName) {
        const recentRequests = this.requestHistory
            .filter(req => req.provider === providerName)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return recentRequests.length > 0 ? recentRequests[0].timestamp : null;
    }
    
    getProviderMetrics(providerName) {
        const providerMetrics = Array.from(this.performanceMetrics.values())
            .filter(m => m.provider === providerName);
        
        if (providerMetrics.length === 0) {
            return null;
        }
        
        return {
            totalRequests: providerMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
            successfulRequests: providerMetrics.reduce((sum, m) => sum + m.successfulRequests, 0),
            averageDuration: providerMetrics.reduce((sum, m) => sum + m.averageDuration, 0) / providerMetrics.length,
            operations: providerMetrics.map(m => ({
                operation: m.operation,
                requests: m.totalRequests,
                successRate: m.successfulRequests / m.totalRequests,
                avgDuration: m.averageDuration
            }))
        };
    }
    
    async testConnections() {
        const results = {};
        
        for (const [name, provider] of Object.entries(this.providers)) {
            if (provider && provider.testConnection) {
                try {
                    results[name] = await provider.testConnection();
                } catch (error) {
                    results[name] = { success: false, error: error.message };
                }
            } else {
                results[name] = { success: false, error: 'Provider not available' };
            }
        }
        
        return results;
    }
    
    getUsageAnalytics() {
        const recentRequests = this.requestHistory.slice(-100);
        const operationCounts = new Map();
        const providerCounts = new Map();
        
        recentRequests.forEach(req => {
            operationCounts.set(req.operation, (operationCounts.get(req.operation) || 0) + 1);
            providerCounts.set(req.provider, (providerCounts.get(req.provider) || 0) + 1);
        });
        
        return {
            totalRequests: this.requestHistory.length,
            recentRequests: recentRequests.length,
            successRate: recentRequests.filter(req => req.success).length / recentRequests.length,
            averageDuration: recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length,
            topOperations: Array.from(operationCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5),
            providerUsage: Array.from(providerCounts.entries())
                .sort((a, b) => b[1] - a[1])
        };
    }
}

class OpenAIProvider {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.baseURL = options.baseURL || 'https://api.openai.com/v1';
        this.model = options.model || 'gpt-3.5-turbo';
        this.maxTokens = options.maxTokens || 2000;
        this.temperature = options.temperature || 0.3;
    }
    
    async categorizePrompt(promptText, options = {}) {
        const categories = [
            'Code', 'Cognitive', 'Jailbreak', 'Dev', 'Writing', 
            'Business', 'General', 'Creative', 'Analysis', 'Research'
        ];

        const systemPrompt = `You are a prompt categorization expert. Analyze the given prompt and categorize it into one of these categories: ${categories.join(', ')}.

Guidelines:
- Code: Programming, debugging, code review, algorithms, technical implementation
- Cognitive: Problem-solving, critical thinking, decision making, mental frameworks
- Jailbreak: Prompts designed to bypass AI limitations or safety measures
- Dev: Development tools, workflows, project management, technical processes
- Writing: Content creation, editing, storytelling, documentation
- Business: Marketing, strategy, operations, finance, management
- General: Everyday questions, basic information, casual conversation
- Creative: Art, design, creative writing, brainstorming, imagination
- Analysis: Data analysis, research, investigation, evaluation
- Research: Academic research, fact-finding, literature reviews, surveys

Respond with only the category name, nothing else.`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptText }
            ],
            max_tokens: 10,
            temperature: 0.1
        });

        const category = response.choices[0]?.message?.content?.trim();
        return categories.includes(category) ? category : 'General';
    }
    
    async generateTags(promptText, options = {}) {
        const maxTags = options.maxTags || 5;
        
        const systemPrompt = `Generate ${maxTags} relevant tags for the given prompt. Tags should be:
- Single words or short phrases (2-3 words max)
- Lowercase
- Relevant to the content and purpose
- Helpful for searching and organizing

Return only the tags separated by commas, nothing else.`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptText }
            ],
            max_tokens: 50,
            temperature: 0.3
        });

        const tagsString = response.choices[0]?.message?.content?.trim();
        if (tagsString) {
            return tagsString.split(',')
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0)
                .slice(0, maxTags);
        }
        
        return [];
    }
    
    async enhancePrompt(promptText, options = {}) {
        const systemPrompt = `You are a prompt enhancement expert. Improve the given prompt by making it:
- More specific and clear
- Better structured
- More likely to produce high-quality results
- Include relevant context when needed

Analyze the prompt and provide:
1. An enhanced version that's clearer and more effective
2. 3 brief suggestions for improvement

Format your response as JSON:
{
  "enhanced": "enhanced prompt here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptText }
            ],
            max_tokens: 300,
            temperature: 0.2
        });

        const content = response.choices[0]?.message?.content?.trim();
        
        try {
            return JSON.parse(content);
        } catch {
            return { enhanced: promptText, suggestions: [] };
        }
    }
    
    async generatePrompt(topic, style, length, options = {}) {
        const systemPrompt = `Generate a high-quality prompt for the given topic, style, and length requirements.

Style guidelines:
- professional: Clear, formal, structured
- creative: Imaginative, inspiring, open-ended
- analytical: Data-driven, logical, methodical
- conversational: Friendly, casual, engaging

Length guidelines:
- short: 1-2 sentences, concise
- medium: 2-4 sentences, detailed
- long: 4+ sentences, comprehensive

Return only the generated prompt.`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Topic: ${topic}, Style: ${style}, Length: ${length}` }
            ],
            max_tokens: 300,
            temperature: 0.7
        });

        return response.choices[0]?.message?.content?.trim() || `Create a ${style} prompt about ${topic} with ${length} detail.`;
    }
    
    async analyzeCollection(prompts, options = {}) {
        const sample = prompts.slice(0, 20); // Analyze a sample for efficiency
        const promptTexts = sample.map(p => p.text).join('\n---\n');
        
        const systemPrompt = `Analyze this collection of prompts and provide insights about:
- Common themes and patterns
- Quality assessment
- Suggestions for improvement
- Missing categories or types

Provide a concise analysis in 3-4 sentences.`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptTexts }
            ],
            max_tokens: 200,
            temperature: 0.3
        });

        return response.choices[0]?.message?.content?.trim();
    }
    
    async generateRecommendations(userPrompts, allPrompts, options = {}) {
        const recentPrompts = userPrompts.slice(-10);
        const promptTexts = recentPrompts.map(p => `${p.category}: ${p.text}`).join('\n');
        
        const systemPrompt = `Based on these recent prompts, recommend 3 new prompt ideas that would be useful. Consider:
- Similar themes but different angles
- Complementary topics
- Next logical steps in workflows

Format as JSON:
{
  "recommendations": [
    {"text": "prompt text", "category": "category", "reason": "why useful"},
    {"text": "prompt text", "category": "category", "reason": "why useful"},
    {"text": "prompt text", "category": "category", "reason": "why useful"}
  ]
}`;

        const response = await this.makeRequest('chat/completions', {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptTexts }
            ],
            max_tokens: 400,
            temperature: 0.5
        });

        const content = response.choices[0]?.message?.content?.trim();
        
        try {
            return JSON.parse(content);
        } catch {
            return { recommendations: [] };
        }
    }
    
    async makeRequest(endpoint, data) {
        const response = await fetch(`${this.baseURL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (response.ok) {
                return { success: true, message: 'OpenAI API connection successful' };
            } else {
                return { success: false, error: `API responded with status ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    isConnected() {
        return !!this.apiKey;
    }
}

class AnthropicProvider {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.baseURL = options.baseURL || 'https://api.anthropic.com/v1';
        this.model = options.model || 'claude-3-sonnet-20240229';
        this.maxTokens = options.maxTokens || 2000;
    }
    
    async categorizePrompt(promptText, options = {}) {
        // Implementation similar to OpenAI but using Anthropic's API
        // This would require the actual Anthropic API integration
        throw new Error('Anthropic provider not fully implemented yet');
    }
    
    async testConnection() {
        return { success: false, error: 'Anthropic provider not fully implemented yet' };
    }
    
    isConnected() {
        return !!this.apiKey;
    }
}

class LocalAIProvider {
    constructor(options = {}) {
        this.options = options;
        this.categories = [
            'Code', 'Cognitive', 'Jailbreak', 'Dev', 'Writing', 
            'Business', 'General', 'Creative', 'Analysis', 'Research'
        ];
    }
    
    async categorizePrompt(promptText, options = {}) {
        const keywords = {
            'Code': ['code', 'function', 'variable', 'class', 'programming', 'debug', 'algorithm', 'syntax'],
            'Dev': ['development', 'deploy', 'build', 'test', 'git', 'repository', 'framework'],
            'Writing': ['write', 'content', 'article', 'blog', 'copy', 'edit', 'document'],
            'Business': ['business', 'marketing', 'sales', 'strategy', 'market', 'customer'],
            'Creative': ['creative', 'design', 'art', 'brainstorm', 'idea', 'concept'],
            'Analysis': ['analyze', 'data', 'statistics', 'research', 'study', 'evaluate'],
            'Cognitive': ['think', 'problem', 'solve', 'decision', 'logic', 'reasoning'],
            'Research': ['research', 'investigate', 'study', 'academic', 'paper']
        };

        const textLower = promptText.toLowerCase();
        
        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => textLower.includes(word))) {
                return category;
            }
        }
        
        return 'General';
    }
    
    async generateTags(promptText, options = {}) {
        const maxTags = options.maxTags || 5;
        const commonTags = ['general', 'question', 'help', 'task', 'request'];
        const textLower = promptText.toLowerCase();
        const words = textLower.match(/\b\w{3,}\b/g) || [];
        
        const relevantWords = words
            .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can'].includes(word))
            .slice(0, 3);

        return relevantWords.length > 0 ? relevantWords : commonTags.slice(0, maxTags);
    }
    
    async enhancePrompt(promptText, options = {}) {
        // Simple enhancement by adding structure
        const enhanced = `Please ${promptText.toLowerCase().startsWith('please') ? promptText.substring(7) : promptText}. Provide a detailed and comprehensive response.`;
        
        return {
            enhanced,
            suggestions: [
                'Add specific context or examples',
                'Specify the desired output format',
                'Include any constraints or requirements'
            ]
        };
    }
    
    async generatePrompt(topic, style, length, options = {}) {
        const starters = {
            professional: 'Analyze and provide a comprehensive overview of',
            creative: 'Imagine and describe in vivid detail',
            analytical: 'Examine the data and patterns related to',
            conversational: 'Let\'s discuss and explore'
        };
        
        const starter = starters[style] || starters.professional;
        return `${starter} ${topic}. ${length === 'long' ? 'Please include detailed examples, context, and implications.' : length === 'short' ? 'Keep it concise and focused.' : 'Provide a balanced level of detail.'}`;
    }
    
    async analyzeCollection(prompts, options = {}) {
        const categories = {};
        prompts.forEach(prompt => {
            categories[prompt.category] = (categories[prompt.category] || 0) + 1;
        });
        
        const totalPrompts = prompts.length;
        const avgRating = prompts.reduce((sum, p) => sum + (p.rating || 0), 0) / totalPrompts;
        
        return `Collection contains ${totalPrompts} prompts across ${Object.keys(categories).length} categories. Average rating is ${avgRating.toFixed(1)}. Most common category is ${Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'}.`;
    }
    
    async generateRecommendations(userPrompts, allPrompts, options = {}) {
        const recentCategories = userPrompts.slice(-5).map(p => p.category);
        const recommendations = [];
        
        // Simple recommendation based on categories
        recentCategories.forEach(category => {
            if (category === 'Code') {
                recommendations.push({
                    text: 'Help me debug a complex algorithm step by step',
                    category: 'Code',
                    reason: 'Based on your coding prompts'
                });
            } else if (category === 'Writing') {
                recommendations.push({
                    text: 'Edit and improve this draft for clarity and impact',
                    category: 'Writing',
                    reason: 'Complements your writing workflow'
                });
            }
        });
        
        return { recommendations: recommendations.slice(0, 3) };
    }
    
    async testConnection() {
        return { success: true, message: 'Local AI provider is always available' };
    }
    
    isConnected() {
        return true;
    }
}

module.exports = { EnhancedAI, OpenAIProvider, AnthropicProvider, LocalAIProvider };