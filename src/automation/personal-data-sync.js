/**
 * Personal Data Manager
 * 
 * Comprehensive data management for sync, export, and cross-device preparation
 * Features: Multiple export formats, sync preparation, data validation
 */

const fs = require('fs').promises;
const path = require('path');
const PersonalPerformanceMonitor = require('../utils/personal-monitor');

class PersonalDataManager {
    constructor(config = {}) {
        this.config = {
            exportFormats: config.exportFormats || ['json', 'csv', 'markdown', 'yaml'],
            syncEnabled: config.syncEnabled || false,
            syncProvider: config.syncProvider || 'local', // 'local', 'icloud', 'dropbox'
            encryptExports: config.encryptExports || false,
            compressionEnabled: config.compressionEnabled || true
        };
        
        this.monitor = new PersonalPerformanceMonitor();
        this.exportHistory = [];
        this.syncHistory = [];
        
        console.log('✓ Personal Data Manager initialized');
    }

    /**
     * Export personal data in multiple formats
     */
    async exportPersonalData(format = 'json', options = {}) {
        const endTimer = this.monitor.startTimer(`export_${format}`);
        
        try {
            console.log(`📦 Exporting data in ${format.toUpperCase()} format...`);
            
            // Load all data
            const data = await this.loadCompleteDataSet();
            
            // Export based on format
            let exportedData;
            let filename;
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportedData = await this.exportToJSON(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.json`;
                    break;
                case 'csv':
                    exportedData = await this.exportToCSV(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.csv`;
                    break;
                case 'markdown':
                    exportedData = await this.exportToMarkdown(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.md`;
                    break;
                case 'yaml':
                    exportedData = await this.exportToYAML(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.yml`;
                    break;
                case 'html':
                    exportedData = await this.exportToHTML(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.html`;
                    break;
                case 'xml':
                    exportedData = await this.exportToXML(data, options);
                    filename = `nlp-prompts-export-${this.getTimestamp()}.xml`;
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }

            // Apply compression if enabled
            if (this.config.compressionEnabled && format !== 'html') {
                exportedData = await this.compressData(exportedData, format);
                filename = filename.replace(/\.[^.]+$/, '.gz');
            }

            // Apply encryption if enabled
            if (this.config.encryptExports) {
                exportedData = await this.encryptData(exportedData);
                filename = filename.replace(/(\.[^.]+)$/, '.encrypted$1');
            }

            // Save or download file
            const result = await this.saveExportedData(exportedData, filename, format);
            
            // Record export
            this.recordExport({
                format,
                filename,
                size: exportedData.length,
                timestamp: new Date().toISOString(),
                options,
                compressed: this.config.compressionEnabled,
                encrypted: this.config.encryptExports
            });

            const timing = endTimer();
            console.log(`✓ Export completed: ${filename} (${timing.duration.toFixed(2)}ms)`);
            
            return {
                success: true,
                filename,
                size: exportedData.length,
                format,
                duration: timing.duration,
                ...result
            };
            
        } catch (error) {
            console.error(`Export failed (${format}):`, error);
            return {
                success: false,
                error: error.message,
                format
            };
        }
    }

    /**
     * Load complete dataset from all sources
     */
    async loadCompleteDataSet() {
        const data = {
            metadata: {
                exported: new Date().toISOString(),
                version: '2.0.0',
                source: 'Personal NLP Prompt Database',
                exportedBy: 'Personal Data Manager'
            },
            prompts: [],
            categories: [],
            folders: [],
            settings: {},
            analytics: {},
            performance: {},
            workflows: [],
            goals: {},
            insights: []
        };

        try {
            // Load prompts data
            if (typeof window !== 'undefined' && window.database) {
                const promptsData = await window.database.loadData();
                data.prompts = promptsData.prompts || [];
                data.categories = promptsData.categories || [];
                data.folders = [...(promptsData.folders || []), ...(promptsData.customFolders || [])];
                data.settings = promptsData.settings || {};
                
                // Load analytics
                try {
                    const analytics = await window.database.getAnalytics();
                    data.analytics = analytics;
                } catch (error) {
                    console.warn('Could not load analytics:', error.message);
                }
            }

            // Load performance data
            if (typeof window !== 'undefined' && window.performanceMonitor) {
                data.performance = window.performanceMonitor.getStats();
            }

            // Load workflows
            if (typeof window !== 'undefined' && window.workflowEngine) {
                data.workflows = window.workflowEngine.getWorkflows();
            }

            // Load goals from analytics dashboard
            if (typeof window !== 'undefined' && window.analyticsManager) {
                // Goals would be loaded here
                data.goals = {}; // Placeholder
            }

            // Load insights from local storage
            try {
                const insights = JSON.parse(localStorage.getItem('nlp_insights') || '{}');
                data.insights = insights.insights || [];
            } catch (error) {
                console.warn('Could not load insights from storage');
            }

            // Load usage data
            try {
                const usageData = JSON.parse(localStorage.getItem('nlp_usage_data') || '{}');
                data.usage = usageData;
            } catch (error) {
                console.warn('Could not load usage data from storage');
            }

            return data;
            
        } catch (error) {
            console.error('Failed to load complete dataset:', error);
            throw error;
        }
    }

    /**
     * Export to JSON format
     */
    async exportToJSON(data, options) {
        const exportData = {
            ...data,
            metadata: {
                ...data.metadata,
                format: 'json',
                schema: 'nlp-prompt-database-v2'
            }
        };

        // Apply filters if specified
        if (options.filters) {
            exportData.prompts = this.applyFilters(exportData.prompts, options.filters);
        }

        // Include/exclude sections based on options
        if (options.sections) {
            const filtered = { metadata: exportData.metadata };
            for (const section of options.sections) {
                if (exportData[section]) {
                    filtered[section] = exportData[section];
                }
            }
            return JSON.stringify(filtered, null, options.minify ? 0 : 2);
        }

        return JSON.stringify(exportData, null, options.minify ? 0 : 2);
    }

    /**
     * Export to CSV format
     */
    async exportToCSV(data, options) {
        const prompts = data.prompts || [];
        
        // Define CSV headers
        const headers = [
            'ID', 'Text', 'Category', 'Tags', 'Folder', 'Rating', 
            'Created', 'Updated', 'Usage Count', 'Notes'
        ];

        // Add custom fields if specified
        if (options.customFields) {
            headers.push(...options.customFields);
        }

        let csv = headers.join(',') + '\n';

        // Process each prompt
        for (const prompt of prompts) {
            const row = [
                this.escapeCsvValue(prompt.id),
                this.escapeCsvValue(prompt.text),
                this.escapeCsvValue(prompt.category),
                this.escapeCsvValue((prompt.tags || []).join('; ')),
                this.escapeCsvValue(prompt.folder),
                prompt.rating || 0,
                this.escapeCsvValue(prompt.createdAt || prompt.created_at),
                this.escapeCsvValue(prompt.updatedAt || prompt.updated_at),
                prompt.usage_count || 0,
                this.escapeCsvValue(prompt.notes)
            ];

            // Add custom field values
            if (options.customFields) {
                for (const field of options.customFields) {
                    row.push(this.escapeCsvValue(prompt[field] || ''));
                }
            }

            csv += row.join(',') + '\n';
        }

        return csv;
    }

    /**
     * Export to Markdown format
     */
    async exportToMarkdown(data, options) {
        const prompts = data.prompts || [];
        
        let markdown = `# Personal NLP Prompt Collection\n\n`;
        markdown += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;
        markdown += `**Total Prompts:** ${prompts.length}\n`;
        markdown += `**Categories:** ${(data.categories || []).length}\n`;
        markdown += `**Average Rating:** ${this.calculateAverageRating(prompts).toFixed(1)}\n\n`;

        // Table of contents
        const categories = this.groupByCategory(prompts);
        if (Object.keys(categories).length > 1) {
            markdown += `## Table of Contents\n\n`;
            for (const category of Object.keys(categories).sort()) {
                markdown += `- [${category}](#${this.slugify(category)})\n`;
            }
            markdown += '\n';
        }

        // Group by category
        for (const [category, categoryPrompts] of Object.entries(categories)) {
            markdown += `## ${category}\n\n`;
            markdown += `*${categoryPrompts.length} prompt${categoryPrompts.length !== 1 ? 's' : ''}*\n\n`;

            // Sort by rating (highest first)
            const sortedPrompts = [...categoryPrompts].sort((a, b) => (b.rating || 0) - (a.rating || 0));

            for (const prompt of sortedPrompts) {
                markdown += `### ${this.truncateText(prompt.text, 60)}\n\n`;
                
                // Rating
                if (prompt.rating > 0) {
                    markdown += `**Rating:** ${'⭐'.repeat(prompt.rating)}\n\n`;
                }
                
                // Tags
                if (prompt.tags && prompt.tags.length > 0) {
                    markdown += `**Tags:** ${prompt.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
                }
                
                // Folder
                if (prompt.folder && prompt.folder !== 'Default') {
                    markdown += `**Folder:** ${prompt.folder}\n\n`;
                }
                
                // Full text
                markdown += `\`\`\`\n${prompt.text}\n\`\`\`\n\n`;
                
                // Notes
                if (prompt.notes) {
                    markdown += `**Notes:** ${prompt.notes}\n\n`;
                }
                
                // Metadata
                if (options.includeMetadata) {
                    markdown += `<details>\n<summary>Metadata</summary>\n\n`;
                    markdown += `- **ID:** ${prompt.id}\n`;
                    markdown += `- **Created:** ${new Date(prompt.createdAt || prompt.created_at).toLocaleDateString()}\n`;
                    markdown += `- **Updated:** ${new Date(prompt.updatedAt || prompt.updated_at).toLocaleDateString()}\n`;
                    if (prompt.usage_count) {
                        markdown += `- **Usage Count:** ${prompt.usage_count}\n`;
                    }
                    markdown += `\n</details>\n\n`;
                }
                
                markdown += '---\n\n';
            }
        }

        // Analytics section
        if (options.includeAnalytics && data.analytics) {
            markdown += `## Analytics\n\n`;
            markdown += `### Usage Statistics\n\n`;
            markdown += `- **Total Prompts:** ${data.analytics.totalPrompts || prompts.length}\n`;
            markdown += `- **Average Rating:** ${(data.analytics.averageRating || 0).toFixed(1)}\n`;
            
            if (data.analytics.topTags && data.analytics.topTags.length > 0) {
                markdown += `- **Top Tags:** ${data.analytics.topTags.slice(0, 5).map(t => t.tag).join(', ')}\n`;
            }
            
            markdown += '\n';
        }

        return markdown;
    }

    /**
     * Export to YAML format
     */
    async exportToYAML(data, options) {
        // Simple YAML conversion (for more complex needs, use a YAML library)
        const yamlData = {
            metadata: data.metadata,
            prompts: data.prompts,
            categories: data.categories,
            settings: data.settings
        };

        return this.objectToYaml(yamlData, 0);
    }

    /**
     * Export to HTML format
     */
    async exportToHTML(data, options) {
        const prompts = data.prompts || [];
        const categories = this.groupByCategory(prompts);
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal NLP Prompt Collection</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .category { margin-bottom: 40px; }
        .prompt { background: #f8f9fa; border-left: 4px solid #007AFF; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
        .prompt-text { font-family: 'Monaco', 'Menlo', monospace; background: white; padding: 15px; border-radius: 4px; white-space: pre-wrap; }
        .rating { color: #ff9500; }
        .tags { margin: 10px 0; }
        .tag { background: #e3f2fd; color: #1976d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 5px; }
        .notes { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin-top: 10px; }
        .toc { background: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 30px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 10px; background: #e8f5e8; border-radius: 4px; flex: 1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 Personal NLP Prompt Collection</h1>
        <p><em>Exported on ${new Date().toLocaleDateString()}</em></p>
        <div class="stats">
            <div class="stat">
                <strong>${prompts.length}</strong><br>
                Total Prompts
            </div>
            <div class="stat">
                <strong>${(data.categories || []).length}</strong><br>
                Categories
            </div>
            <div class="stat">
                <strong>${this.calculateAverageRating(prompts).toFixed(1)}</strong><br>
                Avg Rating
            </div>
        </div>
    </div>`;

        // Table of contents
        if (Object.keys(categories).length > 1) {
            html += `<div class="toc">
                <h2>📋 Table of Contents</h2>
                <ul>`;
            for (const category of Object.keys(categories).sort()) {
                html += `<li><a href="#${this.slugify(category)}">${category} (${categories[category].length})</a></li>`;
            }
            html += `</ul></div>`;
        }

        // Categories and prompts
        for (const [category, categoryPrompts] of Object.entries(categories)) {
            html += `<div class="category">
                <h2 id="${this.slugify(category)}">📂 ${category}</h2>
                <p><em>${categoryPrompts.length} prompt${categoryPrompts.length !== 1 ? 's' : ''}</em></p>`;

            const sortedPrompts = [...categoryPrompts].sort((a, b) => (b.rating || 0) - (a.rating || 0));

            for (const prompt of sortedPrompts) {
                html += `<div class="prompt">
                    <h3>${this.escapeHtml(this.truncateText(prompt.text, 60))}</h3>`;

                if (prompt.rating > 0) {
                    html += `<div class="rating">${'⭐'.repeat(prompt.rating)}</div>`;
                }

                if (prompt.tags && prompt.tags.length > 0) {
                    html += `<div class="tags">`;
                    for (const tag of prompt.tags) {
                        html += `<span class="tag">${this.escapeHtml(tag)}</span>`;
                    }
                    html += `</div>`;
                }

                html += `<div class="prompt-text">${this.escapeHtml(prompt.text)}</div>`;

                if (prompt.notes) {
                    html += `<div class="notes"><strong>Notes:</strong> ${this.escapeHtml(prompt.notes)}</div>`;
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `</body></html>`;
        return html;
    }

    /**
     * Export to XML format
     */
    async exportToXML(data, options) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<nlp-prompt-database version="2.0">\n`;
        xml += `  <metadata>\n`;
        xml += `    <exported>${data.metadata.exported}</exported>\n`;
        xml += `    <version>${data.metadata.version}</version>\n`;
        xml += `    <total-prompts>${(data.prompts || []).length}</total-prompts>\n`;
        xml += `  </metadata>\n`;

        xml += `  <prompts>\n`;
        for (const prompt of data.prompts || []) {
            xml += `    <prompt id="${this.escapeXml(prompt.id)}">\n`;
            xml += `      <text><![CDATA[${prompt.text}]]></text>\n`;
            xml += `      <category>${this.escapeXml(prompt.category || '')}</category>\n`;
            xml += `      <folder>${this.escapeXml(prompt.folder || '')}</folder>\n`;
            xml += `      <rating>${prompt.rating || 0}</rating>\n`;
            xml += `      <created>${this.escapeXml(prompt.createdAt || prompt.created_at || '')}</created>\n`;
            xml += `      <updated>${this.escapeXml(prompt.updatedAt || prompt.updated_at || '')}</updated>\n`;
            
            if (prompt.tags && prompt.tags.length > 0) {
                xml += `      <tags>\n`;
                for (const tag of prompt.tags) {
                    xml += `        <tag>${this.escapeXml(tag)}</tag>\n`;
                }
                xml += `      </tags>\n`;
            }

            if (prompt.notes) {
                xml += `      <notes><![CDATA[${prompt.notes}]]></notes>\n`;
            }

            xml += `    </prompt>\n`;
        }
        xml += `  </prompts>\n`;

        xml += `</nlp-prompt-database>\n`;
        return xml;
    }

    /**
     * Import data from various formats
     */
    async importPersonalData(fileContent, format, options = {}) {
        const endTimer = this.monitor.startTimer(`import_${format}`);
        
        try {
            console.log(`📥 Importing data from ${format.toUpperCase()} format...`);
            
            let importedData;
            
            switch (format.toLowerCase()) {
                case 'json':
                    importedData = JSON.parse(fileContent);
                    break;
                case 'csv':
                    importedData = await this.parseCSV(fileContent);
                    break;
                case 'yaml':
                case 'yml':
                    importedData = await this.parseYAML(fileContent);
                    break;
                default:
                    throw new Error(`Unsupported import format: ${format}`);
            }

            // Validate imported data
            const validation = this.validateImportedData(importedData);
            if (!validation.valid) {
                throw new Error(`Invalid data: ${validation.errors.join(', ')}`);
            }

            // Merge with existing data if specified
            let result;
            if (options.merge && typeof window !== 'undefined' && window.database) {
                result = await this.mergeImportedData(importedData, options);
            } else {
                result = await this.replaceAllData(importedData, options);
            }

            const timing = endTimer();
            console.log(`✓ Import completed (${timing.duration.toFixed(2)}ms)`);
            
            return {
                success: true,
                imported: result.imported,
                skipped: result.skipped || 0,
                duration: timing.duration
            };
            
        } catch (error) {
            console.error(`Import failed (${format}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Prepare data for cross-device sync
     */
    async prepareSyncData() {
        try {
            const data = await this.loadCompleteDataSet();
            
            // Create sync-optimized version
            const syncData = {
                version: data.metadata.version,
                lastSync: new Date().toISOString(),
                checksum: await this.calculateDataChecksum(data),
                prompts: data.prompts.map(prompt => ({
                    ...prompt,
                    syncId: prompt.id,
                    lastModified: prompt.updatedAt || prompt.updated_at || prompt.createdAt || prompt.created_at
                })),
                deletedPrompts: [], // Track deleted items for sync
                settings: data.settings,
                categories: data.categories,
                folders: data.folders
            };

            return syncData;
            
        } catch (error) {
            console.error('Failed to prepare sync data:', error);
            throw error;
        }
    }

    /**
     * Utility methods
     */

    applyFilters(prompts, filters) {
        return prompts.filter(prompt => {
            for (const [field, value] of Object.entries(filters)) {
                if (field === 'dateRange') {
                    const created = new Date(prompt.createdAt || prompt.created_at);
                    if (created < new Date(value.from) || created > new Date(value.to)) {
                        return false;
                    }
                } else if (field === 'categories' && Array.isArray(value)) {
                    if (!value.includes(prompt.category)) {
                        return false;
                    }
                } else if (field === 'minRating') {
                    if ((prompt.rating || 0) < value) {
                        return false;
                    }
                } else if (field === 'tags' && Array.isArray(value)) {
                    if (!prompt.tags || !value.some(tag => prompt.tags.includes(tag))) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    groupByCategory(prompts) {
        const groups = {};
        for (const prompt of prompts) {
            const category = prompt.category || 'Uncategorized';
            if (!groups[category]) groups[category] = [];
            groups[category].push(prompt);
        }
        return groups;
    }

    calculateAverageRating(prompts) {
        if (prompts.length === 0) return 0;
        const total = prompts.reduce((sum, p) => sum + (p.rating || 0), 0);
        return total / prompts.length;
    }

    escapeCsvValue(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeXml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    slugify(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    }

    objectToYaml(obj, indent) {
        let yaml = '';
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                yaml += `${spaces}${key}:\n`;
                for (const item of value) {
                    if (typeof item === 'object') {
                        yaml += `${spaces}- \n${this.objectToYaml(item, indent + 1)}`;
                    } else {
                        yaml += `${spaces}- ${item}\n`;
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
            } else {
                yaml += `${spaces}${key}: ${value}\n`;
            }
        }
        
        return yaml;
    }

    getTimestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    }

    async compressData(data, format) {
        // Placeholder for compression - would use a compression library
        return data;
    }

    async encryptData(data) {
        // Placeholder for encryption - would use crypto library
        return data;
    }

    async saveExportedData(data, filename, format) {
        try {
            if (typeof window !== 'undefined') {
                // Browser environment - trigger download
                const blob = new Blob([data], { 
                    type: this.getMimeType(format) 
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                
                return { method: 'download', filename };
            } else {
                // Node environment - save to file
                const exportPath = path.join('./exports', filename);
                await fs.mkdir('./exports', { recursive: true });
                await fs.writeFile(exportPath, data, 'utf8');
                
                return { method: 'file', path: exportPath };
            }
        } catch (error) {
            console.error('Failed to save exported data:', error);
            throw error;
        }
    }

    getMimeType(format) {
        const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            markdown: 'text/markdown',
            yaml: 'text/yaml',
            html: 'text/html',
            xml: 'application/xml'
        };
        return mimeTypes[format] || 'text/plain';
    }

    recordExport(exportInfo) {
        this.exportHistory.unshift(exportInfo);
        
        // Keep only last 50 exports
        if (this.exportHistory.length > 50) {
            this.exportHistory.pop();
        }
    }

    validateImportedData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Invalid data format');
        } else {
            if (!Array.isArray(data.prompts)) {
                errors.push('Prompts must be an array');
            } else {
                // Validate prompts
                for (let i = 0; i < Math.min(data.prompts.length, 10); i++) {
                    const prompt = data.prompts[i];
                    if (!prompt.id) errors.push(`Prompt ${i} missing ID`);
                    if (!prompt.text) errors.push(`Prompt ${i} missing text`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    async mergeImportedData(importedData, options) {
        // Implementation would merge imported data with existing data
        // This is a placeholder
        return { imported: importedData.prompts?.length || 0, skipped: 0 };
    }

    async replaceAllData(importedData, options) {
        // Implementation would replace all existing data
        // This is a placeholder
        return { imported: importedData.prompts?.length || 0 };
    }

    async calculateDataChecksum(data) {
        // Simple checksum calculation
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    parseCSV(content) {
        // Simple CSV parser - for production use a proper CSV library
        const lines = content.split('\n');
        const headers = lines[0].split(',');
        const prompts = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',');
                const prompt = {};
                headers.forEach((header, index) => {
                    prompt[header.trim()] = values[index]?.trim() || '';
                });
                prompts.push(prompt);
            }
        }
        
        return { prompts };
    }

    parseYAML(content) {
        // Simple YAML parser - for production use a proper YAML library
        // This is a very basic implementation
        try {
            return JSON.parse(content); // Fallback for now
        } catch {
            return { prompts: [] };
        }
    }

    /**
     * Public API
     */

    getExportHistory() {
        return [...this.exportHistory];
    }

    getSyncHistory() {
        return [...this.syncHistory];
    }

    getExportStats() {
        return {
            totalExports: this.exportHistory.length,
            formats: [...new Set(this.exportHistory.map(e => e.format))],
            totalSize: this.exportHistory.reduce((sum, e) => sum + (e.size || 0), 0),
            lastExport: this.exportHistory[0]?.timestamp || null
        };
    }

    async exportMultipleFormats(formats = ['json', 'csv', 'markdown']) {
        const results = [];
        
        for (const format of formats) {
            try {
                const result = await this.exportPersonalData(format);
                results.push(result);
            } catch (error) {
                results.push({
                    success: false,
                    format,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}

module.exports = PersonalDataManager;