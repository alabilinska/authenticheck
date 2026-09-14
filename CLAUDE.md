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

## 10xDevs AI Toolkit - Module 2, Lesson 4

Prepare for a harder implementation stream with the **research-backed planning chain**:

```
internal research (/10x-research) + external research (exa.ai, Context7) -> /10x-plan -> /10x-implement -> success
```

The lesson focus is distinguishing internal from external research and using evidence to back planning decisions.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Internal research (lesson focus)** | |
| `/10x-research <change-id>` | You need evidence from the existing codebase — patterns, conventions, integration points, or existing implementations. Runs parallel sub-agents over the repo and writes structured findings to `research.md`. |
| **External research (lesson focus)** | |
| exa.ai | You need AI-native web search for library comparisons, best practices, or ecosystem context that the codebase cannot answer. |
| Context7 (`resolve-library-id` → `get-library-docs`) | You need live, current documentation for a specific library or framework. Resolves a library ID first, then fetches relevant doc pages. |
| **Framing spare wheel** | |
| `/10x-frame <change-id>` | The plan won't converge, the plan doesn't deliver expected results, or persistent drift keeps breaking the implementation. Use as an escape hatch on a separate problem (demonstrated on Space Explorers example), not as pre-research ritual. |
| **Planning and execution** | |
| `/10x-plan <change-id>` / `/10x-implement <change-id> phase <n>` | Use the same planning and execution chain from Lesson 2, now with upstream research evidence feeding the plan. |

### Research discipline

- Internal research (`/10x-research`) answers "what does our codebase already do?" — patterns, schemas, conventions, integration points.
- External research (exa.ai, Context7) answers "what should we do?" — library capabilities, API docs, ecosystem best practices.
- Combine both as evidence-backed input to `/10x-plan`. A plan without research evidence on a non-trivial stream is a guess.
- Agent-friendly docs (`llms.txt`, markdown-for-agents, `/md` endpoints) are a quality signal for library selection — libraries that publish agent-readable docs integrate faster.

### `/10x-frame` as spare wheel

Three triggers for reaching for `/10x-frame`:
1. The plan won't converge — research keeps opening more questions instead of narrowing to a contract.
2. The plan doesn't deliver — implementation repeatedly fails to meet success criteria.
3. Persistent drift — the implementation keeps diverging from the plan in ways that suggest the problem was mis-framed.

Demonstrated on a Space Explorers example, not the SRS path. It is an escape hatch, not a mandatory step.

### Paths used by this lesson

- `context/changes/<change-id>/research.md` - internal research output
- `context/changes/<change-id>/frame.md` - framing output when needed
- `context/changes/<change-id>/plan.md` - evidence-backed implementation contract
- `context/foundation/lessons.md` - recurring rules and pitfalls

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
