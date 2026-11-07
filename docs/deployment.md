# Deployment, Docker, and CI/CD

How DevPulse is installed (technical prerequisites, Docker, VS Code distribution), how versions are built (PR → build → review → merge), and what the client must prepare. Business conditions (data migration, downtime) are included for Stage 3.

---

## 1. Production topology

The recommended student production deployment separates the public dashboard
from the long-running API and telemetry worker:

| Component                  | Recommended service         | Public address                 |
| :------------------------- | :-------------------------- | :----------------------------- |
| Next.js dashboard          | Vercel Hobby                | `https://<project>.vercel.app` |
| NestJS API + BullMQ worker | Heroku Eco or Basic         | `https://<app>.herokuapp.com`  |
| PostgreSQL                 | Heroku Postgres Essential-0 | private managed URL            |
| Redis                      | Heroku Key-Value Mini       | private managed URL            |
| Verification email         | Resend Free                 | no public endpoint             |

The zero-cost setup uses a Next.js rewrite to proxy the dashboard's `/api/*`
requests to Heroku. The browser therefore sees one Vercel origin and the
authentication cookie is available to both client navigation and Next.js SSR.
Vercel and Heroku provide HTTPS on their generated domains.

A custom domain remains optional. When using `app.<domain>` and
`api.<domain>` directly, set `COOKIE_DOMAIN=.<domain>` so the cookie is shared
between the sibling subdomains.

The GitHub Student Developer Pack Heroku credit available in November 2026 is
enough for Eco + Essential-0 + Mini. Eco sleeps after inactivity; use Basic for
an always-on public service and pay the amount not covered by the credit.

---

## 2. Local installation

### 2.1. Infrastructure with Docker

`docker-compose.yml` starts the data plane only:

| Service | Image                | Port | Volume            |
| :------ | :------------------- | :--- | :---------------- |
| `db`    | `postgres:16-alpine` | 5432 | `./data/postgres` |
| `redis` | `redis:7-alpine`     | 6379 | `./data/redis`    |

Healthchecks: `pg_isready`, `redis-cli ping`.

```bash
cp .env.example .env   # fill secrets
docker compose up -d
cd backend && pnpm migration:run   # prod: also applied on boot (migrationsRun)
```

### 2.2. Application processes

```bash
pnpm install
pnpm build
# API
cd backend && pnpm start:prod
# Web (other process / reverse proxy)
cd packages/web && pnpm start
```

Local HTTP is accepted only on loopback addresses.

### 2.3. VS Code extension

| Channel                   | How                                                                                                                                                            |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace**           | Publish after `package.json`, `README.md`, `PRIVACY.md` pass store review                                                                                      |
| **Internal / air-gapped** | `cd packages/vscode-extension && pnpm compile && pnpm vsce package --no-dependencies` → install `devpulse-0.0.1.vsix` via **Extensions: Install from VSIX...** |

Pilot groups typically use the `.vsix` path.

---

## 3. Managed production deployment

### 3.1. Backend on Heroku

The root `Procfile` starts only the backend. `heroku-postbuild` compiles the
NestJS application, and the application applies committed TypeORM migrations
before accepting traffic when `NODE_ENV=production`.

Create one Heroku application from the repository and provision:

- an Eco dyno for a zero-out-of-pocket student pilot, or Basic for always-on;
- Heroku Postgres Essential-0;
- Heroku Key-Value Mini.

Configure these variables in Heroku. `DATABASE_URL` and `REDIS_URL` are
provided by the data add-ons.

```dotenv
NODE_ENV=production
JWT_SECRET=<at-least-32-random-characters>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://<project>.vercel.app
RESEND_API_KEY=<resend-api-key>
EMAIL_FROM=DevPulse <noreply@<verified-email-domain>>
```

Leave `COOKIE_DOMAIN` unset when the dashboard uses the Vercel API proxy. Set
it only for a custom parent domain shared by dashboard and API.

Resend's testing sender can deliver only to the account owner. Public
registration requires a verified sender domain; the free Student Pack domain
can be used for email even when the application itself stays on the generated
Vercel and Heroku domains.

