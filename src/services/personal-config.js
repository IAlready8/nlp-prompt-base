/**
 * Personal Configuration Management System
 * 
 * Centralized configuration management for personal enterprise-grade setup
 * Features: Hot-reload, validation, environment-specific configs
 */

const fs = require('fs').promises;
const path = require('path');
const { PersonalConfigSchema } = require('../database/interfaces');

class PersonalConfigManager {
    constructor(configPath = './config/personal.json') {
        this.configPath = path.resolve(configPath);
        this.config = null;
        this.watchers = new Map();
        this.validators = new Map();
        this.loaded = false;
        
        // Setup validation rules
        this.setupValidators();
    }

    /**
     * Load configuration with fallback to defaults
     */
    async loadConfig() {
        try {
            // Ensure config directory exists
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });
            
            try {
                const configData = await fs.readFile(this.configPath, 'utf8');
                this.config = JSON.parse(configData);
                console.log('✓ Loaded personal configuration from:', this.configPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('ℹ️ No config file found, creating default configuration');
                    this.config = this.getDefaultConfig();
                    await this.saveConfig();
                } else {
                    throw error;
                }
            }

            // Validate and merge with defaults
            this.config = this.validateAndMergeConfig(this.config);
            this.loaded = true;
            
            return this.config;
            
        } catch (error) {
            console.error('✗ Failed to load configuration:', error);
            this.config = this.getDefaultConfig();
            this.loaded = true;
            return this.config;
        }
    }

    /**
     * Get default configuration optimized for personal MacBook Air M2 use
     */
    getDefaultConfig() {
        return {
            database: {
                type: 'sqlite',
                path: './data/prompts.db',
                backupInterval: 60 // 1 hour for personal use
            },
            ai: {
                openaiKey: process.env.OPENAI_API_KEY || '',
                model: 'gpt-3.5-turbo',
                autoCategorizationEnabled: true,
                batchSize: 5, // Conservative for personal API limits
                requestDelay: 100 // ms between requests
            },
            ui: {
                theme: 'dark', // Optimized for MacBook
                compactMode: false,
                animations: true,
                keyboardShortcuts: true,
                autoSave: true
            },
            performance: {
                maxPromptsInMemory: 10000, // Optimized for 8GB RAM
                enableIndexing: true,
                debugMode: false,
                enableAnalytics: true,
                cacheSize: 1000 // Number of cached items
            },
            backup: {
                enabled: true,
                interval: 60, // minutes
                maxBackups: 10,
                autoCleanup: true,
                compression: false // Fast backup for personal use
            },
            shortcuts: {
                quickNote: 'cmd+shift+n',
                advancedSearch: 'cmd+shift+f',
                createBackup: 'cmd+shift+b',
                showInsights: 'cmd+shift+i',
                commandPalette: 'cmd+shift+p'
            },
            automation: {
                autoCategorizationEnabled: true,
                duplicateDetection: true,
                smartSuggestions: true,
                workflowsEnabled: true
            },
            privacy: {
                analytics: false, // No external analytics for personal use
                errorReporting: false,
                usageTracking: true // Local tracking only
            }
        };
    }

    /**
     * Setup configuration validators
     */
    setupValidators() {
        this.validators.set('database.type', (value) => {
            return ['sqlite', 'json'].includes(value);
        });

        this.validators.set('ai.model', (value) => {
            return typeof value === 'string' && value.length > 0;
        });

        this.validators.set('ui.theme', (value) => {
            return ['dark', 'light', 'auto'].includes(value);
        });

        this.validators.set('performance.maxPromptsInMemory', (value) => {
            return Number.isInteger(value) && value > 0 && value <= 50000;
        });

        this.validators.set('backup.interval', (value) => {
            return Number.isInteger(value) && value >= 5; // Minimum 5 minutes
        });
    }

    /**
     * Validate configuration and merge with defaults
     */
    validateAndMergeConfig(config) {
        const defaultConfig = this.getDefaultConfig();
        const mergedConfig = this.deepMerge(defaultConfig, config);
        
        // Validate specific fields
        for (const [path, validator] of this.validators) {
            const value = this.getNestedValue(mergedConfig, path);
            if (value !== undefined && !validator(value)) {
                console.warn(`⚠️ Invalid config value for ${path}: ${value}, using default`);
                this.setNestedValue(mergedConfig, path, this.getNestedValue(defaultConfig, path));
            }
        }

        return mergedConfig;
    }

    /**
     * Deep merge objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Get nested object value by dot notation path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Set nested object value by dot notation path
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Save configuration to disk
     */
    async saveConfig() {
        try {
            const configJson = JSON.stringify(this.config, null, 2);
            await fs.writeFile(this.configPath, configJson, 'utf8');
            console.log('✓ Configuration saved to:', this.configPath);
            
            // Notify watchers
            this.notifyWatchers('config_saved', this.config);
            
        } catch (error) {
            console.error('✗ Failed to save configuration:', error);
            throw error;
        }
    }

    /**
     * Update specific configuration values
     */
    async updateConfig(updates) {
        if (!this.loaded) {
            await this.loadConfig();
        }

        // Apply updates
        this.config = this.deepMerge(this.config, updates);
        
        // Validate updated config
        this.config = this.validateAndMergeConfig(this.config);
        
        // Save to disk
        await this.saveConfig();
        
        // Notify watchers
        this.notifyWatchers('config_updated', updates);
        
        return this.config;
    }

    /**
     * Get current configuration
     */
    async getConfig() {
        if (!this.loaded) {
            await this.loadConfig();
        }
        return { ...this.config };
    }

    /**
     * Get specific configuration value
     */
    async get(path, defaultValue = undefined) {
        if (!this.loaded) {
            await this.loadConfig();
        }
        
        const value = this.getNestedValue(this.config, path);
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set specific configuration value
     */
    async set(path, value) {
        if (!this.loaded) {
            await this.loadConfig();
        }

        const updates = {};
        this.setNestedValue(updates, path, value);
        return await this.updateConfig(updates);
    }

    /**
     * Watch for configuration changes
     */
    onConfigChange(event, callback) {
        if (!this.watchers.has(event)) {
            this.watchers.set(event, []);
        }
        this.watchers.get(event).push(callback);
        
        return () => {
            const callbacks = this.watchers.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify configuration watchers
     */
    notifyWatchers(event, data) {
        const callbacks = this.watchers.get(event) || [];
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Config watcher error:', error);
            }
        });
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        this.config = this.getDefaultConfig();
        await this.saveConfig();
        this.notifyWatchers('config_reset', this.config);
        return this.config;
    }

    /**
     * Export configuration for backup
     */
    async exportConfig() {
        if (!this.loaded) {
            await this.loadConfig();
        }

        const exportData = {
            config: this.config,
            exported: new Date().toISOString(),
            version: '2.0.0'
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import configuration from backup
     */
    async importConfig(configData) {
        try {
            const imported = typeof configData === 'string' ? JSON.parse(configData) : configData;
            
            if (imported.config) {
                this.config = this.validateAndMergeConfig(imported.config);
                await this.saveConfig();
                this.notifyWatchers('config_imported', this.config);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to import configuration:', error);
            return false;
        }
    }

    /**
     * Get configuration optimized for current environment
     */
    async getOptimizedConfig() {
        const config = await this.getConfig();
        
        // Optimize for MacBook Air M2 8GB RAM
        const memoryOptimized = {
            ...config,
            performance: {
                ...config.performance,
                maxPromptsInMemory: Math.min(config.performance.maxPromptsInMemory, 10000),
                cacheSize: Math.min(config.performance.cacheSize, 1000)
            },
            ai: {
                ...config.ai,
                batchSize: Math.min(config.ai.batchSize || 5, 5) // Conservative API usage
            }
        };

        return memoryOptimized;
    }

    /**
     * Validate current configuration health
     */
    async validateConfigHealth() {
        const config = await this.getConfig();
        const issues = [];
        
        // Check database path accessibility
        try {
            await fs.access(path.dirname(config.database.path));
        } catch {
            issues.push('Database directory not accessible');
        }

        // Check backup directory
        if (config.backup.enabled) {
            try {
                await fs.access('./backups');
            } catch {
                issues.push('Backup directory not accessible');
            }
        }

        // Check memory settings
        if (config.performance.maxPromptsInMemory > 20000) {
            issues.push('maxPromptsInMemory might be too high for 8GB RAM');
        }

        // Check AI configuration
        if (config.ai.autoCategorizationEnabled && !config.ai.openaiKey) {
            issues.push('AI categorization enabled but no API key provided');
        }

        return {
            healthy: issues.length === 0,
            issues,
            config
        };
    }
}

module.exports = PersonalConfigManager;