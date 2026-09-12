---
project: Authenticheck
platform: Cloudflare Workers (static assets)
written: 2026-09-12
status: in progress
inputs: context/foundation/tech-stack.md, context/foundation/infrastructure.md
---

# Deployment plan — Authenticheck → Cloudflare Workers (first deploy)

## Context

Module 1 closes with the first production deploy. The three foundation contracts are consistent: `context/foundation/prd.md` (what), `tech-stack.md` (Astro 6.3.1 SSR + `@astrojs/cloudflare` 13.5.0 + `wrangler` 4.90.0, `deployment_target: cloudflare-workers`), `infrastructure.md` (Cloudflare Workers with static assets; risk register + Getting Started). The scaffold already targets Workers — `astro dev` runs on workerd, `npm run build` passes locally and in CI — but nothing has been deployed: `wrangler` is not authenticated, the Worker is still named `10x-astro-starter`, there is no placement hint or image-service override, and no Supabase project exists (the app runs in its "Supabase not configured" mode).

Goal: `https://authenticheck.<subdomain>.workers.dev` serving `main`, production auto-deploys owned by Cloudflare (Workers Builds), GitHub Actions kept to lint + build, and the repo docs corrected to match.

## Decisions (user, 2026-09-12)

- **Supabase**: deploy first *without* it (banner + disabled auth are expected on v1). Secrets via `wrangler secret put` become a later phase once a Supabase project exists.
- **Plan**: Workers **Free**. Upgrade to Paid ($5/mo) only when a `1102` (CPU) error appears or before the first external user — manual, on request.
- **Auto-deploy**: **Workers Builds** deploys `main`; `.github/workflows/ci.yml` stays lint + build. One deployer — never add `wrangler deploy` to CI; no local `wrangler deploy` on `main` after Phase 4.
- **SESSION KV**: declare it explicitly in `wrangler.jsonc` (create with `wrangler kv namespace create`) rather than relying on auto-provisioning — see finding 2.

## Three findings that correct `infrastructure.md` (verified read-only today)

1. **`compatibility_date` cannot be raised to 2026-09-12.** `astro dev` and the prerender step of `astro build` run on the workerd binary pinned by the toolchain (`@cloudflare/workerd-darwin-arm64` 1.20260507.1, miniflare 4.20260507.1); the newest date it accepts is **2026-05-14** (WP-0: a build at 2026-05-26 failed with "newest date supported by this server binary is 2026-05-14"; the string 2026-05-26 is present in the binary but not accepted). Use 2026-05-14; keep `"nodejs_compat"` explicit (the 2026-08-04 by-default threshold is out of reach). `process` v2 is not available.
2. **The auto-provisioned SESSION KV id is never written back to `wrangler.jsonc`.** Wrangler deploys from the *redirected* config `.wrangler/deploy/config.json → dist/server/wrangler.json`, and provisioning only patches bindings already present in the user config. Without an explicit entry the namespace `authenticheck-session` exists only in Worker settings, invisible in git. Hence the explicit-KV decision.
3. **`dist/server/wrangler.json` is the deploy-time source of truth**, not `wrangler.jsonc`: the adapter rewrites `main` → `entry.mjs`, `assets.directory` → `../client`, and injects `kv_namespaces: [{binding: "SESSION"}]` and `images: {binding: "IMAGES"}` (verified in the current build output). Always `npm run build` before any `wrangler` command; inspect that file after every config change.

## Human-only steps (browser, irreversible, or billable)

1. `npx wrangler login` — browser OAuth consent (scopes incl. workers/KV write); verify with `npx wrangler whoami`.
2. Claim the `workers.dev` subdomain in the dashboard if none exists (renaming later changes every URL).
3. Production promote (`wrangler versions deploy` / `wrangler deploy`) and `wrangler rollback`.
4. `wrangler secret put SUPABASE_URL|SUPABASE_KEY` — later, when Supabase exists (each put creates + deploys a version).
5. Workers Builds: install the Cloudflare GitHub App on `alabilinska/authenticheck`, configure build settings (dashboard only).
6. Plan upgrade Free → Paid — on request.

Agent-safe: config/doc edits, `npm run build`, `wrangler deploy --dry-run`, `wrangler versions upload` (preview), `versions list`, `deployments status/list`, `tail`, `kv namespace create/list`, `secret list`, curl checks.

