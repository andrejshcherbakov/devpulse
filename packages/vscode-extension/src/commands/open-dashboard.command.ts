import * as vscode from 'vscode';

import { getDashboardUrl } from '../configuration.js';

async function requireDashboardUrl(): Promise<string | null> {
  const url = getDashboardUrl();
  if (url !== null) return url;

  const selected = await vscode.window.showWarningMessage(
    'DevPulse dashboard URL is not configured or does not use HTTPS.',
    'Open Settings',
  );
  if (selected === 'Open Settings') {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'devpulse.dashboardUrl');
  }
  return null;
}

export function registerOpenDashboardCommands(): Array<vscode.Disposable> {
  return [
    vscode.commands.registerCommand('devpulse.openDashboard', async () => {
      const url = await requireDashboardUrl();
      if (url === null) return;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),

    vscode.commands.registerCommand('devpulse.openSessions', async () => {
      const dashboardUrl = await requireDashboardUrl();
      if (dashboardUrl === null) return;
      const url = `${dashboardUrl}/sessions`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  ];
}
