#!/usr/bin/env bash

# Wrapper script to run commands with the correct Node.js environment
# Usage: ./run-with-node.sh <command> [args...]
#
# This script sources the setup-node.sh to ensure nvm/pnpm are available,
# then executes the provided command in the same shell context.

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the setup script to get nvm and correct Node.js version
# Redirect output to stderr so it doesn't interfere with command output
source "$SCRIPT_DIR/setup-node.sh" >&2

# Execute the command passed as arguments
exec "$@"
