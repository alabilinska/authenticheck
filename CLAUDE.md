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
- Tests follow `context/foundation/test-plan.md` (risk map, rollout phases, cookbook §6) — read it before writing or changing any test.

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
- `npm run test:e2e` — Playwright end-to-end test of the main path (`e2e/*.spec.ts`) against `npm run dev` on :4321;
  needs `E2E_EMAIL` / `E2E_PASSWORD` of a test account in `.dev.vars` (skipped without them); not run in CI

Wrangler (Worker `authenticheck`). Production deploys come from Workers Builds on `main`; CI never deploys.

- Agent-safe: `npm run build && npx wrangler versions upload --message "…" --preview-alias <name>`, `npx wrangler deploy --dry-run`, `npx wrangler deployments status`, `npx wrangler tail --format pretty --status error`
- Human-only: `npx wrangler deploy`, `npx wrangler rollback`, `npx wrangler secret put`, `wrangler login`, plan upgrades
- `dist/server/wrangler.json` is what deploys, not `wrangler.jsonc` — build first.
- `compatibility_date` ceiling is `2026-05-14` (pinned workerd); raise only with an adapter/wrangler upgrade.

Pre-commit (husky + lint-staged): `eslint --fix` on `*.{ts,tsx,astro}`, `prettier --write` on `*.{json,css,md}`.
Post-edit agent hook (`.claude/settings.json` → `.claude/hooks/post-edit.sh`): `eslint --fix` on the edited `src/` file, plus `vitest related --run` for risk-area files (rule engine, knowledge file, list/report mapping, wizard); a failure returns exit 2 with the output for the agent to fix. Pre-push (husky): `npm test` + `npm run typecheck`.
CI (`.github/workflows/ci.yml`) runs lint, type check, unit tests and build on push/PR to `main`, Node 22 (`.nvmrc` 22.14; local Node 24 also works).

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 3, Lesson 3

Lesson 3 is about **hooks** — turning the quality gates from Lesson 1 and the tests from Lesson 2 into automatic, deterministic checks that fire while the agent works. A hook runs outside the model, so it survives context compression, instruction changes, and the model "forgetting". The payoff for agentic hooks specifically: a `PostToolUse` check can feed its result back into the agent's context, so the agent fixes trivial errors (formatting, a missing import, a wrong type) on its own in the next iteration instead of you discovering them minutes later.

```
context/foundation/test-plan.md  (§4 Quality Gates: which check, required when)
        │
        ▼  (assign each gate to the cheapest layer that still gives signal)
   per-edit (agent hooks)  →  pre-commit (git hooks)  →  pre-push  →  CI
        │ lint, format, scoped tests          │ staged       │ heavier    │ integration
        ▼
   exit code + stdout  →  additionalContext  →  agent reacts next turn
```

### Task Router — Which layer for this check

