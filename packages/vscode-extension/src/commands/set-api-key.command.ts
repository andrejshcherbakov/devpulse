import * as vscode from 'vscode';

import { getApiUrlConfigurationError } from '../configuration.js';
import { DEVPULSE_API_KEY_SECRET } from '../secret-keys.js';
import type { StatusBarState } from '../status-bar/status-bar-state.js';
import { TelemetryApiClient } from '../telemetry/api-client.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';
import { TelemetryRequestError } from '../telemetry/telemetry-request-error.js';

const COMMAND_ID = 'devpulse.setApiKey';
const API_KEY_PATTERN = /^dp_live_[a-f0-9]{64}$/;

export function registerSetApiKeyCommand(
  context: vscode.ExtensionContext,
  state: StatusBarState,
  getBridge: () => TelemetryBridge | undefined,
  onApiKeyChanged: (configured: boolean) => void,
  outputChannel: vscode.LogOutputChannel,
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

    const apiConfigurationError = getApiUrlConfigurationError();
    if (apiConfigurationError !== null) {
      state.setSyncHealth('ok');
      state.setStatsHealth('ok');
      onApiKeyChanged(true);

      const selected = await vscode.window.showInformationMessage(
        `DevPulse API key saved. ${apiConfigurationError}.`,
        'Open Settings',
      );
      if (selected === 'Open Settings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'devpulse.apiUrl');
      }
      return;
    }

    const client = new TelemetryApiClient(context, outputChannel);
    try {
      await client.getTodayStats();
      state.setSyncHealth('ok');
      state.setStatsHealth('ok');
      onApiKeyChanged(true);
      void getBridge()?.flush(undefined, true);
      void vscode.window.showInformationMessage(
        'DevPulse API key saved and the connection was verified.',
      );
    } catch (error: unknown) {
      const invalidKey = error instanceof TelemetryRequestError && error.isAuthError;
      const health = invalidKey ? 'invalid-key' : 'offline';
      state.setSyncHealth(health);
      state.setStatsHealth(health);
      onApiKeyChanged(true);

      const selected = await vscode.window.showWarningMessage(
        invalidKey
          ? 'DevPulse API key was saved, but the server rejected it.'
          : 'DevPulse API key was saved, but the server could not be reached. Activity will be buffered locally.',
        'Show Log',
        'Open Settings',
      );
      if (selected === 'Show Log') {
        outputChannel.show();
      } else if (selected === 'Open Settings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'devpulse.apiUrl');
      }
    }
  });
}
