import * as vscode from 'vscode';

import type { StatusBarState } from '../status-bar/status-bar-state.js';
import { TRACKING_PAUSED_STORAGE_KEY } from '../storage-keys.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';

export function registerPauseTrackingCommand(
  context: vscode.ExtensionContext,
  state: StatusBarState,
  getBridge: () => TelemetryBridge | undefined,
): vscode.Disposable {
  return vscode.commands.registerCommand('devpulse.pauseTracking', async () => {
    if (state.isPaused) return;

    await context.globalState.update(TRACKING_PAUSED_STORAGE_KEY, true);
    state.setPaused(true);
    getBridge()?.pause();

    void vscode.window.showInformationMessage('DevPulse: tracking paused.');
  });
}