## Phases

### Phase 0 — Worker config (repo only, no Cloudflare contact)

- [x] `wrangler.jsonc`: `name` → `"authenticheck"`; `compatibility_date` → `"2026-05-14"`; keep `compatibility_flags: ["nodejs_compat"]`; add `"placement": { "region": "aws:eu-central-1" }`; keep `assets`/`observability`. `kv_namespaces` entry is added in Phase 1 once the id exists.
- [x] `astro.config.mjs`: `adapter: cloudflare({ imageService: "compile" })` — removes the `images` binding from the generated config (dev keeps a harmless local IMAGES binding).
- [x] `package.json` `name` → `"authenticheck"` (cosmetic). Lockfile name left as `10x-astro-starter`: `npm install --package-lock-only` added ~60 unrelated `@tailwindcss/oxide-wasm32-wasi` entries, so it was reverted.
- [x] Verify — WP-0 result, re-checked by orchestrator: `authenticheck 2026-05-14 {'region': 'aws:eu-central-1'} False ['SESSION']`; dry-run bindings `env.SESSION` (KV), `env.ASSETS`, no `env.IMAGES`; `/` 200, `/dashboard` 302 → `/auth/signin`; lint 0. Spec: `npm run build && npm run lint`; `dist/server/wrangler.json` shows the new name, date, placement, `kv_namespaces` SESSION, **no** `images`; `npx wrangler deploy --dry-run` lists `env.SESSION` + `env.ASSETS`; `npm run dev` → `/dashboard` 302 → `/auth/signin`.
- [x] Commit: `chore(deploy): worker config for first Cloudflare deploy` → `bce1efa`.

### Phase 1 — Auth + KV namespace (human gate: login)

- [ ] **Human**: `npx wrangler login` → `npx wrangler whoami` shows account + id. Claim subdomain if the dashboard shows none.
- [ ] `npx wrangler kv namespace create SESSION` → paste the printed `{ "binding": "SESSION", "id": "…" }` into `wrangler.jsonc` `kv_namespaces`. Rebuild; confirm the id appears in `dist/server/wrangler.json`. Commit.
- [ ] Secrets: **skipped by decision** (no Supabase yet). `.dev.vars` stays absent.

### Phase 2 — Preview upload + verification (agent)

- [ ] `npm run build && npx wrangler versions upload --message "first upload" --tag v0.0.1 --preview-alias first` → expect `Worker Version ID` + `Version Preview URL` (`https://<id8>-authenticheck.<sub>.workers.dev`) and alias URL. If wrangler reports the Worker does not exist yet, fall back to `npx wrangler deploy --message "first deploy"` (goes live in not-configured mode — acceptable) and continue with Phase 3 checks.
- [ ] Verify against the preview URL (see Verification). `npx wrangler versions list` shows v0.0.1.

### Phase 3 — Production + rollback rehearsal (human gate: promote)

- [ ] **Human**: `npx wrangler versions deploy <version-id>@100 --message "v0.0.1 to prod"` (or `npm run build && npx wrangler deploy --message "v0.0.1"`). Output ends with `https://authenticheck.<sub>.workers.dev`.
- [ ] `npx wrangler deployments status` → version at 100 %. Run the production curls with `npx wrangler tail --format pretty --status error` open in a second terminal — expect silence.
- [ ] **Rollback rehearsal**: second deploy (`--message "v0.0.2"`, trivial change) → `npx wrangler rollback -m "rehearsal"` picks the previous version, warns that bound resources are not rolled back, asks to confirm → then redeploy head. Never delete `authenticheck-session` while any version references it.
- [ ] Later (when Supabase exists): **human** `npx wrangler secret put SUPABASE_URL` / `SUPABASE_KEY` (project in `eu-central-1`); banner disappears without a rebuild; also write both into local `.dev.vars` (not `.env` — wrangler ignores `.env` when `.dev.vars` exists). If `1102` shows in `tail` → Paid plan.

### Phase 4 — Workers Builds (human, dashboard)

