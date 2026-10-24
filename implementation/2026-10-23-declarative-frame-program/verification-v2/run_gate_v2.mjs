import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const unit = path.join(root, 'implementation/2026-10-23-declarative-frame-program');
const out = path.join(unit, 'verification-v2');
const freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v2.json'), 'utf8'));
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V2');
assert.equal(freeze.source.length, 873);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const binaryHash = async () => {
  try { return hash(await readFile(compiler)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
};
const checkFreeze = async () => {
  const bad = [];
  for (const file of freeze.source) {
    const bytes = await readFile(path.join(root, file.path));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) bad.push(file.path);
  }
  return bad;
};
const initialBinaryHash = await binaryHash();
const mismatchesBefore = await checkFreeze();
await mkdir(path.join(out, 'logs'), { recursive: true });

const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const environment = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), sourceFreeze: 'source-review-v2.json',
  sourceCount: freeze.source.length, sourceAuditBefore: mismatchesBefore.length ? { status: 'MISMATCH', paths: mismatchesBefore }
    : { status: 'MATCH', count: freeze.source.length }, toolchain: { node: process.execPath,
    nodeVersion: process.version, nodePathFirst: nodePin, cargoHome: environment.CARGO_HOME,
    cargoBuildJobs: environment.CARGO_BUILD_JOBS, ci: environment.CI },
  compilerBinary: { path: compiler, initialSha256: initialBinaryHash }, steps: [] };
assert.equal(process.version, 'v24.18.0');
const save = () => writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
await save();

