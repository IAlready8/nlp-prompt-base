const fs = require('fs');
const path = require('path');

class Logger {
    constructor(options = {}) {
        this.level = options.level || process.env.LOG_LEVEL || 'info';
        this.logFile = options.logFile || process.env.LOG_FILE || './logs/app.log';
        this.maxSize = options.maxSize || parseInt(process.env.LOG_MAX_SIZE) || 10485760; // 10MB
        this.maxFiles = options.maxFiles || parseInt(process.env.LOG_MAX_FILES) || 5;
        this.enableConsole = options.enableConsole !== false;
        
        // Create logs directory if it doesn't exist
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        // Log levels (lower number = higher priority)
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3,
            trace: 4
        };
        
        this.levelNumber = this.levels[this.level] || this.levels.info;
    }
    
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            ...meta
        };
        
        return JSON.stringify(logEntry);
    }
    
    writeToFile(formattedMessage) {
        try {
            // Check file size and rotate if necessary
            if (fs.existsSync(this.logFile)) {
                const stats = fs.statSync(this.logFile);
                if (stats.size >= this.maxSize) {
                    this.rotateLog();
                }
            }
            
            fs.appendFileSync(this.logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    rotateLog() {
        try {
            // Move existing log files
            for (let i = this.maxFiles - 1; i > 0; i--) {
                const oldFile = `${this.logFile}.${i}`;
                const newFile = `${this.logFile}.${i + 1}`;
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxFiles - 1) {
                        fs.unlinkSync(oldFile); // Delete oldest file
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }
            
            // Move current log to .1
            if (fs.existsSync(this.logFile)) {
                fs.renameSync(this.logFile, `${this.logFile}.1`);
            }
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    
    log(level, message, meta = {}) {
        if (this.levels[level] > this.levelNumber) {
            return; // Skip logging if level is too low
        }
        
        const formattedMessage = this.formatMessage(level, message, meta);
        
        if (this.enableConsole) {
            const colors = {
                error: '\x1b[31m', // Red
                warn: '\x1b[33m',  // Yellow
                info: '\x1b[36m',  // Cyan
                debug: '\x1b[90m', // Gray
                trace: '\x1b[90m'  // Gray
            };
            
            const color = colors[level] || '';
            const reset = '\x1b[0m';
            console.log(`${color}${formattedMessage}${reset}`);
        }
        
        this.writeToFile(formattedMessage);
    }
    
    error(message, meta = {}) {
        this.log('error', message, meta);
    }
    
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }
    
    info(message, meta = {}) {
        this.log('info', message, meta);
    }
    
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
    
    trace(message, meta = {}) {
        this.log('trace', message, meta);
    }
    
    // Performance monitoring helpers
    startTimer(label) {
        const start = process.hrtime();
        return {
            end: () => {
                const [seconds, nanoseconds] = process.hrtime(start);
                const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
                this.info(`Timer ${label} completed`, { duration: `${duration.toFixed(2)}ms` });
                return duration;
            }
        };
    }
    
    // Request logging middleware
    requestLogger() {
        return (req, res, next) => {
            const start = Date.now();
            const originalSend = res.send;
            
            res.send = function(data) {
                const duration = Date.now() - start;
                const logData = {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip || req.connection.remoteAddress
                };
                
                if (res.statusCode >= 400) {
                    this.warn('HTTP Error Response', logData);
                } else {
                    this.info('HTTP Request', logData);
                }
                
                originalSend.call(this, data);
            }.bind(this);
            
            next();
        };
    }
    
    // Error logging helper
    logError(error, context = {}) {
        this.error(error.message, {
            stack: error.stack,
            name: error.name,
            context
        });
    }
    
    // System performance logging
    logSystemStats() {
        const used = process.memoryUsage();
        const systemStats = {
            memory: {
                rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
                heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
                heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
                external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
            },
            uptime: `${Math.round(process.uptime())}s`,
            pid: process.pid,
            nodeVersion: process.version
        };
        
        this.debug('System Statistics', systemStats);
        return systemStats;
    }
}

// Create default logger instance
const logger = new Logger();

// Export both the class and default instance
module.exports = logger;
module.exports.Logger = Logger;