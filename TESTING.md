# Testing

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Available Commands

- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once and exit  
- `pnpm test:ui` - Open interactive test UI in browser

## Test Structure

Tests are located next to their corresponding source files and follow the naming convention `*.test.ts`.

### Current Test Files

- `src/logic/folderActions.test.ts` - Tests for folder indexing utility functions

## Writing Tests

Tests use Vitest's familiar Jest-like API:

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should work correctly', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Configuration

Testing configuration is in `vitest.config.ts`:
- Uses `jsdom` environment for DOM-like APIs
- Includes global test functions (describe, it, expect)
- Alias `@` points to `./src` directory
