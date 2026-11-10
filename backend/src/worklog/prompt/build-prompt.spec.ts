import { describe, expect, it } from '@jest/globals';

import type { DayFacts } from '../interfaces/day-facts.interface';

import { buildSystemPrompt, buildUserPrompt } from './build-prompt';

const FACTS: DayFacts = {
  date: '2026-11-05',
  activeMinutes: 120,
  focusScore: 85,
  projects: [],
  branchWork: [
    {
      project: 'devpulse',
      branch: 'feat/dashboard-translations',
      activeMinutes: 80,
      activeFiles: [{ path: 'src/locales/pl.json', minutes: 45 }],
      changedFiles: ['src/locales/pl.json', 'src/components/locale-switcher.tsx'],
      commits: [{ message: 'add Polish translations', insertions: 120, deletions: 2 }],
    },
  ],
  languages: [],
  hotFiles: [{ path: 'src/auth/auth.service.ts', minutes: 90, percent: 75 }],
  terminal: {
    totalRuns: 0,
    failedRuns: 0,
    tests: null,
    builds: null,
    lint: null,
  },
  commits: [],
  aiAssistedPercent: null,
};

describe('worklog prompt', () => {
  it('explains how the model may use hot files without inferring work', () => {
    const prompt = buildSystemPrompt('daily-log', 'en');

    expect(prompt).toContain('"hotFiles" contains up to five workspace-relative files');
    expect(prompt).toContain('Never infer an implementation');
  });

  it('includes sanitised hot-file facts in the telemetry block', () => {
    expect(buildUserPrompt(FACTS)).toContain(
      '"hotFiles":[{"path":"src/auth/auth.service.ts","minutes":90,"percent":75}]',
    );
  });

  it('explains how branch evidence may be combined without treating names as proof', () => {
    const prompt = buildSystemPrompt('standup', 'en');

    expect(prompt).toContain('"branchWork" connects a project and branch');
    expect(prompt).toContain('A branch name or path is only a hint');
  });

  it('includes branch-scoped time and Git evidence in the telemetry block', () => {
    const prompt = buildUserPrompt(FACTS);

    expect(prompt).toContain('"branch":"feat/dashboard-translations"');
    expect(prompt).toContain('"changedFiles":["src/locales/pl.json"');
    expect(prompt).toContain('"message":"add Polish translations"');
  });
});
