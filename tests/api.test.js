const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

// Import the app
const app = require('../server');

describe('🚀 NLP Prompt Database API Tests', () => {
    const testDataFile = path.join(__dirname, '../data/test-prompts.json');
    const backupDataFile = path.join(__dirname, '../data/prompts.json.backup');
    
    before(async () => {
        // Backup original data file
        if (fs.existsSync(path.join(__dirname, '../data/prompts.json'))) {
            fs.copyFileSync(
                path.join(__dirname, '../data/prompts.json'),
                backupDataFile
            );
        }
        
        // Create test data
        const testData = {
            prompts: [
                {
                    id: 'test_prompt_1',
                    text: 'Test prompt for API testing',
                    category: 'Code',
                    tags: ['test', 'api'],
                    folder: 'Default',
                    rating: 4,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    usage_count: 1,
                    notes: 'Test notes',
                    metadata: { source: 'test', confidence: 1 }
                }
            ],
            categories: ['All', 'Code', 'Test'],
            folders: ['All', 'Default'],
            customFolders: [],
            settings: {
                openaiApiKey: '',
                autoCategorizationEnabled: true,
                lastBackup: null
            },
            metadata: {
                version: '1.0.0',
                created: new Date().toISOString().split('T')[0],
                totalPrompts: 1,
                lastSaved: new Date().toISOString()
            }
        };
        
        fs.writeFileSync(testDataFile, JSON.stringify(testData, null, 2));
        fs.writeFileSync(
            path.join(__dirname, '../data/prompts.json'),
            JSON.stringify(testData, null, 2)
        );
    });
    
    after(async () => {
        // Restore original data file
        if (fs.existsSync(backupDataFile)) {
            fs.copyFileSync(
                backupDataFile,
                path.join(__dirname, '../data/prompts.json')
            );
            fs.unlinkSync(backupDataFile);
        }
        
        // Clean up test data file
        if (fs.existsSync(testDataFile)) {
            fs.unlinkSync(testDataFile);
        }
    });
    
    describe('📊 Health Check Endpoint', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
                
            expect(response.body).to.have.property('status', 'ok');
            expect(response.body).to.have.property('timestamp');
            expect(response.body).to.have.property('dataFile');
        });
    });
    
    describe('📚 Data Management Endpoints', () => {
        it('should load data successfully', async () => {
            const response = await request(app)
                .get('/api/data')
                .expect(200);
                
            expect(response.body).to.have.property('prompts');
            expect(response.body).to.have.property('categories');
            expect(response.body).to.have.property('folders');
            expect(response.body).to.have.property('settings');
            expect(response.body).to.have.property('metadata');
            expect(response.body.prompts).to.be.an('array');
        });
        
        it('should save data successfully', async () => {
            const testData = {
                prompts: [
                    {
                        id: 'save_test_prompt',
                        text: 'Test save functionality',
                        category: 'Test',
                        tags: ['save', 'test'],
                        folder: 'Default',
                        rating: 5,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        usage_count: 0,
                        notes: '',
                        metadata: { source: 'test', confidence: 1 }
                    }
                ],
                categories: ['All', 'Test'],
                folders: ['All', 'Default'],
                customFolders: [],
                settings: {
                    openaiApiKey: '',
                    autoCategorizationEnabled: true,
                    lastBackup: null
                },
                metadata: {
                    version: '1.0.0',
                    created: new Date().toISOString().split('T')[0],
                    totalPrompts: 1,
                    lastSaved: new Date().toISOString()
                }
            };
            
            const response = await request(app)
                .post('/api/data')
                .send(testData)
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body).to.have.property('message');
        });
        
        it('should handle autosave', async () => {
            const testData = {
                prompts: [],
                categories: ['All'],
                folders: ['All'],
                customFolders: [],
                settings: { openaiApiKey: '', autoCategorizationEnabled: true },
                metadata: { version: '1.0.0', totalPrompts: 0 }
            };
            
            const response = await request(app)
                .post('/api/autosave')
                .send(testData)
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body.message).to.include('Auto-save');
        });
    });
    
    describe('📝 Individual Prompt Operations', () => {
        let testPromptId;
        
        beforeEach(() => {
            testPromptId = 'test_prompt_' + Date.now();
        });
        
        it('should update a prompt', async () => {
            const updatedPrompt = {
                id: 'test_prompt_1',
                text: 'Updated test prompt',
                category: 'Code',
                tags: ['updated', 'test'],
                folder: 'Default',
                rating: 5,
                notes: 'Updated notes'
            };
            
            const response = await request(app)
                .put('/api/prompts/test_prompt_1')
                .send(updatedPrompt)
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body.prompt.text).to.equal('Updated test prompt');
        });
        
        it('should return 404 for non-existent prompt update', async () => {
            const response = await request(app)
                .put('/api/prompts/non_existent_id')
                .send({ text: 'Test' })
                .expect(404);
                
            expect(response.body).to.have.property('success', false);
            expect(response.body.error).to.include('not found');
        });
        
        it('should delete a prompt', async () => {
            const response = await request(app)
                .delete('/api/prompts/test_prompt_1')
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body).to.have.property('deletedPrompt');
        });
        
        it('should return 404 for non-existent prompt deletion', async () => {
            const response = await request(app)
                .delete('/api/prompts/non_existent_id')
                .expect(404);
                
            expect(response.body).to.have.property('success', false);
        });
    });
    
    describe('🔄 Bulk Operations', () => {
        beforeEach(async () => {
            // Reset test data
            const testData = {
                prompts: [
                    {
                        id: 'bulk_test_1',
                        text: 'Bulk test prompt 1',
                        category: 'Test',
                        tags: ['bulk', 'test'],
                        folder: 'Default',
                        rating: 3
                    },
                    {
                        id: 'bulk_test_2',
                        text: 'Bulk test prompt 2',
                        category: 'Test',
                        tags: ['bulk', 'test'],
                        folder: 'Default',
                        rating: 4
                    }
                ],
                categories: ['All', 'Test'],
                folders: ['All', 'Default'],
                customFolders: [],
                settings: { openaiApiKey: '' },
                metadata: { version: '1.0.0', totalPrompts: 2 }
            };
            
            await request(app)
                .post('/api/data')
                .send(testData);
        });
        
        it('should delete multiple prompts', async () => {
            const response = await request(app)
                .delete('/api/prompts/batch')
                .send({ ids: ['bulk_test_1', 'bulk_test_2'] })
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body.deletedCount).to.equal(2);
            expect(response.body.deletedPrompts).to.be.an('array').with.length(2);
        });
        
        it('should update multiple prompts', async () => {
            const updates = [
                {
                    id: 'bulk_test_1',
                    changes: { rating: 5, tags: ['updated', 'bulk'] }
                },
                {
                    id: 'bulk_test_2',
                    changes: { category: 'Updated' }
                }
            ];
            
            const response = await request(app)
                .put('/api/prompts/batch')
                .send({ updates })
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body.updatedCount).to.equal(2);
        });
        
        it('should handle invalid bulk delete request', async () => {
            const response = await request(app)
                .delete('/api/prompts/batch')
                .send({ ids: 'not-an-array' })
                .expect(400);
                
            expect(response.body).to.have.property('success', false);
            expect(response.body.error).to.include('array');
        });
    });
    
    describe('📊 Analytics Endpoint', () => {
        it('should return analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics')
                .expect(200);
                
            expect(response.body).to.have.property('totalPrompts');
            expect(response.body).to.have.property('categories');
            expect(response.body).to.have.property('topTags');
            expect(response.body).to.have.property('ratingDistribution');
            expect(response.body).to.have.property('monthlyStats');
            expect(response.body).to.have.property('avgRating');
            
            expect(response.body.totalPrompts).to.be.a('number');
            expect(response.body.categories).to.be.an('object');
        });
    });
    
    describe('💾 Backup Functionality', () => {
        it('should create a backup', async () => {
            const response = await request(app)
                .post('/api/backup')
                .expect(200);
                
            expect(response.body).to.have.property('success', true);
            expect(response.body).to.have.property('backupFile');
            expect(response.body.backupFile).to.include('backups/');
            
            // Check if backup file was actually created
            const backupPath = path.join(__dirname, '..', response.body.backupFile);
            expect(fs.existsSync(backupPath)).to.be.true;
            
            // Clean up
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
        });
    });
    
    describe('🔒 Input Validation', () => {
        it('should reject invalid JSON', async () => {
            const response = await request(app)
                .post('/api/data')
                .send('invalid json')
                .type('application/json')
                .expect(400);
        });
        
        it('should handle malformed prompt ID', async () => {
            const response = await request(app)
                .put('/api/prompts/')
                .send({ text: 'Test' })
                .expect(404);
        });
    });
    
    describe('🚨 Error Handling', () => {
        it('should handle missing data file gracefully', async () => {
            // Temporarily move the data file
            const dataFile = path.join(__dirname, '../data/prompts.json');
            const tempFile = dataFile + '.temp';
            
            if (fs.existsSync(dataFile)) {
                fs.renameSync(dataFile, tempFile);
            }
            
            try {
                const response = await request(app)
                    .get('/api/data')
                    .expect(200);
                    
                // Should create default data
                expect(response.body).to.have.property('prompts');
                expect(response.body.prompts).to.be.an('array').that.is.empty;
            } finally {
                // Restore the file
                if (fs.existsSync(tempFile)) {
                    fs.renameSync(tempFile, dataFile);
                }
            }
        });
    });
    
    describe('🔧 CORS and Security', () => {
        it('should include CORS headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
                
            expect(response.headers).to.have.property('access-control-allow-origin');
        });
    });
    
    describe('📱 Frontend Assets', () => {
        it('should serve index.html', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);
                
            expect(response.headers['content-type']).to.include('text/html');
        });
        
        it('should serve static CSS files', async () => {
            const response = await request(app)
                .get('/styles.css')
                .expect(200);
                
            expect(response.headers['content-type']).to.include('text/css');
        });
        
        it('should serve static JS files', async () => {
            const response = await request(app)
                .get('/app.js')
                .expect(200);
                
            expect(response.headers['content-type']).to.include('application/javascript');
        });
    });
});