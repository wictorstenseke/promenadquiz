/// <reference types="vitest" />
import { defineConfig } from "vite";

// Emulator-backed integration + Firestore rules tests. Run via
// `npm run test:integration`, which boots the Firestore emulator first
// (see package.json). Kept separate from the default `npm test` so the unit
// suite stays fast and fully offline.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.emulator.test.ts"],
    // The emulator boot + per-test Firestore clears need a longer budget.
    testTimeout: 15000,
    hookTimeout: 30000,
    // One project against one emulator: run files serially to avoid cross-test
    // data races on the shared Firestore instance.
    fileParallelism: false,
  },
});
