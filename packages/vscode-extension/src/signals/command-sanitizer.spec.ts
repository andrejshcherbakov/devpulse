import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sanitizeCommand } from './command-sanitizer.js';

void describe('sanitizeCommand', () => {
  void it('keeps a package-manager script name without its arguments', () => {
    assert.equal(sanitizeCommand('pnpm run lint -- --fix'), 'pnpm run lint');
  });

  void it('removes commit-message contents', () => {
    assert.equal(sanitizeCommand('git commit -m "secret ticket title"'), 'git commit');
  });

  void it('drops unknown executables', () => {
    assert.equal(sanitizeCommand('company-internal-cli --token secret'), '');
  });

  void it('keeps at most three safe pipeline segments', () => {
    assert.equal(sanitizeCommand('pwd && ls | head ; whoami && date'), 'pwd && ls && head');
  });
});
