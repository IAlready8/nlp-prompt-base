/**
 * Personal Performance Monitoring System
 * 
 * Lightweight performance monitoring optimized for personal use
 * Features: Memory tracking, operation timing, resource monitoring
 */

class PersonalPerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.memorySnapshots = [];
        this.alerts = [];
        this.thresholds = {
            slowOperation: 100, // ms
            memoryWarning: 0.8, // 80% of available
            highCpuUsage: 0.7   // 70%
        };
        this.maxSnapshots = 100;
        this.startTime = Date.now();
        
        // Start periodic monitoring
        this.startPeriodicMonitoring();
    }

    /**
     * Start timing an operation
     */
    startTimer(operation) {
        const start = performance.now();
        const memoryBefore = this.getMemoryUsage();
        
        return () => {
            const duration = performance.now() - start;
            const memoryAfter = this.getMemoryUsage();
            
            this.recordMetric(operation, {
                duration,
                memoryBefore,
                memoryAfter,
                memoryDelta: memoryAfter.used - memoryBefore.used,
                timestamp: Date.now()
            });
            
            // Log slow operations for optimization
            if (duration > this.thresholds.slowOperation) {
                this.logSlowOperation(operation, duration);
            }
            
            return { duration, memory: memoryAfter };
        };
    }

    /**
     * Record performance metric
     */
    recordMetric(operation, data) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        
        const operationMetrics = this.metrics.get(operation);
        operationMetrics.push(data);
        
        // Keep only recent metrics to prevent memory bloat
        if (operationMetrics.length > this.maxSnapshots) {
            operationMetrics.shift();
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage() {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            return {
                used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
                total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
                external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
                rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
                timestamp: Date.now()
            };
        }
        
        // Browser fallback (limited info)
        if (typeof performance !== 'undefined' && performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100,
                timestamp: Date.now()
            };
        }
        
        return { used: 0, total: 0, timestamp: Date.now() };
    }

    /**
     * Take a memory snapshot
     */
    takeMemorySnapshot() {
        const snapshot = this.getMemoryUsage();
        this.memorySnapshots.push(snapshot);
        
        // Keep only recent snapshots
        if (this.memorySnapshots.length > this.maxSnapshots) {
            this.memorySnapshots.shift();
        }
        
        // Check for memory warnings
        this.checkMemoryThresholds(snapshot);
        
        return snapshot;
    }

    /**
     * Check memory usage against thresholds
     */
    checkMemoryThresholds(snapshot) {
        if (snapshot.total > 0) {
            const usageRatio = snapshot.used / snapshot.total;
            
            if (usageRatio > this.thresholds.memoryWarning) {
                this.addAlert('memory_warning', {
                    message: `High memory usage: ${(usageRatio * 100).toFixed(1)}%`,
                    usage: snapshot,
                    severity: usageRatio > 0.9 ? 'critical' : 'warning',
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Add performance alert
     */
    addAlert(type, data) {
        this.alerts.push({ type, ...data });
        
        // Keep only recent alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
        
        // Log critical alerts
        if (data.severity === 'critical') {
            console.warn(`🚨 Critical Performance Alert: ${data.message}`);
        } else if (data.severity === 'warning') {
            console.warn(`⚠️ Performance Warning: ${data.message}`);
        }
    }

    /**
     * Log slow operation
     */
    logSlowOperation(operation, duration) {
        const message = `Slow operation: ${operation} took ${duration.toFixed(2)}ms`;
        console.warn(`⚠️ ${message}`);
        
        this.addAlert('slow_operation', {
            message,
            operation,
            duration,
            severity: duration > 1000 ? 'critical' : 'warning',
            timestamp: Date.now()
        });
    }

    /**
     * Get comprehensive performance statistics
     */
    getStats() {
        const stats = {
            operations: {},
            memory: this.getMemoryStats(),
            alerts: this.getRecentAlerts(),
            uptime: this.getUptime(),
            systemInfo: this.getSystemInfo()
        };
        
        // Calculate operation statistics
        for (const [operation, metrics] of this.metrics) {
            if (metrics.length === 0) continue;
            
            const durations = metrics.map(m => m.duration);
            const memoryDeltas = metrics.map(m => m.memoryDelta || 0);
            
            stats.operations[operation] = {
                count: metrics.length,
                duration: {
                    avg: this.average(durations),
                    min: Math.min(...durations),
                    max: Math.max(...durations),
                    p95: this.percentile(durations, 95),
                    p99: this.percentile(durations, 99)
                },
                memory: {
                    avgDelta: this.average(memoryDeltas),
                    maxDelta: Math.max(...memoryDeltas),
                    minDelta: Math.min(...memoryDeltas)
                },
                frequency: metrics.length / this.getUptimeMinutes() // operations per minute
            };
        }
        
        return stats;
    }

    /**
     * Get memory statistics
     */
    getMemoryStats() {
        if (this.memorySnapshots.length === 0) {
            return { current: this.getMemoryUsage(), history: [] };
        }
        
        const current = this.memorySnapshots[this.memorySnapshots.length - 1];
        const usedMemory = this.memorySnapshots.map(s => s.used);
        
        return {
            current,
            peak: Math.max(...usedMemory),
            average: this.average(usedMemory),
            trend: this.calculateTrend(usedMemory),
            history: this.memorySnapshots.slice(-20) // Last 20 snapshots
        };
    }

    /**
     * Calculate trend (positive = increasing, negative = decreasing)
     */
    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const recent = values.slice(-10); // Last 10 values
        const older = values.slice(-20, -10); // Previous 10 values
        
        if (older.length === 0) return 0;
        
        const recentAvg = this.average(recent);
        const olderAvg = this.average(older);
        
        return ((recentAvg - olderAvg) / olderAvg * 100); // Percentage change
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts(minutes = 60) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.alerts.filter(alert => alert.timestamp > cutoff);
    }

    /**
     * Get system uptime in minutes
     */
    getUptimeMinutes() {
        return (Date.now() - this.startTime) / 1000 / 60;
    }

    /**
     * Get formatted uptime
     */
    getUptime() {
        const totalMinutes = this.getUptimeMinutes();
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        
        return {
            totalMinutes: Math.round(totalMinutes),
            formatted: `${hours}h ${minutes}m`,
            startTime: new Date(this.startTime).toISOString()
        };
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        const info = {
            platform: 'unknown',
            arch: 'unknown',
            nodeVersion: 'unknown',
            v8Version: 'unknown'
        };
        
        if (typeof process !== 'undefined') {
            info.platform = process.platform;
            info.arch = process.arch;
            info.nodeVersion = process.version;
            info.v8Version = process.versions.v8;
            info.memoryLimit = process.memoryUsage ? 
                Math.round(process.memoryUsage().rss / 1024 / 1024) : 'unknown';
        }
        
        if (typeof navigator !== 'undefined') {
            info.userAgent = navigator.userAgent;
            info.platform = navigator.platform;
            info.hardwareConcurrency = navigator.hardwareConcurrency;
        }
        
        return info;
    }

    /**
     * Start periodic monitoring
     */
    startPeriodicMonitoring() {
        // Take memory snapshot every 30 seconds
        setInterval(() => {
            this.takeMemorySnapshot();
        }, 30000);
        
        // Log periodic stats every 5 minutes in debug mode
        if (process.env.NODE_ENV === 'development') {
            setInterval(() => {
                this.logPeriodicStats();
            }, 300000);
        }
    }

    /**
     * Log periodic performance statistics
     */
    logPeriodicStats() {
        const stats = this.getStats();
        
        console.log('📊 Performance Summary:');
        console.log(`   Memory: ${stats.memory.current.used}MB used (peak: ${stats.memory.peak}MB)`);
        console.log(`   Uptime: ${stats.uptime.formatted}`);
        console.log(`   Operations: ${Object.keys(stats.operations).length} types tracked`);
        
        const recentAlerts = this.getRecentAlerts(30); // Last 30 minutes
        if (recentAlerts.length > 0) {
            console.log(`   Alerts: ${recentAlerts.length} in last 30 minutes`);
        }
    }

    /**
     * Export performance data for analysis
     */
    exportPerformanceData() {
        return {
            metrics: Object.fromEntries(this.metrics),
            memorySnapshots: this.memorySnapshots,
            alerts: this.alerts,
            stats: this.getStats(),
            exported: new Date().toISOString()
        };
    }

    /**
     * Clear old performance data
     */
    clearOldData(olderThanMinutes = 60) {
        const cutoff = Date.now() - (olderThanMinutes * 60 * 1000);
        
        // Clear old alerts
        this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
        
        // Clear old memory snapshots
        this.memorySnapshots = this.memorySnapshots.filter(snapshot => snapshot.timestamp > cutoff);
        
        // Clear old metrics
        for (const [operation, metrics] of this.metrics) {
            const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoff);
            if (filteredMetrics.length > 0) {
                this.metrics.set(operation, filteredMetrics);
            } else {
                this.metrics.delete(operation);
            }
        }
        
        console.log(`✓ Cleared performance data older than ${olderThanMinutes} minutes`);
    }

    /**
     * Utility functions
     */
    average(numbers) {
        return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
    }

    percentile(numbers, p) {
        if (numbers.length === 0) return 0;
        const sorted = [...numbers].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get performance recommendations
     */
    getRecommendations() {
        const stats = this.getStats();
        const recommendations = [];
        
        // Memory recommendations
        if (stats.memory.current.used > 500) { // > 500MB
            recommendations.push({
                type: 'memory',
                severity: 'medium',
                message: 'Consider reducing maxPromptsInMemory in configuration',
                action: 'config_optimization'
            });
        }
        
        // Slow operations recommendations
        for (const [operation, opStats] of Object.entries(stats.operations)) {
            if (opStats.duration.avg > 50) {
                recommendations.push({
                    type: 'performance',
                    severity: 'medium',
                    message: `Operation '${operation}' is slower than optimal (${opStats.duration.avg.toFixed(1)}ms avg)`,
                    action: 'operation_optimization'
                });
            }
        }
        
        // Alert-based recommendations
        const criticalAlerts = this.getRecentAlerts().filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push({
                type: 'critical',
                severity: 'high',
                message: `${criticalAlerts.length} critical performance issues detected`,
                action: 'immediate_attention'
            });
        }
        
        return recommendations;
    }
}

module.exports = PersonalPerformanceMonitor;