/**
 * OpenAI Integration Module (Backend)
 * Server-side OpenAI API integration for prompt categorization and analysis
 */

const config = require('./config');

class OpenAIIntegration {
    constructor(apiKey = '') {
        this.apiKey = apiKey || config.openai.apiKey;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = config.openai.model || 'gpt-3.5-turbo';
        this.maxTokens = config.openai.maxTokens || 2000;
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
    }

    async categorizePrompt(promptText) {
        if (!this.apiKey) {
            return this.fallbackCategorization(promptText);
        }

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

        try {
            // Use node-fetch or axios for server-side requests
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: promptText }
                    ],
                    max_tokens: 50,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const category = data.choices[0]?.message?.content?.trim() || 'General';
            
            // Validate category
            if (categories.includes(category)) {
                return category;
            }
            
            return this.fallbackCategorization(promptText);
        } catch (error) {
            console.error('OpenAI categorization error:', error.message);
            return this.fallbackCategorization(promptText);
        }
    }

    async generateTags(promptText) {
        if (!this.apiKey) {
            return this.fallbackTagGeneration(promptText);
        }

        const systemPrompt = `Analyze the following prompt and generate 3-5 relevant tags. Tags should be single words or short phrases (max 2 words).
Return only the tags as a comma-separated list, nothing else.

Example: "optimization, algorithms, performance, coding"`;

        try {
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: promptText }
                    ],
                    max_tokens: 100,
                    temperature: 0.5
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const tagsText = data.choices[0]?.message?.content?.trim() || '';
            
            return tagsText
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
                .slice(0, 5);
        } catch (error) {
            console.error('OpenAI tag generation error:', error.message);
            return this.fallbackTagGeneration(promptText);
        }
    }

    fallbackCategorization(promptText) {
        const text = promptText.toLowerCase();
        
        // Simple keyword-based categorization
        const rules = [
            { keywords: ['code', 'function', 'debug', 'algorithm', 'program'], category: 'Code' },
            { keywords: ['write', 'article', 'essay', 'story', 'content'], category: 'Writing' },
            { keywords: ['analyze', 'data', 'statistics', 'metrics'], category: 'Analysis' },
            { keywords: ['research', 'study', 'investigate', 'academic'], category: 'Research' },
            { keywords: ['creative', 'design', 'art', 'imagine', 'brainstorm'], category: 'Creative' },
            { keywords: ['business', 'marketing', 'strategy', 'sales'], category: 'Business' },
            { keywords: ['cognitive', 'thinking', 'decision', 'problem'], category: 'Cognitive' },
            { keywords: ['development', 'workflow', 'process', 'project'], category: 'Dev' },
            { keywords: ['jailbreak', 'bypass', 'override', 'ignore'], category: 'Jailbreak' }
        ];

        for (const rule of rules) {
            if (rule.keywords.some(keyword => text.includes(keyword))) {
                return rule.category;
            }
        }

        return 'General';
    }

    fallbackTagGeneration(promptText) {
        const text = promptText.toLowerCase();
        const commonTags = [
            'productivity', 'automation', 'ai', 'efficiency', 'learning',
            'development', 'analysis', 'writing', 'creative', 'technical'
        ];

        // Simple tag extraction based on keywords
        const extractedTags = commonTags.filter(tag => text.includes(tag));
        
        return extractedTags.length > 0 
            ? extractedTags.slice(0, 5) 
            : ['general', 'prompt'];
    }

    async testConnection() {
        if (!this.apiKey) {
            return { success: false, message: 'No API key configured' };
        }

        try {
            const fetch = (await import('node-fetch')).default;
            
            const response = await fetch(`${this.baseURL}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return { success: true, message: 'OpenAI API connection successful' };
            } else {
                return { success: false, message: `API error: ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = OpenAIIntegration;
