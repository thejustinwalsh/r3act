import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const provenanceDir = 'implementation/2026-10-19-numeric-owner-effects/verification/provenance';
const proofDir = 'implementation/2026-10-19-numeric-owner-effects/proof-v4';
const receiptPath = path.join(provenanceDir, 'proof-v4-measure-supervisor.json');
const nodePath = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readSha = async (file) => sha(await readFile(file));
const authorizationPath = path.join(proofDir, 'run-authorization.json');
const authorization = JSON.parse(await readFile(authorizationPath, 'utf8'));
const expected = {
  buildProofSha256: authorization.buildProofSha256,
  pairProofSha256: authorization.pairProofSha256,
  browserUntimedSha256: authorization.browserUntimedSha256
};
const actual = {
  buildProofSha256: await readSha(path.join(proofDir, 'build-proof.json')),
  pairProofSha256: await readSha(path.join(proofDir, 'pair-proof.json')),
  browserUntimedSha256: await readSha(path.join(proofDir, 'browser-untimed.json'))
};
for (const name of Object.keys(expected)) {
  if (expected[name] !== actual[name]) throw new Error(`Authorization hash mismatch: ${name}`);
}
try {
  await readFile(receiptPath);
  throw new Error('Measurement supervisor receipt already exists; refusing a second measurement run.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(provenanceDir, { recursive: true });
const command = {
  name: 'measure',
  argv: [nodePath, 'implementation/2026-10-19-numeric-owner-effects/verify-browser.mjs', '--proof-dir', proofDir, '--phase', 'measure'],
  cwd: root,
  timeoutMs: 90_000,
  authorization: authorizationPath,
  authorizationHashes: actual
};
const stdoutPath = path.join(provenanceDir, 'proof-v4-measure.stdout.log');
const stderrPath = path.join(provenanceDir, 'proof-v4-measure.stderr.log');
const receipt = { schemaVersion: 1, status: 'RUNNING', supervisorStartedAt: new Date().toISOString(), nodePath, command };
await writeFile(stdoutPath, '');
await writeFile(stderrPath, '');
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
command.startedAt = new Date().toISOString();
const child = spawn(nodePath, command.argv.slice(1), {
  cwd: root,
  env: {
    ...process.env,
    PATH: '/private/tmp/radix-dialog-darwin-v1-bin:/Users/mini/.local/share/mise/installs/node/24.18.0/bin:/Users/mini/.cargo/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin',
    CI: 'true',
    CARGO_HOME: '/Volumes/Depot/Developer/r3act/.cache/cargo',
    CARGO_BUILD_JOBS: '1',
    R3ACT_SOURCE_COMMIT: '98b15bf94291d6b7f4c699a0d064ff7cfdd2c927'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
command.pid = child.pid ?? null;
const stdout = createWriteStream(stdoutPath, { flags: 'a' });
const stderr = createWriteStream(stderrPath, { flags: 'a' });
child.stdout.pipe(stdout);
child.stderr.pipe(stderr);
let timedOut = false;
const timeout = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, command.timeoutMs);
let spawnError = null;
const ended = new Promise((resolve) => {
  child.on('error', (error) => { spawnError = String(error); resolve({ code: null, signal: null }); });
  child.on('close', (code, signal) => resolve({ code, signal }));
});
const result = await ended;
clearTimeout(timeout);
await Promise.all([finished(stdout), finished(stderr)]);
command.exitCode = result.code;
command.signal = result.signal;
command.spawnError = spawnError;
command.timedOut = timedOut;
command.finishedAt = new Date().toISOString();
command.stdout = path.basename(stdoutPath);
command.stderr = path.basename(stderrPath);
command.stdoutBytes = (await stat(stdoutPath)).size;
command.stderrBytes = (await stat(stderrPath)).size;
receipt.status = timedOut ? 'TIMEOUT' : result.code === 0 ? 'PASS' : 'FAIL';
receipt.supervisorFinishedAt = command.finishedAt;
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
process.stdout.write(`measure: ${receipt.status} exit=${command.exitCode} startedAt=${command.startedAt} finishedAt=${command.finishedAt}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
