import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test as setup } from "@playwright/test";

// Same path as `storageState` in playwright.config.ts; gitignored, it holds the test account's session.
const authFile = "playwright/.auth/user.json";

setup("sign the test account in once and keep its session", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    // Without a test account the authenticated specs skip themselves, but they still load a state file.
    mkdirSync(dirname(authFile), { recursive: true });
    writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  await page.goto("/auth/signin");
  // Astro removes `ssr` from an island once React has hydrated it; typing earlier is reset by the controlled inputs.
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));
  await page.context().storageState({ path: authFile });
});
