#!/usr/bin/env node

/**
 * SQLite Migration Script
 * 
 * Migrates existing JSON database to SQLite with data preservation
 * Includes backup, validation, and rollback capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const SQLitePersonalDB = require('../src/database/sqlite-personal-db');
const PersonalPerformanceMonitor = require('../src/utils/personal-monitor');

class DatabaseMigrator {
    constructor() {
        this.monitor = new PersonalPerformanceMonitor();
        this.jsonPath = './data/prompts.json';
        this.sqlitePath = './data/prompts.db';
        this.backupPath = `./backups/pre-migration-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    }

    async migrate() {
        const endTimer = this.monitor.startTimer('database_migration');
        
        try {
            console.log('🚀 Starting SQLite Migration...\n');
            
            // Step 1: Backup existing data
            await this.createBackup();
            
            // Step 2: Load existing JSON data
            const jsonData = await this.loadJsonData();
            
            // Step 3: Initialize SQLite database
            const sqliteDB = new SQLitePersonalDB(this.sqlitePath);
            await sqliteDB.init();
            
            // Step 4: Migrate data
            await this.migrateData(jsonData, sqliteDB);
            
            // Step 5: Validate migration
            await this.validateMigration(jsonData, sqliteDB);
            
            // Step 6: Update configuration
            await this.updateConfiguration();
            
            await sqliteDB.close();
            
            const result = endTimer();
            console.log(`\n✅ Migration completed successfully in ${result.duration.toFixed(2)}ms`);
            console.log(`📁 Backup saved to: ${this.backupPath}`);
            console.log(`🗄️ SQLite database: ${this.sqlitePath}`);
            
            return true;
            
        } catch (error) {
            console.error('\n❌ Migration failed:', error);
            console.log('\n🔄 Rolling back...');
            await this.rollback();
            return false;
        }
    }

    async createBackup() {
        try {
            console.log('📋 Creating backup of existing data...');
            
            // Ensure backup directory exists
            await fs.mkdir('./backups', { recursive: true });
            
            // Check if JSON file exists
            try {
                await fs.access(this.jsonPath);
                const jsonData = await fs.readFile(this.jsonPath, 'utf8');
                await fs.writeFile(this.backupPath, jsonData);
                console.log(`✓ Backup created: ${this.backupPath}`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log('ℹ️ No existing JSON database found - starting fresh');
                    // Create empty backup for consistency
                    const emptyData = {
                        prompts: [],
                        categories: ["All", "Code", "Cognitive", "Jailbreak", "Dev", "Writing", "Business", "General", "Creative", "Analysis", "Research"],
                        folders: ["All", "Favorites", "Archive", "Default"],
                        customFolders: [],
                        settings: {
                            openaiApiKey: "",
                            autoCategorizationEnabled: true,
                            lastBackup: null
                        },
                        metadata: {
                            version: "1.0.0",
                            created: new Date().toISOString().split('T')[0],
                            totalPrompts: 0
                        }
                    };
                    await fs.writeFile(this.backupPath, JSON.stringify(emptyData, null, 2));
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw error;
        }
    }

    async loadJsonData() {
        try {
            console.log('📖 Loading existing JSON data...');
            
            const jsonContent = await fs.readFile(this.backupPath, 'utf8');
            const data = JSON.parse(jsonContent);
            
            console.log(`✓ Loaded ${data.prompts.length} prompts from JSON`);
            return data;
            
        } catch (error) {
            console.error('Failed to load JSON data:', error);
            throw error;
        }
    }

    async migrateData(jsonData, sqliteDB) {
        console.log('🔄 Migrating data to SQLite...');
        
        try {
            // Migrate prompts
            if (jsonData.prompts && jsonData.prompts.length > 0) {
                await sqliteDB.save(jsonData.prompts);
                console.log(`✓ Migrated ${jsonData.prompts.length} prompts`);
            }
            
            // Migrate categories
            if (jsonData.categories) {
                for (const category of jsonData.categories) {
                    if (category !== 'All') { // Skip 'All' as it's virtual
                        try {
                            const stmt = sqliteDB.db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
                            stmt.run(category);
                        } catch (error) {
                            console.warn(`Warning: Could not migrate category '${category}':`, error.message);
                        }
                    }
                }
                console.log(`✓ Migrated ${jsonData.categories.length - 1} categories`);
            }
            
            // Migrate folders
            const allFolders = [...(jsonData.folders || []), ...(jsonData.customFolders || [])];
            for (const folder of allFolders) {
                if (folder !== 'All') { // Skip 'All' as it's virtual
                    try {
                        const isCustom = jsonData.customFolders && jsonData.customFolders.includes(folder);
                        const stmt = sqliteDB.db.prepare('INSERT OR IGNORE INTO folders (name, is_custom) VALUES (?, ?)');
                        stmt.run(folder, isCustom);
                    } catch (error) {
                        console.warn(`Warning: Could not migrate folder '${folder}':`, error.message);
                    }
                }
            }
            console.log(`✓ Migrated ${allFolders.length - 1} folders`);
            
            // Migrate settings
            if (jsonData.settings) {
                for (const [key, value] of Object.entries(jsonData.settings)) {
                    try {
                        const stmt = sqliteDB.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
                        stmt.run(key, JSON.stringify(value));
                    } catch (error) {
                        console.warn(`Warning: Could not migrate setting '${key}':`, error.message);
                    }
                }
                console.log(`✓ Migrated ${Object.keys(jsonData.settings).length} settings`);
            }
            
        } catch (error) {
            console.error('Data migration failed:', error);
            throw error;
        }
    }

    async validateMigration(originalData, sqliteDB) {
        console.log('🔍 Validating migration...');
        
        try {
            const migratedData = await sqliteDB.loadData();
            
            // Validate prompt count
            const originalCount = originalData.prompts.length;
            const migratedCount = migratedData.prompts.length;
            
            if (originalCount !== migratedCount) {
                throw new Error(`Prompt count mismatch: original ${originalCount}, migrated ${migratedCount}`);
            }
            
            // Validate random samples
            if (originalCount > 0) {
                const sampleSize = Math.min(5, originalCount);
                for (let i = 0; i < sampleSize; i++) {
                    const originalPrompt = originalData.prompts[i];
                    const migratedPrompt = migratedData.prompts.find(p => p.id === originalPrompt.id);
                    
                    if (!migratedPrompt) {
                        throw new Error(`Missing prompt in migration: ${originalPrompt.id}`);
                    }
                    
                    if (originalPrompt.text !== migratedPrompt.text) {
                        throw new Error(`Text mismatch for prompt ${originalPrompt.id}`);
                    }
                }
            }
            
            // Test search functionality
            if (migratedCount > 0) {
                const searchResults = await sqliteDB.search('test');
                console.log(`✓ Search functionality working (${searchResults.length} results for 'test')`);
            }
            
            console.log('✓ Migration validation passed');
            
        } catch (error) {
            console.error('Validation failed:', error);
            throw error;
        }
    }

    async updateConfiguration() {
        console.log('⚙️ Updating configuration...');
        
        try {
            const PersonalConfigManager = require('../src/services/personal-config');
            const configManager = new PersonalConfigManager();
            
            await configManager.updateConfig({
                database: {
                    type: 'sqlite',
                    path: './data/prompts.db'
                }
            });
            
            console.log('✓ Configuration updated to use SQLite');
            
        } catch (error) {
            console.warn('Could not update configuration automatically:', error.message);
            console.log('ℹ️ Please manually update config/personal.json to use SQLite');
        }
    }

    async rollback() {
        try {
            console.log('🔄 Rolling back migration...');
            
            // Remove SQLite database if it exists
            try {
                await fs.unlink(this.sqlitePath);
                console.log('✓ Removed SQLite database');
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.warn('Could not remove SQLite database:', error.message);
                }
            }
            
            // Restore JSON from backup
            try {
                await fs.copyFile(this.backupPath, this.jsonPath);
                console.log('✓ Restored JSON database from backup');
            } catch (error) {
                console.warn('Could not restore JSON backup:', error.message);
            }
            
            console.log('✓ Rollback completed');
            
        } catch (error) {
            console.error('Rollback failed:', error);
        }
    }

    async testSQLitePerformance() {
        console.log('\n🧪 Testing SQLite performance...');
        
        try {
            const sqliteDB = new SQLitePersonalDB(this.sqlitePath);
            await sqliteDB.init();
            
            // Test data loading
            const loadTimer = this.monitor.startTimer('sqlite_load_test');
            const data = await sqliteDB.loadData();
            const loadResult = loadTimer();
            
            console.log(`✓ Load test: ${loadResult.duration.toFixed(2)}ms for ${data.prompts.length} prompts`);
            
            // Test search performance
            if (data.prompts.length > 0) {
                const searchTimer = this.monitor.startTimer('sqlite_search_test');
                const searchResults = await sqliteDB.search('test');
                const searchResult = searchTimer();
                
                console.log(`✓ Search test: ${searchResult.duration.toFixed(2)}ms for ${searchResults.length} results`);
            }
            
            // Test backup performance
            const backupTimer = this.monitor.startTimer('sqlite_backup_test');
            await sqliteDB.backup();
            const backupResult = backupTimer();
            
            console.log(`✓ Backup test: ${backupResult.duration.toFixed(2)}ms`);
            
            await sqliteDB.close();
            
            console.log('✅ Performance tests completed');
            
        } catch (error) {
            console.error('Performance test failed:', error);
        }
    }
}

// Run migration if called directly
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    
    migrator.migrate()
        .then(async (success) => {
            if (success) {
                await migrator.testSQLitePerformance();
                console.log('\n🎉 SQLite migration completed successfully!');
                console.log('\nNext steps:');
                console.log('1. Restart your application');
                console.log('2. Verify all data is accessible');
                console.log('3. Test search functionality');
                console.log('4. Monitor performance improvements');
                process.exit(0);
            } else {
                console.log('\n❌ Migration failed. Please check the logs and try again.');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Migration script error:', error);
            process.exit(1);
        });
}

module.exports = DatabaseMigrator;