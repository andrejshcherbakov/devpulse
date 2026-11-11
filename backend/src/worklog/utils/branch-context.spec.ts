import { describe, expect, it } from '@jest/globals';

import { normalizeBranchName } from './branch-context';

describe('branch context', () => {
  it.each([
    ['codex/feat/branch-aware-worklogs', 'feat/branch-aware-worklogs'],
    ['origin/feat/branch-aware-worklogs', 'feat/branch-aware-worklogs'],
    ['refs/heads/feat/branch-aware-worklogs', 'feat/branch-aware-worklogs'],
    ['refs/remotes/origin/feat/branch-aware-worklogs', 'feat/branch-aware-worklogs'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalizeBranchName(input)).toBe(expected);
  });
});