- [ ] Workers & Pages → `authenticheck` → Settings → Builds → Connect → install the "Cloudflare Workers & Pages" GitHub App with access to `authenticheck` only → production branch `main`. Build command `npm run build`; deploy command `npx wrangler deploy` (default); non-production branches `npx wrangler versions upload` (enable "builds for non-production branches" for PR previews). Root `/`. No build variables (build passes without `SUPABASE_*`; `.nvmrc` pins Node 22.14). Dashboard Worker name must equal `wrangler.jsonc` `name`.
- [ ] Trigger by pushing the Phase 5 docs commit → Deployments tab shows the build; `npx wrangler deployments list` shows a new deployment with GitHub metadata; production curls pass. From now on production changes only via merge to `main`.

### Phase 5 — Docs and contracts (agent)

- [x] (WP-5a, `c7efc2e`) `README.md` Deployment: Worker `authenticheck`; preview `npm run build && npx wrangler versions upload`; manual prod `npx wrangler deploy` (emergencies only — Workers Builds owns `main`); `wrangler secret put SUPABASE_URL|SUPABASE_KEY`; rollback + tail commands. README "CI" section: `master` → `main`.
- [x] (WP-5a, `c7efc2e`; +5 lines net, starter-name bullet removed) `CLAUDE.md` Commands: add `npx wrangler versions upload` (agent-safe preview), `deploy` (human), `tail --status error`, `deployments status`, `rollback`; note the compat-date ceiling (2026-05-14 with the pinned workerd) and that `dist/server/wrangler.json` is what deploys. Drop the "rename before first deploy" bullet once renamed.
- [x] (WP-5a, `c7efc2e`) `context/foundation/infrastructure.md` Getting Started: step 1 (compat date = 2026-05-14, not today), step 3 (KV id is not written back — declare it explicitly). Register the three findings in the risk register.
- [ ] Tick this plan's checkboxes (`context/foundation/deployment-plan.md`) with outcomes from the WP reports.
- [x] Commit `docs: deployment flow for Cloudflare Workers` → `c7efc2e` (local; its push by the human is the Phase 4 trigger). Note: `npx prettier --check CLAUDE.md` fails on lines inside the 10x-cli block only — pre-existing, block is tool-managed, not touched.

## Edge cases

- **Worker name is effectively irreversible**: renaming after the first deploy creates a new Worker (new URL, new KV). Rename in Phase 0, never later.
- **Free plan 10 ms CPU → `1102`** only in production; middleware's `getUser()` becomes the main CPU cost once Supabase is on. Detect with `tail --status error`; fix = Paid.
- **Banner in production** = expected until secrets exist; afterwards it means a mistyped secret name (`npx wrangler secret list`).
- **Double deploy** if CI ever gains `wrangler deploy` or local deploys continue after Phase 4.
- **Stale `dist/`**: `wrangler deploy` without a fresh build deploys old output. Workers Builds always builds first; locally, always chain `npm run build &&`.
- **Rollback refused** when a version's bound KV was deleted/replaced, or DO classes changed; secret changes only trigger a confirmation (API 10220).

## Verification

- Phase 0: `grep -oE '"(name|compatibility_date|placement|images)"[^,}]*' dist/server/wrangler.json`; `npx wrangler deploy --dry-run`; `curl -sI localhost:4321/dashboard | grep -iE '^HTTP|^location'` → 302 `/auth/signin`.
- Phase 1: `npx wrangler whoami`; `npx wrangler kv namespace list` shows `authenticheck-session` (or the created name).
- Phase 2/3 (`$U` = preview or prod URL): `/` 200; `/auth/signin` 200; `/dashboard` 302 → `/auth/signin`; `/does-not-exist` 404; `curl -s $U/ | grep -c "Supabase nie jest skonfigurowany"` → 1 (until secrets); a `/_astro/*.css` asset 200; `curl -o /dev/null -w "%{http_code} %{time_total}\n" $U/auth/signin` for timing; `npx wrangler deployments status`; `tail --status error` silent.
- Phase 4: push to `main` → dashboard build green → `npx wrangler deployments list` shows the new deployment → production curls pass; `.github/workflows/ci.yml` still contains no `wrangler`.

## Status

Written 2026-09-12 (plan approved by the developer). This file is the execution contract: each work package below is dispatched to a subagent verbatim, and each checkbox is ticked with the observed result (command output line, URL, version id) as work lands. Human gates are marked; agents never perform them.

