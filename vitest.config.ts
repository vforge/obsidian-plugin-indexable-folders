/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: [],
        include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}"],
        exclude: ["node_modules", "dist", "main.js"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/**/*.{js,ts}"],
            exclude: ["src/main.ts"],
        },
    },
});
