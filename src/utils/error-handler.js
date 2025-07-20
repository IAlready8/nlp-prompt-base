const logger = require('./enhanced-logger');

class ErrorHandler {
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.enableErrorRecovery = options.enableErrorRecovery !== false;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelays = options.retryDelays || [1000, 2000, 5000]; // ms
        this.errorCounts = new Map();
        this.errorThreshold = options.errorThreshold || 10; // Max errors per minute
        this.errorWindow = options.errorWindow || 60000; // 1 minute
    }
    
    // Main error handling middleware
    handleError(err, req, res, next) {
        const errorInfo = this.analyzeError(err, req);
        
        // Log the error
        this.logger.logError(err, {
            url: req?.url,
            method: req?.method,
            userAgent: req?.get('User-Agent'),
            ip: req?.ip,
            errorType: errorInfo.type,
            severity: errorInfo.severity
        });
        
        // Track error frequency
        this.trackError(errorInfo.type);
        
        // Determine response based on error type
        const response = this.generateErrorResponse(errorInfo, req);
        
        if (res && !res.headersSent) {
            res.status(response.statusCode).json(response.body);
        }
        
        // Check if we should trigger error recovery
        if (this.shouldTriggerRecovery(errorInfo.type)) {
            this.triggerErrorRecovery(errorInfo);
        }
    }
    
    analyzeError(err, req = null) {
        let type = 'unknown';
        let severity = 'medium';
        let statusCode = 500;
        let userMessage = 'An unexpected error occurred';
        let recoverable = false;
        
        if (err.name === 'ValidationError') {
            type = 'validation';
            severity = 'low';
            statusCode = 400;
            userMessage = 'Invalid input data';
            recoverable = true;
        } else if (err.code === 'ENOENT') {
            type = 'file_not_found';
            severity = 'medium';
            statusCode = 404;
            userMessage = 'Requested resource not found';
            recoverable = true;
        } else if (err.code === 'EACCES') {
            type = 'permission_denied';
            severity = 'high';
            statusCode = 403;
            userMessage = 'Access denied';
            recoverable = false;
        } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
            type = 'resource_exhaustion';
            severity = 'critical';
            statusCode = 503;
            userMessage = 'Service temporarily unavailable';
            recoverable = true;
        } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
            type = 'json_parse_error';
            severity = 'low';
            statusCode = 400;
            userMessage = 'Invalid JSON data';
            recoverable = true;
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
            type = 'network_error';
            severity = 'medium';
            statusCode = 503;
            userMessage = 'Network connection failed';
            recoverable = true;
        } else if (err.message.includes('CORS')) {
            type = 'cors_error';
            severity = 'low';
            statusCode = 403;
            userMessage = 'CORS policy violation';
            recoverable = false;
        } else if (err.name === 'RangeError' || err.name === 'TypeError') {
            type = 'programming_error';
            severity = 'high';
            statusCode = 500;
            userMessage = 'Internal server error';
            recoverable = false;
        }
        
        return {
            type,
            severity,
            statusCode,
            userMessage,
            recoverable,
            originalError: err
        };
    }
    
    generateErrorResponse(errorInfo, req = null) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        const response = {
            success: false,
            error: {
                message: errorInfo.userMessage,
                type: errorInfo.type,
                timestamp: new Date().toISOString()
            }
        };
        
        // Add error ID for tracking
        response.error.id = this.generateErrorId();
        
        // Include stack trace in development
        if (isDevelopment && errorInfo.originalError) {
            response.error.stack = errorInfo.originalError.stack;
            response.error.details = errorInfo.originalError.message;
        }
        
        // Add helpful context for specific error types
        if (errorInfo.type === 'validation') {
            response.error.suggestion = 'Please check your input data and try again';
        } else if (errorInfo.type === 'network_error') {
            response.error.suggestion = 'Please check your internet connection and retry';
        } else if (errorInfo.type === 'resource_exhaustion') {
            response.error.suggestion = 'Please try again in a few moments';
            response.error.retryAfter = 30; // seconds
        }
        
        return {
            statusCode: errorInfo.statusCode,
            body: response
        };
    }
    
    generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `err_${timestamp}_${random}`;
    }
    
    trackError(errorType) {
        const now = Date.now();
        const key = `${errorType}_${Math.floor(now / this.errorWindow)}`;
        
        const count = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, count + 1);
        
        // Clean up old entries
        this.cleanupErrorCounts(now);
    }
    
    cleanupErrorCounts(now) {
        const currentWindow = Math.floor(now / this.errorWindow);
        
        for (const [key, count] of this.errorCounts.entries()) {
            const [type, window] = key.split('_');
            if (parseInt(window) < currentWindow - 5) { // Keep last 5 windows
                this.errorCounts.delete(key);
            }
        }
    }
    
    shouldTriggerRecovery(errorType) {
        if (!this.enableErrorRecovery) return false;
        
        const now = Date.now();
        const currentWindow = Math.floor(now / this.errorWindow);
        const key = `${errorType}_${currentWindow}`;
        
        const count = this.errorCounts.get(key) || 0;
        return count >= this.errorThreshold;
    }
    
    async triggerErrorRecovery(errorInfo) {
        this.logger.warn('Triggering error recovery', {
            errorType: errorInfo.type,
            severity: errorInfo.severity
        });
        
        try {
            switch (errorInfo.type) {
                case 'resource_exhaustion':
                    await this.handleResourceExhaustion();
                    break;
                case 'network_error':
                    await this.handleNetworkError();
                    break;
                case 'file_not_found':
                    await this.handleFileError();
                    break;
                default:
                    await this.handleGenericError(errorInfo);
            }
        } catch (recoveryError) {
            this.logger.error('Error recovery failed', { 
                originalError: errorInfo.type,
                recoveryError: recoveryError.message 
            });
        }
    }
    
    async handleResourceExhaustion() {
        this.logger.info('Handling resource exhaustion');
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        // Clear any unnecessary caches
        this.clearCaches();
        
        // Add artificial delay to reduce load
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    async handleNetworkError() {
        this.logger.info('Handling network error');
        
        // Could implement network connectivity checks here
        // For now, just add a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    async handleFileError() {
        this.logger.info('Handling file system error');
        
        // Could implement file system recovery checks here
        // Check disk space, permissions, etc.
    }
    
    async handleGenericError(errorInfo) {
        this.logger.info('Handling generic error', { type: errorInfo.type });
        
        // Generic recovery: just wait a bit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    clearCaches() {
        // Clear any in-memory caches
        // This is application-specific
        this.logger.debug('Clearing caches for memory recovery');
    }
    
    // Retry mechanism for operations
    async retryOperation(operation, context = {}, maxRetries = this.maxRetries) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.retryDelays[attempt - 1] || this.retryDelays[this.retryDelays.length - 1];
                    this.logger.debug(`Retrying operation (attempt ${attempt + 1}/${maxRetries + 1})`, { delay, context });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
                return await operation();
            } catch (error) {
                lastError = error;
                const errorInfo = this.analyzeError(error);
                
                if (!errorInfo.recoverable || attempt >= maxRetries) {
                    break;
                }
                
                this.logger.warn(`Operation failed (attempt ${attempt + 1}), retrying`, {
                    error: error.message,
                    attempt: attempt + 1,
                    maxRetries: maxRetries + 1,
                    context
                });
            }
        }
        
        this.logger.error('Operation failed after all retries', {
            error: lastError.message,
            attempts: maxRetries + 1,
            context
        });
        
        throw lastError;
    }
    
    // Circuit breaker pattern
    createCircuitBreaker(operation, options = {}) {
        const threshold = options.threshold || 5;
        const timeout = options.timeout || 60000; // 1 minute
        const resetTimeout = options.resetTimeout || 300000; // 5 minutes
        
        let failures = 0;
        let lastFailureTime = 0;
        let state = 'closed'; // closed, open, half-open
        
        return async (...args) => {
            const now = Date.now();
            
            if (state === 'open') {
                if (now - lastFailureTime > resetTimeout) {
                    state = 'half-open';
                    this.logger.info('Circuit breaker half-open, attempting operation');
                } else {
                    throw new Error('Circuit breaker is open');
                }
            }
            
            try {
                const result = await Promise.race([
                    operation(...args),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Operation timeout')), timeout)
                    )
                ]);
                
                if (state === 'half-open') {
                    state = 'closed';
                    failures = 0;
                    this.logger.info('Circuit breaker closed, operation successful');
                }
                
                return result;
            } catch (error) {
                failures++;
                lastFailureTime = now;
                
                if (failures >= threshold) {
                    state = 'open';
                    this.logger.warn('Circuit breaker opened due to failures', { failures, threshold });
                }
                
                throw error;
            }
        };
    }
    
    // Global error handlers
    setupGlobalHandlers() {
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Promise Rejection', {
                reason: reason instanceof Error ? reason.message : reason,
                stack: reason instanceof Error ? reason.stack : undefined,
                promise: promise.toString()
            });
            
            // Don't exit the process, just log it
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            // In production, you might want to gracefully shutdown
            if (process.env.NODE_ENV === 'production') {
                this.logger.error('Shutting down due to uncaught exception');
                process.exit(1);
            }
        });
        
        // Handle graceful shutdown signals
        ['SIGTERM', 'SIGINT'].forEach(signal => {
            process.on(signal, () => {
                this.logger.info(`Received ${signal}, starting graceful shutdown`);
                this.gracefulShutdown();
            });
        });
    }
    
    gracefulShutdown() {
        // Implement graceful shutdown logic
        // Close database connections, stop servers, etc.
        
        setTimeout(() => {
            this.logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 30000); // 30 second timeout
        
        // Your shutdown logic here
        process.exit(0);
    }
    
    getErrorStats() {
        const stats = {};
        const now = Date.now();
        const currentWindow = Math.floor(now / this.errorWindow);
        
        for (const [key, count] of this.errorCounts.entries()) {
            const [type, window] = key.split('_');
            if (parseInt(window) === currentWindow) {
                stats[type] = count;
            }
        }
        
        return {
            currentWindow: currentWindow,
            windowSizeMs: this.errorWindow,
            threshold: this.errorThreshold,
            errors: stats
        };
    }
}

module.exports = ErrorHandler;