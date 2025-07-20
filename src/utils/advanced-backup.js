class AdvancedBackupSystem {
    constructor(options = {}) {
        this.options = {
            enableAutoBackup: options.enableAutoBackup !== false,
            backupInterval: options.backupInterval || 24 * 60 * 60 * 1000, // 24 hours
            maxBackups: options.maxBackups || 30,
            enableCompression: options.enableCompression !== false,
            enableEncryption: options.enableEncryption || false,
            backupLocation: options.backupLocation || './backups',
            enableCloudSync: options.enableCloudSync || false,
            ...options
        };
        
        this.backupHistory = [];
        this.autoBackupInterval = null;
        this.logger = options.logger || console;
        
        if (this.options.enableAutoBackup) {
            this.startAutoBackup();
        }
    }
    
    async createBackup(data, options = {}) {
        const backupId = this.generateBackupId();
        const timestamp = new Date().toISOString();
        
        try {
            const backupData = {
                id: backupId,
                timestamp,
                version: '1.0',
                type: options.type || 'full',
                metadata: {
                    totalPrompts: data.prompts?.length || 0,
                    totalCategories: data.categories?.length || 0,
                    totalTags: this.countUniqueTags(data.prompts || []),
                    sourceVersion: data.metadata?.version || '1.0',
                    backupTrigger: options.trigger || 'manual'
                },
                data: await this.processBackupData(data, options)
            };
            
            // Add integrity hash
            backupData.integrity = await this.calculateIntegrityHash(backupData.data);
            
            // Compress if enabled
            if (this.options.enableCompression) {
                backupData.data = await this.compressData(backupData.data);
                backupData.compressed = true;
            }
            
            // Encrypt if enabled
            if (this.options.enableEncryption && options.encryptionKey) {
                backupData.data = await this.encryptData(backupData.data, options.encryptionKey);
                backupData.encrypted = true;
            }
            
            // Save backup
            const backupPath = await this.saveBackup(backupData, options);
            
            // Update backup history
            this.backupHistory.push({
                id: backupId,
                timestamp,
                type: backupData.type,
                size: this.calculateBackupSize(backupData),
                path: backupPath,
                metadata: backupData.metadata,
                compressed: backupData.compressed || false,
                encrypted: backupData.encrypted || false
            });
            
            // Cleanup old backups
            await this.cleanupOldBackups();
            
            this.logger.info('Backup created successfully', {
                id: backupId,
                type: backupData.type,
                size: this.formatSize(this.calculateBackupSize(backupData))
            });
            
            return {
                id: backupId,
                timestamp,
                path: backupPath,
                size: this.calculateBackupSize(backupData),
                metadata: backupData.metadata
            };
            
        } catch (error) {
            this.logger.error('Backup creation failed', { error: error.message });
            throw error;
        }
    }
    
    async restoreBackup(backupId, options = {}) {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) {
            throw new Error(`Backup ${backupId} not found`);
        }
        
        try {
            // Load backup data
            let backupData = await this.loadBackup(backup.path);
            
            // Decrypt if needed
            if (backup.encrypted) {
                if (!options.decryptionKey) {
                    throw new Error('Decryption key required for encrypted backup');
                }
                backupData.data = await this.decryptData(backupData.data, options.decryptionKey);
            }
            
            // Decompress if needed
            if (backup.compressed) {
                backupData.data = await this.decompressData(backupData.data);
            }
            
            // Verify integrity
            const calculatedHash = await this.calculateIntegrityHash(backupData.data);
            if (calculatedHash !== backupData.integrity) {
                throw new Error('Backup integrity verification failed');
            }
            
            // Validate backup data
            this.validateBackupData(backupData.data);
            
            // Create restore point before restoration
            if (options.createRestorePoint !== false) {
                await this.createRestorePoint(options.currentData);
            }
            
            this.logger.info('Backup restored successfully', {
                id: backupId,
                timestamp: backup.timestamp,
                type: backup.type
            });
            
            return backupData.data;
            
        } catch (error) {
            this.logger.error('Backup restoration failed', { 
                backupId, 
                error: error.message 
            });
            throw error;
        }
    }
    
    async createIncrementalBackup(currentData, lastBackupId = null) {
        const lastBackup = lastBackupId ? 
            this.backupHistory.find(b => b.id === lastBackupId) :
            this.getLastFullBackup();
        
        if (!lastBackup) {
            // No previous backup, create full backup
            return this.createBackup(currentData, { type: 'full', trigger: 'incremental-fallback' });
        }
        
        try {
            const lastBackupData = await this.loadBackup(lastBackup.path);
            const changes = this.calculateDataChanges(lastBackupData.data, currentData);
            
            if (changes.totalChanges === 0) {
                this.logger.info('No changes detected, skipping incremental backup');
                return null;
            }
            
            const incrementalData = {
                baseBackupId: lastBackup.id,
                changes,
                timestamp: new Date().toISOString()
            };
            
            return this.createBackup(incrementalData, { 
                type: 'incremental', 
                trigger: 'auto-incremental',
                baseBackupId: lastBackup.id
            });
            
        } catch (error) {
            this.logger.error('Incremental backup failed, falling back to full backup', {
                error: error.message
            });
            
            return this.createBackup(currentData, { type: 'full', trigger: 'incremental-error' });
        }
    }
    
    async createDifferentialBackup(currentData, baseBackupId) {
        const baseBackup = this.backupHistory.find(b => b.id === baseBackupId);
        if (!baseBackup) {
            throw new Error(`Base backup ${baseBackupId} not found`);
        }
        
        const baseBackupData = await this.loadBackup(baseBackup.path);
        const differences = this.calculateDataDifferences(baseBackupData.data, currentData);
        
        const differentialData = {
            baseBackupId,
            differences,
            timestamp: new Date().toISOString()
        };
        
        return this.createBackup(differentialData, { 
            type: 'differential', 
            trigger: 'manual-differential',
            baseBackupId
        });
    }
    
    async validateBackup(backupId) {
        const backup = this.backupHistory.find(b => b.id === backupId);
        if (!backup) {
            throw new Error(`Backup ${backupId} not found`);
        }
        
        const validation = {
            id: backupId,
            valid: false,
            issues: [],
            metadata: backup.metadata,
            size: backup.size,
            timestamp: backup.timestamp
        };
        
        try {
            // Check file exists
            const exists = await this.checkBackupExists(backup.path);
            if (!exists) {
                validation.issues.push('Backup file not found');
                return validation;
            }
            
            // Load and validate structure
            const backupData = await this.loadBackup(backup.path);
            
            // Verify integrity hash
            if (backupData.integrity) {
                let data = backupData.data;
                
                if (backup.encrypted) {
                    validation.issues.push('Cannot validate encrypted backup without key');
                    return validation;
                }
                
                if (backup.compressed) {
                    data = await this.decompressData(data);
                }
                
                const calculatedHash = await this.calculateIntegrityHash(data);
                if (calculatedHash !== backupData.integrity) {
                    validation.issues.push('Integrity hash mismatch');
                } else {
                    validation.issues.push('Integrity verified');
                }
            }
            
            // Validate data structure
            try {
                this.validateBackupData(backupData.data);
            } catch (error) {
                validation.issues.push(`Data validation failed: ${error.message}`);
            }
            
            validation.valid = validation.issues.length === 0 || 
                             validation.issues.every(issue => issue === 'Integrity verified');
            
        } catch (error) {
            validation.issues.push(`Validation error: ${error.message}`);
        }
        
        return validation;
    }
    
    calculateDataChanges(oldData, newData) {
        const changes = {
            added: [],
            modified: [],
            deleted: [],
            totalChanges: 0
        };
        
        const oldPrompts = new Map((oldData.prompts || []).map(p => [p.id, p]));
        const newPrompts = new Map((newData.prompts || []).map(p => [p.id, p]));
        
        // Find added prompts
        for (const [id, prompt] of newPrompts) {
            if (!oldPrompts.has(id)) {
                changes.added.push(prompt);
            }
        }
        
        // Find deleted prompts
        for (const [id, prompt] of oldPrompts) {
            if (!newPrompts.has(id)) {
                changes.deleted.push({ id, prompt });
            }
        }
        
        // Find modified prompts
        for (const [id, newPrompt] of newPrompts) {
            const oldPrompt = oldPrompts.get(id);
            if (oldPrompt && !this.arePromptsEqual(oldPrompt, newPrompt)) {
                changes.modified.push({
                    id,
                    oldPrompt,
                    newPrompt,
                    differences: this.getPromptDifferences(oldPrompt, newPrompt)
                });
            }
        }
        
        changes.totalChanges = changes.added.length + changes.modified.length + changes.deleted.length;
        
        return changes;
    }
    
    calculateDataDifferences(baseData, currentData) {
        // Similar to calculateDataChanges but tracks all differences from base
        return this.calculateDataChanges(baseData, currentData);
    }
    
    arePromptsEqual(prompt1, prompt2) {
        const keys = ['text', 'category', 'tags', 'rating', 'notes', 'updatedAt'];
        
        for (const key of keys) {
            if (JSON.stringify(prompt1[key]) !== JSON.stringify(prompt2[key])) {
                return false;
            }
        }
        
        return true;
    }
    
    getPromptDifferences(oldPrompt, newPrompt) {
        const differences = {};
        const keys = ['text', 'category', 'tags', 'rating', 'notes'];
        
        for (const key of keys) {
            if (JSON.stringify(oldPrompt[key]) !== JSON.stringify(newPrompt[key])) {
                differences[key] = {
                    old: oldPrompt[key],
                    new: newPrompt[key]
                };
            }
        }
        
        return differences;
    }
    
    async processBackupData(data, options) {
        // Clone data to avoid modifying original
        const processedData = JSON.parse(JSON.stringify(data));
        
        // Add backup-specific metadata
        processedData._backup = {
            createdAt: new Date().toISOString(),
            type: options.type || 'full',
            trigger: options.trigger || 'manual',
            options: {
                includeSettings: options.includeSettings !== false,
                includeAnalytics: options.includeAnalytics || false,
                includeUserData: options.includeUserData || false
            }
        };
        
        // Remove sensitive data if requested
        if (options.excludeSensitive) {
            if (processedData.settings) {
                delete processedData.settings.openaiApiKey;
            }
        }
        
        // Include analytics if requested
        if (options.includeAnalytics && options.analytics) {
            processedData._analytics = options.analytics;
        }
        
        return processedData;
    }
    
    async saveBackup(backupData, options) {
        const filename = this.generateBackupFilename(backupData);
        const filepath = `${this.options.backupLocation}/${filename}`;
        
        // Ensure backup directory exists
        await this.ensureBackupDirectory();
        
        // Save backup file
        const fs = require('fs').promises;
        await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
        
        // Cloud sync if enabled
        if (this.options.enableCloudSync && options.cloudProvider) {
            await this.syncToCloud(filepath, options.cloudProvider);
        }
        
        return filepath;
    }
    
    async loadBackup(backupPath) {
        const fs = require('fs').promises;
        const data = await fs.readFile(backupPath, 'utf8');
        return JSON.parse(data);
    }
    
    generateBackupId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `backup_${timestamp}_${random}`;
    }
    
    generateBackupFilename(backupData) {
        const date = new Date(backupData.timestamp);
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '');
        
        return `${backupData.type}_${dateStr}_${timeStr}_${backupData.id}.json`;
    }
    
    async ensureBackupDirectory() {
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            await fs.access(this.options.backupLocation);
        } catch {
            await fs.mkdir(this.options.backupLocation, { recursive: true });
        }
    }
    
    calculateBackupSize(backupData) {
        return JSON.stringify(backupData).length;
    }
    
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    countUniqueTags(prompts) {
        const tags = new Set();
        prompts.forEach(prompt => {
            (prompt.tags || []).forEach(tag => tags.add(tag));
        });
        return tags.size;
    }
    
    async calculateIntegrityHash(data) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }
    
    async compressData(data) {
        const zlib = require('zlib');
        const compressed = zlib.gzipSync(JSON.stringify(data));
        return compressed.toString('base64');
    }
    
    async decompressData(compressedData) {
        const zlib = require('zlib');
        const buffer = Buffer.from(compressedData, 'base64');
        const decompressed = zlib.gunzipSync(buffer);
        return JSON.parse(decompressed.toString());
    }
    
    async encryptData(data, key) {
        const crypto = require('crypto');
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key);
        cipher.setAAD(Buffer.from('backup-data'));
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    async decryptData(encryptedData, key) {
        const crypto = require('crypto');
        const algorithm = 'aes-256-gcm';
        
        const decipher = crypto.createDecipher(algorithm, key);
        decipher.setAAD(Buffer.from('backup-data'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
    }
    
    validateBackupData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid backup data structure');
        }
        
        if (!data.prompts || !Array.isArray(data.prompts)) {
            throw new Error('Invalid prompts data');
        }
        
        // Validate each prompt
        data.prompts.forEach((prompt, index) => {
            if (!prompt.id || !prompt.text) {
                throw new Error(`Invalid prompt at index ${index}`);
            }
        });
    }
    
    async checkBackupExists(path) {
        const fs = require('fs').promises;
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
    
    startAutoBackup() {
        this.autoBackupInterval = setInterval(async () => {
            try {
                await this.triggerAutoBackup();
            } catch (error) {
                this.logger.error('Auto backup failed', { error: error.message });
            }
        }, this.options.backupInterval);
        
        this.logger.info('Auto backup started', {
            interval: `${this.options.backupInterval / 1000 / 60} minutes`
        });
    }
    
    stopAutoBackup() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
            this.logger.info('Auto backup stopped');
        }
    }
    
    async triggerAutoBackup() {
        // This would be called by the main application with current data
        // For now, it's a placeholder
        this.logger.info('Auto backup triggered');
    }
    
    async cleanupOldBackups() {
        if (this.backupHistory.length <= this.options.maxBackups) {
            return;
        }
        
        const fs = require('fs').promises;
        const backupsToDelete = this.backupHistory
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(0, this.backupHistory.length - this.options.maxBackups);
        
        for (const backup of backupsToDelete) {
            try {
                await fs.unlink(backup.path);
                const index = this.backupHistory.findIndex(b => b.id === backup.id);
                if (index !== -1) {
                    this.backupHistory.splice(index, 1);
                }
                
                this.logger.info('Old backup deleted', { id: backup.id });
            } catch (error) {
                this.logger.error('Failed to delete old backup', {
                    id: backup.id,
                    error: error.message
                });
            }
        }
    }
    
    async createRestorePoint(data) {
        return this.createBackup(data, {
            type: 'restore-point',
            trigger: 'pre-restore'
        });
    }
    
    getLastFullBackup() {
        return this.backupHistory
            .filter(b => b.type === 'full')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    }
    
    getBackupHistory() {
        return [...this.backupHistory].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }
    
    getBackupStatistics() {
        const history = this.getBackupHistory();
        const totalSize = history.reduce((sum, backup) => sum + backup.size, 0);
        
        const typeBreakdown = {};
        history.forEach(backup => {
            typeBreakdown[backup.type] = (typeBreakdown[backup.type] || 0) + 1;
        });
        
        return {
            totalBackups: history.length,
            totalSize: this.formatSize(totalSize),
            typeBreakdown,
            oldestBackup: history.length > 0 ? history[history.length - 1].timestamp : null,
            newestBackup: history.length > 0 ? history[0].timestamp : null,
            averageSize: history.length > 0 ? this.formatSize(totalSize / history.length) : '0 B',
            autoBackupEnabled: this.options.enableAutoBackup,
            compressionEnabled: this.options.enableCompression,
            encryptionEnabled: this.options.enableEncryption
        };
    }
    
    async syncToCloud(filePath, cloudProvider) {
        // Placeholder for cloud sync implementation
        this.logger.info('Cloud sync not implemented', { filePath, cloudProvider });
    }
    
    async importBackupHistory(historyData) {
        if (!Array.isArray(historyData)) {
            throw new Error('Invalid backup history data');
        }
        
        const imported = [];
        const failed = [];
        
        for (const backup of historyData) {
            try {
                // Validate backup entry
                if (!backup.id || !backup.timestamp || !backup.path) {
                    throw new Error('Invalid backup entry');
                }
                
                // Check if backup file exists
                const exists = await this.checkBackupExists(backup.path);
                if (!exists) {
                    throw new Error('Backup file not found');
                }
                
                // Add to history if not already present
                const existing = this.backupHistory.find(b => b.id === backup.id);
                if (!existing) {
                    this.backupHistory.push(backup);
                    imported.push(backup.id);
                }
                
            } catch (error) {
                failed.push({ backup: backup.id || 'unknown', error: error.message });
            }
        }
        
        return {
            imported: imported.length,
            failed: failed.length,
            failures: failed
        };
    }
    
    exportBackupHistory() {
        return {
            history: this.backupHistory,
            statistics: this.getBackupStatistics(),
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
}

module.exports = AdvancedBackupSystem;