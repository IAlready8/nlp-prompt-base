/**
 * SQLite Personal Database Implementation
 * 
 * High-performance SQLite implementation optimized for single-user personal use
 * Features: FTS5 search, automatic backup, performance monitoring
 */

const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');
const { PersonalDB } = require('./interfaces');

class SQLitePersonalDB extends PersonalDB {
    constructor(dbPath = './data/prompts.db') {
        super();
        this.dbPath = path.resolve(dbPath);
        this.db = null;
        this.initialized = false;
        this.backupDir = './backups';
        this.maxBackups = 10;
        
        // Performance monitoring
        this.metrics = new Map();
        this.queryCount = 0;
    }

    /**
     * Initialize SQLite database with FTS5 search
     */
    async init() {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
            await fs.mkdir(this.backupDir, { recursive: true });

            // Initialize database with optimizations for personal use
            this.db = new Database(this.dbPath);
            
            // SQLite optimization for single-user performance
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('temp_store = memory');
            this.db.pragma('mmap_size = 268435456'); // 256MB

            this.initTables();
            this.initPreparedStatements();
            
            this.initialized = true;
            console.log('✓ SQLite database initialized:', this.dbPath);
            
            return this.loadData();
        } catch (error) {
            console.error('✗ Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    /**
     * Create database tables with indexes
     */
    initTables() {
        const createTables = `
            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                category TEXT,
                tags TEXT, -- JSON array
                folder TEXT,
                rating INTEGER DEFAULT 0,
                usage_count INTEGER DEFAULT 0,
                notes TEXT DEFAULT '',
                source TEXT DEFAULT 'manual',
                confidence REAL DEFAULT 1.0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                name TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS folders (
                name TEXT PRIMARY KEY,
                is_custom BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS analytics (
                date TEXT PRIMARY KEY,
                prompts_created INTEGER DEFAULT 0,
                prompts_used INTEGER DEFAULT 0,
                ai_requests INTEGER DEFAULT 0,
                backup_count INTEGER DEFAULT 0
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
            CREATE INDEX IF NOT EXISTS idx_prompts_folder ON prompts(folder);
            CREATE INDEX IF NOT EXISTS idx_prompts_rating ON prompts(rating);
            CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(created_at);
            CREATE INDEX IF NOT EXISTS idx_prompts_updated ON prompts(updated_at);

            -- Full-text search with FTS5
            CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
                text, 
                notes, 
                tags,
                content='prompts', 
                content_rowid='rowid'
            );

            -- Triggers to keep FTS in sync
            CREATE TRIGGER IF NOT EXISTS prompts_ai AFTER INSERT ON prompts BEGIN
                INSERT INTO prompts_fts(rowid, text, notes, tags) 
                VALUES (new.rowid, new.text, new.notes, new.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS prompts_ad AFTER DELETE ON prompts BEGIN
                INSERT INTO prompts_fts(prompts_fts, rowid, text, notes, tags) 
                VALUES('delete', old.rowid, old.text, old.notes, old.tags);
            END;

            CREATE TRIGGER IF NOT EXISTS prompts_au AFTER UPDATE ON prompts BEGIN
                INSERT INTO prompts_fts(prompts_fts, rowid, text, notes, tags) 
                VALUES('delete', old.rowid, old.text, old.notes, old.tags);
                INSERT INTO prompts_fts(rowid, text, notes, tags) 
                VALUES (new.rowid, new.text, new.notes, new.tags);
            END;
        `;

        this.db.exec(createTables);
    }

    /**
     * Initialize prepared statements for performance
     */
    initPreparedStatements() {
        this.statements = {
            insertPrompt: this.db.prepare(`
                INSERT INTO prompts (id, text, category, tags, folder, rating, notes, source, confidence, usage_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            
            updatePrompt: this.db.prepare(`
                UPDATE prompts 
                SET text = ?, category = ?, tags = ?, folder = ?, rating = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `),
            
            deletePrompt: this.db.prepare(`
                DELETE FROM prompts WHERE id = ?
            `),
            
            getAllPrompts: this.db.prepare(`
                SELECT * FROM prompts ORDER BY created_at DESC
            `),
            
            searchPrompts: this.db.prepare(`
                SELECT p.* FROM prompts p
                JOIN prompts_fts ON p.rowid = prompts_fts.rowid
                WHERE prompts_fts MATCH ?
                ORDER BY rank
            `),
            
            getPromptsByCategory: this.db.prepare(`
                SELECT * FROM prompts WHERE category = ? ORDER BY created_at DESC
            `),
            
            getPromptsByFolder: this.db.prepare(`
                SELECT * FROM prompts WHERE folder = ? ORDER BY created_at DESC
            `),
            
            incrementUsage: this.db.prepare(`
                UPDATE prompts SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `),
            
            getSettings: this.db.prepare(`
                SELECT key, value FROM settings
            `),
            
            setSetting: this.db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            `),
            
            updateAnalytics: this.db.prepare(`
                INSERT OR REPLACE INTO analytics (date, prompts_created, prompts_used, ai_requests, backup_count)
                VALUES (?, 
                    COALESCE((SELECT prompts_created FROM analytics WHERE date = ?), 0) + ?,
                    COALESCE((SELECT prompts_used FROM analytics WHERE date = ?), 0) + ?,
                    COALESCE((SELECT ai_requests FROM analytics WHERE date = ?), 0) + ?,
                    COALESCE((SELECT backup_count FROM analytics WHERE date = ?), 0) + ?
                )
            `)
        };
    }

    /**
     * Load all data in the expected format for compatibility
     */
    async loadData() {
        const startTime = performance.now();
        
        try {
            const prompts = this.statements.getAllPrompts.all().map(prompt => ({
                ...prompt,
                tags: JSON.parse(prompt.tags || '[]'),
                createdAt: prompt.created_at,
                updatedAt: prompt.updated_at
            }));

            const categories = this.db.prepare('SELECT name FROM categories').all().map(c => c.name);
            const folders = this.db.prepare('SELECT name FROM folders').all().map(f => f.name);
            
            const settingsRows = this.statements.getSettings.all();
            const settings = {};
            settingsRows.forEach(row => {
                try {
                    settings[row.key] = JSON.parse(row.value);
                } catch {
                    settings[row.key] = row.value;
                }
            });

            const data = {
                prompts,
                categories: categories.length > 0 ? categories : ["All", "Code", "Cognitive", "Jailbreak", "Dev", "Writing", "Business", "General", "Creative", "Analysis", "Research"],
                folders: folders.length > 0 ? folders : ["All", "Favorites", "Archive", "Default"],
                customFolders: folders.filter(f => !["All", "Favorites", "Archive", "Default"].includes(f)),
                settings: {
                    openaiApiKey: "",
                    autoCategorizationEnabled: true,
                    lastBackup: null,
                    ...settings
                },
                metadata: {
                    version: "2.0.0",
                    created: new Date().toISOString().split('T')[0],
                    totalPrompts: prompts.length,
                    lastLoaded: new Date().toISOString(),
                    database: 'sqlite'
                }
            };

            this.recordMetric('load_data', performance.now() - startTime);
            return data;
        } catch (error) {
            console.error('✗ Failed to load data:', error);
            throw error;
        }
    }

    /**
     * Save prompts to database
     */
    async save(prompts) {
        const startTime = performance.now();
        
        try {
            const transaction = this.db.transaction((prompts) => {
                // Clear existing prompts (full replace for compatibility)
                this.db.prepare('DELETE FROM prompts').run();
                
                for (const prompt of prompts) {
                    this.statements.insertPrompt.run(
                        prompt.id,
                        prompt.text,
                        prompt.category,
                        JSON.stringify(prompt.tags || []),
                        prompt.folder,
                        prompt.rating || 0,
                        prompt.notes || '',
                        prompt.metadata?.source || 'manual',
                        prompt.metadata?.confidence || 1.0,
                        prompt.usage_count || 0
                    );
                }
            });

            transaction(prompts);
            
            this.recordMetric('save_data', performance.now() - startTime);
            console.log(`✓ Saved ${prompts.length} prompts to SQLite`);
            
        } catch (error) {
            console.error('✗ Failed to save prompts:', error);
            throw error;
        }
    }

    /**
     * Full-text search using FTS5
     */
    async search(query) {
        const startTime = performance.now();
        
        try {
            // Escape FTS5 special characters and prepare query
            const escapedQuery = query.replace(/[^a-zA-Z0-9\s]/g, '').trim();
            if (!escapedQuery) return [];

            const results = this.statements.searchPrompts.all(escapedQuery).map(prompt => ({
                ...prompt,
                tags: JSON.parse(prompt.tags || '[]'),
                createdAt: prompt.created_at,
                updatedAt: prompt.updated_at
            }));

            this.recordMetric('search', performance.now() - startTime);
            return results;
            
        } catch (error) {
            console.error('✗ Search failed:', error);
            return [];
        }
    }

    /**
     * Create automatic backup with retention management
     */
    async backup() {
        const startTime = performance.now();
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `auto-backup-${timestamp}.db`);
            
            // Create backup using SQLite VACUUM INTO
            this.db.prepare(`VACUUM INTO ?`).run(backupPath);
            
            // Clean old backups
            await this.cleanOldBackups();
            
            // Update analytics
            const today = new Date().toISOString().split('T')[0];
            this.statements.updateAnalytics.run(today, today, 0, today, 0, today, 0, today, 1);
            
            this.recordMetric('backup', performance.now() - startTime);
            console.log('✓ Database backup created:', backupPath);
            
            return backupPath;
            
        } catch (error) {
            console.error('✗ Backup failed:', error);
            throw error;
        }
    }

