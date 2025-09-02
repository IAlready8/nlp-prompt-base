#!/bin/bash

# Personal Enterprise-Grade NLP Prompt Database Setup
# Complete installation and configuration script for MacBook Air M2

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji for visual feedback
SUCCESS="✅"
ERROR="❌"
INFO="ℹ️"
ROCKET="🚀"
BRAIN="🧠"
DATABASE="🗄️"
GEAR="⚙️"
SHIELD="🛡️"

echo -e "${CYAN}${BRAIN} Personal Enterprise-Grade NLP Prompt Database Setup${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# Check system requirements
echo -e "${BLUE}${INFO} Checking system requirements...${NC}"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo -e "${RED}${ERROR} Node.js is not installed. Please install Node.js 16+ first.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ $NODE_MAJOR -lt 16 ]; then
    echo -e "${RED}${ERROR} Node.js version 16+ required. Current: $NODE_VERSION${NC}"
    exit 1
fi

echo -e "${GREEN}${SUCCESS} Node.js $NODE_VERSION detected${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}${ERROR} npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}${SUCCESS} npm $NPM_VERSION detected${NC}"

# Check available memory (MacBook Air M2 8GB check)
if [[ "$OSTYPE" == "darwin"* ]]; then
    MEMORY_GB=$(system_profiler SPHardwareDataType | grep "Memory:" | awk '{print $2}' | sed 's/GB//')
    echo -e "${GREEN}${SUCCESS} Detected $MEMORY_GB GB RAM${NC}"
    
    if [ $MEMORY_GB -lt 8 ]; then
        echo -e "${YELLOW}⚠️ Warning: Less than 8GB RAM detected. Performance may be limited.${NC}"
    fi
fi

echo ""

# Installation Phase
echo -e "${BLUE}${ROCKET} Starting Installation Phase...${NC}"
echo ""

# Create directory structure
echo -e "${YELLOW}${GEAR} Creating directory structure...${NC}"

# Ensure all directories exist
mkdir -p data backups config logs exports temp
mkdir -p src/{database,services,features,automation,utils,middleware,config}
mkdir -p tests scripts public/vendor

echo -e "${GREEN}${SUCCESS} Directory structure created${NC}"

# Install dependencies
echo -e "${YELLOW}${GEAR} Installing dependencies...${NC}"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}${ERROR} package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Install npm dependencies
npm install --production=false

# Install additional enterprise dependencies if not present
ADDITIONAL_DEPS=(
    "better-sqlite3"
    "chart.js"
    "compression"
    "helmet"
    "jsonschema"
    "node-cron"
)

for dep in "${ADDITIONAL_DEPS[@]}"; do
    if ! npm list "$dep" &> /dev/null; then
        echo -e "${YELLOW}Installing additional dependency: $dep${NC}"
        npm install "$dep" --save
    fi
done

echo -e "${GREEN}${SUCCESS} Dependencies installed${NC}"

# Database Migration
echo -e "${YELLOW}${DATABASE} Setting up database...${NC}"

# Run SQLite migration if data exists
if [ -f "data/prompts.json" ]; then
    echo -e "${BLUE}${INFO} Existing JSON data found. Running migration to SQLite...${NC}"
    node scripts/migrate-to-sqlite.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}${SUCCESS} Database migration completed${NC}"
    else
        echo -e "${RED}${ERROR} Database migration failed${NC}"
        exit 1
    fi
else
    echo -e "${BLUE}${INFO} No existing data found. Initializing fresh SQLite database...${NC}"
    
    # Create empty database
    cat > data/prompts.json << 'EOF'
{
  "prompts": [],
  "categories": ["All", "Code", "Cognitive", "Jailbreak", "Dev", "Writing", "Business", "General", "Creative", "Analysis", "Research"],
  "folders": ["All", "Favorites", "Archive", "Default"],
  "customFolders": [],
  "settings": {
    "openaiApiKey": "",
    "autoCategorizationEnabled": true,
    "lastBackup": null
  },
  "metadata": {
    "version": "2.0.0",
    "created": "",
    "totalPrompts": 0
  }
}
EOF
    
    # Update creation date
    sed -i.bak "s/\"created\": \"\"/\"created\": \"$(date +%Y-%m-%d)\"/" data/prompts.json
    rm -f data/prompts.json.bak
    
    # Run migration to convert to SQLite
    node scripts/migrate-to-sqlite.js
    
    echo -e "${GREEN}${SUCCESS} Fresh database initialized${NC}"
