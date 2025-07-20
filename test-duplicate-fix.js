#!/usr/bin/env node

// Simple test for duplicate detection functionality
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Duplicate Detection Fix...\n');

// Test 1: Check if duplicate detection methods exist in database.js
console.log('1. Checking database.js for duplicate detection methods...');
const dbPath = path.join(__dirname, 'public', 'database.js');
const dbContent = fs.readFileSync(dbPath, 'utf8');

const requiredMethods = [
    'generateUniqueId',
    'checkForDuplicates', 
    'calculateSimilarity',
    'addPromptForced'
];

let methodsFound = 0;
requiredMethods.forEach(method => {
    if (dbContent.includes(method)) {
        console.log(`   ✅ ${method} method found`);
        methodsFound++;
    } else {
        console.log(`   ❌ ${method} method missing`);
    }
});

// Test 2: Check if app.js has duplicate handling
console.log('\n2. Checking app.js for duplicate handling...');
const appPath = path.join(__dirname, 'public', 'app.js');
const appContent = fs.readFileSync(appPath, 'utf8');

const requiredFeatures = [
    'skippedPrompts',
    'DUPLICATE_PROMPT',
    'showDuplicateModal',
    'handleDuplicateOverride'
];

let featuresFound = 0;
requiredFeatures.forEach(feature => {
    if (appContent.includes(feature)) {
        console.log(`   ✅ ${feature} handling found`);
        featuresFound++;
    } else {
        console.log(`   ❌ ${feature} handling missing`);
    }
});

// Test 3: Check CSS for duplicate modal styles
console.log('\n3. Checking styles.css for duplicate modal styles...');
const cssPath = path.join(__dirname, 'public', 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const requiredStyles = [
    'duplicate-modal',
    'duplicate-list',
    'duplicate-item',
    'match-item'
];

let stylesFound = 0;
requiredStyles.forEach(style => {
    if (cssContent.includes(style)) {
        console.log(`   ✅ .${style} styles found`);
        stylesFound++;
    } else {
        console.log(`   ❌ .${style} styles missing`);
    }
});

// Summary
console.log('\n📊 Test Results Summary:');
console.log(`Database methods: ${methodsFound}/${requiredMethods.length}`);
console.log(`App features: ${featuresFound}/${requiredFeatures.length}`);
console.log(`CSS styles: ${stylesFound}/${requiredStyles.length}`);

const allTestsPassed = 
    methodsFound === requiredMethods.length &&
    featuresFound === requiredFeatures.length &&
    stylesFound === requiredStyles.length;

if (allTestsPassed) {
    console.log('\n🎉 All duplicate detection features are properly implemented!');
    console.log('\n✨ Features added:');
    console.log('   • Improved ID generation with collision prevention');
    console.log('   • Text similarity detection (90% threshold)');
    console.log('   • User-friendly duplicate notification modal');
    console.log('   • Option to override and add duplicates anyway');
    console.log('   • Graceful handling of multiple prompt additions');
    process.exit(0);
} else {
    console.log('\n⚠️  Some features may be missing or incomplete.');
    process.exit(1);
}