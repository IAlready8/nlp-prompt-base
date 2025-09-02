/**
 * Personal Shortcuts Manager
 * 
 * Smart keyboard shortcuts and command palette for personal productivity
 * Features: Customizable shortcuts, command palette, context-aware actions
 */

class PersonalShortcutManager {
    constructor(config = {}) {
        this.shortcuts = new Map();
        this.commandHistory = [];
        this.maxHistorySize = 50;
        this.enabled = config.enabled !== false;
        this.customShortcuts = config.customShortcuts || {};
        
        // Context tracking
        this.context = {
            currentView: 'main',
            selectedPrompts: [],
            lastAction: null,
            searchQuery: ''
        };
        
        // Setup default shortcuts
        this.setupDefaultShortcuts();
        this.setupCustomShortcuts();
        
        if (this.enabled && typeof document !== 'undefined') {
            this.bindEventListeners();
            console.log('✓ Personal Shortcuts Manager initialized');
        }
    }

    /**
     * Setup default productivity shortcuts
     */
    setupDefaultShortcuts() {
        // Core actions
        this.shortcuts.set('cmd+shift+n', {
            id: 'quick-note',
            name: 'Quick Note',
            description: 'Create a new prompt quickly',
            action: () => this.createQuickNote(),
            category: 'creation'
        });

        this.shortcuts.set('cmd+shift+f', {
            id: 'advanced-search',
            name: 'Advanced Search',
            description: 'Open advanced search interface',
            action: () => this.openAdvancedSearch(),
            category: 'navigation'
        });

        this.shortcuts.set('cmd+shift+b', {
            id: 'create-backup',
            name: 'Create Backup',
            description: 'Create manual backup',
            action: () => this.createBackup(),
            category: 'maintenance'
        });

        this.shortcuts.set('cmd+shift+i', {
            id: 'show-insights',
            name: 'Show Insights',
            description: 'Open personal analytics dashboard',
            action: () => this.showPersonalInsights(),
            category: 'analytics'
        });

        this.shortcuts.set('cmd+shift+p', {
            id: 'command-palette',
            name: 'Command Palette',
            description: 'Open command palette',
            action: () => this.openCommandPalette(),
            category: 'navigation'
        });

        // Search shortcuts
        this.shortcuts.set('/', {
            id: 'focus-search',
            name: 'Focus Search',
            description: 'Focus on search input',
            action: () => this.focusSearch(),
            category: 'navigation'
        });

        this.shortcuts.set('cmd+k', {
            id: 'clear-search',
            name: 'Clear Search',
            description: 'Clear search input',
            action: () => this.clearSearch(),
            category: 'navigation'
        });

        // Quick actions
        this.shortcuts.set('cmd+enter', {
            id: 'save-prompt',
            name: 'Save Prompt',
            description: 'Save current prompt',
            action: () => this.saveCurrentPrompt(),
            category: 'editing'
        });

        this.shortcuts.set('escape', {
            id: 'cancel-action',
            name: 'Cancel',
            description: 'Cancel current action or close modal',
            action: () => this.cancelCurrentAction(),
            category: 'navigation'
        });

        // Rating shortcuts
        for (let i = 1; i <= 5; i++) {
            this.shortcuts.set(`cmd+${i}`, {
                id: `rate-${i}`,
                name: `Rate ${i} Stars`,
                description: `Rate selected prompt ${i} stars`,
                action: () => this.rateSelectedPrompt(i),
                category: 'rating'
            });
        }
    }

    /**
     * Setup custom user-defined shortcuts
     */
    setupCustomShortcuts() {
        for (const [keys, config] of Object.entries(this.customShortcuts)) {
            this.shortcuts.set(keys, {
                id: `custom-${keys}`,
                name: config.name || 'Custom Action',
                description: config.description || 'User-defined shortcut',
                action: config.action || (() => console.log(`Custom shortcut: ${keys}`)),
                category: 'custom',
                custom: true
            });
        }
    }