| You want to | Do this |
| --- | --- |
| React the instant the agent edits a file | A per-edit hook (`PostToolUse` matcher `Write\|Edit` in Claude Code). Right for fast checks: lint/format, and scoped tests on risk-area files. This is the **only** layer that can hand feedback to the agent mid-session. |
| Run only the tests that depend on the edited file | Parse the path from the hook's stdin (`jq -r .tool_input.file_path`) and run your runner's related-tests mode (`vitest related "$FILE" --run`, `jest --findRelatedTests $FILE`). Gate it on whether the file is a risk area in `test-plan.md`; don't run tests on every helper or config edit. |
| Catch changes that bypassed the agent (manual edits, a teammate's commit) | A pre-commit git hook (Lefthook or Husky+lint-staged) over staged files: lint + typecheck, and tests on staged risk files. |
| Run heavier checks before code leaves the machine | Pre-push: full typecheck or a broader test set. Anything too slow for per-edit moves here. |
| Decide where a given gate belongs | Ask: is it fast enough (a few seconds) for per-edit, or should it wait for commit/push/CI? Slow checks block the agent loop on every edit — push them up a layer. |
| Use the same hook across tools | The trigger → matcher → handler → signal pattern is the same in Cursor, Codex, Windsurf, and Copilot; only the config file and event names change. See the cross-tool table below. |

### Hook lifecycle — the universal pattern

Every tool's hooks follow four steps:

1. **Trigger** — an event in the tool (e.g. the agent just saved a file: `PostToolUse`).
2. **Matcher** — a filter deciding whether this hook runs (tool name like `Write`/`Edit`, file type, or a name pattern).
3. **Handler** — the action that runs, usually a shell command.
4. **Signal** — the result returns to the tool. The exit code says pass/fail; stdout can flow into the agent's context as feedback.

### Exit codes and the feedback loop

- **0** — success; the hook passed, continue.
- **2** — blocking error; the agent sees the feedback and should react.
- **anything else** — non-blocking error; logged, but does not interrupt work.

On a blocking failure, stdout flows into the agent's context (in Claude Code via `additionalContext`, capped at 10,000 characters; other tools have similar mechanisms with their own limits). That is why the agent can self-correct: it sees the concrete message — missing type, unimported module, badly formatted line — not just "something failed".

The boundary: the agent reliably fixes **trivial** corrections on its own. When a test fails because of wrong business logic, the hook surfaces it but the agent may not diagnose the real cause — it says "something is off" and tries a trivial fix. If that does not resolve in one or two tries, the signal comes back to you, and the problem may deserve its own change-id with the full `/10x-new → /10x-research → /10x-plan → /10x-implement` workflow.

### Three local layers (plus CI)

| Layer | Catches | Timing |
| --- | --- | --- |
| Per-edit (agent hooks) | Formatting, simple type errors, failing unit tests on risk files. Only layer that feeds the agent mid-work. | ms–s |
| Pre-commit (git hooks) | What slipped past per-edit: manual edits, files changed outside the hook, checks too slow for per-edit. Operates on staged files. | s |
| Pre-push | Heavier checks before pushing to remote (full typecheck, broader test set). | s–min |
| CI | Integration problems, cross-module dependencies, checks needing infra unavailable locally. | min |

Local layers do **not** replace CI — CI stays the key verification for shared repo state and environments you don't control. But each local layer that catches an error is one fewer CI round-trip. You don't need all layers from day one: start with one per-edit hook (lint) and one commit gate, add layers as you see what escapes. The quality gates in `test-plan.md §4` decide which checks are worth automating and when; a plan may legitimately defer per-edit hooks if the cost/signal ratio isn't there yet.

### Key rules

- Keep per-edit hooks fast. If a check takes more than a few seconds, move it to commit, push, or CI — a slow per-edit hook blocks the agent loop on every edit. Lint/format are ideal per-edit; full typecheck is often a commit gate in larger projects.
- Run scoped tests, not the whole suite, per edit — only tests related to the edited file, and only when that file is a risk area in `test-plan.md`.
- `related` is a subcommand, not a flag (`vitest related`, not `--related`). Use `--run` so the hook terminates instead of entering watch mode.
- `PostToolUse` fires once per tool use; three edits in one turn fire it three times independently — there is no built-in aggregation.
- The git hook tool (Lefthook vs Husky+lint-staged) is an implementation detail; the rule is the same — run checks on staged files before commit. If Husky already works, don't migrate.
- **Context injection is not universal.** Claude Code, Cursor, Codex, and Copilot (in VS Code) can pass a hook's result to the agent; Windsurf cannot — it can block (exit 2) but can't tell the agent what went wrong.

### The same pattern in every tool

| Tool | Events | Handlers | Context injection | Config |
| --- | --- | --- | --- | --- |
| Claude Code | ~30 | command, http, mcp_tool, prompt, agent | yes | `.claude/settings.json` |
| Cursor | ~18 | command, prompt | yes | `.cursor/hooks.json` |
| Codex | 10 | command | yes | `.codex/hooks.json` |
| Windsurf | 12 | command | **no** | `.windsurf/hooks.json` |
| Copilot | ~13 | command, http, prompt | yes (VS Code) | `.github/hooks/*.json` |

### Lesson boundaries

- This lesson configures hooks and local quality layers only. The hook JSON, `lefthook.yml`, and the per-edit/commit/push layering are the scope.
- Do not write E2E tests, configure Playwright/MCP, or run browser scenarios. That is Lesson 4.
- Do not run the bug-to-fix-to-regression-test debugging workflow. That is Lesson 5.
- Do not change the risk strategy or quality-gate definitions. That is Lesson 1 (`/10x-test-plan`); read current state with `/10x-test-plan --status`.
- Do not write unit/integration test code from scratch here. That is Lesson 2 — hooks only *run* the tests those lessons produced.
- Do not author CI/CD pipelines. That is Module 1 Lesson 5 / Module 2 Lesson 5; hooks are the local layers in front of CI.

### Paths used by this lesson

- `.claude/settings.json` — hook configuration (`~/.claude/settings.json` global, `.claude/settings.json` project, `.claude/settings.local.json` local overrides). Other tools use their own config file (see the table).
- `lefthook.yml` — pre-commit git hook config (lint + typecheck + tests on `{staged_files}`).
- `context/foundation/test-plan.md` — §4 quality gates decide which checks to automate and at which layer; risk areas decide which edits warrant scoped tests.

<!-- END @przeprogramowani/10x-cli -->
