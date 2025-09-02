/**
 * Personal Analytics Dashboard
 * 
 * Comprehensive analytics and insights for personal productivity
 * Features: Charts, trends, productivity tracking, personal goals
 */

class PersonalAnalyticsDashboard {
    constructor(config = {}) {
        this.config = {
            refreshInterval: config.refreshInterval || 300000, // 5 minutes
            chartTheme: config.chartTheme || 'dark',
            showGoals: config.showGoals !== false,
            autoRefresh: config.autoRefresh !== false
        };
        
        this.charts = new Map();
        this.data = null;
        this.goals = new Map();
        this.refreshTimer = null;
        
        // Initialize default goals
        this.setupDefaultGoals();
        
        console.log('✓ Personal Analytics Dashboard initialized');
    }

    /**
     * Initialize analytics dashboard
     */
    async init(containerSelector = '#analytics-dashboard') {
        try {
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                console.warn('Analytics container not found');
                return false;
            }

            // Load data
            await this.loadData();
            
            // Render dashboard
            this.renderDashboard();
            
            // Setup auto-refresh
            if (this.config.autoRefresh) {
                this.startAutoRefresh();
            }
            
            console.log('✓ Analytics dashboard initialized');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize analytics dashboard:', error);
            return false;
        }
    }

    /**
     * Load analytics data
     */
    async loadData() {
        try {
            // Get data from various sources
            const prompts = await this.getPromptsData();
            const performance = await this.getPerformanceData();
            const usage = await this.getUsageData();
            
            this.data = {
                prompts,
                performance,
                usage,
                timestamp: Date.now()
            };
            
            return this.data;
            
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.data = this.getEmptyData();
            return this.data;
        }
    }

    /**
     * Get prompts analytics data
     */
    async getPromptsData() {
        try {
            if (typeof window !== 'undefined' && window.database) {
                const analytics = await window.database.getAnalytics();
                return analytics;
            }
            
            // Fallback API call
            const response = await fetch('/api/analytics');
            if (response.ok) {
                return await response.json();
            }
            
            return this.getDefaultPromptsData();
            
        } catch (error) {
            console.error('Failed to get prompts data:', error);
            return this.getDefaultPromptsData();
        }
    }

    /**
     * Get performance data
     */
    async getPerformanceData() {
        try {
            if (typeof window !== 'undefined' && window.performanceMonitor) {
                return window.performanceMonitor.getStats();
            }
            
            return {
                operations: {},
                memory: { current: { used: 0, total: 0 } },
                uptime: { totalMinutes: 0, formatted: '0h 0m' }
            };
            
        } catch (error) {
            console.error('Failed to get performance data:', error);
            return {};
        }
    }

    /**
     * Get usage patterns data
     */
    async getUsageData() {
        try {
            // This would come from local storage or usage tracking
            const usage = JSON.parse(localStorage.getItem('nlp_usage_data') || '{}');
            return {
                dailyUsage: usage.dailyUsage || [],
                topCategories: usage.topCategories || [],
                searchQueries: usage.searchQueries || [],
                shortcuts: usage.shortcuts || []
            };
            
        } catch (error) {
            console.error('Failed to get usage data:', error);
            return {
                dailyUsage: [],
                topCategories: [],
                searchQueries: [],
                shortcuts: []
            };
        }
    }

    /**
     * Render complete dashboard
     */
    renderDashboard() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="analytics-dashboard">
                <div class="dashboard-header">
                    <h2>📊 Personal Analytics</h2>
                    <div class="dashboard-controls">
                        <button id="refresh-analytics" class="btn-secondary">Refresh</button>
                        <button id="export-analytics" class="btn-secondary">Export</button>
                        <button id="analytics-settings" class="btn-secondary">Settings</button>
                    </div>
                </div>
                
                <div class="analytics-grid">
                    <!-- Overview Cards -->
                    <div class="overview-cards">
                        ${this.renderOverviewCards()}
                    </div>
                    
                    <!-- Main Charts -->
                    <div class="chart-section">
                        <div class="chart-container">
                            <h3>📈 Productivity Trends</h3>
                            <canvas id="productivity-chart"></canvas>
                        </div>
                        
                        <div class="chart-container">
                            <h3>📊 Category Distribution</h3>
                            <canvas id="category-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Secondary Charts -->
                    <div class="chart-section-secondary">
                        <div class="chart-container">
                            <h3>🏷️ Top Tags</h3>
                            <canvas id="tags-chart"></canvas>
                        </div>
                        
                        <div class="chart-container">
                            <h3>⭐ Quality Metrics</h3>
                            <canvas id="quality-chart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Goals Section -->
                    ${this.config.showGoals ? `
                    <div class="goals-section">
                        <h3>🎯 Personal Goals</h3>
                        <div id="goals-container">
                            ${this.renderGoals()}
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Insights Section -->
                    <div class="insights-section">
                        <h3>💡 Personal Insights</h3>
                        <div id="insights-container">
                            ${this.renderInsights()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind events
        this.bindDashboardEvents();
        
        // Render charts
        this.renderCharts();
    }

    /**
     * Render overview cards
     */
    renderOverviewCards() {
        const data = this.data?.prompts || {};
        
        return `
            <div class="overview-card">
                <div class="card-value">${data.totalPrompts || 0}</div>
                <div class="card-label">Total Prompts</div>
                <div class="card-trend">+${this.calculateGrowth('prompts')}%</div>
            </div>
            
            <div class="overview-card">
                <div class="card-value">${(data.averageRating || 0).toFixed(1)}</div>
                <div class="card-label">Avg Rating</div>
                <div class="card-trend">⭐</div>
            </div>
            
            <div class="overview-card">
                <div class="card-value">${Object.keys(data.categories || {}).length}</div>
                <div class="card-label">Categories</div>
                <div class="card-trend">📂</div>
            </div>
            
            <div class="overview-card">
                <div class="card-value">${(data.topTags || []).length}</div>
                <div class="card-label">Active Tags</div>
                <div class="card-trend">🏷️</div>
            </div>
            
            <div class="overview-card">
                <div class="card-value">${this.calculateEfficiency()}%</div>
                <div class="card-label">Efficiency</div>
                <div class="card-trend">${this.getEfficiencyTrend()}</div>
            </div>
            
            <div class="overview-card">
                <div class="card-value">${this.data?.performance?.uptime?.formatted || '0h 0m'}</div>
                <div class="card-label">Session Time</div>
                <div class="card-trend">⏱️</div>
            </div>
        `;
    }

    /**
     * Render personal goals
     */
    renderGoals() {
        let html = '';
        
        for (const [id, goal] of this.goals) {
            const progress = this.calculateGoalProgress(goal);
            const progressPercent = Math.min(100, (progress / goal.target) * 100);
            
            html += `
                <div class="goal-item" data-goal-id="${id}">
                    <div class="goal-header">
                        <div class="goal-title">${goal.title}</div>
                        <div class="goal-progress-text">${progress}/${goal.target}</div>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <div class="goal-meta">
                        <span class="goal-period">${goal.period}</span>
                        <span class="goal-status ${progressPercent >= 100 ? 'completed' : 'active'}">${progressPercent >= 100 ? '✅ Completed' : '🔄 In Progress'}</span>
                    </div>
                </div>
            `;
        }
        
        return html;
    }

    /**
     * Render insights
     */
    renderInsights() {
        const insights = this.generateInsights();
        
        let html = '';
        for (const insight of insights) {
            html += `
                <div class="insight-item ${insight.type}">
                    <div class="insight-icon">${insight.icon}</div>
                    <div class="insight-content">
                        <div class="insight-title">${insight.title}</div>
                        <div class="insight-description">${insight.description}</div>
                    </div>
                    <div class="insight-action">
                        ${insight.action ? `<button class="btn-small" onclick="${insight.action}">${insight.actionLabel}</button>` : ''}
                    </div>
                </div>
            `;
        }
        
        return html || '<div class="no-insights">No insights available yet. Keep using the app to generate insights!</div>';
    }

    /**
     * Render charts using Chart.js
     */
    renderCharts() {
        // Wait for next tick to ensure DOM is ready
        setTimeout(() => {
            this.renderProductivityChart();
            this.renderCategoryChart();
            this.renderTagsChart();
            this.renderQualityChart();
        }, 100);
    }

    /**
     * Render productivity trends chart
     */
    renderProductivityChart() {
        const ctx = document.getElementById('productivity-chart');
        if (!ctx || !window.Chart) {
            console.warn('Chart.js not available or canvas not found');
            return;
        }

        const data = this.data?.prompts?.monthlyStats || {};
        const months = Object.keys(data).sort().slice(-6); // Last 6 months
        const counts = months.map(month => data[month] || 0);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months.map(month => {
                    const date = new Date(month + '-01');
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: [{
                    label: 'Prompts Created',
                    data: counts,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monthly Prompt Creation Trend'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        this.charts.set('productivity', chart);
    }

    /**
     * Render category distribution chart
     */
    renderCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx || !window.Chart) return;

        const data = this.data?.prompts?.categories || {};
        const labels = Object.keys(data).slice(0, 6); // Top 6 categories
        const counts = labels.map(label => data[label]);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#007AFF', '#34C759', '#FF9500', '#FF3B30',
                        '#AF52DE', '#00C7BE', '#FFD60A', '#FF69B4'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        this.charts.set('category', chart);
    }

    /**
     * Render top tags chart
     */
    renderTagsChart() {
        const ctx = document.getElementById('tags-chart');
        if (!ctx || !window.Chart) return;

        const data = this.data?.prompts?.topTags || [];
        const topTags = data.slice(0, 8); // Top 8 tags

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topTags.map(item => item.tag),
                datasets: [{
                    label: 'Usage Count',
                    data: topTags.map(item => item.count),
                    backgroundColor: '#34C759',
                    borderColor: '#30D158',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        this.charts.set('tags', chart);
    }

    /**
     * Render quality metrics chart
     */
    renderQualityChart() {
        const ctx = document.getElementById('quality-chart');
        if (!ctx || !window.Chart) return;

        // Calculate quality distribution by rating
        const prompts = this.getPromptsFromData();
        const ratingCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        
        prompts.forEach(prompt => {
            const rating = prompt.rating || 0;
            if (rating >= 1 && rating <= 5) {
                ratingCounts[rating.toString()]++;
            }
        });

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                datasets: [{
                    label: 'Number of Prompts',
                    data: Object.values(ratingCounts),
                    backgroundColor: [
                        '#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        this.charts.set('quality', chart);
    }

    /**
     * Bind dashboard events
     */
    bindDashboardEvents() {
        const refreshBtn = document.getElementById('refresh-analytics');
        const exportBtn = document.getElementById('export-analytics');
        const settingsBtn = document.getElementById('analytics-settings');

        if (refreshBtn) {
            refreshBtn.onclick = () => this.refresh();
        }

        if (exportBtn) {
            exportBtn.onclick = () => this.exportAnalytics();
        }

        if (settingsBtn) {
            settingsBtn.onclick = () => this.showSettings();
        }
    }

    /**
     * Setup default personal goals
     */
    setupDefaultGoals() {
        this.goals.set('daily-prompts', {
            id: 'daily-prompts',
            title: 'Daily Prompt Creation',
            description: 'Create at least 3 prompts per day',
            type: 'daily',
            target: 3,
            period: 'day',
            metric: 'prompts_created'
        });

        this.goals.set('weekly-organization', {
            id: 'weekly-organization',
            title: 'Weekly Organization',
            description: 'Organize and categorize at least 10 prompts per week',
            type: 'weekly',
            target: 10,
            period: 'week',
            metric: 'prompts_organized'
        });

        this.goals.set('monthly-quality', {
            id: 'monthly-quality',
            title: 'Monthly Quality Goal',
            description: 'Maintain average rating above 4.0',
            type: 'monthly',
            target: 4.0,
            period: 'month',
            metric: 'average_rating'
        });
    }

    /**
     * Calculate goal progress
     */
    calculateGoalProgress(goal) {
        const prompts = this.getPromptsFromData();
        const now = new Date();
        
        switch (goal.metric) {
            case 'prompts_created':
                return this.countRecentPrompts(prompts, goal.period);
            case 'prompts_organized':
                return this.countOrganizedPrompts(prompts, goal.period);
            case 'average_rating':
                return this.calculateAverageRating(prompts, goal.period);
            default:
                return 0;
        }
    }

    /**
     * Generate personal insights
     */
    generateInsights() {
        const insights = [];
        const prompts = this.getPromptsFromData();
        
        // Productivity insights
        if (prompts.length > 0) {
            const avgRating = this.calculateAverageRating(prompts);
            if (avgRating < 3.5) {
                insights.push({
                    type: 'improvement',
                    icon: '📈',
                    title: 'Quality Opportunity',
                    description: `Your average rating is ${avgRating.toFixed(1)}. Consider reviewing and improving lower-rated prompts.`,
                    action: 'window.showLowRatedPrompts && window.showLowRatedPrompts()',
                    actionLabel: 'Review'
                });
            }
        }

        // Organization insights
        const untaggedCount = prompts.filter(p => !p.tags || p.tags.length === 0).length;
        if (untaggedCount > 5) {
            insights.push({
                type: 'organization',
                icon: '🏷️',
                title: 'Tag Your Prompts',
                description: `You have ${untaggedCount} untagged prompts. Adding tags improves organization and searchability.`,
                action: 'window.showUntaggedPrompts && window.showUntaggedPrompts()',
                actionLabel: 'Add Tags'
            });
        }

        // Usage insights
        const recentPrompts = this.countRecentPrompts(prompts, 'week');
        if (recentPrompts === 0) {
            insights.push({
                type: 'usage',
                icon: '💡',
                title: 'Stay Active',
                description: 'You haven\'t created any prompts this week. Regular practice helps maintain creativity.',
                action: 'window.showModal && window.showModal("add-prompt-modal")',
                actionLabel: 'Create Prompt'
            });
        }

        // Goal insights
        let completedGoals = 0;
        for (const [id, goal] of this.goals) {
            const progress = this.calculateGoalProgress(goal);
            if (progress >= goal.target) {
                completedGoals++;
            }
        }

        if (completedGoals > 0) {
            insights.push({
                type: 'achievement',
                icon: '🎉',
                title: 'Goals Achieved!',
                description: `Congratulations! You've completed ${completedGoals} personal goal${completedGoals > 1 ? 's' : ''} recently.`,
                actionLabel: 'View Goals'
            });
        }

        return insights;
    }

    /**
     * Utility methods
     */

    getPromptsFromData() {
        if (typeof window !== 'undefined' && window.database && window.database.data) {
            return window.database.data.prompts || [];
        }
        return this.data?.prompts?.prompts || [];
    }

    countRecentPrompts(prompts, period) {
        const now = new Date();
        const cutoff = new Date();
        
        switch (period) {
            case 'day':
                cutoff.setDate(now.getDate() - 1);
                break;
            case 'week':
                cutoff.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoff.setMonth(now.getMonth() - 1);
                break;
        }

        return prompts.filter(prompt => {
            const created = new Date(prompt.createdAt || prompt.created_at);
            return created >= cutoff;
        }).length;
    }

    countOrganizedPrompts(prompts, period) {
        // Count prompts that have been recently categorized or tagged
        return this.countRecentPrompts(prompts.filter(p => 
            (p.category && p.category !== 'General') || (p.tags && p.tags.length > 0)
        ), period);
    }

    calculateAverageRating(prompts, period = null) {
        let targetPrompts = prompts;
        
        if (period) {
            targetPrompts = this.getRecentPrompts(prompts, period);
        }
        
        if (targetPrompts.length === 0) return 0;
        
        const total = targetPrompts.reduce((sum, p) => sum + (p.rating || 0), 0);
        return total / targetPrompts.length;
    }

    getRecentPrompts(prompts, period) {
        const now = new Date();
        const cutoff = new Date();
        
        switch (period) {
            case 'day':
                cutoff.setDate(now.getDate() - 1);
                break;
            case 'week':
                cutoff.setDate(now.getDate() - 7);
                break;
            case 'month':
                cutoff.setMonth(now.getMonth() - 1);
                break;
        }

        return prompts.filter(prompt => {
            const created = new Date(prompt.createdAt || prompt.created_at);
            return created >= cutoff;
        });
    }

    calculateGrowth(metric) {
        // Placeholder for growth calculation
        return Math.floor(Math.random() * 20); // Random growth for demo
    }

    calculateEfficiency() {
        const prompts = this.getPromptsFromData();
        if (prompts.length === 0) return 0;
        
        const avgRating = this.calculateAverageRating(prompts);
        const categorizedRatio = prompts.filter(p => p.category && p.category !== 'General').length / prompts.length;
        const taggedRatio = prompts.filter(p => p.tags && p.tags.length > 0).length / prompts.length;
        
        return Math.round(((avgRating / 5) * 0.4 + categorizedRatio * 0.3 + taggedRatio * 0.3) * 100);
    }

    getEfficiencyTrend() {
        const efficiency = this.calculateEfficiency();
        if (efficiency >= 80) return '🔥';
        if (efficiency >= 60) return '📈';
        if (efficiency >= 40) return '⚡';
        return '💪';
    }

    getEmptyData() {
        return {
            prompts: {
                totalPrompts: 0,
                averageRating: 0,
                categories: {},
                topTags: [],
                monthlyStats: {}
            },
            performance: {
                operations: {},
                memory: { current: { used: 0, total: 0 } },
                uptime: { totalMinutes: 0, formatted: '0h 0m' }
            },
            usage: {
                dailyUsage: [],
                topCategories: [],
                searchQueries: [],
                shortcuts: []
            }
        };
    }

    getDefaultPromptsData() {
        return {
            totalPrompts: 0,
            averageRating: 0,
            categories: {},
            topTags: [],
            monthlyStats: {}
        };
    }

    /**
     * Dashboard actions
     */

    async refresh() {
        try {
            console.log('Refreshing analytics...');
            await this.loadData();
            this.renderDashboard();
            console.log('✓ Analytics refreshed');
        } catch (error) {
            console.error('Failed to refresh analytics:', error);
        }
    }

    exportAnalytics() {
        try {
            const exportData = {
                data: this.data,
                goals: Object.fromEntries(this.goals),
                insights: this.generateInsights(),
                exported: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('✓ Analytics exported');
        } catch (error) {
            console.error('Failed to export analytics:', error);
        }
    }

    showSettings() {
        console.log('Analytics settings (not implemented)');
        // This would open a settings modal
    }

    startAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.refreshTimer = setInterval(() => {
            this.refresh();
        }, this.config.refreshInterval);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
        
        // Destroy charts
        for (const chart of this.charts.values()) {
            chart.destroy();
        }
        this.charts.clear();
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.PersonalAnalyticsDashboard = PersonalAnalyticsDashboard;
}

module.exports = PersonalAnalyticsDashboard;