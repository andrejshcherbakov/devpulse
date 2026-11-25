import { Injectable } from '@nestjs/common';

import { type WorkingTreeChange } from '@devpulse/lib';

import type { User } from '../../users/entities/user.entity';
import { TelemetryEventItemDto } from '../dto/request/ingest-telemetry-batch-request.dto';
import { WorkSession } from '../entities/work-session.entity';
import { classifyCommand } from '../utils/command-classifier';
import {
  addFileActivity,
  getFileActivityDeltaSeconds,
  normalizeWorkspaceFilePath,
} from '../utils/file-activity';
import { calculateSessionTime } from '../utils/session-time';

const MAX_IDLE_CREDIT_MS = 30 * 60 * 1000;
const MAX_LANGUAGE_DELTA_SEC = 300;
const MAX_COMMANDS = 500;
const MAX_COMMITS = 100;
const MAX_WORKING_TREE_FILES = 100;
const MAX_SYMBOL_FILES = 100;
const MAX_SYMBOLS_PER_FILE = 20;
const MAX_SYMBOL_NAME_LENGTH = 160;
const FOCUS_FAILURE_MAX_PENALTY = 20;

const NOISY_LANGUAGES: ReadonlySet<string> = new Set(['plaintext', 'log', 'jsonc']);
const FOCUS_RELEVANT_KINDS: ReadonlySet<string> = new Set(['test', 'build', 'lint', 'task']);

type TerminalCommandRecord = WorkSession['terminalCommands'][number];

@Injectable()
export class WorkSessionAccumulator {
  public accumulateActivity(session: WorkSession, time: Date): void {
    this.accumulateLanguage(session, time);
    this.accumulateFileActivity(session, time);
  }

  public applyEvent(session: WorkSession, event: TelemetryEventItemDto, time: Date): void {
    this.applyEventLanguage(session, event);
    this.applyEventFile(session, event);
    this.applyCommandTracking(session, event, time);
    this.applyAiInteractionTracking(session, event);
    this.applyCommitTracking(session, event, time);
    this.applyWorkingTreeTracking(session, event);
    this.applySymbolTracking(session, event);

    session.machineId ??= event.machineId ?? null;
  }

  public getIdleCreditSeconds(event: TelemetryEventItemDto): number {
    if ((event.type !== 'idle_end' && event.type !== 'session_end') || !event.durationMs) {
      return 0;
    }

    const rawSec = Math.round(event.durationMs / 1000);

    if (event.type === 'session_end') {
      return rawSec;
    }

    const capSec = Math.round(MAX_IDLE_CREDIT_MS / 1000);

    return Math.min(rawSec, capSec);
  }

  public resolveActiveUntil(eventTime: Date, idleCreditSeconds: number): Date {
    if (idleCreditSeconds <= 0) {
      return eventTime;
    }

    return new Date(eventTime.getTime() - idleCreditSeconds * 1000);
  }

  public addIdleCredit(session: WorkSession, requestedIdleSeconds: number): number {
    if (requestedIdleSeconds <= 0) {
      return 0;
    }

    const endedAt = session.endedAt ?? session.startedAt;
    const before = calculateSessionTime(session.startedAt, endedAt, session.idleSeconds);
    const after = calculateSessionTime(
      session.startedAt,
      endedAt,
      before.idleSeconds + requestedIdleSeconds,
    );

    session.idleSeconds = after.idleSeconds;
    return after.idleSeconds - before.idleSeconds;
  }

  public recomputeDerived(session: WorkSession, user: Pick<User, 'hourlyRate'>): void {
    const endedAt = session.endedAt ?? session.startedAt;
    const time = calculateSessionTime(session.startedAt, endedAt, session.idleSeconds);

    session.activeSeconds = time.activeSeconds;
    session.idleSeconds = time.idleSeconds;
    session.focusScore = this.computeFocusScore(
      session.activeSeconds,
      session.idleSeconds,
      session.terminalCommands,
    );
    session.earnedMoney = (session.activeSeconds / 3600) * user.hourlyRate;
    session.primaryLanguage = this.topLanguage(session.languageSeconds);
  }

  private computeFocusScore(
    activeSeconds: number,
    idleSeconds: number,
    commands: ReadonlyArray<{ kind: string; exitCode: number | null }>,
  ): number {
    const total = activeSeconds + idleSeconds;
    const baseFocus = total > 0 ? (activeSeconds / total) * 100 : 0;
    const meaningful = commands.filter((command) => FOCUS_RELEVANT_KINDS.has(command.kind));

    if (meaningful.length === 0) {
      return baseFocus;
    }

    const failed = meaningful.filter(
      (command) => command.exitCode !== null && command.exitCode !== 0,
    ).length;
    const penalty = (failed / meaningful.length) * FOCUS_FAILURE_MAX_PENALTY;

    return Math.max(0, Math.min(100, baseFocus - penalty));
  }

  private accumulateLanguage(session: WorkSession, time: Date): void {
    const lastAt = session.endedAt?.getTime() ?? session.startedAt.getTime();
    const deltaSec = Math.round((time.getTime() - lastAt) / 1000);

    if (deltaSec <= 0 || !session.currentLanguage) {
      return;
    }

    const capped = Math.min(deltaSec, MAX_LANGUAGE_DELTA_SEC);
    const buckets: Record<string, number> = { ...session.languageSeconds };
    buckets[session.currentLanguage] = (buckets[session.currentLanguage] ?? 0) + capped;
    session.languageSeconds = buckets;
  }

