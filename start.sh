#!/bin/bash

# NLP Prompt Database Launcher
# Comprehensive startup script with health checks and optimization

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ASCII Art Header
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🧠 NLP Prompt Database                    ║"
echo "║           AI-Powered Prompt Organization & Management         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
PORT=${PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-8000}
NODE_ENV=${NODE_ENV:-development}

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Function to wait for server to be ready
wait_for_server() {
    local url=$1
    local timeout=${2:-30}
    local count=0
    
    log_info "Waiting for server to be ready..."
    
    while [ $count -lt $timeout ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    echo ""
    return 1
}

# Function to check Node.js version
check_node_version() {
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if [ "$node_version" -ge 16 ]; then
            log_success "Node.js version $(node --version) - OK"
            return 0
        else
            log_error "Node.js version $(node --version) is too old. Requires v16 or higher."
            return 1
        fi
    else
        log_error "Node.js is not installed"
        return 1
    fi
}

# Function to check npm version
check_npm_version() {
    if command -v npm >/dev/null 2>&1; then
        log_success "npm version $(npm --version) - OK"
        return 0
    else
        log_error "npm is not installed"
        return 1
    fi
}

# Function to install dependencies
install_dependencies() {
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        log_info "Installing dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            log_success "Dependencies installed"
        else
            log_error "Failed to install dependencies"
            exit 1
        fi
    else
        log_success "Dependencies already installed"
    fi
}

# Function to run tests
run_tests() {
    log_header "Running Test Suite"
    npm test
    if [ $? -eq 0 ]; then
        log_success "All tests passed!"
    else
        log_warning "Some tests failed, but continuing..."
    fi
}

# Function to setup data directory
setup_data_directory() {
    if [ ! -d "data" ]; then
        log_info "Creating data directory..."
        mkdir -p data
    fi
    
    if [ ! -f "data/prompts.json" ]; then
        log_info "Creating initial data file..."
        echo '{"prompts": [], "categories": ["All", "Code", "Cognitive", "Jailbreak", "Dev", "Writing", "Business", "General", "Creative", "Analysis", "Research"], "folders": ["All", "Favorites", "Archive", "Default"], "customFolders": [], "settings": {"openaiApiKey": "", "autoCategorizationEnabled": true, "autoTagsEnabled": true}, "metadata": {"version": "1.0.0", "created": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'", "totalPrompts": 0}}' > data/prompts.json
        log_success "Initial data file created"
    fi
}

# Function to setup backup directory
setup_backup_directory() {
    if [ ! -d "backups" ]; then
        log_info "Creating backups directory..."
        mkdir -p backups
        log_success "Backups directory created"
    fi
}

# Function to check for .env file
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env file not found"
        if [ -f ".env.sample" ]; then
            log_info "Copy .env.sample to .env and configure your settings"
            log_info "Example: cp .env.sample .env"
        fi
    else
        log_success ".env file found"
    fi
}

# Function to display system info
show_system_info() {
    log_header "System Information"
    echo "OS: $(uname -s) $(uname -r)"
    echo "Architecture: $(uname -m)"
    echo "Available Memory: $(free -h 2>/dev/null | grep '^Mem:' | awk '{print $7}' || echo 'N/A')"
    echo "CPU Cores: $(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 'N/A')"
    echo ""
}

# Function to start backend server
start_backend() {
    log_header "Starting Backend Server"
    
    # Check if port is available
    if ! check_port $PORT; then
        log_warning "Port $PORT is already in use"
        log_info "Attempting to kill existing process..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null
        sleep 2
    fi
    
    # Start server in background with fallback options
    if [ "$NODE_ENV" = "development" ]; then
        log_info "Attempting to start with nodemon..."
        if npm run dev > .backend.log 2>&1 &
        then
            local backend_pid=$!
            echo $backend_pid > .backend.pid
            sleep 3
            
            # Check if nodemon failed
            if ! kill -0 $backend_pid 2>/dev/null; then
                log_warning "Nodemon failed, falling back to simple node server..."
                npm run dev-simple > .backend.log 2>&1 &
                backend_pid=$!
                echo $backend_pid > .backend.pid
            fi
        else
            log_warning "Dev script failed, using simple node server..."
            npm run dev-simple > .backend.log 2>&1 &
            backend_pid=$!
            echo $backend_pid > .backend.pid
        fi
    else
        npm start > .backend.log 2>&1 &
        local backend_pid=$!
        echo $backend_pid > .backend.pid
    fi
    
    # Wait for server to be ready
    if wait_for_server "http://localhost:$PORT/api/health" 15; then
        log_success "Backend server started on port $PORT (PID: $backend_pid)"
    else
        log_error "Backend server failed to start"
        log_info "Check .backend.log for details:"
        tail -n 10 .backend.log 2>/dev/null || echo "No log file found"
        kill $backend_pid 2>/dev/null
        exit 1
    fi
}

