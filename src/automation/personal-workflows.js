/**
 * Personal Workflow Engine
 * 
 * Automated workflows for personal productivity optimization
 * Features: Event-driven automation, custom workflows, smart triggers
 */

const PersonalPerformanceMonitor = require('../utils/personal-monitor');

class PersonalWorkflowEngine {
    constructor(config = {}) {
        this.workflows = new Map();
        this.triggers = new Map();
        this.executionHistory = [];
        this.enabled = config.enabled !== false;
        this.maxHistorySize = config.maxHistorySize || 100;
        this.monitor = new PersonalPerformanceMonitor();
        
        // Event system for workflow triggers
        this.eventEmitter = new (require('events'))();
        
        // Setup default workflows
        this.setupDefaultWorkflows();
        
        if (this.enabled) {
            this.bindEventListeners();
            console.log('✓ Personal Workflow Engine initialized');
        }
    }

    /**
     * Setup default automation workflows
     */
    setupDefaultWorkflows() {
        // Auto-backup workflow
        this.addWorkflow({
            id: 'auto-backup',
            name: 'Automatic Backup',
            description: 'Create automatic backups at regular intervals',
            trigger: { 
                type: 'schedule', 
                interval: 3600000 // 1 hour
            },
            actions: [
                { type: 'backup', params: { type: 'auto' } },
                { type: 'cleanup', params: { keepLast: 10 } }
            ],
            enabled: true,
            priority: 'high'
        });

        // Smart categorization workflow
        this.addWorkflow({
            id: 'smart-categorize',
            name: 'Smart Categorization',
            description: 'Automatically categorize new prompts using AI',
            trigger: { 
                type: 'event', 
                event: 'prompt-added'
            },
            actions: [
                { type: 'ai-categorize', params: { useCache: true } },
                { type: 'suggest-tags', params: { maxTags: 5 } },
                { type: 'duplicate-check', params: { threshold: 0.9 } }
            ],
            enabled: true,
            priority: 'medium',
            conditions: [
                { field: 'text.length', operator: '>', value: 10 }
            ]
        });

        // Quality improvement workflow
        this.addWorkflow({
            id: 'quality-improvement',
            name: 'Quality Improvement',
            description: 'Suggest improvements for low-quality prompts',
            trigger: { 
                type: 'event', 
                event: 'prompt-updated'
            },
            actions: [
                { type: 'quality-check', params: { minRating: 3 } },
                { type: 'suggest-improvements', params: {} }
            ],
            enabled: true,
            priority: 'low',
            conditions: [
                { field: 'rating', operator: '<', value: 3 }
            ]
        });

        // Productivity tracking workflow
        this.addWorkflow({
            id: 'productivity-tracking',
            name: 'Productivity Tracking',
            description: 'Track daily productivity metrics',
            trigger: { 
                type: 'schedule', 
                interval: 86400000 // 24 hours
            },
            actions: [
                { type: 'calculate-daily-stats', params: {} },
                { type: 'update-goals', params: {} },
                { type: 'generate-insights', params: {} }
            ],
            enabled: true,
            priority: 'medium'
        });

        // Maintenance workflow
        this.addWorkflow({
            id: 'maintenance',
            name: 'System Maintenance',
            description: 'Perform routine system maintenance',
            trigger: { 
                type: 'schedule', 
                interval: 604800000 // 1 week
            },
            actions: [
                { type: 'cleanup-cache', params: {} },
                { type: 'optimize-database', params: {} },
                { type: 'archive-old-backups', params: { olderThan: 30 } }
            ],
            enabled: true,
            priority: 'low'
        });

        // Smart suggestions workflow
        this.addWorkflow({
            id: 'smart-suggestions',
            name: 'Smart Suggestions',
            description: 'Provide contextual suggestions based on usage patterns',
            trigger: { 
                type: 'event', 
                event: 'user-idle'
            },
            actions: [
                { type: 'analyze-patterns', params: {} },
                { type: 'suggest-actions', params: { maxSuggestions: 3 } }
            ],
            enabled: true,
            priority: 'low',
            conditions: [
                { field: 'idleTime', operator: '>', value: 300000 } // 5 minutes
            ]
        });
    }

    /**
     * Add a new workflow
     */
    addWorkflow(workflow) {
        try {
            // Validate workflow
            this.validateWorkflow(workflow);
            
            // Set defaults
            workflow.enabled = workflow.enabled !== false;
            workflow.priority = workflow.priority || 'medium';
            workflow.created = new Date().toISOString();
            workflow.lastExecuted = null;
            workflow.executionCount = 0;
            
            this.workflows.set(workflow.id, workflow);
            
            // Setup trigger
            this.setupWorkflowTrigger(workflow);
            
            console.log(`✓ Added workflow: ${workflow.name}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to add workflow ${workflow.id}:`, error);
            return false;
        }
    }

