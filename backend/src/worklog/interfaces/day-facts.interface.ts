export interface CommandKindFacts {
  runs: number;
  failed: number;
  lastRunPassed: boolean | null;
}

export interface TerminalFacts {
  totalRuns: number;
  failedRuns: number;
  tests: CommandKindFacts | null;
  builds: CommandKindFacts | null;
  lint: CommandKindFacts | null;
}

export type BranchWorkState = 'started' | 'continued' | 'committed';

export interface BranchContextCommitFacts {
  date: string;
  message: string;
}

export interface BranchWorkFacts {
  project: string;
  branch: string;
  workState: BranchWorkState;
  previousActiveDays: number;
  activeMinutes: number;
  activeFiles: Array<{ path: string; minutes: number }>;
  changedFiles: Array<string>;
  uncommittedFiles: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
  }> | null;
  touchedSymbols: Array<{ path: string; symbols: Array<string> }>;
  commitsObserved: number;
  commits: Array<{ message: string; insertions: number; deletions: number }>;
  contextCommits: Array<BranchContextCommitFacts>;
  terminal: TerminalFacts;
}

export interface DayFacts {
  date: string;
  activeMinutes: number;
  focusScore: number;
  projects: Array<{ name: string; minutes: number }>;
  branchWork: Array<BranchWorkFacts>;
  languages: Array<{ name: string; percent: number }>;
  hotFiles: Array<{ path: string; minutes: number; percent: number }>;
  terminal: TerminalFacts;
  aiAssistedPercent: number | null;
}
