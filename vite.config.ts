/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served from https://wictorstenseke.github.io/promenadquiz/ on GitHub Pages.
  base: "/promenadquiz/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Emulator-backed specs run separately (vitest.integration.config.ts) so the
    // default suite needs no external services.
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.emulator.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Coverage of the testable surface: pure logic, storage, hooks, components,
      // pages. Excludes config/entry/types and emulator-only integration specs.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/firebase.ts",
        "src/types.ts",
        "src/components/Icons.tsx",
        "**/*.d.ts",
      ],
      // Realistic starting floor — ratchet up as page/integration coverage lands.
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 60,
      },
    },
  },
});
