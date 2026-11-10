export interface CommandKindFacts {
  runs: number;
  failed: number;
  lastRunPassed: boolean | null;
}

export interface BranchWorkFacts {
  project: string;
  branch: string;
  activeMinutes: number;
  activeFiles: Array<{ path: string; minutes: number }>;
  changedFiles: Array<string>;
  commits: Array<{ message: string; insertions: number; deletions: number }>;
}

export interface DayFacts {
  date: string;
  activeMinutes: number;
  focusScore: number;
  projects: Array<{ name: string; minutes: number; branches: Array<string> }>;
  branchWork: Array<BranchWorkFacts>;
  languages: Array<{ name: string; percent: number }>;
  hotFiles: Array<{ path: string; minutes: number; percent: number }>;
  terminal: {
    totalRuns: number;
    failedRuns: number;
    tests: CommandKindFacts | null;
    builds: CommandKindFacts | null;
    lint: CommandKindFacts | null;
  };
  commits: Array<{ message: string; insertions: number; deletions: number }>;
  aiAssistedPercent: number | null;
}
