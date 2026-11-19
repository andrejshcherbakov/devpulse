export interface User {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  hourlyRate: number;
  currency: string;
  hasOpenaiKey: boolean;
  llmProvider: LlmProvider | null;
  llmModel: string | null;
  llmBaseUrl: string | null;
}

export interface ProjectLanguage {
  name: string;
  seconds: number;
  percentage: number;
}

export interface ProjectBranch {
  name: string;
  seconds: number;
}

export interface ProjectRecentSession {
  id: string;
  startedAt: string;
  durationSeconds: number;
  gitBranch: string | null;
  primaryLanguage: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  remote: string | null;
  activeTime: string;
  focusScore: number;
  sessions: number;
  lastActive: string | null;
  totalCommits: number;
  totalCommands: number;
  languages: Array<ProjectLanguage>;
  branches: Array<ProjectBranch>;
  recentSessions: Array<ProjectRecentSession>;
}
export interface WorkSessionSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  projectName: string;
  gitBranch: string | null;
  durationSeconds: number;
  focusScore: number;
  earnedMoney: number;
  primaryLanguage: string | null;
  status: 'active' | 'closed';
  isLive: boolean;
}

export interface SessionCommit {
  hash: string;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  filesList: Array<string>;
  timestamp: string;
}

export interface WorkSessionDetail {
  id: string;
  projectName: string | null;
  gitBranch: string | null;
  startedAt: string;
  endedAt: string | null;
  activeSeconds: number;
  idleSeconds: number;
  focusScore: number;
  earnedMoney: number;
  primaryLanguage: string | null;
  languageSeconds: Record<string, number>;
  commandsRun: number;
  failedCommands: number;
  terminalCommands: Array<SessionCommand>;
  status: 'active' | 'closed';
  commitsCount: number;
  commits: Array<SessionCommit>;
}

export interface SessionCommand {
  command: string;
  cwd: string | null;
  exitCode: number | null;
  durationMs: number;
  kind: string;
  timestamp: string;
}

export interface TimeseriesPoint {
  date: string;
  activeSeconds: number;
  earnedMoney: number;
}

export interface BranchDataPoint {
  branchName: string;
  activeSeconds: number;
}

export interface LiveStatus {
  isCodingNow: boolean;
  currentProject: string | null;
  currentBranch: string | null;
  currentLanguage: string | null;
  currentSessionDurationSeconds: number | null;
  sessionStartedAt: string | null;
  inactiveReason: 'no-data' | 'session-closed' | 'signal-stale' | null;
  lastSignalAt: string | null;
}

export interface LanguageStat {
  language: string;
  activeSeconds: number;
  formattedTime: string;
  percentage: number;
}

export interface LanguagesBreakdown {
  totalActiveSeconds: number;
  languages: Array<LanguageStat>;
}

export interface CommandStat {
  command: string;
  kind: 'test' | 'build' | 'lint' | 'install' | 'git' | 'task' | 'other';
  runs: number;
  failedRuns: number;
  avgDurationMs: number;
  successRate: number;
}

export interface CommandsBreakdown {
  totalCommands: number;
  commands: Array<CommandStat>;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  type: 'extension' | 'integration';
  deviceLabel: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  type: 'extension' | 'integration';
  deviceLabel?: string;
}

export interface CreateApiKeyResponse {
  rawKey: string;
  key: ApiKeySummary;
}

export interface DailyWorklogResponse {
  date: string;
  summary: string;
}

export type WorklogFormat = 'daily-log' | 'standup' | 'client-report';
export type WorklogLanguage = 'en' | 'pl';
export type LlmProvider = 'openrouter' | 'openai' | 'custom';
export type LlmTier = 'free' | 'paid';

export interface WorklogPlanDay {
  date: string;
  activeMinutes: number;
  focusScore: number;
  projects: Array<string>;
}

export interface WorklogPlan {
  startDate: string;
  endDate: string;
  limits: {
    maxRangeDays: number;
    maxActiveDays: number;
    tier: LlmTier;
  };
  exceedsLimit: boolean;
  totals: {
    activeDays: number;
    activeMinutes: number;
    averageFocusScore: number;
  };
  days: Array<WorklogPlanDay>;
}

export interface WorklogDayResult {
  date: string;
  text: string;
  model: string;
  cached: boolean;
}
