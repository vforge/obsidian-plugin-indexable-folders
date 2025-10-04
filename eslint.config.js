import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default [
    { ignores: ['main.js', 'coverage/**', 'node_modules/**', '*.d.ts', '*.mjs'] },
    eslint.configs.recommended,
    ...obsidianmd.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    prettier,
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                sourceType: 'module',
                ecmaVersion: 'latest'
            },
            globals: {
                console: 'readonly',
                global: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                exports: 'writable',
                module: 'writable',
                require: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-prototype-builtins': 'off',
            '@typescript-eslint/no-empty-function': 'off'
        }
    }
];
