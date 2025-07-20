class AdvancedExporter {
    constructor(options = {}) {
        this.options = {
            enablePDF: options.enablePDF !== false,
            enableMarkdown: options.enableMarkdown !== false,
            enableCSV: options.enableCSV !== false,
            enableHTML: options.enableHTML !== false,
            enableJSON: options.enableJSON !== false,
            maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
            ...options
        };
        
        this.logger = options.logger || console;
    }
    
    async exportCollection(prompts, format, options = {}) {
        const exportOptions = { ...this.options, ...options };
        
        try {
            switch (format.toLowerCase()) {
                case 'json':
                    return this.exportJSON(prompts, exportOptions);
                case 'csv':
                    return this.exportCSV(prompts, exportOptions);
                case 'markdown':
                    return this.exportMarkdown(prompts, exportOptions);
                case 'html':
                    return this.exportHTML(prompts, exportOptions);
                case 'pdf':
                    return this.exportPDF(prompts, exportOptions);
                case 'txt':
                    return this.exportTXT(prompts, exportOptions);
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
        } catch (error) {
            this.logger.error('Export failed', { format, error: error.message });
            throw error;
        }
    }
    
    exportJSON(prompts, options = {}) {
        const data = {
            metadata: {
                exportedAt: new Date().toISOString(),
                totalPrompts: prompts.length,
                format: 'json',
                version: '1.0',
                source: 'NLP Prompt Database'
            },
            prompts: options.includeMetadata !== false ? prompts : prompts.map(p => ({
                id: p.id,
                text: p.text,
                category: p.category,
                tags: p.tags,
                rating: p.rating,
                notes: p.notes
            }))
        };
        
        if (options.includeAnalytics && options.analytics) {
            data.analytics = options.analytics;
        }
        
        const jsonString = JSON.stringify(data, null, options.compact ? 0 : 2);
        
        return {
            content: jsonString,
            filename: this.generateFilename('prompts', 'json', options),
            mimeType: 'application/json',
            size: jsonString.length
        };
    }
    
    exportCSV(prompts, options = {}) {
        const headers = options.headers || [
            'ID', 'Text', 'Category', 'Tags', 'Rating', 'Usage Count', 
            'Created At', 'Updated At', 'Notes'
        ];
        
        const rows = [headers];
        
        prompts.forEach(prompt => {
            const row = [
                this.escapeCSV(prompt.id || ''),
                this.escapeCSV(prompt.text || ''),
                this.escapeCSV(prompt.category || ''),
                this.escapeCSV((prompt.tags || []).join('; ')),
                prompt.rating || '',
                prompt.usage_count || 0,
                prompt.createdAt || '',
                prompt.updatedAt || '',
                this.escapeCSV(prompt.notes || '')
            ];
            rows.push(row);
        });
        
        const csvContent = rows.map(row => row.join(',')).join('\n');
        
        return {
            content: csvContent,
            filename: this.generateFilename('prompts', 'csv', options),
            mimeType: 'text/csv',
            size: csvContent.length
        };
    }
    
    exportMarkdown(prompts, options = {}) {
        let markdown = '';
        
        // Title and metadata
        markdown += `# NLP Prompt Collection\n\n`;
        markdown += `**Exported:** ${new Date().toLocaleString()}\n`;
        markdown += `**Total Prompts:** ${prompts.length}\n\n`;
        
        // Table of contents
        if (options.includeTableOfContents !== false) {
            markdown += `## Table of Contents\n\n`;
            const categories = [...new Set(prompts.map(p => p.category))].sort();
            categories.forEach(category => {
                const count = prompts.filter(p => p.category === category).length;
                markdown += `- [${category}](#${this.slugify(category)}) (${count} prompts)\n`;
            });
            markdown += '\n';
        }
        
        // Group by category
        const groupedPrompts = this.groupPromptsByCategory(prompts);
        
        for (const [category, categoryPrompts] of Object.entries(groupedPrompts)) {
            markdown += `## ${category}\n\n`;
            
            categoryPrompts.forEach((prompt, index) => {
                markdown += `### ${index + 1}. ${this.truncateText(prompt.text, 60)}\n\n`;
                markdown += `**Prompt:**\n\`\`\`\n${prompt.text}\n\`\`\`\n\n`;
                
                if (prompt.tags && prompt.tags.length > 0) {
                    markdown += `**Tags:** ${prompt.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
                }
                
                if (prompt.rating) {
                    markdown += `**Rating:** ${'⭐'.repeat(prompt.rating)} (${prompt.rating}/5)\n\n`;
                }
                
                if (prompt.usage_count) {
                    markdown += `**Usage Count:** ${prompt.usage_count}\n\n`;
                }
                
                if (prompt.notes) {
                    markdown += `**Notes:** ${prompt.notes}\n\n`;
                }
                
                if (prompt.createdAt) {
                    markdown += `**Created:** ${new Date(prompt.createdAt).toLocaleDateString()}\n\n`;
                }
                
                markdown += '---\n\n';
            });
        }
        
        // Statistics section
        if (options.includeStatistics !== false) {
            markdown += this.generateMarkdownStatistics(prompts);
        }
        
        return {
            content: markdown,
            filename: this.generateFilename('prompts', 'md', options),
            mimeType: 'text/markdown',
            size: markdown.length
        };
    }
    
    exportHTML(prompts, options = {}) {
        const title = options.title || 'NLP Prompt Collection';
        const theme = options.theme || 'default';
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${this.getHTMLStyles(theme)}
    </style>
</head>
<body>
    <header>
        <h1>${title}</h1>
        <div class="metadata">
            <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Prompts:</strong> ${prompts.length}</p>
        </div>
    </header>
    
    <main>`;
        
        // Table of contents
        if (options.includeTableOfContents !== false) {
            html += '<nav class="toc"><h2>Categories</h2><ul>';
            const categories = [...new Set(prompts.map(p => p.category))].sort();
            categories.forEach(category => {
                const count = prompts.filter(p => p.category === category).length;
                html += `<li><a href="#${this.slugify(category)}">${category}</a> <span class="count">(${count})</span></li>`;
            });
            html += '</ul></nav>';
        }
        
        // Prompts by category
        const groupedPrompts = this.groupPromptsByCategory(prompts);
        
        for (const [category, categoryPrompts] of Object.entries(groupedPrompts)) {
            html += `<section class="category" id="${this.slugify(category)}">`;
            html += `<h2>${category}</h2>`;
            
            categoryPrompts.forEach((prompt, index) => {
                html += `<article class="prompt">
                    <header>
                        <h3>${this.escapeHTML(this.truncateText(prompt.text, 60))}</h3>
                        <div class="prompt-meta">`;
                
                if (prompt.rating) {
                    html += `<span class="rating">${'★'.repeat(prompt.rating)}${'☆'.repeat(5 - prompt.rating)}</span>`;
                }
                
                if (prompt.usage_count) {
                    html += `<span class="usage">Used ${prompt.usage_count} times</span>`;
                }
                
                html += `</div></header>
                    <div class="prompt-content">
                        <pre>${this.escapeHTML(prompt.text)}</pre>
                    </div>`;
                
                if (prompt.tags && prompt.tags.length > 0) {
                    html += `<div class="tags">
                        ${prompt.tags.map(tag => `<span class="tag">${this.escapeHTML(tag)}</span>`).join('')}
                    </div>`;
                }
                
                if (prompt.notes) {
                    html += `<div class="notes">
                        <strong>Notes:</strong> ${this.escapeHTML(prompt.notes)}
                    </div>`;
                }
                
                html += '</article>';
            });
            
            html += '</section>';
        }
        
        // Statistics
        if (options.includeStatistics !== false) {
            html += this.generateHTMLStatistics(prompts);
        }
        
        html += `</main>
    <footer>
        <p>Generated by NLP Prompt Database</p>
    </footer>
</body>
</html>`;
        
        return {
            content: html,
            filename: this.generateFilename('prompts', 'html', options),
            mimeType: 'text/html',
            size: html.length
        };
    }
    
    exportTXT(prompts, options = {}) {
        let content = `NLP PROMPT COLLECTION\n`;
        content += `${'='.repeat(50)}\n\n`;
        content += `Exported: ${new Date().toLocaleString()}\n`;
        content += `Total Prompts: ${prompts.length}\n\n`;
        
        const groupedPrompts = this.groupPromptsByCategory(prompts);
        
        for (const [category, categoryPrompts] of Object.entries(groupedPrompts)) {
            content += `\n${category.toUpperCase()}\n`;
            content += `${'-'.repeat(category.length)}\n\n`;
            
            categoryPrompts.forEach((prompt, index) => {
                content += `${index + 1}. ${prompt.text}\n`;
                
                if (prompt.tags && prompt.tags.length > 0) {
                    content += `   Tags: ${prompt.tags.join(', ')}\n`;
                }
                
                if (prompt.rating) {
                    content += `   Rating: ${prompt.rating}/5\n`;
                }
                
                if (prompt.notes) {
                    content += `   Notes: ${prompt.notes}\n`;
                }
                
                content += '\n';
            });
        }
        
        return {
            content: content,
            filename: this.generateFilename('prompts', 'txt', options),
            mimeType: 'text/plain',
            size: content.length
        };
    }
    
    // Helper methods
    groupPromptsByCategory(prompts) {
        const grouped = {};
        
        prompts.forEach(prompt => {
            const category = prompt.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(prompt);
        });
        
        // Sort categories and prompts within categories
        const sortedGrouped = {};
        Object.keys(grouped).sort().forEach(category => {
            sortedGrouped[category] = grouped[category].sort((a, b) => {
                return (b.rating || 0) - (a.rating || 0) || (b.usage_count || 0) - (a.usage_count || 0);
            });
        });
        
        return sortedGrouped;
    }
    
    escapeCSV(text) {
        if (typeof text !== 'string') return text;
        
        // Escape double quotes and wrap in quotes if contains comma, newline, or quote
        if (text.includes(',') || text.includes('\n') || text.includes('"')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }
    
    escapeHTML(text) {
        if (typeof text !== 'string') return text;
        
        return text
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
    
    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
    
    generateFilename(base, extension, options = {}) {
        const timestamp = options.includeTimestamp !== false ? 
            `_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}` : '';
        
        const suffix = options.suffix ? `_${options.suffix}` : '';
        
        return `${base}${suffix}${timestamp}.${extension}`;
    }
    
    generateMarkdownStatistics(prompts) {
        let stats = '\n## Statistics\n\n';
        
        const categories = {};
        const tags = {};
        let totalRating = 0;
        let ratedCount = 0;
        let totalUsage = 0;
        
        prompts.forEach(prompt => {
            categories[prompt.category] = (categories[prompt.category] || 0) + 1;
            
            (prompt.tags || []).forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1;
            });
            
            if (prompt.rating) {
                totalRating += prompt.rating;
                ratedCount++;
            }
            
            totalUsage += prompt.usage_count || 0;
        });
        
        stats += `**Average Rating:** ${ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 'N/A'}/5\n`;
        stats += `**Total Usage:** ${totalUsage}\n`;
        stats += `**Categories:** ${Object.keys(categories).length}\n`;
        stats += `**Unique Tags:** ${Object.keys(tags).length}\n\n`;
        
        stats += '### Category Distribution\n\n';
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                const percentage = ((count / prompts.length) * 100).toFixed(1);
                stats += `- **${category}:** ${count} (${percentage}%)\n`;
            });
        
        stats += '\n### Top Tags\n\n';
        Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([tag, count]) => {
                stats += `- **${tag}:** ${count}\n`;
            });
        
        return stats;
    }
    
    generateHTMLStatistics(prompts) {
        const categories = {};
        const tags = {};
        let totalRating = 0;
        let ratedCount = 0;
        let totalUsage = 0;
        
        prompts.forEach(prompt => {
            categories[prompt.category] = (categories[prompt.category] || 0) + 1;
            
            (prompt.tags || []).forEach(tag => {
                tags[tag] = (tags[tag] || 0) + 1;
            });
            
            if (prompt.rating) {
                totalRating += prompt.rating;
                ratedCount++;
            }
            
            totalUsage += prompt.usage_count || 0;
        });
        
        let html = '<section class="statistics"><h2>Statistics</h2>';
        
        html += '<div class="stats-grid">';
        html += `<div class="stat"><label>Average Rating</label><value>${ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 'N/A'}/5</value></div>`;
        html += `<div class="stat"><label>Total Usage</label><value>${totalUsage}</value></div>`;
        html += `<div class="stat"><label>Categories</label><value>${Object.keys(categories).length}</value></div>`;
        html += `<div class="stat"><label>Unique Tags</label><value>${Object.keys(tags).length}</value></div>`;
        html += '</div>';
        
        html += '<div class="charts">';
        html += '<div class="chart"><h3>Categories</h3><ul>';
        Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .forEach(([category, count]) => {
                const percentage = ((count / prompts.length) * 100).toFixed(1);
                html += `<li><span class="category-name">${category}</span><span class="count">${count} (${percentage}%)</span></li>`;
            });
        html += '</ul></div>';
        
        html += '<div class="chart"><h3>Top Tags</h3><ul>';
        Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([tag, count]) => {
                html += `<li><span class="tag-name">${tag}</span><span class="count">${count}</span></li>`;
            });
        html += '</ul></div>';
        html += '</div></section>';
        
        return html;
    }
    
    getHTMLStyles(theme) {
        const baseStyles = `
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
            header { border-bottom: 3px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #007acc; margin: 0; }
            h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            h3 { color: #555; margin-top: 0; }
            .metadata p { margin: 5px 0; color: #666; }
            .toc { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .toc ul { list-style: none; padding: 0; }
            .toc li { padding: 5px 0; }
            .toc a { text-decoration: none; color: #007acc; }
            .toc .count { color: #666; font-size: 0.9em; }
            .category { margin-bottom: 40px; }
            .prompt { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: white; }
            .prompt-meta { display: flex; gap: 15px; align-items: center; margin-top: 10px; }
            .rating { color: #ffc107; }
            .usage { color: #666; font-size: 0.9em; }
            .prompt-content pre { background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap; margin: 15px 0; }
            .tags { margin-top: 15px; }
            .tag { background: #007acc; color: white; padding: 3px 8px; border-radius: 15px; font-size: 0.8em; margin-right: 5px; }
            .notes { margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; border-left: 3px solid #ffc107; }
            .statistics { margin-top: 40px; padding-top: 30px; border-top: 2px solid #eee; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .stat label { display: block; font-size: 0.9em; color: #666; margin-bottom: 5px; }
            .stat value { font-size: 1.5em; font-weight: bold; color: #007acc; }
            .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .chart ul { list-style: none; padding: 0; }
            .chart li { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
        `;
        
        const darkTheme = `
            body { background: #1a1a1a; color: #e0e0e0; }
            .prompt { background: #2d2d2d; border-color: #444; }
            .prompt-content pre { background: #333; color: #e0e0e0; }
            .toc { background: #2d2d2d; }
            .notes { background: #3d3d2d; border-left-color: #ffc107; }
            .stat { background: #2d2d2d; }
            .chart li { border-bottom-color: #444; }
        `;
        
        return theme === 'dark' ? baseStyles + darkTheme : baseStyles;
    }
    
    // Advanced export methods
    async exportWithFilters(prompts, format, filters = {}, options = {}) {
        let filteredPrompts = [...prompts];
        
        if (filters.categories && filters.categories.length > 0) {
            filteredPrompts = filteredPrompts.filter(p => filters.categories.includes(p.category));
        }
        
        if (filters.tags && filters.tags.length > 0) {
            filteredPrompts = filteredPrompts.filter(p => 
                p.tags && p.tags.some(tag => filters.tags.includes(tag))
            );
        }
        
        if (filters.minRating) {
            filteredPrompts = filteredPrompts.filter(p => (p.rating || 0) >= filters.minRating);
        }
        
        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filteredPrompts = filteredPrompts.filter(p => {
                const date = new Date(p.createdAt);
                return date >= new Date(start) && date <= new Date(end);
            });
        }
        
        return this.exportCollection(filteredPrompts, format, options);
    }
    
    async exportByTemplate(prompts, templateId, options = {}) {
        // Export prompts that were generated from a specific template
        const templatePrompts = prompts.filter(p => 
            p.metadata && p.metadata.templateId === templateId
        );
        
        return this.exportCollection(templatePrompts, options.format || 'json', {
            ...options,
            suffix: `template_${templateId}`
        });
    }
    
    validateExportSize(content) {
        const size = new Blob([content]).size;
        
        if (size > this.options.maxFileSize) {
            throw new Error(`Export size (${Math.round(size / 1024 / 1024)}MB) exceeds limit (${Math.round(this.options.maxFileSize / 1024 / 1024)}MB)`);
        }
        
        return size;
    }
    
    getExportFormats() {
        return [
            { format: 'json', name: 'JSON', description: 'Machine-readable format for backup and data exchange', mimeType: 'application/json' },
            { format: 'csv', name: 'CSV', description: 'Spreadsheet-compatible format for analysis', mimeType: 'text/csv' },
            { format: 'markdown', name: 'Markdown', description: 'Human-readable format for documentation', mimeType: 'text/markdown' },
            { format: 'html', name: 'HTML', description: 'Web page format for sharing and viewing', mimeType: 'text/html' },
            { format: 'txt', name: 'Plain Text', description: 'Simple text format for basic sharing', mimeType: 'text/plain' }
        ];
    }
}

module.exports = AdvancedExporter;