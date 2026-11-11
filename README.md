# devpulse

An automated time-tracking and workflow analytics platform for developers, built with NestJS, Next.js, and VS Code Extension API.

## Analytics and AI ROI

The dashboard includes an **AI Assistance & ROI** panel. It compares sessions with
AI assistance against manual coding sessions for the selected date range and project.
AI-assisted sessions are detected from telemetry that contains an AI tool or AI
interactions, such as Copilot, Claude, or Aider.

The panel shows:

- number of AI-assisted and manual sessions;
- total detected AI interactions;
- code velocity for AI-assisted and manual sessions, measured in lines per active hour;
- relative speedup percentage;
- estimated hours saved compared with the manual-session velocity.

The metrics are estimates based on recorded telemetry and commit statistics. They
should be used for productivity trends, not as an exact measure of generated code
or financial savings. If the selected period has no AI activity, the panel displays
an empty state instead of calculated metrics.

### AI ROI API

Authenticated clients can request the same metrics through:

```text
GET /api/v1/analytics/ai-roi
```

Optional query parameters:

| Parameter   | Format            | Description                                      |
| ----------- | ----------------- | ------------------------------------------------ |
| `startDate` | ISO 8601 datetime | Include sessions starting at or after this date  |
| `endDate`   | ISO 8601 datetime | Include sessions starting at or before this date |
| `projectId` | string            | Restrict metrics to one project                  |

The endpoint returns `aiSessionsCount`, `manualSessionsCount`,
`totalAiInteractions`, `aiVelocityLinesPerHour`, `manualVelocityLinesPerHour`,
`speedupPercentage`, and `estimatedHoursSaved`.

## AI Worklog Summaries

The system includes an **AI-powered worklog generator** that creates concise daily
or weekly summaries based on telemetry data. Users can generate summaries for any
date range (up to 31 days) to use for standups, client reports, or personal
documentation.

To use this feature, users must configure their own OpenAI API key in their profile
settings. The system uses OpenRouter with free AI models to generate summaries.

The worklog generator includes:

- automatic aggregation of work sessions, projects, branches, and languages;
- automatic grouping of branch aliases such as `codex/feat/x` and `feat/x` into
  one logical task;
- recent branch context that helps distinguish newly started, continued, and
  committed work across multiple days;
- focus score and terminal command analysis;
- current-day and contextual commit-message integration, with command results
  attributed to the relevant branch;
- up to five sanitised workspace-relative hot-file paths per day;
- AI usage detection and contextual mention in summaries;
- natural, non-robotic tone suitable for professional reports.

Task purpose is inferred from branch names, observed commits, related file paths,
and command results. No manual task description is required. These signals are
treated as evidence rather than proof: a commit does not by itself mark a feature
as complete, and source-code contents or diffs are not sent to the configured LLM.

See `docs/setup.md` for configuration details and `docs/architecture-db.md` for the
`ai_assisted` and `ai_interactions_count` fields in the `work_sessions` table.
