import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const out = path.join(root, 'implementation/2026-10-23-declarative-frame-program/verification');
const receiptPath = path.join(out, 'receipt.json');
const receipt = JSON.parse(await readFile(receiptPath, 'utf8'));
const prior = JSON.parse(await readFile(path.join(root,
  'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
const priorCompiled = prior.steps.filter(s => /^compiled-\d+$/.test(s.name)).map(s => s.command.at(-1));
const priorFixtures = prior.steps.filter(s => ['artifact-conformance', 'hmr-revision-plugin',
  'react-composition-plugin', 'runtime-origin-plugin', 'react-island-compiled-source',
  'radix-dialog-compiled-source', 'compiled-collection-gc'].includes(s.name)).map(s => s.command.at(-1));
const fixtures = [...new Set([...priorCompiled, 'compiler/compiled_declarative_frame_test.mjs', ...priorFixtures,
  'compiler/vite_native_module_test.mjs', 'compiler/vite_native_plugin_test.mjs',
  'compiler/vite_native_derived_local_test.mjs', 'compiler/vite_native_package_dev_resolution_test.mjs'])];
const recorded = new Set(receipt.steps.map(s => s.command?.at(-1)).filter(Boolean));
for (const file of fixtures) {
  if (recorded.has(file)) continue;
  const name = `${file.includes('compiled_') ? 'compiled' : 'fixture'}-${String(receipt.steps.length + 1).padStart(2, '0')}`;
  receipt.steps.push({ name, status: 'SKIPPED_DEPENDENCY_FAILED', dependency: 'cargo-build', reason:
    'Compiler build failed; stale prechange binary is not eligible for this source freeze.', file });
}

const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const env = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
const run = async (name, args, timeoutMs) => {
  const logPath = path.join(out, 'logs', `${name}.log`), log = createWriteStream(logPath, { flags: 'wx' });
  const startedAt = new Date().toISOString(), start = performance.now();
  const child = spawn('pnpm', args, { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => log.write(b)); child.stderr.on('data', b => log.write(b));
  let timeout = false;
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeoutMs);
  const result = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') throw e; }
  await new Promise(resolve => log.end(resolve));
  const status = timeout ? 'TIMEOUT' : result.code === 0 && !result.signal ? 'PASS' : 'FAIL';
  receipt.steps.push({ name, status, command: ['pnpm', ...args], startedAt,
    durationMs: Math.round(performance.now() - start), timeoutMs, exitCode: result.code,
    signal: result.signal, log: `logs/${name}.log` });
  await save(); console.log(`${name}: ${status} exit=${result.code}`); return status;
};
const save = () => writeFile(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
const packageStatus = await run('package-build', ['package:r3act'], 900_000);
if (packageStatus === 'PASS') await run('package-consumer', ['check:r3act-packages'], 900_000);
else receipt.steps.push({ name: 'package-consumer', status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-build'] });

const freeze = JSON.parse(await readFile(path.join(out, '..', 'source-review-v1.json'), 'utf8'));
const bad = [];
for (const file of freeze.source) {
  const bytes = await readFile(path.join(root, file.path));
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) bad.push(file.path);
}
receipt.sourceAuditAfter = bad.length ? { status: 'MISMATCH', paths: bad } : { status: 'MATCH', count: freeze.source.length };
receipt.fixtureCount = fixtures.length;
receipt.finishedAt = new Date().toISOString();
receipt.status = 'FAIL';
receipt.finalNote = 'Interrupted after compiler cargo-test/build failures by primary direction; early fixture invocations against the stale compiler binary are diagnostic and do not qualify.';
await save();
console.log(`Declarative frame gate ${receipt.status}; source audit ${receipt.sourceAuditAfter.status}`);
