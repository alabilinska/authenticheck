---
bootstrapped_at: 2026-09-11T09:19:12Z
starter_id: 10x-astro-starter
starter_name: "10x Astro Starter (Astro + Supabase + Cloudflare)"
project_name: authenticheck
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: authenticheck
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

A solo builder shipping a rule-based authenticity checker as a web app in one week of after-hours work, with a hard deadline four days out, needs a starter that already carries accounts, a database and a deploy path so every evening goes into the domain rules rather than plumbing. 10x Astro Starter is the recommended default for a web app in JavaScript/TypeScript and clears all four agent-friendly gates; its built-in auth and PostgreSQL cover the PRD's only technology-forcing requirement (sign-up, sign-in, password reset) first-class, while the small target scale and low request volume sit comfortably on the edge runtime. No payments, realtime, AI or background jobs are in scope — photo analysis and listing import are explicit PRD non-goals. Bootstrapper confidence is first-class, so scaffolding should be mostly smooth with the occasional manual step. Deployment lands on Cloudflare Pages (the starter's default), CI on GitHub Actions with auto-deploy on merge to main — the shape the starter ships with.

## Pre-scaffold verification

| Signal      | Value                                                        | Severity | Notes                                                     |
| ----------- | ------------------------------------------------------------ | -------- | --------------------------------------------------------- |
| npm package | not run                                                      | n/a      | cmd_template starts with `git clone`; no create-* package |
| GitHub repo | przeprogramowani/10x-astro-starter last pushed 2026-08-22    | fresh    | from card.docs_url; checked 2026-09-11 (20 days)          |

Local toolchain at scaffold time: node v24.18.0, npm 11.16.0, git 2.50.1.

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone (cloned into a temp directory, upstream `.git/` deleted before move-up)
**Exit code**: 0
**Files moved**: 19 top-level entries — .env.example, .github, .gitignore, .husky, .nvmrc, .prettierrc.json, .vscode, README.md, astro.config.mjs, components.json, eslint.config.js, node_modules, package-lock.json, package.json, public, src, supabase, tsconfig.json, wrangler.jsonc
**Conflicts (.scaffold siblings)**: CLAUDE.md
**.gitignore handling**: moved silently
**context/ entries dropped from scaffold**: none (starter ships no context/)
**.bootstrap-scaffold cleanup**: deleted (leftover paths: 0)

`npm install` result: added 773 packages, audited 774 packages in 18s. Install-time warnings: 2 deprecated packages (node-domexception, @babel/plugin-proposal-private-methods); npm `allow-scripts` reports 6 packages with install scripts not yet approved (esbuild ×2, fsevents, sharp, supabase, workerd) — run `npm approve-scripts --allow-scripts-pending` to review.

## Post-scaffold audit

**Tool**: npm audit --json (exit code 1 — informational; non-zero means findings exist)
**Summary**: 2 CRITICAL, 14 HIGH, 8 MODERATE, 3 LOW (27 total across 895 dependencies: 449 prod, 316 dev, 131 optional)
**Direct vs transitive**: 1/0/2/0 direct of total 2/14/8/3

#### CRITICAL findings

- **astro** <=7.2.7 — direct; advisories: GHSA-jrpj-wcv7-9fh9, GHSA-f48w-9m4c-m7f5, GHSA-7pw4-f3q4-r2p2, GHSA-4g3v-8h47-v7g6, GHSA-2pvr-wf23-7pc7, GHSA-8hv8-536x-4wqp, GHSA-26w7-cxv4-gfx2, GHSA-376h-93r7-7g6f; Astro: XSS via Unescaped Attribute Names in Spread Props; Astro: XSS via unescaped spread attribute names in renderHTMLElement (incomplete fix for CVE-2026-54298); Astro: Cross-site scripting via unescaped transition:* directive values on hydrated islands; Astro: Reflected XSS via unescaped View Tra; fix: yes
- **tar** <=7.5.20 — transitive; advisories: GHSA-vmf3-w455-68vh, GHSA-w8wr-v893-vjvp, GHSA-23hp-3jrh-7fpw, GHSA-8x88-c5mf-7j5w, GHSA-gvwx-54wh-qm9j, GHSA-r292-9mhp-454m; node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling); node-tar: Process crash via PAX numeric path type confusion; node-tar: Decompression/parse DoS via unlimited input; node-tar: Negative tar entry size c; fix: yes

#### HIGH findings

