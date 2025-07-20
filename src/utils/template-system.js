class PromptTemplateSystem {
    constructor(options = {}) {
        this.options = {
            enableCustomTemplates: options.enableCustomTemplates !== false,
            maxTemplates: options.maxTemplates || 100,
            enableVersioning: options.enableVersioning !== false,
            ...options
        };
        
        this.templates = new Map();
        this.templateCategories = new Map();
        this.templateUsage = new Map();
        this.logger = options.logger || console;
        
        this.initializeBuiltInTemplates();
    }
    
    initializeBuiltInTemplates() {
        const builtInTemplates = [
            {
                id: 'code_review',
                name: 'Code Review Assistant',
                category: 'Code',
                description: 'Template for reviewing code quality, security, and best practices',
                template: `Please review the following {{language}} code for:
- Code quality and readability
- Security vulnerabilities
- Performance optimizations
- Best practices adherence
- Potential bugs or issues

Code to review:
{{code}}

{{#if specificFocus}}
Please pay special attention to: {{specificFocus}}
{{/if}}

Provide detailed feedback with specific suggestions for improvement.`,
                variables: [
                    { name: 'language', type: 'select', options: ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'Other'], required: true },
                    { name: 'code', type: 'textarea', required: true, placeholder: 'Paste your code here...' },
                    { name: 'specificFocus', type: 'text', required: false, placeholder: 'e.g., security, performance' }
                ],
                tags: ['code', 'review', 'quality', 'debugging'],
                difficulty: 'intermediate',
                estimatedTime: '5-10 minutes',
                version: '1.0'
            },
            {
                id: 'blog_writer',
                name: 'Blog Post Writer',
                category: 'Writing',
                description: 'Template for creating engaging blog posts with proper structure',
                template: `Write a {{length}} blog post about "{{topic}}" for {{audience}}.

Structure:
- Compelling headline
- Engaging introduction with a hook
- {{sections}} main sections with subheadings
- Practical examples or case studies
- Actionable takeaways
- Strong conclusion with call-to-action

{{#if tone}}
Tone: {{tone}}
{{/if}}

{{#if keywords}}
Include these keywords naturally: {{keywords}}
{{/if}}

{{#if goals}}
Goals: {{goals}}
{{/if}}

Make it engaging, informative, and valuable for the reader.`,
                variables: [
                    { name: 'topic', type: 'text', required: true, placeholder: 'Main topic of the blog post' },
                    { name: 'audience', type: 'select', options: ['general readers', 'professionals', 'beginners', 'experts', 'entrepreneurs'], required: true },
                    { name: 'length', type: 'select', options: ['short (500-800 words)', 'medium (800-1500 words)', 'long (1500+ words)'], required: true },
                    { name: 'sections', type: 'number', min: 3, max: 10, default: 5, required: true },
                    { name: 'tone', type: 'select', options: ['professional', 'casual', 'conversational', 'authoritative', 'friendly'], required: false },
                    { name: 'keywords', type: 'text', required: false, placeholder: 'Comma-separated keywords' },
                    { name: 'goals', type: 'text', required: false, placeholder: 'What should the post achieve?' }
                ],
                tags: ['writing', 'blog', 'content', 'marketing'],
                difficulty: 'beginner',
                estimatedTime: '10-15 minutes',
                version: '1.0'
            },
            {
                id: 'business_strategy',
                name: 'Business Strategy Analyzer',
                category: 'Business',
                description: 'Template for analyzing business strategies and market opportunities',
                template: `Analyze the business strategy for {{businessType}} in the {{industry}} industry.

Company/Product: {{companyName}}
{{#if currentSituation}}
Current Situation: {{currentSituation}}
{{/if}}

Please provide analysis on:
1. Market Position & Competitive Landscape
2. SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
3. Target Audience & Customer Segments
4. Revenue Model & Monetization Strategy
5. Growth Opportunities & Expansion Plans
6. Risk Assessment & Mitigation Strategies

{{#if specificFocus}}
Focus Areas: {{specificFocus}}
{{/if}}

{{#if timeframe}}
Time Frame: {{timeframe}}
{{/if}}

Provide actionable recommendations with prioritized next steps.`,
                variables: [
                    { name: 'businessType', type: 'select', options: ['startup', 'small business', 'mid-size company', 'enterprise', 'non-profit'], required: true },
                    { name: 'industry', type: 'text', required: true, placeholder: 'e.g., technology, healthcare, retail' },
                    { name: 'companyName', type: 'text', required: true, placeholder: 'Company or product name' },
                    { name: 'currentSituation', type: 'textarea', required: false, placeholder: 'Brief description of current business situation' },
                    { name: 'specificFocus', type: 'text', required: false, placeholder: 'e.g., international expansion, digital transformation' },
                    { name: 'timeframe', type: 'select', options: ['3 months', '6 months', '1 year', '2-3 years', '5+ years'], required: false }
                ],
                tags: ['business', 'strategy', 'analysis', 'planning'],
                difficulty: 'advanced',
                estimatedTime: '15-20 minutes',
                version: '1.0'
            },
            {
                id: 'creative_brainstorm',
                name: 'Creative Brainstorming',
                category: 'Creative',
                description: 'Template for generating creative ideas and solutions',
                template: `Help me brainstorm {{ideaCount}} creative {{ideaType}} for {{project}}.

{{#if constraints}}
Constraints/Requirements: {{constraints}}
{{/if}}

{{#if audience}}
Target Audience: {{audience}}
{{/if}}

{{#if inspiration}}
Inspiration/Style: {{inspiration}}
{{/if}}

For each idea, provide:
- Brief description
- Why it's unique/compelling
- How it could be executed
- Potential challenges

{{#if brainstormingMethod}}
Use {{brainstormingMethod}} brainstorming approach.
{{/if}}

Think outside the box and be innovative!`,
                variables: [
                    { name: 'ideaType', type: 'select', options: ['concepts', 'solutions', 'designs', 'campaigns', 'features', 'products'], required: true },
                    { name: 'project', type: 'text', required: true, placeholder: 'What project are you brainstorming for?' },
                    { name: 'ideaCount', type: 'number', min: 3, max: 20, default: 10, required: true },
                    { name: 'constraints', type: 'textarea', required: false, placeholder: 'Budget, timeline, technical limitations, etc.' },
                    { name: 'audience', type: 'text', required: false, placeholder: 'Who is this for?' },
                    { name: 'inspiration', type: 'text', required: false, placeholder: 'Any specific style or inspiration?' },
                    { name: 'brainstormingMethod', type: 'select', options: ['mind mapping', 'SCAMPER', 'six thinking hats', 'reverse brainstorming', 'brainwriting'], required: false }
                ],
                tags: ['creative', 'brainstorming', 'ideas', 'innovation'],
                difficulty: 'beginner',
                estimatedTime: '5-15 minutes',
                version: '1.0'
            },
            {
                id: 'research_assistant',
                name: 'Research Assistant',
                category: 'Research',
                description: 'Template for conducting thorough research on any topic',
                template: `Conduct comprehensive research on "{{topic}}" for {{purpose}}.

{{#if audience}}
Target Audience: {{audience}}
{{/if}}

Please provide:
1. Overview & Background
2. Key Facts & Statistics
3. Current Trends & Developments
4. Major Players/Stakeholders
5. Challenges & Opportunities
6. Expert Opinions & Quotes
7. Relevant Case Studies
8. Future Outlook & Predictions

{{#if specificQuestions}}
Specific Questions to Address:
{{specificQuestions}}
{{/if}}

{{#if sources}}
Preferred Sources: {{sources}}
{{/if}}

{{#if depth}}
Research Depth: {{depth}}
{{/if}}

Include credible sources and cite key information where relevant.`,
                variables: [
                    { name: 'topic', type: 'text', required: true, placeholder: 'Research topic or question' },
                    { name: 'purpose', type: 'select', options: ['academic paper', 'business report', 'personal knowledge', 'presentation', 'decision making'], required: true },
                    { name: 'audience', type: 'text', required: false, placeholder: 'Who will read this research?' },
                    { name: 'specificQuestions', type: 'textarea', required: false, placeholder: 'Specific questions you want answered' },
                    { name: 'sources', type: 'text', required: false, placeholder: 'Academic, industry reports, news, etc.' },
                    { name: 'depth', type: 'select', options: ['surface overview', 'moderate depth', 'comprehensive analysis'], required: false }
                ],
                tags: ['research', 'analysis', 'information', 'investigation'],
                difficulty: 'intermediate',
                estimatedTime: '10-20 minutes',
                version: '1.0'
            },
            {
                id: 'learning_plan',
                name: 'Learning Plan Creator',
                category: 'Cognitive',
                description: 'Template for creating structured learning plans for any skill or topic',
                template: `Create a comprehensive learning plan for {{skill}} suitable for {{skillLevel}} level.

{{#if timeframe}}
Time Frame: {{timeframe}}
{{/if}}

{{#if goals}}
Learning Goals: {{goals}}
{{/if}}

{{#if learningStyle}}
Learning Style: {{learningStyle}}
{{/if}}

Please include:
1. Prerequisites & Foundation Knowledge
2. Structured Learning Path (modules/phases)
3. Recommended Resources (books, courses, tutorials)
4. Practical Projects & Exercises
5. Assessment & Progress Tracking Methods
6. Common Pitfalls & How to Avoid Them
7. Community & Support Resources
8. Timeline with Milestones

{{#if budget}}
Budget Constraints: {{budget}}
{{/if}}

Make it actionable with specific next steps and measurable outcomes.`,
                variables: [
                    { name: 'skill', type: 'text', required: true, placeholder: 'What skill or topic to learn?' },
                    { name: 'skillLevel', type: 'select', options: ['complete beginner', 'some experience', 'intermediate', 'looking to advance'], required: true },
                    { name: 'timeframe', type: 'select', options: ['1 month', '3 months', '6 months', '1 year', 'flexible timeline'], required: false },
                    { name: 'goals', type: 'textarea', required: false, placeholder: 'What do you want to achieve?' },
                    { name: 'learningStyle', type: 'select', options: ['visual', 'auditory', 'kinesthetic', 'reading/writing', 'mixed'], required: false },
                    { name: 'budget', type: 'select', options: ['free resources only', 'minimal budget ($1-50)', 'moderate budget ($50-200)', 'no budget constraints'], required: false }
                ],
                tags: ['learning', 'education', 'planning', 'skills'],
                difficulty: 'intermediate',
                estimatedTime: '10-15 minutes',
                version: '1.0'
            }
        ];
        
        builtInTemplates.forEach(template => {
            this.templates.set(template.id, {
                ...template,
                isBuiltIn: true,
                createdAt: new Date().toISOString(),
                usageCount: 0
            });
            
            if (!this.templateCategories.has(template.category)) {
                this.templateCategories.set(template.category, []);
            }
            this.templateCategories.get(template.category).push(template.id);
        });
    }
    
    getTemplate(templateId) {
        return this.templates.get(templateId) || null;
    }
    
    getAllTemplates(options = {}) {
        const { category, difficulty, tags } = options;
        let templates = Array.from(this.templates.values());
        
        if (category) {
            templates = templates.filter(t => t.category === category);
        }
        
        if (difficulty) {
            templates = templates.filter(t => t.difficulty === difficulty);
        }
        
        if (tags && tags.length > 0) {
            templates = templates.filter(t => 
                tags.some(tag => t.tags.includes(tag))
            );
        }
        
        return templates.sort((a, b) => b.usageCount - a.usageCount);
    }
    
    getTemplatesByCategory() {
        const result = {};
        
        for (const [category, templateIds] of this.templateCategories.entries()) {
            result[category] = templateIds.map(id => this.templates.get(id));
        }
        
        return result;
    }
    
    generatePromptFromTemplate(templateId, variables) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        
        // Validate required variables
        const requiredVars = template.variables.filter(v => v.required);
        for (const variable of requiredVars) {
            if (!variables.hasOwnProperty(variable.name) || variables[variable.name] === '') {
                throw new Error(`Required variable '${variable.name}' is missing`);
            }
        }
        
        // Validate variable types and constraints
        for (const variable of template.variables) {
            const value = variables[variable.name];
            if (value !== undefined && value !== '') {
                this.validateVariable(variable, value);
            }
        }
        
        // Generate the prompt using Handlebars-like syntax
        let prompt = template.template;
        
        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            if (value !== undefined && value !== '') {
                prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
        }
        
        // Handle conditional blocks
        prompt = this.processConditionals(prompt, variables);
        
        // Clean up any remaining template syntax
        prompt = this.cleanupTemplate(prompt);
        
        // Track usage
        this.trackTemplateUsage(templateId);
        
        return {
            prompt: prompt.trim(),
            templateUsed: template.name,
            templateId: templateId,
            variables: variables,
            generatedAt: new Date().toISOString()
        };
    }
    
    validateVariable(variable, value) {
        switch (variable.type) {
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    throw new Error(`Variable '${variable.name}' must be a number`);
                }
                if (variable.min !== undefined && num < variable.min) {
                    throw new Error(`Variable '${variable.name}' must be at least ${variable.min}`);
                }
                if (variable.max !== undefined && num > variable.max) {
                    throw new Error(`Variable '${variable.name}' must be at most ${variable.max}`);
                }
                break;
                
            case 'select':
                if (variable.options && !variable.options.includes(value)) {
                    throw new Error(`Variable '${variable.name}' must be one of: ${variable.options.join(', ')}`);
                }
                break;
                
            case 'text':
                if (variable.maxLength && value.length > variable.maxLength) {
                    throw new Error(`Variable '${variable.name}' must be ${variable.maxLength} characters or less`);
                }
                break;
                
            case 'textarea':
                if (variable.maxLength && value.length > variable.maxLength) {
                    throw new Error(`Variable '${variable.name}' must be ${variable.maxLength} characters or less`);
                }
                break;
        }
    }
    
    processConditionals(template, variables) {
        // Handle {{#if variable}} blocks
        const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
        
        return template.replace(ifRegex, (match, variableName, content) => {
            const value = variables[variableName];
            return (value && value !== '') ? content : '';
        });
    }
    
    cleanupTemplate(template) {
        // Remove any remaining template syntax
        return template
            .replace(/{{[^}]+}}/g, '') // Remove unreplaced variables
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
            .trim();
    }
    
    trackTemplateUsage(templateId) {
        const template = this.templates.get(templateId);
        if (template) {
            template.usageCount = (template.usageCount || 0) + 1;
            template.lastUsed = new Date().toISOString();
            
            // Update usage statistics
            if (!this.templateUsage.has(templateId)) {
                this.templateUsage.set(templateId, {
                    count: 0,
                    firstUsed: new Date().toISOString(),
                    recentUsages: []
                });
            }
            
            const usage = this.templateUsage.get(templateId);
            usage.count++;
            usage.recentUsages.push(new Date().toISOString());
            
            // Keep only recent usages (last 100)
            if (usage.recentUsages.length > 100) {
                usage.recentUsages = usage.recentUsages.slice(-100);
            }
        }
    }
    
    createCustomTemplate(templateData) {
        if (!this.options.enableCustomTemplates) {
            throw new Error('Custom templates are disabled');
        }
        
        if (this.templates.size >= this.options.maxTemplates) {
            throw new Error(`Maximum number of templates (${this.options.maxTemplates}) reached`);
        }
        
        // Validate template data
        this.validateTemplateData(templateData);
        
        const templateId = this.generateTemplateId(templateData.name);
        const template = {
            id: templateId,
            ...templateData,
            isBuiltIn: false,
            createdAt: new Date().toISOString(),
            usageCount: 0,
            version: '1.0'
        };
        
        this.templates.set(templateId, template);
        
        // Update category mapping
        if (!this.templateCategories.has(template.category)) {
            this.templateCategories.set(template.category, []);
        }
        this.templateCategories.get(template.category).push(templateId);
        
        return templateId;
    }
    
    updateTemplate(templateId, updates) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        
        if (template.isBuiltIn) {
            throw new Error('Cannot modify built-in templates');
        }
        
        // Create new version if versioning is enabled
        if (this.options.enableVersioning) {
            const versionNumber = parseFloat(template.version) + 0.1;
            updates.version = versionNumber.toFixed(1);
        }
        
        updates.updatedAt = new Date().toISOString();
        
        Object.assign(template, updates);
        return template;
    }
    
    deleteTemplate(templateId) {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        
        if (template.isBuiltIn) {
            throw new Error('Cannot delete built-in templates');
        }
        
        this.templates.delete(templateId);
        
        // Remove from category mapping
        for (const [category, templateIds] of this.templateCategories.entries()) {
            const index = templateIds.indexOf(templateId);
            if (index !== -1) {
                templateIds.splice(index, 1);
                if (templateIds.length === 0) {
                    this.templateCategories.delete(category);
                }
                break;
            }
        }
        
        // Remove usage data
        this.templateUsage.delete(templateId);
        
        return true;
    }
    
    validateTemplateData(data) {
        const required = ['name', 'category', 'description', 'template', 'variables', 'tags'];
        
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Template field '${field}' is required`);
            }
        }
        
        if (!Array.isArray(data.variables)) {
            throw new Error('Variables must be an array');
        }
        
        if (!Array.isArray(data.tags)) {
            throw new Error('Tags must be an array');
        }
        
        // Validate variables
        for (const variable of data.variables) {
            if (!variable.name || !variable.type) {
                throw new Error('Each variable must have a name and type');
            }
            
            const validTypes = ['text', 'textarea', 'number', 'select', 'checkbox'];
            if (!validTypes.includes(variable.type)) {
                throw new Error(`Invalid variable type: ${variable.type}`);
            }
            
            if (variable.type === 'select' && !variable.options) {
                throw new Error('Select variables must have options');
            }
        }
        
        // Check for template syntax validity
        const variableNames = data.variables.map(v => v.name);
        const templateVars = this.extractTemplateVariables(data.template);
        
        for (const templateVar of templateVars) {
            if (!variableNames.includes(templateVar)) {
                throw new Error(`Template uses undefined variable: ${templateVar}`);
            }
        }
    }
    
    extractTemplateVariables(template) {
        const variableRegex = /{{(\w+)}}/g;
        const variables = [];
        let match;
        
        while ((match = variableRegex.exec(template)) !== null) {
            variables.push(match[1]);
        }
        
        return [...new Set(variables)]; // Remove duplicates
    }
    
    generateTemplateId(name) {
        const base = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        
        let id = base;
        let counter = 1;
        
        while (this.templates.has(id)) {
            id = `${base}_${counter}`;
            counter++;
        }
        
        return id;
    }
    
    getTemplateStatistics() {
        const stats = {
            totalTemplates: this.templates.size,
            builtInTemplates: 0,
            customTemplates: 0,
            categoriesUsed: this.templateCategories.size,
            totalUsage: 0,
            mostUsedTemplates: [],
            recentTemplates: [],
            categoryDistribution: {}
        };
        
        const templates = Array.from(this.templates.values());
        
        templates.forEach(template => {
            if (template.isBuiltIn) {
                stats.builtInTemplates++;
            } else {
                stats.customTemplates++;
            }
            
            stats.totalUsage += template.usageCount || 0;
            
            if (!stats.categoryDistribution[template.category]) {
                stats.categoryDistribution[template.category] = 0;
            }
            stats.categoryDistribution[template.category]++;
        });
        
        stats.mostUsedTemplates = templates
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                name: t.name,
                usageCount: t.usageCount || 0
            }));
        
        stats.recentTemplates = templates
            .filter(t => !t.isBuiltIn)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                name: t.name,
                createdAt: t.createdAt
            }));
        
        return stats;
    }
    
    searchTemplates(query, options = {}) {
        const templates = Array.from(this.templates.values());
        const queryLower = query.toLowerCase();
        
        const matches = templates.filter(template => {
            const nameMatch = template.name.toLowerCase().includes(queryLower);
            const descMatch = template.description.toLowerCase().includes(queryLower);
            const tagMatch = template.tags.some(tag => tag.toLowerCase().includes(queryLower));
            const categoryMatch = template.category.toLowerCase().includes(queryLower);
            
            return nameMatch || descMatch || tagMatch || categoryMatch;
        });
        
        // Sort by relevance (name matches first, then description, then tags)
        return matches.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(queryLower);
            const bNameMatch = b.name.toLowerCase().includes(queryLower);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            return (b.usageCount || 0) - (a.usageCount || 0);
        });
    }
    
    exportTemplates(includeUsage = false) {
        const templates = Array.from(this.templates.values());
        
        if (!includeUsage) {
            return templates.map(t => {
                const { usageCount, lastUsed, ...exportData } = t;
                return exportData;
            });
        }
        
        return {
            templates: templates,
            usage: Array.from(this.templateUsage.entries()),
            exportedAt: new Date().toISOString()
        };
    }
    
    importTemplates(data) {
        const imported = { success: 0, failed: 0, errors: [] };
        
        const templates = Array.isArray(data) ? data : data.templates || [];
        
        templates.forEach((template, index) => {
            try {
                if (!template.isBuiltIn) { // Don't import built-in templates
                    this.validateTemplateData(template);
                    
                    // Generate new ID if conflict exists
                    let id = template.id;
                    if (this.templates.has(id)) {
                        id = this.generateTemplateId(template.name);
                    }
                    
                    this.templates.set(id, {
                        ...template,
                        id: id,
                        importedAt: new Date().toISOString()
                    });
                    
                    imported.success++;
                }
            } catch (error) {
                imported.failed++;
                imported.errors.push(`Template ${index}: ${error.message}`);
            }
        });
        
        // Import usage data if provided
        if (data.usage) {
            data.usage.forEach(([templateId, usageData]) => {
                if (this.templates.has(templateId)) {
                    this.templateUsage.set(templateId, usageData);
                }
            });
        }
        
        return imported;
    }
}

module.exports = PromptTemplateSystem;