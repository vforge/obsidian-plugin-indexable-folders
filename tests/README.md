# Test Organization

This directory contains all tests for the Obsidian Indexable Folders Plugin, organized into logical categories.

## Directory Structure

```
tests/
├── __mocks__/           # Mock implementations
│   └── obsidian.ts      # Complete Obsidian API mocks
├── unit/                # Unit tests for isolated functionality
│   └── folderActions.test.ts  # Core folder indexing logic tests
└── integration/         # Integration tests with Obsidian APIs
    ├── obsidian-dom.test.ts    # DOM manipulation & UI integration
    ├── folder-actions.test.ts  # Context menu & folder actions
    └── file-system.test.ts     # File system operations & lifecycle
```

## Test Categories

### Unit Tests (`unit/`)

- **Purpose**: Test individual functions and utilities in isolation
- **Dependencies**: Minimal, no external mocks required
- **Examples**: String parsing, index calculations, validation logic
- **File**: `folderActions.test.ts` (43 tests)

### Integration Tests (`integration/`)

- **Purpose**: Test how components work together with Obsidian APIs
- **Dependencies**: Require Obsidian API mocks, DOM simulation
- **Examples**: File operations, UI updates, plugin lifecycle
- **Files**:
  - `obsidian-dom.test.ts` (16 tests) - DOM & UI integration
  - `folder-actions.test.ts` (17 tests) - Context menu functionality
  - `file-system.test.ts` (19 tests) - File system operations

### Mocks (`__mocks__/`)

- **Purpose**: Provide realistic implementations of Obsidian APIs for testing
- **Includes**: `TFile`, `TFolder`, `Vault`, `Workspace`, `App`, `Plugin` classes
- **Usage**: Automatically imported by tests that need Obsidian API simulation

## Running Tests

```bash
# Run all tests
pnpm test:run

# Run specific category
pnpm test run tests/unit/
pnpm test run tests/integration/

# Run specific test file
pnpm test run tests/integration/obsidian-dom.test.ts

# Watch mode
pnpm test

# UI mode
pnpm test:ui
```

## Test Coverage

- **Total Tests**: 95
- **Test Files**: 4
- **Coverage Areas**:
  - Core folder indexing logic
  - DOM manipulation and styling
  - Obsidian API integration
  - File system operations
  - Context menu functionality
  - Settings management
  - Error handling and edge cases
  - Performance testing

## Writing New Tests

### Unit Tests

- Place in `tests/unit/`
- Test individual functions without external dependencies
- Focus on logic, calculations, and transformations
- No need for Obsidian mocks

### Integration Tests

- Place in `tests/integration/`
- Test interactions between components and Obsidian APIs
- Use mocks from `tests/__mocks__/obsidian.ts`
- Set up DOM environment when needed

### Test Naming Convention

- `*.test.ts` for all test files
- Descriptive names indicating what's being tested
- Group related tests in the same file
- Use clear describe/it blocks with descriptive names

## Mock Usage

Import mocks when testing Obsidian integration:

```typescript
import { App, TFolder, TFile } from '../__mocks__/obsidian';
```

The mocks provide realistic behavior for:

- File and folder operations
- Vault management
- Workspace interactions
- Plugin lifecycle events
- DOM element creation and manipulation
