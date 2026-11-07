import type * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

const BUFFER_STORAGE_VERSION = 2;
const BUFFER_KEY = 'devpulse.telemetryBuffer.v2';
const MAX_BUFFER_SIZE = 500;

interface BufferEnvelope {
  version: number;
  events: Array<TelemetryEventDto>;
}

export class TelemetryBufferStore {
  constructor(private readonly log?: vscode.LogOutputChannel) {}

  public load(context: vscode.ExtensionContext): Array<TelemetryEventDto> {
    const data = context.globalState.get<BufferEnvelope | Array<TelemetryEventDto>>(BUFFER_KEY);

    if (!data) return [];

    if (Array.isArray(data)) {
      return data;
    }

    if (data.version !== BUFFER_STORAGE_VERSION) {
      this.log?.warn(`Discarding buffer from incompatible schema version: ${String(data.version)}`);
      return [];
    }

    return Array.isArray(data.events) ? data.events : [];
  }

  public async save(
    context: vscode.ExtensionContext,
    events: Array<TelemetryEventDto>,
  ): Promise<void> {
    let finalEvents = events;

    if (events.length > MAX_BUFFER_SIZE) {
      const droppedCount = events.length - MAX_BUFFER_SIZE;
      this.log?.warn(`Buffer overflow: dropping ${String(droppedCount)} oldest events`);
      finalEvents = events.slice(droppedCount);
    }

    const envelope: BufferEnvelope = {
      version: BUFFER_STORAGE_VERSION,
      events: finalEvents,
    };

    await context.globalState.update(BUFFER_KEY, envelope);
  }

  public async clear(context: vscode.ExtensionContext): Promise<void> {
    // VS Code removes a globalState entry when its value is undefined.
    // eslint-disable-next-line unicorn/no-useless-undefined
    await context.globalState.update(BUFFER_KEY, undefined);
  }
}
