import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWorkingTreeStatus } from './working-tree-status.js';

void describe('parseWorkingTreeStatus', () => {
  void it('parses modified, untracked and renamed paths including spaces', () => {
    const output = [
      '1 .M N... 100644 100644 100644 old old src/main file.ts',
      '? src/new file.ts',
      '2 R. N... 100644 100644 100644 old new R100 src/new-name.ts',
      'src/old-name.ts',
      '',
    ].join('\0');

    assert.deepEqual(parseWorkingTreeStatus(output), [
      { path: 'src/main file.ts', status: 'modified' },
      { path: 'src/new file.ts', status: 'untracked' },
      { path: 'src/new-name.ts', status: 'renamed' },
    ]);
  });

  void it('marks deleted and conflicted files', () => {
    const output = [
      '1 .D N... 100644 100644 000000 old old src/deleted.ts',
      'u UU N... 100644 100644 100644 100644 one two three src/conflicted.ts',
      '',
    ].join('\0');

    assert.deepEqual(parseWorkingTreeStatus(output), [
      { path: 'src/deleted.ts', status: 'deleted' },
      { path: 'src/conflicted.ts', status: 'conflicted' },
    ]);
  });
});
