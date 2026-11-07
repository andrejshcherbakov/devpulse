# Changelog

All notable changes to the DevPulse extension will be documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.0.1] — 2026-11-07

### Added

- **Activity tracking** — active/idle detection based on editor events,
  window focus, and system sleep detection.
- **Git context** — tracks branch and remote URL, survives brief loss of
  focus via 2-minute grace period.
- **Terminal tracking** — captures commands, working directory, exit code,
  and duration using VS Code Shell Integration API.
- **Task tracking** — captures task name, source, exit code, and duration.
- **Git commit tracking** — captures commit hash, message, and diff stats
  by watching `.git/logs/HEAD`.
- **Command sanitization** — strips URL credentials, Bearer tokens, and
  password flags before sending.
- **Status bar** — shows active time today, current branch, and health
  indicator. Click opens a quick menu with actions.
- **Quick menu** — Pause/Resume tracking, open dashboard, set/clear API key,
  show log, and show diagnostics.
- **Health notifications** — warning when an API key is invalid or revoked.
- **Privacy-first telemetry** — respects workspace trust, VS Code's global
  telemetry setting, and never reads file contents.
- **Local buffering** — keeps events in `globalState` while offline and
  retries them on the next flush.
- **Gzip compression** — compresses payloads larger than 10 KB.
- **Privacy controls** — independent settings for file paths, terminal
  commands, commit messages, and AI-assistance detection.
- **Marketplace metadata** — explicit Workspace Trust and virtual-workspace
  capabilities, support documentation, and self-hosted onboarding.

### Changed

- **Secure endpoints** — remote services require HTTPS; plain HTTP is accepted
  only for local development.
- **Persistent pause** — a user pause now survives VS Code restarts.
- **Minimal VSIX** — the package contains only the bundled runtime and public
  documentation.
- **Relative terminal context** — absolute working directories are no longer
  transmitted.
- **Tracker diagnostics** — the status bar now distinguishes active, idle,
  paused, locally blocked, and sync-only failures, with a concrete reason in
  the tooltip and diagnostics output.
- **Dashboard status** — inactive live status now distinguishes no data, a
  closed tracker session, and a stale signal.
- **Active-time boundaries** — idle transitions use the actual last-activity
  timestamp, and pause, shutdown, and branch changes close the current session
  without counting idle or paused time as active.
