export const WORKING_TREE_STATUSES = [
  'modified',
  'added',
  'deleted',
  'renamed',
  'untracked',
  'conflicted',
] as const;

export type WorkingTreeStatus = (typeof WORKING_TREE_STATUSES)[number];

export interface WorkingTreeChange {
  path: string;
  status: WorkingTreeStatus;
}

export interface TelemetryEventDto {
  type:
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

  gitBranch: string | null;
  gitRemoteUrl?: string;
  filePath?: string | null;
  language?: string;
  durationMs?: number | null;
  clientTimestamp?: string;
  activityChangedAt?: string;
  machineId?: string;
  sessionId?: string;

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
