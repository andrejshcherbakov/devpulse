import * as vscode from 'vscode';

export interface TodayStats {
  activeSeconds: number;
  focusScore: number;
  sessionsCount: number;
}

export type ActivityStatus = 'active' | 'idle';
export type TrackingBlockReason =
  | 'initializing'
  | 'tracking-disabled'
  | 'workspace-untrusted'
  | 'telemetry-disabled'
  | 'missing-key'
  | 'api-unconfigured'
  | 'no-workspace'
  | 'no-git'
  | 'startup-error';
export type HealthStatus = 'ok' | 'missing-key' | 'invalid-key' | 'offline' | 'error';

export class StatusBarState implements vscode.Disposable {
  private isPausedValue = false;
  private activityValue: ActivityStatus = 'idle';
  private blockerValue: TrackingBlockReason | null = 'initializing';
  private todayStatsValue: TodayStats | null = null;
  private healthValue: HealthStatus = 'ok';

  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  get isPaused(): boolean {
    return this.isPausedValue;
  }

  get activity(): ActivityStatus {
    return this.activityValue;
  }

  get blocker(): TrackingBlockReason | null {
    return this.blockerValue;
  }

  get todayStats(): TodayStats | null {
    return this.todayStatsValue;
  }

  get health(): HealthStatus {
    return this.healthValue;
  }

  setPaused(value: boolean): void {
    if (this.isPausedValue === value) return;
    this.isPausedValue = value;
    this.emitter.fire();
  }

  setActivity(value: ActivityStatus): void {
    if (this.activityValue === value) return;
    this.activityValue = value;
    this.emitter.fire();
  }

  setBlocker(value: TrackingBlockReason | null): void {
    if (this.blockerValue === value) return;
    this.blockerValue = value;
    this.emitter.fire();
  }

  setTodayStats(value: TodayStats | null): void {
    this.todayStatsValue = value;
    this.emitter.fire();
  }

  setHealth(value: HealthStatus): void {
    if (this.healthValue === value) return;
    this.healthValue = value;
    this.emitter.fire();
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
