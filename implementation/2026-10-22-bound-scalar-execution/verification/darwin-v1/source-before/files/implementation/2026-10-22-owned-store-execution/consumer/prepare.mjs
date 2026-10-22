import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.version, 'v24.18.0');
const unit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(unit, '../..');
const args = process.argv.slice(2);
assert.deepEqual(args.slice(0, 1), ['--proof-dir']);
const proof = path.resolve(args[1] ?? '');
assert.equal(args.length, 2);
assert.equal(path.dirname(proof), unit);
assert.match(path.basename(proof), /^proof-canvas-v[1-9]\d*$/);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const hash = async file => sha(await readFile(file));
async function files(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await files(file));
    else if (entry.isFile()) found.push(file);
    else if (entry.isSymbolicLink()) continue;
    else throw new Error(`Unsupported installed entry: ${file}`);
  }
  return found.sort();
}
async function copy(source, target) {
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target, 1);
  assert.equal(await hash(source), await hash(target));
  return { path: source, archivePath: target, sha256: await hash(source), bytes: (await stat(source)).size };
}
async function run(name, command, argv, cwd) {
  const child = spawn(command, argv, { cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = [], err = [];
  child.stdout.on('data', chunk => out.push(chunk)); child.stderr.on('data', chunk => err.push(chunk));
  let stopped = null, spawnError = null;
  const kill = reason => {
    stopped ??= reason;
    if (child.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  };
  const interrupt = () => kill('signal');
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  const timer = setTimeout(() => kill('deadline'), 180_000);
  let hardTimer;
  const exit = await new Promise(resolve => {
    let complete = false;
    const finish = code => { if (!complete) { complete = true; resolve(code); } };
    child.once('close', code => finish(code ?? 1));
    child.once('error', error => { spawnError = String(error); finish(127); });
    hardTimer = setTimeout(() => { kill('post-kill-close-timeout'); finish(124); }, 185_000);
  });
  clearTimeout(timer); clearTimeout(hardTimer);
  process.off('SIGINT', interrupt); process.off('SIGTERM', interrupt);
  const logs = {};
  for (const [stream, chunks] of [['stdout', out], ['stderr', err]]) {
    const file = path.join(proof, `${name}.${stream}.log`), bytes = Buffer.concat(chunks);
    await writeFile(file, bytes, { flag: 'wx' }); logs[stream] = { path: file, sha256: sha(bytes), bytes: bytes.length };
  }
  const result = { command, argv, cwd, exit, stopped, spawnError, logs };
  await writeFile(path.join(proof, `${name}.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  assert.equal(exit, 0, `${name} failed; logs preserved in ${proof}`);
  assert.equal(stopped, null, `${name} was interrupted; logs preserved in ${proof}`);
  return result;
}
await mkdir(proof);
const consumer = await realpath(await mkdtemp(path.join(tmpdir(), 'r3act-r3f-frame-baselines-canvas-')));
const record = { schemaVersion: 'r3f-frame-baselines-canvas-build-v1', status: 'STARTED', proof, consumer,
  node: process.version, inputs: [], staged: [], packageSources: [], rendererSourceBasis: [], tarballs: [], installed: [],
  transforms: {}, assets: {}, captures: {}, processes: {} };
try {
  const reportSource = path.join(root, '.cache/r3act-package-build/report.json');
  const report = JSON.parse(await readFile(reportSource, 'utf8'));
  assert.equal(report.compilerBinary.target, `${process.platform}-${process.arch}`);
  const initial = JSON.parse(await readFile(path.join(unit, 'initial-copy.json'), 'utf8'));
  for (const item of initial.entries) {
    if (['build.mjs', 'prepare.mjs', 'verify.mjs'].includes(path.basename(item.copy))) continue;
    assert.equal(await hash(path.join(root, item.copy)), item.sha256,
      `Copied consumer or renderer source basis drift: ${item.copy}`);
  }
  for (const [relative, expected] of Object.entries(report.sourceHashes)) {
    const source = path.join(root, relative);
    assert.equal(await hash(source), expected, `Package source drift: ${relative}`);
    record.packageSources.push({ path: source, sha256: expected });
  }
  record.report = await copy(reportSource, path.join(proof, 'inputs', 'package-report.json'));
  const r3fBasis = path.join(unit, 'source-basis', 'r3f-v10');
  for (const source of await files(r3fBasis))
    record.rendererSourceBasis.push(await copy(source, path.join(proof, 'inputs', 'r3f-source-basis', path.relative(r3fBasis, source))));
  const consumerSources = await files(path.join(unit, 'consumer'));
  assert.equal(consumerSources.length, 14, 'four-arm consumer requires exactly 14 authored files');
  const packageCopy = initial.entries.find(item => item.copy === 'implementation/2026-10-22-owned-store-execution/consumer/package.json');
  assert.ok(packageCopy);
  assert.equal(await hash(path.join(unit, 'consumer', 'package.json')), packageCopy.sha256,
    'consumer package manifest must retain its copied baseline bytes');
  for (const source of consumerSources) {
    const relative = path.relative(path.join(unit, 'consumer'), source);
    record.inputs.push(await copy(source, path.join(proof, 'inputs', 'consumer', relative)));
    const staged = await copy(source, path.join(consumer, relative));
    if (relative !== 'package.json') record.staged.push(staged);
  }
  const packageNames = ['core', 'vite', 'host-three'];
  const urls = {};
  for (const name of packageNames) {
    const pkg = `@r3act/${name}`, item = report.packages[pkg];
    assert.ok(item?.file && item.sha256);
    const source = path.join(root, item.file);
    assert.equal(await hash(source), item.sha256);
    const archived = await copy(source, path.join(proof, 'inputs', 'tarballs', `${name}.tgz`));
    record.tarballs.push({ ...archived, package: pkg }); urls[pkg] = `file:${archived.archivePath}`;
  }
  const manifestPath = path.join(consumer, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (const [name, url] of Object.entries(urls)) {
    if (name === '@r3act/vite') manifest.devDependencies[name] = url;
    else manifest.dependencies[name] = url;
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(consumer, 'pnpm-workspace.yaml'), `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(urls['@r3act/core'])}\n`);
  record.processes.install = await run('install', 'pnpm', ['install', '--ignore-scripts'], consumer);
  for (const name of ['package.json', 'pnpm-workspace.yaml', 'pnpm-lock.yaml'])
    record.installed.push(await copy(path.join(consumer, name), path.join(proof, 'inputs', 'manifests', name)));
  const packageSet = [...new Set([...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies)])].sort();
  for (const name of packageSet) {
    const installed = await realpath(path.join(consumer, 'node_modules', name));
    assert.ok(installed.startsWith(path.join(consumer, 'node_modules/.pnpm') + path.sep));
  }
  const store = path.join(consumer, 'node_modules/.pnpm');
  for (const source of await files(store)) {
    const relative = path.relative(store, source);
    record.installed.push(await copy(source, path.join(proof, 'inputs', 'installed-store', relative)));
  }
  const binary = path.join(consumer, 'node_modules/@r3act/vite', report.compilerBinary.path);
  assert.equal(await hash(binary), report.compilerBinary.sha256);
  record.compiler = await copy(binary, path.join(proof, 'inputs', 'compiler', path.basename(binary)));
  const lock = { status: 'PASS_R3F_FRAME_BASELINES_CANVAS_PREPARATION', proof, consumer,
    inputs: record.inputs, staged: record.staged, packageSources: record.packageSources,
    rendererSourceBasis: record.rendererSourceBasis, report: record.report,
    tarballs: record.tarballs, installed: record.installed, compiler: record.compiler };
  const lockBytes = JSON.stringify(lock, null, 2) + '\n';
  await writeFile(path.join(proof, 'input-lock.json'), lockBytes, { flag: 'wx' });
  record.inputLockSha256 = sha(lockBytes);
  record.processes.typecheck = await run('typecheck', path.join(consumer, 'node_modules/.bin/tsgo'), ['-p', 'tsconfig.json'], consumer);
  for (const mode of ['native', 'react', 'react-frame', 'imperative']) {
    record.processes[`build-${mode}`] = await run(`build-${mode}`, process.execPath, ['build.mjs', mode, proof], consumer);
    record.captures[mode] = { path: path.join(proof, `capture-${mode}.json`), sha256: await hash(path.join(proof, `capture-${mode}.json`)) };
    record.transforms[mode] = await Promise.all((await files(path.join(proof, 'transforms', mode))).map(async file => ({ path: file, sha256: await hash(file) })));
    record.assets[mode] = await Promise.all((await files(path.join(proof, 'dist', mode))).map(async file => ({
      path: file, urlPath: `/${mode}/${path.relative(path.join(proof, 'dist', mode), file).replaceAll(path.sep, '/')}`,
      sha256: await hash(file), bytes: (await stat(file)).size })));
  }
  record.status = 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD';
} catch (error) { record.errors = [error instanceof Error ? error.stack : String(error)]; }
await writeFile(path.join(proof, 'build-proof.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
if (record.status !== 'PASS_R3F_FRAME_BASELINES_CANVAS_BUILD') process.exitCode = 1;
else console.log(JSON.stringify({ status: record.status, proof }));
