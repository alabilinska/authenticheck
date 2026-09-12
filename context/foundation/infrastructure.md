---
project: Authenticheck
researched_at: 2026-09-12
recommended_platform: Cloudflare Workers
runner_up: Vercel
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Astro 6.3.1 (SSR, React 19 islands)
  runtime: Cloudflare Workers (workerd) via @astrojs/cloudflare 13.5.0 + wrangler 4.90.0
---

## Recommendation

**Deploy on Cloudflare Workers (with static assets).**

Cloudflare is the only candidate that passes all five agent-friendly criteria — `wrangler` covers deploy, versioned rollback, log tailing and secrets without a browser; docs ship as `llms.txt` and per-page markdown; five official MCP servers carry no beta labels — and it is the platform the scaffold already targets: the adapter, `wrangler.jsonc` and the workerd-backed `astro dev` are in the repo today, so no adapter swap stands between the project and its first deploy. At the PRD's scale (single user, low QPS) it costs $0 on Free or $5/month flat on Paid, and an explicit placement hint keeps compute next to the Supabase project in the EU. The developer first switched to the runner-up (Vercel, the familiar platform) after the cross-check surfaced Cloudflare's risks, then reversed that decision; both cross-checks are recorded below and every Cloudflare risk has a concrete mitigation in the register. One correction to an upstream contract follows: `context/foundation/tech-stack.md` says `deployment_target: cloudflare-pages`, but `@astrojs/cloudflare` 13.x dropped Pages — the target is Workers, and Cloudflare itself now points new projects there.

## Platform Comparison

Research checked 2026-09-12. Interview constraints: persistent connections unknown (PRD suggests none), cost ≈ DX, existing familiarity with Vercel/Netlify, single region (Poland), external providers fine (Supabase stays). No hard filter dropped a platform; every candidate runs Astro 6 SSR, but only Cloudflare has its adapter already in the repo.

| Platform           | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration          | Total             |
| ------------------ | --------- | ------------------ | ------------------- | ----------------- | -------------------------- | ----------------- |
| Cloudflare Workers | Pass      | Pass               | Pass                | Pass              | Pass                       | 5 Pass            |
| Vercel             | Pass      | Pass               | Pass                | Pass              | Partial (MCP beta)         | 4 Pass, 1 Partial |
| Netlify            | Partial   | Pass               | Pass                | Pass              | Pass                       | 4 Pass, 1 Partial |
| Render             | Partial   | Pass               | Pass                | Pass              | Pass                       | 4 Pass, 1 Partial |
| Railway            | Partial   | Pass               | Pass                | Partial           | Pass                       | 3 Pass, 2 Partial |
| Fly.io             | Pass      | Partial            | Partial             | Partial           | Partial (MCP experimental) | 1 Pass, 4 Partial |

**Cloudflare Workers** — `wrangler deploy / rollback / tail / secret / versions` cover the whole loop; docs as `llms.txt` and per-page `.md`; five official MCP servers (API, docs, bindings, observability, builds) with no beta labels. Free plan: 100k requests/day, static-asset requests unlimited, but only 10 ms CPU per request; Paid $5/month: 10M requests, 30 s CPU, no overage at this scale. Pages is not deprecated but Cloudflare's own landing page now says "start new projects with Workers", and `@astrojs/cloudflare` 13.0 removed Pages support. `astro dev`, `astro preview` and prerendering already run on workerd through `@cloudflare/vite-plugin` — `wrangler dev` is not needed. Gotchas: the adapter auto-enables `SESSION` (KV) and `IMAGES` bindings; `wrangler rollback` refuses when bindings changed between versions; compute is global unless `placement.region` is set; Workers Logs on Free keep 3 days / 200k events.

**Vercel** — `vercel`, `vercel --prod`, `vercel rollback` (Hobby: previous deployment only), `vercel promote`, `vercel logs --follow`; docs as `llms.txt` / `Accept: text/markdown`. Fluid Compute GA; Edge runtime legacy. Hobby: $0 at this scale but non-commercial only, 1-hour logs, one region (default `iad1`, `fra1` selectable); Pro $20/month. Vercel MCP public beta. Requires swapping to `@astrojs/vercel@^10` (11.x needs Astro 7); Vercel's own Astro page shows outdated v9 imports. Git integration double-fires with an external CI that also deploys.

**Netlify** — `netlify deploy --prod`; rollback via `netlify api restoreSiteDeploy`; `llms.txt`; official hosted MCP and Agent Runners. Credit-based pricing: Free 300 credits, 15 per production deploy — twenty deploys exhaust it; Personal $9 is the realistic floor. Functions in Ohio by default; `fra` is Pro/Enterprise only. Adapter `@astrojs/netlify@7` for Astro 6.

