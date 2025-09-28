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

## Current Test Files

- `hello-world.test.ts` - Infrastructure verification tests

## Test Organization (Planned for ISSUE-002)

```
tests/
├── hello-world.test.ts           # ✅ Infrastructure verification
└── helpers/                      # 🚧 Helper function tests
    ├── regexHelpers.test.ts      # Pattern generation and matching
    ├── indexingHelpers.test.ts   # Folder indexing algorithms
    ├── validationHelpers.test.ts # Input validation and security
    └── domHelpers.test.ts        # DOM manipulation patterns
```

## Coverage Status

**Current baseline**: 0% coverage for helper functions  
**Target**: >70% coverage for 1.0.0 release  
**Strategy**: Focus on testing pure functions in `src/helpers/`

## Testing Philosophy

The plugin uses **testable architecture** with helper functions extracted as pure functions:

- No Obsidian API dependencies
- Predictable inputs and outputs
- Clear separation of concerns
- Comprehensive test coverage possible

See [CONTRIBUTING.md](../CONTRIBUTING.md#helper-functions-architecture) for architectural details.
