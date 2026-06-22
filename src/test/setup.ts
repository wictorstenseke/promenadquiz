// Vitest global setup. Loaded before every test file (see vite.config.ts).
// Adds jest-dom matchers (toBeInTheDocument, etc.) and clears the DOM/localStorage
// between tests so component and integration suites stay isolated and deterministic.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
