import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import * as vscode from 'vscode';

import { type WorkingTreeChange } from '@devpulse/lib';

import { parseWorkingTreeStatus } from './working-tree-status.js';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 3000;
const DEBOUNCE_MS = 750;

export class WorkingTreeMonitor implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<Array<WorkingTreeChange>>();
  public readonly onDidChangeWorkingTree = this.emitter.event;

  private workspaceFolderPath: string | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private lastSignature: string | null = null;
  private collecting = false;
  private forceNextEmission = false;

  constructor(private readonly log?: vscode.LogOutputChannel) {}

  public setWorkspaceFolder(folderPath: string | null): void {
    if (folderPath === this.workspaceFolderPath) return;

    this.workspaceFolderPath = folderPath;
    this.lastSignature = null;
    this.requestSnapshot();
  }

  public requestSnapshot(force = false): void {
    if (this.workspaceFolderPath === null) return;
    this.forceNextEmission ||= force;
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      void this.collect();
    }, DEBOUNCE_MS);
  }

  private async collect(): Promise<void> {
    const folderPath = this.workspaceFolderPath;
    if (folderPath === null || this.collecting) return;

    this.collecting = true;
    try {
      const { stdout } = await execFileAsync(
        'git',
        [
          '-C',
          folderPath,
          'status',
          '--porcelain=v2',
          '-z',
          '--untracked-files=all',
          '--ignore-submodules=all',
        ],
        { timeout: GIT_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      );
      if (folderPath !== this.workspaceFolderPath) return;

      const changes = parseWorkingTreeStatus(stdout);
      const signature = JSON.stringify(changes);
      const forceEmission = this.forceNextEmission;
      this.forceNextEmission = false;

      if (forceEmission || signature !== this.lastSignature) {
        this.lastSignature = signature;
        this.log?.info(`working tree: ${String(changes.length)} uncommitted files`);
        this.emitter.fire(changes);
      }
    } catch (error) {
      this.log?.info(`working tree scan failed: ${String(error)}`);
    } finally {
      this.collecting = false;
      if (folderPath !== this.workspaceFolderPath) this.requestSnapshot(true);
    }
  }

  public dispose(): void {
    if (this.debounceTimer !== undefined) clearTimeout(this.debounceTimer);
    this.emitter.dispose();
  }
}
