import * as vscode from 'vscode';

import { registerCommands } from './commands/index.js';
import { AiMonitor } from './signals/ai-monitor.js';
import { GitCommitWatcher } from './signals/git-commit-watcher.js';
import { SymbolMonitor } from './signals/symbol-monitor.js';
import { TasksMonitor } from './signals/tasks-monitor.js';
import { TerminalMonitor } from './signals/terminal-monitor.js';
import { WorkingTreeMonitor } from './signals/working-tree-monitor.js';
import { DevPulseStatusBar } from './status-bar/devpulse-status-bar.js';
import { StatsPoller } from './status-bar/stats-poller.js';
import { StatusBarState, type TrackingBlockReason } from './status-bar/status-bar-state.js';
import { TelemetryApiClient } from './telemetry/api-client.js';
import { TelemetryBridge } from './telemetry/telemetry-bridge.js';
import { ActivityMonitor } from './activity-monitor.js';
import {
  getApiUrlConfigurationError,
  isTrackingEnabled,
  shouldSendFilePaths,
  shouldSendSymbolNames,
} from './configuration.js';
import { GitContextProvider } from './git-context.js';
import { DEVPULSE_API_KEY_SECRET } from './secret-keys.js';
import { TRACKING_PAUSED_STORAGE_KEY } from './storage-keys.js';

const DEACTIVATE_FLUSH_TIMEOUT_MS = 3000;

interface TelemetrySession extends vscode.Disposable {
  readonly bridge: TelemetryBridge;
}

let session: TelemetrySession | undefined;
let extensionOutputChannel: vscode.LogOutputChannel | undefined;

function canStartTelemetry(apiKeyConfigured: boolean): boolean {
  return (
    isTrackingEnabled() &&
    apiKeyConfigured &&
    getApiUrlConfigurationError() === null &&
    vscode.workspace.isTrusted &&
    vscode.env.isTelemetryEnabled
  );
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const outputChannel = vscode.window.createOutputChannel('DevPulse', { log: true });
  extensionOutputChannel = outputChannel;
  const state = new StatusBarState();
  state.setPaused(context.globalState.get<boolean>(TRACKING_PAUSED_STORAGE_KEY, false));
  const storedApiKey = await context.secrets.get(DEVPULSE_API_KEY_SECRET);
  let apiKeyConfigured = storedApiKey !== undefined && storedApiKey.trim().length > 0;
  if (!apiKeyConfigured) {
    state.setSyncHealth('missing-key');
    state.setStatsHealth('missing-key');
  }
  context.subscriptions.push(outputChannel, state);

  outputChannel.info('DevPulse extension is now active.');

  context.subscriptions.push(
    ...registerCommands(context, {
      state,
      getBridge: () => session?.bridge,
      onApiKeyChanged: (configured) => {
        apiKeyConfigured = configured;
        reconcile();
      },
      outputChannel,
    }),
  );

  const gitContextProvider = new GitContextProvider(outputChannel);
  const statusBar = new DevPulseStatusBar(gitContextProvider, state);
  context.subscriptions.push(gitContextProvider, statusBar);
  statusBar.show();

  const apiClient = new TelemetryApiClient(context, outputChannel);
  const statsPoller = new StatsPoller(apiClient, state, outputChannel);
  context.subscriptions.push(statsPoller);

  const getTrackingBlocker = (): TrackingBlockReason | null => {
    if (!isTrackingEnabled()) return 'tracking-disabled';
    if (!vscode.workspace.isTrusted) return 'workspace-untrusted';
    if (!vscode.env.isTelemetryEnabled) return 'telemetry-disabled';
    if (!apiKeyConfigured) return 'missing-key';
    if (getApiUrlConfigurationError() !== null) return 'api-unconfigured';
    if (!vscode.workspace.workspaceFolders?.length) return 'no-workspace';

    const gitContext = gitContextProvider.currentContext;
    if (gitContext.workspaceFolderPath === null) return 'initializing';
    if (gitContext.gitBranch === null) return 'no-git';

    return null;
  };

  const updateTrackingBlocker = (): void => {
    state.setBlocker(getTrackingBlocker());
  };

  const startTelemetry = (): void => {
    if (session) return;
    if (!canStartTelemetry(apiKeyConfigured)) return;

    const activityMonitor = new ActivityMonitor({ log: outputChannel });
    const taskMonitor = new TasksMonitor(outputChannel);
    const terminalMonitor = new TerminalMonitor(outputChannel);
    const gitCommitWatcher = new GitCommitWatcher(outputChannel);
    const workingTreeMonitor = new WorkingTreeMonitor(outputChannel);
    const symbolMonitor = new SymbolMonitor(
      () => shouldSendFilePaths() && shouldSendSymbolNames(),
      outputChannel,
    );
    const aiMonitor = new AiMonitor(outputChannel);

    const bridge = new TelemetryBridge(
      context,
      activityMonitor,
      aiMonitor,
      gitContextProvider,
      terminalMonitor,
      taskMonitor,
      gitCommitWatcher,
      workingTreeMonitor,
      symbolMonitor,
      state,
      outputChannel,
    );

    if (state.isPaused) {
      bridge.pause();
    }

    const owned = vscode.Disposable.from(
      activityMonitor,
      terminalMonitor,
      taskMonitor,
      gitCommitWatcher,
      workingTreeMonitor,
      symbolMonitor,
      aiMonitor,
      bridge,
      {
        dispose: () => {
          statsPoller.stop();
        },
      },
    );

    session = {
      bridge,
      dispose: () => {
        owned.dispose();
      },
    };

    bridge.start().catch((error: unknown) => {
      outputChannel.error(`Telemetry failed to start: ${String(error)}`);
      state.setBlocker('startup-error');
      stopTelemetry();
    });

    try {
      statsPoller.start();
    } catch (error: unknown) {
      outputChannel.error(`StatsPoller.start failed: ${String(error)}`);
      stopTelemetry();
      return;
    }

    outputChannel.info('Telemetry started.');
  };

  const stopTelemetry = (): void => {
    const current = session;
    session = undefined;
    if (!current) return;

    outputChannel.warn('Telemetry stopping because a tracking prerequisite is no longer met.');

    try {
      current.bridge.stop();
    } catch (error: unknown) {
      outputChannel.error(`TelemetryBridge.stop failed: ${String(error)}`);
    } finally {
      try {
        current.dispose();
      } catch (error: unknown) {
        outputChannel.error(`TelemetrySession.dispose failed: ${String(error)}`);
      }
    }
  };

  const reconcile = (): void => {
    updateTrackingBlocker();

    if (canStartTelemetry(apiKeyConfigured)) {
      startTelemetry();
    } else {
      stopTelemetry();
    }
  };

  context.subscriptions.push(
    gitContextProvider.onDidChangeContext(() => {
      updateTrackingBlocker();
    }),
    vscode.env.onDidChangeTelemetryEnabled(() => {
      reconcile();
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => {
      reconcile();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('devpulse.enabled') ||
        event.affectsConfiguration('devpulse.apiUrl')
      ) {
        reconcile();
      }
    }),
  );

  reconcile();
}

export async function deactivate(): Promise<void> {
  const current = session;
  session = undefined;

  if (!current) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEACTIVATE_FLUSH_TIMEOUT_MS);

  try {
    await current.bridge.shutdown(controller.signal);
  } catch (error: unknown) {
    extensionOutputChannel?.warn(`DevPulse shutdown error: ${String(error)}`);
  } finally {
    clearTimeout(timeoutId);
    try {
      current.dispose();
    } catch {
      // best effort during shutdown
    }
  }
}
