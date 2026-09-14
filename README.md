# Authenticheck

A rule-based authenticity checker for second-hand Balenciaga bags. Before buying on Vinted, Depop or Vestiaire,
the buyer transcribes what the listing's photos show — the numbers on the leather tag, its season letter, the hardware
and a few visual traits — and gets a purchase-risk report with the signals behind it and ready-to-send questions for
the seller. There is no image recognition and no paid per-item service: the brand's authentication knowledge is encoded
as checkable rules.

v1 covers one variant: Balenciaga **Classic City medium with classic hardware**. Any other variant is reported as
unsupported, never judged.

## What it does

- **Tag check** — style number, batch number and season letter, the first number on the back of the tab, brand line,
  925 stamp and MADE IN ITALY size. The season letter decodes to a year that the other features must agree with.
- **Visual checklist** — top-seam thread, Lampo zipper and bales twist, each with a hint and a reference photo;
  era-dependent traits are checked against the decoded year.
- **Risk report** — low / medium / high, or unsupported / input error / year unresolved, with the hard and soft
  signals that set it. A failed hard signal always means high risk.
- **Seller questions** — every missing piece of evidence becomes a copy-ready question.
- **My verifications** — save, open, edit (the report is recalculated) and delete verifications. Each user sees only
  their own: Supabase Auth plus row-level security.

## How it is built

- **Rules as data** — `src/data/balenciaga-classic-city/knowledge.json`, derived from the rules document
  `balenciaga-city-tag-rules.md` and evaluated by a pure engine in `src/lib/services/tag-validation/`.
- **Foundation documents** — `context/foundation/`: `prd.md` (requirements), `roadmap.md`, `tech-stack.md` and
  `test-plan.md` (the risk-based test strategy).
- **Tests** — Vitest unit tests next to the code (rule engine, a guard that keeps the knowledge file in line with the
  rules document, input errors, list/report consistency) and Playwright end-to-end tests in `e2e/`.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/alabilinska/authenticheck.git
cd authenticheck
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm test` - Run the unit tests (Vitest)
- `npm run test:watch` - Run the unit tests in watch mode
- `npm run typecheck` - Type-check the project (`astro check`)
- `npm run test:e2e` - End-to-end test of the main verification path (Playwright; needs `E2E_EMAIL` and `E2E_PASSWORD` of a test account in `.dev.vars`; first run `npx playwright install chromium`)
- `npm run format` - Run Prettier

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

No database tables or migrations are required — this project uses Supabase Auth's built-in `auth.users` table only.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Password reset setup (Supabase dashboard, one-time)

Local dev and production share one Supabase project, so these settings serve both:

1. **Authentication → URL Configuration → Site URL**: `https://authenticheck.alicja-a-bilinska.workers.dev`
2. **Authentication → URL Configuration → Redirect URLs**: `https://authenticheck.alicja-a-bilinska.workers.dev/api/auth/confirm` and `http://localhost:4321/api/auth/confirm`

The default "Reset password" email is used as is: its link returns to `/api/auth/confirm?code=…` (PKCE), so it works only in the browser where the reset was requested; elsewhere the user sees a message asking to request a new link from that browser. To make the link work on any device, change the template to link to `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery` — the endpoint already handles it, but editing templates needs a paid Supabase plan or custom SMTP. Emails go through Supabase's built-in sender: a low hourly limit and restricted recipients — configure custom SMTP before external users.

### Auth routes

| Route                   | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| `/auth/signin`          | Email/password sign-in form                                                    |
| `/auth/signup`          | Email/password sign-up form                                                    |
| `/auth/confirm-email`   | Post-signup page: "Account ready" when signed in, "Check your email" otherwise |
| `/auth/forgot-password` | Request a password reset link by email                                         |
| `/auth/reset-password`  | Set a new password (only with the session from the email link)                 |
| `/api/auth/confirm`     | Target of the reset email link (`?code=…`, or `?token_hash=…&type=recovery`)   |
| `/dashboard`            | Example protected page (redirects to `/auth/signin` if unauthenticated)        |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/) (static assets) as the Worker `authenticheck`, placed in `aws:eu-central-1` next to Supabase.

Always run `npm run build` before any `wrangler` command: what deploys is the adapter-generated `dist/server/wrangler.json` (found via `.wrangler/deploy/config.json`), not `wrangler.jsonc` directly, so a stale `dist/` means a stale deploy.

**Production** auto-deploys from `main` via Cloudflare Workers Builds (git integration). GitHub Actions never deploys.

**Preview** (routes no traffic, prints a preview URL):

```bash
npm run build && npx wrangler versions upload --message "<what changed>" --preview-alias <name>
```

**Emergency manual deploy** (human only, when Workers Builds is unavailable):

```bash
npm run build && npx wrangler deploy
```

**Secrets**: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY` for production; local dev reads `.dev.vars` (gitignored). Until they are set, the site runs with the "Supabase nie jest skonfigurowany" banner and auth disabled.

**Status, logs, rollback**:

```bash
npx wrangler deployments status
npx wrangler tail --format pretty --status error
npx wrangler rollback [version-id] -m "<reason>"
```

Rollback does not roll back bound resources (KV, secrets) and is refused if a bound KV namespace was deleted. The `SESSION` KV namespace is declared explicitly in `wrangler.jsonc` (created with `npx wrangler kv namespace create SESSION`).

On the Workers Free plan each request gets 10 ms CPU; error `1102` in production means upgrade to Workers Paid ($5/month).

`compatibility_date` is pinned at `2026-05-14`, the newest date the pinned workerd accepts — raise it only together with an `@astrojs/cloudflare`/`wrangler` upgrade, and keep the explicit `nodejs_compat` flag.

## CI

GitHub Actions runs lint, type check, unit tests and build on every push and PR to `main` — it never deploys (production deploys come from Workers Builds). Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets in GitHub for the build step.

## License

MIT