- **brace-expansion** <=1.1.17 || 3.0.0 - 5.0.8 — transitive; advisories: GHSA-3jxr-9vmj-r5cp, GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895, GHSA-rgw5-rvv9-x895; brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups; brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups; brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash; brace-expansion: DoS via; fix: yes
- **browserslist** <=4.28.6 — transitive; advisories: GHSA-c83g-rgw3-j3cx, GHSA-73wf-gq98-2v4g; Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM; Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats); fix: yes
- **devalue** 5.6.3 - 5.8.0 — transitive; advisories: GHSA-77vg-94rm-hx3p; Svelte devalue: DoS via sparse array deserialization; fix: yes
- **fast-uri** 3.0.0 - 3.1.5 — transitive; advisories: GHSA-v2hh-gcrm-f6hx, GHSA-7p8r-x3mc-p8w7, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp, GHSA-4c8g-83qw-93j6; fast-uri vulnerable to host confusion via literal backslash authority delimiter; fast-uri vulnerable to host confusion via backslash authority introducer; fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization; fast-uri vulnerable to server-side request forgery via repea; fix: yes
- **js-yaml** 4.0.0 - 4.3.1 — transitive; advisories: GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh; JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases; js-yaml: YAML merge-key chains can force quadratic CPU consumption; JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported; js-yaml: maxTotalMergeKeys does not limit CPU u; fix: yes
- **miniflare** <=0.0.0-fff677e35 || 3.20250204.0 - 5.20260801.0-alpha — transitive; advisories: n/a; via sharp; via undici; via ws; fix: yes
- **nanoid** <=3.3.17 — transitive; advisories: GHSA-28wg-ghj8-5hjv, GHSA-2v37-7h3g-55p8; nanoid: non-secure generators can loop indefinitely with negative size; nanoid: custom generators can loop indefinitely when size is zero; fix: yes
- **postcss** <=8.5.22 — transitive; advisories: GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849; PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset; PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure; fix: yes
- **sharp** <=0.35.4-rc.0 — transitive; advisories: GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c; sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591; sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545; fix: yes
- **smol-toml** <=1.7.0 — transitive; advisories: GHSA-7w5x-hrqm-74c2; smol-toml: Denial of Service via malformed TOML documents; fix: yes
- **svgo** 4.0.0 - 4.0.2 — transitive; advisories: GHSA-2p49-hgcm-8545, GHSA-w27v-7q3p-w38r, GHSA-4vpr-x523-8j87; SVGO removeScripts plugin leaves some executable scripts intact; SVGO: removeScripts allows executable links through namespace and control-character bypasses; SVGO: removeScripts incompletely sanitizes executable HTML in SVG foreignObject elements; fix: yes
- **undici** 7.0.0 - 7.28.0 — transitive; advisories: GHSA-vmh5-mc38-953g, GHSA-p88m-4jfj-68fv, GHSA-vxpw-j846-p89q, GHSA-hm92-r4w5-c3mj, GHSA-g8m3-5g58-fq7m, GHSA-pr7r-676h-xcf6, GHSA-8xcm-r25x-g524, GHSA-4cwx-7wf7-3272, GHSA-m8rv-5g2x-5cg5, GHSA-jr45-8vmc-qm54, GHSA-v3r7-h72x-cjcm, GHSA-35p6-xmwp-9g52; undici vulnerable to TLS certificate validation bypass via dropped requestTls in SOCKS5 ProxyAgent; undici vulnerable to HTTP header injection via Set-Cookie percent-decoding; undici WebSocket client vulnerable to denial of service via fragment count bypass; undici vulnerable to cross-origin request; fix: yes
- **vite** 7.0.0 - 7.3.3 — transitive; advisories: GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff; launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows; vite: `server.fs.deny` bypass on Windows alternate paths; fix: yes
- **ws** 8.0.0 - 8.20.1 — transitive; advisories: GHSA-58qx-3vcg-4xpx, GHSA-96hv-2xvq-fx4p; ws: Uninitialized memory disclosure; ws: Memory exhaustion DoS from tiny fragments and data chunks; fix: yes

#### MODERATE findings

- **@astrojs/language-server** 2.14.0 - 2.16.10 — transitive; advisories: n/a; via volar-service-yaml; fix: yes
- **@cloudflare/vite-plugin** <=0.0.0-fff677e35 || 0.0.7 - 1.41.0 — transitive; advisories: n/a; via miniflare; via wrangler; via ws; fix: yes
- **baseline-browser-mapping** >=2.0.0 <2.11.0 — transitive; advisories: GHSA-w5vr-8v7q-w6rv; baseline-browser-mapping process termination on invalid input causes denial of service; fix: yes
- **supabase** 1.1.6 - 2.98.2 — direct; advisories: n/a; via tar; fix: yes
- **volar-service-yaml** <=0.0.70 — transitive; advisories: n/a; via yaml-language-server; fix: yes
- **wrangler** <=0.0.0-kickoff-demo || 3.108.0 - 4.101.0 — direct; advisories: n/a; via esbuild; via miniflare; fix: yes
- **yaml** 2.0.0 - 2.8.2 — transitive; advisories: GHSA-48c2-rrv3-qjmp; yaml is vulnerable to Stack Overflow via deeply nested YAML collections; fix: yes
- **yaml-language-server** 1.11.1-08d5f7b.0 - 1.21.1-f1f5a94.0 || 1.22.1-0ae5603.0 - 1.22.1-fc5f874.0 — transitive; advisories: n/a; via yaml; fix: yes

#### LOW / INFO findings

- **@babel/core** <=7.29.0 — transitive; advisories: GHSA-4x5r-pxfx-6jf8; @babel/core: Arbitrary File Read via sourceMappingURL Comment; fix: yes
- **esbuild** 0.27.3 - 0.28.0 — transitive; advisories: GHSA-g7r4-m6w7-qqqr; esbuild allows arbitrary file read when running the development server on Windows; fix: yes
- **postcss-selector-parser** 7.1.0 - 7.1.2 — transitive; advisories: GHSA-w9m9-85wc-3x92; postcss-selector-parser allows denial of service through uncontrolled AST recursion; fix: yes

## Hints recorded but not acted on

| Hint                    | Value                  |
| ----------------------- | ---------------------- |
| bootstrapper_confidence | first-class |
| quality_override        | false |
| path_taken              | standard |
| self_check_answers      | null |
| team_size               | solo |
| deployment_target       | cloudflare-pages |
| ci_provider             | github-actions |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true |
| has_payments            | false |
| has_realtime            | false |
| has_ai                  | false |
| has_background_jobs     | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
