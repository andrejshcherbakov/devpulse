# DevPulse — Worklog & Standup

DevPulse records privacy-controlled workflow metadata in VS Code and turns it
into activity analytics and evidence-based standup drafts. It helps answer
"what did I work on?" without sending source-code contents.

> **Self-hosted preview:** this release requires a running DevPulse backend and
> dashboard. No public DevPulse Cloud endpoint is configured automatically.

## What it does

- **Active-time tracking** — excludes idle, unfocused, paused, and system-sleep
  intervals.
- **Workflow evidence** — branches, commits, test/build/lint outcomes, and
  optional sanitized terminal commands.
- **Dashboard analytics** — sessions, languages, hot files, commands, focus,
  heatmaps, and AI-assisted activity estimates.
- **Standup drafts** — the backend can generate a draft from collected facts;
  the developer reviews it before use.
- **Offline buffering** — keeps at most 500 events in VS Code global storage
  and retries when the configured backend is available.
- **Clear controls** — persistent pause/resume and independent settings for
  paths, commands, commit messages, and AI-assistance detection.

DevPulse does not read or send complete source files, terminal output,
clipboard contents, or keystrokes. See [Privacy](#privacy) for the exact data
contract and limitations.

## Getting started

### 1. Run DevPulse

Deploy or start the backend and web dashboard by following the repository
[setup guide](https://github.com/andrejshcherbakov/devpulse/blob/main/docs/setup.md).

### 2. Configure the endpoints

Open VS Code Settings and search for `DevPulse`:

- set `devpulse.apiUrl`, for example `http://localhost:3000/api/v1`;
- set `devpulse.dashboardUrl`, for example `http://localhost:3001`.

Remote endpoints must use HTTPS. Plain HTTP is accepted only for localhost.

### 3. Create and store an extension key

Create an **Extension** API key under **Settings → API Keys** in the DevPulse
dashboard. Then run **DevPulse: Set API Key** from the Command Palette.

The key is stored in VS Code SecretStorage. Tracking starts only when all of
the following are true:

- an API key exists;
- `devpulse.enabled` is enabled;
- the API URL is configured securely;
- the workspace is trusted (the extension is disabled in Restricted Mode);
- VS Code telemetry is enabled;
- a Git workspace and branch are available.

The status bar shows the exact blocker or synchronization state.

## Configuration

| Setting                         | Default | Description                                                      |
| ------------------------------- | ------- | ---------------------------------------------------------------- |
| `devpulse.enabled`              | `true`  | Master switch for DevPulse tracking                              |
| `devpulse.apiUrl`               | empty   | Self-hosted backend URL; HTTPS required outside localhost        |
| `devpulse.dashboardUrl`         | empty   | Dashboard URL used by quick-menu links                           |
| `devpulse.sendFilePaths`        | `true`  | Send workspace-relative paths for file analytics                 |
| `devpulse.sendTerminalCommands` | `true`  | Send sanitized commands, relative cwd, exit code, and duration   |
| `devpulse.sendCommitMessages`   | `true`  | Send commit messages for report context                          |
| `devpulse.detectAiAssistance`   | `true`  | Detect likely AI insertions locally and send an estimated marker |

Changing a privacy setting affects newly created events. Previously uploaded
data remains subject to the configured backend's retention policy.

## Commands

| Command                      | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `DevPulse: Set API Key`      | Store an extension API key securely              |
| `DevPulse: Clear API Key`    | Remove the key and clear locally buffered events |
| `DevPulse: Pause Tracking`   | Persistently pause collection                    |
| `DevPulse: Resume Tracking`  | Resume collection                                |
| `DevPulse: Show Menu`        | Open the status-bar quick menu                   |
| `DevPulse: Open Dashboard`   | Open the configured dashboard                    |
| `DevPulse: Open Sessions`    | Open the dashboard session history               |
| `DevPulse: Show Log`         | Open the DevPulse output channel                 |
| `DevPulse: Show Diagnostics` | Print local configuration and tracker state      |

## How active time works

DevPulse counts confirmed activity rather than the time VS Code stays open.
After two minutes without editor, terminal, task, debug, or workspace activity,
the idle interval is excluded. Window blur uses a ten-second grace period and
system sleep is handled separately. Paused state survives a VS Code restart.

## Privacy

DevPulse sends workflow metadata only to the backend configured in
`devpulse.apiUrl`. File paths are workspace-relative. Terminal commands are
sanitized on a best-effort basis, and their working directory is relative to
the active workspace. Source-code contents and terminal output are not sent.

AI-assistance detection inspects the shape of a text change locally (for
example, whether it is a large multiline insertion). The inserted text is not
stored or transmitted. This is an estimate and can include snippets, paste,
formatters, or refactoring tools.

Read the complete [Privacy Policy](./PRIVACY.md) before enabling tracking.

## Requirements

- VS Code 1.93.0 or newer;
- a trusted filesystem workspace with Git available in `PATH`;
- a running DevPulse backend and dashboard;
- an Extension API key.

## Support and license

See [SUPPORT.md](./SUPPORT.md) for support instructions.

DevPulse is licensed under the terms in [LICENSE](./LICENSE).