    /**
     * Setup workflow trigger
     */
    setupWorkflowTrigger(workflow) {
        if (!workflow.enabled) return;
        
        const trigger = workflow.trigger;
        
        switch (trigger.type) {
            case 'schedule':
                this.setupScheduleTrigger(workflow);
                break;
            case 'event':
                this.setupEventTrigger(workflow);
                break;
            case 'condition':
                this.setupConditionTrigger(workflow);
                break;
            default:
                console.warn(`Unknown trigger type: ${trigger.type}`);
        }
    }

    /**
     * Setup scheduled trigger
     */
    setupScheduleTrigger(workflow) {
        const trigger = workflow.trigger;
        
        // Clear existing timer if any
        if (workflow.timerId) {
            clearInterval(workflow.timerId);
        }
        
        // Setup new timer
        workflow.timerId = setInterval(() => {
            this.executeWorkflow(workflow.id, { trigger: 'schedule' });
        }, trigger.interval);
        
        this.triggers.set(`schedule-${workflow.id}`, workflow.timerId);
    }

    /**
     * Setup event trigger
     */
    setupEventTrigger(workflow) {
        const trigger = workflow.trigger;
        
        const handler = (data) => {
            this.executeWorkflow(workflow.id, { trigger: 'event', data });
        };
        
        this.eventEmitter.on(trigger.event, handler);
        this.triggers.set(`event-${workflow.id}`, { event: trigger.event, handler });
    }

