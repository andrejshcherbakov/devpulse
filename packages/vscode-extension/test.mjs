import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as esbuild from 'esbuild';

const tempDirectory = await mkdtemp(path.join(tmpdir(), 'devpulse-extension-tests-'));
const outfile = path.join(tempDirectory, 'tests.cjs');

try {
  await esbuild.build({
    entryPoints: ['src/test/index.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    outfile,
    logLevel: 'warning',
  });

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', outfile], { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
} finally {
  await rm(tempDirectory, { recursive: true, force: true });
}
