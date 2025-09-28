#!/bin/bash

# Node.js Environment Setup Script for VS Code
# 
# This script ensures the correct Node.js version is used for development.
# It automatically loads nvm and switches to the version specified in .nvmrc
#
# Features:
# - Detects nvm from common installation locations (default ~/.nvm and Homebrew)
# - Automatically uses the Node.js version from .nvmrc file
# - Validates that the correct version is active
# - Provides clear visual feedback with emojis and status messages
#
# Usage:
# - Run manually: ./.vscode/setup-node.sh
# - Run via VS Code task: Cmd+Shift+P → "Tasks: Run Task" → "Setup Node.js Environment"

echo "Setting up Node.js environment..."

# Try to load nvm from common locations
NVM_LOADED=false

# Check default nvm location
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    echo "Loading nvm from $NVM_DIR..."
    \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    NVM_LOADED=true
fi

# Check Homebrew nvm location (alternative installation)
if [ "$NVM_LOADED" = false ] && [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
    echo "Loading nvm from Homebrew..."
    export NVM_DIR="/opt/homebrew/opt/nvm"
    \. "/opt/homebrew/opt/nvm/nvm.sh"
    [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
    NVM_LOADED=true
fi

if [ "$NVM_LOADED" = true ]; then
    # Check if nvm is now available (as a function)
    if type nvm &> /dev/null; then
        echo "✅ nvm is available"
        
        # Use the version specified in .nvmrc
        if [ -f .nvmrc ]; then
            echo "Using Node.js version from .nvmrc..."
            nvm use
        else
            echo "⚠️  No .nvmrc file found"
        fi
    else
        echo "⚠️  nvm function not available after loading"
    fi
else
    echo "⚠️  nvm installation not found"
    echo "Checking if Node.js is available directly..."
fi

# Verify the Node.js version
echo ""
echo "📋 Environment Summary:"
echo "Node.js version: $(node --version)"
echo "npm version:     $(npm --version)"
echo "Node.js path:    $(which node)"

# Check if we're using the expected version
EXPECTED_VERSION=$(cat .nvmrc 2>/dev/null || echo "unknown")
CURRENT_VERSION=$(node --version)

if [ "$CURRENT_VERSION" = "$EXPECTED_VERSION" ]; then
    echo "✅ Using correct Node.js version ($CURRENT_VERSION)"
else
    echo "⚠️  Version mismatch: expected $EXPECTED_VERSION, got $CURRENT_VERSION"
fi

echo ""
echo "🚀 Environment setup complete!"
