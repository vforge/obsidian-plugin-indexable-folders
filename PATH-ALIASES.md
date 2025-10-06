# Path Aliases Configuration

This project uses path aliases to simplify imports and make the codebase more maintainable.

## Configuration

Path aliases are configured in three files:

### 1. `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src/*": ["src/*"],
      "tests/*": ["tests/*"]
    }
  }
}
```

This enables TypeScript to resolve `src/` and `tests/` imports.

### 2. `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
	resolve: {
		alias: {
			"src": path.resolve(__dirname, "./src"),
			"tests": path.resolve(__dirname, "./tests"),
			obsidian: path.resolve(__dirname, "./tests/__mocks__/obsidian.ts"),
		},
	},
	// ... rest of config
});
```

This allows Vitest to resolve path aliases during testing.

### 3. `esbuild.config.mjs`

```javascript
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin to resolve path aliases
const pathAliasPlugin = {
	name: "path-alias",
	setup(build) {
		build.onResolve({ filter: /^src\// }, (args) => {
			const relativePath = args.path.replace(/^src\//, '');
			const fullPath = path.resolve(__dirname, 'src', relativePath);

			// Try with .ts extension if the path doesn't have an extension
			const tryExtensions = ['.ts', '.tsx', '.js', '.jsx'];

			for (const ext of tryExtensions) {
				const pathWithExt = fullPath + ext;
				if (fs.existsSync(pathWithExt)) {
					return {
						path: pathWithExt,
					};
				}
			}

			// If no file found, return the original path and let esbuild handle the error
			return {
				path: fullPath,
			};
		});
	},
};

const context = await esbuild.context({
	// ... other config
	plugins: [pathAliasPlugin],
});
```

This custom esbuild plugin resolves `src/` imports and adds the appropriate file extensions.

## Usage

### In Source Files (`src/`)

```typescript
// ❌ Old way (relative paths)
import IndexableFoldersPlugin from '../main';
import { log } from '../utils/logger';
import { UpdateIndexModal } from '../ui/UpdateIndexModal';

// ✅ New way (path aliases)
import IndexableFoldersPlugin from 'src/main';
import { log } from 'src/utils/logger';
import { UpdateIndexModal } from 'src/ui/UpdateIndexModal';
```

### In Test Files (`tests/`)

```typescript
// ❌ Old way (relative paths)
import IndexableFoldersPlugin from '../src/main';
import { DEFAULT_SETTINGS } from '../../src/settings';

// Mock with relative paths
vi.mock('../src/utils/logger', async () => {
    const mock = await import('./__mocks__/logger');
    return mock;
});

// ✅ New way (path aliases)
import IndexableFoldersPlugin from 'src/main';
import { DEFAULT_SETTINGS } from 'src/settings';

// Mock with path aliases
vi.mock('src/utils/logger', async () => {
    const mock = await import('tests/__mocks__/logger');
    return mock;
});
```

### Benefits

1. **No more relative path confusion**: No need to count `../` to find the right file
2. **Easier refactoring**: Move files around without updating all relative imports
3. **Consistent imports**: All imports look the same regardless of file location
4. **Better IDE support**: Most IDEs provide better autocomplete with path aliases
5. **Cleaner code**: Imports are more readable and maintainable

## File Organization

With path aliases, the import path directly maps to the file structure:

```
src/
├── main.ts                    → import from 'src/main'
├── settings.ts                → import from 'src/settings'
├── events.ts                  → import from 'src/events'
├── logic/
│   ├── fileExplorer.ts       → import from 'src/logic/fileExplorer'
│   ├── folderActions.ts      → import from 'src/logic/folderActions'
│   └── statusBar.ts          → import from 'src/logic/statusBar'
├── ui/
│   ├── SettingsTab.ts        → import from 'src/ui/SettingsTab'
│   └── UpdateIndexModal.ts   → import from 'src/ui/UpdateIndexModal'
└── utils/
    ├── cssValidation.ts      → import from 'src/utils/cssValidation'
    └── logger.ts             → import from 'src/utils/logger'

tests/
└── __mocks__/
    ├── logger.ts             → import from 'tests/__mocks__/logger'
    └── obsidian.ts           → import from 'tests/__mocks__/obsidian'
```

## Migration Guide

If you need to update old code to use path aliases:

1. **Replace relative imports in `src/` files**:
   ```bash
   # From src/ root files
   sed -i '' "s|from './|from 'src/|g" src/*.ts

   # From src/ subdirectory files
   sed -i '' "s|from '../|from 'src/|g" src/**/*.ts
   sed -i '' "s|from './|from 'src/CURRENT_DIR/|g" src/**/*.ts
   ```

2. **Replace relative imports in `tests/` files**:
   ```bash
   # From tests/ root files
   sed -i '' "s|from '../src/|from 'src/|g" tests/*.test.ts

   # From tests/ subdirectory files
   sed -i '' "s|from '../../src/|from 'src/|g" tests/**/*.test.ts
   sed -i '' "s|from '../__mocks__/|from 'tests/__mocks__/|g" tests/**/*.test.ts
   ```

## Troubleshooting

### Build Errors

If you see "Could not read from file" errors during build:

1. Verify the esbuild plugin is correctly configured
2. Check that file extensions (.ts, .tsx) are being tried
3. Ensure the `__dirname` is correctly set in esbuild.config.mjs

### Test Failures

If tests can't resolve imports:

1. Verify vitest.config.ts has the correct alias configuration
2. Check that paths are absolute using `path.resolve(__dirname, ...)`
3. Ensure the `alias` is at the root level of the config, not inside `test`

### TypeScript Errors

If TypeScript shows import errors:

1. Verify tsconfig.json has `baseUrl` and `paths` configured
2. Restart your TypeScript server in VS Code
3. Check that the paths in tsconfig match your actual directory structure
