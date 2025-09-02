/**
 * Personal Backup Management System
 * 
 * Intelligent backup system optimized for personal use
 * Features: Incremental backups, automatic retention, compression, restore
 */

const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const PersonalPerformanceMonitor = require('../utils/personal-monitor');

class PersonalBackupManager {
    constructor(config = {}) {
        this.backupDir = config.backupDir || './backups';
        this.maxBackups = config.maxBackups || 10;
        this.compressionEnabled = config.compression || false;
        this.retentionDays = config.retentionDays || 30;
        this.monitor = new PersonalPerformanceMonitor();
        this.backupTypes = ['auto', 'manual', 'migration', 'scheduled'];
        
        // Backup metadata
        this.metadata = new Map();
    }

    /**
     * Initialize backup system
     */
    async init() {
        try {
            // Ensure backup directory exists
            await fs.mkdir(this.backupDir, { recursive: true });
            
            // Load existing backup metadata
            await this.loadBackupMetadata();
            
            console.log('✓ Personal Backup Manager initialized');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize backup manager:', error);
            return false;
        }
    }

    /**
     * Create automatic backup with intelligent naming
     */
    async createAutoBackup(sourceType = 'database') {
        const endTimer = this.monitor.startTimer('auto_backup');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = `auto-${sourceType}-${timestamp}`;
            
            let backupPath;
            let sourcePath;
            
            switch (sourceType) {
                case 'database':
                    sourcePath = './data/prompts.db';
                    backupPath = path.join(this.backupDir, `${backupId}.db`);
                    break;
                case 'config':
                    sourcePath = './config/personal.json';
                    backupPath = path.join(this.backupDir, `${backupId}.json`);
                    break;
                case 'full':
                    return await this.createFullBackup('auto');
                default:
                    throw new Error(`Unknown source type: ${sourceType}`);
            }

            // Check if source exists
            try {
                await fs.access(sourcePath);
            } catch (error) {
                console.warn(`Source file not found: ${sourcePath}`);
                return null;
            }

            // Create backup
            if (sourceType === 'database' && this.isDatabaseFile(sourcePath)) {
                // Use SQLite VACUUM for database backups
                await this.createDatabaseBackup(sourcePath, backupPath);
            } else {
                // Simple file copy for other files
                await fs.copyFile(sourcePath, backupPath);
            }

            // Record backup metadata
            const metadata = {
                id: backupId,
                type: 'auto',
                sourceType,
                sourcePath,
                backupPath,
                size: await this.getFileSize(backupPath),
                timestamp: new Date().toISOString(),
                checksum: await this.calculateChecksum(backupPath)
            };

            this.metadata.set(backupId, metadata);
            await this.saveBackupMetadata();

            // Clean old backups
            await this.cleanOldBackups();

            const result = endTimer();
            console.log(`✓ Auto backup created: ${backupPath} (${result.duration.toFixed(2)}ms)`);
            
            return {
                id: backupId,
                path: backupPath,
                size: metadata.size,
                duration: result.duration
            };
            
        } catch (error) {
            console.error('Auto backup failed:', error);
            throw error;
        }
    }

    /**
     * Create manual backup with user-defined name
     */
    async createManualBackup(name, description = '') {
        const endTimer = this.monitor.startTimer('manual_backup');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
            const backupId = `manual-${sanitizedName}-${timestamp}`;
            
            const result = await this.createFullBackup('manual', backupId, description);
            
            const timing = endTimer();
            console.log(`✓ Manual backup "${name}" created in ${timing.duration.toFixed(2)}ms`);
            
            return result;
            
        } catch (error) {
            console.error('Manual backup failed:', error);
            throw error;
        }
    }

    /**
     * Create full system backup
     */
    async createFullBackup(type = 'manual', customId = null, description = '') {
        const endTimer = this.monitor.startTimer('full_backup');
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupId = customId || `full-${type}-${timestamp}`;
            const backupDir = path.join(this.backupDir, backupId);
            
            // Create backup directory
            await fs.mkdir(backupDir, { recursive: true });
            
            const backupItems = [];
            
            // Backup database
            try {
                const dbBackupPath = path.join(backupDir, 'prompts.db');
                await this.createDatabaseBackup('./data/prompts.db', dbBackupPath);
                backupItems.push({ type: 'database', path: 'prompts.db', size: await this.getFileSize(dbBackupPath) });
            } catch (error) {
                console.warn('Could not backup database:', error.message);
            }
            
            // Backup configuration
            try {
                const configBackupPath = path.join(backupDir, 'personal.json');
                await fs.copyFile('./config/personal.json', configBackupPath);
                backupItems.push({ type: 'config', path: 'personal.json', size: await this.getFileSize(configBackupPath) });
            } catch (error) {
                console.warn('Could not backup config:', error.message);
            }
            
            // Backup existing JSON data if it exists
            try {
                const jsonBackupPath = path.join(backupDir, 'prompts.json');
                await fs.copyFile('./data/prompts.json', jsonBackupPath);
                backupItems.push({ type: 'json', path: 'prompts.json', size: await this.getFileSize(jsonBackupPath) });
            } catch (error) {
                // JSON backup not critical if SQLite is primary
            }
            
            // Create backup manifest
            const manifest = {
                id: backupId,
                type,
                description,
                timestamp: new Date().toISOString(),
                items: backupItems,
                totalSize: backupItems.reduce((sum, item) => sum + item.size, 0),
                version: '2.0.0'
            };
            
            await fs.writeFile(
                path.join(backupDir, 'manifest.json'), 
                JSON.stringify(manifest, null, 2)
            );
            
            // Record backup metadata
            const metadata = {
                id: backupId,
                type,
                sourceType: 'full',
                backupPath: backupDir,
                size: manifest.totalSize,
                timestamp: manifest.timestamp,
                description,
                items: backupItems.length
            };
            
            this.metadata.set(backupId, metadata);
            await this.saveBackupMetadata();
            
            const result = endTimer();
            console.log(`✓ Full backup created: ${backupDir} (${backupItems.length} items, ${result.duration.toFixed(2)}ms)`);
            
            return {
                id: backupId,
                path: backupDir,
                manifest,
                duration: result.duration
            };
            
        } catch (error) {
            console.error('Full backup failed:', error);
            throw error;
        }
    }

    /**
     * Create database backup using SQLite VACUUM
     */
    async createDatabaseBackup(sourcePath, backupPath) {
        try {
            // Check if it's an SQLite database
            if (this.isDatabaseFile(sourcePath)) {
                const Database = require('better-sqlite3');
                const sourceDb = new Database(sourcePath, { readonly: true });
                
                try {
                    // Use VACUUM INTO for efficient backup
                    sourceDb.prepare(`VACUUM INTO ?`).run(backupPath);
                } finally {
                    sourceDb.close();
                }
            } else {
                // Fallback to file copy
                await fs.copyFile(sourcePath, backupPath);
            }
            
        } catch (error) {
            console.error('Database backup failed, falling back to file copy:', error.message);
            await fs.copyFile(sourcePath, backupPath);
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupId, options = {}) {
        const endTimer = this.monitor.startTimer('restore_backup');
        
        try {
            const backup = this.metadata.get(backupId);
            if (!backup) {
                throw new Error(`Backup not found: ${backupId}`);
            }
            
            console.log(`🔄 Restoring from backup: ${backupId}`);
            
            // Create safety backup before restore
            if (!options.skipSafetyBackup) {
                console.log('Creating safety backup before restore...');
                await this.createAutoBackup('database');
            }
            
            if (backup.sourceType === 'full') {
                await this.restoreFullBackup(backup, options);
            } else {
                await this.restoreSingleFileBackup(backup, options);
            }
            
            const result = endTimer();
            console.log(`✓ Restore completed in ${result.duration.toFixed(2)}ms`);
            
            return {
                backupId,
                restored: true,
                duration: result.duration
            };
            
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    /**
     * Restore full backup
     */
    async restoreFullBackup(backup, options) {
        const manifestPath = path.join(backup.backupPath, 'manifest.json');
        
        try {
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            
            for (const item of manifest.items) {
                const sourcePath = path.join(backup.backupPath, item.path);
                let targetPath;
                
                switch (item.type) {
                    case 'database':
                        targetPath = './data/prompts.db';
                        break;
                    case 'config':
                        targetPath = './config/personal.json';
                        break;
                    case 'json':
                        targetPath = './data/prompts.json';
                        break;
                    default:
                        continue;
                }
                
                // Ensure target directory exists
                await fs.mkdir(path.dirname(targetPath), { recursive: true });
                
                // Restore file
                await fs.copyFile(sourcePath, targetPath);
                console.log(`✓ Restored ${item.type}: ${targetPath}`);
            }
            
        } catch (error) {
            console.error('Failed to restore full backup:', error);
            throw error;
        }
    }

    /**
     * Restore single file backup
     */
    async restoreSingleFileBackup(backup, options) {
        try {
            await fs.copyFile(backup.backupPath, backup.sourcePath);
            console.log(`✓ Restored ${backup.sourceType}: ${backup.sourcePath}`);
            
        } catch (error) {
            console.error('Failed to restore single file backup:', error);
            throw error;
        }
    }

    /**
     * List available backups
     */
    async listBackups(filter = {}) {
        const backups = Array.from(this.metadata.values());
        
        let filtered = backups;
        
        if (filter.type) {
            filtered = filtered.filter(b => b.type === filter.type);
        }
        
        if (filter.sourceType) {
            filtered = filtered.filter(b => b.sourceType === filter.sourceType);
        }
        
        if (filter.since) {
            const since = new Date(filter.since);
            filtered = filtered.filter(b => new Date(b.timestamp) >= since);
        }
        
        // Sort by timestamp (newest first)
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return filtered.map(backup => ({
            id: backup.id,
            type: backup.type,
            sourceType: backup.sourceType,
            size: this.formatFileSize(backup.size),
            timestamp: backup.timestamp,
            description: backup.description || '',
            age: this.getRelativeTime(backup.timestamp)
        }));
    }

    /**
     * Clean old backups according to retention policy
     */
    async cleanOldBackups() {
        try {
            const backups = Array.from(this.metadata.values());
            const now = new Date();
            const autoBackups = backups.filter(b => b.type === 'auto');
            
            // Sort by timestamp (oldest first)
            autoBackups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            const toDelete = [];
            
            // Remove backups older than retention period
            for (const backup of autoBackups) {
                const age = (now - new Date(backup.timestamp)) / (1000 * 60 * 60 * 24); // days
                if (age > this.retentionDays) {
                    toDelete.push(backup);
                }
            }
            
            // Remove excess backups beyond maxBackups
            const recentAutoBackups = autoBackups.filter(b => !toDelete.includes(b));
            if (recentAutoBackups.length > this.maxBackups) {
                const excess = recentAutoBackups.slice(0, recentAutoBackups.length - this.maxBackups);
                toDelete.push(...excess);
            }
            
            // Delete old backups
            for (const backup of toDelete) {
                try {
                    if (backup.sourceType === 'full') {
                        // Remove full backup directory
                        await fs.rm(backup.backupPath, { recursive: true, force: true });
                    } else {
                        // Remove single file
                        await fs.unlink(backup.backupPath);
                    }
                    
                    this.metadata.delete(backup.id);
                    console.log(`✓ Cleaned old backup: ${backup.id}`);
                    
                } catch (error) {
                    console.warn(`Could not delete backup ${backup.id}:`, error.message);
                }
            }
            
            if (toDelete.length > 0) {
                await this.saveBackupMetadata();
                console.log(`✓ Cleaned ${toDelete.length} old backups`);
            }
            
        } catch (error) {
            console.error('Failed to clean old backups:', error);
        }
    }

    /**
     * Get backup statistics
     */
    getBackupStats() {
        const backups = Array.from(this.metadata.values());
        
        const stats = {
            total: backups.length,
            byType: {},
            totalSize: 0,
            oldestBackup: null,
            newestBackup: null,
            sizeByType: {}
        };
        
        for (const backup of backups) {
            // Count by type
            stats.byType[backup.type] = (stats.byType[backup.type] || 0) + 1;
            
            // Total size
            stats.totalSize += backup.size || 0;
            
            // Size by type
            stats.sizeByType[backup.type] = (stats.sizeByType[backup.type] || 0) + (backup.size || 0);
            
            // Oldest/newest
            if (!stats.oldestBackup || new Date(backup.timestamp) < new Date(stats.oldestBackup.timestamp)) {
                stats.oldestBackup = backup;
            }
            
            if (!stats.newestBackup || new Date(backup.timestamp) > new Date(stats.newestBackup.timestamp)) {
                stats.newestBackup = backup;
            }
        }
        
        return {
            ...stats,
            totalSizeFormatted: this.formatFileSize(stats.totalSize),
            averageSize: backups.length > 0 ? this.formatFileSize(stats.totalSize / backups.length) : '0 B'
        };
    }

    /**
     * Verify backup integrity
     */
    async verifyBackup(backupId) {
        const backup = this.metadata.get(backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        
        try {
            // Check if backup file/directory exists
            await fs.access(backup.backupPath);
            
            // Verify checksum if available
            if (backup.checksum && backup.sourceType !== 'full') {
                const currentChecksum = await this.calculateChecksum(backup.backupPath);
                if (currentChecksum !== backup.checksum) {
                    return { valid: false, error: 'Checksum mismatch' };
                }
            }
            
            // For full backups, verify manifest
            if (backup.sourceType === 'full') {
                const manifestPath = path.join(backup.backupPath, 'manifest.json');
                try {
                    await fs.access(manifestPath);
                    const manifestData = await fs.readFile(manifestPath, 'utf8');
                    JSON.parse(manifestData); // Verify it's valid JSON
                } catch (error) {
                    return { valid: false, error: 'Invalid manifest' };
                }
            }
            
            return { valid: true };
            
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Utility methods
     */
    
    async loadBackupMetadata() {
        const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
        
        try {
            const data = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(data);
            
            for (const [id, backup] of Object.entries(metadata)) {
                this.metadata.set(id, backup);
            }
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn('Could not load backup metadata:', error.message);
            }
        }
    }

    async saveBackupMetadata() {
        const metadataPath = path.join(this.backupDir, 'backup-metadata.json');
        const metadata = Object.fromEntries(this.metadata);
        
        try {
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Could not save backup metadata:', error);
        }
    }

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    async calculateChecksum(filePath) {
        const crypto = require('crypto');
        const hash = crypto.createHash('md5');
        
        try {
            const data = await fs.readFile(filePath);
            hash.update(data);
            return hash.digest('hex');
        } catch {
            return null;
        }
    }

    isDatabaseFile(filePath) {
        return filePath.endsWith('.db') || filePath.endsWith('.sqlite') || filePath.endsWith('.sqlite3');
    }

    formatFileSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    getRelativeTime(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;
        
        if (diffHours < 1) {
            return 'Just now';
        } else if (diffHours < 24) {
            return `${Math.floor(diffHours)} hours ago`;
        } else if (diffDays < 7) {
            return `${Math.floor(diffDays)} days ago`;
        } else {
            return then.toLocaleDateString();
        }
    }
}

module.exports = PersonalBackupManager;