The readiness endpoint is `GET /api/v1/health`. A successful response also
confirms that PostgreSQL and Redis are reachable.

Connect the Heroku app to GitHub and deploy `dev` manually for the first
production test. Enable automatic deploys only after CI is required to pass.

### 3.2. Dashboard on Vercel

Import the same GitHub repository as a Vercel project:

1. Set **Root Directory** to `packages/web`.
2. Enable **Include source files outside of the Root Directory** because the
   dashboard imports `@devpulse/env` and `@devpulse/lib` workspace packages.
3. Use `pnpm install --frozen-lockfile` as the install command.
4. Use `pnpm build:web` as the build command so workspace dependencies are
   compiled before Next.js.
5. Set `DEVPULSE_BACKEND_ORIGIN=https://<app>.herokuapp.com`.
6. Set `NEXT_PUBLIC_API_URL=https://<project>.vercel.app/api/v1`.

After the first deployment, replace `<project>` with the stable Vercel project
domain and redeploy. Requests to `/api/*` then stay on the Vercel origin and
are forwarded to Heroku without exposing cross-site cookies.

For a custom domain, attach `app.<domain>` to Vercel and `api.<domain>` to
Heroku, change both URL variables, set `COOKIE_DOMAIN`, and wait until both
providers report valid TLS certificates.

### 3.3. Production smoke test

Test the complete public path before publishing the extension:

1. `GET https://<app>.herokuapp.com/api/v1/health` returns success.
2. Register through the Vercel dashboard and receive the Resend code.
3. Log in, reload the dashboard, and confirm that the session survives SSR.
4. Create an Extension API key.
5. Configure a locally installed VSIX with the public API and dashboard URLs.
6. Generate telemetry and confirm sessions, hot files, commands, and worklogs.
7. Set the public URLs as extension defaults, rebuild the final VSIX, and only
   then publish version `0.0.1` to the Marketplace.

---

## 4. Version build process (PR → build → review → merge)

Workflow file: `.github/workflows/ci-cd.yml` (job name `CI`).

**Triggers:** `push` to `dev`, `pull_request` targeting `dev`.

```
open PR against `dev`
        → GitHub Actions `validate`
              1. checkout
              2. pnpm 9.14.2 + Node 24
              3. pnpm install --frozen-lockfile
              4. pnpm build          (NEXT_PUBLIC_API_URL set)
              5. pnpm typecheck
              6. pnpm lint
              7. pnpm --filter backend test
        → human review
        → merge to `dev`
```

Tests run with dummy `RESEND_API_KEY` / `JWT_SECRET` (see the workflow `env:` block). There is **no deploy job** in this workflow: merge does not push to production automatically. Production is a manual/scripted start of the built artifacts after review.

Local equivalent before opening a PR:

```bash
pnpm build
pnpm typecheck
pnpm lint
cd backend && pnpm test
```

---

## 5. Business conditions

### 5.1. Data migration

Greenfield product. **No import from a previous time-tracker is required.** Collection starts when developers install the extension and create API keys.

### 5.2. Client preparation

- DNS + TLS for the dashboard and API
- List of pilot developers (VS Code version check)
- Decision: Marketplace vs internal `.vsix`
- Users who want AI worklogs add **their own** LLM key in Settings (no shared company key)

### 5.3. Downtime

No store-close or sales freeze. First boot applies TypeORM migrations in seconds. BullMQ processes telemetry in the background and does not block HTTP.

### 5.4. Rollout

1. **Pilot:** 5–10 developers, `.vsix`, watch Postgres/Redis and API latency.
2. **Full:** remaining team after the pilot.

---

## 6. Self-hosted runtime order

Start in this order (same as recovery — see `docs/backup-recovery.md`):

1. PostgreSQL (`docker compose up -d db`) — wait for healthy
2. Redis (`docker compose up -d redis`) — wait for healthy
3. NestJS API (`pnpm start:prod`) — runs migrations when `NODE_ENV=production`
4. Next.js (`pnpm start`)
5. Extension on developer machines (API already reachable)
