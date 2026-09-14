import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Plain Vitest config on purpose: Astro's getViteConfig() would load the Cloudflare
// adapter into the test run, and the tag-validation engine is framework-free.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
