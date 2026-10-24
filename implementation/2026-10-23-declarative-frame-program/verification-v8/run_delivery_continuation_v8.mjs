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
const out = path.join(unit, 'verification-v8');
const freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v8.json'), 'utf8'));
const priorGate = JSON.parse(await readFile(path.join(unit, 'verification-v7/receipt.json'), 'utf8'));
const priorAttempt = JSON.parse(await readFile(path.join(out, 'delivery-receipt.json'), 'utf8'));
const priorCompilerGate = JSON.parse(await readFile(path.join(root,
  'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
const expectedDebugSha = '23328faf507e3dc254b79fa4b0a46a0b449fa7981bc1e8b7b04c5b5867508624';
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const reportPath = path.join(root, '.cache/r3act-package-build/report.json');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compilerHash = async () => hash(await readFile(compiler));
const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const env = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V8');
assert.equal(freeze.source.length, 873);
assert.equal(priorAttempt.steps.find(step => step.name === 'package-build')?.status, 'PASS');
assert.equal(await compilerHash(), expectedDebugSha, 'debug compiler changed since the V8 delivery attempt');
const freezeMap = new Map(freeze.source.map(row => [row.path, row]));
const rustSourceChecks = [];
for (const row of report.compilerBinary.rustSource.files) {
  const expected = freezeMap.get(row.path);
  assert.ok(expected, `Package compiler source is outside the frozen V8 source set: ${row.path}`);
  const bytes = await readFile(path.join(root, row.path));
  rustSourceChecks.push({ path: row.path, reportSha256: row.sha256, actualSha256: hash(bytes),
    freezeSha256: expected.sha256, matches: row.sha256 === hash(bytes) && row.sha256 === expected.sha256 });
  assert.equal(row.sha256, hash(bytes), `Package compiler source mismatch: ${row.path}`);
  assert.equal(row.sha256, expected.sha256, `Package compiler source does not match V8 freeze: ${row.path}`);
}
assert.equal(rustSourceChecks.length, 9);
const mismatches = async () => {
  const bad = [];
  for (const row of freeze.source) {
    const bytes = await readFile(path.join(root, row.path));
    if (bytes.length !== row.bytes || hash(bytes) !== row.sha256) bad.push(row.path);
  }
  return bad;
};
const before = await mismatches();
assert.equal(before.length, 0, `V8 source mismatch: ${before.join(', ')}`);
const priorDeno = priorGate.steps.find(step => step.name === 'deno-full');
const priorTooling = priorGate.steps.find(step => step.name === 'native-tooling');
assert.equal(priorDeno?.status, 'PASS'); assert.equal(priorTooling?.status, 'PASS');
assert.equal(priorGate.sourceAuditAfter.status, 'MATCH');
const v7Fixtures = priorGate.fixtureFiles;
assert.equal(v7Fixtures.length, 75);
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), sourceFreeze: 'source-review-v8.json',
  sourceCount: freeze.source.length,
  sourceAuditBefore: { status: 'MATCH', count: freeze.source.length }, sourceAuditAfter: null,
  preservedPriorAttempt: { receipt: 'delivery-receipt.json', status: priorAttempt.status,
    reason: 'The prior oracle incorrectly compared the debug executable hash with the package report’s separately-built release executable hash. Package build itself passed; no product failure occurred.' },
  carryForward: { from: 'verification-v7/receipt.json', reason: 'V8 differs from V7 only in the reviewed Rust test literal. V8 locked Rust tests passed118/118. Carry Deno and native tooling by unchanged source basis; all compiler fixtures are rerun here.',
    deno: { status: priorDeno.status, command: priorDeno.command, log: priorDeno.log },
    nativeTooling: { status: priorTooling.status, command: priorTooling.command, log: priorTooling.log } },
  toolchain: { node: process.execPath, version: process.version, nodePathFirst: nodePin,
    cargoHome: env.CARGO_HOME, cargoBuildJobs: env.CARGO_BUILD_JOBS, ci: env.CI },
  compiler: { debugPath: compiler, debugSha256: expectedDebugSha,
    packageReleaseSha256: report.compilerBinary.sha256,
    packageReport: { path: reportPath, sha256: hash(await readFile(reportPath)) },
    rustSourceChecks },
  steps: [], fixtureFiles: v7Fixtures };
const save = () => writeFile(path.join(out, 'delivery-continuation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
await mkdir(path.join(out, 'logs'), { recursive: true });
await save();

async function run(name, command, args, timeoutMs = 900_000) {
  const startedAt = new Date().toISOString(), start = performance.now();
  const logPath = path.join(out, 'logs', `continuation-${name}.log`);
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
    durationMs: Math.round(performance.now() - start), timeoutMs, exitCode: result.code,
    signal: result.signal, spawnError, compilerSha256Before: hashBefore, compilerSha256After: hashAfter,
    log: `logs/continuation-${name}.log` };
  receipt.steps.push(step); await save();
  process.stdout.write(`${name}: ${status} exit=${result.code}\n`);
  return step;
}

await run('package-consumer', 'pnpm', ['check:r3act-packages']);
if (receipt.steps.at(-1).status === 'PASS' && await compilerHash() === expectedDebugSha) {
  for (let index = 0; index < v7Fixtures.length; index++) {
    const file = v7Fixtures[index];
    const old = priorCompilerGate.steps.find(step => /^compiled-\d+$/.test(step.name)
      && step.command?.at(-1) === file);
    const gc = old?.command?.includes('--expose-gc') || /(?:collection_owner_retention|compact_scalar_output|owned_scalar_capture|owned_frame_transaction|store_batch_execution)_test\.mjs$/.test(file);
    const result = await run(`fixture-${String(index + 1).padStart(2, '0')}`, process.execPath,
      ['--experimental-transform-types', ...(gc ? ['--expose-gc'] : []), file], 300_000);
    receipt.steps.at(-1).file = file;
    if (result.status !== 'PASS') process.stdout.write(`fixture failed: ${file}\n`);
  }
} else {
  for (let index = 0; index < v7Fixtures.length; index++) receipt.steps.push({
    name: `fixture-${String(index + 1).padStart(2, '0')}`, file: v7Fixtures[index],
    status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-consumer', 'stable-debug-compiler'] });
}
receipt.compiler.finalDebugSha256 = await compilerHash();
const after = await mismatches();
receipt.sourceAuditAfter = after.length ? { status: 'MISMATCH', paths: after }
  : { status: 'MATCH', count: freeze.source.length };
receipt.finishedAt = new Date().toISOString();
receipt.status = receipt.steps.every(step => step.status === 'PASS')
  && receipt.compiler.finalDebugSha256 === expectedDebugSha && after.length === 0 ? 'PASS' : 'FAIL';
await save();
process.stdout.write(`V8 delivery continuation ${receipt.status}; debug compiler ${receipt.compiler.finalDebugSha256 === expectedDebugSha ? 'MATCH' : 'MISMATCH'}; source ${receipt.sourceAuditAfter.status}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