## Subagent work packages (dispatch spec)

Every package is self-contained: a fresh `general-purpose` agent gets the package text plus the repo path and must not read the conversation. Rules for all packages: run from `/Users/alicjabilinska/Documents/Coding/10xdevs/project`; never run `wrangler deploy` (without `--dry-run`), `wrangler versions deploy`, `wrangler rollback`, `wrangler secret put`, `wrangler login`, or any `git push` — those are human gates; never modify `context/` except the files a package names; report in the fixed format at the end. Packages run **sequentially** (they share the working tree); WP-5a may run in parallel with WP-2.

### WP-0 — Worker config (agent)

- **Goal**: `wrangler.jsonc`, `astro.config.mjs`, `package.json` match the Phase 0 spec; build/lint green; changes committed locally.
- **Preconditions**: clean working tree on `main`; `node_modules` present; `.astro/` types generated (`npx astro sync` if `npm run lint` shows unresolved-type errors).
- **Do**: (1) `wrangler.jsonc` — set `"name": "authenticheck"`, `"compatibility_date": "2026-05-14"`, keep `compatibility_flags: ["nodejs_compat"]`, add `"placement": { "region": "aws:eu-central-1" }`, keep `assets`/`observability`; do not add `kv_namespaces` yet. (2) `astro.config.mjs` — `adapter: cloudflare({ imageService: "compile" })`. (3) `package.json` — `"name": "authenticheck"`; run `npm install --package-lock-only` so the lockfile name follows. (4) `npm run build && npm run lint`. (5) `npx wrangler deploy --dry-run`. (6) `npm run dev` in background, curl, stop it.
- **Verify** (all must hold): `python3 -c "import json;d=json.load(open('dist/server/wrangler.json'));print(d['name'],d['compatibility_date'],d.get('placement'),'images' in d,[k['binding'] for k in d['kv_namespaces']])"` → `authenticheck 2026-05-14 {'region': 'aws:eu-central-1'} False ['SESSION']`; dry-run output lists `env.SESSION` and `env.ASSETS` and no `env.IMAGES`; `curl -sI http://localhost:4321/dashboard` → `HTTP/1.1 302` + `location: /auth/signin`; `npm run lint` exit 0.
- **Stop if**: build or dev fails with "newest date supported by this server binary is X" → set date to X, re-verify, and report X; any other build/lint failure → report the last 20 lines, do not commit.
- **Commit**: `chore(deploy): worker config for first Cloudflare deploy` (attribution trailer as in repo history). No push.
- **Report**: `WP-0 | status ok/failed | compat_date=<x> | dry-run bindings=<list> | commit=<sha> | notes`.

### WP-1 — KV namespace (agent; runs only after the human has completed `wrangler login`)

- **Preconditions**: `npx wrangler whoami` prints an account (else stop and report "not authenticated").
- **Do**: `npx wrangler kv namespace create SESSION` → copy the printed `id` into `wrangler.jsonc` as `"kv_namespaces": [{ "binding": "SESSION", "id": "<id>" }]`; `npm run build`.
- **Verify**: `npx wrangler kv namespace list` contains the new namespace; `dist/server/wrangler.json` `kv_namespaces[0].id` equals it; `npx wrangler deploy --dry-run` succeeds.
- **Commit**: `chore(deploy): pin SESSION KV namespace`. No push.
- **Report**: `WP-1 | status | namespace_title=<t> | id=<id> | commit=<sha>`.

### WP-2 — Preview upload + verification (agent)

- **Preconditions**: WP-1 done; authenticated; working tree clean.
- **Do**: `npm run build && npx wrangler versions upload --message "first upload" --tag v0.0.1 --preview-alias first` → capture `Worker Version ID` and `Version Preview URL`. If wrangler says the Worker does not exist / cannot upload a version before a first deploy: **stop and report** — the human runs the first `wrangler deploy` (Phase 3) and WP-2 is re-run afterwards.
- **Verify** with `$U` = preview URL: `curl -sI $U/ | head -1` → 200; `curl -sI $U/auth/signin | head -1` → 200; `curl -sI $U/dashboard | grep -iE '^HTTP|^location'` → 302 + `/auth/signin`; `curl -sI $U/does-not-exist | head -1` → 404; `curl -s $U/ | grep -c "Supabase nie jest skonfigurowany"` → 1; `curl -sI "$U$(curl -s $U/ | grep -o '/_astro/[^"]*\.css' | head -1)" | head -1` → 200; `curl -s -o /dev/null -w "%{http_code} %{time_total}\n" $U/auth/signin` (record time); `npx wrangler versions list` shows the version.
- **Report**: `WP-2 | status | version_id=<id> | preview_url=<url> | alias_url=<url> | checks=7/7 | signin_time=<s>`. Every failed check with the actual output.

