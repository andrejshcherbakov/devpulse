import type * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

const BUFFER_KEY = 'devpulse.telemetryBuffer';
export const MAX_BUFFER_SIZE = 500;

export interface BufferedTelemetryBatch {
  batchId: string;
  events: Array<TelemetryEventDto>;
}

export interface TelemetryBufferState {
  queue: Array<TelemetryEventDto>;
  inflight: BufferedTelemetryBatch | null;
}

interface BufferStorage {
  get(key: string): unknown;
  update(key: string, value: unknown): Thenable<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isBufferedBatch(value: unknown): value is BufferedTelemetryBatch {
  return isRecord(value) && typeof value.batchId === 'string' && Array.isArray(value.events);
}

function isTelemetryBufferState(value: unknown): value is TelemetryBufferState {
  return (
    isRecord(value) &&
    Array.isArray(value.queue) &&
    (value.inflight === null || isBufferedBatch(value.inflight))
  );
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
  constructor(
    private readonly storage: BufferStorage,
    private readonly log?: vscode.LogOutputChannel,
  ) {}

  public load(): TelemetryBufferState {
    const data = this.storage.get(BUFFER_KEY);

    if (data === undefined) return { queue: [], inflight: null };

    if (!isTelemetryBufferState(data)) {
      this.log?.warn('Discarding malformed telemetry buffer');
      return { queue: [], inflight: null };
    }

    const limited = limitBufferState(data);

    if (limited.dropped > 0) {
      this.log?.warn(`Buffer overflow on load: dropped ${String(limited.dropped)} oldest events`);
    }

    return limited.state;
  }

  public async save(state: TelemetryBufferState): Promise<void> {
    const limited = limitBufferState(state);
    if (limited.dropped > 0) {
      this.log?.warn(`Buffer overflow: dropping ${String(limited.dropped)} oldest events`);
    }

    await this.storage.update(BUFFER_KEY, limited.state);
  }

  public async clear(): Promise<void> {
    // VS Code removes a globalState entry when its value is undefined.
    // eslint-disable-next-line unicorn/no-useless-undefined
    await this.storage.update(BUFFER_KEY, undefined);
  }
}
