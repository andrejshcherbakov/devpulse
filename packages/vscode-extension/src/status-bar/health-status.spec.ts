import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { combineHealthStatuses } from './health-status.js';

void describe('combineHealthStatuses', () => {
  void it('does not hide a sync error after a successful stats request', () => {
    assert.equal(combineHealthStatuses('error', 'ok'), 'error');
  });

  void it('surfaces an invalid key over an offline state', () => {
    assert.equal(combineHealthStatuses('offline', 'invalid-key'), 'invalid-key');
  });
});
