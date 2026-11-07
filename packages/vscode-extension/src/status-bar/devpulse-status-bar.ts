import * as vscode from 'vscode';

import { formatDuration } from '@devpulse/lib';

import type { GitContextProvider } from '../git-context.js';

import type {
  HealthStatus,
  StatusBarState,
  TodayStats,
  TrackingBlockReason,
} from './status-bar-state.js';

const BLOCK_REASON_LABELS: Record<TrackingBlockReason, string> = {
  initializing: 'Starting tracker…',
  'tracking-disabled': 'Tracking is disabled in DevPulse settings',
  'workspace-untrusted': 'Workspace is not trusted',
  'telemetry-disabled': 'VS Code telemetry is disabled',
  'missing-key': 'API key is missing',
  'api-unconfigured': 'API URL is not configured securely',
  'no-workspace': 'No workspace is open',
  'no-git': 'No Git branch detected',
  'startup-error': 'Tracker failed to start',
};

const HEALTH_LABELS: Record<Exclude<HealthStatus, 'ok'>, string> = {
  'missing-key': 'API key is missing — tracking is stopped',
  'invalid-key': 'API key is invalid — activity is buffered locally',
  offline: 'Server is offline — activity is buffered locally',
  error: 'Sync failed — check the DevPulse log',
};

function statusIcon(state: StatusBarState): string {
  if (state.isPaused) return '$(debug-pause)';
  if (state.blocker !== null) return '$(warning)';
  const health = state.health;
  if (health === 'invalid-key' || health === 'offline' || health === 'error') {
    return '$(warning)';
  }
  if (health === 'missing-key') return '$(key)';
  return state.activity === 'active' ? '$(circle-filled)' : '$(circle-outline)';
}

export class DevPulseStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: Array<vscode.Disposable> = [];

  private lastWorkspaceName: string | null = null;
  private lastGitBranch: string | null = null;
  private lastPaused: boolean | null = null;

  constructor(
    private readonly gitContextProvider: GitContextProvider,
    private readonly statusBarState: StatusBarState,
  ) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10_000);
    this.item.name = 'DevPulse Status';
    this.item.tooltip = 'DevPulse Status';
    this.item.command = 'devpulse.showMenu';

    this.disposables.push(
      this.gitContextProvider.onDidChangeContext(() => {
        this.render();
      }),
      this.statusBarState.onDidChange(() => {
        this.render();
      }),
    );

    this.render();
  }

  public show(): void {
    this.item.show();
  }

  private render(): void {
    const { workspaceName, gitBranch } = this.gitContextProvider.currentContext;
    const stats = this.statusBarState.todayStats;

    const timeLabel = stats ? formatDuration(stats.activeSeconds) : 'No Time';
    const branchLabel = gitBranch ?? 'No Git';

    this.item.text = `$(clock) ${timeLabel}  $(git-branch) ${branchLabel}  ${statusIcon(this.statusBarState)}`;
    this.item.tooltip = this.buildTooltip(workspaceName, gitBranch, stats);

    this.updateContextKeys(workspaceName, gitBranch, this.statusBarState.isPaused);
  }

  private updateContextKeys(
    workspaceName: string | null,
    gitBranch: string | null,
    isPaused: boolean,
  ): void {
    if (this.lastWorkspaceName !== workspaceName) {
      this.lastWorkspaceName = workspaceName;
      void vscode.commands.executeCommand('setContext', 'devpulse.workspaceName', workspaceName);
    }

    if (this.lastGitBranch !== gitBranch) {
      this.lastGitBranch = gitBranch;
      void vscode.commands.executeCommand('setContext', 'devpulse.gitBranch', gitBranch);
    }

    if (this.lastPaused !== isPaused) {
      this.lastPaused = isPaused;
      void vscode.commands.executeCommand('setContext', 'devpulse.trackingPaused', isPaused);
    }
  }

  private buildTooltip(
    workspaceName: string | null,
    gitBranch: string | null,
    stats: TodayStats | null,
  ): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.supportThemeIcons = true;

    md.appendMarkdown('**DevPulse**\n\n');
    md.appendMarkdown(`Workspace: ${workspaceName ?? 'None'}\n\n`);
    md.appendMarkdown(`Branch: ${gitBranch ?? 'None'}\n\n`);

    if (stats) {
      md.appendMarkdown(`Today: **${formatDuration(stats.activeSeconds)}**\n\n`);
      md.appendMarkdown(`Focus: ${String(stats.focusScore)}%\n\n`);
      md.appendMarkdown(`Sessions: ${String(stats.sessionsCount)}\n\n`);
    } else {
      md.appendMarkdown('No activity recorded today.\n\n');
    }

    md.appendMarkdown(`Tracking: **${this.statusLabel()}**\n\n`);

    const health = this.statusBarState.health;
    if (health !== 'ok') {
      md.appendMarkdown(`Sync: ${HEALTH_LABELS[health]}\n\n`);
    }

    md.appendMarkdown('_Click for menu_');

    return md;
  }

  private statusLabel(): string {
    if (this.statusBarState.isPaused) return 'Paused by you';
    const blocker = this.statusBarState.blocker;
    if (blocker !== null) {
      return BLOCK_REASON_LABELS[blocker];
    }
    return this.statusBarState.activity === 'active' ? 'Active' : 'Idle — waiting for activity';
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.item.dispose();
  }
}
