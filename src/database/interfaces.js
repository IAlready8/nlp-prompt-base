/**
 * Personal Database Interface - Future-proof abstraction layer
 * 
 * Defines the contract for database implementations to ensure
 * clean separation of concerns and easy migration between storage systems.
 */

/**
 * @interface PersonalDB
 * @description Main interface for personal database operations
 */
class PersonalDB {
    /**
     * Save prompts to database
     * @param {Array} prompts - Array of prompt objects
     * @returns {Promise<void>}
     */
    async save(prompts) {
        throw new Error('save() method must be implemented');
    }

    /**
     * Load prompts from database
     * @returns {Promise<Array>} Array of prompt objects
     */
    async load() {
        throw new Error('load() method must be implemented');
    }

    /**
     * Create a backup of the database
     * @returns {Promise<string>} Backup file path or identifier
     */
    async backup() {
        throw new Error('backup() method must be implemented');
    }

    /**
     * Search prompts using full-text search
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching prompts
     */
    async search(query) {
        throw new Error('search() method must be implemented');
    }

    /**
     * Initialize the database
     * @returns {Promise<void>}
     */
    async init() {
        throw new Error('init() method must be implemented');
    }

    /**
     * Close database connection
     * @returns {Promise<void>}
     */
    async close() {
        throw new Error('close() method must be implemented');
    }
}

/**
 * @interface PersonalConfig
 * @description Configuration interface for personal settings
 */
const PersonalConfigSchema = {
    database: {
        type: ['sqlite', 'json'],
        path: 'string',
        backupInterval: 'number' // minutes
    },
    ai: {
        openaiKey: 'string',
        model: 'string',
        autoCategorizationEnabled: 'boolean'
    },
    ui: {
        theme: ['dark', 'light', 'auto'],
        compactMode: 'boolean',
        animations: 'boolean'
    },
    performance: {
        maxPromptsInMemory: 'number',
        enableIndexing: 'boolean',
        debugMode: 'boolean'
    }
};

/**
 * @interface PersonalInsights
 * @description Analytics and insights data structure
 */
const PersonalInsightsSchema = {
    totalPrompts: 'number',
    averageRating: 'number',
    mostUsedCategories: 'array',
    suggestions: 'array',
    efficiency: 'number',
    usage: 'object',
    categories: 'object',
    trends: 'array',
    goals: 'object'
};

module.exports = {
    PersonalDB,
    PersonalConfigSchema,
    PersonalInsightsSchema
};