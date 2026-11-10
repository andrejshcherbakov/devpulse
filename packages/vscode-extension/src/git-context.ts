import { execFile } from 'node:child_process';
// eslint-disable-next-line unicorn/import-style
import * as path from 'node:path';
import { promisify } from 'node:util';

import * as vscode from 'vscode';

const execFileAsync = promisify(execFile);

const GIT_COMMAND_TIMEOUT_MS = 3000;
const GIT_METADATA_DEBOUNCE_MS = 150;
const ACTIVE_EDITOR_DEBOUNCE_MS = 250;

export interface GitContext {
  workspaceName: string | null;
  gitBranch: string | null;
  gitRemoteUrl: string | null;
  workspaceFolderPath: string | null;
}

function isSameContext(a: GitContext, b: GitContext): boolean {
  return (
    a.workspaceName === b.workspaceName &&
    a.gitBranch === b.gitBranch &&
    a.gitRemoteUrl === b.gitRemoteUrl &&
    a.workspaceFolderPath === b.workspaceFolderPath
  );
}

function resolveWorkspaceName(folder: vscode.WorkspaceFolder | null): string | null {
  const name = vscode.workspace.name;
  if (name !== undefined && name.trim().length > 0) return name.trim();
  if (folder !== null && folder.name.trim().length > 0) return folder.name.trim();
  return null;
}

function sanitizeRemoteUrl(url: string): string | null {
  const value = url.trim();

  if (/^[^/\\\s]+@[^:\s]+:.+/.test(value)) {
    return value.replace(/^[^@]+@/, '');
  }

  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'file:') return null;
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

function isUnexpectedGitError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return true;
  if (!('code' in error)) return true;
  return typeof error.code !== 'number';
}

interface DetectedGitState {
  context: GitContext;
  gitDir: string | null;
  commonDir: string | null;
}

export class GitContextProvider implements vscode.Disposable {
  private readonly disposables: Array<vscode.Disposable> = [];
  private readonly emitter = new vscode.EventEmitter<GitContext>();

  private gitWatchers: Array<vscode.Disposable> = [];
  private watchedGitDir: string | null = null;
  private watchedCommonDir: string | null = null;

  private gitDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private activeEditorDebounce: ReturnType<typeof setTimeout> | undefined;

  private refreshInFlight = false;
  private refreshDirty = false;
  private forceGitRefresh = false;
  private initialized = false;
  private disposed = false;

  private lastActiveFolderPath: string | null = null;

  private context: GitContext = {
    workspaceName: null,
    gitBranch: null,
    gitRemoteUrl: null,
    workspaceFolderPath: null,
  };

  readonly onDidChangeContext = this.emitter.event;

