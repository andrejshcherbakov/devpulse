import { describe, expect, it } from '@jest/globals';
import type { Repository } from 'typeorm';

import type { Project } from '../../projects/entities/project.entity';
import { WorkSession } from '../../telemetry/entities/work-session.entity';

import { DayFactsService } from './day-facts.service';

class WorkSessionQueryStub {
  constructor(private readonly sessions: Array<WorkSession>) {}

  public leftJoinAndSelect(): this {
    return this;
  }

  public where(): this {
    return this;
  }

  public andWhere(): this {
    return this;
  }

  public orderBy(): this {
    return this;
  }

  public select(): this {
    return this;
  }

  public getMany(): Promise<Array<WorkSession>> {
    return Promise.resolve(this.sessions);
  }
}

function createSession(): WorkSession {
  const session = new WorkSession();

  session.startedAt = new Date('2026-11-10T09:00:00.000Z');
  session.activeSeconds = 4800;
  session.focusScore = 84;
  session.aiAssisted = false;
  session.project = { name: 'devpulse' } as Project;
  session.gitBranch = 'feat/dashboard-translations';
  session.languageSeconds = { json: 2700, typescript: 2100 };
  session.primaryLanguage = 'typescript';
  session.fileSeconds = {
    'src/locales/pl.json': 2700,
    'src/components/locale-switcher.tsx': 2100,
  };
  session.commits = [
    {
      hash: 'abc123',
      message: 'add Polish dashboard translations',
      filesChanged: 2,
      insertions: 120,
      deletions: 2,
      filesList: ['src/locales/pl.json', 'src/components/locale-switcher.tsx'],
      timestamp: '2026-11-10T10:00:00.000Z',
    },
  ];
  session.terminalCommands = [];

  return session;
}

