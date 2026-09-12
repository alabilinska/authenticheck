---
project: Authenticheck
researched_at: 2026-09-12
recommended_platform: Vercel
runner_up: Cloudflare Workers
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6.3.1 (SSR, React 19 islands)
  runtime: Node.js 22 (Vercel Fluid Compute) — replaces the scaffolded Cloudflare Workers runtime
---

## Recommendation

**Deploy on Vercel.**

Cloudflare Workers scored highest on the five agent-friendly criteria (5 Pass) and is what the scaffold ships with, but the anti-bias cross-check surfaced a cluster of risks that matter for a solo developer with a four-day runway: the 10 ms CPU limit on the Free plan, adapter-provisioned KV/Images bindings that block rollbacks, and zero prior familiarity with the platform. The developer chose the runner-up in raw scoring: Vercel scores 4 Pass + 1 Partial (MCP in beta), is the platform the developer already knows (interview: existing familiarity), costs $0 on Hobby at this scale (10k–100k requests/month), and offers a Frankfurt region (`fra1`) next to the Supabase project. The price of that choice is a one-time adapter swap (`@astrojs/cloudflare` → `@astrojs/vercel@^10`) and a correction to `context/foundation/tech-stack.md`, whose `deployment_target: cloudflare-pages` is doubly stale (the platform changed, and `@astrojs/cloudflare` 13.x no longer targets Pages at all).

## Platform Comparison

Research checked 2026-09-12. Interview constraints: persistent connections unknown (PRD suggests none), cost ≈ DX, existing familiarity with Vercel/Netlify, single region (Poland), external providers fine (Supabase stays). No hard filter dropped a platform; every candidate runs Astro 6 SSR, but only Cloudflare has its adapter already in the repo.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5 Pass |
| Vercel | Pass | Pass | Pass | Pass | Partial (MCP beta) | 4 Pass, 1 Partial |
| Netlify | Partial | Pass | Pass | Pass | Pass | 4 Pass, 1 Partial |
| Render | Partial | Pass | Pass | Pass | Pass | 4 Pass, 1 Partial |
| Railway | Partial | Pass | Pass | Partial | Pass | 3 Pass, 2 Partial |
| Fly.io | Pass | Partial | Partial | Partial | Partial (MCP experimental) | 1 Pass, 4 Partial |

**Cloudflare Workers** — `wrangler deploy / rollback / tail / secret / versions` cover the whole loop; docs as `llms.txt` and per-page `.md`; five official MCP servers with no beta labels. Free plan: 100k req/day but only 10 ms CPU per request; Paid $5/mo flat. Pages is not deprecated but Cloudflare now points new projects at Workers, and `@astrojs/cloudflare` 13.x dropped Pages support. `astro dev` already runs on workerd. Gotchas: adapter auto-enables `SESSION` KV and `IMAGES` bindings; rollback is blocked when bindings changed between versions; EU placement needs an explicit `placement.region` hint.

**Vercel** — `vercel`, `vercel --prod`, `vercel rollback` (Hobby: previous deployment only), `vercel promote`, `vercel logs --follow`; docs as `llms.txt` / `Accept: text/markdown`. Fluid Compute GA (all routes in one Node function); Edge runtime legacy. Hobby: 1M invocations, 100 GB transfer, 300 s max duration, 1 region, 1-hour logs, **non-commercial use only**; Pro $20/mo. Vercel MCP public beta. Adapter: `@astrojs/vercel@^10` for Astro 6 (11.x requires Astro 7). Default region `iad1` — must set `fra1`. Git integration double-fires with an external CI that also deploys.

**Netlify** — `netlify deploy --prod`; rollback via `netlify api restoreSiteDeploy` (works, not first-class); `llms.txt`; official hosted MCP and Agent Runners. Credit-based pricing since 2025-09: Free 300 credits with **15 credits per production deploy** — twenty deploys exhaust the plan; Personal $9 is the realistic floor. Functions in Ohio (`cmh`) by default; `fra` is Pro/Enterprise only, so every Supabase EU call crosses the Atlantic on Free. Adapter `@astrojs/netlify@7` for Astro 6.

**Render** — `render` CLI (`deploys create --wait`, `logs --tail`), rollback only via REST/dashboard; `llms.txt` and official skills; hosted MCP GA with Claude plugin. Free instance spins down after 15 min idle with ~1 min cold start (violates the < 1 s NFR on first hit); Starter $7 always-on in Frankfurt; Hobby workspace bandwidth cut to 5 GB (2026-04). Needs `@astrojs/node` + `HOST=0.0.0.0`.

**Railway** — `railway up`, `railway logs`; rollback dashboard-only; `llms.txt`; hosted MCP GA. ~$5/mo effective (Hobby credit); `railway.json` deprecated (cutoff 2026-12-01) in favour of `.railway/railway.ts`; Amsterdam region on all plans; SSR falls through to the generic Node path (needs `start` script + `@astrojs/node`).

