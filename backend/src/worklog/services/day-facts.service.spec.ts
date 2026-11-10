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
        activeMinutes: 80,
        activeFiles: [
          { path: 'src/locales/pl.json', minutes: 45 },
          { path: 'src/components/locale-switcher.tsx', minutes: 35 },
        ],
        changedFiles: ['src/locales/pl.json', 'src/components/locale-switcher.tsx'],
        commits: [
          {
            message: 'add Polish dashboard translations',
            insertions: 120,
            deletions: 2,
          },
        ],
      },
    ]);
  });
});
