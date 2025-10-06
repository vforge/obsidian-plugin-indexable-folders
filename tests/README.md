# Tests

This directory contains unit tests for the Obsidian Plugin Indexable Folders.

## Testing Framework

We use [Vitest](https://vitest.dev/) as our testing framework. Vitest is a blazing-fast unit test framework powered by Vite.

## Global Mock Configuration

The test suite uses Vitest's global configuration for automatic mock reset between tests:

```typescript
// vitest.config.ts
test: {
    clearMocks: true,      // Clear mock history between tests
    mockReset: true,       // Reset mocks between tests
    restoreMocks: true,    // Restore original implementations
}
```

### What this means for test authors

1. **No manual mock reset needed**: You don't need to call `vi.clearAllMocks()` in `afterEach()` anymore
2. **Fresh mocks every test**: Each test starts with a clean slate of mocks
3. **Mock setup in beforeEach()**: If you need consistent mock behavior, set it up in `beforeEach()` which runs before each test

### Example

```typescript
// ❌ Old pattern (no longer needed)
afterEach(() => {
    vi.clearAllMocks();
});

// ✅ New pattern (handled automatically by global config)
beforeEach(() => {
    // Set up any test-specific mock behavior here
    vi.mocked(MyMock).mockImplementation(() => ({ ... }));
});
```

## Import Path Conventions

Since tests are in subdirectories, use the appropriate relative paths:

- **Root level tests** (`tests/main.test.ts`): `import from '../src/...'`
- **Subdirectory tests** (`tests/ui/SettingsTab.test.ts`): `import from '../../src/...'`
- **Shared mocks** (from subdirectories): `import from '../__mocks__/...'`

## Running Tests

### Run all tests once

```bash
pnpm test:run
```

### Run tests in watch mode

```bash
pnpm test
```

### Run tests with UI

```bash
pnpm test:ui
```

### Run tests with coverage

```bash
pnpm test:coverage
```

## Writing Tests

Test files should be placed in the `tests/` directory and follow the naming convention `*.test.ts`.

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something specific", () => {
    // Arrange
    const input = "test";

    // Act
    const result = processInput(input);

    // Assert
    expect(result).toBe("expected output");
  });
});
```

## Configuration

The test configuration is located in `vitest.config.ts` at the root of the project.

## Coverage

Coverage reports are generated in the `coverage/` directory when running tests with the `--coverage` flag.
