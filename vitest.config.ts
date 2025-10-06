import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],
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
