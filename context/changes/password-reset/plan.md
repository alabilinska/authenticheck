# Password Reset and Honest Post-Sign-Up Message Implementation Plan

## Overview

Roadmap S-08 (FR-001): a user who forgot their password requests a reset link by email, opens it on any device, sets a new password and signs in with it. The post-sign-up page stops guessing: it tells the user whether the account is ready to use or waits for email confirmation, based on the actual session.

## Current State Analysis

- Auth exists: sign-up, sign-in, sign-out and route protection (F-01 done). Endpoints `src/pages/api/auth/{signin,signup,signout}.ts` take a form POST and redirect with `?error=`; they cast `formData` values without validation — CLAUDE.md marks this as the exception, new routes validate with `z` from `astro/zod`.
- Auth screens `src/pages/auth/{signin,signup,confirm-email}.astro` are English, glass-card style, built from `FormField`, `PasswordToggle`, `SubmitButton`, `ServerError` (`src/components/auth/`). Minimum password length is 6 in `SignUpForm.tsx:8` and in Supabase.
- `src/pages/auth/confirm-email.astro:4` picks its message by `import.meta.env.DEV`, so production always says "Check your email" although email confirmation is off and no email is sent.
- `src/middleware.ts` resolves `context.locals.user` from the Supabase session on every request; `createClient()` (`src/lib/supabase.ts`) returns `null` without env vars and every route must handle that.
- `@supabase/ssr` 0.10.3 defaults to the PKCE flow: a reset link carrying `?code=` only works in the browser that requested it. `verifyOtp({ type: "recovery", token_hash })` works from any device but needs the "Reset password" email template changed in the Supabase dashboard.
- Local `npm run dev` talks to the same cloud Supabase project as production (`.dev.vars`); the local `supabase/config.toml` is not used.
- Email goes through Supabase's built-in sender: low hourly limit and restricted recipients — enough for the developer's own address, not for external users.

## Desired End State

- `/auth/signin` shows a "Forgot password?" link to `/auth/forgot-password`.
- `/auth/forgot-password`: the user enters an email and always sees "If an account exists for this address, we sent a reset link" (no account enumeration); Supabase errors such as the rate limit are shown.
- The email link opens `/api/auth/confirm?token_hash=…&type=recovery` on any device; a valid token signs the user in for the reset and redirects to `/auth/reset-password`; an invalid, used or expired token redirects to `/auth/forgot-password` with "This reset link is invalid or has expired. Request a new one."
- `/auth/reset-password` (only with a session, otherwise the same expired-link message): new password + confirmation, min. 6 characters; success signs the user out and lands on `/auth/signin` with "Password updated — sign in with your new password."
- `/auth/confirm-email` shows "Account ready" with a link to the dashboard when the user has a session after sign-up, and "Check your email" otherwise — in both email-confirmation settings.
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` pass; the full reset works locally and on production with a real email.

### Key Discoveries:

- `signUp` already signs the user in when confirmation is off (session cookies set), so `Astro.locals.user` on `/auth/confirm-email` is the honest signal — no query parameter to spoof.
- The email template must link to `{{ .RedirectTo }}`, not `{{ .SiteURL }}`, so the same template serves `localhost:4321` and production; Supabase honours `redirectTo` only when the URL is on the Redirect URLs allowlist, otherwise it falls back to the Site URL.
- zod 4 (`astro/zod`): use `z.email()`; the `z.string().email()` form is deprecated and fails the `no-deprecated` lint rule.

## What We're NOT Doing

- No custom SMTP provider; built-in Supabase email only (risk recorded below).
- Email confirmation stays off; re-enabling it before external users remains a separate step (roadmap open item).
- No email-confirmation (`type=signup`/`email`) handling in `/api/auth/confirm` — only `recovery`; other types get the invalid-link redirect.
- No translation of auth screens; the new screens are English like the existing ones.
- No change to sign-in/sign-up validation or the existing endpoints beyond the sign-in notice and link.
- No password change for signed-in users from a settings page.

## Implementation Approach

Keep the existing auth pattern — React form island posting to an Astro endpoint that redirects with `?error=` — and put the only non-trivial logic (input schemas, link-type mapping, redirect URL) in one small service module with unit tests. Phase 1 ships the post-sign-up fix and the service module on their own; Phase 2 adds the reset pages and endpoints, the dashboard configuration and docs.

## Critical Implementation Details

- **Dashboard before testing.** The token-hash link only works after the developer changes the Supabase "Reset password" template to `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">…</a>` and adds both confirm URLs to Redirect URLs (Site URL = production URL). Until then Supabase sends its default PKCE link, which lands without `token_hash` and hits the invalid-link path.
- **Sign out after update.** `/api/auth/reset-password` calls `updateUser({ password })` and only then `signOut()`; signing out first would drop the session the update needs.

