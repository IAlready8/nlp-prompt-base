const logger = require('../utils/logger');

const validatePromptData = (req, res, next) => {
    const { prompts, categories, folders, settings, metadata } = req.body;
    
    try {
        if (prompts && !Array.isArray(prompts)) {
            return res.status(400).json({
                success: false,
                error: 'Prompts must be an array'
            });
        }

        if (prompts) {
            for (const prompt of prompts) {
                if (!prompt.id || typeof prompt.id !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Each prompt must have a valid string ID'
                    });
                }
                
                if (!prompt.text || typeof prompt.text !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Each prompt must have text content'
                    });
                }
                
                if (prompt.text.length > 10000) {
                    return res.status(400).json({
                        success: false,
                        error: 'Prompt text cannot exceed 10,000 characters'
                    });
                }
                
                if (prompt.tags && !Array.isArray(prompt.tags)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Prompt tags must be an array'
                    });
                }
                
                if (prompt.rating && (typeof prompt.rating !== 'number' || prompt.rating < 0 || prompt.rating > 5)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Prompt rating must be a number between 0 and 5'
                    });
                }
            }
        }

        if (categories && !Array.isArray(categories)) {
            return res.status(400).json({
                success: false,
                error: 'Categories must be an array'
            });
        }

        if (folders && !Array.isArray(folders)) {
            return res.status(400).json({
                success: false,
                error: 'Folders must be an array'
            });
        }

        if (settings && typeof settings !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Settings must be an object'
            });
        }

        if (metadata && typeof metadata !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Metadata must be an object'
            });
        }

        next();
    } catch (error) {
        logger.error('Validation error', { error: error.message, body: req.body });
        res.status(400).json({
            success: false,
            error: 'Invalid request data format'
        });
    }
};

const validatePromptId = (req, res, next) => {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Valid prompt ID is required'
        });
    }
    
    next();
};

const validateBulkOperations = (req, res, next) => {
    const { ids, updates } = req.body;
    
    if (req.method === 'DELETE' && ids) {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'IDs must be a non-empty array'
            });
        }
        
        if (ids.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete more than 100 items at once'
            });
        }
    }
    
    if (req.method === 'PUT' && updates) {
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Updates must be a non-empty array'
            });
        }
        
        if (updates.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Cannot update more than 100 items at once'
            });
        }
        
        for (const update of updates) {
            if (!update.id || !update.changes) {
                return res.status(400).json({
                    success: false,
                    error: 'Each update must have id and changes properties'
                });
            }
        }
    }
    
    next();
};

const sanitizeInput = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    };
    
    const sanitizeObject = (obj) => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return sanitizeString(obj);
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeObject);
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    };
    
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    
    next();
};

const rateLimiter = () => {
    const requests = new Map();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 1000;
    
    return (req, res, next) => {
        const clientId = req.ip || 'unknown';
        const now = Date.now();
        
        if (!requests.has(clientId)) {
            requests.set(clientId, []);
        }
        
        const clientRequests = requests.get(clientId);
        
        const validRequests = clientRequests.filter(time => now - time < windowMs);
        
        if (validRequests.length >= maxRequests) {
            logger.warn('Rate limit exceeded', { clientId, requests: validRequests.length });
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.'
            });
        }
        
        validRequests.push(now);
        requests.set(clientId, validRequests);
        
        next();
    };
};

const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body
    });
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
};

module.exports = {
    validatePromptData,
    validatePromptId,
    validateBulkOperations,
    sanitizeInput,
    rateLimiter,
    errorHandler
};