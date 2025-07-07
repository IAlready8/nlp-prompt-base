#!/usr/bin/env node

/**
 * NLP Prompt Database Test Runner
 * Automated testing script for CI/CD and development
 */

const fs = require('fs');
const path = require('path');

// ANSI Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bright: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    log('\n' + '='.repeat(60), 'cyan');
    log(`  ${message}`, 'bright');
    log('='.repeat(60), 'cyan');
}

function logTest(testName, status, details = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
    const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
    log(`${icon} ${testName}`, color);
    if (details) {
        log(`   ${details}`, 'reset');
    }
}

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0
        };
    }

    addTest(name, testFn, category = 'General') {
        this.tests.push({ name, testFn, category });
    }

    async runTest(test) {
        try {
            await test.testFn();
            this.results.passed++;
            logTest(test.name, 'PASS');
            return true;
        } catch (error) {
            this.results.failed++;
            logTest(test.name, 'FAIL', error.message);
            return false;
        }
    }

    async runAll() {
        logHeader('🧠 NLP Prompt Database Test Suite');
        
        this.results.total = this.tests.length;
        log(`Running ${this.results.total} tests...\n`, 'blue');

        const categories = [...new Set(this.tests.map(t => t.category))];
        
        for (const category of categories) {
            log(`\n📋 ${category} Tests:`, 'magenta');
            const categoryTests = this.tests.filter(t => t.category === category);
            
            for (const test of categoryTests) {
                await this.runTest(test);
            }
        }

        this.printSummary();
        return this.results.failed === 0;
    }

    printSummary() {
        logHeader('Test Results Summary');
        
        log(`Total Tests: ${this.results.total}`, 'blue');
        log(`Passed: ${this.results.passed}`, 'green');
        log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
        log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`, 
            this.results.failed === 0 ? 'green' : 'yellow');

        if (this.results.failed === 0) {
            log('\n🎉 All tests passed!', 'green');
        } else {
            log(`\n⚠️  ${this.results.failed} test(s) failed`, 'red');
        }
    }
}

// Test Utilities
function assert(condition, message = 'Assertion failed') {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertFileExists(filePath, message) {
    if (!fs.existsSync(filePath)) {
        throw new Error(message || `File does not exist: ${filePath}`);
    }
}

function assertDirectoryExists(dirPath, message) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        throw new Error(message || `Directory does not exist: ${dirPath}`);
    }
}

// Initialize Test Runner
const runner = new TestRunner();

// File Structure Tests
runner.addTest('Project Structure - Root Files', () => {
    const rootPath = path.join(__dirname, '..');
    assertFileExists(path.join(rootPath, 'package.json'), 'package.json should exist');
    assertFileExists(path.join(rootPath, 'server.js'), 'server.js should exist');
    assertFileExists(path.join(rootPath, 'README.md'), 'README.md should exist');
    assertFileExists(path.join(rootPath, 'CLAUDE.md'), 'CLAUDE.md should exist');
}, 'File Structure');

runner.addTest('Project Structure - Public Directory', () => {
    const publicPath = path.join(__dirname, '..', 'public');
    assertDirectoryExists(publicPath, 'public directory should exist');
    assertFileExists(path.join(publicPath, 'index.html'), 'index.html should exist');
    assertFileExists(path.join(publicPath, 'app.js'), 'app.js should exist');
    assertFileExists(path.join(publicPath, 'styles.css'), 'styles.css should exist');
    assertFileExists(path.join(publicPath, 'manifest.json'), 'manifest.json should exist');
    assertFileExists(path.join(publicPath, 'sw.js'), 'service worker should exist');
}, 'File Structure');

runner.addTest('Project Structure - Source Directory', () => {
    const srcPath = path.join(__dirname, '..', 'src');
    assertDirectoryExists(srcPath, 'src directory should exist');
    assertFileExists(path.join(srcPath, 'database.js'), 'database.js should exist');
    assertFileExists(path.join(srcPath, 'openai-integration.js'), 'openai-integration.js should exist');
}, 'File Structure');

runner.addTest('Project Structure - Data Directory', () => {
    const dataPath = path.join(__dirname, '..', 'data');
    assertDirectoryExists(dataPath, 'data directory should exist');
}, 'File Structure');

// Package.json Validation Tests
runner.addTest('Package.json - Required Fields', () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    assert(packageJson.name, 'Package should have name');
    assert(packageJson.version, 'Package should have version');
    assert(packageJson.description, 'Package should have description');
    assert(packageJson.scripts, 'Package should have scripts');
    assert(packageJson.dependencies, 'Package should have dependencies');
}, 'Configuration');

runner.addTest('Package.json - Scripts Validation', () => {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    assert(packageJson.scripts.start, 'Should have start script');
    assert(packageJson.scripts.dev, 'Should have dev script');
    assert(packageJson.scripts.test, 'Should have test script');
}, 'Configuration');

// HTML Validation Tests
runner.addTest('HTML - Document Structure', () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    assert(htmlContent.includes('<!DOCTYPE html>'), 'Should have proper DOCTYPE');
    assert(htmlContent.includes('<html lang="en">'), 'Should have language attribute');
    assert(htmlContent.includes('<meta charset="UTF-8">'), 'Should have charset meta tag');
    assert(htmlContent.includes('<meta name="viewport"'), 'Should have viewport meta tag');
}, 'HTML Validation');

runner.addTest('HTML - Required Elements', () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    assert(htmlContent.includes('id="quick-add-modal"'), 'Should have quick add modal');
    assert(htmlContent.includes('id="view-container"'), 'Should have view container');
    assert(htmlContent.includes('class="sidebar"'), 'Should have sidebar');
    assert(htmlContent.includes('class="main-content"'), 'Should have main content');
}, 'HTML Validation');

runner.addTest('HTML - PWA Elements', () => {
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    assert(htmlContent.includes('rel="manifest"'), 'Should have manifest link');
    assert(htmlContent.includes('name="theme-color"'), 'Should have theme color');
    assert(htmlContent.includes('apple-mobile-web-app'), 'Should have Apple PWA meta tags');
}, 'PWA');

// CSS Validation Tests
runner.addTest('CSS - Core Styles', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    assert(cssContent.includes(':root'), 'Should have CSS variables');
    assert(cssContent.includes('.app-container'), 'Should have app container styles');
    assert(cssContent.includes('.sidebar'), 'Should have sidebar styles');
    assert(cssContent.includes('.prompt-card'), 'Should have prompt card styles');
}, 'CSS Validation');

runner.addTest('CSS - Responsive Design', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    assert(cssContent.includes('@media'), 'Should have media queries');
    assert(cssContent.includes('max-width'), 'Should have responsive breakpoints');
    assert(cssContent.includes('prefers-reduced-motion'), 'Should have accessibility support');
}, 'CSS Validation');

// JavaScript Validation Tests
runner.addTest('JavaScript - App Structure', () => {
    const jsPath = path.join(__dirname, '..', 'public', 'app.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    assert(jsContent.includes('class NLPPromptDatabase'), 'Should have main app class');
    assert(jsContent.includes('constructor()'), 'Should have constructor');
    assert(jsContent.includes('async init()'), 'Should have init method');
}, 'JavaScript Validation');

runner.addTest('JavaScript - Required Methods', () => {
    const jsPath = path.join(__dirname, '..', 'public', 'app.js');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    assert(jsContent.includes('handleQuickAdd'), 'Should have handleQuickAdd method');
    assert(jsContent.includes('updateFilteredPrompts'), 'Should have updateFilteredPrompts method');
    assert(jsContent.includes('handleKeyboardShortcuts'), 'Should have keyboard shortcuts');
    assert(jsContent.includes('toggleBulkMode'), 'Should have bulk mode functionality');
}, 'JavaScript Validation');

// Service Worker Tests
runner.addTest('Service Worker - Basic Structure', () => {
    const swPath = path.join(__dirname, '..', 'public', 'sw.js');
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    assert(swContent.includes('CACHE_NAME'), 'Should have cache name');
    assert(swContent.includes('addEventListener(\'install\''), 'Should have install event');
    assert(swContent.includes('addEventListener(\'fetch\''), 'Should have fetch event');
}, 'Service Worker');

// Manifest Tests
runner.addTest('PWA Manifest - Required Fields', () => {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    assert(manifest.name, 'Should have name');
    assert(manifest.short_name, 'Should have short_name');
    assert(manifest.start_url, 'Should have start_url');
    assert(manifest.display, 'Should have display mode');
    assert(manifest.icons, 'Should have icons');
}, 'PWA');

// Database Structure Tests
runner.addTest('Database Module - Structure', () => {
    const dbPath = path.join(__dirname, '..', 'src', 'database.js');
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    
    assert(dbContent.includes('class LocalJSONDatabase'), 'Should have database class');
    assert(dbContent.includes('addPrompt'), 'Should have addPrompt method');
    assert(dbContent.includes('updatePrompt'), 'Should have updatePrompt method');
    assert(dbContent.includes('deletePrompt'), 'Should have deletePrompt method');
}, 'Database');

// Run all tests
runner.runAll().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    log(`\n💥 Test runner crashed: ${error.message}`, 'red');
    process.exit(1);
});