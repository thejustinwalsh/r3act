import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.version, 'v24.18.0');
const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const unit = path.join(root, 'implementation/2026-10-23-declarative-frame-program');
const out = path.join(unit, 'verification-v9');
const freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v9.json'), 'utf8'));
const v8Freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v8.json'), 'utf8'));
const v8Rust = JSON.parse(await readFile(path.join(unit, 'verification-v8/receipt.json'), 'utf8'));
const v8Delivery = JSON.parse(await readFile(path.join(unit, 'verification-v8/delivery-continuation-receipt.json'), 'utf8'));
const fixtureFiles = v8Delivery.fixtureFiles;
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const expectedCompiler = '23328faf507e3dc254b79fa4b0a46a0b449fa7981bc1e8b7b04c5b5867508624';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compilerHash = async () => hash(await readFile(compiler));
const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const env = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V9');
assert.equal(freeze.source.length, 873); assert.equal(fixtureFiles.length, 75);
assert.equal(v8Rust.steps.find(step => step.name === 'cargo-test')?.status, 'PASS');
assert.equal(v8Rust.steps.find(step => step.name === 'cargo-build')?.status, 'PASS');
assert.equal(v8Delivery.status, 'PASS');
assert.equal(await compilerHash(), expectedCompiler, 'debug compiler artifact differs from the accepted V8 artifact');

const oldRows = new Map(v8Freeze.source.map(row => [row.path, row]));
const freezeDelta = freeze.source.filter(row => oldRows.get(row.path)?.sha256 !== row.sha256)
  .map(row => ({ path: row.path, previousSha256: oldRows.get(row.path)?.sha256, sha256: row.sha256 }));
assert.deepEqual(freezeDelta.map(row => row.path).sort(),
  ['compiler/compiled_declarative_frame_test.mjs', 'src/component_state_runtime.ts']);
const rustRowsV8 = new Map(v8Freeze.source.filter(row => row.path.startsWith('compiler/oxc-spike/')).map(row => [row.path, row]));
const rustRowsV9 = freeze.source.filter(row => row.path.startsWith('compiler/oxc-spike/'));
assert.equal(rustRowsV9.length, 9);
for (const row of rustRowsV9) assert.equal(rustRowsV8.get(row.path)?.sha256, row.sha256,
  `Rust test/build evidence cannot carry across changed input ${row.path}`);

const sourceAudit = async () => {
  const bad = [];
  for (const row of freeze.source) {
    const bytes = await readFile(path.join(root, row.path));
    if (bytes.length !== row.bytes || hash(bytes) !== row.sha256) bad.push(row.path);
  }
  return bad;
};
const before = await sourceAudit();
assert.equal(before.length, 0, `V9 freeze mismatch before gate: ${before.join(', ')}`);
await mkdir(path.join(out, 'logs'), { recursive: true });
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), sourceFreeze: 'source-review-v9.json',
  sourceCount: freeze.source.length, sourceAuditBefore: { status: 'MATCH', count: freeze.source.length },
  sourceAuditAfter: null, freezeDeltaFromV8: freezeDelta,
  carriedForward: { from: 'verification-v8/receipt.json and verification-v8/delivery-continuation-receipt.json',
    rustTest: { status: 'PASS', count: 118, sourceFilesUnchanged: rustRowsV9.length },
    rustBuild: { status: 'PASS', compilerSha256: expectedCompiler },
    reason: 'All nine Rust compiler sources and the accepted debug compiler artifact match V8 exactly. The two V8→V9 changes are Root/runtime and a compiler regression fixture; all75 actual compiler/Vite fixtures, Deno and package phases are rerun because they depend on these changes.' },
  toolchain: { node: process.execPath, version: process.version, nodePathFirst: nodePin,
    cargoHome: env.CARGO_HOME, cargoBuildJobs: env.CARGO_BUILD_JOBS, ci: env.CI },
  compiler: { debugPath: compiler, expectedSha256: expectedCompiler, initialSha256: await compilerHash(),
    packageReleaseSha256: null }, steps: [], fixtureFiles };
const save = () => writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
await save();

