import { describe, expect, it } from '@jest/globals';

import type { User } from '../../users/entities/user.entity';
import { WorkSession } from '../entities/work-session.entity';

import { WorkSessionAccumulator } from './work-session-accumulator.service';

function createSession(): WorkSession {
  return Object.assign(new WorkSession(), {
    startedAt: new Date('2026-11-25T09:00:00.000Z'),
    endedAt: new Date('2026-11-25T09:00:00.000Z'),
    activeSeconds: 0,
    idleSeconds: 0,
    focusScore: 0,
    earnedMoney: 0,
    primaryLanguage: null,
    currentLanguage: null,
    languageSeconds: {},
    currentFilePath: null,
    fileSeconds: {},
    commandsRun: 0,
    failedCommands: 0,
    terminalCommands: [],
    commitsCount: 0,
    commits: [],
    workingTreeChanges: null,
    touchedSymbols: {},
    machineId: null,
    aiAssisted: false,
    aiInteractionsCount: 0,
  });
}

describe(WorkSessionAccumulator.name, () => {
  const accumulator = new WorkSessionAccumulator();

  it('records command facts without involving queue or database code', () => {
    const session = createSession();

    accumulator.applyEvent(
      session,
      {
        type: 'terminal_command',
        gitBranch: 'dev',
        command: 'pnpm test',
        exitCode: 1,
        durationMs: 2500,
      },
      new Date('2026-11-25T09:01:00.000Z'),
    );

    expect(session.commandsRun).toBe(1);
    expect(session.failedCommands).toBe(1);
    expect(session.terminalCommands).toEqual([
      expect.objectContaining({ kind: 'test', exitCode: 1, durationMs: 2500 }),
    ]);
  });

  it('recomputes time, focus, earnings and primary language together', () => {
    const session = createSession();
    session.endedAt = new Date('2026-11-25T10:00:00.000Z');
    session.idleSeconds = 600;
    session.languageSeconds = { typescript: 2400, css: 600 };

    const user: Pick<User, 'hourlyRate'> = { hourlyRate: 60 };

    accumulator.recomputeDerived(session, user);

    expect(session.activeSeconds).toBe(3000);
    expect(session.focusScore).toBeCloseTo(83.33, 1);
    expect(session.earnedMoney).toBe(50);
    expect(session.primaryLanguage).toBe('typescript');
  });

  it('caps idle credit from idle_end events at thirty minutes', () => {
    const seconds = accumulator.getIdleCreditSeconds({
      type: 'idle_end',
      gitBranch: 'dev',
      durationMs: 45 * 60 * 1000,
    });

    expect(seconds).toBe(30 * 60);
  });
});
