# Contributing to Obsidian Indexable Folders Plugin

Thank you for your interest in contributing to this project! This document provides information for developers who want to work on the plugin.

> [!NOTE]
> This is a personal project developed with AI assistance for learning purposes. While contributions are welcome, please understand that the codebase may contain areas for improvement and there's no warranty on functionality.

## Development Setup

To work on this plugin locally:

1. Clone this repository.
2. Make sure your NodeJS is at least v22.19.0 (`node --version`).
   - **Using nvm (recommended)**: Run `nvm use` to automatically use the version specified in `.nvmrc`
   - **VS Code users**: The workspace is configured to use the correct Node.js version automatically
3. Run `pnpm install` to install dependencies.
4. Run `pnpm dev` to start compilation in watch mode.

### VS Code Setup

This project includes comprehensive VS Code configuration files in `.vscode/`:

- **`settings.json`**: Workspace settings with Node.js paths and formatting rules
- **`tasks.json`**: Build, test, and development tasks
- **`launch.json`**: Debug configurations for running tests
- **`extensions.json`**: Recommended extensions for development
- **`setup-node.sh`**: Script to ensure correct Node.js version
- **`run-with-node.sh`**: Wrapper script that sources the environment setup and runs commands (used by tasks)

Key features:

- **Automatic Node.js version**: Uses the version specified in `.nvmrc` (v22.19.0)
- **Build tasks**: Press `Cmd+Shift+P` → "Tasks: Run Task" → "Build Project"
- **Test tasks**: Press `Cmd+Shift+P` → "Tasks: Run Task" → "Run Tests"
- **Environment setup**: Run the "Setup Node.js Environment" task if needed

If you encounter Node.js version issues in VS Code:

1. Close VS Code completely
2. Run `nvm use` in the terminal
3. Reopen VS Code from that terminal: `code .`

### Development Workflow

**Recommended approach for new features:**

1. **Plan and implement functionality**
2. **Add tests where practical and beneficial**
    - Focus on testable components (pure functions)
    - Cover critical business logic and edge cases
3. **Refactor** while keeping existing tests passing
4. **Update documentation** as needed

**For bug fixes:**

1. **Write a test** that reproduces the bug (if feasible)
2. **Fix the bug** and ensure tests pass
3. **Verify** no other functionality is broken
4. **Run full test suite** before committing

**Standard workflow:**

1. **Make changes** to source code in `src/`
2. **Write/update tests** for new functionality (see Testing section)
3. **Run tests** to verify your changes: `pnpm test:run`
4. **Check code quality**: `pnpm lint`
5. **Build the plugin**: `pnpm build`
6. **Test manually** in Obsidian (see Manually installing section)

### Production Build

To create a production build of the plugin, run the following command:

```bash
pnpm build
```

## Code Quality

This project uses Prettier for code formatting and ESLint 9 (flat config) for linting. To format and lint the code, use the command:

```bash
pnpm lint
```

This command will automatically format the code with Prettier and then run ESLint to check for issues and apply fixes.

### ESLint Configuration

The project uses the new ESLint flat configuration format (`eslint.config.js`) introduced in ESLint 9. The configuration includes:

- TypeScript support with `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
- Prettier integration via `eslint-config-prettier`
- Custom rules for TypeScript development

## Releasing New Releases

- Update your `manifest.json` with your new version number, such as `0.0.2`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create a new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`.
- Upload the files `main.js`, `manifest.json`, and `styles.css` as binary attachments.
- Publish the release.

> You can simplify the version bump process by running `pnpm version patch`, `pnpm version minor` or `pnpm version major` after updating `minAppVersion` manually in `manifest.json`. The command will bump the version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`.

### Using the release helper script

This repository includes a small helper script to automate the most common release steps: `scripts/release.sh`.

- The script performs the following steps by default:
    1. Runs `pnpm lint`
    2. Runs `pnpm build` to produce `main.js`
    3. Runs `pnpm version <patch|minor|major>` to bump the package version and update `manifest.json` / `versions.json` (via `version-bump.mjs`)
    4. Pushes the commit and created tag to `origin`

- Important: This script no longer creates a GitHub Release; pushing the tag is sufficient because a GitHub Action in this repository will create the release automatically.

Usage examples:

```bash
# Dry run (no git actions, useful to verify build/lint)
./scripts/release.sh --dry-run

# Real release (patch by default)
./scripts/release.sh

# Bump minor version
./scripts/release.sh minor
```

Notes:

- Ensure your working tree is clean and tests/lint pass before running the script.
- If you need to change `minAppVersion`, edit `manifest.json` and commit that change before running the script so `version-bump.mjs` captures the correct `minAppVersion`.
- The script will call `pnpm version` which creates a commit and tag; pushing tags will trigger your repository's CI (GitHub Actions) to produce the final release assets.

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at <https://github.com/obsidianmd/obsidian-releases> to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-plugin-indexable-folders/`.
