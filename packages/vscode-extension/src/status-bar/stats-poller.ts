import * as vscode from 'vscode';

import {
  MissingApiKeyError,
  type TelemetryApiClient,
  type TodayStats,
} from '../telemetry/api-client.js';
import { TelemetryRequestError } from '../telemetry/telemetry-request-error.js';

import type { HealthStatus } from './health-status.js';

const POLL_INTERVAL_MS = 60_000;
const NOTIFICATION_DEBOUNCE_MS = 5 * 60 * 1000;

interface StatsPollerState {
  setTodayStats(value: TodayStats | null): void;
  setStatsHealth(value: HealthStatus): void;
}

export class StatsPoller implements vscode.Disposable {
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastNotificationAt = 0;
  private isPolling = false;

  constructor(
    private readonly client: TelemetryApiClient,
    private readonly state: StatsPollerState,
    private readonly log?: vscode.LogOutputChannel,
  ) {}

  public start(): void {
    if (this.timer !== undefined) return;
    void this.poll();
    this.timer = setInterval(() => {
      void this.poll();
    }, POLL_INTERVAL_MS);
  }

  public stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const stats = await this.client.getTodayStats();
      this.state.setTodayStats(stats);
      this.state.setStatsHealth('ok');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log?.warn(`stats poll failed: ${message}`);

      if (error instanceof MissingApiKeyError) {
        this.state.setStatsHealth('missing-key');
        return;
      }

      if (error instanceof TelemetryRequestError && error.isAuthError) {
        this.state.setStatsHealth('invalid-key');
        this.notifyInvalidKey();
        return;
      }

      this.state.setStatsHealth('offline');
    } finally {
      this.isPolling = false;
    }
  }

  private notifyInvalidKey(): void {
    const now = Date.now();
    if (now - this.lastNotificationAt < NOTIFICATION_DEBOUNCE_MS) return;
    this.lastNotificationAt = now;

    void vscode.window
      .showWarningMessage(
        'DevPulse: API key is invalid or revoked. Telemetry is not being sent.',
        'Set new key',
        'Show log',
      )
      .then((selected) => {
        if (selected === 'Set new key') {
          void vscode.commands.executeCommand('devpulse.setApiKey');
        } else if (selected === 'Show log') {
          void vscode.commands.executeCommand('devpulse.showLog');
        }
      });
  }

  public dispose(): void {
    this.stop();
  }
}
