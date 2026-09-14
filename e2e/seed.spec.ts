import { expect, test } from "@playwright/test";
import type { SaveVerificationCommand } from "../src/types";

// risk: context/foundation/test-plan.md #5 — the label on "Moje weryfikacje" differs from the saved report's verdict
// seed: the exemplar for new specs (e2e/E2E-RULES.md) — role-based locators, its own setup and cleanup, unique data,
// waits for state, the session from storageState (e2e/auth.setup.ts), and an assertion that fails if the risk happens.

const hasAccount = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.describe("Risk #5: the list shows the report's verdict", () => {
  let savedId: string | null = null;

  test.afterEach(async ({ page }) => {
    // Cleanup through the API, so even a failed assertion leaves no row in the shared database.
    if (savedId !== null) await page.request.delete(`/api/verifications/${savedId}`);
    savedId = null;
  });

  test("a saved high-risk verification reads as high risk on the list and in its report", async ({ page }) => {
    test.skip(!hasAccount, "Set E2E_EMAIL and E2E_PASSWORD of a test account in .dev.vars");

    // Setup: save a verification through the API — the wizard itself is covered by main-path.spec.ts.
    // Rules document case V1 with a B zipper pull: the letter dates the bag to S/S 2009, B pulls exist from
    // 2015 (§7.1 V-02, hard) — so the oracle is high risk, from the rules document, not from the app.
    const listingUrl = `https://example.com/oferta/e2e-list-report-${String(Date.now())}`;
    const command: SaveVerificationCommand = {
      listingUrl,
      declaredYear: null,
      price: null,
      observation: {
        tagPhoto: "present",
        hardware: "classic-aged-brass",
        tagConstruction: "metal-plate",
        styleNumber: "115748",
        styleNumberConfirmed: false,
        batchNumber: "4892",
        seasonLetter: "R",
        tabBackFirstNumber: "115748",
        brandLine: "dot",
        stamp925: "absent",
        madeInItalySize: "small",
        declaredYear: null,
        thread: "yes",
        zipper: "b",
        bales: "yes",
      },
    };
    const response = await page.request.post("/api/verifications", { data: command });
    expect(response.status()).toBe(201);
    savedId = ((await response.json()) as { verification: { id: string } }).verification.id;

    // The list: the entry for this listing carries the high-risk label.
    await page.goto("/verifications");
    const entry = page.getByRole("link").filter({ hasText: listingUrl });
    await expect(entry).toContainText("Wysokie ryzyko");

    // The report of the same verification: the same verdict in its heading.
    await entry.click();
    await page.waitForURL(`**/verifications/${savedId}`);
    await expect(page.getByRole("heading", { level: 2, name: "Wysokie ryzyko" })).toBeVisible();
  });
});
