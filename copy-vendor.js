#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Create vendor directory
const vendorDir = path.join(__dirname, 'public', 'vendor');
if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

// Libraries to download
const libraries = [
    {
        url: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
        filename: 'chart.js'
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
        filename: 'sortable.js'
    }
];

function downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Downloaded: ${path.basename(filepath)}`);
                    resolve();
                });
            } else {
                fs.unlink(filepath, () => {}); // Delete partial file
                reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file
            reject(err);
        });
        
        file.on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

async function downloadAllLibraries() {
    console.log('📦 Downloading vendor libraries for offline use...');
    
    try {
        for (const lib of libraries) {
            const filepath = path.join(vendorDir, lib.filename);
            await downloadFile(lib.url, filepath);
        }
        console.log('🎉 All vendor libraries downloaded successfully!');
        console.log('📂 Files saved to:', vendorDir);
    } catch (error) {
        console.error('❌ Error downloading libraries:', error.message);
        process.exit(1);
    }
}

downloadAllLibraries();