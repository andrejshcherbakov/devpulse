import * as vscode from 'vscode';

import { selectTouchedSymbolNames, type SymbolRange } from './symbol-selection.js';

const MAX_TRACKED_LINES = 200;
const MAX_SYMBOLS = 20;

export interface TouchedSymbolsEvent {
  uri: vscode.Uri;
  symbols: Array<string>;
}

const TRACKED_SYMBOL_KINDS = new Set([
  vscode.SymbolKind.Class,
  vscode.SymbolKind.Constructor,
  vscode.SymbolKind.Enum,
  vscode.SymbolKind.Function,
  vscode.SymbolKind.Interface,
  vscode.SymbolKind.Method,
]);

function isDocumentSymbol(
  symbol: vscode.DocumentSymbol | vscode.SymbolInformation,
): symbol is vscode.DocumentSymbol {
  return 'range' in symbol;
}

function flattenDocumentSymbols(
  symbols: ReadonlyArray<vscode.DocumentSymbol>,
  parentName = '',
): Array<SymbolRange> {
  const result: Array<SymbolRange> = [];

  for (const symbol of symbols) {
    const qualifiedName = parentName === '' ? symbol.name : `${parentName}.${symbol.name}`;
    if (TRACKED_SYMBOL_KINDS.has(symbol.kind)) {
      result.push({
        name: qualifiedName,
        startLine: symbol.range.start.line,
        endLine: symbol.range.end.line,
      });
    }
    result.push(...flattenDocumentSymbols(symbol.children, qualifiedName));
  }

  return result;
}

function flattenSymbols(
  symbols: ReadonlyArray<vscode.DocumentSymbol | vscode.SymbolInformation>,
): Array<SymbolRange> {
  if (symbols.every((symbol) => isDocumentSymbol(symbol))) return flattenDocumentSymbols(symbols);

  return symbols
    .filter((symbol) => TRACKED_SYMBOL_KINDS.has(symbol.kind))
    .map((symbol) => ({
      name:
        !isDocumentSymbol(symbol) && symbol.containerName
          ? `${symbol.containerName}.${symbol.name}`
          : symbol.name,
      startLine: isDocumentSymbol(symbol)
        ? symbol.range.start.line
        : symbol.location.range.start.line,
      endLine: isDocumentSymbol(symbol) ? symbol.range.end.line : symbol.location.range.end.line,
    }));
}

export class SymbolMonitor implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<TouchedSymbolsEvent>();
  public readonly onDidTouchSymbols = this.emitter.event;

  private readonly disposables: Array<vscode.Disposable> = [];
  private readonly changedLines = new Map<string, Set<number>>();

  constructor(
    private readonly isEnabled: () => boolean,
    private readonly log?: vscode.LogOutputChannel,
  ) {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (!this.isEnabled() || event.contentChanges.length === 0) return;

        const key = event.document.uri.toString();
        const lines = this.changedLines.get(key) ?? new Set<number>();

        for (const change of event.contentChanges) {
          const insertedLines = change.text.split('\n').length - 1;
          const endLine = Math.max(change.range.end.line, change.range.start.line + insertedLines);
          for (let line = change.range.start.line; line <= endLine; line += 1) {
            if (lines.size >= MAX_TRACKED_LINES) break;
            lines.add(line);
          }
        }

        this.changedLines.set(key, lines);
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        void this.resolveSymbols(document);
      }),
    );
  }

  private async resolveSymbols(document: vscode.TextDocument): Promise<void> {
    const key = document.uri.toString();
    const lines = this.changedLines.get(key);
    this.changedLines.delete(key);
    if (!this.isEnabled() || !lines || lines.size === 0) return;

    try {
      const provided = await vscode.commands.executeCommand<
        Array<vscode.DocumentSymbol | vscode.SymbolInformation> | undefined
      >('vscode.executeDocumentSymbolProvider', document.uri);
      if (!provided || provided.length === 0) return;

      const names = selectTouchedSymbolNames(lines, flattenSymbols(provided), MAX_SYMBOLS);

      if (names.length > 0) {
        this.log?.info(`symbols: ${String(names.length)} touched in ${document.fileName}`);
        this.emitter.fire({ uri: document.uri, symbols: names });
      }
    } catch (error) {
      this.log?.info(`symbol lookup failed: ${String(error)}`);
    }
  }

  public dispose(): void {
    for (const disposable of this.disposables) disposable.dispose();
    this.emitter.dispose();
    this.changedLines.clear();
  }
}