**Render** — `render` CLI (`deploys create --wait`, `logs --tail`); rollback only via REST/dashboard; `llms.txt`; hosted MCP GA with a Claude plugin. Free instances spin down after 15 min idle (~1 min cold start — breaks the < 1 s NFR on first hit); Starter $7 always-on in Frankfurt; Hobby bandwidth cut to 5 GB. Needs `@astrojs/node` + `HOST=0.0.0.0`.

**Railway** — `railway up`, `railway logs`; rollback dashboard-only; `llms.txt`; hosted MCP GA. ~$5/month effective; `railway.json` deprecated (cutoff 2026-12-01) for `.railway/railway.ts`; Amsterdam on all plans; SSR needs `@astrojs/node` + a `start` script.

**Fly.io** — `fly deploy`, `fly logs`, `fly secrets`; no rollback command (redeploy an older image; `fly.toml`/secrets not reverted); markdown docs on GitHub, no `llms.txt`; MCP experimental. No free tier, ~$1–4/month for one auto-stopping machine; Dockerfile is yours to maintain; Warsaw region deprecated (use `fra`).

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Five passes, adapter and `wrangler.jsonc` already in place, `astro dev` already on workerd, $0–5/month, EU placement by one config key, GA MCP servers. Its risks (Free CPU ceiling, auto-provisioned bindings, rollback blocked across binding changes, no prior familiarity) are all addressed by the mitigations in the risk register.

#### 2. Vercel (Runner-up)

The platform the developer knows, $0 on Hobby, Frankfurt region, first-class GitHub previews. Gap vs. Cloudflare: MCP still in beta, Hobby rollback depth of one, 1-hour log retention, non-commercial clause, and a mandatory adapter swap with a documentation trap.

#### 3. Netlify

Same familiarity advantage and the strongest MCP story, but on Free functions run in Ohio and production deploys burn credits — both cut against an iteration-heavy MVP with an EU database.

## Anti-Bias Cross-Check: Cloudflare Workers

> **Historical analysis (2026-09-12, before the first deploy).** Findings 2 (Pages target) and 3 (auto-provisioned bindings) were resolved during the deploy — see the risk register and `context/deployment/deploy-plan.md`.

