import * as vscode from 'vscode';

import { getApiUrlConfigurationError } from '../configuration.js';
import { DEVPULSE_API_KEY_SECRET } from '../secret-keys.js';
import type { StatusBarState } from '../status-bar/status-bar-state.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';

const COMMAND_ID = 'devpulse.setApiKey';
const API_KEY_PATTERN = /^dp_live_[a-f0-9]{64}$/;

export function registerSetApiKeyCommand(
  context: vscode.ExtensionContext,
  state: StatusBarState,
  getBridge: () => TelemetryBridge | undefined,
  onApiKeyChanged: (configured: boolean) => void,
): vscode.Disposable {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const apiKey = await vscode.window.showInputBox({
      title: 'DevPulse API Key',
      prompt: 'Paste your API key.',
      password: true,
      ignoreFocusOut: true,
      validateInput: (value) => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
          return 'API key cannot be empty';
        }

        if (!API_KEY_PATTERN.test(trimmedValue)) {
          return 'Invalid API key format';
        }

        return null;
      },
    });

    if (apiKey === undefined) {
      return;
    }

    await context.secrets.store(DEVPULSE_API_KEY_SECRET, apiKey.trim());
    state.setHealth('ok');
    onApiKeyChanged(true);
    void getBridge()?.flush(undefined, true);

    const apiConfigurationError = getApiUrlConfigurationError();
    if (apiConfigurationError === null) {
      void vscode.window.showInformationMessage('DevPulse API key saved securely.');
      return;
    }

    const selected = await vscode.window.showInformationMessage(
      `DevPulse API key saved. ${apiConfigurationError}.`,
      'Open Settings',
    );
    if (selected === 'Open Settings') {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'devpulse.apiUrl');
    }
  });
}