    /**
     * Clean old backups keeping only the most recent ones
     */
    async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(f => f.startsWith('auto-backup-') && f.endsWith('.db'))
                .map(f => ({
                    name: f,
                    path: path.join(this.backupDir, f),
                    stat: null
                }));

            // Get file stats for sorting by creation time
            for (const backup of backups) {
                try {
                    backup.stat = await fs.stat(backup.path);
                } catch (error) {
                    console.warn('Could not stat backup file:', backup.path);
                }
            }

            // Sort by creation time (newest first)
            const sortedBackups = backups
                .filter(b => b.stat)
                .sort((a, b) => b.stat.ctime - a.stat.ctime);

            // Delete old backups
            if (sortedBackups.length > this.maxBackups) {
                const toDelete = sortedBackups.slice(this.maxBackups);
                await Promise.all(toDelete.map(backup => fs.unlink(backup.path)));
                console.log(`✓ Cleaned ${toDelete.length} old backups`);
            }
            
        } catch (error) {
            console.warn('Could not clean old backups:', error);
        }
    }

    /**
     * Record performance metrics
     */
    recordMetric(operation, duration) {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, []);
        }
        
        const times = this.metrics.get(operation);
        times.push(duration);
        
        // Keep only last 100 measurements
        if (times.length > 100) {
            times.shift();
        }
        
        this.queryCount++;
        
        // Log slow operations for optimization
        if (duration > 100) {
            console.warn(`⚠️ Slow operation: ${operation} took ${duration.toFixed(2)}ms`);
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const stats = {};
        
        for (const [operation, times] of this.metrics) {
            stats[operation] = {
                avg: times.reduce((a, b) => a + b, 0) / times.length,
                max: Math.max(...times),
                min: Math.min(...times),
                count: times.length
            };
        }
        
        return {
            operations: stats,
            totalQueries: this.queryCount,
            dbSize: this.getDbSize()
        };
    }

    /**
     * Get database file size
     */
    getDbSize() {
        try {
            const stats = require('fs').statSync(this.dbPath);
            return {
                bytes: stats.size,
                mb: (stats.size / 1024 / 1024).toFixed(2)
            };
        } catch {
            return { bytes: 0, mb: '0.00' };
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
            console.log('✓ SQLite database connection closed');
        }
    }

    /**
     * Get database analytics
     */
    async getAnalytics() {
        try {
            const analytics = this.db.prepare(`
                SELECT * FROM analytics 
                ORDER BY date DESC 
                LIMIT 30
            `).all();

            const categoryStats = this.db.prepare(`
                SELECT category, COUNT(*) as count, AVG(rating) as avgRating
                FROM prompts 
                GROUP BY category 
                ORDER BY count DESC
            `).all();

            const monthlyStats = this.db.prepare(`
                SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
                FROM prompts 
                GROUP BY month 
                ORDER BY month DESC
                LIMIT 12
            `).all();

            return {
                daily: analytics,
                categories: categoryStats,
                monthly: monthlyStats,
                performance: this.getPerformanceStats()
            };
            
        } catch (error) {
            console.error('Failed to get analytics:', error);
            return null;
        }
    }
}

module.exports = SQLitePersonalDB;