#!/bin/bash

# Simple NLP Prompt Database Launcher
# No dependencies on nodemon or live-server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-8000}

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
    echo -e "${CYAN}🚀 $1${NC}"
}

# Header
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🧠 NLP Prompt Database                    ║"
echo "║                    Simple Launcher (No Deps)                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Kill existing processes
cleanup_ports() {
    log_info "Cleaning up existing processes..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    sleep 1
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
    
    cleanup_ports
    
    log_success "Cleanup complete. Goodbye!"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Setup data directory
setup_data() {
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

# Start backend server
start_backend() {
    log_header "Starting Backend Server (Simple Mode)"
    
    cleanup_ports
    
    # Start simple node server
    node server.js > .backend.log 2>&1 &
    local backend_pid=$!
    echo $backend_pid > .backend.pid
    
    log_info "Backend server starting... (PID: $backend_pid)"
    sleep 3
    
    # Check if server is running
    if kill -0 $backend_pid 2>/dev/null; then
        log_success "Backend server started on port $PORT"
    else
        log_error "Backend server failed to start"
        log_info "Check .backend.log for details:"
        tail -n 10 .backend.log 2>/dev/null || echo "No log file found"
        exit 1
    fi
}

# Start frontend server
start_frontend() {
    log_header "Starting Frontend Server (Python)"
    
    # Use Python HTTP server
    if command -v python3 >/dev/null 2>&1; then
        python3 -m http.server $FRONTEND_PORT --directory public > .frontend.log 2>&1 &
        local python_cmd="python3"
    elif command -v python >/dev/null 2>&1; then
        python -m http.server $FRONTEND_PORT --directory public > .frontend.log 2>&1 &
        local python_cmd="python"
    else
        log_error "Python not found. Please install Python or use the full start.sh script"
        exit 1
    fi
    
    local frontend_pid=$!
    echo $frontend_pid > .frontend.pid
    
    log_info "Frontend server starting with $python_cmd... (PID: $frontend_pid)"
    sleep 2
    
    # Check if server is running
    if kill -0 $frontend_pid 2>/dev/null; then
        log_success "Frontend server started on port $FRONTEND_PORT"
    else
        log_error "Frontend server failed to start"
        exit 1
    fi
}

# Show completion message
show_completion() {
    echo ""
    log_header "🎉 Startup Complete!"
    echo ""
    echo -e "${GREEN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${GREEN}│                     🌐 Access Your App                     │${NC}"
    echo -e "${GREEN}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${GREEN}│  Frontend: ${CYAN}http://localhost:$FRONTEND_PORT${GREEN}                          │${NC}"
    echo -e "${GREEN}│  Backend:  ${CYAN}http://localhost:$PORT${GREEN}                               │${NC}"
    echo -e "${GREEN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    log_info "Press Ctrl+C to stop all servers"
    echo ""
    log_warning "Note: This is simple mode - no hot reload, manual restart needed for changes"
    echo ""
}

# Main execution
main() {
    setup_data
    start_backend
    start_frontend
    show_completion
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"