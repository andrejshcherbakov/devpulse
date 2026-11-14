import { randomUUID } from 'node:crypto';
import path from 'node:path';

import * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

import type { ActivityMonitor, ActivityState } from '../activity-monitor.js';
import {
  shouldDetectAiAssistance,
  shouldSendCommitMessages,
  shouldSendFilePaths,
  shouldSendSymbolNames,
  shouldSendTerminalCommands,
} from '../configuration.js';
import type { GitContext, GitContextProvider } from '../git-context.js';
import { type AiMonitor } from '../signals/ai-monitor.js';
import { sanitizeCommand } from '../signals/command-sanitizer.js';
import { type GitCommitWatcher } from '../signals/git-commit-watcher.js';
import type { SymbolMonitor } from '../signals/symbol-monitor.js';
import type { TasksMonitor } from '../signals/tasks-monitor.js';
import type { TerminalMonitor } from '../signals/terminal-monitor.js';
import type { WorkingTreeMonitor } from '../signals/working-tree-monitor.js';
import { type StatusBarState } from '../status-bar/status-bar-state.js';

import { ContextTracker } from './bridge/context-tracker.js';
import { createEvent, type EventPartial, type TelemetryEventType } from './bridge/event-factory.js';
import { FlushScheduler } from './bridge/flush-scheduler.js';
import { PendingBuffer } from './bridge/pending-buffer.js';
import { MissingApiKeyError, TelemetryApiClient } from './api-client.js';
import {
  type BufferedTelemetryBatch,
  MAX_BUFFER_SIZE,
  TelemetryBufferStore,
} from './buffer-store.js';
import { TelemetryRequestError } from './telemetry-request-error.js';

function isTrackedDocument(uri: vscode.Uri): boolean {
  return uri.scheme === 'file' || uri.scheme === 'untitled';
}

function isRelativeWorkspacePath(uri: vscode.Uri): boolean {
  const rel = vscode.workspace.asRelativePath(uri, false);
  return !path.isAbsolute(rel);
}
const RETRY_BASE_DELAY_MS = 30_000;
const RETRY_MAX_DELAY_MS = 15 * 60 * 1000;
const MAX_BATCH_SIZE = 50;
export class TelemetryBridge implements vscode.Disposable {
  private readonly disposables: Array<vscode.Disposable> = [];
  private readonly client: TelemetryApiClient;
  private readonly bufferStore: TelemetryBufferStore;
  private readonly contextTracker: ContextTracker;
  private readonly pendingBuffer = new PendingBuffer();
  private readonly flushScheduler: FlushScheduler;
  private inflight: BufferedTelemetryBatch | null = null;

  private queue: Array<TelemetryEventDto> = [];
  private flushing = false;
  private stopped = false;
  private paused = false;
  private bufferCleared = false;
  private savePromise: Promise<void> = Promise.resolve();

  private lastActivityState: ActivityState | null = null;
  private lastActivityChangeAtMs: number | null = null;

