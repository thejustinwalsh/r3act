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
const prior = JSON.parse(await readFile(path.join(unit, 'verification-v7/receipt.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const priorCompilerHash = prior.compilerBinary.expectedBuiltSha256;
const v7freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v7.json'), 'utf8'));
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V8');
assert.equal(freeze.source.length, 873);
assert.equal(v7freeze.source.length, freeze.source.length);
const oldRows = new Map(v7freeze.source.map(row => [row.path, row]));
const freezeDelta = freeze.source.filter(row => oldRows.get(row.path)?.sha256 !== row.sha256)
  .map(row => ({ path: row.path, previousSha256: oldRows.get(row.path)?.sha256, sha256: row.sha256 }));
assert.deepEqual(freezeDelta.map(row => row.path), ['compiler/oxc-spike/src/main.rs']);
const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const env = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
await mkdir(path.join(out, 'logs'), { recursive: true });
const mismatches = async () => {
  const bad = [];
  for (const row of freeze.source) {
    const bytes = await readFile(path.join(root, row.path));
    if (bytes.length !== row.bytes || hash(bytes) !== row.sha256) bad.push(row.path);
  }
  return bad;
};
const compilerHash = async () => hash(await readFile(compiler));
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), freeze: 'source-review-v8.json',
  sourceCount: freeze.source.length, sourceAuditBefore: null, sourceAuditAfter: null,
  freezeDeltaFromV7: freezeDelta,
  carriedForwardFromV7: {
    receipt: 'verification-v7/receipt.json',
    reason: 'V8 freeze differs from V7 only in the reviewed Rust test assertion in main.rs; successful Deno, native tooling, package, and 75 compiled/Vite fixture inputs are otherwise unchanged.',
    sourceAndPackageBasis: 'The V7 all-873 source audit matched before/after; V7 package build/consumer and all75 compiled fixtures passed.',
    v7CompilerSha256: priorCompilerHash,
    phases: prior.steps.filter(step => ['deno-full', 'native-tooling', 'package-build', 'package-consumer'].includes(step.name)
      || /^fixture-\d+$/.test(step.name)).map(step => ({ name: step.name, status: step.status, command: step.command,
        durationMs: step.durationMs, log: step.log, compilerSha256Before: step.compilerSha256Before,
        compilerSha256After: step.compilerSha256After })),
  },
  toolchain: { node: process.execPath, version: process.version, nodePathFirst: nodePin,
    cargoHome: env.CARGO_HOME, cargoBuildJobs: env.CARGO_BUILD_JOBS, ci: env.CI },
  compiler: { path: compiler, expectedV7Sha256: priorCompilerHash, initialSha256: await compilerHash() },
  steps: [] };
const save = () => writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
const before = await mismatches();
receipt.sourceAuditBefore = before.length ? { status: 'MISMATCH', paths: before } : { status: 'MATCH', count: freeze.source.length };
await save();
assert.equal(before.length, 0, `V8 freeze mismatch: ${before.join(', ')}`);

async function run(name) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const logPath = path.join(out, 'logs', `${name}.log`);
  const log = createWriteStream(logPath, { flags: 'wx' });
  const child = spawn('cargo', name === 'cargo-test'
    ? ['test', '--locked', '--manifest-path', 'compiler/oxc-spike/Cargo.toml']
    : ['build', '--locked', '--manifest-path', 'compiler/oxc-spike/Cargo.toml'],
  { cwd: root, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let timeout = false, spawnError = null, interrupted = null;
  child.stdout.on('data', bytes => log.write(bytes)); child.stderr.on('data', bytes => log.write(bytes));
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, 900_000);
  const onSignal = signal => { interrupted = signal; try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
  process.once('SIGINT', onSignal); process.once('SIGTERM', onSignal);
  const result = await new Promise(resolve => {
    child.once('error', error => { spawnError = String(error); resolve({ code: null, signal: null }); });
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal);
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  await new Promise(resolve => log.end(resolve));
  const step = { name, status: timeout ? 'TIMEOUT' : interrupted ? 'INTERRUPTED'
    : spawnError || result.code !== 0 || result.signal ? 'FAIL' : 'PASS',
    command: ['cargo', ...(name === 'cargo-test' ? ['test'] : ['build']), '--locked', '--manifest-path', 'compiler/oxc-spike/Cargo.toml'],
    startedAt, durationMs: Math.round(performance.now() - start), timeoutMs: 900_000,
    exitCode: result.code, signal: result.signal, spawnError, log: `logs/${name}.log` };
  receipt.steps.push(step); await save();
  process.stdout.write(`${name}: ${step.status} exit=${result.code}\n`);
  return step;
}

await run('cargo-test');
await run('cargo-build');
receipt.compiler.finalSha256 = await compilerHash();
receipt.compiler.matchesV7 = receipt.compiler.finalSha256 === priorCompilerHash;
const after = await mismatches();
receipt.sourceAuditAfter = after.length ? { status: 'MISMATCH', paths: after }
  : { status: 'MATCH', count: freeze.source.length };
receipt.finishedAt = new Date().toISOString();
receipt.status = receipt.steps.every(step => step.status === 'PASS') && receipt.compiler.matchesV7
  && after.length === 0 ? 'PASS' : 'FAIL';
await save();
process.stdout.write(`V8 Rust successor ${receipt.status}; compiler hash ${receipt.compiler.matchesV7 ? 'matches' : 'DIFFERS'} V7\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
