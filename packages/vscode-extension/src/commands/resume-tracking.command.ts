import * as vscode from 'vscode';

import type { StatusBarState } from '../status-bar/status-bar-state.js';
import { TRACKING_PAUSED_STORAGE_KEY } from '../storage-keys.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';

export function registerResumeTrackingCommand(
  context: vscode.ExtensionContext,
  state: StatusBarState,
  getBridge: () => TelemetryBridge | undefined,
): vscode.Disposable {
  return vscode.commands.registerCommand('devpulse.resumeTracking', async () => {
    if (!state.isPaused) return;

    await context.globalState.update(TRACKING_PAUSED_STORAGE_KEY, false);
    state.setPaused(false);
    getBridge()?.resume();

    void vscode.window.showInformationMessage('DevPulse: tracking resumed.');
  });
}
