# Tests

This directory contains unit tests for the Obsidian Plugin Indexable Folders.

## Testing Framework

We use [Vitest](https://vitest.dev/) as our testing framework. Vitest is a blazing-fast unit test framework powered by Vite.

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
