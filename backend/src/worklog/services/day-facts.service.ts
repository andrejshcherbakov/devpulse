import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { Repository } from 'typeorm';

import { WorkSession } from '../../telemetry/entities/work-session.entity';
import {
  DATE_FORMAT,
  MAX_ACTIVE_FILES_PER_BRANCH,
  MAX_BRANCH_WORK_ITEMS_PER_DAY,
  MAX_BRANCHES_PER_PROJECT,
  MAX_CHANGED_FILES_PER_BRANCH,
  MAX_COMMIT_MESSAGE_LENGTH,
  MAX_COMMITS_PER_BRANCH,
  MAX_COMMITS_PER_DAY,
  MAX_FILE_PATH_LENGTH,
  MAX_HOT_FILES_PER_DAY,
  MAX_LANGUAGES_PER_DAY,
  MAX_NAME_LENGTH,
  MAX_PROJECTS_PER_DAY,
} from '../constants/worklog.constants';
import type {
  BranchWorkFacts,
  CommandKindFacts,
  DayFacts,
} from '../interfaces/day-facts.interface';
import { sanitizeText } from '../prompt/sanitize';
import type { UtcRange } from '../utils/date-range';

type TerminalCommand = WorkSession['terminalCommands'][number];

interface ProjectAccumulator {
  seconds: number;
  branches: Set<string>;
}

interface BranchWorkAccumulator {
  project: string;
  branch: string;
  seconds: number;
  files: Map<string, number>;
  changedFiles: Set<string>;
  commits: Map<string, BranchWorkFacts['commits'][number]>;
}

@Injectable()
export class DayFactsService {
  constructor(
    @InjectRepository(WorkSession)
    private readonly workSessionRepo: Repository<WorkSession>,
  ) {}

  public async collect(
    userId: WorkSession['userId'],
    timezone: string,
    range: UtcRange,
  ): Promise<Array<DayFacts>> {
    const sessions = await this.workSessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.project', 'project')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.started_at >= :start', { start: range.start })
      .andWhere('session.started_at < :endExclusive', { endExclusive: range.endExclusive })
      .orderBy('session.started_at', 'ASC')
      .getMany();

    const sessionsByDay = new Map<string, Array<WorkSession>>();

    for (const session of sessions) {
      const day = formatInTimeZone(session.startedAt, timezone, DATE_FORMAT);
      const list = sessionsByDay.get(day) ?? [];

      list.push(session);
      sessionsByDay.set(day, list);
    }