  constructor(private readonly log?: vscode.LogOutputChannel) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.handleActiveEditorChange();
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.scheduleRefresh();
      }),
    );

    this.scheduleRefresh();
  }

  get currentContext(): GitContext {
    return this.context;
  }

  private readonly handleGitMetadataChange = (): void => {
    this.forceGitRefresh = true;
    clearTimeout(this.gitDebounceTimer);
    this.gitDebounceTimer = setTimeout(() => {
      this.gitDebounceTimer = undefined;
      this.scheduleRefresh();
    }, GIT_METADATA_DEBOUNCE_MS);
  };

  private handleActiveEditorChange(): void {
    clearTimeout(this.activeEditorDebounce);
    this.activeEditorDebounce = setTimeout(() => {
      this.activeEditorDebounce = undefined;
      this.scheduleRefresh();
    }, ACTIVE_EDITOR_DEBOUNCE_MS);
  }

  private scheduleRefresh(): void {
    if (this.disposed) return;
    this.refreshDirty = true;
    if (this.refreshInFlight) return;
    void this.drainRefresh();
  }

  private async drainRefresh(): Promise<void> {
    this.refreshInFlight = true;
    try {
      while (this.refreshDirty && !this.disposed) {
        this.refreshDirty = false;
        await this.runRefresh();
      }
    } finally {
      this.refreshInFlight = false;
    }
  }

  private async runRefresh(): Promise<void> {
    if (this.disposed) return;
    try {
      const { context: nextContext, gitDir, commonDir } = await this.detectContext();

      if (this.watchedGitDir !== gitDir || this.watchedCommonDir !== commonDir) {
        this.resetGitWatchers(gitDir, commonDir);
      }

      if (isSameContext(this.context, nextContext)) return;

      this.context = nextContext;
      this.log?.info(
        `workspace="${nextContext.workspaceName ?? 'n/a'}" branch="${nextContext.gitBranch ?? 'n/a'}"`,
      );
      this.emitter.fire(nextContext);
    } catch (error) {
      this.log?.error(`refresh failed: ${String(error)}`);
    }
  }

  private resetGitWatchers(gitDir: string | null, commonDir: string | null): void {
    for (const watcher of this.gitWatchers) {
      watcher.dispose();
    }
    this.gitWatchers = [];
    this.watchedGitDir = gitDir;
    this.watchedCommonDir = commonDir;

    this.log?.info(`resetGitWatchers: ${gitDir === null ? 'disabled' : 'enabled'}`);

    if (gitDir === null) return;

    const sharedDir = commonDir ?? gitDir;
    const next: Array<vscode.Disposable> = [];

    if (sharedDir === gitDir) {
      next.push(this.watchFiles(vscode.Uri.file(gitDir), '{HEAD,packed-refs,config}'));
    } else {
      next.push(
        this.watchFiles(vscode.Uri.file(gitDir), 'HEAD'),
        this.watchFiles(vscode.Uri.file(sharedDir), '{packed-refs,config}'),
      );
    }

    this.gitWatchers = next;
  }

  private watchFiles(base: vscode.Uri, pattern: string): vscode.Disposable {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(base, pattern),
    );
    const callback = this.handleGitMetadataChange;
    return vscode.Disposable.from(
      watcher,
      watcher.onDidChange(callback),
      watcher.onDidCreate(callback),
      watcher.onDidDelete(callback),
    );
  }

  private resolveWorkspaceFolder(): vscode.WorkspaceFolder | null {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor?.document.uri.scheme === 'file') {
      const folder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (folder) {
        this.lastActiveFolderPath = folder.uri.fsPath;
        return folder;
      }
    }

    if (this.lastActiveFolderPath !== null) {
      const cached = vscode.workspace.workspaceFolders?.find(
        (f) => f.uri.fsPath === this.lastActiveFolderPath,
      );
      if (cached) return cached;
      this.lastActiveFolderPath = null;
    }

    return vscode.workspace.workspaceFolders?.[0] ?? null;
  }

  private async detectContext(): Promise<DetectedGitState> {
    const folder = this.resolveWorkspaceFolder();
    const workspaceFolderPath = folder?.uri.fsPath ?? null;
    const workspaceName = resolveWorkspaceName(folder);

    if (
      this.initialized &&
      !this.forceGitRefresh &&
      workspaceFolderPath === this.context.workspaceFolderPath
    ) {
      return {
        context: { ...this.context, workspaceName, workspaceFolderPath },
        gitDir: this.watchedGitDir,
        commonDir: this.watchedCommonDir,
      };
    }

    this.forceGitRefresh = false;
    this.initialized = true;

    this.log?.info(`detectContext: folder="${folder?.name ?? 'n/a'}"`);

    if (workspaceFolderPath === null) {
      return {
        context: {
          workspaceName,
          gitBranch: null,
          gitRemoteUrl: null,
          workspaceFolderPath: null,
        },
        gitDir: null,
        commonDir: null,
      };
    }

    const [gitBranch, gitRemoteUrl, gitDir, commonDir] = await Promise.all([
      this.resolveGitBranch(workspaceFolderPath),
      this.resolveGitRemoteUrl(workspaceFolderPath),
      this.resolveGitDir(workspaceFolderPath),
      this.resolveGitCommonDir(workspaceFolderPath),
    ]);

    return {
      context: { workspaceName, gitBranch, gitRemoteUrl, workspaceFolderPath },
      gitDir,
      commonDir,
    };
  }

  private async runGit(folderPath: string, args: Array<string>): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('git', args, {
        cwd: folderPath,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
      const value = stdout.trim();
      return value.length > 0 ? value : null;
    } catch (error) {
      if (isUnexpectedGitError(error)) {
        this.log?.debug(`git ${args.join(' ')} failed: ${String(error)}`);
      }
      return null;
    }
  }

  private async resolveGitBranch(folderPath: string): Promise<string | null> {
    const branch = await this.runGit(folderPath, ['symbolic-ref', '--short', '-q', 'HEAD']);
    if (branch !== null) return branch;

    const detachedHead = await this.runGit(folderPath, ['rev-parse', '--short=12', 'HEAD']);
    return detachedHead === null ? null : `detached@${detachedHead}`;
  }

  private async resolveGitRemoteUrl(folderPath: string): Promise<string | null> {
    const originUrl = await this.runGit(folderPath, ['remote', 'get-url', 'origin']);
    if (originUrl !== null) return sanitizeRemoteUrl(originUrl);

    const remotes = await this.runGit(folderPath, ['remote']);
    if (remotes === null) return null;
    const first = remotes.split('\n')[0]?.trim();
    if (!first) return null;

    const url = await this.runGit(folderPath, ['remote', 'get-url', first]);
    return url === null ? null : sanitizeRemoteUrl(url);
  }

  private async resolveGitDir(folderPath: string): Promise<string | null> {
    return this.runGit(folderPath, ['rev-parse', '--absolute-git-dir']);
  }

  private async resolveGitCommonDir(folderPath: string): Promise<string | null> {
    const value = await this.runGit(folderPath, ['rev-parse', '--git-common-dir']);
    if (value === null) return null;
    return path.isAbsolute(value) ? value : path.resolve(folderPath, value);
  }

  dispose(): void {
    this.disposed = true;

    if (this.activeEditorDebounce !== undefined) {
      clearTimeout(this.activeEditorDebounce);
      this.activeEditorDebounce = undefined;
    }

    if (this.gitDebounceTimer !== undefined) {
      clearTimeout(this.gitDebounceTimer);
      this.gitDebounceTimer = undefined;
    }

    this.resetGitWatchers(null, null);

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.emitter.dispose();
  }
}
