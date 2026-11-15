<p align="center">
  <img src="packages/web/src/256.png" width="88" alt="DevPulse logo" />
</p>

<h1 align="center">DevPulse</h1>

<p align="center">
  See where your development time goes and turn daily activity into a useful worklog.
</p>

DevPulse is a self-hosted activity tracker for Visual Studio Code. The extension records selected workflow events, the backend turns them into work sessions, and the dashboard shows what happened across projects, branches, files, and days.

It is built for personal review and worklogs, not employee scoring. DevPulse does not judge code quality or claim that more activity means better work.

> [!NOTE]
> DevPulse is currently a self-hosted preview. The VS Code extension needs a running DevPulse backend and dashboard.

## Preview

<p align="center">
  <img src="packages/web/src/app/opengraph-image%20copy.png" alt="DevPulse preview" />
</p>

<!-- Add dashboard and VS Code screenshots here, for example:
![Dashboard overview](docs/images/dashboard-overview.png)
![DevPulse in VS Code](docs/images/vscode-extension.png)
-->

## What it does

- **Tracks active development time** without counting long idle periods, paused tracking, or system sleep.
- **Shows useful context** such as projects, Git branches, languages, frequently used files, commits, commands, and work sessions.
- **Works offline** by keeping up to 500 unsent events in VS Code storage and retrying when the backend is available again.
- **Updates the dashboard live** when new activity is processed.
- **Creates daily worklog drafts** from recorded facts. The user reviews and edits the result before using it.
- **Keeps privacy controls visible** with separate settings for file paths, terminal commands, commit messages, symbol names, and AI-assistance detection.

## How it works

1. The VS Code extension records selected activity events.
2. Events are sent in batches to the configured DevPulse backend.
3. The backend groups them into sessions and calculates active time.
4. The dashboard presents the results and can prepare a short worklog draft.

If the connection is lost, the extension stores pending events locally. Source files are not copied into the buffer or uploaded to the backend.

## Data and privacy

DevPulse collects workflow metadata, not source-code contents.

| Collected when enabled | Not collected |
| --- | --- |
| Event time and type | Complete source files |
| Project and Git branch | Git diff contents |
| Relative file path and language | Function bodies and signatures |
| Commit hash and optional message | Individual keystrokes |
| Sanitized terminal command, result, and duration | Terminal output |
| Uncommitted-file path and Git status | Clipboard or screen contents |
| Optional touched class and function names | Absolute editor and terminal paths |
| Estimated AI-assistance marker | Prompts or AI-generated text |

Symbol-name sharing is disabled by default. File paths, terminal commands, commit messages, and AI-assistance detection can be controlled independently in VS Code settings. Tracking also respects Workspace Trust, the VS Code telemetry setting, and the persistent Pause/Resume control.

For the complete event list and limitations, read the [extension privacy policy](packages/vscode-extension/PRIVACY.md).

## Try it locally

Requirements: Node.js 24, pnpm 9, Docker, Git, VS Code 1.93 or newer.

```bash
git clone https://github.com/andrejshcherbakov/devpulse.git
cd devpulse
pnpm install
cp .env.example .env
docker compose up -d
```

After configuring `.env`, run the database migrations, backend, dashboard, and VS Code extension as described in the [setup guide](docs/setup.md).

## Repository layout

```text
backend/                    NestJS API, event processing, and worklog generation
packages/web/               Next.js dashboard
packages/vscode-extension/ VS Code extension
packages/lib/               Shared types and contracts
docs/                       Setup, deployment, API, and architecture notes
```

## Documentation

- [Local setup](docs/setup.md)
- [Deployment](docs/deployment.md)
- [API map](docs/api-map.md)
- [Database architecture](docs/architecture-db.md)
- [Extension guide](packages/vscode-extension/README.md)
- [Privacy policy](packages/vscode-extension/PRIVACY.md)
- [Support](packages/vscode-extension/SUPPORT.md)

## License

See [LICENSE](LICENSE).
