require('dotenv').config();

const config = {
    server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || 'localhost',
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    
    database: {
        dataFilePath: process.env.DATA_FILE_PATH || './data/prompts.json',
        backupDirectory: process.env.BACKUP_DIRECTORY || './backups',
        autoBackupEnabled: process.env.AUTO_BACKUP_ENABLED === 'true',
        autoBackupInterval: parseInt(process.env.AUTO_BACKUP_INTERVAL) || 24
    },
    
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000
    },
    
    app: {
        autoCategorizationEnabled: process.env.AUTO_CATEGORIZATION_ENABLED !== 'false',
        autoTagsEnabled: process.env.AUTO_TAGS_ENABLED !== 'false',
        autoSaveEnabled: process.env.AUTO_SAVE_ENABLED !== 'false',
        autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL) || 500
    },
    
    security: {
        corsOrigin: process.env.CORS_ORIGIN || '*',
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
        rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS) || 1000,
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000
    },
    
    ui: {
        defaultTheme: process.env.DEFAULT_THEME || 'dark',
        sidebarWidth: parseInt(process.env.SIDEBAR_WIDTH) || 280,
        animationSpeed: process.env.ANIMATION_SPEED || 'normal'
    },
    
    analytics: {
        trackUsage: process.env.TRACK_USAGE !== 'false',
        showAnalytics: process.env.SHOW_ANALYTICS !== 'false'
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log',
        maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10485760,
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    
    development: {
        debugMode: process.env.DEBUG_MODE === 'true',
        performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true'
    }
};

module.exports = config;