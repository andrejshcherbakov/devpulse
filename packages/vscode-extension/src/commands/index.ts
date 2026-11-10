import type * as vscode from 'vscode';

import type { StatusBarState } from '../status-bar/status-bar-state.js';
import type { TelemetryBridge } from '../telemetry/telemetry-bridge.js';

import { registerClearApiKeyCommand } from './clear-api-key.command.js';
import { registerOpenDashboardCommands } from './open-dashboard.command.js';
import { registerPauseTrackingCommand } from './pause-tracking.command.js';
import { registerResumeTrackingCommand } from './resume-tracking.command.js';
import { registerSetApiKeyCommand } from './set-api-key.command.js';
import { registerShowDiagnosticsCommand } from './show-diagnostics.command.js';
import { registerShowLogCommand } from './show-log.command.js';
import { registerShowStatusMenuCommand } from './show-status-menu.command.js';

interface CommandDependencies {
  state: StatusBarState;
  getBridge: () => TelemetryBridge | undefined;
  onApiKeyChanged: (configured: boolean) => void;
  outputChannel: vscode.LogOutputChannel;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  deps: CommandDependencies,
): Array<vscode.Disposable> {
  return [
    registerSetApiKeyCommand(
      context,
      deps.state,
      deps.getBridge,
      deps.onApiKeyChanged,
      deps.outputChannel,
    ),
    registerClearApiKeyCommand(context, deps.state, deps.getBridge, deps.onApiKeyChanged),

    registerShowStatusMenuCommand(deps.state),
    registerPauseTrackingCommand(context, deps.state, deps.getBridge),
    registerResumeTrackingCommand(context, deps.state, deps.getBridge),
    registerShowLogCommand(deps.outputChannel),
    registerShowDiagnosticsCommand(context, deps.outputChannel, deps.state, deps.getBridge),
    ...registerOpenDashboardCommands(),
  ];
}
