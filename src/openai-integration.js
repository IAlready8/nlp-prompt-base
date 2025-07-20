class OpenAIIntegration {
    constructor(apiKey = '') {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.openai.com/v1';
        this.model = window.config?.openai?.model || 'gpt-3.5-turbo';
        this.maxTokens = window.config?.openai?.maxTokens || 2000;
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
                    max_tokens: 10,
                    temperature: 0.1
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const category = data.choices[0]?.message?.content?.trim();
            
            return categories.includes(category) ? category : this.fallbackCategorization(promptText);
        } catch (error) {
            console.warn('OpenAI categorization failed, using fallback:', error);
            return this.fallbackCategorization(promptText);
        }
    }

    async generateTags(promptText, maxTags = 5) {
        if (!this.apiKey) {
            return this.fallbackTagGeneration(promptText);
        }

        const systemPrompt = `Generate 3-5 relevant tags for the given prompt. Tags should be:
- Single words or short phrases (2-3 words max)
- Lowercase
- Relevant to the content and purpose
- Helpful for searching and organizing

Return only the tags separated by commas, nothing else.`;

        try {
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
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const tagsString = data.choices[0]?.message?.content?.trim();
            
            if (tagsString) {
                return tagsString.split(',')
                    .map(tag => tag.trim().toLowerCase())
                    .filter(tag => tag.length > 0)
                    .slice(0, maxTags);
            }
            
            return this.fallbackTagGeneration(promptText);
        } catch (error) {
            console.warn('OpenAI tag generation failed, using fallback:', error);
            return this.fallbackTagGeneration(promptText);
        }
    }

    async enhancePrompt(promptText) {
        if (!this.apiKey) {
            return { enhanced: promptText, suggestions: [] };
        }

        const systemPrompt = `Analyze this prompt and provide:
1. An enhanced version that's clearer and more effective
2. 3 brief suggestions for improvement

Format your response as JSON:
{
  "enhanced": "enhanced prompt here",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

        try {
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
                    max_tokens: 300,
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content?.trim();
            
            try {
                return JSON.parse(content);
            } catch {
                return { enhanced: promptText, suggestions: [] };
            }
        } catch (error) {
            console.warn('OpenAI enhancement failed:', error);
            return { enhanced: promptText, suggestions: [] };
        }
    }

    fallbackCategorization(text) {
        const keywords = {
            'Code': ['code', 'function', 'variable', 'class', 'programming', 'debug', 'algorithm', 'syntax', 'javascript', 'python', 'html', 'css', 'react', 'api'],
            'Dev': ['development', 'deploy', 'build', 'test', 'git', 'repository', 'framework', 'library', 'tool', 'workflow'],
            'Writing': ['write', 'content', 'article', 'blog', 'copy', 'edit', 'proofread', 'story', 'document', 'email'],
            'Business': ['business', 'marketing', 'sales', 'strategy', 'market', 'customer', 'revenue', 'profit', 'startup', 'company'],
            'Creative': ['creative', 'design', 'art', 'brainstorm', 'idea', 'concept', 'visual', 'aesthetic', 'inspiration'],
            'Analysis': ['analyze', 'data', 'statistics', 'research', 'study', 'evaluate', 'compare', 'metrics', 'insights'],
            'Cognitive': ['think', 'problem', 'solve', 'decision', 'logic', 'reasoning', 'critical', 'mental', 'cognitive'],
            'Research': ['research', 'investigate', 'study', 'academic', 'paper', 'literature', 'survey', 'findings']
        };

        const textLower = text.toLowerCase();
        
        for (const [category, words] of Object.entries(keywords)) {
            if (words.some(word => textLower.includes(word))) {
                return category;
            }
        }
        
        return 'General';
    }

    fallbackTagGeneration(text) {
        const commonTags = ['general', 'question', 'help', 'task', 'request'];
        const textLower = text.toLowerCase();
        const words = textLower.match(/\b\w{3,}\b/g) || [];
        
        const relevantWords = words
            .filter(word => !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'see', 'way', 'who', 'oil', 'sit', 'set', 'run', 'eat'].includes(word))
            .slice(0, 3);

        return relevantWords.length > 0 ? relevantWords : commonTags.slice(0, 2);
    }

    async generateInsights(prompt) {
        if (!this.apiKey) {
            throw new Error('No API key provided');
        }

        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are a data analyst providing insights about prompt usage patterns. Provide clear, actionable insights in 2-3 sentences.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 200,
                    temperature: 0.4
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim();
        } catch (error) {
            console.warn('OpenAI insights generation failed:', error);
            throw error;
        }
    }

    async testConnection() {
        if (!this.apiKey) {
            return { success: false, error: 'No API key provided' };
        }

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

    async enhancePrompt(promptText) {
        if (!this.apiKey) {
            return `Enhanced: ${promptText}`;
        }

        const systemPrompt = `You are a prompt enhancement expert. Improve the given prompt by making it:
- More specific and clear
- Better structured
- More likely to produce high-quality results
- Include relevant context when needed

Return only the enhanced prompt, nothing else.`;

        try {
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
                    max_tokens: 500,
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || `Enhanced: ${promptText}`;
        } catch (error) {
            console.warn('OpenAI enhancement failed:', error);
            return `Enhanced: ${promptText}`;
        }
    }

    async generatePrompt(topic, style = 'professional', length = 'medium') {
        if (!this.apiKey) {
            return `Create a ${style} prompt about ${topic} with ${length} detail.`;
        }

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

        try {
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
                        { role: 'user', content: `Topic: ${topic}, Style: ${style}, Length: ${length}` }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || `Create a ${style} prompt about ${topic} with ${length} detail.`;
        } catch (error) {
            console.warn('OpenAI prompt generation failed:', error);
            return `Create a ${style} prompt about ${topic} with ${length} detail.`;
        }
    }

    async generateCollectionSummary(stats) {
        if (!this.apiKey) {
            return `Your collection contains ${stats.totalPrompts} prompts across ${stats.categories} categories with an average rating of ${stats.avgRating.toFixed(1)} stars.`;
        }

        const systemPrompt = `Analyze the prompt collection statistics and provide an insightful summary. Focus on:
- Overall collection health and diversity
- Trends and patterns
- Recommendations for improvement
- Notable strengths

Keep it concise but informative (2-3 sentences).`;

        try {
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
                        { role: 'user', content: JSON.stringify(stats) }
                    ],
                    max_tokens: 150,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || `Your collection contains ${stats.totalPrompts} prompts across ${stats.categories} categories.`;
        } catch (error) {
            console.warn('OpenAI summary generation failed:', error);
            return `Your collection contains ${stats.totalPrompts} prompts across ${stats.categories} categories with an average rating of ${stats.avgRating.toFixed(1)} stars.`;
        }
    }

    async analyzeEffectiveness(promptData) {
        if (!this.apiKey) {
            return 'Analysis shows effective prompts tend to be specific, well-structured, and provide clear context for the desired outcome.';
        }

        const systemPrompt = `Analyze the provided prompt effectiveness data (high-rated vs low-rated prompts) and provide insights about what makes prompts effective. Focus on:
- Common patterns in high-rated prompts
- Issues with low-rated prompts
- Actionable recommendations

Keep it practical and concise (2-3 sentences).`;

        try {
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
                        { role: 'user', content: JSON.stringify(promptData) }
                    ],
                    max_tokens: 200,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content?.trim() || 'Analysis shows effective prompts tend to be specific, well-structured, and provide clear context.';
        } catch (error) {
            console.warn('OpenAI effectiveness analysis failed:', error);
            return 'Analysis shows effective prompts tend to be specific, well-structured, and provide clear context for the desired outcome.';
        }
    }
}

window.OpenAIIntegration = OpenAIIntegration;