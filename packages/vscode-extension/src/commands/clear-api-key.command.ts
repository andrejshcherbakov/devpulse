import * as vscode from 'vscode';

import { DEVPULSE_API_KEY_SECRET } from '../secret-keys.js';
import type { StatusBarState } from '../status-bar/status-bar-state.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';

const COMMAND_ID = 'devpulse.clearApiKey';

export function registerClearApiKeyCommand(
  context: vscode.ExtensionContext,
  state: StatusBarState,
  getBridge: () => TelemetryBridge | undefined,
  onApiKeyChanged: (configured: boolean) => void,
): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const confirmed = await vscode.window.showWarningMessage(
      'Clear the DevPulse API key and all locally buffered events?',
      { modal: true },
      'Clear',
    );
    if (confirmed !== 'Clear') return;

    const bridge = getBridge();
    if (bridge !== undefined) {
      bridge.stop();
      await bridge.clearBufferedEvents();
    }
    await context.secrets.delete(DEVPULSE_API_KEY_SECRET);
    onApiKeyChanged(false);
    state.setHealth('missing-key');

    void vscode.window.showInformationMessage('DevPulse API key and buffered events cleared');
  });
}