    /**
     * Setup condition trigger
     */
    setupConditionTrigger(workflow) {
        // Condition triggers are checked during event processing
        // No specific setup needed here
    }

    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId, context = {}) {
        const endTimer = this.monitor.startTimer(`workflow_${workflowId}`);
        
        try {
            const workflow = this.workflows.get(workflowId);
            if (!workflow || !workflow.enabled) {
                return { success: false, reason: 'Workflow not found or disabled' };
            }

            console.log(`🔄 Executing workflow: ${workflow.name}`);
            
            // Check conditions
            if (!this.checkWorkflowConditions(workflow, context)) {
                return { success: false, reason: 'Conditions not met' };
            }

            // Execute actions
            const results = [];
            for (const action of workflow.actions) {
                try {
                    const result = await this.executeAction(action, context);
                    results.push({ action: action.type, success: true, result });
                } catch (error) {
                    console.error(`Action ${action.type} failed:`, error);
                    results.push({ action: action.type, success: false, error: error.message });
                    
                    // Stop execution if critical action fails
                    if (action.critical) {
                        break;
                    }
                }
            }

            // Update workflow stats
            workflow.lastExecuted = new Date().toISOString();
            workflow.executionCount++;

            // Record execution
            const execution = {
                workflowId,
                timestamp: new Date().toISOString(),
                context,
                results,
                duration: endTimer().duration,
                success: results.every(r => r.success)
            };

            this.recordExecution(execution);
            
            console.log(`✓ Workflow completed: ${workflow.name} (${execution.duration.toFixed(2)}ms)`);
            
            return { success: true, execution };
            
        } catch (error) {
            console.error(`Workflow execution failed: ${workflowId}`, error);
            
            const execution = {
                workflowId,
                timestamp: new Date().toISOString(),
                context,
                error: error.message,
                duration: endTimer().duration,
                success: false
            };

            this.recordExecution(execution);
            
            return { success: false, error: error.message, execution };
        }
    }

    /**
     * Execute individual action
     */
    async executeAction(action, context) {
        switch (action.type) {
            case 'backup':
                return await this.executeBackupAction(action.params, context);
            case 'cleanup':
                return await this.executeCleanupAction(action.params, context);
            case 'ai-categorize':
                return await this.executeAICategorizeAction(action.params, context);
            case 'suggest-tags':
                return await this.executeSuggestTagsAction(action.params, context);
            case 'duplicate-check':
                return await this.executeDuplicateCheckAction(action.params, context);
            case 'quality-check':
                return await this.executeQualityCheckAction(action.params, context);
            case 'suggest-improvements':
                return await this.executeSuggestImprovementsAction(action.params, context);
            case 'calculate-daily-stats':
                return await this.executeCalculateDailyStatsAction(action.params, context);
            case 'update-goals':
                return await this.executeUpdateGoalsAction(action.params, context);
            case 'generate-insights':
                return await this.executeGenerateInsightsAction(action.params, context);
            case 'cleanup-cache':
                return await this.executeCleanupCacheAction(action.params, context);
            case 'optimize-database':
                return await this.executeOptimizeDatabaseAction(action.params, context);
            case 'archive-old-backups':
                return await this.executeArchiveOldBackupsAction(action.params, context);
            case 'analyze-patterns':
                return await this.executeAnalyzePatternsAction(action.params, context);
            case 'suggest-actions':
                return await this.executeSuggestActionsAction(action.params, context);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }

    /**
     * Action implementations
     */

    async executeBackupAction(params, context) {
        try {
            if (typeof window !== 'undefined' && window.backupManager) {
                const result = await window.backupManager.createAutoBackup();
                return { success: true, backupId: result?.id, size: result?.size };
            } else {
                // Fallback to API call
                const response = await fetch('/api/backup', { method: 'POST' });
                return { success: response.ok, api: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeCleanupAction(params, context) {
        try {
            if (typeof window !== 'undefined' && window.backupManager) {
                await window.backupManager.cleanOldBackups();
                return { success: true, cleaned: true };
            }
            return { success: true, message: 'Cleanup skipped - no backup manager' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeAICategorizeAction(params, context) {
        try {
            if (!context.data?.prompt) {
                return { success: false, error: 'No prompt data provided' };
            }

            if (typeof window !== 'undefined' && window.aiAssistant) {
                const result = await window.aiAssistant.smartCategorizePrompt(
                    context.data.prompt.text,
                    context.data.categories || []
                );
                return { success: true, category: result.category, confidence: result.confidence };
            }
            
            return { success: false, error: 'AI assistant not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeSuggestTagsAction(params, context) {
        try {
            if (!context.data?.prompt) {
                return { success: false, error: 'No prompt data provided' };
            }

            if (typeof window !== 'undefined' && window.aiAssistant) {
                const result = await window.aiAssistant.generateSmartTags(
                    context.data.prompt.text,
                    context.data.existingTags || []
                );
                return { success: true, tags: result.tags.slice(0, params.maxTags || 5) };
            }
            
            return { success: false, error: 'AI assistant not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeDuplicateCheckAction(params, context) {
        try {
            if (!context.data?.prompt) {
                return { success: false, error: 'No prompt data provided' };
            }

            if (typeof window !== 'undefined' && window.database) {
                const duplicates = window.database.checkForDuplicates(
                    context.data.prompt.text,
                    params.threshold || 0.9
                );
                return { success: true, duplicates: duplicates.length, found: duplicates };
            }
            
            return { success: false, error: 'Database not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeQualityCheckAction(params, context) {
        try {
            if (!context.data?.prompt) {
                return { success: false, error: 'No prompt data provided' };
            }

            const prompt = context.data.prompt;
            const rating = prompt.rating || 0;
            const minRating = params.minRating || 3;
            
            const needsImprovement = rating < minRating;
            const issues = [];
            
            if (rating < minRating) issues.push('Low rating');
            if (!prompt.category || prompt.category === 'General') issues.push('Needs categorization');
            if (!prompt.tags || prompt.tags.length === 0) issues.push('Needs tags');
            if (prompt.text.length < 20) issues.push('Text too short');
            
            return { success: true, needsImprovement, issues, rating };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeSuggestImprovementsAction(params, context) {
        try {
            if (!context.data?.prompt) {
                return { success: false, error: 'No prompt data provided' };
            }

            const suggestions = [];
            const prompt = context.data.prompt;
            
            if (!prompt.category || prompt.category === 'General') {
                suggestions.push('Add a specific category');
            }
            
            if (!prompt.tags || prompt.tags.length === 0) {
                suggestions.push('Add relevant tags');
            }
            
            if (prompt.text.length < 50) {
                suggestions.push('Expand the prompt text');
            }
            
            if ((prompt.rating || 0) === 0) {
                suggestions.push('Rate this prompt');
            }
            
            return { success: true, suggestions };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeCalculateDailyStatsAction(params, context) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const stats = {
                date: today,
                promptsCreated: 0,
                promptsUpdated: 0,
                averageRating: 0,
                categoriesUsed: new Set(),
                tagsUsed: new Set()
            };

            if (typeof window !== 'undefined' && window.database) {
                const prompts = await window.database.getPrompts();
                const todayPrompts = prompts.filter(p => 
                    (p.createdAt || p.created_at || '').startsWith(today)
                );
                
                stats.promptsCreated = todayPrompts.length;
                stats.averageRating = todayPrompts.length > 0 ? 
                    todayPrompts.reduce((sum, p) => sum + (p.rating || 0), 0) / todayPrompts.length : 0;
                
                todayPrompts.forEach(p => {
                    if (p.category) stats.categoriesUsed.add(p.category);
                    if (p.tags) p.tags.forEach(tag => stats.tagsUsed.add(tag));
                });
            }

            // Save to local storage for tracking
            const dailyStats = JSON.parse(localStorage.getItem('nlp_daily_stats') || '[]');
            dailyStats.unshift({
                ...stats,
                categoriesUsed: Array.from(stats.categoriesUsed),
                tagsUsed: Array.from(stats.tagsUsed)
            });
            
            // Keep only last 30 days
            localStorage.setItem('nlp_daily_stats', JSON.stringify(dailyStats.slice(0, 30)));
            
            return { success: true, stats };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeUpdateGoalsAction(params, context) {
        try {
            // Update personal goals progress
            if (typeof window !== 'undefined' && window.analyticsManager) {
                await window.analyticsManager.updateGoalsProgress();
                return { success: true, updated: true };
            }
            
            return { success: true, message: 'Goals update skipped - no analytics manager' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeGenerateInsightsAction(params, context) {
        try {
            if (typeof window !== 'undefined' && window.aiAssistant) {
                const prompts = await window.database.getPrompts();
                const insights = await window.aiAssistant.generatePersonalInsights(prompts);
                
                // Store insights for dashboard
                localStorage.setItem('nlp_insights', JSON.stringify({
                    insights,
                    generated: new Date().toISOString()
                }));
                
                return { success: true, insights: insights.suggestions?.length || 0 };
            }
            
            return { success: false, error: 'AI assistant not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeCleanupCacheAction(params, context) {
        try {
            if (typeof window !== 'undefined' && window.aiAssistant) {
                window.aiAssistant.clearCache();
            }
            
            // Clear performance monitor cache
            if (typeof window !== 'undefined' && window.performanceMonitor) {
                window.performanceMonitor.clearOldData(60);
            }
            
            return { success: true, cleaned: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeOptimizeDatabaseAction(params, context) {
        try {
            // SQLite optimization would happen here
            if (typeof window !== 'undefined' && window.database) {
                // Placeholder for database optimization
                return { success: true, optimized: true };
            }
            
            return { success: true, message: 'Database optimization skipped' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeArchiveOldBackupsAction(params, context) {
        try {
            if (typeof window !== 'undefined' && window.backupManager) {
                await window.backupManager.cleanOldBackups();
                return { success: true, archived: true };
            }
            
            return { success: true, message: 'Backup archiving skipped' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeAnalyzePatternsAction(params, context) {
        try {
            // Analyze user patterns
            const patterns = {
                mostActiveTime: this.getMostActiveTimePattern(),
                favoriteCategories: this.getFavoriteCategoriesPattern(),
                searchPatterns: this.getSearchPatterns()
            };
            
            return { success: true, patterns };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async executeSuggestActionsAction(params, context) {
        try {
            const suggestions = [];
            const maxSuggestions = params.maxSuggestions || 3;
            
            // Generate contextual suggestions
            if (typeof window !== 'undefined' && window.database) {
                const prompts = await window.database.getPrompts();
                
                if (prompts.length === 0) {
                    suggestions.push({
                        type: 'create',
                        title: 'Create your first prompt',
                        description: 'Start building your prompt collection'
                    });
                } else {
                    const untagged = prompts.filter(p => !p.tags || p.tags.length === 0);
                    if (untagged.length > 0) {
                        suggestions.push({
                            type: 'organize',
                            title: 'Tag unorganized prompts',
                            description: `${untagged.length} prompts need tags`
                        });
                    }
                    
                    const lowRated = prompts.filter(p => (p.rating || 0) < 3);
                    if (lowRated.length > 0) {
                        suggestions.push({
                            type: 'improve',
                            title: 'Improve low-rated prompts',
                            description: `${lowRated.length} prompts could be improved`
                        });
                    }
                }
            }
            
            return { success: true, suggestions: suggestions.slice(0, maxSuggestions) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Utility methods
     */

    checkWorkflowConditions(workflow, context) {
        if (!workflow.conditions) return true;
        
        for (const condition of workflow.conditions) {
            if (!this.evaluateCondition(condition, context)) {
                return false;
            }
        }
        
        return true;
    }

    evaluateCondition(condition, context) {
        try {
            const value = this.getValueFromPath(context, condition.field);
            
            switch (condition.operator) {
                case '>':
                    return value > condition.value;
                case '<':
                    return value < condition.value;
                case '>=':
                    return value >= condition.value;
                case '<=':
                    return value <= condition.value;
                case '==':
                    return value == condition.value;
                case '===':
                    return value === condition.value;
                case '!=':
                    return value != condition.value;
                case '!==':
                    return value !== condition.value;
                case 'contains':
                    return Array.isArray(value) ? value.includes(condition.value) : 
                           String(value).includes(condition.value);
                case 'matches':
                    return new RegExp(condition.value).test(String(value));
                default:
                    return false;
            }
        } catch (error) {
            console.error('Condition evaluation error:', error);
            return false;
        }
    }

    getValueFromPath(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    validateWorkflow(workflow) {
        if (!workflow.id) throw new Error('Workflow ID is required');
        if (!workflow.name) throw new Error('Workflow name is required');
        if (!workflow.trigger) throw new Error('Workflow trigger is required');
        if (!workflow.actions || !Array.isArray(workflow.actions)) {
            throw new Error('Workflow actions must be an array');
        }
        if (workflow.actions.length === 0) {
            throw new Error('Workflow must have at least one action');
        }
    }

    recordExecution(execution) {
        this.executionHistory.unshift(execution);
        
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory.pop();
        }
    }

    getMostActiveTimePattern() {
        // Analyze when user is most active
        const hours = new Array(24).fill(0);
        // This would analyze actual usage data
        return { peak: 14, pattern: hours }; // Placeholder
    }

    getFavoriteCategoriesPattern() {
        // Analyze most used categories
        return ['Code', 'Writing', 'Creative']; // Placeholder
    }

    getSearchPatterns() {
        // Analyze search queries
        return ['javascript', 'writing tips', 'creative prompts']; // Placeholder
    }

    /**
     * Event system
     */

    bindEventListeners() {
        // Listen for DOM events to trigger workflows
        if (typeof document !== 'undefined') {
            // Prompt added event
            document.addEventListener('promptAdded', (event) => {
                this.emitEvent('prompt-added', { prompt: event.detail });
            });

            // Prompt updated event
            document.addEventListener('promptUpdated', (event) => {
                this.emitEvent('prompt-updated', { prompt: event.detail });
            });

            // User idle detection
            let idleTimer;
            const resetIdleTimer = () => {
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    this.emitEvent('user-idle', { idleTime: 300000 });
                }, 300000); // 5 minutes
            };

            document.addEventListener('mousedown', resetIdleTimer);
            document.addEventListener('keydown', resetIdleTimer);
            resetIdleTimer();
        }
    }

    emitEvent(eventName, data) {
        this.eventEmitter.emit(eventName, data);
    }

    /**
     * Public API
     */

    enableWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.enabled = true;
            this.setupWorkflowTrigger(workflow);
            return true;
        }
        return false;
    }

    disableWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.enabled = false;
            this.removeWorkflowTrigger(workflowId);
            return true;
        }
        return false;
    }

    removeWorkflowTrigger(workflowId) {
        const trigger = this.triggers.get(`schedule-${workflowId}`);
        if (trigger) {
            clearInterval(trigger);
            this.triggers.delete(`schedule-${workflowId}`);
        }

        const eventTrigger = this.triggers.get(`event-${workflowId}`);
        if (eventTrigger) {
            this.eventEmitter.off(eventTrigger.event, eventTrigger.handler);
            this.triggers.delete(`event-${workflowId}`);
        }
    }

    getWorkflows() {
        return Array.from(this.workflows.values());
    }

    getExecutionHistory(workflowId = null) {
        if (workflowId) {
            return this.executionHistory.filter(e => e.workflowId === workflowId);
        }
        return [...this.executionHistory];
    }

    getWorkflowStats() {
        const stats = {
            total: this.workflows.size,
            enabled: 0,
            disabled: 0,
            executions: this.executionHistory.length,
            successRate: 0
        };

        for (const workflow of this.workflows.values()) {
            if (workflow.enabled) stats.enabled++;
            else stats.disabled++;
        }

        const successful = this.executionHistory.filter(e => e.success).length;
        stats.successRate = this.executionHistory.length > 0 ? 
            Math.round((successful / this.executionHistory.length) * 100) : 0;

        return stats;
    }

    destroy() {
        // Clean up all triggers
        for (const [key, trigger] of this.triggers) {
            if (key.startsWith('schedule-')) {
                clearInterval(trigger);
            } else if (key.startsWith('event-')) {
                this.eventEmitter.off(trigger.event, trigger.handler);
            }
        }
        
        this.triggers.clear();
        this.workflows.clear();
        this.executionHistory = [];
        
        console.log('✓ Personal Workflow Engine destroyed');
    }
}

module.exports = PersonalWorkflowEngine;