**Fly.io** — `fly deploy`, `fly logs`, `fly secrets`; no rollback command (redeploy an older image; `fly.toml`/secrets not reverted); markdown docs on GitHub but no `llms.txt`; MCP experimental. No free tier (trial only), ~$1–4/mo for one auto-stopping machine; Dockerfile becomes yours to maintain; Warsaw region deprecated (use `fra`).

### Shortlisted Platforms

#### 1. Vercel (Recommended — chosen after cross-check)

Known to the developer, $0 at MVP scale, Frankfurt region, first-class GitHub previews, agent-readable docs and a CLI that covers deploy / promote / rollback / logs. Gap vs. Cloudflare: MCP still in beta, Hobby rollback depth of one, 1-hour log retention, and the adapter swap.

#### 2. Cloudflare Workers (Runner-up — highest raw score)

Five passes, adapter already wired, `$0` or `$5` flat. Lost on the cross-check: Free-plan CPU ceiling for React SSR + Supabase auth, adapter-provisioned bindings that complicate first deploy and rollback, and no prior familiarity under a four-day deadline.

#### 3. Netlify

Same familiarity advantage as Vercel and the strongest MCP story, but on the Free plan functions run in Ohio and production deploys burn credits fast — both cut against an iteration-heavy MVP with an EU database.

## Anti-Bias Cross-Check: Vercel

(Cloudflare was cross-checked first as the top scorer; its findings are in the risk register with source "Cross-check (Cloudflare)". The developer then switched to Vercel, which was cross-checked again below.)

### Devil's Advocate — Weaknesses

1. Adapter swap on a four-day runway: remove `@astrojs/cloudflare` + `wrangler`, add `@astrojs/vercel@^10` (10.0.8; `latest` 11.x needs Astro 7), rewrite `astro.config.mjs`, delete `wrangler.jsonc`. Vercel's own Astro page still shows v9-era imports (`@astrojs/vercel/serverless`) — an agent following it writes config that v10 rejects.
2. Default region `iad1` with Supabase in the EU: every `getUser()` in middleware crosses the Atlantic; the "< 1 s validation" NFR fails unless `regions: ["fra1"]` is set.
3. Hobby is non-commercial only. A course project qualifies; any monetisation, ads, or paid work on it forces Pro ($20/mo).
4. Git integration deploys every push to `main`; if `vercel --prod` is ever added to GitHub Actions, the same commit deploys twice.
5. Hobby rollback reaches only the previous deployment and logs are retained for one hour — incidents older than that are unrecoverable.

### Pre-Mortem — How This Could Fail

The adapter swap took an evening instead of an hour: the agent copied config from Vercel's docs, `@astrojs/vercel/serverless` did not exist in v10, and `npx astro add vercel` pulled 11.x and demanded Astro 7. Once fixed, the deploy went to `iad1` because nobody set a region; sign-in worked, but every verification step took 1.5 s on the round trip to Supabase in Frankfurt, and the team blamed "slow Supabase". Secrets were put in `.dev.vars` out of starter habit — Vercel never reads it; the build passed anyway (fields are `optional: true`) and production showed the "Supabase not configured" banner. On deadline day someone added `vercel --prod` to GitHub Actions "to be safe"; the git integration deployed in parallel and production flip-flopped between two builds for fifteen minutes. Rollback went back one deployment — not far enough — and the logs from the incident had expired after an hour. Every assumption — "I know Vercel", "the adapter is a formality", "the region sorts itself out" — was unverified.

### Unknown Unknowns

- `@astrojs/vercel` v10 removed the `/serverless` and `/static` entrypoints and `functionPerRoute`; `edgeMiddleware` became `middlewareMode: 'edge'`. The Edge runtime is legacy — stay on Node (Fluid Compute).
- After the swap `astro dev` is plain Node, no longer workerd; secrets move from `.dev.vars` to `.env` / `.env.local` (`vercel env pull` writes `.env.local`). `CLAUDE.md` and `README.md` still describe `.dev.vars` and `wrangler` — both need updating.
- Vercel defaults to Node 24; `.nvmrc` says 22.14; Node 20 is deprecated on 2026-10-01. Pin with `"engines": {"node": "22.x"}` or in project settings.
- `astro:env` fields are `optional: true`: missing env vars on Vercel do not fail the build — the same silent "auth disabled" mode as locally.
- Functions are archived after two weeks idle (+~1 s on the next request) — realistic for a single-user app.
- `vercel logs --follow` streams for at most 5 minutes; `@supabase/ssr` sets `no-cache` — never add `s-maxage` on authenticated routes.
- `context/foundation/tech-stack.md` (`deployment_target: cloudflare-pages`, `ci_default_flow: auto-deploy-on-merge` via GitHub Actions) is now inconsistent with this decision and must be corrected outside this skill.

## Operational Story

