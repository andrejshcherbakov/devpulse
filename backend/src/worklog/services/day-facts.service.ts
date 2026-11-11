import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { Repository } from 'typeorm';

import { WorkSession } from '../../telemetry/entities/work-session.entity';
import {
  BRANCH_CONTEXT_LOOKBACK_DAYS,
  DATE_FORMAT,
  MAX_FILE_PATH_LENGTH,
  MAX_HOT_FILES_PER_DAY,
  MAX_LANGUAGES_PER_DAY,
  MAX_NAME_LENGTH,
  MAX_PROJECTS_PER_DAY,
} from '../constants/worklog.constants';
import type { DayFacts } from '../interfaces/day-facts.interface';
import { sanitizeText } from '../prompt/sanitize';
import type { UtcRange } from '../utils/date-range';
import { buildTerminalFacts, type TerminalCommand } from '../utils/terminal-facts';

import { type BranchContextSession, BranchWorkFactsBuilder } from './branch-work-facts.builder';

interface ProjectAccumulator {
  seconds: number;
}

@Injectable()
export class DayFactsService {
  private readonly branchWorkBuilder = new BranchWorkFactsBuilder();

  constructor(
    @InjectRepository(WorkSession)
    private readonly workSessionRepo: Repository<WorkSession>,
  ) {}