## Phase 1: Honest post-sign-up page and reset logic

### Overview

The post-sign-up page chooses its message from the session; the reset flow's pure logic exists with tests.

### Changes Required:

#### 1. Post-sign-up page

**File**: `src/pages/auth/confirm-email.astro`

**Intent**: Replace the `import.meta.env.DEV` switch with `Astro.locals.user`: signed in → "Account ready" ("Your account is ready to use.", link "Go to dashboard" → `/dashboard`); not signed in → "Check your email" (current copy, link back to sign-in).

**Contract**: No new props or query parameters; `src/pages/api/auth/signup.ts` keeps redirecting to `/auth/confirm-email`.

#### 2. Reset logic

**File**: `src/lib/services/password-reset.ts` (new), `src/lib/services/password-reset.test.ts` (new)

**Intent**: One module the endpoints share: form schemas, the minimum password length, the mapping from the link's `type` to where the user goes next, and the confirm URL built from the request origin.

**Contract**: `MIN_PASSWORD_LENGTH = 6`; `forgotPasswordSchema` (`email` via `z.email()`); `resetPasswordSchema` (`password` min 6, `confirmPassword` equal — refine with message "Passwords do not match"); `confirmRedirectPath(type: string | null): string | null` — `"recovery"` → `/auth/reset-password`, anything else → `null`; `confirmUrl(origin: string): string` → `${origin}/api/auth/confirm`; `firstIssueMessage(error)` returns the first zod issue's message for the `?error=` redirect. Tests cover valid/invalid email, short password, mismatch, each `type`, and origin with and without trailing slash.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`

#### Manual Verification:

- Local sign-up with a new email (confirmation off) lands on "Account ready" and its link opens the dashboard
- Opening `/auth/confirm-email` signed out shows "Check your email"
- After the Workers Builds deploy, a production sign-up shows "Account ready"

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Password reset flow

### Overview

Request form, email link verification, new-password form, sign-in link and notice, dashboard configuration and docs.

### Changes Required:

#### 1. Request a reset link

**File**: `src/pages/auth/forgot-password.astro` (new), `src/components/auth/ForgotPasswordForm.tsx` (new), `src/pages/api/auth/forgot-password.ts` (new)

**Intent**: Page in the sign-in card style with an email form (client-side check like `SignInForm`); the endpoint validates with `forgotPasswordSchema`, calls `resetPasswordForEmail(email, { redirectTo: confirmUrl(context.url.origin) })` and redirects to `/auth/forgot-password?sent=1` whether or not the account exists; a Supabase error (e.g. rate limit) or a `null` client redirects with `?error=`. With `?sent=1` the page shows the neutral confirmation instead of the form; with `?error=` it shows `ServerError`.

**Contract**: `POST /api/auth/forgot-password` form field `email`; redirects `/auth/forgot-password?sent=1` or `?error=<message>`.

#### 2. Verify the email link

**File**: `src/pages/api/auth/confirm.ts` (new)

**Intent**: Read `token_hash` and `type`; when `confirmRedirectPath(type)` is non-null and a token is present, call `verifyOtp({ type: "recovery", token_hash })` and redirect to the mapped path; otherwise, or on error / `null` client, redirect to `/auth/forgot-password?error=This reset link is invalid or has expired. Request a new one.`

**Contract**: `GET /api/auth/confirm?token_hash=<hash>&type=recovery` → 302 `/auth/reset-password` (session cookies set) or 302 to the invalid-link message.

#### 3. Set the new password

**File**: `src/pages/auth/reset-password.astro` (new), `src/components/auth/ResetPasswordForm.tsx` (new), `src/pages/api/auth/reset-password.ts` (new)

**Intent**: The page redirects to the invalid-link message when `Astro.locals.user` is null; otherwise it shows a form with new password + confirmation (`FormField`, `PasswordToggle`, min-length hint like `SignUpForm`). The endpoint requires a user, validates with `resetPasswordSchema`, calls `updateUser({ password })`, then `signOut()`, and redirects to `/auth/signin?message=Password updated — sign in with your new password.`; a Supabase error (e.g. same password, weak password) redirects back to `/auth/reset-password?error=`.

**Contract**: `POST /api/auth/reset-password` fields `password`, `confirmPassword`; unauthenticated POST → invalid-link redirect.

#### 4. Sign-in page

**File**: `src/pages/auth/signin.astro`

**Intent**: Add a "Forgot password?" link to `/auth/forgot-password` and show a success notice from `?message=` above the form (green counterpart of `ServerError`, plain text).

**Contract**: Query parameter `message` (text only, rendered escaped).

#### 5. Supabase dashboard (human) and docs

