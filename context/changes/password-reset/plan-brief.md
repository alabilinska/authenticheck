# Password Reset and Honest Post-Sign-Up Message — Plan Brief

> Full plan: `context/changes/password-reset/plan.md`

## What & Why

Roadmap S-08 (FR-001): a buyer who forgot their password must be able to reset it by email and sign in with the new one — the PRD lists reset as part of the must-have account feature. The same change fixes the post-sign-up page, which in production always says "Check your email" although no email is sent.

## Starting Point

Sign-up, sign-in and sign-out work locally and in production against one cloud Supabase project; the auth screens are English form islands posting to Astro endpoints that redirect with `?error=`. Password reset does not exist, and `confirm-email.astro` chooses its message by build mode.

## Desired End State

The sign-in page links to "Forgot password?"; the user gets a reset link by email, opens it on any device, sets a new password, is signed out and signs in with it. After sign-up the page says "Account ready" when the user is signed in and "Check your email" otherwise.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Reset link | Token hash verified by `verifyOtp` | Works when the email is opened on another device (PKCE links do not). |
| After new password | Sign out → sign-in page with a notice | Proves the new password works, as the roadmap outcome says. |
| Post-sign-up state | From the session (`Astro.locals.user`) | Honest in both confirmation settings and cannot be spoofed by a query parameter. |
| Language | English, like the other auth screens | Consistent account screens; S-01 kept auth untranslated. |
| Email delivery | Built-in Supabase sender; confirmation stays off | No new infrastructure; enough for testing on the developer's address. |
| Tests | Unit tests for the pure logic + manual walk-through with a real email | Logic guarded in CI; the real email checks the dashboard configuration no test would catch. |

## Scope

**In scope:** forgot-password page and endpoint, email-link verification endpoint, new-password page and endpoint, sign-in link and success notice, post-sign-up fix, service module with tests, Supabase dashboard settings, README/CLAUDE.md.

**Out of scope:** custom SMTP, re-enabling email confirmation, handling confirmation-type links, translating auth screens, changing password from a settings page.

## Architecture / Approach

Same pattern as sign-in: React form island → `POST /api/auth/…` → redirect with `?error=` or a notice. `src/lib/services/password-reset.ts` holds the zod schemas, the link-type mapping and the confirm URL. The email template links to `{{ .RedirectTo }}?token_hash=…&type=recovery`, so one template serves localhost and production.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Honest post-sign-up page and reset logic | Correct "Account ready" / "Check your email"; tested service module | Low — one page and pure functions |
| 2. Password reset flow | Request, link verification, new password, sign-in link, dashboard settings, docs | Dashboard template or Redirect URLs wrong → link lands on the invalid-link message |

**Prerequisites:** F-01 (done); the developer changes three Supabase dashboard settings before the Phase 2 manual test.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- Built-in Supabase email has a low hourly limit and restricted recipients; external users may not get the link until custom SMTP exists.
- Reset emails may land in spam.

## Success Criteria (Summary)

- A user resets a forgotten password from a link opened on any device and signs in with the new password, locally and on production.
- After sign-up the page tells the truth about the account state.