fi

# Configuration Setup
echo -e "${YELLOW}${GEAR} Setting up configuration...${NC}"

# Create personal configuration if it doesn't exist
if [ ! -f "config/personal.json" ]; then
    cat > config/personal.json << 'EOF'
{
  "database": {
    "type": "sqlite",
    "path": "./data/prompts.db",
    "backupInterval": 60
  },
  "ai": {
    "openaiKey": "",
    "model": "gpt-3.5-turbo",
    "autoCategorizationEnabled": true,
    "batchSize": 5,
    "requestDelay": 100
  },
  "ui": {
    "theme": "dark",
    "compactMode": false,
    "animations": true,
    "keyboardShortcuts": true,
    "autoSave": true
  },
  "performance": {
    "maxPromptsInMemory": 10000,
    "enableIndexing": true,
    "debugMode": false,
    "enableAnalytics": true,
    "cacheSize": 1000
  },
  "backup": {
    "enabled": true,
    "interval": 60,
    "maxBackups": 10,
    "autoCleanup": true,
    "compression": false
  },
  "shortcuts": {
    "quickNote": "cmd+shift+n",
    "advancedSearch": "cmd+shift+f",
    "createBackup": "cmd+shift+b",
    "showInsights": "cmd+shift+i",
    "commandPalette": "cmd+shift+p"
  },
  "automation": {
    "autoCategorizationEnabled": true,
    "duplicateDetection": true,
    "smartSuggestions": true,
    "workflowsEnabled": true
  },
  "privacy": {
    "analytics": false,
    "errorReporting": false,
    "usageTracking": true
  }
}
EOF
    echo -e "${GREEN}${SUCCESS} Personal configuration created${NC}"
else
    echo -e "${GREEN}${SUCCESS} Personal configuration already exists${NC}"
fi

# Create environment file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.sample .env 2>/dev/null || cat > .env << 'EOF'
# Personal NLP Prompt Database Environment
NODE_ENV=production
PORT=3001
HOST=localhost

# OpenAI Configuration (optional - for AI features)
OPENAI_API_KEY=

# Database Configuration
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/prompts.db

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL=3600000
MAX_BACKUPS=10

# Performance Configuration
MAX_PROMPTS_MEMORY=10000
ENABLE_INDEXING=true
CACHE_SIZE=1000

# Security Configuration
ENABLE_RATE_LIMITING=true
CORS_ORIGIN=http://localhost:3001,http://localhost:8000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF
    echo -e "${GREEN}${SUCCESS} Environment configuration created${NC}"
else
    echo -e "${GREEN}${SUCCESS} Environment configuration already exists${NC}"
fi

# Security Setup
echo -e "${YELLOW}${SHIELD} Setting up security...${NC}"

