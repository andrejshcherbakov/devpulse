import * as vscode from 'vscode';

import { DEVPULSE_API_KEY_SECRET } from '../secret-keys.js';
import type { StatusBarState } from '../status-bar/status-bar-state.js';

function configuredValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? '(not configured)' : trimmed;
}

export function registerShowDiagnosticsCommand(
  context: vscode.ExtensionContext,
  outputChannel: vscode.LogOutputChannel,
  state: StatusBarState,
): vscode.Disposable {
  return vscode.commands.registerCommand('devpulse.showDiagnostics', async () => {
    outputChannel.show();

    const key = await context.secrets.get(DEVPULSE_API_KEY_SECRET);
    const config = vscode.workspace.getConfiguration('devpulse');
    const apiUrl = config.get<string>('apiUrl');
    const dashboardUrl = config.get<string>('dashboardUrl');

    const keyLabel = key ? 'present' : 'missing';
    const pkg = context.extension.packageJSON as { version?: string };

    outputChannel.info('───────────── DevPulse Diagnostics ─────────────');
    outputChannel.info(`Version: ${pkg.version ?? 'unknown'}`);
    outputChannel.info(`API URL: ${configuredValue(apiUrl)}`);
    outputChannel.info(`Dashboard URL: ${configuredValue(dashboardUrl)}`);
    outputChannel.info(`API key: ${keyLabel}`);
    outputChannel.info(`Workspace trusted: ${String(vscode.workspace.isTrusted)}`);
    outputChannel.info(
      `VS Code telemetry: ${vscode.env.isTelemetryEnabled ? 'enabled' : 'disabled'}`,
    );
    outputChannel.info(`Tracking paused: ${String(state.isPaused)}`);
    outputChannel.info(`Activity: ${state.activity}`);
    outputChannel.info(`Tracking blocker: ${state.blocker ?? 'none'}`);
    outputChannel.info(`Health: ${state.health}`);
    outputChannel.info('────────────────────────────────────────────────');
  });
}
