# Testing & Quality Assurance

This document describes how to run tests, linting, and validation checks for the Obsidian Indexable Folders plugin.

## Quick Reference

```bash
# Run all checks (typecheck + lint + tests)
pnpm run test:all

# Run all checks with coverage report
pnpm run verify

# Individual commands
pnpm run typecheck    # TypeScript type checking
pnpm run lint         # Format and fix code
pnpm run lint:check   # Check formatting without fixing
pnpm test             # Run tests in watch mode
pnpm run test:run     # Run tests once
pnpm run test:coverage # Run tests with coverage
```

## Available Scripts

### Quality Assurance Scripts

- **`pnpm run test:all`** - Complete verification pipeline:
  - ✅ TypeScript type checking (`tsc -noEmit`)
  - ✅ Code formatting check (Prettier)
  - ✅ Linting check (ESLint)
  - ✅ All unit tests (Vitest)
  
- **`pnpm run verify`** - Same as `test:all` but includes coverage report

### Build Scripts

- **`pnpm run build`** - Production build with type checking
- **`pnpm dev`** - Development build with watch mode

### Testing Scripts

- **`pnpm test`** - Run tests in watch mode (interactive)
- **`pnpm run test:run`** - Run all tests once and exit
- **`pnpm run test:ui`** - Open Vitest UI for interactive testing
- **`pnpm run test:coverage`** - Run tests with coverage report
- **`pnpm run test:ui:coverage`** - Vitest UI with live coverage

### Linting & Formatting

- **`pnpm run lint`** - Format code with Prettier and fix ESLint issues
- **`pnpm run lint:check`** - Check code style without making changes
- **`pnpm run typecheck`** - Run TypeScript compiler in check mode

## Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) to run quality checks before commits:

- **Pre-commit**: Runs `lint-staged` which:
  - Formats staged files with Prettier
  - Fixes ESLint issues in staged files
  - Only processes files in `src/` and `tests/` directories

Files checked: `{src,tests}/**/*.ts`

## Continuous Integration

For CI/CD pipelines (GitHub Actions, GitLab CI, etc.), use:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: pnpm install

- name: Run all checks
  run: pnpm run verify
```

This ensures:
1. TypeScript compiles without errors
2. Code follows style guidelines
3. All tests pass
4. Code coverage meets standards

## Best Practices

### Before Committing

```bash
# Check everything passes
pnpm run test:all

# Or with coverage
pnpm run verify
```

### During Development

```bash
# Start dev build in one terminal
pnpm dev

# Run tests in watch mode in another terminal
pnpm test
```

### Before Creating a PR

```bash
# Run complete verification with coverage
pnpm run verify

# Ensure all files are formatted
pnpm run lint
```

## Test Coverage

Coverage reports are generated in the `coverage/` directory:

- **HTML Report**: `coverage/index.html` (open in browser)
- **JSON Report**: `coverage/coverage-final.json`
- **Text Summary**: Displayed in terminal

### Coverage Targets

The project includes:
- All source files in `src/**/*.ts`
- Excludes: `node_modules/`, `tests/`, config files, `dist/`, `.js/.mjs` files

## Troubleshooting

### Tests Fail Locally

```bash
# Clear caches and reinstall
rm -rf node_modules coverage .vitest
pnpm install
pnpm run test:run
```

### Type Errors

```bash
# Run type check to see all errors
pnpm run typecheck
```

### Linting Issues

```bash
# Auto-fix most issues
pnpm run lint

# See what would be fixed without changing files
pnpm run lint:check
```

### Pre-commit Hook Not Running

```bash
# Reinstall Husky hooks
pnpm run prepare
```

## VS Code Integration

Available tasks in `.vscode/tasks.json`:

- **Build Project** (Ctrl+Shift+B / Cmd+Shift+B)
- **Run Tests**
- **Run Tests with Coverage**
- **Lint Code**

Access via: `Terminal > Run Task...`

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
