# Contributing to Obsidian Indexable Folders Plugin

Thank you for your interest in contributing to this project! This document provides information for developers who want to work on the plugin.

> [!NOTE]
> This is a personal project developed with AI assistance for learning purposes. While contributions are welcome, please understand that the codebase may contain areas for improvement and there's no warranty on functionality.

## Development Setup

To work on this plugin locally:

1. Clone this repository.
2. Make sure your NodeJS is at least v22.19.0 (`node --version`).
3. Run `pnpm install` to install dependencies.
4. Run `pnpm dev` to start compilation in watch mode.

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

This project uses Prettier for code formatting and ESLint for linting. To format and lint the code, use the command:

```bash
pnpm lint
```

This command will automatically format and lint both source code (`src/`) and test files (`tests/`) with Prettier formatting followed by ESLint checks and automatic fixes.

## Testing

This project uses **Vitest** for comprehensive unit testing with coverage reporting.

### Running Tests

```bash
# Run tests in watch mode (interactive)
pnpm test

# Run tests once and exit
pnpm test:run

# Open interactive testing UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

### Test Structure

Tests are organized as follows:

```
tests/
├── README.md                 # Testing documentation
├── hello-world.test.ts       # Infrastructure verification
└── helpers/                  # Helper function tests (future)
    ├── regexHelpers.test.ts
    ├── indexingHelpers.test.ts
    ├── validationHelpers.test.ts
    └── domHelpers.test.ts
```

### Writing Tests

- Test files should end with `.test.ts` or `.spec.ts`
- Place tests in the `tests/` directory or alongside source files
- Use descriptive test names that explain the behavior being tested
- Follow the Arrange-Act-Assert pattern

Example test structure:

```typescript
import { describe, test, expect } from "vitest";
import { functionToTest } from "../src/helpers/yourModule";

describe("YourModule", () => {
    describe("functionToTest", () => {
        test("should handle normal case correctly", () => {
            // Arrange
            const input = "test input";

            // Act
            const result = functionToTest(input);

            // Assert
            expect(result).toBe("expected output");
        });

        test("should handle edge case", () => {
            // Test edge cases and error conditions
            expect(() => functionToTest("")).toThrow();
        });
    });
});
```

### Coverage Goals

- **Target**: Comprehensive coverage for core functionality
- **Focus areas**: Helper functions in `src/helpers/`
- **Architecture**: Pure function testing approach
- **Exclusions**: `main.ts`, build files, and type definitions

### Test Environment

- **Framework**: Vitest with jsdom environment
- **Features**: Watch mode, UI interface, coverage reporting
- **DOM testing**: Available via jsdom for UI component tests
- **TypeScript**: Full TypeScript support with proper type checking

### Helper Functions Architecture

The plugin uses a **testable architecture** with pure helper functions extracted from the main plugin logic:

- **`src/helpers/regexHelpers.ts`** - Pattern generation and matching logic
- **`src/helpers/indexingHelpers.ts`** - Folder indexing algorithms and operations
- **`src/helpers/validationHelpers.ts`** - Input validation and security checks
- **`src/helpers/domHelpers.ts`** - DOM manipulation patterns and analysis

These helpers are **pure functions** with:

- No Obsidian API dependencies
- Predictable inputs and outputs
- Clear separation of concerns
- Full TypeScript interfaces

This architecture enables comprehensive unit testing without requiring an Obsidian environment.

### Continuous Integration

Future plans include adding automated testing to the CI/CD pipeline:

- Run tests on pull requests
- Enforce coverage thresholds
- Prevent merging without passing tests
- Generate coverage reports for review

Currently, the release workflow focuses on building and publishing, but test integration is planned for enhanced code quality assurance.

## Releasing New Releases

- Update your `manifest.json` with your new version number, such as `0.0.2`, and the minimum Obsidian version required for your latest release.
- Update your `versions.json` file with `"new-plugin-version": "minimum-obsidian-version"` so older versions of Obsidian can download an older version of your plugin that's compatible.
- Create a new GitHub release using your new version number as the "Tag version". Use the exact version number, don't include a prefix `v`.
- Upload the files `main.js`, `manifest.json`, and `styles.css` as binary attachments.
- Publish the release.

> You can simplify the version bump process by running `pnpm version patch`, `pnpm version minor` or `pnpm version major` after updating `minAppVersion` manually in `manifest.json`. The command will bump the version in `manifest.json` and `package.json`, and add the entry for the new version to `versions.json`.

## Adding your plugin to the community plugin list

- Check the [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
- Publish an initial version.
- Make sure you have a `README.md` file in the root of your repo.
- Make a pull request at <https://github.com/obsidianmd/obsidian-releases> to add your plugin.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-plugin-indexable-folders/`.
