const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const logger = require('./enhanced-logger');

class SecurityEnhancer {
    constructor(options = {}) {
        this.options = {
            rateLimitEnabled: options.rateLimitEnabled !== false,
            requestsPerWindow: options.requestsPerWindow || 1000,
            windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
            enableSecurity: options.enableSecurity !== false,
            allowedOrigins: options.allowedOrigins || ['http://localhost:3001', 'http://localhost:8000'],
            maxPayloadSize: options.maxPayloadSize || '50mb',
            enableInputValidation: options.enableInputValidation !== false,
            ...options
        };
    }
    
    // Rate limiting middleware
    createRateLimit() {
        if (!this.options.rateLimitEnabled) {
            return (req, res, next) => next();
        }
        
        return rateLimit({
            windowMs: this.options.windowMs,
            max: this.options.requestsPerWindow,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(this.options.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url,
                    method: req.method
                });
                
                res.status(429).json({
                    success: false,
                    error: 'Too many requests from this IP, please try again later.',
                    retryAfter: Math.ceil(this.options.windowMs / 1000)
                });
            },
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.url === '/api/health';
            }
        });
    }
    
    // Security headers middleware
    createSecurityHeaders() {
        if (!this.options.enableSecurity) {
            return (req, res, next) => next();
        }
        
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.openai.com"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        });
    }
    
    // CORS configuration
    createCorsOptions() {
        return {
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                if (this.options.allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn('CORS violation attempt', { origin });
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };
    }
    
    // Input sanitization middleware
    sanitizeInput() {
        return (req, res, next) => {
            if (!this.options.enableInputValidation) {
                return next();
            }
            
            try {
                if (req.body) {
                    req.body = this.sanitizeObject(req.body);
                }
                
                if (req.query) {
                    req.query = this.sanitizeObject(req.query);
                }
                
                if (req.params) {
                    req.params = this.sanitizeObject(req.params);
                }
                
                next();
            } catch (error) {
                logger.error('Input sanitization failed', { error: error.message });
                res.status(400).json({
                    success: false,
                    error: 'Invalid input data'
                });
            }
        };
    }
    
    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }
        
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedKey = this.sanitizeString(key);
            
            if (typeof value === 'string') {
                sanitized[sanitizedKey] = this.sanitizeString(value);
            } else if (typeof value === 'object') {
                sanitized[sanitizedKey] = this.sanitizeObject(value);
            } else {
                sanitized[sanitizedKey] = value;
            }
        }
        
        return sanitized;
    }
    
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return str;
        }
        
        // Remove potentially dangerous characters
        let sanitized = str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/\0/g, ''); // Remove null bytes
        
        // HTML encode special characters
        sanitized = validator.escape(sanitized);
        
        return sanitized;
    }
    
    // Prompt validation
    validatePromptData() {
        return (req, res, next) => {
            if (!this.options.enableInputValidation) {
                return next();
            }
            
            try {
                if (req.method === 'POST' && req.url === '/api/data') {
                    this.validatePromptCollection(req.body);
                } else if (req.method === 'PUT' && req.url.startsWith('/api/prompts/')) {
                    this.validateSinglePrompt(req.body);
                } else if (req.method === 'PUT' && req.url === '/api/prompts/batch') {
                    this.validateBulkUpdate(req.body);
                } else if (req.method === 'DELETE' && req.url === '/api/prompts/batch') {
                    this.validateBulkDelete(req.body);
                }
                
                next();
            } catch (error) {
                logger.warn('Prompt validation failed', { 
                    error: error.message, 
                    url: req.url, 
                    method: req.method 
                });
                
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        };
    }
    
    validatePromptCollection(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        
        if (!Array.isArray(data.prompts)) {
            throw new Error('Prompts must be an array');
        }
        
        if (!Array.isArray(data.categories)) {
            throw new Error('Categories must be an array');
        }
        
        if (!Array.isArray(data.folders)) {
            throw new Error('Folders must be an array');
        }
        
        if (!data.metadata || typeof data.metadata !== 'object') {
            throw new Error('Metadata must be an object');
        }
        
        // Validate each prompt
        data.prompts.forEach((prompt, index) => {
            try {
                this.validateSinglePrompt(prompt);
            } catch (error) {
                throw new Error(`Invalid prompt at index ${index}: ${error.message}`);
            }
        });
        
        // Check data size limits
        if (data.prompts.length > 10000) {
            throw new Error('Too many prompts (max 10,000)');
        }
        
        if (JSON.stringify(data).length > 50 * 1024 * 1024) { // 50MB
            throw new Error('Data payload too large (max 50MB)');
        }
    }
    
    validateSinglePrompt(prompt) {
        if (!prompt || typeof prompt !== 'object') {
            throw new Error('Prompt must be an object');
        }
        
        if (!prompt.id || typeof prompt.id !== 'string') {
            throw new Error('Prompt ID is required and must be a string');
        }
        
        if (!prompt.text || typeof prompt.text !== 'string') {
            throw new Error('Prompt text is required and must be a string');
        }
        
        if (prompt.text.length > 50000) { // 50KB per prompt
            throw new Error('Prompt text too long (max 50,000 characters)');
        }
        
        if (!prompt.category || typeof prompt.category !== 'string') {
            throw new Error('Prompt category is required and must be a string');
        }
        
        if (prompt.tags && !Array.isArray(prompt.tags)) {
            throw new Error('Prompt tags must be an array');
        }
        
        if (prompt.rating !== undefined) {
            if (typeof prompt.rating !== 'number' || prompt.rating < 0 || prompt.rating > 5) {
                throw new Error('Prompt rating must be a number between 0 and 5');
            }
        }
        
        if (prompt.usage_count !== undefined) {
            if (typeof prompt.usage_count !== 'number' || prompt.usage_count < 0) {
                throw new Error('Usage count must be a non-negative number');
            }
        }
        
        // Validate date fields
        if (prompt.createdAt && !this.isValidISODate(prompt.createdAt)) {
            throw new Error('Invalid createdAt date format');
        }
        
        if (prompt.updatedAt && !this.isValidISODate(prompt.updatedAt)) {
            throw new Error('Invalid updatedAt date format');
        }
    }
    
    validateBulkUpdate(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        
        if (!Array.isArray(data.updates)) {
            throw new Error('Updates must be an array');
        }
        
        if (data.updates.length > 1000) {
            throw new Error('Too many updates (max 1,000)');
        }
        
        data.updates.forEach((update, index) => {
            if (!update.id || typeof update.id !== 'string') {
                throw new Error(`Update at index ${index}: ID is required`);
            }
            
            if (!update.changes || typeof update.changes !== 'object') {
                throw new Error(`Update at index ${index}: Changes must be an object`);
            }
        });
    }
    
    validateBulkDelete(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        
        if (!Array.isArray(data.ids)) {
            throw new Error('IDs must be an array');
        }
        
        if (data.ids.length > 1000) {
            throw new Error('Too many IDs (max 1,000)');
        }
        
        data.ids.forEach((id, index) => {
            if (!id || typeof id !== 'string') {
                throw new Error(`ID at index ${index} must be a non-empty string`);
            }
        });
    }
    
    isValidISODate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && date.toISOString() === dateString;
    }
    
    // SQL injection prevention (even though we use JSON files)
    preventSQLInjection() {
        return (req, res, next) => {
            const suspiciousPatterns = [
                /('|(\\')|(--|;|\||`|\/\*|\*\/|xp_))/i,
                /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
                /(script|javascript|vbscript|onload|onerror|onclick)/i
            ];
            
            const checkValue = (value) => {
                if (typeof value === 'string') {
                    return suspiciousPatterns.some(pattern => pattern.test(value));
                }
                return false;
            };
            
            const checkObject = (obj) => {
                if (typeof obj !== 'object' || obj === null) {
                    return checkValue(obj);
                }
                
                for (const [key, value] of Object.entries(obj)) {
                    if (checkValue(key) || checkValue(value) || 
                        (typeof value === 'object' && checkObject(value))) {
                        return true;
                    }
                }
                return false;
            };
            
            if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
                logger.warn('Potential injection attempt detected', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url,
                    method: req.method
                });
                
                return res.status(400).json({
                    success: false,
                    error: 'Invalid characters detected in request'
                });
            }
            
            next();
        };
    }
    
    // Request size limiter
    createRequestLimiter() {
        return (req, res, next) => {
            const maxSize = this.options.maxPayloadSize;
            
            if (req.headers['content-length']) {
                const size = parseInt(req.headers['content-length']);
                const maxBytes = this.parseSize(maxSize);
                
                if (size > maxBytes) {
                    logger.warn('Request size limit exceeded', {
                        size,
                        maxSize,
                        ip: req.ip,
                        url: req.url
                    });
                    
                    return res.status(413).json({
                        success: false,
                        error: 'Request payload too large'
                    });
                }
            }
            
            next();
        };
    }
    
    parseSize(size) {
        if (typeof size === 'number') return size;
        
        const units = {
            'b': 1,
            'kb': 1024,
            'mb': 1024 * 1024,
            'gb': 1024 * 1024 * 1024
        };
        
        const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
        if (!match) return 1024 * 1024; // Default 1MB
        
        const [, number, unit = 'b'] = match;
        return Math.floor(parseFloat(number) * units[unit]);
    }
    
    // Security audit endpoint
    getSecurityAudit() {
        return {
            rateLimitEnabled: this.options.rateLimitEnabled,
            requestsPerWindow: this.options.requestsPerWindow,
            windowMs: this.options.windowMs,
            securityHeadersEnabled: this.options.enableSecurity,
            inputValidationEnabled: this.options.enableInputValidation,
            allowedOrigins: this.options.allowedOrigins,
            maxPayloadSize: this.options.maxPayloadSize,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SecurityEnhancer;