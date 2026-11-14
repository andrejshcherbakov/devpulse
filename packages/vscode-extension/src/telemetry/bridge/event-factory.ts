import * as vscode from 'vscode';

import type { TelemetryEventDto, WorkingTreeChange } from '@devpulse/lib';

export type TelemetryEventType =
  | 'heartbeat'
  | 'file_save'
  | 'file_switch'
  | 'idle_start'
  | 'idle_end'
  | 'session_end'
  | 'terminal_command'
  | 'task_run'
  | 'git_commit'
  | 'ai_interaction'
  | 'working_tree'
  | 'symbol_touch';

export interface EventPartial {
  durationMs?: number | null;
  filePath?: string | null;
  language?: string | null;
  clientTimestamp?: string;
  activityChangedAt?: string;
  gitBranch?: string;
  gitRemoteUrl?: string | null;
  command?: string;
  commandCwd?: string | null;
  exitCode?: number | null;
  taskName?: string;
  taskSource?: string;
  commitHash?: string;
  commitMessage?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
  filesList?: Array<string>;
  aiTool?: string;
  aiEstimated?: boolean;
  workingTreeChanges?: Array<WorkingTreeChange>;
  symbols?: Array<string>;
}

export interface EventFactoryContext {
  currentBranch: string | null;
  currentRemoteUrl: string | null;
  fallbackBranch: string | null;
  fallbackRemoteUrl: string | null;
}

export function createEvent(
  type: TelemetryEventType,
  partial: EventPartial,
  ctx: EventFactoryContext,
): TelemetryEventDto {
  const gitBranch = partial.gitBranch ?? ctx.currentBranch ?? ctx.fallbackBranch;

  const resolvedRemoteUrl =
    partial.gitRemoteUrl === undefined
      ? (ctx.currentRemoteUrl ?? ctx.fallbackRemoteUrl)
      : partial.gitRemoteUrl;

  return {
    type,
    gitBranch,
    gitRemoteUrl: resolvedRemoteUrl ?? undefined,
    clientTimestamp: partial.clientTimestamp ?? new Date().toISOString(),
    activityChangedAt: partial.activityChangedAt,
    durationMs: partial.durationMs,
    filePath: partial.filePath,
    language: partial.language ?? undefined,
    machineId: vscode.env.machineId,
    sessionId: vscode.env.sessionId,
    command: partial.command,
    commandCwd: partial.commandCwd ?? undefined,
    exitCode: partial.exitCode,
    taskName: partial.taskName,
    taskSource: partial.taskSource,
    commitHash: partial.commitHash,
    commitMessage: partial.commitMessage,
    filesChanged: partial.filesChanged,
    insertions: partial.insertions,
    deletions: partial.deletions,
    filesList: partial.filesList,
    aiTool: partial.aiTool,
    aiEstimated: partial.aiEstimated,
    workingTreeChanges: partial.workingTreeChanges,
    symbols: partial.symbols,
  };
}
