import * as vscode from 'vscode';

import { shouldDetectAiAssistance } from '../configuration.js';
import { isTrackedTextDocument } from '../utils/tracked-documents';

export interface AiInteractionEvent {
  tool: string;
  linesCount: number;
  estimated: true;
}

const THROTTLE_MS = 10_000;

interface KnownAiExtension {
  readonly id: string;
  readonly name: string;
}

const KNOWN_AI_EXTENSIONS: ReadonlyArray<KnownAiExtension> = [
  { id: 'github.copilot', name: 'copilot' },
  { id: 'github.copilot-chat', name: 'copilot-chat' },
  { id: 'anthropic.claude-code', name: 'claude-code' },
  { id: 'saoudrizwan.claude-dev', name: 'cline' },
  { id: 'cline.cline', name: 'cline' },
  { id: 'rooveterinaryinc.roo-cline', name: 'roo' },
  { id: 'continue.continue', name: 'continue' },
  { id: 'sourcegraph.cody-ai', name: 'cody' },
  { id: 'codeium.codeium', name: 'codeium' },
  { id: 'openai.chatgpt', name: 'chatgpt' },
  { id: 'openai.codex', name: 'codex' },
  { id: 'tabnine.tabnine-vscode', name: 'tabnine' },
  { id: 'amazonwebservices.amazon-q-vscode', name: 'amazon-q' },
];

function detectHostAi(): string | null {
  const app = vscode.env.appName.toLowerCase();
  if (app.includes('cursor')) return 'cursor';
  if (app.includes('windsurf')) return 'windsurf';
  return null;
}

export class AiMonitor implements vscode.Disposable {
  private readonly disposables: Array<vscode.Disposable> = [];
  private readonly emitter = new vscode.EventEmitter<AiInteractionEvent>();
  readonly onDidDetectAi = this.emitter.event;

  private installedAiTools: ReadonlyArray<string> = [];
  private lastRecordedAt = 0;

  constructor(private readonly log?: vscode.LogOutputChannel) {
    this.refreshInstalledAiTools();

    this.disposables.push(
      vscode.extensions.onDidChange(() => {
        this.refreshInstalledAiTools();
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.inspectTextChange(event);
      }),
    );
  }

  private refreshInstalledAiTools(): void {
    const tools = new Set<string>();

    const hostAi = detectHostAi();
    if (hostAi) tools.add(hostAi);

    for (const ext of KNOWN_AI_EXTENSIONS) {
      if (vscode.extensions.getExtension(ext.id)) {
        tools.add(ext.name);
      }
    }

    this.installedAiTools = [...tools];
    this.log?.info(
      `AI Monitor: installed AI tools = [${this.installedAiTools.join(', ') || 'none'}]`,
    );
  }

  private resolveTool(): string | null {
    if (this.installedAiTools.length === 0) return null;
    if (this.installedAiTools.length === 1) {
      return this.installedAiTools[0] ?? null;
    }
    return 'unknown';
  }

  private inspectTextChange(event: vscode.TextDocumentChangeEvent): void {
    if (!shouldDetectAiAssistance()) return;
    if (event.reason === vscode.TextDocumentChangeReason.Undo) return;
    if (event.reason === vscode.TextDocumentChangeReason.Redo) return;

    if (!isTrackedTextDocument(event.document)) return;
    if (event.contentChanges.length === 0) return;

    const tool = this.resolveTool();
    if (!tool) return;

    const now = Date.now();
    if (now - this.lastRecordedAt < THROTTLE_MS) return;

    for (const change of event.contentChanges) {
      const isMultiLine = change.text.includes('\n');
      const isLargeChunk = change.text.length > 40;
      const isPureInsertion = change.rangeLength === 0;
      const isOnlyWhitespace = change.text.trim().length === 0;

      if (isMultiLine && isLargeChunk && isPureInsertion && !isOnlyWhitespace) {
        this.lastRecordedAt = now;
        const lines = change.text.split('\n').length;

        this.log?.info(`AI Monitor: heuristic insertion (~${String(lines)} lines, tool=${tool})`);

        this.emitter.fire({
          tool,
          linesCount: lines,
          estimated: true,
        });
        break;
      }
    }
  }

  dispose(): void {
    this.emitter.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
