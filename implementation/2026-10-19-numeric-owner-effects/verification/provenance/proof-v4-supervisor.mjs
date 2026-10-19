import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import path from 'node:path';

const root = process.cwd();
const proofDir = 'implementation/2026-10-19-numeric-owner-effects/proof-v4';
const provenanceDir = 'implementation/2026-10-19-numeric-owner-effects/verification/provenance';
const receiptPath = path.join(provenanceDir, 'proof-v4-supervisor.json');
const nodePath = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node';
const env = {
  ...process.env,
  PATH: '/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',
  CI: 'true',
  CARGO_HOME: '/Volumes/Depot/Developer/r3act/.cache/cargo',
  CARGO_BUILD_JOBS: '1',
  R3ACT_SOURCE_COMMIT: '98b15bf94291d6b7f4c699a0d064ff7cfdd2c927'
};
const commands = [
  { name: 'prepare', args: ['implementation/2026-10-19-numeric-owner-effects/prepare.mjs', '--proof-dir', proofDir], timeoutMs: 120_000 },
  { name: 'build-pair', args: ['implementation/2026-10-19-numeric-owner-effects/run-build-pair.mjs', '--proof-dir', proofDir], timeoutMs: 120_000 },
  { name: 'browser-proof', args: ['implementation/2026-10-19-numeric-owner-effects/verify-browser.mjs', '--proof-dir', proofDir, '--phase', 'proof'], timeoutMs: 90_000 }
];
await mkdir(provenanceDir, { recursive: true });
const receipt = { schemaVersion: 1, source: 'proof-v4', supervisorStartedAt: new Date().toISOString(), nodePath, commands: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

async function run(command) {
  const stdoutPath = path.join(provenanceDir, `proof-v4-${command.name}.stdout.log`);
  const stderrPath = path.join(provenanceDir, `proof-v4-${command.name}.stderr.log`);
  await writeFile(stdoutPath, '');
  await writeFile(stderrPath, '');
  const record = {
    name: command.name,
    argv: [nodePath, ...command.args],
    cwd: root,
    startedAt: new Date().toISOString(),
    timeoutMs: command.timeoutMs,
    stdout: path.basename(stdoutPath),
    stderr: path.basename(stderrPath),
    exitCode: null,
    signal: null,
    timedOut: false,
    pid: null
  };
  receipt.commands.push(record);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  const child = spawn(nodePath, command.args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdoutStream = createWriteStream(stdoutPath, { flags: 'a' });
  const stderrStream = createWriteStream(stderrPath, { flags: 'a' });
  child.stdout.pipe(stdoutStream);
  child.stderr.pipe(stderrStream);
  record.pid = child.pid ?? null;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      record.timedOut = true;
      child.kill('SIGTERM');
      resolve();
    }, command.timeoutMs);
  });
  const completion = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => {
      record.exitCode = code;
      record.signal = signal;
      resolve();
    });
  });
  await Promise.race([completion, timeout]);
  if (record.timedOut && record.exitCode === null) {
    await Promise.race([completion, new Promise((resolve) => setTimeout(resolve, 3000))]);
    if (record.exitCode === null) child.kill('SIGKILL');
    await completion;
  }
  clearTimeout(timer);
  record.finishedAt = new Date().toISOString();
  await Promise.all([finished(stdoutStream), finished(stderrStream)]);
  record.stdoutBytes = (await stat(stdoutPath)).size;
  record.stderrBytes = (await stat(stderrPath)).size;
  record.status = record.timedOut ? 'TIMEOUT' : record.exitCode === 0 ? 'PASS' : 'FAIL';
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
  process.stdout.write(`${command.name}: ${record.status} exit=${record.exitCode} startedAt=${record.startedAt} finishedAt=${record.finishedAt}\n`);
  return record.status === 'PASS';
}

for (const command of commands) {
  if (!await run(command)) {
    receipt.status = 'STOPPED_ON_FAILURE';
    receipt.supervisorFinishedAt = new Date().toISOString();
    await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    process.exitCode = 1;
    break;
  }
}
if (!receipt.status) receipt.status = 'ALL_PROOF_STEPS_PASSED';
receipt.supervisorFinishedAt = new Date().toISOString();
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