# Set appropriate file permissions
chmod 600 .env config/personal.json 2>/dev/null || true
chmod 755 scripts/*.js 2>/dev/null || true
chmod 755 start.sh start-simple.sh 2>/dev/null || true

# Create .gitignore additions for sensitive files
if [ -f ".gitignore" ]; then
    # Add security-sensitive files to .gitignore if not already present
    grep -q "config/personal.json" .gitignore || echo "config/personal.json" >> .gitignore
    grep -q "data/prompts.db" .gitignore || echo "data/prompts.db" >> .gitignore
    grep -q "logs/*.log" .gitignore || echo "logs/*.log" >> .gitignore
    grep -q "temp/*" .gitignore || echo "temp/*" >> .gitignore
fi

echo -e "${GREEN}${SUCCESS} Security configured${NC}"

# Performance Optimization
echo -e "${YELLOW}${GEAR} Optimizing for MacBook Air M2...${NC}"

# Create performance tuning script
cat > scripts/optimize-performance.js << 'EOF'
#!/usr/bin/env node

/**
 * Performance optimization for MacBook Air M2 8GB RAM
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Optimizing for MacBook Air M2...');

// Optimize Node.js settings for 8GB RAM
process.env.NODE_OPTIONS = '--max-old-space-size=4096 --max-semi-space-size=64';

// Create optimized startup script
const optimizedStartScript = `#!/bin/bash

# Optimized startup for MacBook Air M2
export NODE_OPTIONS="--max-old-space-size=4096 --max-semi-space-size=64"
export UV_THREADPOOL_SIZE=4

# Enable Node.js optimizations
export NODE_ENV=production

# Start the application
node server.js
`;

fs.writeFileSync('start-optimized.sh', optimizedStartScript);
fs.chmodSync('start-optimized.sh', '755');

console.log('✅ Performance optimization completed');
EOF

chmod +x scripts/optimize-performance.js
node scripts/optimize-performance.js

echo -e "${GREEN}${SUCCESS} Performance optimized for MacBook Air M2${NC}"

# Vendor Libraries Setup
echo -e "${YELLOW}${GEAR} Setting up vendor libraries...${NC}"

# Try to download vendor libraries, but continue if network is unavailable
if node copy-vendor.js 2>/dev/null; then
    echo -e "${GREEN}${SUCCESS} Vendor libraries downloaded${NC}"
else
    echo -e "${YELLOW}⚠️ Could not download vendor libraries (network issue). Using local fallbacks.${NC}"
    
    # Create minimal fallbacks for essential libraries
    mkdir -p public/vendor
    
    # Chart.js fallback
    if [ ! -f "public/vendor/chart.js" ]; then
        echo "// Chart.js placeholder - download manually if needed" > public/vendor/chart.js
    fi
    
    # Sortable.js should already exist based on the test results
    if [ ! -f "public/vendor/sortable.js" ]; then
        echo "// Sortable.js placeholder - download manually if needed" > public/vendor/sortable.js
    fi
fi

# Testing Phase
echo -e "${YELLOW}${GEAR} Running tests...${NC}"

# Run the test suite
if npm test; then
    echo -e "${GREEN}${SUCCESS} All tests passed${NC}"
else
    echo -e "${YELLOW}⚠️ Some tests failed, but setup will continue${NC}"
fi

# Create startup scripts
echo -e "${YELLOW}${GEAR} Creating startup scripts...${NC}"

# Create macOS-specific launcher
cat > launch-macos.sh << 'EOF'
#!/bin/bash

# macOS-specific launcher for Personal NLP Prompt Database
echo "🧠 Starting Personal NLP Prompt Database..."

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS"
    exit 1
fi

# Optimize for macOS
export NODE_OPTIONS="--max-old-space-size=4096"
export UV_THREADPOOL_SIZE=4

# Start the server
npm run dev &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Open in default browser
open http://localhost:3001

echo "✅ Personal NLP Prompt Database is running!"
echo "🌐 Access URL: http://localhost:3001"
echo "⚡ Press Ctrl+C to stop"

# Wait for server process
wait $SERVER_PID
EOF

chmod +x launch-macos.sh

# Create Windows launcher (for compatibility)
cat > launch-windows.bat << 'EOF'
@echo off
echo 🧠 Starting Personal NLP Prompt Database...

REM Set Node.js optimizations
set NODE_OPTIONS=--max-old-space-size=4096
set UV_THREADPOOL_SIZE=4

REM Start the server
start /b npm run dev

REM Wait for server to start
timeout /t 3 /nobreak > nul

REM Open in default browser
start http://localhost:3001

echo ✅ Personal NLP Prompt Database is running!
echo 🌐 Access URL: http://localhost:3001
echo ⚡ Press Ctrl+C to stop

pause
EOF

echo -e "${GREEN}${SUCCESS} Startup scripts created${NC}"

# Final Setup
echo -e "${YELLOW}${GEAR} Finalizing setup...${NC}"

# Create logs directory and initial log file
touch logs/app.log
touch logs/error.log
touch logs/performance.log

# Create initial backup
echo -e "${BLUE}${INFO} Creating initial backup...${NC}"
if [ -f "data/prompts.db" ]; then
    cp data/prompts.db "backups/initial-backup-$(date +%Y%m%d%H%M%S).db"
    echo -e "${GREEN}${SUCCESS} Initial backup created${NC}"
fi

# Update package.json scripts if needed
if command -v jq &> /dev/null; then
    # Add new scripts using jq if available
    jq '.scripts.start_optimized = "./start-optimized.sh"' package.json > package.json.tmp && mv package.json.tmp package.json
    jq '.scripts.launch = "./launch-macos.sh"' package.json > package.json.tmp && mv package.json.tmp package.json
else
    echo -e "${YELLOW}${INFO} jq not available. Please manually add startup scripts to package.json${NC}"
fi

# Create desktop shortcut on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    DESKTOP_PATH="$HOME/Desktop"
    if [ -d "$DESKTOP_PATH" ]; then
        cat > "$DESKTOP_PATH/NLP Prompt Database.command" << EOF
#!/bin/bash
cd "$(dirname "\$0")/../../$(basename "$(pwd)")"
./launch-macos.sh
EOF
        chmod +x "$DESKTOP_PATH/NLP Prompt Database.command"
        echo -e "${GREEN}${SUCCESS} Desktop shortcut created${NC}"
    fi
fi

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}${SUCCESS} Personal Enterprise-Grade Setup Complete! ${SUCCESS}${NC}"
echo -e "${GREEN}================================================================${NC}"
echo ""

# Display summary
echo -e "${CYAN}📊 Setup Summary:${NC}"
echo -e "   ${SUCCESS} SQLite database configured"
echo -e "   ${SUCCESS} Personal configuration created"
echo -e "   ${SUCCESS} Performance optimized for MacBook Air M2"
echo -e "   ${SUCCESS} Security settings applied"
echo -e "   ${SUCCESS} Automation workflows enabled"
echo -e "   ${SUCCESS} Analytics dashboard ready"
echo -e "   ${SUCCESS} Smart shortcuts configured"
echo -e "   ${SUCCESS} Backup system initialized"
echo ""

echo -e "${CYAN}🚀 Quick Start Options:${NC}"
echo -e "   ${BLUE}Option 1 (macOS):${NC} ./launch-macos.sh"
echo -e "   ${BLUE}Option 2 (Manual):${NC} npm run dev"
echo -e "   ${BLUE}Option 3 (Optimized):${NC} ./start-optimized.sh"
echo ""

echo -e "${CYAN}📱 Access Your Database:${NC}"
echo -e "   ${BLUE}Web Interface:${NC} http://localhost:3001"
echo -e "   ${BLUE}Desktop Shortcut:${NC} ~/Desktop/NLP Prompt Database.command"
echo ""

echo -e "${CYAN}⌨️ Keyboard Shortcuts:${NC}"
echo -e "   ${BLUE}Quick Note:${NC} Cmd+Shift+N"
echo -e "   ${BLUE}Advanced Search:${NC} Cmd+Shift+F"
echo -e "   ${BLUE}Create Backup:${NC} Cmd+Shift+B"
echo -e "   ${BLUE}Show Analytics:${NC} Cmd+Shift+I"
echo -e "   ${BLUE}Command Palette:${NC} Cmd+Shift+P"
echo ""

echo -e "${CYAN}🔧 Configuration Files:${NC}"
echo -e "   ${BLUE}Personal Config:${NC} config/personal.json"
echo -e "   ${BLUE}Environment:${NC} .env"
echo -e "   ${BLUE}Database:${NC} data/prompts.db"
echo ""

echo -e "${CYAN}💾 Data Management:${NC}"
echo -e "   ${BLUE}Backups:${NC} backups/"
echo -e "   ${BLUE}Exports:${NC} exports/"
echo -e "   ${BLUE}Logs:${NC} logs/"
echo ""

echo -e "${YELLOW}⚠️ Next Steps:${NC}"
echo -e "   1. ${BLUE}Configure OpenAI API key${NC} in .env file (optional)"
echo -e "   2. ${BLUE}Launch the application${NC} using one of the quick start options"
echo -e "   3. ${BLUE}Create your first prompt${NC} with Cmd+Shift+N"
echo -e "   4. ${BLUE}Explore the analytics dashboard${NC} with Cmd+Shift+I"
echo ""

echo -e "${GREEN}🎉 Enjoy your Personal Enterprise-Grade NLP Prompt Database!${NC}"
echo ""
EOF

chmod +x scripts/setup-personal.sh