  private applyEventLanguage(session: WorkSession, event: TelemetryEventItemDto): void {
    if (!event.language) {
      return;
    }

    const language = event.language.toLowerCase();

    if (!NOISY_LANGUAGES.has(language)) {
      session.currentLanguage = language;
    }
  }

  private accumulateFileActivity(session: WorkSession, time: Date): void {
    const lastAt = session.endedAt ?? session.startedAt;
    const deltaSec = getFileActivityDeltaSeconds(lastAt, time);

    if (deltaSec <= 0 || !session.currentFilePath) {
      return;
    }

    session.fileSeconds = addFileActivity(session.fileSeconds, session.currentFilePath, deltaSec);
  }

  private applyEventFile(session: WorkSession, event: TelemetryEventItemDto): void {
    if (event.filePath === undefined) {
      return;
    }

    session.currentFilePath = normalizeWorkspaceFilePath(event.filePath);
  }

  private applyCommandTracking(
    session: WorkSession,
    event: TelemetryEventItemDto,
    time: Date,
  ): void {
    const record = this.toCommandRecord(event, time);

    if (record === null) {
      return;
    }

    session.terminalCommands = [...session.terminalCommands, record].slice(-MAX_COMMANDS);
    session.commandsRun += 1;

    if (record.exitCode !== null && record.exitCode !== 0) {
      session.failedCommands += 1;
    }

    if (record.kind === 'ai') {
      session.aiInteractionsCount += 1;
      session.aiAssisted = true;
    }
  }

  private toCommandRecord(event: TelemetryEventItemDto, time: Date): TerminalCommandRecord | null {
    if (event.type === 'terminal_command' && event.command) {
      return {
        command: event.command,
        cwd: event.commandCwd ?? null,
        exitCode: event.exitCode ?? null,
        durationMs: event.durationMs ?? 0,
        kind: classifyCommand(event.command),
        timestamp: time.toISOString(),
      };
    }

    if (event.type === 'task_run' && event.taskName) {
      return {
        command: event.taskName,
        cwd: null,
        exitCode: event.exitCode ?? null,
        durationMs: event.durationMs ?? 0,
        kind: 'task',
        timestamp: time.toISOString(),
      };
    }

    return null;
  }

  private applyAiInteractionTracking(session: WorkSession, event: TelemetryEventItemDto): void {
    if (event.type !== 'ai_interaction') {
      return;
    }

    session.aiInteractionsCount += 1;
    session.aiAssisted = true;
  }

  private applyCommitTracking(
    session: WorkSession,
    event: TelemetryEventItemDto,
    time: Date,
  ): void {
    if (event.type !== 'git_commit' || !event.commitHash) {
      return;
    }

    if (session.commits.some((commit) => commit.hash === event.commitHash)) {
      return;
    }

    session.commits = [
      ...session.commits,
      {
        hash: event.commitHash,
        message: event.commitMessage ?? '',
        filesChanged: event.filesChanged ?? 0,
        insertions: event.insertions ?? 0,
        deletions: event.deletions ?? 0,
        filesList: event.filesList ?? [],
        timestamp: time.toISOString(),
      },
    ].slice(-MAX_COMMITS);

    session.commitsCount = session.commits.length;
  }

  private applyWorkingTreeTracking(session: WorkSession, event: TelemetryEventItemDto): void {
    if (event.type !== 'working_tree' || event.workingTreeChanges === undefined) {
      return;
    }

    const changes: Array<WorkingTreeChange> = [];
    const seen = new Set<string>();

    for (const change of event.workingTreeChanges) {
      const path = normalizeWorkspaceFilePath(change.path);
      if (path === null || seen.has(path)) continue;

      seen.add(path);
      changes.push({ path, status: change.status });

      if (changes.length >= MAX_WORKING_TREE_FILES) break;
    }

    session.workingTreeChanges = changes;
  }

  private applySymbolTracking(session: WorkSession, event: TelemetryEventItemDto): void {
    if (event.type !== 'symbol_touch' || event.filePath === undefined || !event.symbols) {
      return;
    }

    const path = normalizeWorkspaceFilePath(event.filePath);
    if (path === null) return;

    const current = session.touchedSymbols;
    if (!(path in current) && Object.keys(current).length >= MAX_SYMBOL_FILES) return;

    const symbols = new Set(current[path] ?? []);

    for (const rawSymbol of event.symbols) {
      const symbol = rawSymbol
        .replaceAll(/[\r\n\t]+/g, ' ')
        .trim()
        .slice(0, MAX_SYMBOL_NAME_LENGTH);
      if (symbol !== '') symbols.add(symbol);
      if (symbols.size >= MAX_SYMBOLS_PER_FILE) break;
    }

    session.touchedSymbols = { ...current, [path]: [...symbols] };
  }

  private topLanguage(buckets: Record<string, number> | null | undefined): string | null {
    if (!buckets) {
      return null;
    }

    let best: string | null = null;
    let bestSec = 0;

    for (const [language, seconds] of Object.entries(buckets)) {
      if (seconds > bestSec) {
        best = language;
        bestSec = seconds;
      }
    }

    return best;
  }
}