async function run(name, command, args, timeoutMs = 900_000) {
  const startedAt = new Date().toISOString(), start = performance.now();
  const logPath = path.join(out, 'logs', `${name}.log`);
  const log = createWriteStream(logPath, { flags: 'wx' });
  const hashBefore = await compilerHash();
  const child = spawn(command, args, { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let timeout = false, spawnError = null, interrupted = null;
  child.stdout.on('data', bytes => log.write(bytes)); child.stderr.on('data', bytes => log.write(bytes));
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, timeoutMs);
  const onSignal = signal => { interrupted = signal; try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
  process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal);
  const result = await new Promise(resolve => {
    child.once('error', error => { spawnError = String(error); resolve({ code: null, signal: null }); });
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  await new Promise(resolve => log.end(resolve));
  const hashAfter = await compilerHash();
  const status = timeout ? 'TIMEOUT' : interrupted ? 'INTERRUPTED'
    : spawnError || result.code !== 0 || result.signal ? 'FAIL' : 'PASS';
  const step = { name, status, command: [command, ...args], startedAt,
    durationMs: Math.round(performance.now() - start), timeoutMs,
    exitCode: result.code, signal: result.signal, spawnError,
    compilerSha256Before: hashBefore, compilerSha256After: hashAfter, log: `logs/${name}.log` };
  receipt.steps.push(step); await save();
  process.stdout.write(`${name}: ${status} exit=${result.code}\n`);
  return step;
}

const specs = [
  { name: 'deno-full', command: 'deno', args: ['test', '--config', 'deno.browser.json', '--frozen',
    '--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock', 'src'], timeoutMs: 900_000 },
  { name: 'native-tooling', command: 'pnpm', args: ['check:native-tooling'], timeoutMs: 300_000 },
  { name: 'package-build', command: 'pnpm', args: ['package:r3act'], timeoutMs: 900_000 },
];
for (const spec of specs) await run(spec.name, spec.command, spec.args, spec.timeoutMs);

let packageReady = receipt.steps.find(step => step.name === 'package-build')?.status === 'PASS';
if (packageReady) {
  const reportPath = path.join(root, '.cache/r3act-package-build/report.json');
  const reportBytes = await readFile(reportPath), report = JSON.parse(reportBytes);
  receipt.compiler.packageReleaseSha256 = report.compilerBinary.sha256;
  receipt.packageReport = { path: reportPath, sha256: hash(reportBytes), compilerBinary: report.compilerBinary };
  const v9Map = new Map(freeze.source.map(row => [row.path, row]));
  receipt.compiler.packageRustSourceChecks = report.compilerBinary.rustSource.files.map(row => ({
    path: row.path, reportSha256: row.sha256, freezeSha256: v9Map.get(row.path)?.sha256,
    matches: row.sha256 === v9Map.get(row.path)?.sha256 }));
  assert.ok(receipt.compiler.packageRustSourceChecks.every(row => row.matches),
    'package release compiler Rust source manifest differs from V9 freeze');
  assert.equal(await compilerHash(), expectedCompiler, 'package build changed the accepted debug compiler');
  await save();
  await run('package-consumer', 'pnpm', ['check:r3act-packages']);
  packageReady = receipt.steps.find(step => step.name === 'package-consumer')?.status === 'PASS'
    && await compilerHash() === expectedCompiler;
} else {
  receipt.steps.push({ name: 'package-consumer', status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-build'] });
}

if (packageReady) {
  const priorCompilerGate = JSON.parse(await readFile(path.join(root,
    'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
  for (let index = 0; index < fixtureFiles.length; index++) {
    const file = fixtureFiles[index];
    const old = priorCompilerGate.steps.find(step => /^compiled-\d+$/.test(step.name)
      && step.command?.at(-1) === file);
    const gc = old?.command?.includes('--expose-gc') || /(?:collection_owner_retention|compact_scalar_output|owned_scalar_capture|owned_frame_transaction|store_batch_execution)_test\.mjs$/.test(file);
    const step = await run(`fixture-${String(index + 1).padStart(2, '0')}`, process.execPath,
      ['--experimental-transform-types', ...(gc ? ['--expose-gc'] : []), file], 300_000);
    receipt.steps.at(-1).file = file;
    if (step.status !== 'PASS') process.stdout.write(`fixture failure preserved: ${file}\n`);
  }
} else {
  for (let index = 0; index < fixtureFiles.length; index++) receipt.steps.push({
    name: `fixture-${String(index + 1).padStart(2, '0')}`, file: fixtureFiles[index], status: 'SKIPPED_DEPENDENCY_FAILED' });
}

receipt.compiler.finalDebugSha256 = await compilerHash();
const after = await sourceAudit();
receipt.sourceAuditAfter = after.length ? { status: 'MISMATCH', paths: after }
  : { status: 'MATCH', count: freeze.source.length };
receipt.finishedAt = new Date().toISOString();
receipt.status = receipt.steps.every(step => step.status === 'PASS')
  && receipt.compiler.finalDebugSha256 === expectedCompiler && after.length === 0 ? 'PASS' : 'FAIL';
await save();
process.stdout.write(`V9 consolidated gate ${receipt.status}; source ${receipt.sourceAuditAfter.status}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