- **Preview deploys**: the Vercel GitHub integration builds every push; PRs get a unique preview URL commented on the PR. Previews are gated by Vercel Authentication (Deployment Protection) by default, so reviewers need a Vercel login or a bypass token; fork PRs require an explicit approval before they build.
- **Secrets**: `SUPABASE_URL` / `SUPABASE_KEY` live in Vercel project environment variables scoped to Production / Preview / Development (`vercel env add`, `vercel env ls`); `vercel env pull .env.local` mirrors them locally (`.env.local` is gitignored). GitHub Actions needs none — CI only lints and builds, and the build passes without secrets. Rotation: change the value in Vercel, redeploy (`vercel --prod` or an empty commit); Supabase keys rotate in the Supabase dashboard first.
- **Rollback**: `vercel rollback` (Hobby: to the immediately previous production deployment) or `vercel promote <deployment-url>` for any older build; takes seconds, no rebuild. Supabase schema migrations are not rolled back by this — keep migrations backward-compatible for one release.
- **Approval**: a human runs `vercel --prod`, `vercel promote`, `vercel rollback`, changes production env vars, and attaches domains. An agent may create preview deployments (`vercel`), run `vercel build` locally, read logs, and pull env vars for development.
- **Logs**: `vercel logs <deployment-url-or-id> --follow` (5-minute cap) or `vercel logs --level error --since 1h --json`; `vercel inspect <url>` for build metadata; the Vercel MCP server (public beta) exposes the same read-only.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Adapter swap installs `@astrojs/vercel` 11.x (needs Astro 7) or uses removed v9 entrypoints | Devil's advocate | H | M | `npm i @astrojs/vercel@^10`; `import vercel from "@astrojs/vercel"`; ignore Vercel's Astro page, follow docs.astro.build |
| Functions deployed to `iad1`, Supabase in EU → NFR < 1 s fails | Devil's advocate / Pre-mortem | H | H | `vercel.json` `{ "regions": ["fra1"] }` before first deploy; Supabase project in `eu-central-1` |
| Secrets left in `.dev.vars`; production runs in "auth disabled" mode with a green build | Pre-mortem / Unknown unknowns | M | H | Set env vars in Vercel first; `vercel env pull .env.local`; delete `.dev.vars` mention from docs; smoke-test `/auth/signin` after deploy |
| Double deploy: git integration + `vercel --prod` in CI | Devil's advocate | M | M | CI never deploys (lint + build only); git integration owns production; if CI must deploy, set `"git": {"deploymentEnabled": false}` |
| Hobby rollback depth = 1, logs = 1 h | Devil's advocate | M | M | `vercel promote <url>` to reach older builds; capture `vercel logs --json` into the PR when an incident happens |
| Node 24 default on Vercel vs Node 22 locally | Unknown unknowns | M | L | `"engines": {"node": "22.x"}` in `package.json` |
| Hobby non-commercial clause | Devil's advocate | L | M | Stay non-commercial; budget Pro $20/mo if the product is ever monetised |
| Stale `tech-stack.md`, `wrangler.jsonc`, `CLAUDE.md`, README after the swap | Unknown unknowns | H | M | Update `tech-stack.md` (`deployment_target: vercel`), delete `wrangler.jsonc` + `public/.assetsignore`, fix Commands in `CLAUDE.md`, rewrite README Deployment |
| Cloudflare Free 10 ms CPU ceiling for React SSR + auth (would have applied to the runner-up) | Cross-check (Cloudflare) | M | H | Not applicable on Vercel; if ever switching back, budget the $5 Paid plan from day one |
| Cloudflare adapter auto-provisions KV/Images bindings and blocks rollback across binding changes | Cross-check (Cloudflare) | M | M | Not applicable on Vercel; recorded for the runner-up |

## Getting Started

Validated against the pinned versions in the repo (Astro 6.3.1, `@astrojs/cloudflare` 13.5.0, `wrangler` 4.90.0) on 2026-09-12.

1. **Swap the adapter** (pin v10 — `latest` requires Astro 7):
   `npm uninstall @astrojs/cloudflare wrangler && npm install @astrojs/vercel@^10`
   In `astro.config.mjs`: `import vercel from "@astrojs/vercel"` and `adapter: vercel()` (keep `output: "server"` and the `env.schema`). Delete `wrangler.jsonc` and `public/.assetsignore`. Add `"engines": {"node": "22.x"}` to `package.json`. Verify: `npm run build` produces `.vercel/output/`.
2. **Region and project config**: create `vercel.json` with `{ "regions": ["fra1"] }`. Move local secrets from `.dev.vars` to `.env` (Astro dev now runs on Node).
3. **Link and configure**: `npx vercel login`, `npx vercel link` (creates `.vercel/`, gitignored), then `npx vercel env add SUPABASE_URL production` and `preview` (repeat for `SUPABASE_KEY`); `npx vercel env pull .env.local` for local parity.
4. **First deploy**: `npx vercel` (preview URL) → open `/auth/signin` and confirm the "Supabase not configured" banner is gone → `npx vercel --prod`.
5. **Wire git**: connect `alabilinska/authenticheck` in the Vercel dashboard so `main` auto-deploys and PRs get previews; keep `.github/workflows/ci.yml` as lint + build only. Then correct `context/foundation/tech-stack.md` (`deployment_target: vercel`) and the `.dev.vars` / `wrangler` mentions in `CLAUDE.md` and `README.md`.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
