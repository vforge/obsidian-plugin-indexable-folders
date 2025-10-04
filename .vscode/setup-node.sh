#!/usr/bin/env bash

# Refactored Node.js Environment Setup Script for VS Code
# - Loads nvm from common locations (user install and Homebrew)
# - Uses .nvmrc to select Node.js version when available
# - Checks for pnpm and falls back to nvm use when pnpm isn't available
# - Provides clear, idempotent output and cleans up listeners

set -u

info() { printf "\n🔧 %s\n" "$1"; }
ok() { printf "✅ %s\n" "$1"; }
warn() { printf "⚠️  %s\n" "$1"; }

info "Setting up Node.js environment..."

# Track whether nvm was successfully loaded
NVM_LOADED=false

try_load_nvm() {
    # Prefer user-installed nvm
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        info "Loading nvm from $NVM_DIR"
        # shellcheck disable=SC1090
        . "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
        NVM_LOADED=true
        return 0
    fi

    # Try Homebrew location (Apple Silicon and others)
    if [ -s "/opt/homebrew/opt/nvm/nvm.sh" ]; then
        info "Loading nvm from Homebrew"
        export NVM_DIR="/opt/homebrew/opt/nvm"
        # shellcheck disable=SC1090
        . "/opt/homebrew/opt/nvm/nvm.sh"
        [ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && . "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
        NVM_LOADED=true
        return 0
    fi

    return 1
}

use_nvm_from_nvmrc() {
    if command -v nvm >/dev/null 2>&1; then
        if [ -f .nvmrc ]; then
            info "Using Node.js version from .nvmrc"
            if ! nvm use; then
                warn "nvm use failed"
                return 1
            fi
            return 0
        else
            warn "No .nvmrc file found"
            return 1
        fi
    fi
    return 1
}

check_pnpm_or_use_nvm() {
    info "Checking for pnpm..."
    if command -v pnpm >/dev/null 2>&1; then
        ok "pnpm is available: $(pnpm --version 2>/dev/null || echo 'unknown')"
        return 0
    fi

    warn "pnpm not found. Attempting to ensure Node.js via nvm so pnpm can be installed if desired..."

    if [ "$NVM_LOADED" = false ]; then
        # try to load nvm now if not loaded earlier
        try_load_nvm || true
    fi

    if command -v nvm >/dev/null 2>&1; then
        use_nvm_from_nvmrc || warn "Could not switch Node.js version via nvm"
    else
        warn "nvm is not available; pnpm is not installed or on PATH"
    fi
}

# Start: attempt to load nvm (best-effort)
try_load_nvm || warn "nvm not found in common locations"

# If nvm was loaded successfully, try to use .nvmrc
if [ "$NVM_LOADED" = true ]; then
    if command -v nvm >/dev/null 2>&1; then
        ok "nvm is available"
        use_nvm_from_nvmrc || warn "Failed to use Node.js version from .nvmrc"
    else
        warn "nvm is not available after sourcing"
    fi
else
    warn "nvm not loaded. Will check for Node.js on PATH"
fi

# Check pnpm and attempt nvm fallback if pnpm is missing
check_pnpm_or_use_nvm

info "Environment Summary"
NODE_VERSION="$(node --version 2>/dev/null || echo 'not found')"
NPM_VERSION="$(npm --version 2>/dev/null || echo 'not found')"
PNPM_VERSION="$(pnpm --version 2>/dev/null || echo 'not found')"
NODE_PATH="$(which node 2>/dev/null || echo 'not found')"

echo "Node.js version: $NODE_VERSION"
echo "npm version:     $NPM_VERSION"
echo "pnpm version:    $PNPM_VERSION"
echo "Node.js path:    $NODE_PATH"

EXPECTED_VERSION=$(cat .nvmrc 2>/dev/null || echo "unknown")
CURRENT_VERSION=$(node --version 2>/dev/null || echo "not found")

if [ "$CURRENT_VERSION" = "$EXPECTED_VERSION" ] && [ "$EXPECTED_VERSION" != "unknown" ]; then
    ok "Using correct Node.js version ($CURRENT_VERSION)"
elif [ "$EXPECTED_VERSION" = "unknown" ]; then
    warn "No expected version (.nvmrc not found)"
else
    warn "Version mismatch: expected $EXPECTED_VERSION, got $CURRENT_VERSION"
fi

info "Environment setup complete"