    return [...sessionsByDay.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([date, daySessions]) => this.buildFacts(date, daySessions))
      .filter((facts): facts is DayFacts => facts !== null);
  }

  private buildFacts(date: string, sessions: ReadonlyArray<WorkSession>): DayFacts | null {
    let activeSeconds = 0;
    let weightedFocus = 0;
    let aiSeconds = 0;

    const projects = new Map<string, ProjectAccumulator>();
    const branchWork = new Map<string, BranchWorkAccumulator>();
    const languages = new Map<string, number>();
    const files = new Map<string, number>();
    const commits = new Map<string, DayFacts['commits'][number]>();
    const commands: Array<TerminalCommand> = [];

    for (const session of sessions) {
      const active = session.activeSeconds;

      activeSeconds += active;
      weightedFocus += session.focusScore * active;

      if (session.aiAssisted) {
        aiSeconds += active;
      }

      this.addProject(projects, session, active);
      this.addBranchWork(branchWork, session, active);
      this.addLanguages(languages, session, active);
      this.addFiles(files, session);

      for (const commit of session.commits) {
        if (commit.message.trim() === '') continue;
        commits.set(commit.hash, {
          message: sanitizeText(commit.message.split('\n', 1)[0] ?? '', MAX_COMMIT_MESSAGE_LENGTH),
          insertions: commit.insertions,
          deletions: commit.deletions,
        });
      }

      commands.push(...session.terminalCommands);
    }

    if (activeSeconds === 0) {
      return null;
    }

    return {
      date,
      activeMinutes: Math.max(1, Math.round(activeSeconds / 60)),
      focusScore: Math.round(weightedFocus / activeSeconds),
      projects: this.formatProjects(projects),
      branchWork: this.formatBranchWork(branchWork),
      languages: this.formatLanguages(languages),
      hotFiles: this.formatHotFiles(files),
      terminal: {
        totalRuns: commands.length,
        failedRuns: commands.filter((command) => this.isFailed(command)).length,
        tests: this.commandFacts(commands, 'test'),
        builds: this.commandFacts(commands, 'build'),
        lint: this.commandFacts(commands, 'lint'),
      },
      commits: [...commits.values()].slice(-MAX_COMMITS_PER_DAY),
      aiAssistedPercent: aiSeconds > 0 ? Math.round((aiSeconds / activeSeconds) * 100) : null,
    };
  }

  private addProject(
    projects: Map<string, ProjectAccumulator>,
    session: WorkSession,
    seconds: number,
  ): void {
    const name = sanitizeText(session.project?.name ?? 'No project', MAX_NAME_LENGTH);
    const entry = projects.get(name) ?? { seconds: 0, branches: new Set<string>() };

    entry.seconds += seconds;

    if (session.gitBranch) {
      entry.branches.add(sanitizeText(session.gitBranch, MAX_NAME_LENGTH));
    }

    projects.set(name, entry);
  }

  private addBranchWork(
    target: Map<string, BranchWorkAccumulator>,
    session: WorkSession,
    activeSeconds: number,
  ): void {
    if (!session.gitBranch) return;

    const project = sanitizeText(session.project?.name ?? 'No project', MAX_NAME_LENGTH);
    const branch = sanitizeText(session.gitBranch, MAX_NAME_LENGTH);
    const key = `${project}\u0000${branch}`;
    const entry = target.get(key) ?? {
      project,
      branch,
      seconds: 0,
      files: new Map<string, number>(),
      changedFiles: new Set<string>(),
      commits: new Map<string, BranchWorkFacts['commits'][number]>(),
    };

    entry.seconds += activeSeconds;

    for (const [filePath, seconds] of Object.entries(session.fileSeconds)) {
      const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);
      if (safePath !== '' && seconds > 0) {
        this.addSeconds(entry.files, safePath, seconds);
      }
    }

    for (const commit of session.commits) {
      for (const filePath of commit.filesList) {
        const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);
        if (safePath !== '') entry.changedFiles.add(safePath);
      }

      const message = sanitizeText(
        commit.message.split('\n', 1)[0] ?? '',
        MAX_COMMIT_MESSAGE_LENGTH,
      );
      if (message === '') continue;

      entry.commits.set(commit.hash, {
        message,
        insertions: commit.insertions,
        deletions: commit.deletions,
      });
    }

    target.set(key, entry);
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

  private addSeconds(target: Map<string, number>, key: string, seconds: number): void {
    target.set(key, (target.get(key) ?? 0) + seconds);
  }

  private addFiles(files: Map<string, number>, session: WorkSession): void {
    for (const [filePath, seconds] of Object.entries(session.fileSeconds)) {
      const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);

      if (safePath !== '' && seconds > 0) {
        this.addSeconds(files, safePath, seconds);
      }
    }
  }

  private formatProjects(projects: Map<string, ProjectAccumulator>): DayFacts['projects'] {
    return [...projects.entries()]
      .sort(([, first], [, second]) => second.seconds - first.seconds)
      .slice(0, MAX_PROJECTS_PER_DAY)
      .map(([name, entry]) => ({
        name,
        minutes: Math.max(1, Math.round(entry.seconds / 60)),
        branches: [...entry.branches].slice(0, MAX_BRANCHES_PER_PROJECT),
      }));
  }

  private formatBranchWork(branchWork: Map<string, BranchWorkAccumulator>): Array<BranchWorkFacts> {
    return [...branchWork.values()]
      .sort((first, second) => second.seconds - first.seconds)
      .slice(0, MAX_BRANCH_WORK_ITEMS_PER_DAY)
      .map((entry) => ({
        project: entry.project,
        branch: entry.branch,
        activeMinutes: entry.seconds > 0 ? Math.max(1, Math.round(entry.seconds / 60)) : 0,
        activeFiles: [...entry.files.entries()]
          .sort(([, first], [, second]) => second - first)
          .slice(0, MAX_ACTIVE_FILES_PER_BRANCH)
          .map(([path, seconds]) => ({
            path,
            minutes: Math.max(1, Math.round(seconds / 60)),
          })),
        changedFiles: [...entry.changedFiles].slice(0, MAX_CHANGED_FILES_PER_BRANCH),
        commits: [...entry.commits.values()].slice(-MAX_COMMITS_PER_BRANCH),
      }));
  }

  private formatLanguages(languages: Map<string, number>): DayFacts['languages'] {
    const total = [...languages.values()].reduce((sum, seconds) => sum + seconds, 0);

    if (total === 0) {
      return [];
    }

    return [...languages.entries()]
      .sort(([, first], [, second]) => second - first)
      .slice(0, MAX_LANGUAGES_PER_DAY)
      .map(([name, seconds]) => ({ name, percent: Math.round((seconds / total) * 100) }));
  }

  private formatHotFiles(files: Map<string, number>): DayFacts['hotFiles'] {
    const total = [...files.values()].reduce((sum, seconds) => sum + seconds, 0);

    if (total === 0) {
      return [];
    }

    return [...files.entries()]
      .sort(([, first], [, second]) => second - first)
      .slice(0, MAX_HOT_FILES_PER_DAY)
      .map(([filePath, seconds]) => ({
        path: filePath,
        minutes: Math.max(1, Math.round(seconds / 60)),
        percent: Math.round((seconds / total) * 100),
      }));
  }

  private isFailed(command: TerminalCommand): boolean {
    return command.exitCode !== null && command.exitCode !== 0;
  }

  private commandFacts(
    commands: ReadonlyArray<TerminalCommand>,
    kind: string,
  ): CommandKindFacts | null {
    const runs = commands
      .filter((command) => command.kind === kind)
      .sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp));

    if (runs.length === 0) {
      return null;
    }

    const finished = runs.filter((command) => command.exitCode !== null);
    const lastFinished = finished.at(-1);

    return {
      runs: runs.length,
      failed: runs.filter((command) => this.isFailed(command)).length,
      lastRunPassed: lastFinished ? lastFinished.exitCode === 0 : null,
    };
  }
}
