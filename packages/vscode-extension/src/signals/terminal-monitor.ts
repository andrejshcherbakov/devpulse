import path from 'node:path';

import * as vscode from 'vscode';

import { sanitizeCommand } from './command-sanitizer.js';

export interface TerminalCommandEvent {
  command: string;
  cwd: string | null;
  exitCode: number | null;
  durationMs: number;
}

function toWorkspaceRelativeCwd(uri: vscode.Uri | undefined): string | null {
  if (uri?.scheme !== 'file') return null;
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (folder === undefined) return null;

  const relative = path.relative(folder.uri.fsPath, uri.fsPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return relative === '' ? '.' : relative.split(path.sep).join('/');
}

export class TerminalMonitor implements vscode.Disposable {
  private readonly disposables: Array<vscode.Disposable> = [];
  private readonly emitter = new vscode.EventEmitter<TerminalCommandEvent>();

  private readonly startedAt = new Map<vscode.TerminalShellExecution, number>();

  readonly onDidRunCommand = this.emitter.event;

  constructor(private readonly log?: vscode.LogOutputChannel) {
    this.disposables.push(
      vscode.window.onDidStartTerminalShellExecution((event) => {
        this.onStart(event);
      }),

      vscode.window.onDidEndTerminalShellExecution((event) => {
        this.onEnd(event);
      }),
    );
  }

  private onStart(event: vscode.TerminalShellExecutionStartEvent): void {
    const command = event.execution.commandLine.value.trim();
    if (!command) return;

    this.startedAt.set(event.execution, Date.now());
    this.log?.info('terminal command started');
  }

  private onEnd(event: vscode.TerminalShellExecutionEndEvent): void {
    const command = event.execution.commandLine.value.trim();
    if (!command) return;

    const finishedAt = Date.now();

    const startedAt = this.startedAt.get(event.execution) ?? finishedAt;

    this.startedAt.delete(event.execution);

    const durationMs = Math.max(0, finishedAt - startedAt);

    const cwd = toWorkspaceRelativeCwd(event.execution.cwd);

    const sanitizedCommand = sanitizeCommand(command);
    const safeCommand = sanitizedCommand === '' ? '[command omitted]' : sanitizedCommand;
    this.log?.info(
      `finished: ${safeCommand} (exit=${String(event.exitCode ?? 'n/a')}, ${String(durationMs)}ms)`,
    );

    this.emitter.fire({
      command,
      cwd,
      exitCode: event.exitCode ?? null,
      durationMs,
    });
  }

  public dispose(): void {
    this.emitter.dispose();
    this.startedAt.clear();
    for (const d of this.disposables) d.dispose();
  }
}
