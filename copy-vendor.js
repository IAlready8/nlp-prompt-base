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
        filename: 'chart.js',
        fallbackPath: 'node_modules/chart.js/dist/chart.umd.js'
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js',
        filename: 'sortable.js',
        fallbackPath: null
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
        let successCount = 0;
        let failCount = 0;
        
        for (const lib of libraries) {
            const filepath = path.join(vendorDir, lib.filename);
            
            // Skip if file already exists
            if (fs.existsSync(filepath)) {
                console.log(`⏭️  Skipping: ${lib.filename} (already exists)`);
                successCount++;
                continue;
            }
            
            try {
                await downloadFile(lib.url, filepath);
                successCount++;
            } catch (err) {
                console.error(`⚠️  Failed to download ${lib.filename}: ${err.message}`);
                
                // Try fallback from node_modules
                if (lib.fallbackPath) {
                    const fallbackPath = path.join(__dirname, lib.fallbackPath);
                    if (fs.existsSync(fallbackPath)) {
                        console.log(`📋 Copying from node_modules: ${lib.filename}`);
                        fs.copyFileSync(fallbackPath, filepath);
                        console.log(`✅ Copied: ${lib.filename} (from node_modules)`);
                        successCount++;
                    } else {
                        console.error(`❌ Fallback file not found: ${lib.fallbackPath}`);
                        failCount++;
                    }
                } else {
                    failCount++;
                }
            }
        }
        
        if (successCount > 0) {
            console.log(`🎉 Downloaded ${successCount} vendor library/libraries successfully!`);
        }
        
        if (failCount > 0) {
            console.warn(`⚠️  ${failCount} library/libraries failed to download (will use existing or fallback)`);
        }
        
        console.log('📂 Vendor directory:', vendorDir);
        
        // Don't exit with error if some files already exist or on network failure
        // This allows builds to continue in environments without internet access
        if (successCount === 0 && failCount > 0) {
            console.warn('⚠️  Warning: No new libraries downloaded, but continuing build...');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error in download process:', error.message);
        // Don't fail the build
        console.warn('⚠️  Continuing despite download errors...');
        process.exit(0);
    }
}

downloadAllLibraries();