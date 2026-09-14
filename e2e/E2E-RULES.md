# E2E Testing Rules

Read before adding or changing a spec in `e2e/`. Model every new spec on `e2e/seed.spec.ts`. Source: the
`/10x-e2e` skill (`.claude/skills/10x-e2e/references/e2e-quality-rules.md`), adapted to this project.

- Start from a browser-level risk in `context/foundation/test-plan.md` — one that crosses auth, routing, API
  and the database, or exists only in the rendered UI. If an isolated function or a request-level test can prove
  it, write that instead.
- Use `getByRole`, `getByLabel`, `getByText` as primary locators. Fall back to `getByTestId` only when accessibility
  attributes are ambiguous. Never CSS selectors, XPath or DOM structure — the one exception is the hydration wait
  on `astro-island[ssr]`, which waits for state, not for an element.
- Each test is independently runnable: its own setup, action, assertion and cleanup; no shared state between tests.
- Never `page.waitForTimeout()`. Wait for a condition: `toBeVisible()`, `waitForURL()`, `waitForResponse()`.
- Assert the business outcome, and take the expected value from the PRD or the rules document, not from the app.
  Name the test after the risk it protects.
- Unique test data (timestamp suffix) and cleanup in `afterEach` — **the dev server talks to the shared
  Supabase project that production also uses**, so a leftover row is production data.
- Authenticate with `storageState` from `e2e/auth.setup.ts` — never log in through the UI in an individual test,
  unless signing in is the flow under test (`main-path.spec.ts`, which starts signed out on purpose).
- Before trusting a new spec, break the behavior it protects, watch it go red, then revert the break.

Run: `npm run test:e2e`, or one spec: `npx playwright test e2e/seed.spec.ts`. Needs `E2E_EMAIL` / `E2E_PASSWORD`
in `.dev.vars`; Playwright starts `npm run dev` on :4321 itself.
