# Environment Requirements and Run Guide

This document covers environment requirements (OS, software, hardware, cloud), the frontend / backend split, external services, and how a new person stands up the code, database, and services, runs tests, and builds a production version.

---

## 1. Environment requirements

DevPulse is a monorepo: **backend** (NestJS API + PostgreSQL + Redis) and **frontend** (Next.js dashboard + VS Code extension). Minimum and recommended requirements are below.

### 1.1. Frontend / backend split

| Layer              | Components                                       | Local prerequisites                   |
| :----------------- | :----------------------------------------------- | :------------------------------------ |
| **Backend**        | NestJS (`backend/`), PostgreSQL 16, Redis 7      | Node.js, pnpm, Docker Compose, `.env` |
| **Frontend (Web)** | Next.js (`packages/web/`)                        | Node.js, pnpm, modern browser         |
| **Frontend (IDE)** | VS Code extension (`packages/vscode-extension/`) | VS Code ≥ 1.93.0, `git` on `PATH`     |

### 1.2. Operating system and software

| Component                    | Minimum                                                | Recommended                                              |
| :--------------------------- | :----------------------------------------------------- | :------------------------------------------------------- |
| **Operating system**         | macOS 12+, Linux (Ubuntu 20.04+), Windows 10/11 (WSL2) | macOS 14+ or Ubuntu 22.04+ LTS                           |
| **Node.js**                  | v20.11.0 (LTS)                                         | v22.x (Active LTS)                                       |
| **pnpm**                     | v9.0.0+                                                | v9.14.2 (locked in `packageManager`)                     |
| **PostgreSQL**               | 15 (Docker)                                            | 16 Alpine (`postgres:16-alpine` in `docker-compose.yml`) |
| **Redis**                    | 7.0 (Docker)                                           | 7.x Alpine (`redis:7-alpine`)                            |
| **Docker**                   | Docker Engine 24+ / Docker Desktop                     | Docker Compose v2 (`docker compose`)                     |
| **Browser**                  | Chrome 120+, Firefox 120+, or Safari 17+               | Current Chromium (Chrome / Edge)                         |
| **Git**                      | 2.34+ on `PATH`                                        | 2.40+                                                    |
| **VS Code** (extension only) | 1.93.0                                                 | latest stable                                            |

### 1.3. Hardware

A local dev environment runs Postgres/Redis containers, the NestJS API, and the Next.js dashboard at the same time.

| Resource | Minimum                                              | Recommended |
| :------- | :--------------------------------------------------- | :---------- |
| **RAM**  | 8 GB                                                 | 16 GB       |
| **CPU**  | 2 cores                                              | 4 cores     |
| **Disk** | ~10 GB free (repo + `node_modules` + Docker volumes) | SSD, 20 GB+ |

### 1.4. Cloud

A VPS is **not** required to run telemetry and the dashboard locally. Cloud is needed for production and for optional features (email, AI):

| Environment            | What to host                                                | Notes                                        |
| :--------------------- | :---------------------------------------------------------- | :------------------------------------------- |
| **Dev (local)**        | nothing — Postgres and Redis in Docker                      | API: `localhost:3000`, web: `localhost:3001` |
| **Prod / staging**     | VPS or PaaS (backend + web + Postgres + Redis), domain, TLS | see `docs/deployment.md`                     |
| **SaaS subscriptions** | Resend, OpenRouter (or OpenAI)                              | keys per user / per environment; see §3      |

---

## 2. VS Code extension requirements

- **VS Code:** version **1.93.0** or newer (Shell Integration API).
- **Git:** `git` binary on `PATH` (commit tracking).
- **Workspace Trust:** the folder must be a trusted workspace; telemetry is paused in restricted mode.

---

## 3. External software (subscriptions and cloud)

DevPulse is not locked to a single LLM vendor. Users configure AI keys in their profile (Settings). Transactional email goes through Resend.

### 3.1. Resend (email)

