import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PendingBuffer } from './pending-buffer.js';

void describe('PendingBuffer', () => {
  void it('returns recent events and drops expired events', () => {
    const buffer = new PendingBuffer();
    for (const event of [
      { type: 'task_run' as const, partial: { taskName: 'build' }, createdAt: Date.now() },
      {
        type: 'terminal_command' as const,
        partial: { command: 'pnpm test' },
        createdAt: Date.now() - 3 * 60 * 1000,
      },
    ]) {
      buffer.push(event);
    }

    const result = buffer.drain();

    assert.equal(result.valid.length, 1);
    assert.equal(result.valid[0]?.type, 'task_run');
    assert.equal(result.dropped, 1);
    assert.equal(buffer.size, 0);
  });
});
