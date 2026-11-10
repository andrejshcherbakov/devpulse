import type * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

const BUFFER_STORAGE_VERSION = 3;
const BUFFER_KEY = 'devpulse.telemetryBuffer.v2';
export const MAX_BUFFER_SIZE = 500;

export interface BufferedTelemetryBatch {
  batchId: string;
  events: Array<TelemetryEventDto>;
}

export interface TelemetryBufferState {
  queue: Array<TelemetryEventDto>;
  inflight: BufferedTelemetryBatch | null;
}

interface BufferEnvelopeV2 {
  version: 2;
  events: Array<TelemetryEventDto>;
}

interface BufferEnvelopeV3 {
  version: number;
  queue: Array<TelemetryEventDto>;
  inflight: BufferedTelemetryBatch | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBufferedBatch(value: unknown): value is BufferedTelemetryBatch {
  return isRecord(value) && typeof value.batchId === 'string' && Array.isArray(value.events);
}

export function limitBufferState(state: TelemetryBufferState): {
  state: TelemetryBufferState;
  dropped: number;
} {
  const inflightEvents = state.inflight?.events ?? [];
  const keptInflightEvents = inflightEvents.slice(-MAX_BUFFER_SIZE);
  const queueCapacity = Math.max(0, MAX_BUFFER_SIZE - keptInflightEvents.length);
  const keptQueue = queueCapacity === 0 ? [] : state.queue.slice(-queueCapacity);
  const dropped =
    inflightEvents.length - keptInflightEvents.length + state.queue.length - keptQueue.length;

  return {
    state: {
      inflight:
        state.inflight === null
          ? null
          : { batchId: state.inflight.batchId, events: keptInflightEvents },
      queue: keptQueue,
    },
    dropped,
  };
}

export class TelemetryBufferStore {
  constructor(private readonly log?: vscode.LogOutputChannel) {}

  public load(context: vscode.ExtensionContext): TelemetryBufferState {
    const data = context.globalState.get<unknown>(BUFFER_KEY);

    if (!data) return { queue: [], inflight: null };

    if (Array.isArray(data)) {
      return limitBufferState({ queue: data as Array<TelemetryEventDto>, inflight: null }).state;
    }

    if (!isRecord(data) || typeof data.version !== 'number') {
      this.log?.warn('Discarding malformed telemetry buffer');
      return { queue: [], inflight: null };
    }

    if (data.version === 2 && Array.isArray(data.events)) {
      const migrated = limitBufferState({
        queue: (data as unknown as BufferEnvelopeV2).events,
        inflight: null,
      });
      this.log?.info('Migrated telemetry buffer from schema version 2');
      return migrated.state;
    }

    if (data.version !== BUFFER_STORAGE_VERSION || !Array.isArray(data.queue)) {
      this.log?.warn(`Discarding buffer from incompatible schema version: ${String(data.version)}`);
      return { queue: [], inflight: null };
    }

    const envelope = data as unknown as BufferEnvelopeV3;
    const limited = limitBufferState({
      queue: envelope.queue,
      inflight: isBufferedBatch(envelope.inflight) ? envelope.inflight : null,
    });

    if (limited.dropped > 0) {
      this.log?.warn(`Buffer overflow on load: dropped ${String(limited.dropped)} oldest events`);
    }

    return limited.state;
  }

  public async save(context: vscode.ExtensionContext, state: TelemetryBufferState): Promise<void> {
    const limited = limitBufferState(state);
    if (limited.dropped > 0) {
      this.log?.warn(`Buffer overflow: dropping ${String(limited.dropped)} oldest events`);
    }

    const envelope: BufferEnvelopeV3 = {
      version: BUFFER_STORAGE_VERSION,
      queue: limited.state.queue,
      inflight: limited.state.inflight,
    };

    await context.globalState.update(BUFFER_KEY, envelope);
  }

  public async clear(context: vscode.ExtensionContext): Promise<void> {
    // VS Code removes a globalState entry when its value is undefined.
    // eslint-disable-next-line unicorn/no-useless-undefined
    await context.globalState.update(BUFFER_KEY, undefined);
  }
}
