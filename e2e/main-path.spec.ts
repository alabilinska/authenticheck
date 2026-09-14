import { expect, test, type Page } from "@playwright/test";

// PRD success criterion: sign in → new verification → tag numbers → checklist answers →
// report with a risk level and at least one seller question.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

// Signing in is part of the path under test, so this spec starts signed out instead of loading storageState.
test.use({ storageState: { cookies: [], origins: [] } });

function group(page: Page, legend: string | RegExp) {
  return page.getByRole("group", { name: legend });
}

/** Astro removes `ssr` from an island once React has hydrated it; typing earlier is reset by the controlled inputs. */
async function hydrated(page: Page) {
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Dalej" }).click();
}

test("main verification path ends in a report with a risk level and a seller question", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD of a test account in .dev.vars");

  // Sign in.
  await page.goto("/auth/signin");
  await hydrated(page);
  await page.getByLabel("Email").fill(email ?? "");
  await page.getByLabel("Password", { exact: true }).fill(password ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/"));

  // New verification from the dashboard.
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Nowa weryfikacja" }).click();
  await expect(page).toHaveURL(/\/verifications\/new$/);
  await hydrated(page);

  // Listing.
  await page.getByLabel("Link do ogłoszenia").fill("https://example.com/oferta/e2e");
  await next(page);

  // Hardware.
  await page.getByRole("radio", { name: /postarzany mosiądz/ }).check();
  await next(page);

  // Plate (rules test case V1: 115748, N° 4892 R).
  await group(page, "Czy w ogłoszeniu jest zdjęcie metki z płytką?").getByRole("radio", { name: "Tak" }).check();
  await group(page, "Jak zbudowana jest metka?")
    .getByRole("radio", { name: /Metalowa płytka/ })
    .check();
  await page.getByLabel("Numer modelu — dolna linia płytki").fill("115748");
  await page.getByLabel("Numer partii — górna linia, po N°").fill("4892");
  await group(page, "Litera sezonu — obok numeru partii").getByRole("radio", { name: "Jest litera" }).check();
  await page.getByLabel("Litera sezonu", { exact: true }).fill("R");
  await next(page);

  // Back of the tab.
  await page.getByLabel("Pierwszy numer na odwrocie metki").fill("115748");
  await group(page, "Napis MADE IN ITALY").getByRole("radio", { name: "Małe litery" }).check();
  await next(page);

  // Markings.
  await group(page, "Napis na płytce")
    .getByRole("radio", { name: /z kropką/ })
    .check();
  await group(page, "Mały stempel 925 na płytce").getByRole("radio", { name: "Nie ma" }).check();
  await next(page);

  // Visual checks: the seam can't be seen, so the report must ask the seller about it.
  await group(page, /górna krawędź metki/)
    .getByRole("radio", { name: "Nie widać" })
    .check();
  await group(page, "Co jest wybite na spodzie suwaka?")
    .getByRole("radio", { name: /^Lampo/ })
    .check();
  await group(page, /kółko łączące pasek/)
    .getByRole("radio", { name: "Tak" })
    .check();
  await page.getByRole("button", { name: "Sprawdź" }).click();

  // Report.
  await expect(page.getByRole("heading", { level: 2, name: /ryzyko/i })).toBeVisible();
  await expect(page.getByText("Rok z metki: S/S 2009")).toBeVisible();
  const questions = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Pytania do sprzedawcy" }) })
    .getByRole("listitem");
  await expect(questions.first()).toBeVisible();
  expect(await questions.count()).toBeGreaterThanOrEqual(1);
});
