class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.metricsHistory = [];
        this.maxHistorySize = options.maxHistorySize || 1000;
        this.alertThresholds = {
            responseTime: options.responseTimeThreshold || 5000, // 5 seconds
            memoryUsage: options.memoryUsageThreshold || 500, // 500 MB
            errorRate: options.errorRateThreshold || 0.1 // 10%
        };
        this.alerts = [];
        this.startTime = Date.now();
        
        if (this.enabled) {
            this.startPeriodicCollection();
        }
    }
    
    startPeriodicCollection() {
        // Collect metrics every 30 seconds
        this.metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);
        
        // Clean up old metrics every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 300000);
    }
    
    collectSystemMetrics() {
        if (!this.enabled) return;
        
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const metrics = {
            timestamp: Date.now(),
            memory: {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            uptime: process.uptime(),
            eventLoopDelay: this.measureEventLoopDelay(),
            activeConnections: this.getActiveConnections()
        };
        
        this.addMetric(metrics);
        this.checkAlerts(metrics);
        
        return metrics;
    }
    
    measureEventLoopDelay() {
        const start = process.hrtime();
        return new Promise(resolve => {
            setImmediate(() => {
                const delta = process.hrtime(start);
                const delay = (delta[0] * 1e9 + delta[1]) / 1e6; // Convert to milliseconds
                resolve(delay);
            });
        });
    }
    
    getActiveConnections() {
        // This would need to be implemented based on your server setup
        // For now, return a placeholder
        return 0;
    }
    
    addMetric(metric) {
        this.metricsHistory.push(metric);
        
        // Keep only recent metrics
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
        }
    }
    
    cleanupOldMetrics() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.metricsHistory = this.metricsHistory.filter(metric => 
            metric.timestamp > oneHourAgo
        );
    }
    
    checkAlerts(metrics) {
        const alerts = [];
        
        // Memory usage alert
        if (metrics.memory.heapUsedMB > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'memory',
                level: 'warning',
                message: `High memory usage: ${metrics.memory.heapUsedMB}MB`,
                threshold: this.alertThresholds.memoryUsage,
                current: metrics.memory.heapUsedMB,
                timestamp: metrics.timestamp
            });
        }
        
        // Event loop delay alert
        if (typeof metrics.eventLoopDelay === 'number' && metrics.eventLoopDelay > 100) {
            alerts.push({
                type: 'eventLoop',
                level: 'warning',
                message: `High event loop delay: ${metrics.eventLoopDelay.toFixed(2)}ms`,
                threshold: 100,
                current: metrics.eventLoopDelay,
                timestamp: metrics.timestamp
            });
        }
        
        this.alerts.push(...alerts);
        
        // Keep only recent alerts (last 100)
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
        
        return alerts;
    }
    
    getMetrics(timeRange = 3600000) { // Default: last hour
        const cutoff = Date.now() - timeRange;
        return this.metricsHistory.filter(metric => metric.timestamp > cutoff);
    }
    
    getAverageMetrics(timeRange = 3600000) {
        const recentMetrics = this.getMetrics(timeRange);
        
        if (recentMetrics.length === 0) {
            return null;
        }
        
        const totals = recentMetrics.reduce((acc, metric) => {
            acc.memory.rss += metric.memory.rss;
            acc.memory.heapUsed += metric.memory.heapUsed;
            acc.memory.heapTotal += metric.memory.heapTotal;
            acc.uptime = metric.uptime; // Use latest uptime
            return acc;
        }, {
            memory: { rss: 0, heapUsed: 0, heapTotal: 0 },
            uptime: 0
        });
        
        const count = recentMetrics.length;
        
        return {
            averageMemory: {
                rss: Math.round(totals.memory.rss / count / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round(totals.memory.heapUsed / count / 1024 / 1024 * 100) / 100,
                heapTotal: Math.round(totals.memory.heapTotal / count / 1024 / 1024 * 100) / 100
            },
            uptime: totals.uptime,
            sampleCount: count,
            timeRange: timeRange / 1000 / 60 // Convert to minutes
        };
    }
    
    getHealthStatus() {
        const recentMetrics = this.getMetrics(300000); // Last 5 minutes
        const recentAlerts = this.alerts.filter(alert => 
            alert.timestamp > Date.now() - 300000
        );
        
        let status = 'healthy';
        const issues = [];
        
        if (recentAlerts.length > 0) {
            status = 'warning';
            issues.push(`${recentAlerts.length} recent alerts`);
        }
        
        if (recentMetrics.length > 0) {
            const latestMetric = recentMetrics[recentMetrics.length - 1];
            
            if (latestMetric.memory.heapUsedMB > this.alertThresholds.memoryUsage) {
                status = 'critical';
                issues.push('High memory usage');
            }
        }
        
        return {
            status,
            issues,
            uptime: process.uptime(),
            startTime: this.startTime,
            lastCheck: Date.now(),
            metricsCollected: this.metricsHistory.length,
            recentAlerts: recentAlerts.length
        };
    }
    
    generateReport() {
        const health = this.getHealthStatus();
        const averages = this.getAverageMetrics();
        const recentAlerts = this.alerts.slice(-10); // Last 10 alerts
        
        return {
            health,
            averages,
            recentAlerts,
            summary: {
                totalMetricsCollected: this.metricsHistory.length,
                totalAlerts: this.alerts.length,
                monitoringEnabled: this.enabled,
                thresholds: this.alertThresholds
            }
        };
    }
    
    measureRequestTime(req, res, next) {
        if (!this.enabled) {
            return next();
        }
        
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            
            // Log slow requests
            if (duration > this.alertThresholds.responseTime) {
                this.alerts.push({
                    type: 'slowRequest',
                    level: 'warning',
                    message: `Slow request: ${req.method} ${req.url} took ${duration}ms`,
                    threshold: this.alertThresholds.responseTime,
                    current: duration,
                    timestamp: Date.now(),
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode
                });
            }
            
            // Add to metrics
            this.addMetric({
                type: 'request',
                timestamp: Date.now(),
                method: req.method,
                url: req.url,
                statusCode: res.statusCode,
                duration,
                userAgent: req.get('User-Agent')
            });
        });
        
        next();
    }
    
    stop() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.enabled = false;
    }
    
    // Method to export metrics for external monitoring systems
    exportMetrics() {
        return {
            metrics: this.metricsHistory,
            alerts: this.alerts,
            health: this.getHealthStatus(),
            averages: this.getAverageMetrics()
        };
    }
}

module.exports = PerformanceMonitor;