# Function to start frontend server
start_frontend() {
    log_header "Starting Frontend Server"
    
    # Check if port is available
    if ! check_port $FRONTEND_PORT; then
        log_warning "Port $FRONTEND_PORT is already in use"
        log_info "Attempting to kill existing process..."
        lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
        sleep 2
    fi
    
    # Try live-server first, fallback to Python if it fails
    log_info "Starting frontend server..."
    if command -v live-server >/dev/null 2>&1; then
        npm run serve > .frontend.log 2>&1 &
        local frontend_pid=$!
        echo $frontend_pid > .frontend.pid
        log_info "Using live-server for hot reload"
    else
        log_warning "live-server not available, using Python HTTP server..."
        if command -v python3 >/dev/null 2>&1; then
            python3 -m http.server $FRONTEND_PORT --directory public > .frontend.log 2>&1 &
        elif command -v python >/dev/null 2>&1; then
            python -m http.server $FRONTEND_PORT --directory public > .frontend.log 2>&1 &
        else
            log_error "No suitable HTTP server found"
            exit 1
        fi
        local frontend_pid=$!
        echo $frontend_pid > .frontend.pid
        log_info "Using Python HTTP server (no hot reload)"
    fi
    
    # Wait for frontend to be ready
    if wait_for_server "http://localhost:$FRONTEND_PORT" 10; then
        log_success "Frontend server started on port $FRONTEND_PORT (PID: $frontend_pid)"
    else
        log_error "Frontend server failed to start"
        log_info "Check .frontend.log for details:"
        tail -n 5 .frontend.log 2>/dev/null || echo "No log file found"
        kill $frontend_pid 2>/dev/null
        exit 1
    fi
}

# Function to show startup complete message
show_startup_complete() {
    echo ""
    log_header "🎉 Startup Complete!"
    echo ""
    echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│                     🌐 Access Your App                     │${NC}"
    echo -e "${GREEN}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}│  Frontend: ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}                          │${NC}"
    echo -e "${GREEN}│  Backend:  ${CYAN}http://localhost:$PORT${GREEN}                               │${NC}"
    echo -e "${GREEN}│  Tests:    ${CYAN}http://localhost:$FRONTEND_PORT/tests/integration-test.html${GREEN} │${NC}"
    echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    log_info "Press Ctrl+C to stop all servers"
    echo ""
    
    # Show quick tips
    log_header "💡 Quick Tips"
    echo "• Add your OpenAI API key in Settings for AI features"
    echo "• Press Cmd+N to quickly add a new prompt"
    echo "• Use advanced search: tag:code rating:5 folder:favorites"
    echo "• Enable bulk mode with Cmd+B for multi-select operations"
    echo "• Right-click any prompt for context menu actions"
    echo ""
}

# Function to handle cleanup on exit
cleanup() {
    echo ""
    log_info "Shutting down servers..."
    
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null
        rm .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null
        rm .frontend.pid
    fi
    
    # Kill any remaining processes on our ports
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    
    log_success "Cleanup complete. Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution flow
main() {
    log_header "Initializing NLP Prompt Database"
    
    # System checks
    show_system_info
    check_node_version || exit 1
    check_npm_version || exit 1
    
    # Setup
    install_dependencies
    setup_data_directory
    setup_backup_directory
    check_env_file
    
    # Testing
    if [ "$NODE_ENV" = "development" ]; then
        run_tests
    fi
    
    # Start servers
    start_backend
    start_frontend
    
    # Show completion message
    show_startup_complete
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"