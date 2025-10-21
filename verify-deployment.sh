#!/bin/bash

# Deployment Verification Script
# This script helps verify that the application is ready for deployment

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  NLP Prompt Database - Deployment Verification Script   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Node.js: $NODE_VERSION"
if [[ ! $NODE_VERSION =~ ^v(1[6-9]|[2-9][0-9])\. ]]; then
    echo -e "${RED}❌ Node.js version must be 16.x or higher${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version OK${NC}"
echo ""

# Check npm version
echo "🔍 Checking npm version..."
NPM_VERSION=$(npm --version)
echo "   npm: $NPM_VERSION"
echo -e "${GREEN}✅ npm version OK${NC}"
echo ""

# Check critical files
echo "🔍 Checking critical files..."
CRITICAL_FILES=(
    "package.json"
    "server.js"
    "vercel.json"
    "Dockerfile"
    ".gitignore"
    "README.md"
    "DEPLOYMENT.md"
    "public/index.html"
    "public/app.js"
    "src/openai-integration.js"
    "data/prompts.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "   ${GREEN}✓${NC} $file"
    else
        echo -e "   ${RED}✗${NC} $file (missing)"
        exit 1
    fi
done
echo -e "${GREEN}✅ All critical files present${NC}"
echo ""

# Check directories
echo "🔍 Checking directory structure..."
REQUIRED_DIRS=(
    "public"
    "src"
    "data"
    "backups"
    "tests"
    "public/vendor"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "   ${GREEN}✓${NC} $dir/"
    else
        echo -e "   ${RED}✗${NC} $dir/ (missing)"
        exit 1
    fi
done
echo -e "${GREEN}✅ Directory structure OK${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent > /dev/null 2>&1
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Check vendor libraries
echo "🔍 Checking vendor libraries..."
if [ -f "public/vendor/chart.js" ]; then
    echo -e "   ${GREEN}✓${NC} chart.js"
else
    echo -e "   ${YELLOW}⚠${NC} chart.js missing (will be built)"
fi

if [ -f "public/vendor/sortable.js" ]; then
    echo -e "   ${GREEN}✓${NC} sortable.js"
else
    echo -e "   ${YELLOW}⚠${NC} sortable.js missing (will be built)"
fi
echo ""

# Run build
echo "🔨 Running build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

# Verify vendor libraries after build
echo "🔍 Verifying vendor libraries after build..."
if [ -f "public/vendor/chart.js" ] && [ -f "public/vendor/sortable.js" ]; then
    echo -e "${GREEN}✅ All vendor libraries present${NC}"
else
    echo -e "${RED}❌ Vendor libraries missing after build${NC}"
    exit 1
fi
echo ""

# Run tests
echo "🧪 Running tests..."
if npm test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    echo "   Run 'npm test' for details"
    exit 1
fi
echo ""

# Test server start
echo "🚀 Testing server startup..."
timeout 3 node server.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

if ps -p $SERVER_PID > /dev/null; then
    kill $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Server starts successfully${NC}"
else
    echo -e "${RED}❌ Server failed to start${NC}"
    exit 1
fi
echo ""

# Check for environment file
echo "🔍 Checking for .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠ .env file not found (using defaults)${NC}"
    echo "   Copy .env.sample to .env and configure if needed"
fi
echo ""

# Summary
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  ✅ Verification Complete                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}All checks passed! Your application is ready for deployment.${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy to Vercel:"
echo "     $ vercel --prod"
echo ""
echo "  2. Or deploy via GitHub:"
echo "     $ git push origin main"
echo ""
echo "  3. Or run locally:"
echo "     $ npm start"
echo ""
echo "For more deployment options, see DEPLOYMENT.md"
echo ""
