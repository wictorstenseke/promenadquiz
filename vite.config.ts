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
  },
});
