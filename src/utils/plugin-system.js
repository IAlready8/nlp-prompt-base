class PluginSystem {
    constructor(options = {}) {
        this.options = {
            maxPlugins: options.maxPlugins || 50,
            enableSandboxing: options.enableSandboxing !== false,
            allowRemotePlugins: options.allowRemotePlugins || false,
            pluginTimeout: options.pluginTimeout || 30000,
            enablePluginUpdates: options.enablePluginUpdates !== false,
            ...options
        };
        
        this.plugins = new Map();
        this.pluginHooks = new Map();
        this.pluginStorage = new Map();
        this.pluginListeners = new Map();
        this.logger = options.logger || console;
        
        this.initializeHooks();
    }
    
    initializeHooks() {
        // Define available hooks in the system
        const hooks = [
            // Data hooks
            'prompt.beforeCreate',
            'prompt.afterCreate',
            'prompt.beforeUpdate',
            'prompt.afterUpdate',
            'prompt.beforeDelete',
            'prompt.afterDelete',
            
            // Search hooks
            'search.beforeExecute',
            'search.afterExecute',
            'search.filterResults',
            'search.enhanceQuery',
            
            // UI hooks
            'ui.beforeRender',
            'ui.afterRender',
            'ui.addMenuItem',
            'ui.addButton',
            'ui.addPanel',
            
            // Export hooks
            'export.beforeExport',
            'export.afterExport',
            'export.addFormat',
            
            // Analytics hooks
            'analytics.beforeCalculate',
            'analytics.afterCalculate',
            'analytics.addMetric',
            
            // AI hooks
            'ai.beforeCategorize',
            'ai.afterCategorize',
            'ai.beforeEnhance',
            'ai.afterEnhance'
        ];
        
        hooks.forEach(hook => {
            this.pluginHooks.set(hook, []);
        });
    }
    
    async installPlugin(pluginData, options = {}) {
        try {
            // Validate plugin data
            this.validatePlugin(pluginData);
            
            // Check plugin limits
            if (this.plugins.size >= this.options.maxPlugins) {
                throw new Error(`Maximum number of plugins (${this.options.maxPlugins}) reached`);
            }
            
            // Check for conflicts
            this.checkPluginConflicts(pluginData);
            
            // Create plugin instance
            const plugin = await this.createPluginInstance(pluginData, options);
            
            // Register plugin
            this.plugins.set(plugin.id, plugin);
            
            // Register hooks
            this.registerPluginHooks(plugin);
            
            // Initialize plugin
            if (plugin.initialize) {
                await this.executePluginMethod(plugin, 'initialize');
            }
            
            // Store plugin data for persistence
            this.pluginStorage.set(plugin.id, {
                metadata: plugin.metadata,
                settings: plugin.settings || {},
                enabled: true,
                installedAt: new Date().toISOString()
            });
            
            this.logger.info('Plugin installed successfully', { 
                id: plugin.id, 
                name: plugin.metadata.name 
            });
            
            return plugin.id;
            
        } catch (error) {
            this.logger.error('Plugin installation failed', { error: error.message });
            throw error;
        }
    }
    
    async uninstallPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        try {
            // Call cleanup method if available
            if (plugin.cleanup) {
                await this.executePluginMethod(plugin, 'cleanup');
            }
            
            // Unregister hooks
            this.unregisterPluginHooks(plugin);
            
            // Remove from maps
            this.plugins.delete(pluginId);
            this.pluginStorage.delete(pluginId);
            this.pluginListeners.delete(pluginId);
            
            this.logger.info('Plugin uninstalled successfully', { id: pluginId });
            
        } catch (error) {
            this.logger.error('Plugin uninstallation failed', { 
                pluginId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        const storage = this.pluginStorage.get(pluginId);
        
        if (!plugin || !storage) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        if (storage.enabled) {
            return; // Already enabled
        }
        
        try {
            // Re-register hooks
            this.registerPluginHooks(plugin);
            
            // Call enable method if available
            if (plugin.enable) {
                await this.executePluginMethod(plugin, 'enable');
            }
            
            storage.enabled = true;
            
            this.logger.info('Plugin enabled', { id: pluginId });
            
        } catch (error) {
            this.logger.error('Failed to enable plugin', { 
                pluginId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        const storage = this.pluginStorage.get(pluginId);
        
        if (!plugin || !storage) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        if (!storage.enabled) {
            return; // Already disabled
        }
        
        try {
            // Call disable method if available
            if (plugin.disable) {
                await this.executePluginMethod(plugin, 'disable');
            }
            
            // Unregister hooks
            this.unregisterPluginHooks(plugin);
            
            storage.enabled = false;
            
            this.logger.info('Plugin disabled', { id: pluginId });
            
        } catch (error) {
            this.logger.error('Failed to disable plugin', { 
                pluginId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async executeHook(hookName, data = {}, options = {}) {
        const hooks = this.pluginHooks.get(hookName);
        if (!hooks || hooks.length === 0) {
            return data;
        }
        
        let result = data;
        
        for (const hook of hooks) {
            const plugin = this.plugins.get(hook.pluginId);
            const storage = this.pluginStorage.get(hook.pluginId);
            
            if (!plugin || !storage || !storage.enabled) {
                continue;
            }
            
            try {
                const hookResult = await this.executePluginMethod(
                    plugin, 
                    hook.method, 
                    [result, options],
                    hook.timeout || this.options.pluginTimeout
                );
                
                // If hook returns data, use it for next hook
                if (hookResult !== undefined) {
                    result = hookResult;
                }
                
            } catch (error) {
                this.logger.error('Hook execution failed', {
                    hookName,
                    pluginId: hook.pluginId,
                    error: error.message
                });
                
                // Continue with other hooks unless it's a critical hook
                if (!hook.critical) {
                    continue;
                } else {
                    throw error;
                }
            }
        }
        
        return result;
    }
    
    validatePlugin(pluginData) {
        const required = ['id', 'metadata', 'code'];
        
        for (const field of required) {
            if (!pluginData[field]) {
                throw new Error(`Plugin field '${field}' is required`);
            }
        }
        
        // Validate metadata
        const metadataRequired = ['name', 'version', 'author', 'description'];
        for (const field of metadataRequired) {
            if (!pluginData.metadata[field]) {
                throw new Error(`Plugin metadata field '${field}' is required`);
            }
        }
        
        // Validate version format
        const versionRegex = /^\d+\.\d+\.\d+$/;
        if (!versionRegex.test(pluginData.metadata.version)) {
            throw new Error('Plugin version must be in format x.y.z');
        }
        
        // Validate permissions
        if (pluginData.metadata.permissions) {
            this.validatePluginPermissions(pluginData.metadata.permissions);
        }
        
        // Validate dependencies
        if (pluginData.metadata.dependencies) {
            this.validatePluginDependencies(pluginData.metadata.dependencies);
        }
    }
    
    validatePluginPermissions(permissions) {
        const allowedPermissions = [
            'data.read',
            'data.write',
            'data.delete',
            'ui.modify',
            'network.access',
            'storage.read',
            'storage.write',
            'analytics.read',
            'export.create',
            'ai.access'
        ];
        
        permissions.forEach(permission => {
            if (!allowedPermissions.includes(permission)) {
                throw new Error(`Invalid permission: ${permission}`);
            }
        });
    }
    
    validatePluginDependencies(dependencies) {
        dependencies.forEach(dep => {
            const plugin = this.plugins.get(dep.id);
            if (!plugin) {
                throw new Error(`Dependency not found: ${dep.id}`);
            }
            
            if (dep.version && !this.isVersionCompatible(plugin.metadata.version, dep.version)) {
                throw new Error(`Incompatible dependency version: ${dep.id} ${dep.version}`);
            }
        });
    }
    
    checkPluginConflicts(pluginData) {
        // Check for ID conflicts
        if (this.plugins.has(pluginData.id)) {
            throw new Error(`Plugin with ID '${pluginData.id}' already exists`);
        }
        
        // Check for hook conflicts
        if (pluginData.hooks) {
            for (const hookName of Object.keys(pluginData.hooks)) {
                if (!this.pluginHooks.has(hookName)) {
                    throw new Error(`Unknown hook: ${hookName}`);
                }
            }
        }
    }
    
    async createPluginInstance(pluginData, options = {}) {
        let PluginClass;
        
        if (this.options.enableSandboxing) {
            PluginClass = await this.createSandboxedPlugin(pluginData);
        } else {
            PluginClass = await this.createDirectPlugin(pluginData);
        }
        
        const plugin = new PluginClass();
        
        // Set plugin metadata
        plugin.id = pluginData.id;
        plugin.metadata = pluginData.metadata;
        plugin.settings = pluginData.settings || {};
        
        // Provide plugin API
        plugin.api = this.createPluginAPI(plugin);
        
        return plugin;
    }
    
    async createDirectPlugin(pluginData) {
        // Create plugin class directly from code
        // WARNING: This executes arbitrary code - use only for trusted plugins
        const PluginClass = new Function('return ' + pluginData.code)();
        return PluginClass;
    }
    
    async createSandboxedPlugin(pluginData) {
        // Create sandboxed plugin using iframe or Web Worker
        // This is a simplified implementation - real sandboxing would be more complex
        
        const sandbox = {
            console: {
                log: (...args) => this.logger.info(`[Plugin:${pluginData.id}]`, ...args),
                error: (...args) => this.logger.error(`[Plugin:${pluginData.id}]`, ...args),
                warn: (...args) => this.logger.warn(`[Plugin:${pluginData.id}]`, ...args)
            },
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            Promise: Promise,
            JSON: JSON,
            Date: Date,
            Math: Math
        };
        
        // Execute plugin code in sandbox context
        const PluginClass = new Function('sandbox', `
            with (sandbox) {
                ${pluginData.code}
            }
        `)(sandbox);
        
        return PluginClass;
    }
    
    createPluginAPI(plugin) {
        const api = {
            // Storage API
            storage: {
                get: (key) => this.getPluginStorage(plugin.id, key),
                set: (key, value) => this.setPluginStorage(plugin.id, key, value),
                delete: (key) => this.deletePluginStorage(plugin.id, key),
                clear: () => this.clearPluginStorage(plugin.id)
            },
            
            // UI API
            ui: {
                addMenuItem: (item) => this.addMenuItem(plugin.id, item),
                addButton: (button) => this.addButton(plugin.id, button),
                addPanel: (panel) => this.addPanel(plugin.id, panel),
                showNotification: (message, type = 'info') => this.showNotification(message, type)
            },
            
            // Data API
            data: {
                getPrompts: () => this.executeHook('data.getPrompts'),
                addPrompt: (prompt) => this.executeHook('data.addPrompt', prompt),
                updatePrompt: (id, updates) => this.executeHook('data.updatePrompt', { id, updates }),
                deletePrompt: (id) => this.executeHook('data.deletePrompt', { id })
            },
            
            // Analytics API
            analytics: {
                trackEvent: (event, data) => this.trackPluginEvent(plugin.id, event, data),
                addMetric: (metric) => this.addCustomMetric(plugin.id, metric)
            },
            
            // Network API (if permission granted)
            network: plugin.metadata.permissions?.includes('network.access') ? {
                fetch: fetch.bind(window),
                XMLHttpRequest: XMLHttpRequest
            } : null,
            
            // Plugin utilities
            utils: {
                generateId: () => `${plugin.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                debounce: this.debounce,
                throttle: this.throttle,
                sanitizeHTML: this.sanitizeHTML
            }
        };
        
        return api;
    }
    
    registerPluginHooks(plugin) {
        if (!plugin.hooks) return;
        
        for (const [hookName, hookConfig] of Object.entries(plugin.hooks)) {
            const hooks = this.pluginHooks.get(hookName);
            if (hooks) {
                hooks.push({
                    pluginId: plugin.id,
                    method: hookConfig.method || hookName.replace('.', '_'),
                    priority: hookConfig.priority || 10,
                    critical: hookConfig.critical || false,
                    timeout: hookConfig.timeout || this.options.pluginTimeout
                });
                
                // Sort by priority (lower numbers = higher priority)
                hooks.sort((a, b) => a.priority - b.priority);
            }
        }
    }
    
    unregisterPluginHooks(plugin) {
        for (const hooks of this.pluginHooks.values()) {
            for (let i = hooks.length - 1; i >= 0; i--) {
                if (hooks[i].pluginId === plugin.id) {
                    hooks.splice(i, 1);
                }
            }
        }
    }
    
    async executePluginMethod(plugin, methodName, args = [], timeout = null) {
        const method = plugin[methodName];
        if (typeof method !== 'function') {
            throw new Error(`Plugin method ${methodName} not found`);
        }
        
        const timeoutMs = timeout || this.options.pluginTimeout;
        
        return Promise.race([
            method.apply(plugin, args),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Plugin method timeout')), timeoutMs)
            )
        ]);
    }
    
    // Plugin storage methods
    getPluginStorage(pluginId, key) {
        const storage = this.pluginStorage.get(pluginId);
        return storage?.data?.[key];
    }
    
    setPluginStorage(pluginId, key, value) {
        let storage = this.pluginStorage.get(pluginId);
        if (!storage) {
            storage = { data: {} };
            this.pluginStorage.set(pluginId, storage);
        }
        
        if (!storage.data) {
            storage.data = {};
        }
        
        storage.data[key] = value;
    }
    
    deletePluginStorage(pluginId, key) {
        const storage = this.pluginStorage.get(pluginId);
        if (storage?.data) {
            delete storage.data[key];
        }
    }
    
    clearPluginStorage(pluginId) {
        const storage = this.pluginStorage.get(pluginId);
        if (storage) {
            storage.data = {};
        }
    }
    
    // UI extension methods
    addMenuItem(pluginId, item) {
        // Implementation would add menu item to UI
        this.executeHook('ui.addMenuItem', { pluginId, item });
    }
    
    addButton(pluginId, button) {
        // Implementation would add button to UI
        this.executeHook('ui.addButton', { pluginId, button });
    }
    
    addPanel(pluginId, panel) {
        // Implementation would add panel to UI
        this.executeHook('ui.addPanel', { pluginId, panel });
    }
    
    showNotification(message, type) {
        // Implementation would show notification in UI
        this.executeHook('ui.showNotification', { message, type });
    }
    
    // Analytics methods
    trackPluginEvent(pluginId, event, data) {
        this.logger.info('Plugin event', { pluginId, event, data });
    }
    
    addCustomMetric(pluginId, metric) {
        this.executeHook('analytics.addMetric', { pluginId, metric });
    }
    
    // Utility methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    sanitizeHTML(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    }
    
    isVersionCompatible(installed, required) {
        const [iMajor, iMinor, iPatch] = installed.split('.').map(Number);
        const [rMajor, rMinor, rPatch] = required.split('.').map(Number);
        
        // Simple semver compatibility check
        if (iMajor !== rMajor) return false;
        if (iMinor < rMinor) return false;
        if (iMinor === rMinor && iPatch < rPatch) return false;
        
        return true;
    }
    
    // Plugin management methods
    getInstalledPlugins() {
        return Array.from(this.plugins.values()).map(plugin => ({
            id: plugin.id,
            metadata: plugin.metadata,
            enabled: this.pluginStorage.get(plugin.id)?.enabled || false,
            storage: this.pluginStorage.get(plugin.id)
        }));
    }
    
    getPluginInfo(pluginId) {
        const plugin = this.plugins.get(pluginId);
        const storage = this.pluginStorage.get(pluginId);
        
        if (!plugin) {
            return null;
        }
        
        return {
            id: plugin.id,
            metadata: plugin.metadata,
            enabled: storage?.enabled || false,
            settings: plugin.settings,
            hooks: plugin.hooks ? Object.keys(plugin.hooks) : [],
            permissions: plugin.metadata.permissions || [],
            storage: storage
        };
    }
    
    async updatePluginSettings(pluginId, settings) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        
        plugin.settings = { ...plugin.settings, ...settings };
        
        // Call settings update method if available
        if (plugin.onSettingsUpdate) {
            await this.executePluginMethod(plugin, 'onSettingsUpdate', [settings]);
        }
    }
    
    searchPlugins(query) {
        const plugins = this.getInstalledPlugins();
        const queryLower = query.toLowerCase();
        
        return plugins.filter(plugin => 
            plugin.metadata.name.toLowerCase().includes(queryLower) ||
            plugin.metadata.description.toLowerCase().includes(queryLower) ||
            plugin.metadata.author.toLowerCase().includes(queryLower) ||
            (plugin.metadata.tags || []).some(tag => 
                tag.toLowerCase().includes(queryLower)
            )
        );
    }
    
    exportPlugins() {
        const plugins = this.getInstalledPlugins();
        
        return {
            plugins: plugins.map(plugin => ({
                ...plugin,
                code: null // Don't export code for security
            })),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
    
    async importPlugins(data) {
        const results = {
            successful: [],
            failed: [],
            errors: []
        };
        
        if (!data.plugins) {
            throw new Error('Invalid plugin export data');
        }
        
        for (const pluginData of data.plugins) {
            try {
                if (pluginData.code) {
                    await this.installPlugin(pluginData);
                    results.successful.push(pluginData.id);
                } else {
                    results.failed.push(pluginData.id);
                    results.errors.push(`Plugin ${pluginData.id}: No code provided`);
                }
            } catch (error) {
                results.failed.push(pluginData.id);
                results.errors.push(`Plugin ${pluginData.id}: ${error.message}`);
            }
        }
        
        return results;
    }
    
    getPluginStatistics() {
        const plugins = this.getInstalledPlugins();
        const enabled = plugins.filter(p => p.enabled);
        
        const categories = {};
        plugins.forEach(plugin => {
            const category = plugin.metadata.category || 'Other';
            categories[category] = (categories[category] || 0) + 1;
        });
        
        return {
            total: plugins.length,
            enabled: enabled.length,
            disabled: plugins.length - enabled.length,
            categories,
            hooks: this.pluginHooks.size,
            totalHookHandlers: Array.from(this.pluginHooks.values())
                .reduce((total, hooks) => total + hooks.length, 0)
        };
    }
}

// Base plugin class for plugins to extend
class BasePlugin {
    constructor() {
        this.id = null;
        this.metadata = null;
        this.settings = {};
        this.api = null;
    }
    
    // Lifecycle methods (override in plugins)
    async initialize() {
        // Called when plugin is installed/enabled
    }
    
    async cleanup() {
        // Called when plugin is uninstalled
    }
    
    async enable() {
        // Called when plugin is enabled
    }
    
    async disable() {
        // Called when plugin is disabled
    }
    
    async onSettingsUpdate(newSettings) {
        // Called when plugin settings are updated
    }
    
    // Helper methods
    log(message, ...args) {
        if (this.api) {
            this.api.console?.log(message, ...args);
        }
    }
    
    error(message, ...args) {
        if (this.api) {
            this.api.console?.error(message, ...args);
        }
    }
    
    getSetting(key, defaultValue = null) {
        return this.settings[key] ?? defaultValue;
    }
    
    setSetting(key, value) {
        this.settings[key] = value;
    }
}

module.exports = { PluginSystem, BasePlugin };