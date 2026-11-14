import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { selectTouchedSymbolNames } from './symbol-selection.js';

void describe('selectTouchedSymbolNames', () => {
  void it('selects the narrow method instead of its enclosing class', () => {
    const result = selectTouchedSymbolNames(
      [12],
      [
        { name: 'AuthService', startLine: 1, endLine: 100 },
        { name: 'AuthService.refresh', startLine: 10, endLine: 20 },
      ],
      20,
    );

    assert.deepEqual(result, ['AuthService.refresh']);
  });

  void it('deduplicates names and respects the limit', () => {
    const result = selectTouchedSymbolNames(
      [2, 3, 12],
      [
        { name: 'first', startLine: 1, endLine: 5 },
        { name: 'second', startLine: 10, endLine: 15 },
      ],
      1,
    );

    assert.deepEqual(result, ['first']);
  });
});