### WP-3v — Production verification + rollback rehearsal support (agent; after the human promoted)

- **Preconditions**: human confirms `npx wrangler versions deploy <id>@100` (or `wrangler deploy`) ran; `$P` = `https://authenticheck.<sub>.workers.dev` supplied by the human.
- **Do**: repeat the WP-2 curl set against `$P`; `npx wrangler deployments status`; run `npx wrangler tail --format pretty --status error` for 60 s in background while re-running the curls, capture output. For the rehearsal, prepare the trivial change (e.g. `--message "v0.0.2"` on an otherwise identical build) and hand the two commands (`wrangler deploy`, `wrangler rollback -m "rehearsal"`) to the human — do not run them.
- **Verify**: 7/7 curls; `deployments status` shows the version at 100 %; tail output empty of errors.
- **Report**: `WP-3v | status | prod_url | live_version=<id> | checks=7/7 | tail_errors=0 | rehearsal_commands=<two lines>`.

### WP-4v — Workers Builds verification (agent; after the human connected the repo)

- **Do**: after the Phase 5 docs commit is pushed by the human, poll `npx wrangler deployments list` (every 30 s, max 10 min) until a new deployment appears; then run the WP-2 curl set against `$P`; `grep -c wrangler .github/workflows/ci.yml` → 0.
- **Report**: `WP-4v | status | new_deployment=<id> | source=<metadata line> | checks=7/7`.

### WP-5a — Docs (agent; may run in parallel with WP-2)

- **Do**: `README.md` — rewrite "Deployment" (Worker `authenticheck`; preview `npm run build && npx wrangler versions upload`; manual prod `npx wrangler deploy` for emergencies only — Workers Builds owns `main`; `wrangler secret put SUPABASE_URL|SUPABASE_KEY`; `wrangler rollback`; `wrangler tail --status error`) and fix "CI" (`master` → `main`). `CLAUDE.md` Commands — add the five wrangler commands with human/agent markers, the compat-date ceiling note, and "`dist/server/wrangler.json` is what deploys"; delete the "rename before first deploy" bullet. `context/foundation/infrastructure.md` — Getting Started step 1 (date = 2026-05-14) and step 3 (KV declared explicitly); add the three findings to the risk register. `context/foundation/deployment-plan.md` — tick completed checkboxes with results from WP reports.
- **Verify**: `npm run lint` (prettier on `.md` via lint-staged is not run by lint — run `npx prettier --check README.md CLAUDE.md`); `grep -n master README.md` → none; `grep -c '10x-astro-starter' CLAUDE.md README.md` reports only historical mentions, if any.
- **Commit**: `docs: deployment flow for Cloudflare Workers`. No push (the human's push is the Phase 4 trigger).
- **Report**: `WP-5a | status | files=<list> | commit=<sha>`.

### Human gates (not packages)

H1 `npx wrangler login` + `whoami` (before WP-1) · H2 subdomain claim if needed · H3 promote to production (`versions deploy`/`deploy`) after WP-2 report · H4 rollback rehearsal (two commands from WP-3v) · H5 Workers Builds connect (dashboard) · H6 `git push origin main` of the docs commit (Phase 4 trigger) · later: H7 `secret put` ×2 when Supabase exists, H8 Paid plan on `1102`.

## Critical files

- `wrangler.jsonc`, `astro.config.mjs`, `package.json` (WP-0/WP-1)
- `README.md`, `CLAUDE.md`, `context/foundation/infrastructure.md`, `context/foundation/deployment-plan.md` (WP-5a)
- Inspect after every build: `dist/server/wrangler.json` (gitignored, deploy-time truth)