  private consecutiveFailures = 0;
  private nextAttemptAt = 0;
  private lastSuccessfulSyncAt: number | null = null;
  private lastSyncError: string | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly activityMonitor: ActivityMonitor,
    private readonly aiMonitor: AiMonitor,
    private readonly gitContextProvider: GitContextProvider,
    private readonly terminalMonitor: TerminalMonitor,
    private readonly tasksMonitor: TasksMonitor,
    private readonly gitCommitWatcher: GitCommitWatcher,
    private readonly workingTreeMonitor: WorkingTreeMonitor,
    private readonly symbolMonitor: SymbolMonitor,
    private readonly statusBarState: StatusBarState,
    private readonly log?: vscode.LogOutputChannel,
  ) {
    this.client = new TelemetryApiClient(context, log);
    this.bufferStore = new TelemetryBufferStore(log);
    this.contextTracker = new ContextTracker(log);
    this.flushScheduler = new FlushScheduler({
      flush: () => {
        void this.flush();
      },
      heartbeat: () => {
        this.sendHeartbeat();
      },
    });
  }

  public get bufferedEventCount(): number {
    return (this.inflight?.events.length ?? 0) + this.queue.length;
  }

  public get lastSuccessfulSync(): number | null {
    return this.lastSuccessfulSyncAt;
  }

  public get nextRetry(): number | null {
    return this.nextAttemptAt > Date.now() ? this.nextAttemptAt : null;
  }

  public get syncError(): string | null {
    return this.lastSyncError;
  }

  public pause(): void {
    if (this.paused) return;

    const branch = this.contextTracker.branch;
    if (branch !== null) {
      this.enqueue(this.createSessionEnd(branch, this.contextTracker.remoteUrl, Date.now()));
    }

    this.paused = true;
    this.log?.info('telemetry paused');
    void this.flush();
  }

  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.log?.info('telemetry resumed');

    if (this.activityMonitor.currentState === 'active') {
      this.enqueue(this.createHeartbeat());
    }
    this.workingTreeMonitor.requestSnapshot(true);
  }

  public async start(): Promise<void> {
    try {
      const buffered = this.bufferStore.load(this.context);
      this.queue = buffered.queue;
      this.inflight = buffered.inflight;
    } catch (error) {
      this.log?.error(`buffer load failed: ${String(error)}`);
      this.queue = [];
    }

    const initialContext = this.gitContextProvider.currentContext;
    this.lastActivityState = this.activityMonitor.currentState;
    this.lastActivityChangeAtMs = Date.now();
    this.statusBarState.setActivity(this.activityMonitor.currentState);

    this.contextTracker.update(initialContext);

    if (initialContext.workspaceFolderPath) {
      void this.gitCommitWatcher.setWorkspaceFolder(initialContext.workspaceFolderPath);
    }

    if (initialContext.gitBranch) {
      this.enqueue(this.createHeartbeat());
    }

    if (this.bufferedEventCount > 0) {
      await this.flush();
    }

    this.registerListeners();
    this.workingTreeMonitor.setWorkspaceFolder(initialContext.workspaceFolderPath);
    this.flushScheduler.start();
  }

  public async shutdown(signal: AbortSignal): Promise<void> {
    this.stop();
    await this.savePromise;

    const deadline = Date.now() + 5000;
    while (this.flushing && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const flushDeadline = Date.now() + 10_000;
    while (
      !signal.aborted &&
      Date.now() < flushDeadline &&
      (this.inflight !== null || this.queue.length > 0)
    ) {
      await this.flush(signal, true);
      if (this.inflight !== null) break;
    }
  }

  public async clearBufferedEvents(): Promise<void> {
    this.bufferCleared = true;
    this.queue = [];
    this.inflight = null;
    this.pendingBuffer.clear();
    await this.savePromise;
    await this.bufferStore.clear(this.context);
  }

  private registerListeners(): void {
    this.disposables.push(
      this.activityMonitor.onDidChangeActivityState(({ state, changedAt }) => {
        this.onActivityTransition(state, changedAt);
      }),

      this.gitContextProvider.onDidChangeContext((nextContext) => {
        this.onGitContextTransition(nextContext);
      }),

      this.aiMonitor.onDidDetectAi((event) => {
        if (!shouldDetectAiAssistance()) return;
        this.enqueue(
          this.create('ai_interaction', {
            aiTool: event.tool,
            aiEstimated: event.estimated,
          }),
        );
      }),

      this.contextTracker.onGracePeriodExpired(() => {
        const branch = this.contextTracker.branch;
        if (branch !== null) {
          this.enqueue(
            this.create('session_end', {
              gitBranch: branch,
              gitRemoteUrl: this.contextTracker.remoteUrl,
            }),
          );
        }
      }),

      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (!this.shouldTrack(doc.uri)) return;
        this.workingTreeMonitor.requestSnapshot();
        const filePath = shouldSendFilePaths() ? this.toRelativePath(doc.uri) : undefined;
        this.log?.info(`file_save: ${filePath ?? '[path disabled]'}`);
        this.enqueue(
          this.create('file_save', {
            filePath,
            language: doc.languageId,
          }),
        );
      }),

      vscode.workspace.onDidCreateFiles(() => {
        this.workingTreeMonitor.requestSnapshot();
      }),

      vscode.workspace.onDidDeleteFiles(() => {
        this.workingTreeMonitor.requestSnapshot();
      }),

      vscode.workspace.onDidRenameFiles(() => {
        this.workingTreeMonitor.requestSnapshot();
      }),

      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor === undefined || !this.shouldTrack(editor.document.uri)) {
          this.enqueue(this.create('file_switch', { filePath: null }));
          return;
        }
        const filePath = shouldSendFilePaths() ? this.toRelativePath(editor.document.uri) : null;
        this.log?.info(`file_switch: ${filePath ?? '[path disabled]'}`);
        this.enqueue(
          this.create('file_switch', {
            filePath,
            language: editor.document.languageId,
          }),
        );
      }),

      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('devpulse.apiUrl')) {
          void this.flush();
        }
        if (e.affectsConfiguration('devpulse.sendFilePaths')) {
          this.workingTreeMonitor.requestSnapshot(true);
        }
      }),

      this.workingTreeMonitor.onDidChangeWorkingTree((changes) => {
        if (!shouldSendFilePaths()) return;
        this.enqueue(this.create('working_tree', { workingTreeChanges: changes }));
      }),

      this.symbolMonitor.onDidTouchSymbols((event) => {
        if (!shouldSendFilePaths() || !shouldSendSymbolNames() || !this.shouldTrack(event.uri)) {
          return;
        }

        this.enqueue(
          this.create('symbol_touch', {
            filePath: this.toRelativePath(event.uri),
            symbols: event.symbols,
          }),
        );
      }),

      this.terminalMonitor.onDidRunCommand((event) => {
        this.workingTreeMonitor.requestSnapshot();
        if (!shouldSendTerminalCommands()) return;
        const sanitized = sanitizeCommand(event.command);
        if (!sanitized) return;

        this.log?.info(
          `terminal: ${sanitized} (exit=${String(event.exitCode ?? 'n/a')}, ${String(event.durationMs)}ms)`,
        );

        this.enqueueWithBuffer('terminal_command', {
          command: sanitized,
          commandCwd: event.cwd,
          exitCode: event.exitCode,
          durationMs: event.durationMs,
        });
      }),

      this.tasksMonitor.onDidRunTask((event) => {
        this.workingTreeMonitor.requestSnapshot();
        this.log?.info(
          `task: ${event.name} (exit=${String(event.exitCode ?? 'n/a')}, ${String(event.durationMs)}ms)`,
        );

        this.enqueueWithBuffer('task_run', {
          taskName: event.name,
          taskSource: event.source,
          exitCode: event.exitCode,
          durationMs: event.durationMs,
        });
      }),

      this.gitCommitWatcher.onDidCommit((event) => {
        this.log?.info(
          `commit: ${event.hash.slice(0, 7)} (${String(event.insertions)}+/${String(event.deletions)}-)`,
        );

        this.enqueue(
          this.create('git_commit', {
            commitHash: event.hash,
            commitMessage: shouldSendCommitMessages() ? event.message : undefined,
            filesChanged: event.filesChanged,
            insertions: event.insertions,
            deletions: event.deletions,
            filesList: shouldSendFilePaths() ? event.filesList : undefined,
          }),
        );
        this.workingTreeMonitor.requestSnapshot();
      }),
    );
  }

  private shouldTrack(uri: vscode.Uri): boolean {
    return isTrackedDocument(uri) && isRelativeWorkspacePath(uri);
  }

  private create(type: TelemetryEventType, partial: EventPartial): TelemetryEventDto {
    const current = this.gitContextProvider.currentContext;

    return createEvent(type, partial, {
      currentBranch: current.gitBranch,
      currentRemoteUrl: current.gitRemoteUrl,
      fallbackBranch: this.contextTracker.branch,
      fallbackRemoteUrl: this.contextTracker.remoteUrl,
    });
  }

  private sendHeartbeat(): void {
    if (this.stopped || this.paused) return;

    if (!vscode.env.isTelemetryEnabled) {
      this.log?.info('heartbeat skipped: VS Code telemetry disabled');
      return;
    }

    if (this.activityMonitor.currentState !== 'active') {
      this.log?.info(`heartbeat skipped: state=${this.activityMonitor.currentState}`);
      return;
    }

    const event = this.createHeartbeat();

    if (event.gitBranch === null) {
      this.log?.info('heartbeat skipped: no git branch');
      return;
    }

    this.log?.info('heartbeat sent');
    this.enqueue(event);
  }

  private toRelativePath(uri: vscode.Uri): string {
    return vscode.workspace.asRelativePath(uri, false).split(path.sep).join('/');
  }

  private createHeartbeat(partial: EventPartial = {}): TelemetryEventDto {
    const editor = vscode.window.activeTextEditor;
    const activeFile =
      editor !== undefined && this.shouldTrack(editor.document.uri)
        ? {
            filePath: shouldSendFilePaths() ? this.toRelativePath(editor.document.uri) : null,
            language: editor.document.languageId,
          }
        : { filePath: null };

    return this.create('heartbeat', { durationMs: null, ...activeFile, ...partial });
  }

  private createSessionEnd(
    gitBranch: string,
    gitRemoteUrl: string | null,
    boundaryAtMs: number,
  ): TelemetryEventDto {
    const idleDurationMs =
      this.lastActivityState === 'idle' && this.lastActivityChangeAtMs !== null
        ? Math.max(0, boundaryAtMs - this.lastActivityChangeAtMs)
        : null;

    return this.create('session_end', {
      gitBranch,
      gitRemoteUrl,
      clientTimestamp: new Date(boundaryAtMs).toISOString(),
      durationMs: idleDurationMs,
    });
  }

  private onActivityTransition(next: ActivityState, changedAt: number): void {
    const prev = this.lastActivityState;
    const prevAt = this.lastActivityChangeAtMs;

    this.log?.info(`activity transition: ${prev ?? 'initial'} → ${next}`);

    if (prev !== null && prevAt !== null && prev !== next) {
      const durationMs = Math.max(0, changedAt - prevAt);
      const eventType: 'idle_start' | 'idle_end' = next === 'idle' ? 'idle_start' : 'idle_end';
      this.enqueue(
        this.create(eventType, {
          durationMs,
          activityChangedAt: new Date(changedAt).toISOString(),
        }),
      );
    }

    this.lastActivityState = next;
    this.lastActivityChangeAtMs = changedAt;
    this.statusBarState.setActivity(next);

    if (next === 'active') {
      this.workingTreeMonitor.requestSnapshot(true);
    }
  }

  private onGitContextTransition(nextContext: GitContext): void {
    const previousBranch = this.contextTracker.branch;
    const previousRemoteUrl = this.contextTracker.remoteUrl;

    const result = this.contextTracker.update(nextContext);

    if (result !== 'noop') {
      void this.gitCommitWatcher.setWorkspaceFolder(nextContext.workspaceFolderPath);
      this.workingTreeMonitor.setWorkspaceFolder(nextContext.workspaceFolderPath);
    }

    if (result === 'changed' || result === 'lost') {
      this.log?.info(
        `git context transition: branch="${previousBranch ?? 'n/a'}" → "${nextContext.gitBranch ?? 'n/a'}"`,
      );
    }

    if (result === 'lost' || result === 'noop') {
      return;
    }

    if (result === 'restored') {
      this.flushPendingBuffer();
      return;
    }

    const boundaryTimestamp = new Date().toISOString();
    const boundaryAtMs = Date.parse(boundaryTimestamp);

    if (previousBranch !== null) {
      this.enqueue(this.createSessionEnd(previousBranch, previousRemoteUrl, boundaryAtMs));
    }

    if (this.activityMonitor.currentState === 'active') {
      this.enqueue(
        this.createHeartbeat({
          durationMs: null,
          gitBranch: nextContext.gitBranch ?? undefined,
          gitRemoteUrl: nextContext.gitRemoteUrl,
          clientTimestamp: boundaryTimestamp,
        }),
      );
    }

    this.flushPendingBuffer();
  }

  private enqueue(event: TelemetryEventDto): void {
    if (this.stopped) return;
    if (this.paused) {
      this.log?.info(`skipped ${event.type}: tracking paused`);
      return;
    }

    if (!vscode.env.isTelemetryEnabled) {
      this.log?.info(`skipped ${event.type}: VS Code telemetry disabled`);
      return;
    }

    if (event.gitBranch === null) {
      this.log?.info(`skipped ${event.type}: no git branch`);
      return;
    }

    this.log?.info(`enqueue: type=${event.type} branch=${event.gitBranch}`);
    this.queue.push(event);
    this.enforceBufferLimit();
    void this.persistBuffer();

    const { immediate } = this.flushScheduler.scheduleFlush(this.queue.length);
    if (immediate) {
      void this.flush();
    }
  }

  private enforceBufferLimit(): void {
    const inflightSize = this.inflight?.events.length ?? 0;
    const queueCapacity = Math.max(0, MAX_BUFFER_SIZE - inflightSize);
    const dropped = Math.max(0, this.queue.length - queueCapacity);
    if (dropped === 0) return;

    this.queue.splice(0, dropped);
    this.log?.warn(`Buffer overflow: dropped ${String(dropped)} oldest queued events`);
  }

  private enqueueWithBuffer(type: 'terminal_command' | 'task_run', partial: EventPartial): void {
    if (this.stopped || this.paused) return;
    const event = this.create(type, partial);

    if (event.gitBranch === null) {
      this.pendingBuffer.push({ type, partial, createdAt: Date.now() });
      this.log?.info(
        `buffered ${type}: waiting for git context (${String(this.pendingBuffer.size)} in buffer)`,
      );
      return;
    }

    this.enqueue(event);
  }

  private flushPendingBuffer(): void {
    const { valid, dropped } = this.pendingBuffer.drain();

    if (dropped > 0) {
      this.log?.info(`dropped ${String(dropped)} buffered events (too old)`);
    }

    if (valid.length > 0) {
      this.log?.info(`flushing ${String(valid.length)} buffered events`);
    }

    for (const item of valid) {
      const event = this.create(item.type, item.partial);
      if (event.gitBranch !== null) {
        this.enqueue(event);
      }
    }
  }

  private persistBuffer(): Promise<void> {
    const snapshot = {
      queue: [...this.queue],
      inflight:
        this.inflight === null
          ? null
          : { batchId: this.inflight.batchId, events: [...this.inflight.events] },
    };

    this.savePromise = this.savePromise
      .then(() => this.bufferStore.save(this.context, snapshot))
      .catch((error: unknown) => {
        this.log?.error(`buffer save failed: ${String(error)}`);
      });

    return this.savePromise;
  }

  public stop(): void {
    if (this.stopped) return;

    const branch = this.contextTracker.branch;
    if (!this.paused && branch !== null) {
      this.enqueue(this.createSessionEnd(branch, this.contextTracker.remoteUrl, Date.now()));
    }

    this.stopped = true;
    this.flushScheduler.stop();
    this.contextTracker.reset();
    this.pendingBuffer.clear();
  }

  public async flush(signal?: AbortSignal, force = false): Promise<void> {
    if (this.flushing) return;
    if (this.inflight === null && this.queue.length === 0) return;
    if (!force && Date.now() < this.nextAttemptAt) return;

    this.flushing = true;
    if (this.inflight === null) {
      this.inflight = {
        batchId: randomUUID(),
        events: this.queue.splice(0, MAX_BATCH_SIZE),
      };
      await this.persistBuffer();
    }

    const current = this.inflight;

    try {
      await this.client.postEventsBatch(
        { events: current.events, batchId: current.batchId },
        signal,
      );

      if (this.bufferCleared) return;

      const sent = current.events.length;
      this.inflight = null;
      this.consecutiveFailures = 0;
      this.nextAttemptAt = 0;
      this.lastSuccessfulSyncAt = Date.now();
      this.lastSyncError = null;
      void this.persistBuffer();

      this.statusBarState.setSyncHealth('ok');
      this.log?.info(`flushed ${String(sent)} events`);

      if (this.queue.length > 0) {
        queueMicrotask(() => {
          void this.flush();
        });
      }
    } catch (error: unknown) {
      if (this.bufferCleared) return;

      this.lastSyncError = error instanceof Error ? error.message : String(error);
      if (error instanceof MissingApiKeyError) {
        this.statusBarState.setSyncHealth('missing-key');
      } else if (error instanceof TelemetryRequestError) {
        if (error.isAuthError) {
          this.statusBarState.setSyncHealth('invalid-key'); // 401, 403
        } else if (error.retryable) {
          this.statusBarState.setSyncHealth('offline');
        } else {
          this.statusBarState.setSyncHealth('error');
        }
      } else {
        this.statusBarState.setSyncHealth('offline');
      }

      if (error instanceof TelemetryRequestError && !error.retryable && !error.isAuthError) {
        const dropped = current.events.length;
        this.inflight = null;
        void this.persistBuffer();
        this.log?.error(
          `dropped ${String(dropped)} events: rejected by server (${String(error.status)})`,
        );
        return;
      }

      this.consecutiveFailures += 1;
      this.nextAttemptAt =
        Date.now() +
        Math.min(RETRY_BASE_DELAY_MS * 2 ** (this.consecutiveFailures - 1), RETRY_MAX_DELAY_MS);

      const message = error instanceof Error ? error.message : String(error);
      this.log?.error(
        `flush failed (${message}); inflight=${String(current.events.length)} ` +
          `buffered=${String(this.queue.length)}`,
      );
    } finally {
      this.flushing = false;
    }
  }

  public dispose(): void {
    this.stop();
    this.contextTracker.dispose();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
