import { type WorkingTreeChange, type WorkingTreeStatus } from '@devpulse/lib';

const MAX_CHANGES = 100;

function statusFromIndex(xy: string): WorkingTreeStatus {
  if (xy.includes('U') || xy === 'AA' || xy === 'DD') return 'conflicted';
  if (xy.includes('R')) return 'renamed';
  if (xy.includes('D')) return 'deleted';
  if (xy.includes('A')) return 'added';
  return 'modified';
}

export function parseWorkingTreeStatus(output: string): Array<WorkingTreeChange> {
  const records = output.split('\0');
  const changes: Array<WorkingTreeChange> = [];

  for (let index = 0; index < records.length && changes.length < MAX_CHANGES; index += 1) {
    const record = records[index];
    if (record === '') continue;

    if (record.startsWith('? ')) {
      changes.push({ path: record.slice(2), status: 'untracked' });
      continue;
    }

    if (record.startsWith('1 ')) {
      const fields = record.split(' ');
      const path = fields.slice(8).join(' ');
      if (path !== '') changes.push({ path, status: statusFromIndex(fields[1] ?? '') });
      continue;
    }

    if (record.startsWith('2 ')) {
      const fields = record.split(' ');
      const path = fields.slice(9).join(' ');
      if (path !== '') changes.push({ path, status: 'renamed' });
      index += 1;
      continue;
    }

    if (record.startsWith('u ')) {
      const fields = record.split(' ');
      const path = fields.slice(10).join(' ');
      if (path !== '') changes.push({ path, status: 'conflicted' });
    }
  }

  return changes;
}
