---
starter_id: 10x-astro-starter
package_manager: npm
project_name: authenticheck
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers   # corrected 2026-09-12: @astrojs/cloudflare 13.x targets Workers + static assets, not Pages; see infrastructure.md
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
---

## Why this stack

A solo builder shipping a rule-based authenticity checker as a web app in one week of after-hours work, with a hard deadline four days out, needs a starter that already carries accounts, a database and a deploy path so every evening goes into the domain rules rather than plumbing. 10x Astro Starter is the recommended default for a web app in JavaScript/TypeScript and clears all four agent-friendly gates; its built-in auth and PostgreSQL cover the PRD's only technology-forcing requirement (sign-up, sign-in, password reset) first-class, while the small target scale and low request volume sit comfortably on the edge runtime. No payments, realtime, AI or background jobs are in scope — photo analysis and listing import are explicit PRD non-goals. Bootstrapper confidence is first-class, so scaffolding should be mostly smooth with the occasional manual step. Deployment lands on Cloudflare Workers with static assets (the adapter's only target since 13.x — the registry card still says Pages), auto-deployed on merge to main by Workers Builds; GitHub Actions lints and builds only. Platform choice confirmed by infrastructure.md (2026-09-12).