(Run twice in this session: first on Cloudflare as top scorer, then on Vercel after the developer switched, then the developer reversed to Cloudflare. Vercel's findings are kept in the risk register under source "Cross-check (Vercel)" so the runner-up stays auditable.)

### Devil's Advocate — Weaknesses

1. **Free plan: 10 ms CPU per request.** React 19 SSR plus Supabase cookie parsing and `getUser()` in middleware on every request can exceed it under load that local dev never shows → intermittent `1102 Worker exceeded CPU time` errors in production only. The honest budget is the Paid plan ($5/month, 30 s CPU).
2. **`tech-stack.md` says `cloudflare-pages`; the adapter cannot target Pages.** The Lesson 2 contract is stale; a deploy plan built on it would aim at a product Cloudflare no longer recommends.
3. **Bindings nobody asked for.** The adapter auto-enables `SESSION` (KV) and `IMAGES`. The first `wrangler deploy` may require creating a KV namespace and enabling Cloudflare Images; a CI API token needs KV permissions. The default image service (`cloudflare-binding`) is passthrough in dev, so a missing Images product fails only in production.
4. **Rollback is blocked when bindings changed between versions** — precisely the moment after KV/Images are added.
5. **No prior familiarity, four-day deadline.** Workers vs. Pages, `wrangler`, bindings, compatibility flags are a new mental model; every hour learning them is an hour not spent on Balenciaga rules.

### Pre-Mortem — How This Could Fail

The team took Cloudflare because the starter already had it. The first deploy failed on a missing KV namespace — half an evening in the bindings docs. The second went through with `compatibility_date` 2026-05-08 and an explicit `nodejs_compat` flag; nobody checked that `process` v2 is not the default before 2026-08-04, and Supabase SSR behaved slightly differently from local. The app worked — on the Free plan — until the day a report with six rules and a React render crossed 10 ms of CPU and users started getting `1102` at random, only in production. Instead of moving to Paid, the team optimised SSR. Meanwhile Workers Builds and GitHub Actions had both been enabled and deployed the same commit twice, and the rollback after a bad deploy refused because the previous version had a different set of bindings. The deadline passed with a working localhost and a production that "sometimes works". Every assumption — "the starter handles it", "Free is enough", "CI as usual" — was unverified.

### Unknown Unknowns

- `astro dev` already runs on workerd via `@cloudflare/vite-plugin` — do not add `wrangler dev`; dev secrets come from `.dev.vars`, not `.env`.
- Workers run globally; Supabase lives in one EU region. Without `placement.region: "aws:eu-central-1"` in `wrangler.jsonc`, each auth call may originate from any PoP. Placement hints are GA; the host-probe mode is experimental.
- Enabling Workers Builds (git integration) while GitHub Actions also deploys means a double deploy per commit. The lesson's deploy prompt wants platform-side auto-deploy; then CI must only lint and build. Today CI does not deploy — keep it that way.
- `wrangler tail` is live-only; Workers Logs on Free keep 3 days / 200k events — last week's incident does not exist.
- Do not bump `@astrojs/cloudflare` to 14.x or Astro to 7 before deploying — 14.x requires Astro 7, and `astro:schema` is removed in 7.
- `compatibility_date: 2026-05-08` predates the 2026-08-04 threshold after which `nodejs_compat` and `process` v2 are default; the explicit flag keeps it working, but `process` behaviour differs from what current docs describe until the date is raised.
- `wrangler.jsonc` still carries `"name": "10x-astro-starter"` — that string becomes the Worker name and `*.workers.dev` subdomain on first deploy.

## Operational Story

- **Preview deploys**: `wrangler versions upload` publishes a version without routing traffic and prints a preview URL (`<version-id>-<worker>.<subdomain>.workers.dev`); Workers Builds (git integration) can build non-production branches to preview URLs. Preview URLs are public unless fronted by Cloudflare Access; fork PRs are not built by Workers Builds.
- **Secrets**: `SUPABASE_URL` / `SUPABASE_KEY` live in Workers Secrets (`wrangler secret put SUPABASE_URL`), readable only by the Worker at runtime, never listed back by the CLI; local dev reads `.dev.vars` (gitignored). GitHub Actions needs none — CI lints and builds only. Rotation: `wrangler secret put` again (takes effect on the next deploy/version), rotate the key in Supabase first.
- **Rollback**: `wrangler rollback [VERSION_ID] --message "…"` — instant, up to 100 versions back, but refused if bindings or secrets changed between the two versions (then redeploy the older commit instead). Supabase migrations are not rolled back by this — keep them backward-compatible for one release.
- **Approval**: a human runs `wrangler deploy` to production, `wrangler rollback`, `wrangler secret put`, plan changes (Free → Paid) and domain/route changes. An agent may run `wrangler versions upload` (preview), `wrangler tail`, `wrangler deployments list`, `npm run build`, and read observability data.
- **Logs**: `wrangler tail --format pretty --status error` (live), `wrangler tail --format json` for parsing; historical queries in Workers Logs (dashboard or the `observability.mcp.cloudflare.com` MCP server, read-only); `wrangler deployments status` for what is live.

## Risk Register

| Risk                                                                                           | Source                        | Likelihood | Impact | Mitigation                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ----------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free-plan 10 ms CPU ceiling → intermittent `1102` on SSR + auth in production only             | Devil's advocate / Pre-mortem | M          | H      | Upgrade to Workers Paid ($5/mo) before the first real user; verify with `wrangler tail --status error` after deploy                                                                                                               |
| First deploy fails or prompts on auto-provisioned `SESSION` KV / `IMAGES` bindings             | Devil's advocate / Pre-mortem | H          | M      | Set `imageService: "compile"` in the adapter options (no Images product needed); let `wrangler deploy` create the KV namespace once, then commit the resulting `kv_namespaces` id; CI token gets KV edit permission               |
| Rollback refused after a binding/secret change                                                 | Devil's advocate / Pre-mortem | M          | M      | Make binding changes in a dedicated deploy with nothing else; if rollback is refused, redeploy the previous commit                                                                                                                |
| Global placement, Supabase in EU → auth round trips from far PoPs                              | Unknown unknowns              | M          | M      | `"placement": { "region": "aws:eu-central-1" }` in `wrangler.jsonc`; Supabase project in `eu-central-1`                                                                                                                           |
| Double deploy: Workers Builds + GitHub Actions both deploying                                  | Pre-mortem / Unknown unknowns | M          | M      | Exactly one deployer: Workers Builds owns production; CI stays lint + build (as today). Never add `wrangler deploy` to CI while the git integration is on                                                                         |
| `compatibility_date` 2026-05-08 vs. current defaults (`process` v2)                            | Unknown unknowns              | L          | L      | Set `compatibility_date` to `2026-05-14` (the pinned workerd's ceiling) with explicit `nodejs_compat`; raise it only with an `@astrojs/cloudflare`/`wrangler` upgrade and re-test `/auth/signin` locally (`astro dev` honours it) |
| Stale contract: `tech-stack.md` `deployment_target: cloudflare-pages`                          | Devil's advocate              | H          | M      | Correct to Workers in a follow-up commit; note that the starter registry card itself still lists `cloudflare-pages` **Resolved 2026-09-12** (`1069a4d`).                                                                          |
| `wrangler.jsonc` `name` = `10x-astro-starter` becomes the Worker name                          | Unknown unknowns              | H          | L      | Rename to `authenticheck` before first deploy (also `package.json` name)                                                                                                                                                          |
| No prior familiarity under a four-day deadline                                                 | Devil's advocate              | H          | M      | Deploy the untouched starter first (one evening), before any domain code; keep `wrangler` docs open via `developers.cloudflare.com/workers/llms.txt`                                                                              |
| `compatibility_date` capped at `2026-05-14` by the pinned workerd (1.20260507.1)               | Deploy planning (2026-09-12)  | L          | L      | Keep `nodejs_compat` explicit; bump `@astrojs/cloudflare`, `wrangler` and the date together (14.x needs Astro 7)                                                                                                                  |
| Auto-provisioned `SESSION` KV id is never written back, so the namespace is invisible in git   | Deploy planning (2026-09-12)  | M          | M      | Declare `SESSION` explicitly in `wrangler.jsonc` after `npx wrangler kv namespace create SESSION`                                                                                                                                 |
| Stale `dist/` deployed: `wrangler` reads `dist/server/wrangler.json`, not `wrangler.jsonc`     | Deploy planning (2026-09-12)  | M          | M      | Always `npm run build` before any `wrangler` command; Workers Builds builds before every deploy                                                                                                                                   |
| Runner-up trap: `@astrojs/vercel` `latest` needs Astro 7; Vercel's Astro page shows v9 imports | Cross-check (Vercel)          | —          | —      | Not applicable on Cloudflare; if ever switching, pin `@astrojs/vercel@^10`                                                                                                                                                        |
| Runner-up trap: Vercel default region `iad1`, Hobby non-commercial, 1-hour logs                | Cross-check (Vercel)          | —          | —      | Not applicable on Cloudflare; recorded for auditability                                                                                                                                                                           |

## Getting Started

> **Historical — pre-deploy instructions (2026-09-12).** The first production deploy happened on 2026-09-13: the Worker is live at <https://authenticheck.alicja-a-bilinska.workers.dev> and production now deploys from `main` via Workers Builds; `wrangler` is authenticated. For the current process use `context/deployment/deploy-plan.md` and the README "Deployment" section. The steps below record how the first deploy was prepared; do not repeat them.

Validated against the pinned versions in the repo (Astro 6.3.1, `@astrojs/cloudflare` 13.5.0, `wrangler` 4.90.0; `astro dev` already runs on workerd, CI does not deploy, `wrangler` not yet authenticated) on 2026-09-12. No adapter swap is needed.

1. **Fix `wrangler.jsonc` before anything touches Cloudflare**: `"name": "authenticheck"`; add `"placement": { "region": "aws:eu-central-1" }`; set `"compatibility_date"` to `"2026-05-14"`, the ceiling of the pinned workerd (keep `"compatibility_flags": ["nodejs_compat"]`). In `astro.config.mjs` pass `cloudflare({ imageService: "compile" })` to avoid the Images binding. Re-run `npm run build` and `npm run dev` — both still run on workerd locally.
2. **Authenticate and set secrets**: `npx wrangler login` (browser once), then `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY` (values from the Supabase project in `eu-central-1`). Locally, the same two keys go in `.dev.vars` (gitignored).
3. **First deploy as a preview**: `npm run build && npx wrangler versions upload` → open the printed preview URL, check `/auth/signin` renders without the "Supabase not configured" banner and `/dashboard` redirects when signed out. Before that, create the `SESSION` KV namespace explicitly with `npx wrangler kv namespace create SESSION` and paste its id into `wrangler.jsonc` — auto-provisioned ids are not written back.
4. **Promote to production**: `npx wrangler deploy` (or `npx wrangler versions deploy` to promote the uploaded version). Verify with `npx wrangler deployments status` and `npx wrangler tail --status error` while clicking through sign-up → sign-in → dashboard. Decide on Workers Paid ($5) now rather than after the first `1102`.
5. **Wire git and correct the contracts**: enable Workers Builds for `alabilinska/authenticheck` (production on `main`, previews on branches); keep `.github/workflows/ci.yml` as lint + build only. Then update `context/foundation/tech-stack.md` (`deployment_target` → Workers), `README.md` Deployment section, and `CLAUDE.md` Commands (`wrangler` flow, `.dev.vars`).

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