    /**
     * Bind keyboard event listeners
     */
    bindEventListeners() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
    }

    /**
     * Handle keydown events
     */
    handleKeydown(event) {
        if (!this.enabled) return;

        // Don't trigger shortcuts when typing in inputs (except specific cases)
        if (this.isTypingContext(event)) {
            const allowedInInput = ['escape', 'cmd+enter', 'cmd+shift+p'];
            const shortcutKey = this.getShortcutKey(event);
            if (!allowedInInput.includes(shortcutKey)) {
                return;
            }
        }

        const shortcutKey = this.getShortcutKey(event);
        const shortcut = this.shortcuts.get(shortcutKey);

        if (shortcut) {
            event.preventDefault();
            event.stopPropagation();
            
            try {
                shortcut.action();
                this.recordCommand(shortcut);
                this.context.lastAction = shortcut.id;
                
                // Show visual feedback
                this.showShortcutFeedback(shortcut);
                
            } catch (error) {
                console.error(`Shortcut action failed: ${shortcut.name}`, error);
                this.showError(`Failed to execute: ${shortcut.name}`);
            }
        }
    }

    /**
     * Get normalized shortcut key from event
     */
    getShortcutKey(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) parts.push('cmd');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        
        const key = event.key.toLowerCase();
        if (key !== 'control' && key !== 'meta' && key !== 'alt' && key !== 'shift') {
            parts.push(key);
        }
        
        return parts.join('+');
    }

    /**
     * Check if user is typing in an input/textarea
     */
    isTypingContext(event) {
        const target = event.target;
        const tagName = target.tagName.toLowerCase();
        const isEditable = target.contentEditable === 'true';
        
        return tagName === 'input' || tagName === 'textarea' || isEditable;
    }

    /**
     * Shortcut Actions Implementation
     */

    createQuickNote() {
        console.log('Quick Note shortcut triggered');
        if (typeof window !== 'undefined' && window.showModal) {
            window.showModal('add-prompt-modal');
        }
    }

    openAdvancedSearch() {
        console.log('Advanced Search shortcut triggered');
        if (typeof window !== 'undefined' && window.showAdvancedSearch) {
            window.showAdvancedSearch();
        }
    }

    async createBackup() {
        console.log('Create Backup shortcut triggered');
        try {
            if (typeof window !== 'undefined' && window.createManualBackup) {
                await window.createManualBackup();
                this.showSuccess('Backup created successfully!');
            } else {
                this.showInfo('Backup functionality not available');
            }
        } catch (error) {
            console.error('Backup failed:', error);
            this.showError('Failed to create backup');
        }
    }

    showPersonalInsights() {
        console.log('Show Insights shortcut triggered');
        if (typeof window !== 'undefined' && window.showAnalytics) {
            window.showAnalytics();
        } else {
            this.showInfo('Analytics dashboard not available');
        }
    }

    openCommandPalette() {
        console.log('Command Palette shortcut triggered');
        // This would open a command palette modal
        this.showInfo('Command Palette: Cmd+Shift+P');
    }

    focusSearch() {
        const searchInput = document.querySelector('#search-input, .search-input, input[placeholder*="search" i]');
        if (searchInput) {
            searchInput.focus();
        }
    }

    clearSearch() {
        const searchInput = document.querySelector('#search-input, .search-input, input[placeholder*="search" i]');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }

    saveCurrentPrompt() {
        console.log('Save Current Prompt shortcut triggered');
        if (typeof window !== 'undefined' && window.saveCurrentPrompt) {
            window.saveCurrentPrompt();
        }
    }

    cancelCurrentAction() {
        // Close any open modals
        if (typeof document !== 'undefined') {
            const modals = document.querySelectorAll('.modal, .modal-overlay');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        }
    }

    rateSelectedPrompt(rating) {
        console.log(`Rate selected prompt: ${rating} stars`);
        if (typeof window !== 'undefined' && window.rateCurrentPrompt) {
            window.rateCurrentPrompt(rating);
        }
    }

    /**
     * Utility Methods
     */

    recordCommand(command) {
        this.commandHistory.unshift({
            command: command.name,
            id: command.id,
            timestamp: Date.now()
        });

        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.pop();
        }
    }

    showShortcutFeedback(shortcut) {
        if (typeof document === 'undefined') return;
        
        // Show brief visual feedback
        const feedback = document.createElement('div');
        feedback.className = 'shortcut-feedback';
        feedback.textContent = shortcut.name;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color, #007AFF);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(feedback);
        
        // Fade out after delay
        setTimeout(() => {
            feedback.style.opacity = '0';
            setTimeout(() => feedback.remove(), 300);
        }, 1500);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        if (typeof document === 'undefined') {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            opacity: 1;
            transition: opacity 0.3s ease;
        `;

        // Set colors based on type
        const colors = {
            success: { bg: '#28a745', color: 'white' },
            error: { bg: '#dc3545', color: 'white' },
            info: { bg: '#17a2b8', color: 'white' },
            warning: { bg: '#ffc107', color: 'black' }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.color;

        document.body.appendChild(notification);
        
        // Auto-remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Public API
     */

    addCustomShortcut(keys, config) {
        this.shortcuts.set(keys, {
            id: `custom-${keys}`,
            name: config.name || 'Custom Action',
            description: config.description || 'User-defined shortcut',
            action: config.action || (() => {}),
            category: 'custom',
            custom: true
        });
    }

    removeShortcut(keys) {
        return this.shortcuts.delete(keys);
    }

    getShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([keys, config]) => ({
            keys,
            ...config
        }));
    }

    getCommandHistory() {
        return [...this.commandHistory];
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }
}

// Make globally available in browser
if (typeof window !== 'undefined') {
    window.PersonalShortcutManager = PersonalShortcutManager;
}

module.exports = PersonalShortcutManager;