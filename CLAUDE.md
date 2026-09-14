# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Authenticheck — a rule-based authenticity checker for second-hand Balenciaga bags
(v1: Classic City medium with classic hardware). Product decisions live in `context/foundation/`:
`prd.md` (FRs, business rule, non-goals), `tech-stack.md` (starter hand-off),
`shape-notes.md` (discovery trail). Brand knowledge is data, not code: rules and
checklist questions belong in config files consumed by a generic engine.

## Conventions

- API routes: uppercase `GET`/`POST` exports; validate input with `z` from `astro/zod`
  (bundled with Astro; `astro:schema` is deprecated and fails the `no-deprecated` lint rule — the current auth routes still cast `formData` values and are the exception, not the pattern).
- API routes return errors as `{ error: { code, message, context? } }` with the matching HTTP status.
  `code` is a stable SCREAMING_SNAKE identifier (`UNAUTHENTICATED`, `INVALID_INPUT`, …); validation details
  go inside `context`, never as a sibling `issues` field. Never `{ error: string }`.
- Supabase: migrations in `supabase/migrations/` as `YYYYMMDDHHmmss_short_description.sql`
  (directory not created yet); every new table gets RLS with per-operation, per-role policies —
  the PRD's "each user sees only their own verifications" depends on it.
- Shared entities/DTOs live in `src/types.ts`, extracted business logic in `src/lib/services/`;
  create `src/components/hooks/` (React hooks) on first need.
- Tag knowledge lives in `src/data/balenciaga-classic-city/knowledge.json` (source: `balenciaga-city-tag-rules.md` —
  change the rules document first, then the JSON) and is evaluated by the pure engine in
  `src/lib/services/tag-validation/`; its tests encode the rules document's test set.
- React: no Next.js directives (`"use client"` etc.).

## Architecture

Astro 6 with `output: "server"` — every page and API route is rendered on demand; do not add `prerender = true` to an API route.
React 19 only for interactive islands; Astro components for layout/static content.
Tailwind 4 + shadcn/ui (`src/components/ui/`, "new-york"); merge classes with `cn()` from `@/lib/utils`.

**Auth is optional at runtime.** `SUPABASE_URL` / `SUPABASE_KEY` are declared `optional: true`
in `astro.config.mjs` (`astro:env/server`). `createClient()` in `src/lib/supabase.ts` returns
`null` when they are missing, and `src/lib/config-status.ts` turns that into a "not configured"
banner. Consequences: every API route and page must handle a `null` client; build and CI pass
without secrets; misconfiguration surfaces only at runtime.

Request flow: `src/middleware.ts` resolves the Supabase user on every request into
`context.locals.user` (typed in `src/env.d.ts`) and redirects unauthenticated requests whose
path starts with an entry in `PROTECTED_ROUTES` to `/auth/signin`. Add every new
authenticated route there. Auth endpoints: `src/pages/api/auth/{signin,signup,signout,forgot-password,reset-password}.ts`
(form POST → redirect with `?error=`); pages under `src/pages/auth/`. Password reset: the default Supabase email
link lands on `GET /api/auth/confirm?code=…` (PKCE — works only in the browser that requested the reset);
`?token_hash=…&type=recovery` is also handled, for a customised "Reset password" template. Redirect URLs must list
`/api/auth/confirm` (README); shared logic in `src/lib/services/password-reset.ts`.

## Commands

- `npm run dev` — dev server on Cloudflare workerd; secrets from `.dev.vars` (Node scripts read `.env`)
- `npm run build` — SSR build via `@astrojs/cloudflare`; run before any `wrangler` command
- `npx astro sync` — generates `.astro/` types; required once after a fresh clone or `npm run lint` fails with ~20 unresolved-type errors (CI runs it explicitly)
- `npm run lint` / `lint:fix` — ESLint (strictTypeChecked + Prettier as a lint rule: formatting errors fail lint)
- `npx supabase start` — local Supabase (Docker); Studio at http://localhost:54323
- `npm test` / `npm run test:watch` — Vitest unit tests (`src/**/*.test.ts`, node environment, plain config without
  Astro's Vite setup); one file: `npx vitest run src/lib/services/tag-validation/evaluate.test.ts`
- `npm run typecheck` — `astro check`
- The PRD's end-to-end test of the main verification path is still owed (roadmap S-04).

Wrangler (Worker `authenticheck`). Production deploys come from Workers Builds on `main`; CI never deploys.

- Agent-safe: `npm run build && npx wrangler versions upload --message "…" --preview-alias <name>`, `npx wrangler deploy --dry-run`, `npx wrangler deployments status`, `npx wrangler tail --format pretty --status error`
- Human-only: `npx wrangler deploy`, `npx wrangler rollback`, `npx wrangler secret put`, `wrangler login`, plan upgrades
- `dist/server/wrangler.json` is what deploys, not `wrangler.jsonc` — build first.
- `compatibility_date` ceiling is `2026-05-14` (pinned workerd); raise only with an adapter/wrangler upgrade.

Pre-commit (husky + lint-staged): `eslint --fix` on `*.{ts,tsx,astro}`, `prettier --write` on `*.{json,css,md}`.
CI (`.github/workflows/ci.yml`) runs lint, type check, unit tests and build on push/PR to `main`, Node 22 (`.nvmrc` 22.14; local Node 24 also works).

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