  public async collect(
    userId: WorkSession['userId'],
    timezone: string,
    range: UtcRange,
  ): Promise<Array<DayFacts>> {
    const [sessions, history] = await Promise.all([
      this.loadDaySessions(userId, range),
      this.loadBranchHistory(userId, range),
    ]);
    const contextSessions: Array<BranchContextSession> = [...history, ...sessions];
    const sessionsByDay = new Map<string, Array<WorkSession>>();

    for (const session of sessions) {
      // Keep this deterministic when a repository stub or legacy adapter ignores filters.
      if (session.startedAt < range.start || session.startedAt >= range.endExclusive) continue;

      const day = formatInTimeZone(session.startedAt, timezone, DATE_FORMAT);
      const list = sessionsByDay.get(day) ?? [];

      list.push(session);
      sessionsByDay.set(day, list);
    }

    return [...sessionsByDay.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, daySessions]) => this.buildFacts(date, daySessions, contextSessions, timezone))
      .filter((facts): facts is DayFacts => facts !== null);
  }

  private loadDaySessions(
    userId: WorkSession['userId'],
    range: UtcRange,
  ): Promise<Array<WorkSession>> {
    return this.workSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.project', 'project')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.started_at >= :start', { start: range.start })
      .andWhere('session.started_at < :endExclusive', { endExclusive: range.endExclusive })
      .orderBy('session.started_at', 'ASC')
      .getMany();
  }

  private loadBranchHistory(
    userId: WorkSession['userId'],
    range: UtcRange,
  ): Promise<Array<BranchContextSession>> {
    const contextStart = new Date(range.start);
    contextStart.setUTCDate(contextStart.getUTCDate() - BRANCH_CONTEXT_LOOKBACK_DAYS);

    return this.workSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.project', 'project')
      .select([
        'session.id',
        'session.projectId',
        'session.gitBranch',
        'session.startedAt',
        'session.commits',
        'project.id',
        'project.name',
      ])
      .where('session.user_id = :userId', { userId })
      .andWhere('session.started_at >= :contextStart', { contextStart })
      .andWhere('session.started_at < :start', { start: range.start })
      .orderBy('session.started_at', 'ASC')
      .getMany();
  }

  private buildFacts(
    date: string,
    sessions: ReadonlyArray<WorkSession>,
    contextSessions: ReadonlyArray<BranchContextSession>,
    timezone: string,
  ): DayFacts | null {
    let activeSeconds = 0;
    let weightedFocus = 0;
    let aiSeconds = 0;

    const projects = new Map<string, ProjectAccumulator>();
    const languages = new Map<string, number>();
    const files = new Map<string, number>();
    const commands: Array<TerminalCommand> = [];

    for (const session of sessions) {
      const active = session.activeSeconds;

      activeSeconds += active;
      weightedFocus += session.focusScore * active;
      if (session.aiAssisted) aiSeconds += active;

      this.addProject(projects, session, active);
      this.addLanguages(languages, session, active);
      this.addFiles(files, session);
      commands.push(...session.terminalCommands);
    }

    if (activeSeconds === 0) return null;

    return {
      date,
      activeMinutes: Math.max(1, Math.round(activeSeconds / 60)),
      focusScore: Math.round(weightedFocus / activeSeconds),
      projects: this.formatProjects(projects),
      branchWork: this.branchWorkBuilder.build(date, sessions, contextSessions, timezone),
      languages: this.formatLanguages(languages),
      hotFiles: this.formatHotFiles(files),
      terminal: buildTerminalFacts(commands),
      aiAssistedPercent: aiSeconds > 0 ? Math.round((aiSeconds / activeSeconds) * 100) : null,
    };
  }

  private addProject(
    projects: Map<string, ProjectAccumulator>,
    session: WorkSession,
    seconds: number,
  ): void {
    const name = sanitizeText(session.project?.name ?? 'No project', MAX_NAME_LENGTH);
    const entry = projects.get(name) ?? { seconds: 0 };

    entry.seconds += seconds;
    projects.set(name, entry);
  }

  private addLanguages(
    languages: Map<string, number>,
    session: WorkSession,
    activeSeconds: number,
  ): void {
    const perLanguage = Object.entries(session.languageSeconds ?? {});

    if (perLanguage.length > 0) {
      for (const [language, seconds] of perLanguage) {
        this.addSeconds(languages, sanitizeText(language, MAX_NAME_LENGTH), seconds);
      }
      return;
    }

    if (session.primaryLanguage) {
      this.addSeconds(
        languages,
        sanitizeText(session.primaryLanguage, MAX_NAME_LENGTH),
        activeSeconds,
      );
    }
  }

  private addFiles(files: Map<string, number>, session: WorkSession): void {
    for (const [filePath, seconds] of Object.entries(session.fileSeconds)) {
      const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);
      if (safePath !== '' && seconds > 0) this.addSeconds(files, safePath, seconds);
    }
  }

  private addSeconds(target: Map<string, number>, key: string, seconds: number): void {
    target.set(key, (target.get(key) ?? 0) + seconds);
  }

  private formatProjects(projects: Map<string, ProjectAccumulator>): DayFacts['projects'] {
    return [...projects.entries()]
      .sort(([, first], [, second]) => second.seconds - first.seconds)
      .slice(0, MAX_PROJECTS_PER_DAY)
      .map(([name, entry]) => ({
        name,
        minutes: Math.max(1, Math.round(entry.seconds / 60)),
      }));
  }

  private formatLanguages(languages: Map<string, number>): DayFacts['languages'] {
    const total = [...languages.values()].reduce((sum, seconds) => sum + seconds, 0);
    if (total === 0) return [];

    return [...languages.entries()]
      .sort(([, first], [, second]) => second - first)
      .slice(0, MAX_LANGUAGES_PER_DAY)
      .map(([name, seconds]) => ({ name, percent: Math.round((seconds / total) * 100) }));
  }

  private formatHotFiles(files: Map<string, number>): DayFacts['hotFiles'] {
    const total = [...files.values()].reduce((sum, seconds) => sum + seconds, 0);
    if (total === 0) return [];

    return [...files.entries()]
      .sort(([, first], [, second]) => second - first)
      .slice(0, MAX_HOT_FILES_PER_DAY)
      .map(([path, seconds]) => ({
        path,
        minutes: Math.max(1, Math.round(seconds / 60)),
        percent: Math.round((seconds / total) * 100),
      }));
  }
}
