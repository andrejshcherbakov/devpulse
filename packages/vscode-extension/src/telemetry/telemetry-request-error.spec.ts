import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TelemetryRequestError } from './telemetry-request-error.js';

void describe('TelemetryRequestError', () => {
  void it('classifies authentication failures separately', () => {
    const error = new TelemetryRequestError('Unauthorized', 401);
    assert.equal(error.isAuthError, true);
    assert.equal(error.retryable, false);
  });

  void it('retries network, rate-limit and server failures', () => {
    assert.equal(new TelemetryRequestError('Network error', null).retryable, true);
    assert.equal(new TelemetryRequestError('Rate limited', 429).retryable, true);
    assert.equal(new TelemetryRequestError('Server error', 503).retryable, true);
  });
});
