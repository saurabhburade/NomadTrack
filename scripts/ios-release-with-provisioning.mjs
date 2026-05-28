#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pbxprojPath = path.join(
  projectRoot,
  'ios',
  'TravelNRITracker.xcodeproj',
  'project.pbxproj'
);

const originalPbxproj = await readFile(pbxprojPath, 'utf8');
const pbxprojWithoutTeam = originalPbxproj
  .split('\n')
  .filter((line) => !line.includes('DEVELOPMENT_TEAM'))
  .join('\n');

if (pbxprojWithoutTeam === originalPbxproj) {
  console.warn('No DEVELOPMENT_TEAM setting found in the Xcode project.');
}

let restored = false;
async function restoreProject() {
  if (!restored) {
    restored = true;
    await writeFile(pbxprojPath, originalPbxproj);
  }
}

let child;
for (const [signal, exitCode] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
]) {
  process.once(signal, async () => {
    child?.kill(signal);
    await restoreProject();
    process.exit(exitCode);
  });
}

try {
  await writeFile(pbxprojPath, pbxprojWithoutTeam);

  const args = [
    'exec',
    'expo',
    'run:ios',
    '--device',
    '--configuration',
    'Release',
    ...process.argv.slice(2),
  ];

  child = spawn('pnpm', args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  const exitCode = await new Promise((resolve) => {
    child.on('error', () => resolve(1));
    child.on('exit', (code, signal) => {
      if (signal === 'SIGINT') {
        resolve(130);
        return;
      }
      if (signal === 'SIGTERM') {
        resolve(143);
        return;
      }
      resolve(code ?? 1);
    });
  });

  await restoreProject();
  process.exit(exitCode);
} catch (error) {
  await restoreProject();
  throw error;
}
