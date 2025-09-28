# Test Directory

This directory contains unit tests for the Obsidian Indexable Folders plugin.

> **For complete testing documentation, see [CONTRIBUTING.md](../CONTRIBUTING.md#testing)**

## Quick Start

```bash
# Run tests
pnpm test:run

# Run with coverage
pnpm test:coverage

# Interactive UI
pnpm test:ui
```

## Test Strategy

### Pure Function Testing

Helper functions are designed as pure functions (no side effects) and can be tested without mocking Obsidian APIs:

```typescript
// Example: Testing regex generation
const settings = { separator: '. ', specialPrefixes: 'TODO, DRAFT' };
const regex = generatePrefixRegex(settings);
expect(regex.test('01. My Folder')).toBe(true);
```

### Testing Approach

Tests focus on:

- Edge cases and boundary conditions
- Input validation and security checks
- Error handling and recovery scenarios
- Integration workflows where feasible

## Testing Philosophy

The plugin uses a **testable architecture** approach where helper functions are extracted as pure functions:

- No Obsidian API dependencies in testable components
- Predictable inputs and outputs
- Clear separation of concerns
- Unit tests added where practical and beneficial

See [CONTRIBUTING.md](../CONTRIBUTING.md#helper-functions-architecture) for architectural details.
