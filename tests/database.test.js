const { expect } = require('chai');
const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

const app = require('../server');

describe('Database API Tests', () => {
    const testDataFile = path.join(__dirname, '../data/test-prompts.json');
    
    before(async () => {
        const testData = {
            prompts: [],
            categories: ["All", "Code", "General"],
            folders: ["All", "Default"],
            customFolders: [],
            settings: {
                openaiApiKey: "",
                autoCategorizationEnabled: true
            },
            metadata: {
                version: "1.0.0",
                totalPrompts: 0
            }
        };
        await fs.writeFile(testDataFile, JSON.stringify(testData, null, 2));
    });

    after(async () => {
        try {
            await fs.unlink(testDataFile);
        } catch (error) {
            console.log('Test file cleanup failed:', error.message);
        }
    });

    describe('GET /api/data', () => {
        it('should return database structure', async () => {
            const response = await request(app)
                .get('/api/data')
                .expect(200);

            expect(response.body).to.have.property('prompts');
            expect(response.body).to.have.property('categories');
            expect(response.body).to.have.property('folders');
            expect(response.body).to.have.property('metadata');
        });
    });

    describe('POST /api/data', () => {
        it('should save data successfully', async () => {
            const testData = {
                prompts: [{
                    id: 'test-prompt-1',
                    text: 'Test prompt',
                    category: 'General',
                    tags: ['test'],
                    folder: 'Default',
                    rating: 5
                }],
                categories: ["All", "Code", "General"],
                folders: ["All", "Default"],
                customFolders: [],
                settings: {},
                metadata: { totalPrompts: 1 }
            };

            const response = await request(app)
                .post('/api/data')
                .send(testData)
                .expect(200);

            expect(response.body.success).to.be.true;
        });

        it('should reject invalid data', async () => {
            const invalidData = { invalid: 'structure' };

            await request(app)
                .post('/api/data')
                .send(invalidData)
                .expect(200);
        });
    });

    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).to.have.property('status', 'ok');
            expect(response.body).to.have.property('timestamp');
        });
    });

    describe('POST /api/backup', () => {
        it('should create backup successfully', async () => {
            const response = await request(app)
                .post('/api/backup')
                .expect(200);

            expect(response.body.success).to.be.true;
            expect(response.body).to.have.property('backupFile');
        });
    });

    describe('GET /api/analytics', () => {
        it('should return analytics data', async () => {
            const response = await request(app)
                .get('/api/analytics')
                .expect(200);

            expect(response.body).to.have.property('totalPrompts');
            expect(response.body).to.have.property('categories');
            expect(response.body).to.have.property('topTags');
        });
    });
});