describe('DayFactsService', () => {
  it('connects branch time, active files and observed Git changes', async () => {
    const query = new WorkSessionQueryStub([createSession()]);
    const repository = {
      createQueryBuilder: () => query,
    } as unknown as Repository<WorkSession>;
    const service = new DayFactsService(repository);

    const result = await service.collect('u_test', 'UTC', {
      startKey: '2026-11-10',
      endKey: '2026-11-10',
      start: new Date('2026-11-10T00:00:00.000Z'),
      endExclusive: new Date('2026-11-11T00:00:00.000Z'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.branchWork).toEqual([
      {
        project: 'devpulse',
        branch: 'feat/dashboard-translations',
        workState: 'committed',
        previousActiveDays: 0,
        activeMinutes: 80,
        activeFiles: [
          { path: 'src/locales/pl.json', minutes: 45 },
          { path: 'src/components/locale-switcher.tsx', minutes: 35 },
        ],
        changedFiles: ['src/locales/pl.json', 'src/components/locale-switcher.tsx'],
        commitsObserved: 1,
        commits: [
          {
            message: 'add Polish dashboard translations',
            insertions: 120,
            deletions: 2,
          },
        ],
        contextCommits: [],
        terminal: {
          totalRuns: 0,
          failedRuns: 0,
          tests: null,
          builds: null,
          lint: null,
        },
      },
    ]);
  });

  it('uses earlier activity and commits as context for an uncommitted day', async () => {
    const earlier = createSession();
    earlier.startedAt = new Date('2026-11-08T09:00:00.000Z');
    earlier.gitBranch = 'feat/branch-aware-worklogs';
    earlier.fileSeconds = { 'src/worklog/day-facts.service.ts': 2400 };
    earlier.commits = [
      {
        hash: 'history123',
        message: 'add branch activity to daily facts',
        filesChanged: 1,
        insertions: 80,
        deletions: 4,
        filesList: ['src/worklog/day-facts.service.ts'],
        timestamp: '2026-11-08T10:00:00.000Z',
      },
    ];

    const current = createSession();
    current.gitBranch = 'codex/feat/branch-aware-worklogs';
    current.fileSeconds = { 'src/worklog/build-prompt.ts': 4800 };
    current.commits = [];

    const future = createSession();
    future.startedAt = new Date('2026-11-12T09:00:00.000Z');
    future.gitBranch = 'feat/branch-aware-worklogs';
    future.commits = [
      {
        hash: 'future123',
        message: 'finish branch-aware worklogs',
        filesChanged: 1,
        insertions: 20,
        deletions: 2,
        filesList: ['src/worklog/build-prompt.ts'],
        timestamp: '2026-11-12T10:00:00.000Z',
      },
    ];

    const query = new WorkSessionQueryStub([earlier, current, future]);
    const repository = {
      createQueryBuilder: () => query,
    } as unknown as Repository<WorkSession>;
    const service = new DayFactsService(repository);

    const result = await service.collect('u_test', 'UTC', {
      startKey: '2026-11-10',
      endKey: '2026-11-10',
      start: new Date('2026-11-10T00:00:00.000Z'),
      endExclusive: new Date('2026-11-11T00:00:00.000Z'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.branchWork).toEqual([
      expect.objectContaining({
        branch: 'feat/branch-aware-worklogs',
        workState: 'continued',
        previousActiveDays: 1,
        commitsObserved: 0,
        commits: [],
        contextCommits: [{ date: '2026-11-08', message: 'add branch activity to daily facts' }],
      }),
    ]);
  });

  it('keeps separate branch tasks ordered by active time', async () => {
    const mainTask = createSession();
    mainTask.activeSeconds = 3600;
    mainTask.gitBranch = 'feat/dashboard-translations';

    const smallTask = createSession();
    smallTask.activeSeconds = 900;
    smallTask.gitBranch = 'fix/dashboard-spacing';
    smallTask.fileSeconds = { 'src/components/dashboard.tsx': 900 };
    smallTask.commits = [];
    smallTask.terminalCommands = [
      {
        command: 'pnpm test',
        cwd: null,
        exitCode: 0,
        durationMs: 1500,
        kind: 'test',
        timestamp: '2026-11-10T10:30:00.000Z',
      },
    ];

    const query = new WorkSessionQueryStub([smallTask, mainTask]);
    const repository = {
      createQueryBuilder: () => query,
    } as unknown as Repository<WorkSession>;
    const service = new DayFactsService(repository);

    const result = await service.collect('u_test', 'UTC', {
      startKey: '2026-11-10',
      endKey: '2026-11-10',
      start: new Date('2026-11-10T00:00:00.000Z'),
      endExclusive: new Date('2026-11-11T00:00:00.000Z'),
    });

    expect(result[0]?.branchWork.map(({ branch, workState }) => ({ branch, workState }))).toEqual([
      { branch: 'feat/dashboard-translations', workState: 'committed' },
      { branch: 'fix/dashboard-spacing', workState: 'started' },
    ]);
    expect(result[0]?.branchWork[1]?.terminal.tests).toEqual({
      runs: 1,
      failed: 0,
      lastRunPassed: true,
    });
  });

  it('marks a commit even when its message is hidden by privacy settings', async () => {
    const session = createSession();
    const commit = session.commits[0];
    session.commits = [{ ...commit, message: '' }];

    const query = new WorkSessionQueryStub([session]);
    const repository = {
      createQueryBuilder: () => query,
    } as unknown as Repository<WorkSession>;
    const service = new DayFactsService(repository);

    const result = await service.collect('u_test', 'UTC', {
      startKey: '2026-11-10',
      endKey: '2026-11-10',
      start: new Date('2026-11-10T00:00:00.000Z'),
      endExclusive: new Date('2026-11-11T00:00:00.000Z'),
    });

    expect(result[0]?.branchWork[0]).toEqual(
      expect.objectContaining({ workState: 'committed', commitsObserved: 1, commits: [] }),
    );
  });
});