|                  |                                                                                                                                                                      |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service**      | [Resend](https://resend.com) — cloud email API                                                                                                                       |
| **Subscription** | Resend account + API key (`RESEND_API_KEY`); the free plan is enough for development                                                                                 |
| **Used for**     | account verification codes and security notifications                                                                                                                |
| **Variables**    | `RESEND_API_KEY`, `EMAIL_FROM` (sender, e.g. `DevPulse <noreply@your-domain>`)                                                                                       |
| **Dev**          | without a real key, registration will not send mail; the rest of the API and dashboard work after any non-empty string is set in `.env` (required by the env schema) |

### 3.2. AI — OpenRouter (default cloud) and Ollama (local)

Worklog summaries use an OpenAI-compatible interface (`OpenAiCompatibleSummaryService`). The provider is selected in the user profile:

| Provider                       | Type                 | Subscription / hosting                                                                              | Configuration                                                                 |
| :----------------------------- | :------------------- | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- |
| **OpenRouter** (`openrouter`)  | cloud                | account on [openrouter.ai](https://openrouter.ai), API key; free models (`:free`) need no paid plan | default provider; automatic model fallback on rate limits / unavailability    |
| **OpenAI** (`openai`)          | cloud                | paid OpenAI API (GPT-4o, etc.)                                                                      | key and model name in profile settings                                        |
| **Ollama / custom** (`custom`) | local or self-hosted | no cloud — [Ollama](https://ollama.com) (also vLLM, LM Studio, LocalAI)                             | `llmBaseUrl` pointing at the local endpoint, e.g. `http://127.0.0.1:11434/v1` |

LLM keys are **not** stored in the server `.env` — each user supplies their own key in the dashboard. The backend does not ship a shared company key.

---

## 4. Development setup (code, database, services)

A new person needs: a cloned repo, a `.env` file, running Postgres/Redis containers, migrations, and two Node processes (backend + web).

### Step 1: Code and dependencies

```bash
git clone https://github.com/andrejshcherbakov/devpulse.git
cd devpulse
pnpm install
```

### Step 2: Environment variables

```bash
cp .env.example .env
```

Fill in at least:

- `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_URL`
- `JWT_SECRET` (min. 32 characters)
- `RESEND_API_KEY`, `EMAIL_FROM` (required by backend env)

### Step 3: Database and Redis (Docker)

```bash
docker compose up -d
docker compose ps
```

Containers: PostgreSQL `:5432`, Redis `:6379`.

### Step 4: Migrations

```bash
cd backend
pnpm migration:run
```

Optional test data:

```bash
pnpm seed
```

### Step 5: Backend (NestJS)

```bash
# still in backend/
pnpm start:dev
```

- API: `http://localhost:3000/api/v1`
- OpenAPI JSON: `http://localhost:3000/api/v1/docs-json`

### Step 6: Frontend (Next.js)

New terminal:

```bash
cd packages/web
pnpm dev
```

- Dashboard: `http://localhost:3001`
- Swagger UI: `http://localhost:3001/docs`

### Step 7: VS Code extension

1. Open the root `devpulse/` folder in VS Code.
2. **Run and Debug** → **Launch Extension** (or **F5**).
3. In the `[Extension Development Host]` window, run `DevPulse: Set API Key`.
4. Paste a key from the web dashboard (**Settings → API Keys**).

---

## 5. Running tests

Backend unit and integration tests (Jest). Postgres/Redis from `docker compose up` should be running if tests hit the database.

```bash
cd backend
pnpm test
```

Whole monorepo (typecheck + lint):

```bash
pnpm typecheck
pnpm lint
```

---

## 6. Production build and run

Infrastructure (Postgres + Redis) still comes from Compose; apps are compiled from TypeScript to production artifacts.

### Backend

```bash
cd backend
pnpm build
pnpm start:prod
```

(`start:prod` runs `node dist/main`.)

### Frontend (Web)

```bash
cd packages/web
pnpm build
pnpm start
```

The dashboard listens on port **3001**.

### VS Code extension (`.vsix` package)

```bash
cd packages/vscode-extension
pnpm compile
pnpm vsce package --no-dependencies
```

Install `devpulse-0.0.1.vsix` in VS Code via **Extensions: Install from VSIX...**.