**File**: `README.md` (Auth routes table, Supabase section), `CLAUDE.md` (project section: auth endpoints line)

**Intent**: Document the new routes and the three one-time dashboard settings — Site URL = `https://authenticheck.alicja-a-bilinska.workers.dev`; Redirect URLs `https://authenticheck.alicja-a-bilinska.workers.dev/api/auth/confirm` and `http://localhost:4321/api/auth/confirm`; "Reset password" template linking to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` — and the built-in email limits.

**Contract**: No edits inside the 10x-cli block of CLAUDE.md.

### Success Criteria:

#### Automated Verification:

- Unit tests pass: `npm test`
- Lint passes: `npm run lint`
- Type check passes: `npm run typecheck`
- Build passes: `npm run build`
- Unauthenticated `/auth/reset-password` and `/api/auth/confirm` without a token redirect to the invalid-link message: `curl -sI localhost:4321/auth/reset-password`, `curl -sI localhost:4321/api/auth/confirm`

#### Manual Verification:

- Supabase dashboard settings applied (Site URL, both Redirect URLs, "Reset password" template)
- Local: request a reset, open the email link, set a new password, land on sign-in with the notice and sign in with the new password
- The email link opened on a different device (phone) reaches the new-password form
- A used or expired link shows the invalid-link message; the old password no longer signs in
- The same walk-through works on production after the Workers Builds deploy

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding.

---

## Testing Strategy

### Unit Tests:

- `password-reset.test.ts`: schemas (valid/invalid email, short password, mismatch message), `confirmRedirectPath` for `recovery`, `signup`, `null`, unknown; `confirmUrl` with and without a trailing slash on the origin; `firstIssueMessage`.

### Integration Tests:

- None: the endpoints are thin wrappers over Supabase and are verified by the manual walk-through with a real email.

### Manual Testing Steps:

1. Sign up locally with a new address → "Account ready" → dashboard.
2. Sign out, "Forgot password?", enter the address → neutral "sent" message.
3. Open the email on the phone → new-password form → set a password → sign-in page with the notice → sign in with it.
4. Open the same link again → invalid-link message.
5. Repeat 2–3 on production.

## Performance Considerations

None: one Supabase call per request.

## Migration Notes

No data changes. Dashboard settings are one-time and apply to local and production alike, since both use the same Supabase project.

## Open Risks & Assumptions

- Built-in Supabase email: low hourly limit and restricted recipients; external users may not receive the link until a custom SMTP provider is configured.
- Emails may land in spam; the manual test checks the spam folder.

## References

- Roadmap item: `context/foundation/roadmap.md` — S-08 `password-reset`
- PRD: `context/foundation/prd.md` — FR-001, Access Control
- Auth pattern: `src/pages/api/auth/signin.ts`, `src/components/auth/SignUpForm.tsx`
- Post-sign-up bug: `src/pages/auth/confirm-email.astro:4`

## Implementation Notes

- 2026-09-14, Phase 2: editing the "Reset password" email template needs a paid Supabase plan, which the developer declined. Adapted with the developer's approval: the default template is kept; `/api/auth/confirm` exchanges the default link's `?code=` for a session (`exchangeCodeForSession`, PKCE) and still handles `?token_hash=…&type=recovery` for a future customised template. Consequence: the link works only in the browser that requested the reset; opened elsewhere it shows "open the link in the browser where you requested it". Dashboard step 2.6 is now Site URL + Redirect URLs only, and 2.8 is verified as that message instead of the new-password form.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Honest post-sign-up page and reset logic

#### Automated

- [x] 1.1 Unit tests pass — bffde6e
- [x] 1.2 Lint passes — bffde6e
- [x] 1.3 Type check passes — bffde6e
- [x] 1.4 Build passes — bffde6e

#### Manual

- [x] 1.5 Local sign-up lands on "Account ready" and its link opens the dashboard — bffde6e
- [x] 1.6 Signed-out /auth/confirm-email shows "Check your email" — bffde6e
- [x] 1.7 Production sign-up shows "Account ready" after the deploy — bffde6e

### Phase 2: Password reset flow

#### Automated

- [x] 2.1 Unit tests pass
- [x] 2.2 Lint passes
- [x] 2.3 Type check passes
- [x] 2.4 Build passes
- [x] 2.5 Unauthenticated /auth/reset-password and tokenless /api/auth/confirm redirect to the invalid-link message

#### Manual

- [x] 2.6 Supabase dashboard settings applied
- [x] 2.7 Local reset end to end, sign in with the new password
- [ ] 2.8 Email link opened on another device reaches the new-password form
- [x] 2.9 Used or expired link shows the invalid-link message; old password no longer works
- [ ] 2.10 Same walk-through works on production after the deploy
