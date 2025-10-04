#!/usr/bin/env bash
# Release helper for obsidian-plugin-indexable-folders
# Usage:
#   ./scripts/release.sh [patch|minor|major]
# Example:
#   ./scripts/release.sh patch

set -euo pipefail

# Defaults
TYPE="patch"
DRY_RUN=false

# Simple arg parsing: supports --dry-run|-n, type (patch|minor|major)
while [[ $# -gt 0 ]]; do
    case "$1" in
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        patch|minor|major)
            TYPE="$1"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [patch|minor|major] [--dry-run|-n]"
            exit 0
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 [patch|minor|major] [--dry-run|-n]"
            exit 1
            ;;
    esac
done

info() { printf "\n🔧 %s\n" "$1"; }
ok() { printf "✅ %s\n" "$1"; }
warn() { printf "⚠️  %s\n" "$1"; }
err() { printf "❌ %s\n" "$1"; }

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"


info "Running lint"
pnpm lint

info "Building production artifact"
pnpm build

# Bump version using pnpm which will run the version script
if [ "$DRY_RUN" = true ]; then
    warn "Dry run enabled — skipping version bump, push and release creation"
    echo "Would bump version: $TYPE"
    VERSION=$(node -p "require('./package.json').version")
else
    info "Bumping version: $TYPE"
    pnpm version "$TYPE"

    VERSION=$(node -p "require('./package.json').version")
    ok "Version bumped to $VERSION"
fi

if [ "$DRY_RUN" = true ]; then
    echo "Would push commits and tags to origin"
    echo "Note: GitHub Actions will create the release from the pushed tag."
else
    info "Pushing commits and tags"
    git push origin HEAD
    git push origin --tags
    ok "Pushed commits and tags. GitHub Actions will handle the release creation from the tag."
fi

ok "Release process finished for $VERSION"
