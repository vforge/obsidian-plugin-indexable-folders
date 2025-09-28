# Helper Functions for Testing

This directory contains pure helper functions extracted from the main plugin logic to enable comprehensive unit testing without Obsidian dependencies.

## Overview

The helpers are organized into domain-specific modules:

### 🔤 regexHelpers.ts

**Regex pattern generation and matching**

- `generatePrefixRegex()` - Creates regex for folder prefixes (numeric + special)
- `generateNumericPrefixRegex()` - Creates regex for numeric prefixes only
- `extractPrefix()` - Extracts prefix from folder name
- `hasPrefix()` - Checks if folder has a prefix
- `escapeRegexChars()` - Escapes special regex characters

### 📊 indexingHelpers.ts

**Folder indexing algorithms and operations**

- `isSpecialIndex()` - Identifies special indices (all 0s or 9s)
- `parseFolderIndex()` - Parses folder name for index info
- `generateFolderName()` - Creates new folder name with updated index
- `detectIndexConflict()` - Finds index conflicts in folder lists
- `calculateSwapOperations()` - Plans smart swap operations
- `generateReindexPlan()` - Creates comprehensive reindexing strategy

### ✅ validationHelpers.ts

**Input validation and security checks**

- `validateIndexMove()` - Validates folder move operations
- `validateFolderName()` - Checks folder name format and constraints
- `validatePathSecurity()` - Detects path traversal and security risks
- `validateIndexFormat()` - Validates index string format
- `combineValidationResults()` - Combines multiple validation results

### 🎨 domHelpers.ts

**DOM manipulation patterns and analysis**

- `parsePrefixFromText()` - Extracts prefix info from text content
- `analyzeElements()` - Analyzes DOM elements for prefix information
- `groupElementsForProcessing()` - Groups elements by processing needs
- `calculateDOMUpdates()` - Plans batched DOM operations
- `executeBatchUpdates()` - Executes DOM updates efficiently
- `revertElementPrefix()` - Reverts prefix modifications

## Benefits for Testing

### ✅ **Pure Functions**

- No Obsidian API dependencies
- Predictable inputs and outputs
- Easy to mock and test

### ✅ **Isolated Logic**

- Complex algorithms separated from UI code
- Business logic testable independently
- Clear separation of concerns

### ✅ **Comprehensive Coverage**

- All core algorithms now testable
- Edge cases easily verifiable
- Regression testing possible

### ✅ **Type Safety**

- Well-defined interfaces for all data structures
- Clear contracts between functions
- Better IDE support and refactoring

## Testing Strategy

Each helper module can be tested independently:

```typescript
// Example test structure
import { isSpecialIndex, parseFolderIndex } from './indexingHelpers';

describe('indexingHelpers', () => {
    describe('isSpecialIndex', () => {
        test('identifies single digits as normal', () => {
            expect(isSpecialIndex('1')).toBe(false);
            expect(isSpecialIndex('9')).toBe(false);
        });

        test('identifies all zeros as special', () => {
            expect(isSpecialIndex('00')).toBe(true);
            expect(isSpecialIndex('000')).toBe(true);
        });

        test('identifies all nines as special', () => {
            expect(isSpecialIndex('99')).toBe(true);
            expect(isSpecialIndex('999')).toBe(true);
        });
    });
});
```

## Integration

The helpers are already integrated into the main plugin:

```typescript
// main.ts - Using regex helpers
import { generatePrefixRegex, type RegexSettings } from './helpers';

getPrefixRegex(): RegExp {
    if (this.shouldInvalidateCache() || !this._prefixRegexCache) {
        const regexSettings: RegexSettings = {
            separator: this.settings.separator,
            specialPrefixes: this.settings.specialPrefixes
        };
        this._prefixRegexCache = generatePrefixRegex(regexSettings);
    }
    return this._prefixRegexCache;
}
```

## Next Steps for ISSUE-002

1. **Set up testing framework** (Jest or Vitest)
2. **Write comprehensive unit tests** for all helper functions
3. **Add integration tests** that combine multiple helpers
4. **Set up CI/CD** to run tests automatically
5. **Add test coverage reporting** to track progress

The helper extraction makes implementing ISSUE-002 (test coverage) much more achievable by providing testable, pure functions that contain all the critical plugin logic.