const prior = JSON.parse(await readFile(path.join(root,
  'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
const oldCompiled = prior.steps.filter(s => /^compiled-\d+$/.test(s.name));
assert.equal(oldCompiled.length, 63, 'required full previous compiled fixture inventory');
const carriedNames = prior.steps.filter(s => ['artifact-conformance', 'hmr-revision-plugin',
  'react-composition-plugin', 'runtime-origin-plugin', 'react-island-compiled-source',
  'radix-dialog-compiled-source', 'compiled-collection-gc'].includes(s.name)).map(s => s.command.at(-1));
const fixtureFiles = [...new Set([...oldCompiled.map(s => s.command.at(-1)),
  'compiler/compiled_declarative_frame_test.mjs', ...carriedNames,
  'compiler/vite_native_module_test.mjs', 'compiler/vite_native_plugin_test.mjs',
  'compiler/vite_native_derived_local_test.mjs', 'compiler/vite_native_package_dev_resolution_test.mjs'])];
receipt.fixtureCount = fixtureFiles.length;
receipt.fixtureFiles = fixtureFiles;
const steps = [
  { name: 'deno-full', command: 'deno', args: ['test', '--config', 'deno.browser.json', '--frozen',
    '--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock', 'src'], timeoutMs: 900_000 },
  { name: 'cargo-test', command: 'cargo', args: ['test', '--locked', '--manifest-path',
    'compiler/oxc-spike/Cargo.toml'], timeoutMs: 900_000 },
  { name: 'cargo-build', command: 'cargo', args: ['build', '--locked', '--manifest-path',
    'compiler/oxc-spike/Cargo.toml'], timeoutMs: 900_000 },
  { name: 'native-tooling', command: 'pnpm', args: ['check:native-tooling'], timeoutMs: 300_000 },
  { name: 'package-build', command: 'pnpm', args: ['package:r3act'], timeoutMs: 900_000 },
  { name: 'package-consumer', command: 'pnpm', args: ['check:r3act-packages'], timeoutMs: 900_000, depends: ['package-build'] },
];
const executedByName = new Map();
let expectedCompilerHash = null;
let interrupted = null;
let active;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  interrupted = signal;
  if (active?.pid) { try { process.kill(-active.pid, 'SIGKILL'); } catch {} }
});
const run = async spec => {
  const startedAt = new Date().toISOString(), start = performance.now();
  const logPath = path.join(out, 'logs', `${spec.name}.log`);
  const log = createWriteStream(logPath, { flags: 'wx' });
  const beforeHash = await binaryHash();
  const child = spawn(spec.command, spec.args, { cwd: root, env: environment, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'] });
  active = child;
  child.stdout.on('data', bytes => log.write(bytes)); child.stderr.on('data', bytes => log.write(bytes));
  let timeout = false, spawnError = null;
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, spec.timeoutMs);
  const result = await new Promise(resolve => {
    child.once('error', error => { spawnError = String(error); resolve({ code: null, signal: null }); });
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); active = undefined;
  try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') spawnError ??= String(error); }
  await new Promise(resolve => log.end(resolve));
  const afterHash = await binaryHash();
  const status = timeout ? 'TIMEOUT' : interrupted ? 'INTERRUPTED' : spawnError || result.code !== 0 || result.signal ? 'FAIL' : 'PASS';
  const step = { name: spec.name, status, command: [spec.command, ...spec.args], startedAt,
    durationMs: Math.round(performance.now() - start), timeoutMs: spec.timeoutMs, exitCode: result.code,
    signal: result.signal, spawnError, log: `logs/${spec.name}.log`, compilerSha256Before: beforeHash,
    compilerSha256After: afterHash };
  receipt.steps.push(step); executedByName.set(spec.name, step); await save();
  process.stdout.write(`${spec.name}: ${status} exit=${result.code}\n`);
  if (spec.name === 'cargo-build' && status === 'PASS') {
    if (afterHash === null) step.status = 'FAIL_MISSING_COMPILER_BINARY';
    else expectedCompilerHash = afterHash;
  }
  return step;
};

if (mismatchesBefore.length) {
  receipt.steps.push({ name: 'freeze-preflight', status: 'BLOCKED_SOURCE_MISMATCH', paths: mismatchesBefore });
} else {
  for (const spec of steps) {
    if (interrupted) {
      receipt.steps.push({ name: spec.name, status: 'SKIPPED_INTERRUPTED', signal: interrupted }); await save(); continue;
    }
    if (spec.depends?.some(name => executedByName.get(name)?.status !== 'PASS')) {
      receipt.steps.push({ name: spec.name, status: 'SKIPPED_DEPENDENCY_FAILED', depends: spec.depends }); await save(); continue;
    }
    await run(spec);
  }
}

const compilerBuild = executedByName.get('cargo-build');
if (!interrupted && !mismatchesBefore.length) {
  if (compilerBuild?.status !== 'PASS') {
    receipt.compilerFixturesStatus = 'SKIPPED_DEPENDENCY_FAILED';
    receipt.compilerFixturesReason = 'Cargo build did not succeed; the initial binary hash is recorded for diagnosis but stale binary use is forbidden.';
    for (let index = 0; index < fixtureFiles.length; index++) receipt.steps.push({
      name: `fixture-${String(index + 1).padStart(2, '0')}`, file: fixtureFiles[index],
      status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['cargo-build'] });
    await save();
  } else {
    assert.equal(expectedCompilerHash, await binaryHash(), 'compiler binary changed after successful build');
    for (let index = 0; index < fixtureFiles.length; index++) {
      const file = fixtureFiles[index];
      const old = oldCompiled.find(s => s.command.at(-1) === file);
      const gc = old?.command.includes('--expose-gc') || /(?:collection_owner_retention|compact_scalar_output|owned_scalar_capture|owned_frame_transaction|store_batch_execution)_test\.mjs$/.test(file);
      const name = `fixture-${String(index + 1).padStart(2, '0')}`;
      const step = await run({ name, command: process.execPath,
        args: ['--experimental-transform-types', ...(gc ? ['--expose-gc'] : []), file], timeoutMs: 300_000 });
      step.debugCompilerSha256Expected = expectedCompilerHash;
      if (step.compilerSha256After !== expectedCompilerHash) step.status = 'FAIL_COMPILER_CHANGED';
      executedByName.set(name, step); await save();
      if (step.status === 'FAIL' || step.status === 'TIMEOUT' || step.status === 'FAIL_COMPILER_CHANGED' || interrupted) {
        process.stdout.write(`first actual fixture failure: ${file} (${step.status})\n`);
      }
    }
  }
} else if (interrupted) {
  for (let index = 0; index < fixtureFiles.length; index++) receipt.steps.push({
    name: `fixture-${String(index + 1).padStart(2, '0')}`, file: fixtureFiles[index], status: 'SKIPPED_INTERRUPTED' });
}

const mismatchesAfter = await checkFreeze();
receipt.sourceAuditAfter = mismatchesAfter.length ? { status: 'MISMATCH', paths: mismatchesAfter }
  : { status: 'MATCH', count: freeze.source.length };
receipt.compilerBinary.expectedBuiltSha256 = expectedCompilerHash;
receipt.finishedAt = new Date().toISOString();
receipt.interruptedBy = interrupted;
receipt.status = !interrupted && !mismatchesBefore.length && !mismatchesAfter.length &&
  receipt.steps.every(step => step.status === 'PASS') ? 'PASS' : 'FAIL';
await save();
process.stdout.write(`Declarative frame V2 gate ${receipt.status}; source audit ${receipt.sourceAuditAfter.status}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
