# Test Directory

This directory contains comprehensive unit tests for the Obsidian Indexable Folders plugin.

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

## Test Files

### Helper Function Tests (✅ Complete)

- `regexHelpers.test.ts` - Pattern generation and matching logic
- `indexingHelpers.test.ts` - Folder indexing algorithms and operations  
- `validationHelpers.test.ts` - Input validation and security checks
- `domHelpers.test.ts` - DOM manipulation patterns and analysis

## Test Coverage

The test suite provides comprehensive coverage for:

- **Regex Pattern Generation**: Numeric and special prefix matching
- **Folder Indexing Logic**: Parsing, formatting, conflict detection, swapping
- **Validation Systems**: Security checks, format validation, move restrictions
- **DOM Manipulation**: Element analysis, batch updates, statistics
- **Integration Scenarios**: Complete workflows and edge cases

## Test Strategy

### Pure Function Testing

All helper functions are pure (no side effects) and can be tested without mocking Obsidian APIs:

```typescript
// Example: Testing regex generation
const settings = { separator: '. ', specialPrefixes: 'TODO, DRAFT' };
const regex = generatePrefixRegex(settings);
expect(regex.test('01. My Folder')).toBe(true);
```

### Edge Case Coverage

Tests include comprehensive edge case coverage:

- Empty inputs and null values
- Malformed data and invalid patterns
- Security vulnerabilities (path traversal, injection)
- Boundary conditions and limits
- Error handling and recovery scenarios

## Coverage Status

**Current Status**: ✅ Comprehensive coverage for all helper functions  
**Coverage Target**: >70% for ISSUE-002 release blocker  
**Strategy**: Pure function testing without Obsidian API dependencies

## Testing Philosophy

The plugin uses **testable architecture** with helper functions extracted as pure functions:

- No Obsidian API dependencies in helpers
- Predictable inputs and outputs  
- Clear separation of concerns
- Comprehensive test coverage achieved

See [CONTRIBUTING.md](../CONTRIBUTING.md#helper-functions-architecture) for architectural details.
