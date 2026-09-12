# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Authenticheck — a rule-based authenticity checker for second-hand Balenciaga bags
(v1: City / Motorcycle). Product decisions live in `context/foundation/`:
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
- Create on first need: `src/types.ts` (shared entities/DTOs), `src/lib/services/` (extracted
  business logic), `src/components/hooks/` (React hooks). None exist yet.
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
authenticated route there. Auth endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`
(form POST → redirect with `?error=`); pages under `src/pages/auth/`.

## Commands

- `npm run dev` — dev server on Cloudflare workerd; secrets from `.dev.vars` (Node scripts read `.env`)
- `npm run build` — SSR build via `@astrojs/cloudflare`; run before any `wrangler` command
- `npx astro sync` — generates `.astro/` types; required once after a fresh clone or `npm run lint` fails with ~20 unresolved-type errors (CI runs it explicitly)
- `npm run lint` / `lint:fix` — ESLint (strictTypeChecked + Prettier as a lint rule: formatting errors fail lint)
- `npx supabase start` — local Supabase (Docker); Studio at http://localhost:54323
- No test runner is configured yet. The PRD requires an end-to-end test of the main
  verification path — pick and wire a runner before writing tests.

Wrangler (Worker `authenticheck`). Production deploys come from Workers Builds on `main`; CI never deploys.

- Agent-safe: `npm run build && npx wrangler versions upload --message "…" --preview-alias <name>`, `npx wrangler deploy --dry-run`, `npx wrangler deployments status`, `npx wrangler tail --format pretty --status error`
- Human-only: `npx wrangler deploy`, `npx wrangler rollback`, `npx wrangler secret put`, `wrangler login`, plan upgrades
- `dist/server/wrangler.json` is what deploys, not `wrangler.jsonc` — build first.
- `compatibility_date` ceiling is `2026-05-14` (pinned workerd); raise only with an adapter/wrangler upgrade.

Pre-commit (husky + lint-staged): `eslint --fix` on `*.{ts,tsx,astro}`, `prettier --write` on `*.{json,css,md}`.
CI (`.github/workflows/ci.yml`) runs lint + build on push/PR to `main`, Node 22 (`.nvmrc` 22.14; local Node 24 also works).

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 1

Move from sprint-zero setup to project orchestration with the **roadmap chain**:

```
(Module 1 foundation docs) -> /10x-roadmap -> backlog-ready roadmap items
```

`/10x-roadmap` is the lesson focus. `/10x-new` is intentionally introduced in Module 2, Lesson 2, when a selected roadmap item becomes an implementation change folder.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Roadmap (lesson focus)** | |
| `/10x-roadmap` | You have `context/foundation/prd.md` and a scaffolded project baseline, and you need a vertical-first MVP roadmap. The skill reads the PRD, inspects the code baseline, uses available foundation docs such as `tech-stack.md`, `infrastructure.md`, and `deploy-plan.md`, then writes `context/foundation/roadmap.md`. Use it BEFORE creating per-change folders or implementation plans. |
| **Re-run upstream if needed** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Bundled from Module 1 so foundation contracts can be fixed before roadmap sequencing. If roadmap generation exposes a PRD gap, repair the PRD before pretending the backlog is ready. |

### How the chain hands off

- `/10x-roadmap` bridges product and implementation. It does not choose frameworks, design schemas, or write a per-change implementation plan.
- The output is `context/foundation/roadmap.md`: ordered milestones, vertical slices, bounded foundations, dependencies, unknowns, risk, and backlog handoff fields.
- Roadmap items should receive stable human-readable identifiers in backlog tools. The actual `context/changes/<change-id>/` folder is created in Lesson 2 with `/10x-new`.

### Roadmap boundaries

- Default to vertical slices: user-visible outcomes that cross UI, data, business logic, and integrations.
- Horizontal work is allowed only as a bounded enabler that names the downstream vertical milestone it unlocks.
- Avoid orphan horizontal work such as "build the whole database", "build all API endpoints", or "design the whole UI" before the first user-visible flow.
- Roadmap is not a calendar estimate. Do not invent dates, story points, or sprint velocity unless the user explicitly asks for a separate planning artifact.

### Foundation paths used by this lesson

- `context/foundation/prd.md` - input
- `context/foundation/tech-stack.md` - optional input
- `context/foundation/infrastructure.md` - optional input
- `context/deployment/deploy-plan.md` - optional input
- `context/foundation/roadmap.md` - output
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
