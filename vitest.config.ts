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
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],
		// Automatically clear all mocks between tests
		clearMocks: true,
		mockReset: true,
		restoreMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
            include: ["src/**/*.ts"],
			exclude: [
				"node_modules/",
				"tests/",
				"*.config.*",
				"scripts/",
                "dist/",
                "**/*.js",
                "**/*.mjs",
			],
		},
	},
});
