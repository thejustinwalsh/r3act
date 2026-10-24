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
const v7 = JSON.parse(await readFile(path.join(unit, 'verification-v7/receipt.json'), 'utf8'));
const priorCompilerGate = JSON.parse(await readFile(path.join(root,
  'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
const expectedCompilerSha = '23328faf507e3dc254b79fa4b0a46a0b449fa7981bc1e8b7b04c5b5867508624';
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compilerHash = async () => hash(await readFile(compiler));
const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const env = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V8');
assert.equal(freeze.source.length, 873);
assert.equal((await compilerHash()), expectedCompilerSha, 'V8 compiler artifact changed before delivery verification');
await mkdir(path.join(out, 'logs'), { recursive: true });
const mismatches = async () => {
  const bad = [];
  for (const row of freeze.source) {
    const bytes = await readFile(path.join(root, row.path));
    if (bytes.length !== row.bytes || hash(bytes) !== row.sha256) bad.push(row.path);
  }
  return bad;
};
const before = await mismatches();
const priorDeno = v7.steps.find(step => step.name === 'deno-full');
const priorTooling = v7.steps.find(step => step.name === 'native-tooling');
assert.equal(priorDeno?.status, 'PASS'); assert.equal(priorTooling?.status, 'PASS');
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), sourceFreeze: 'source-review-v8.json',
  sourceCount: freeze.source.length,
  sourceAuditBefore: before.length ? { status: 'MISMATCH', paths: before } : { status: 'MATCH', count: freeze.source.length },
  sourceAuditAfter: null,
  carryForward: { from: 'verification-v7/receipt.json', reason: 'The reviewed V7-to-V8 change is limited to one Rust test assertion in compiler/oxc-spike/src/main.rs; Deno runtime/test sources, TypeScript tooling/package inputs, and all75 fixture files are unchanged. V8 Rust tests passed118/118. Deno and native tooling are carried by exact unchanged source manifests and prior passing receipts.',
    deno: { status: priorDeno.status, command: priorDeno.command, log: priorDeno.log, durationMs: priorDeno.durationMs },
    nativeTooling: { status: priorTooling.status, command: priorTooling.command, log: priorTooling.log, durationMs: priorTooling.durationMs } },
  toolchain: { node: process.execPath, version: process.version, nodePathFirst: nodePin,
    cargoHome: env.CARGO_HOME, cargoBuildJobs: env.CARGO_BUILD_JOBS, ci: env.CI },
  compiler: { path: compiler, expectedSha256: expectedCompilerSha, initialSha256: await compilerHash() },
  steps: [], fixtureFiles: v7.fixtureFiles };
const save = () => writeFile(path.join(out, 'delivery-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
await save();
assert.equal(before.length, 0, `V8 source mismatch: ${before.join(', ')}`);

async function run(name, command, args, timeoutMs = 900_000) {
  const startedAt = new Date().toISOString(), start = performance.now();
  const logPath = path.join(out, 'logs', `delivery-${name}.log`);
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
    log: `logs/delivery-${name}.log` };
  receipt.steps.push(step); await save();
  process.stdout.write(`${name}: ${status} exit=${result.code}\n`);
  return step;
}

await run('package-build', 'pnpm', ['package:r3act']);
if (receipt.steps.at(-1).status === 'PASS') {
  const reportPath = path.join(root, '.cache/r3act-package-build/report.json');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  receipt.packageReport = { path: reportPath, sha256: hash(await readFile(reportPath)),
    compilerBinary: report.compilerBinary };
  const reportMatches = report.compilerBinary.sha256 === expectedCompilerSha;
  const binaryMatches = await compilerHash() === expectedCompilerSha;
  receipt.steps.push({ name: 'package-artifact-check', status: reportMatches && binaryMatches ? 'PASS' : 'FAIL',
    expectedSha256: expectedCompilerSha, reportSha256: report.compilerBinary.sha256,
    actualSha256: await compilerHash() });
  await save();
  if (reportMatches && binaryMatches) await run('package-consumer', 'pnpm', ['check:r3act-packages']);
  else receipt.steps.push({ name: 'package-consumer', status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-artifact-check'] });
} else {
  receipt.steps.push({ name: 'package-artifact-check', status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-build'] });
  receipt.steps.push({ name: 'package-consumer', status: 'SKIPPED_DEPENDENCY_FAILED', depends: ['package-build'] });
  for (const [index, file] of receipt.fixtureFiles.entries()) receipt.steps.push({ name: `fixture-${String(index + 1).padStart(2, '0')}`, file, status: 'SKIPPED_DEPENDENCY_FAILED' });
}

if (receipt.steps.find(step => step.name === 'package-build')?.status === 'PASS'
  && receipt.steps.find(step => step.name === 'package-artifact-check')?.status === 'PASS'
  && receipt.steps.find(step => step.name === 'package-consumer')?.status === 'PASS'
  && receipt.packageReport?.compilerBinary.sha256 === expectedCompilerSha
  && await compilerHash() === expectedCompilerSha) {
  for (let index = 0; index < receipt.fixtureFiles.length; index++) {
    const file = receipt.fixtureFiles[index];
    const old = priorCompilerGate.steps.find(step => /^compiled-\d+$/.test(step.name)
      && step.command?.at(-1) === file);
    const gc = old?.command?.includes('--expose-gc') || /(?:collection_owner_retention|compact_scalar_output|owned_scalar_capture|owned_frame_transaction|store_batch_execution)_test\.mjs$/.test(file);
    const result = await run(`fixture-${String(index + 1).padStart(2, '0')}`, process.execPath,
      ['--experimental-transform-types', ...(gc ? ['--expose-gc'] : []), file], 300_000);
    receipt.steps.at(-1).file = file;
    if (result.status !== 'PASS') process.stdout.write(`fixture failed: ${file}\n`);
  }
} else if (!receipt.steps.some(step => step.name.startsWith('fixture-'))) {
  for (let index = 0; index < receipt.fixtureFiles.length; index++) receipt.steps.push({
    name: `fixture-${String(index + 1).padStart(2, '0')}`, file: receipt.fixtureFiles[index], status: 'SKIPPED_DEPENDENCY_FAILED' });
}

receipt.compiler.finalSha256 = await compilerHash();
const after = await mismatches();
receipt.sourceAuditAfter = after.length ? { status: 'MISMATCH', paths: after }
  : { status: 'MATCH', count: freeze.source.length };
receipt.finishedAt = new Date().toISOString();
receipt.status = receipt.steps.every(step => step.status === 'PASS')
  && receipt.compiler.finalSha256 === expectedCompilerSha && after.length === 0 ? 'PASS' : 'FAIL';
await save();
process.stdout.write(`V8 delivery ${receipt.status}; compiler ${receipt.compiler.finalSha256 === expectedCompilerSha ? 'MATCH' : 'MISMATCH'}; source ${receipt.sourceAuditAfter.status}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
