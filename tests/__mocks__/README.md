# Shared Test Mocks

This directory contains shared mock implementations used across test files.

## Available Mocks

### `obsidian.ts`

Core Obsidian API mocks including:

- `Plugin` - Base plugin class
- `TFolder`, `TFile` - File system abstractions
- `PluginSettingTab`, `Setting` - Settings UI components
- `Notice`, `Modal` - UI components
- HTMLElement extensions (`setText`, `addClass`, `removeClass`, `toggleClass`)

**Usage:**

```typescript
import { Plugin, TFolder } from 'obsidian';
```

The mock is automatically applied via the `resolve.alias` configuration in `vitest.config.ts`.

### `logger.ts`

Mock for the logger utility module.

**Usage:**

```typescript
vi.mock('../src/utils/logger', async () => {
    const mock = await import('./__mocks__/logger');
    return mock;
});
```

This provides a mocked `log` function that can be spied on in tests.

## Adding New Shared Mocks

1. Create a new file in this directory (e.g., `myModule.ts`)
2. Export mocked functions/classes using `vi.fn()` or `vi.mock()`
3. Import and use in test files with `vi.mock()` and dynamic import
4. Update this README to document the new mock

