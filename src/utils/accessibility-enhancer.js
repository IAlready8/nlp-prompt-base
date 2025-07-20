class AccessibilityEnhancer {
    constructor(options = {}) {
        this.options = {
            enableScreenReader: options.enableScreenReader !== false,
            enableKeyboardNav: options.enableKeyboardNav !== false,
            enableHighContrast: options.enableHighContrast !== false,
            enableFocusManagement: options.enableFocusManagement !== false,
            enableARIA: options.enableARIA !== false,
            wcagLevel: options.wcagLevel || 'AA', // A, AA, AAA
            ...options
        };
        
        this.currentFocus = null;
        this.focusHistory = [];
        this.keyboardListeners = new Map();
        this.ariaLiveRegions = new Map();
        this.logger = options.logger || console;
        
        if (typeof window !== 'undefined') {
            this.initialize();
        }
    }
    
    initialize() {
        this.setupARIALiveRegions();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.enhanceExistingElements();
        this.setupHighContrastMode();
        this.setupScreenReaderSupport();
        
        this.logger.info('Accessibility enhancements initialized', {
            wcagLevel: this.options.wcagLevel,
            features: Object.keys(this.options).filter(key => this.options[key] === true)
        });
    }
    
    setupARIALiveRegions() {
        if (!this.options.enableARIA) return;
        
        // Create polite live region for non-urgent announcements
        const politeRegion = document.createElement('div');
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.setAttribute('class', 'sr-only');
        politeRegion.id = 'aria-live-polite';
        document.body.appendChild(politeRegion);
        this.ariaLiveRegions.set('polite', politeRegion);
        
        // Create assertive live region for urgent announcements
        const assertiveRegion = document.createElement('div');
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.setAttribute('class', 'sr-only');
        assertiveRegion.id = 'aria-live-assertive';
        document.body.appendChild(assertiveRegion);
        this.ariaLiveRegions.set('assertive', assertiveRegion);
        
        // Create status region for progress updates
        const statusRegion = document.createElement('div');
        statusRegion.setAttribute('role', 'status');
        statusRegion.setAttribute('aria-live', 'polite');
        statusRegion.setAttribute('class', 'sr-only');
        statusRegion.id = 'aria-status';
        document.body.appendChild(statusRegion);
        this.ariaLiveRegions.set('status', statusRegion);
    }
    
    setupKeyboardNavigation() {
        if (!this.options.enableKeyboardNav) return;
        
        const keyboardShortcuts = {
            // Navigation shortcuts
            'Alt+1': () => this.navigateToSection('prompts'),
            'Alt+2': () => this.navigateToSection('categories'),
            'Alt+3': () => this.navigateToSection('search'),
            'Alt+4': () => this.navigateToSection('analytics'),
            'Alt+5': () => this.navigateToSection('settings'),
            
            // Action shortcuts
            'Ctrl+n': (e) => {
                e.preventDefault();
                this.triggerAction('new-prompt');
            },
            'Ctrl+f': (e) => {
                e.preventDefault();
                this.focusElement('#search-input');
            },
            'Ctrl+s': (e) => {
                e.preventDefault();
                this.triggerAction('save');
            },
            'Escape': () => this.handleEscape(),
            'F1': (e) => {
                e.preventDefault();
                this.showKeyboardHelp();
            },
            
            // List navigation
            'ArrowUp': (e) => this.handleArrowNavigation(e, 'up'),
            'ArrowDown': (e) => this.handleArrowNavigation(e, 'down'),
            'ArrowLeft': (e) => this.handleArrowNavigation(e, 'left'),
            'ArrowRight': (e) => this.handleArrowNavigation(e, 'right'),
            'Home': (e) => this.handleHomeEnd(e, 'first'),
            'End': (e) => this.handleHomeEnd(e, 'last'),
            'PageUp': (e) => this.handlePageNavigation(e, 'up'),
            'PageDown': (e) => this.handlePageNavigation(e, 'down'),
            
            // Selection shortcuts
            'Ctrl+a': (e) => {
                if (this.isInSelectableArea(e.target)) {
                    e.preventDefault();
                    this.selectAll();
                }
            },
            'Space': (e) => this.handleSpaceKey(e),
            'Enter': (e) => this.handleEnterKey(e)
        };
        
        document.addEventListener('keydown', (e) => {
            const key = this.getKeyboardShortcut(e);
            const handler = keyboardShortcuts[key];
            
            if (handler) {
                handler(e);
            }
        });
        
        // Tab trap for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                this.handleTabKey(e);
            }
        });
    }
    
    setupFocusManagement() {
        if (!this.options.enableFocusManagement) return;
        
        // Track focus changes
        document.addEventListener('focusin', (e) => {
            this.currentFocus = e.target;
            this.focusHistory.push({
                element: e.target,
                timestamp: Date.now(),
                reason: 'user'
            });
            
            // Keep focus history manageable
            if (this.focusHistory.length > 50) {
                this.focusHistory = this.focusHistory.slice(-50);
            }
        });
        
        // Enhanced focus indicators
        const style = document.createElement('style');
        style.textContent = `
            .enhanced-focus {
                outline: 3px solid #007acc !important;
                outline-offset: 2px !important;
                border-radius: 4px !important;
            }
            
            .focus-ring {
                position: relative;
            }
            
            .focus-ring::after {
                content: '';
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: -4px;
                border: 2px solid #007acc;
                border-radius: 6px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .focus-ring:focus::after {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
    
    enhanceExistingElements() {
        // Enhance buttons
        this.enhanceButtons();
        
        // Enhance form controls
        this.enhanceFormControls();
        
        // Enhance interactive elements
        this.enhanceInteractiveElements();
        
        // Enhance lists and grids
        this.enhanceListsAndGrids();
        
        // Enhance navigation
        this.enhanceNavigation();
    }
    
    enhanceButtons() {
        const buttons = document.querySelectorAll('button, [role="button"]');
        
        buttons.forEach(button => {
            // Ensure proper ARIA attributes
            if (!button.hasAttribute('aria-label') && !button.textContent.trim()) {
                const icon = button.querySelector('i, svg, .icon');
                if (icon) {
                    button.setAttribute('aria-label', this.generateButtonLabel(button));
                }
            }
            
            // Add keyboard activation for custom buttons
            if (button.getAttribute('role') === 'button' && !button.hasAttribute('tabindex')) {
                button.setAttribute('tabindex', '0');
                
                button.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        button.click();
                    }
                });
            }
            
            // Enhance with focus ring
            button.classList.add('focus-ring');
        });
    }
    
    enhanceFormControls() {
        const formControls = document.querySelectorAll('input, select, textarea');
        
        formControls.forEach(control => {
            // Associate labels properly
            const label = this.findAssociatedLabel(control);
            if (label && !control.hasAttribute('aria-labelledby')) {
                if (!label.id) {
                    label.id = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                control.setAttribute('aria-labelledby', label.id);
            }
            
            // Add error message support
            const errorElement = control.parentElement.querySelector('.error-message');
            if (errorElement) {
                if (!errorElement.id) {
                    errorElement.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
                control.setAttribute('aria-describedby', errorElement.id);
                
                if (control.validity && !control.validity.valid) {
                    control.setAttribute('aria-invalid', 'true');
                }
            }
            
            // Add required field indicators
            if (control.hasAttribute('required')) {
                control.setAttribute('aria-required', 'true');
            }
        });
    }
    
    enhanceInteractiveElements() {
        // Enhance modal dialogs
        const modals = document.querySelectorAll('.modal, [role="dialog"]');
        modals.forEach(modal => this.enhanceModal(modal));
        
        // Enhance dropdown menus
        const dropdowns = document.querySelectorAll('.dropdown, [role="menu"]');
        dropdowns.forEach(dropdown => this.enhanceDropdown(dropdown));
        
        // Enhance tabs
        const tabLists = document.querySelectorAll('[role="tablist"]');
        tabLists.forEach(tabList => this.enhanceTabList(tabList));
    }
    
    enhanceListsAndGrids() {
        // Enhance prompt lists
        const promptLists = document.querySelectorAll('.prompt-list, .prompt-grid');
        promptLists.forEach(list => {
            list.setAttribute('role', 'grid');
            list.setAttribute('aria-label', 'Prompt collection');
            
            const items = list.querySelectorAll('.prompt-item');
            items.forEach((item, index) => {
                item.setAttribute('role', 'gridcell');
                item.setAttribute('tabindex', index === 0 ? '0' : '-1');
                item.setAttribute('aria-rowindex', (index + 1).toString());
                
                // Add keyboard navigation
                item.addEventListener('keydown', (e) => {
                    this.handleGridNavigation(e, item, items);
                });
            });
        });
    }
    
    enhanceNavigation() {
        const navElements = document.querySelectorAll('nav, [role="navigation"]');
        
        navElements.forEach(nav => {
            if (!nav.hasAttribute('aria-label')) {
                nav.setAttribute('aria-label', this.generateNavLabel(nav));
            }
            
            // Enhance breadcrumbs
            const breadcrumbs = nav.querySelector('.breadcrumb, [role="breadcrumb"]');
            if (breadcrumbs) {
                breadcrumbs.setAttribute('aria-label', 'Breadcrumb navigation');
            }
        });
    }
    
    setupHighContrastMode() {
        if (!this.options.enableHighContrast) return;
        
        // Detect user's contrast preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        if (prefersHighContrast) {
            this.enableHighContrastMode();
        }
        
        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addListener((e) => {
            if (e.matches) {
                this.enableHighContrastMode();
            } else {
                this.disableHighContrastMode();
            }
        });
    }
    
    setupScreenReaderSupport() {
        if (!this.options.enableScreenReader) return;
        
        // Announce page changes
        this.setupPageChangeAnnouncements();
        
        // Announce dynamic content changes
        this.setupContentChangeAnnouncements();
        
        // Add skip links
        this.addSkipLinks();
    }
    
    // Public methods for announcing content
    announce(message, priority = 'polite') {
        if (!this.options.enableARIA) return;
        
        const region = this.ariaLiveRegions.get(priority);
        if (region) {
            region.textContent = message;
            
            // Clear after announcement to allow repeat announcements
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }
    
    announceStatus(message) {
        this.announce(message, 'status');
    }
    
    announceUrgent(message) {
        this.announce(message, 'assertive');
    }
    
    // Focus management methods
    focusElement(selector) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        
        if (element) {
            element.focus();
            this.focusHistory.push({
                element,
                timestamp: Date.now(),
                reason: 'programmatic'
            });
            
            this.announce(`Focused on ${this.getElementDescription(element)}`);
        }
    }
    
    restoreFocus() {
        const lastUserFocus = this.focusHistory
            .reverse()
            .find(entry => entry.reason === 'user');
        
        if (lastUserFocus && lastUserFocus.element) {
            lastUserFocus.element.focus();
        }
    }
    
    trapFocus(container) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        const trapListener = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };
        
        container.addEventListener('keydown', trapListener);
        firstElement.focus();
        
        return () => {
            container.removeEventListener('keydown', trapListener);
        };
    }
    
    // High contrast mode
    enableHighContrastMode() {
        document.body.classList.add('high-contrast');
        this.announce('High contrast mode enabled');
    }
    
    disableHighContrastMode() {
        document.body.classList.remove('high-contrast');
        this.announce('High contrast mode disabled');
    }
    
    // Utility methods
    getFocusableElements(container = document) {
        const selector = [
            'a[href]',
            'button',
            'input',
            'select',
            'textarea',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(selector))
            .filter(element => {
                return element.offsetWidth > 0 && 
                       element.offsetHeight > 0 && 
                       !element.disabled;
            });
    }
    
    getElementDescription(element) {
        const tagName = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.textContent.trim();
        
        return `${role || tagName}${label ? ': ' + label : ''}`;
    }
    
    getKeyboardShortcut(event) {
        const parts = [];
        
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        parts.push(event.key);
        
        return parts.join('+');
    }
    
    // Helper methods for specific enhancements
    enhanceModal(modal) {
        if (!modal.hasAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        
        if (!modal.hasAttribute('aria-modal')) {
            modal.setAttribute('aria-modal', 'true');
        }
        
        // Ensure modal has accessible name
        const title = modal.querySelector('h1, h2, h3, .modal-title');
        if (title && !modal.hasAttribute('aria-labelledby')) {
            if (!title.id) {
                title.id = `modal-title-${Date.now()}`;
            }
            modal.setAttribute('aria-labelledby', title.id);
        }
        
        // Add close button enhancement
        const closeButton = modal.querySelector('.close, [aria-label*="close"]');
        if (closeButton) {
            closeButton.setAttribute('aria-label', 'Close dialog');
        }
    }
    
    enhanceDropdown(dropdown) {
        const trigger = dropdown.querySelector('[data-toggle="dropdown"], .dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu, [role="menu"]');
        
        if (trigger && menu) {
            // Set up ARIA attributes
            trigger.setAttribute('aria-haspopup', 'true');
            trigger.setAttribute('aria-expanded', 'false');
            
            if (!menu.id) {
                menu.id = `dropdown-menu-${Date.now()}`;
            }
            trigger.setAttribute('aria-controls', menu.id);
            
            // Keyboard navigation
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openDropdown(dropdown);
                }
            });
        }
    }
    
    enhanceTabList(tabList) {
        const tabs = tabList.querySelectorAll('[role="tab"]');
        const panels = document.querySelectorAll('[role="tabpanel"]');
        
        tabs.forEach((tab, index) => {
            tab.setAttribute('tabindex', index === 0 ? '0' : '-1');
            
            tab.addEventListener('keydown', (e) => {
                this.handleTabNavigation(e, tabs, panels);
            });
        });
    }
    
    // Event handlers
    handleArrowNavigation(event, direction) {
        const target = event.target;
        const role = target.getAttribute('role');
        
        if (role === 'gridcell' || target.closest('[role="grid"]')) {
            this.handleGridNavigation(event, target);
        } else if (role === 'tab') {
            this.handleTabNavigation(event, null, null);
        }
    }
    
    handleGridNavigation(event, currentItem, allItems = null) {
        if (!allItems) {
            const grid = currentItem.closest('[role="grid"]');
            allItems = grid ? Array.from(grid.querySelectorAll('[role="gridcell"]')) : [];
        }
        
        const currentIndex = allItems.indexOf(currentItem);
        let targetIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowDown':
                targetIndex = Math.min(currentIndex + 1, allItems.length - 1);
                break;
            case 'ArrowUp':
                targetIndex = Math.max(currentIndex - 1, 0);
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = allItems.length - 1;
                break;
        }
        
        if (targetIndex !== currentIndex) {
            event.preventDefault();
            allItems[currentIndex].setAttribute('tabindex', '-1');
            allItems[targetIndex].setAttribute('tabindex', '0');
            allItems[targetIndex].focus();
        }
    }
    
    handleTabNavigation(event, tabs, panels) {
        if (!tabs) {
            const tabList = event.target.closest('[role="tablist"]');
            tabs = tabList ? Array.from(tabList.querySelectorAll('[role="tab"]')) : [];
        }
        
        const currentTab = event.target;
        const currentIndex = tabs.indexOf(currentTab);
        let targetIndex = currentIndex;
        
        switch (event.key) {
            case 'ArrowLeft':
                targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                break;
            case 'ArrowRight':
                targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = tabs.length - 1;
                break;
        }
        
        if (targetIndex !== currentIndex) {
            event.preventDefault();
            this.switchTab(tabs[targetIndex], panels);
        }
    }
    
    switchTab(targetTab, panels) {
        const tabList = targetTab.parentElement;
        const allTabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
        
        // Update tab states
        allTabs.forEach(tab => {
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
        });
        
        targetTab.setAttribute('aria-selected', 'true');
        targetTab.setAttribute('tabindex', '0');
        targetTab.focus();
        
        // Update panel visibility
        if (panels) {
            const targetPanelId = targetTab.getAttribute('aria-controls');
            const targetPanel = document.getElementById(targetPanelId);
            
            panels.forEach(panel => {
                panel.hidden = true;
                panel.setAttribute('aria-hidden', 'true');
            });
            
            if (targetPanel) {
                targetPanel.hidden = false;
                targetPanel.setAttribute('aria-hidden', 'false');
            }
        }
        
        this.announce(`Switched to ${targetTab.textContent.trim()} tab`);
    }
    
    // Content announcement setup
    setupPageChangeAnnouncements() {
        // Monitor for dynamic page changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    const hasNewContent = Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        node.classList && 
                        (node.classList.contains('view') || node.classList.contains('page'))
                    );
                    
                    if (hasNewContent) {
                        this.announcePageChange(mutation.target);
                    }
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    setupContentChangeAnnouncements() {
        // Monitor for content updates
        const contentObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    const target = mutation.target;
                    
                    if (target.classList && target.classList.contains('prompt-list')) {
                        const addedCount = Array.from(mutation.addedNodes).filter(node => 
                            node.nodeType === Node.ELEMENT_NODE
                        ).length;
                        
                        const removedCount = Array.from(mutation.removedNodes).filter(node => 
                            node.nodeType === Node.ELEMENT_NODE
                        ).length;
                        
                        if (addedCount > 0) {
                            this.announce(`${addedCount} prompt${addedCount > 1 ? 's' : ''} added`);
                        }
                        
                        if (removedCount > 0) {
                            this.announce(`${removedCount} prompt${removedCount > 1 ? 's' : ''} removed`);
                        }
                    }
                }
            });
        });
        
        contentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
            <a href="#search" class="skip-link">Skip to search</a>
        `;
        
        document.body.insertBefore(skipLinks, document.body.firstChild);
        
        // Add CSS for skip links
        const style = document.createElement('style');
        style.textContent = `
            .skip-links {
                position: absolute;
                top: -40px;
                left: 6px;
                z-index: 9999;
            }
            
            .skip-link {
                position: absolute;
                left: -10000px;
                top: auto;
                width: 1px;
                height: 1px;
                overflow: hidden;
                background: #000;
                color: #fff;
                padding: 8px 16px;
                text-decoration: none;
                border-radius: 4px;
            }
            
            .skip-link:focus {
                position: static;
                width: auto;
                height: auto;
                left: auto;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Additional utility methods
    showKeyboardHelp() {
        const helpModal = document.createElement('div');
        helpModal.className = 'keyboard-help-modal';
        helpModal.setAttribute('role', 'dialog');
        helpModal.setAttribute('aria-modal', 'true');
        helpModal.setAttribute('aria-label', 'Keyboard shortcuts help');
        
        helpModal.innerHTML = `
            <div class="modal-content">
                <h2>Keyboard Shortcuts</h2>
                <div class="shortcuts-grid">
                    <div class="shortcut-group">
                        <h3>Navigation</h3>
                        <dl>
                            <dt>Alt + 1</dt><dd>Go to Prompts</dd>
                            <dt>Alt + 2</dt><dd>Go to Categories</dd>
                            <dt>Alt + 3</dt><dd>Go to Search</dd>
                            <dt>Alt + 4</dt><dd>Go to Analytics</dd>
                            <dt>Alt + 5</dt><dd>Go to Settings</dd>
                        </dl>
                    </div>
                    <div class="shortcut-group">
                        <h3>Actions</h3>
                        <dl>
                            <dt>Ctrl + N</dt><dd>New Prompt</dd>
                            <dt>Ctrl + F</dt><dd>Focus Search</dd>
                            <dt>Ctrl + S</dt><dd>Save</dd>
                            <dt>Escape</dt><dd>Close/Cancel</dd>
                        </dl>
                    </div>
                    <div class="shortcut-group">
                        <h3>List Navigation</h3>
                        <dl>
                            <dt>Arrow Keys</dt><dd>Navigate items</dd>
                            <dt>Home/End</dt><dd>First/Last item</dd>
                            <dt>Page Up/Down</dt><dd>Scroll by page</dd>
                            <dt>Space</dt><dd>Select item</dd>
                            <dt>Enter</dt><dd>Activate item</dd>
                        </dl>
                    </div>
                </div>
                <button class="close-button" aria-label="Close help">Close</button>
            </div>
        `;
        
        document.body.appendChild(helpModal);
        
        const closeButton = helpModal.querySelector('.close-button');
        const removeFocusTrap = this.trapFocus(helpModal);
        
        const closeModal = () => {
            removeFocusTrap();
            document.body.removeChild(helpModal);
            this.restoreFocus();
        };
        
        closeButton.addEventListener('click', closeModal);
        helpModal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }
    
    announcePageChange(container) {
        const title = container.querySelector('h1, h2, .page-title');
        if (title) {
            this.announce(`Navigated to ${title.textContent.trim()}`);
        }
    }
    
    generateButtonLabel(button) {
        const icon = button.querySelector('i, svg, .icon');
        const classList = Array.from(button.classList);
        
        // Common button patterns
        if (classList.includes('edit')) return 'Edit';
        if (classList.includes('delete')) return 'Delete';
        if (classList.includes('save')) return 'Save';
        if (classList.includes('cancel')) return 'Cancel';
        if (classList.includes('close')) return 'Close';
        if (classList.includes('menu')) return 'Menu';
        if (classList.includes('search')) return 'Search';
        
        return 'Button';
    }
    
    generateNavLabel(nav) {
        const classList = Array.from(nav.classList);
        
        if (classList.includes('main-nav')) return 'Main navigation';
        if (classList.includes('breadcrumb')) return 'Breadcrumb navigation';
        if (classList.includes('pagination')) return 'Pagination navigation';
        if (classList.includes('sidebar-nav')) return 'Sidebar navigation';
        
        return 'Navigation';
    }
    
    findAssociatedLabel(control) {
        // Look for label by for attribute
        if (control.id) {
            const label = document.querySelector(`label[for="${control.id}"]`);
            if (label) return label;
        }
        
        // Look for wrapping label
        const wrappingLabel = control.closest('label');
        if (wrappingLabel) return wrappingLabel;
        
        // Look for nearby label
        const previousLabel = control.previousElementSibling;
        if (previousLabel && previousLabel.tagName === 'LABEL') {
            return previousLabel;
        }
        
        return null;
    }
    
    // Validation and testing methods
    validateAccessibility() {
        const issues = [];
        
        // Check for missing alt text on images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('alt')) {
                issues.push(`Image missing alt text: ${img.src}`);
            }
        });
        
        // Check for form controls without labels
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type !== 'hidden' && !this.findAssociatedLabel(input) && !input.hasAttribute('aria-label')) {
                issues.push(`Form control missing label: ${input.name || input.id || 'unnamed'}`);
            }
        });
        
        // Check for buttons without accessible names
        const buttons = document.querySelectorAll('button, [role="button"]');
        buttons.forEach(button => {
            if (!button.textContent.trim() && !button.hasAttribute('aria-label')) {
                issues.push('Button without accessible name found');
            }
        });
        
        // Check for proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let previousLevel = 0;
        headings.forEach(heading => {
            const currentLevel = parseInt(heading.tagName.charAt(1));
            if (currentLevel > previousLevel + 1) {
                issues.push(`Heading hierarchy skip: ${heading.tagName} after h${previousLevel}`);
            }
            previousLevel = currentLevel;
        });
        
        return {
            valid: issues.length === 0,
            issues: issues,
            wcagLevel: this.options.wcagLevel
        };
    }
    
    getAccessibilityReport() {
        const validation = this.validateAccessibility();
        
        return {
            ...validation,
            features: {
                screenReader: this.options.enableScreenReader,
                keyboardNav: this.options.enableKeyboardNav,
                focusManagement: this.options.enableFocusManagement,
                highContrast: this.options.enableHighContrast,
                ariaSupport: this.options.enableARIA
            },
            metrics: {
                focusableElements: this.getFocusableElements().length,
                ariaLabels: document.querySelectorAll('[aria-label]').length,
                skipLinks: document.querySelectorAll('.skip-link').length,
                liveRegions: this.ariaLiveRegions.size
            },
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = AccessibilityEnhancer;