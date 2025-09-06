#!/bin/bash

# BoxLang Electron Development Script
# This script helps with common development tasks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  BoxLang Electron Development  ${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if npm is available
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    print_success "npm is available"
}

# Check if dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_warning "Dependencies not found. Installing..."
        npm install
    fi
    print_success "Dependencies are ready"
}

# Build assets for production
build_assets() {
    print_warning "Building assets for production..."
    npm run build
    print_success "Assets built successfully"
}

# Start development servers
dev_mode() {
    print_warning "Starting development mode (Vite + Electron)..."
    npm run dev:electron
}

# Clean build artifacts
clean() {
    print_warning "Cleaning build artifacts..."
    rm -rf dist
    rm -rf out
    rm -rf .vite
    print_success "Build artifacts cleaned"
}

# Show help
show_help() {
    echo "BoxLang Electron Development Helper"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development mode (Vite + Electron)"
    echo "  build       Build assets for production"
    echo "  package     Package the application"
    echo "  clean       Clean build artifacts"
    echo "  install     Install dependencies"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev      # Start development"
    echo "  $0 build    # Build for production"
    echo "  $0 package  # Create distributable"
}

# Main script logic
print_header

case "${1:-help}" in
    "dev")
        check_npm
        check_dependencies
        dev_mode
        ;;
    "build")
        check_npm
        check_dependencies
        build_assets
        ;;
    "package")
        check_npm
        check_dependencies
        build_assets
        print_warning "Packaging application..."
        npm run package
        print_success "Application packaged successfully"
        ;;
    "clean")
        clean
        ;;
    "install")
        check_npm
        npm install
        print_success "Dependencies installed"
        ;;
    "help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
