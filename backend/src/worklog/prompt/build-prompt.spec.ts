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
      workState: 'committed',
      previousActiveDays: 2,
      activeMinutes: 80,
      activeFiles: [{ path: 'src/locales/pl.json', minutes: 45 }],
      changedFiles: ['src/locales/pl.json', 'src/components/locale-switcher.tsx'],
      uncommittedFiles: [
        { path: 'src/components/locale-switcher.tsx', status: 'modified' },
      ],
      touchedSymbols: [
        { path: 'src/components/locale-switcher.tsx', symbols: ['LocaleSwitcher'] },
      ],
      commitsObserved: 1,
      commits: [{ message: 'add Polish translations', insertions: 120, deletions: 2 }],
      contextCommits: [{ date: '2026-11-04', message: 'prepare dashboard locale structure' }],
      terminal: {
        totalRuns: 1,
        failedRuns: 0,
        tests: { runs: 1, failed: 0, lastRunPassed: true },
        builds: null,
        lint: null,
      },
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

    expect(prompt).toContain('Each "branchWork" item represents one logical task');
    expect(prompt).toContain('its "branch" is already normalised');
    expect(prompt).toContain('Committed never means completed');
    expect(prompt).toContain('"contextCommits" are earlier commits observed');
  });

  it('includes branch-scoped time and Git evidence in the telemetry block', () => {
    const prompt = buildUserPrompt(FACTS);

    expect(prompt).toContain('"branch":"feat/dashboard-translations"');
    expect(prompt).toContain('"workState":"committed"');
    expect(prompt).toContain('"changedFiles":["src/locales/pl.json"');
    expect(prompt).toContain('"message":"add Polish translations"');
    expect(prompt).toContain('"message":"prepare dashboard locale structure"');
    expect(prompt).toContain('"status":"modified"');
    expect(prompt).toContain('"symbols":["LocaleSwitcher"]');
  });

  it('explains the limits of working-tree and symbol evidence', () => {
    const prompt = buildSystemPrompt('daily-log', 'en');

    expect(prompt).toContain('"uncommittedFiles" is the latest Git working-tree snapshot');
    expect(prompt).toContain('an empty array means the tree was observed clean');
    expect(prompt).toContain('"touchedSymbols" contains names of classes');
    expect(prompt).toContain('a name does not prove behavior or outcome');
  });
});
