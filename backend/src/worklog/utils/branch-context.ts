export function normalizeBranchName(value: string): string {
  let branch = value.trim();

  if (branch.startsWith('refs/heads/')) {
    branch = branch.slice('refs/heads/'.length);
  } else if (branch.startsWith('refs/remotes/')) {
    branch = branch.slice('refs/remotes/'.length);
    const separator = branch.indexOf('/');
    if (separator !== -1) branch = branch.slice(separator + 1);
  }

  if (branch.startsWith('origin/')) branch = branch.slice('origin/'.length);
  if (branch.startsWith('codex/')) branch = branch.slice('codex/'.length);

  return branch;
}
