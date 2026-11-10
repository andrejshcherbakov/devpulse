import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

import { limitBufferState, MAX_BUFFER_SIZE, TelemetryBufferStore } from './buffer-store.js';

function event(index: number): TelemetryEventDto {
  return {
    type: 'heartbeat',
    gitBranch: 'main',
    clientTimestamp: new Date(index).toISOString(),
  };
}

void describe('limitBufferState', () => {
  void it('keeps the newest queued events within the total limit', () => {
    const events = Array.from({ length: MAX_BUFFER_SIZE + 25 }, (_, index) => event(index));
    const result = limitBufferState({ queue: events, inflight: null });

    assert.equal(result.state.queue.length, MAX_BUFFER_SIZE);
    assert.equal(result.dropped, 25);
    assert.equal(result.state.queue[0]?.clientTimestamp, event(25).clientTimestamp);
  });

  void it('reserves capacity for a stable in-flight batch', () => {
    const inflight = Array.from({ length: 50 }, (_, index) => event(index));
    const queue = Array.from({ length: MAX_BUFFER_SIZE }, (_, index) => event(index + 50));
    const result = limitBufferState({
      queue,
      inflight: { batchId: 'batch-1', events: inflight },
    });

    assert.ok(result.state.inflight);
    assert.equal(result.state.inflight.batchId, 'batch-1');
    assert.equal(result.state.inflight.events.length, 50);
    assert.equal(result.state.queue.length, MAX_BUFFER_SIZE - 50);
    assert.equal(result.dropped, 50);
  });
});

void describe('TelemetryBufferStore', () => {
  void it('persists the stable batch id together with queued events', async () => {
    let stored: unknown;
    const context = {
      globalState: {
        get: () => stored,
        update: (_key: string, value: unknown) => {
          stored = value;
          return Promise.resolve();
        },
      },
    } as unknown as vscode.ExtensionContext;
    const store = new TelemetryBufferStore();

    await store.save(context, {
      queue: [event(2)],
      inflight: { batchId: 'stable-batch', events: [event(1)] },
    });

    const loaded = store.load(context);
    assert.ok(loaded.inflight);
    assert.equal(loaded.inflight.batchId, 'stable-batch');
    assert.equal(loaded.inflight.events.length, 1);
    assert.equal(loaded.queue.length, 1);
  });

  void it('migrates the previous queue-only schema', () => {
    const context = {
      globalState: {
        get: () => ({ version: 2, events: [event(1), event(2)] }),
      },
    } as unknown as vscode.ExtensionContext;

    const loaded = new TelemetryBufferStore().load(context);
    assert.equal(loaded.inflight, null);
    assert.equal(loaded.queue.length, 2);
  });
});
