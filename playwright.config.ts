import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Test-account credentials (E2E_EMAIL, E2E_PASSWORD) live next to the Supabase secrets in the gitignored .dev.vars.
if (existsSync(".dev.vars")) process.loadEnvFile(".dev.vars");

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4321",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
