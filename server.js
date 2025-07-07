const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'prompts.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Auto-save middleware with debouncing
let saveTimeout;
const AUTOSAVE_DELAY = 500; // 500ms delay to match client expectations

const debouncedSave = (data) => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
            console.log('✓ Auto-saved to', DATA_FILE);
        } catch (error) {
            console.error('✗ Auto-save failed:', error);
        }
    }, AUTOSAVE_DELAY);
};

// Load data from file
app.get('/api/data', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.log('Creating new data file...');
        const defaultData = {
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
                totalPrompts: 0,
                lastSaved: new Date().toISOString()
            }
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
        res.json(defaultData);
    }
});

// Save data to file with auto-save
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;
        data.metadata.lastSaved = new Date().toISOString();
        data.metadata.totalPrompts = data.prompts.length;
        
        // Immediate save for explicit saves
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('✓ Data saved immediately');
        
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Auto-save endpoint (debounced)
app.post('/api/autosave', async (req, res) => {
    try {
        const data = req.body;
        data.metadata.lastSaved = new Date().toISOString();
        data.metadata.totalPrompts = data.prompts.length;
        
        debouncedSave(data);
        res.json({ success: true, message: 'Auto-save queued' });
    } catch (error) {
        console.error('Auto-save error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Backup endpoint
app.post('/api/backup', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupFile = path.join(__dirname, 'backups', `prompts-${timestamp}.json`);
        
        // Ensure backups directory exists
        await fs.mkdir(path.dirname(backupFile), { recursive: true });
        await fs.writeFile(backupFile, data);
        
        res.json({ success: true, backupFile: `backups/prompts-${timestamp}.json` });
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Individual prompt endpoints
app.put('/api/prompts/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        const promptId = req.params.id;
        const updatedPrompt = req.body;
        
        const index = jsonData.prompts.findIndex(p => p.id === promptId);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prompt not found' });
        }
        
        jsonData.prompts[index] = { ...jsonData.prompts[index], ...updatedPrompt };
        jsonData.metadata.lastSaved = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        res.json({ success: true, prompt: jsonData.prompts[index] });
    } catch (error) {
        console.error('Update prompt error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/prompts/:id', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        const promptId = req.params.id;
        
        const index = jsonData.prompts.findIndex(p => p.id === promptId);
        if (index === -1) {
            return res.status(404).json({ success: false, error: 'Prompt not found' });
        }
        
        const deletedPrompt = jsonData.prompts.splice(index, 1)[0];
        jsonData.metadata.lastSaved = new Date().toISOString();
        jsonData.metadata.totalPrompts = jsonData.prompts.length;
        
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        res.json({ success: true, deletedPrompt });
    } catch (error) {
        console.error('Delete prompt error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk operations
app.delete('/api/prompts/batch', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        const { ids } = req.body;
        
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'ids must be an array' });
        }
        
        const deletedPrompts = [];
        jsonData.prompts = jsonData.prompts.filter(prompt => {
            if (ids.includes(prompt.id)) {
                deletedPrompts.push(prompt);
                return false;
            }
            return true;
        });
        
        jsonData.metadata.lastSaved = new Date().toISOString();
        jsonData.metadata.totalPrompts = jsonData.prompts.length;
        
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        res.json({ success: true, deletedCount: deletedPrompts.length, deletedPrompts });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/prompts/batch', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        const { updates } = req.body;
        
        if (!Array.isArray(updates)) {
            return res.status(400).json({ success: false, error: 'updates must be an array' });
        }
        
        const updatedPrompts = [];
        updates.forEach(update => {
            const index = jsonData.prompts.findIndex(p => p.id === update.id);
            if (index !== -1) {
                jsonData.prompts[index] = { ...jsonData.prompts[index], ...update.changes };
                updatedPrompts.push(jsonData.prompts[index]);
            }
        });
        
        jsonData.metadata.lastSaved = new Date().toISOString();
        
        await fs.writeFile(DATA_FILE, JSON.stringify(jsonData, null, 2));
        res.json({ success: true, updatedCount: updatedPrompts.length, updatedPrompts });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const jsonData = JSON.parse(data);
        
        const analytics = {
            totalPrompts: jsonData.prompts.length,
            categories: {},
            topTags: {},
            ratingDistribution: {},
            monthlyStats: {},
            avgRating: 0
        };
        
        // Calculate analytics
        jsonData.prompts.forEach(prompt => {
            // Categories
            analytics.categories[prompt.category] = (analytics.categories[prompt.category] || 0) + 1;
            
            // Tags
            if (prompt.tags) {
                prompt.tags.forEach(tag => {
                    analytics.topTags[tag] = (analytics.topTags[tag] || 0) + 1;
                });
            }
            
            // Ratings
            const rating = prompt.rating || 0;
            analytics.ratingDistribution[rating] = (analytics.ratingDistribution[rating] || 0) + 1;
            
            // Monthly stats
            if (prompt.createdAt) {
                const month = prompt.createdAt.substring(0, 7); // YYYY-MM
                analytics.monthlyStats[month] = (analytics.monthlyStats[month] || 0) + 1;
            }
        });
        
        // Calculate average rating
        const totalRating = jsonData.prompts.reduce((sum, p) => sum + (p.rating || 0), 0);
        analytics.avgRating = jsonData.prompts.length > 0 ? totalRating / jsonData.prompts.length : 0;
        
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        dataFile: DATA_FILE 
    });
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 NLP Prompt Database server running on http://localhost:${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE}`);
});

module.exports = app;