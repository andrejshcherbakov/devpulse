import { formatInTimeZone } from 'date-fns-tz';

import type { WorkSession } from '../../telemetry/entities/work-session.entity';
import {
  DATE_FORMAT,
  MAX_ACTIVE_FILES_PER_BRANCH,
  MAX_BRANCH_WORK_ITEMS_PER_DAY,
  MAX_CHANGED_FILES_PER_BRANCH,
  MAX_COMMIT_MESSAGE_LENGTH,
  MAX_COMMITS_PER_BRANCH,
  MAX_CONTEXT_COMMITS_PER_BRANCH,
  MAX_FILE_PATH_LENGTH,
  MAX_NAME_LENGTH,
} from '../constants/worklog.constants';
import type { BranchWorkFacts } from '../interfaces/day-facts.interface';
import { sanitizeText } from '../prompt/sanitize';
import { normalizeBranchName } from '../utils/branch-context';
import { buildTerminalFacts, type TerminalCommand } from '../utils/terminal-facts';

export type BranchContextSession = Pick<
  WorkSession,
  'projectId' | 'project' | 'gitBranch' | 'startedAt' | 'commits'
>;

interface BranchWorkAccumulator {
  key: string;
  project: string;
  branch: string;
  seconds: number;
  files: Map<string, number>;
  changedFiles: Set<string>;
  commitHashes: Set<string>;
  commits: Map<string, BranchWorkFacts['commits'][number]>;
  commands: Array<TerminalCommand>;
}

interface BranchContextCommit {
  date: string;
  message: string;
  timestamp: number;
}

interface BranchContextAccumulator {
  activeDays: Set<string>;
  commits: Map<string, BranchContextCommit>;
}

export class BranchWorkFactsBuilder {
  public build(
    date: string,
    sessions: ReadonlyArray<WorkSession>,
    contextSessions: ReadonlyArray<BranchContextSession>,
    timezone: string,
  ): Array<BranchWorkFacts> {
    const work = new Map<string, BranchWorkAccumulator>();

    for (const session of sessions) this.addSession(work, session);

    const context = this.buildContext(contextSessions, timezone);

    return [...work.values()]
      .sort((first, second) => second.seconds - first.seconds)
      .slice(0, MAX_BRANCH_WORK_ITEMS_PER_DAY)
      .map((entry) => this.formatEntry(entry, context.get(entry.key), date));
  }

  private addSession(target: Map<string, BranchWorkAccumulator>, session: WorkSession): void {
    const branch = this.normalizedBranch(session.gitBranch);
    if (branch === null) return;

    const key = this.branchKey(session, branch);
    const entry = target.get(key) ?? {
      key,
      project: sanitizeText(session.project?.name ?? 'No project', MAX_NAME_LENGTH),
      branch,
      seconds: 0,
      files: new Map<string, number>(),
      changedFiles: new Set<string>(),
      commitHashes: new Set<string>(),
      commits: new Map<string, BranchWorkFacts['commits'][number]>(),
      commands: [],
    };

    entry.seconds += session.activeSeconds;
    entry.commands.push(...session.terminalCommands);

    for (const [filePath, seconds] of Object.entries(session.fileSeconds)) {
      const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);
      if (safePath !== '' && seconds > 0) {
        entry.files.set(safePath, (entry.files.get(safePath) ?? 0) + seconds);
      }
    }

    for (const commit of session.commits) {
      entry.commitHashes.add(commit.hash);

      for (const filePath of commit.filesList) {
        const safePath = sanitizeText(filePath, MAX_FILE_PATH_LENGTH);
        if (safePath !== '') entry.changedFiles.add(safePath);
      }

      const message = this.commitMessage(commit.message);
      if (message === '') continue;

      entry.commits.set(commit.hash, {
        message,
        insertions: commit.insertions,
        deletions: commit.deletions,
      });
    }

    target.set(key, entry);
  }

  private buildContext(
    sessions: ReadonlyArray<BranchContextSession>,
    timezone: string,
  ): Map<string, BranchContextAccumulator> {
    const result = new Map<string, BranchContextAccumulator>();

    for (const session of sessions) {
      const branch = this.normalizedBranch(session.gitBranch);
      if (branch === null) continue;

      const key = this.branchKey(session, branch);
      const activeDate = formatInTimeZone(session.startedAt, timezone, DATE_FORMAT);
      const entry = result.get(key) ?? {
        activeDays: new Set<string>(),
        commits: new Map<string, BranchContextCommit>(),
      };

      entry.activeDays.add(activeDate);

      for (const commit of session.commits) {
        const message = this.commitMessage(commit.message);
        if (message === '') continue;

        const parsedTimestamp = Date.parse(commit.timestamp);
        const timestamp = Number.isNaN(parsedTimestamp)
          ? session.startedAt.getTime()
          : parsedTimestamp;

        entry.commits.set(commit.hash, {
          date: formatInTimeZone(new Date(timestamp), timezone, DATE_FORMAT),
          message,
          timestamp,
        });
      }

      result.set(key, entry);
    }

    return result;
  }

  private formatEntry(
    entry: BranchWorkAccumulator,
    context: BranchContextAccumulator | undefined,
    date: string,
  ): BranchWorkFacts {
    const previousActiveDays = context
      ? [...context.activeDays].filter((activeDate) => activeDate < date).length
      : 0;

    return {
      project: entry.project,
      branch: entry.branch,
      workState:
        entry.commitHashes.size > 0
          ? 'committed'
          : previousActiveDays > 0
            ? 'continued'
            : 'started',
      previousActiveDays,
      activeMinutes: entry.seconds > 0 ? Math.max(1, Math.round(entry.seconds / 60)) : 0,
      activeFiles: [...entry.files.entries()]
        .sort(([, first], [, second]) => second - first)
        .slice(0, MAX_ACTIVE_FILES_PER_BRANCH)
        .map(([path, seconds]) => ({ path, minutes: Math.max(1, Math.round(seconds / 60)) })),
      changedFiles: [...entry.changedFiles].slice(0, MAX_CHANGED_FILES_PER_BRANCH),
      commitsObserved: entry.commitHashes.size,
      commits: [...entry.commits.values()].slice(-MAX_COMMITS_PER_BRANCH),
      contextCommits: [...(context?.commits.values() ?? [])]
        .filter((commit) => commit.date < date)
        .sort((first, second) => second.timestamp - first.timestamp)
        .slice(0, MAX_CONTEXT_COMMITS_PER_BRANCH)
        .map((commit) => ({ date: commit.date, message: commit.message })),
      terminal: buildTerminalFacts(entry.commands),
    };
  }

  private normalizedBranch(value: string | null): string | null {
    if (value === null) return null;

    const branch = sanitizeText(normalizeBranchName(value), MAX_NAME_LENGTH);
    return branch === '' ? null : branch;
  }

  private commitMessage(value: string): string {
    return sanitizeText(value.split('\n', 1)[0] ?? '', MAX_COMMIT_MESSAGE_LENGTH);
  }

  private branchKey(session: BranchContextSession, branch: string): string {
    const projectKey = session.projectId ?? session.project?.name ?? 'No project';
    return `${projectKey}\u0000${branch}`;
  }
}
