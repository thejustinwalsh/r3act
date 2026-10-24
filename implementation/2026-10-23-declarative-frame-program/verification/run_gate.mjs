import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const unit = path.join(root, 'implementation/2026-10-23-declarative-frame-program');
const out = path.join(unit, 'verification');
const freeze = JSON.parse(await readFile(path.join(unit, 'source-review-v1.json'), 'utf8'));
assert.equal(freeze.status, 'PRIMARY_REVIEWED_DECLARATIVE_FRAME_SOURCE_V1');
assert.equal(freeze.source.length, 872);
const hash = b => createHash('sha256').update(b).digest('hex');
const checkFreeze = async () => {
  const bad = [];
  for (const file of freeze.source) {
    const bytes = await readFile(path.join(root, file.path));
    if (bytes.length !== file.bytes || hash(bytes) !== file.sha256) bad.push(file.path);
  }
  return bad;
};
assert.deepEqual(await checkFreeze(), [], 'source freeze mismatch before gate');
await mkdir(path.join(out, 'logs'), { recursive: true });

const nodePin = '/Users/mini/.local/share/mise/installs/node/24.18.0/bin';
const environment = { ...process.env, CI: 'true', PATH: `${nodePin}:/Users/mini/.cargo/bin:${process.env.PATH}`,
  CARGO_HOME: path.join(root, '.cache/cargo'), CARGO_BUILD_JOBS: '1' };
const compiler = path.join(root, 'compiler/oxc-spike/target/debug/ui-graph-compiler-spike');
const receipt = { status: 'RUNNING', startedAt: new Date().toISOString(), sourceFreeze: 'source-review-v1.json',
  sourceCount: freeze.source.length, sourceAuditBefore: 'MATCH', toolchain: { node: process.execPath,
    nodeVersion: process.version, nodePathFirst: nodePin, cargoHome: environment.CARGO_HOME,
    cargoBuildJobs: environment.CARGO_BUILD_JOBS, ci: environment.CI }, steps: [] };
assert.equal(process.version, 'v24.18.0');
const save = () => writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
await save();

const prior = JSON.parse(await readFile(path.join(root,
  'implementation/2026-10-23-mounted-frame-execution/verification/darwin-v3/receipt.json'), 'utf8'));
const priorCompiled = prior.steps.filter(s => /^compiled-\d+$/.test(s.name)).map(s => s.command.slice(2));
assert.equal(priorCompiled.length, 63, 'full prior compiled fixture inventory required');
const addedCompiled = ['compiler/compiled_declarative_frame_test.mjs'];
const priorFixtureNames = prior.steps.filter(s => ['artifact-conformance', 'hmr-revision-plugin',
  'react-composition-plugin', 'runtime-origin-plugin', 'react-island-compiled-source',
  'radix-dialog-compiled-source', 'compiled-collection-gc'].includes(s.name)).map(s => s.command.at(-1));
const pluginFixtures = [...new Set([...priorFixtureNames, 'compiler/vite_native_module_test.mjs',
  'compiler/vite_native_plugin_test.mjs', 'compiler/vite_native_derived_local_test.mjs',
  'compiler/vite_native_package_dev_resolution_test.mjs'])].sort();
const artifactFixtures = prior.steps.filter(s => s.name === 'artifact-conformance').map(s => s.command.at(-1));
const fixtureSpecs = [...new Set([...priorCompiled.map(args => args.at(-1)), ...addedCompiled,
  ...artifactFixtures, ...pluginFixtures])];

const specs = [
  { name: 'deno-full', command: 'deno', args: ['test', '--config', 'deno.browser.json', '--frozen',
    '--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock', 'src'], timeoutMs: 900_000 },
  { name: 'cargo-test', command: 'cargo', args: ['test', '--locked', '--manifest-path',
    'compiler/oxc-spike/Cargo.toml'], timeoutMs: 900_000 },
  { name: 'cargo-build', command: 'cargo', args: ['build', '--locked', '--manifest-path',
    'compiler/oxc-spike/Cargo.toml'], timeoutMs: 900_000 },
  { name: 'native-tooling', command: 'pnpm', args: ['check:native-tooling'], timeoutMs: 300_000 },
  ...fixtureSpecs.map((file, i) => {
    const old = prior.steps.find(s => /^compiled-\d+$/.test(s.name) && s.command.at(-1) === file);
    const gc = old?.command.includes('--expose-gc') || /(?:collection_owner_retention|compact_scalar_output|owned_scalar_capture|owned_frame_transaction|store_batch_execution)_test\.mjs$/.test(file);
    return { name: `${file.includes('compiled_') ? 'compiled' : 'fixture'}-${String(i + 1).padStart(2, '0')}`,
      command: process.execPath, args: ['--experimental-transform-types', ...(gc ? ['--expose-gc'] : []), file], timeoutMs: 300_000 };
  }),
  { name: 'package-build', command: 'pnpm', args: ['package:r3act'], timeoutMs: 900_000 },
  { name: 'package-consumer', command: 'pnpm', args: ['check:r3act-packages'], timeoutMs: 900_000, depends: ['package-build'] },
];
let compilerSha = null;
for (const spec of specs) {
  if (spec.depends?.some(n => receipt.steps.find(s => s.name === n)?.status !== 'PASS')) {
    receipt.steps.push({ name: spec.name, status: 'SKIPPED_DEPENDENCY_FAILED', depends: spec.depends });
    await save(); continue;
  }
  const logPath = path.join(out, 'logs', `${spec.name}.log`);
  const log = createWriteStream(logPath, { flags: 'wx' });
  const startedAt = new Date().toISOString(), start = performance.now();
  const child = spawn(spec.command, spec.args, { cwd: root, env: environment, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => log.write(b)); child.stderr.on('data', b => log.write(b));
  let timeout = false;
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, spec.timeoutMs);
  const result = await new Promise((resolve, reject) => {
    child.once('error', reject); child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') throw e; }
  await new Promise(resolve => log.end(resolve));
  const status = timeout ? 'TIMEOUT' : result.code === 0 && !result.signal ? 'PASS' : 'FAIL';
  const step = { name: spec.name, status, command: [spec.command, ...spec.args], startedAt,
    durationMs: Math.round(performance.now() - start), timeoutMs: spec.timeoutMs, exitCode: result.code,
    signal: result.signal, log: `logs/${spec.name}.log` };
  if (spec.name === 'cargo-build' && status === 'PASS') {
    compilerSha = hash(await readFile(compiler)); step.compilerSha256 = compilerSha;
  }
  if (spec.name.startsWith('compiled-') || spec.name.startsWith('compiler-')) {
    step.debugCompilerSha256Before = compilerSha;
    const now = hash(await readFile(compiler)); step.debugCompilerSha256After = now;
    if (compilerSha !== now && status === 'PASS') step.status = 'FAIL_COMPILER_CHANGED';
  }
  receipt.steps.push(step); await save(); process.stdout.write(`${step.name}: ${step.status} exit=${step.exitCode}\n`);
}
const bad = await checkFreeze();
receipt.sourceAuditAfter = bad.length ? { status: 'MISMATCH', paths: bad } : { status: 'MATCH', count: freeze.source.length };
receipt.fixtureCount = fixtureSpecs.length;
receipt.fixtureFiles = fixtureSpecs;
receipt.finishedAt = new Date().toISOString();
receipt.status = bad.length === 0 && receipt.steps.length === specs.length && receipt.steps.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';
await save(); process.stdout.write(`Declarative frame gate ${receipt.status}\n`);
if (receipt.status !== 'PASS') process.exitCode = 1;
