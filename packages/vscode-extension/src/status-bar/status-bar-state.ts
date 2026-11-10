import * as vscode from 'vscode';

import { combineHealthStatuses, type HealthStatus } from './health-status.js';

export type { HealthStatus } from './health-status.js';

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
export class StatusBarState implements vscode.Disposable {
  private isPausedValue = false;
  private activityValue: ActivityStatus = 'idle';
  private blockerValue: TrackingBlockReason | null = 'initializing';
  private todayStatsValue: TodayStats | null = null;
  private syncHealthValue: HealthStatus = 'ok';
  private statsHealthValue: HealthStatus = 'ok';

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
    return combineHealthStatuses(this.syncHealthValue, this.statsHealthValue);
  }

  get syncHealth(): HealthStatus {
    return this.syncHealthValue;
  }

  get statsHealth(): HealthStatus {
    return this.statsHealthValue;
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

  setSyncHealth(value: HealthStatus): void {
    if (this.syncHealthValue === value) return;
    this.syncHealthValue = value;
    this.emitter.fire();
  }

  setStatsHealth(value: HealthStatus): void {
    if (this.statsHealthValue === value) return;
    this.statsHealthValue = value;
    this.emitter.fire();
  }

  dispose(): void {
    this.emitter.dispose();
  }
}
