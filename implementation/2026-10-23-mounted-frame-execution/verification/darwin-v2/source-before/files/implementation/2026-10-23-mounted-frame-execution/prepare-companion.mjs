import assert from 'node:assert/strict';
import { copyFile, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const unit = path.dirname(fileURLToPath(import.meta.url)), proof = path.resolve(process.argv[2]);
assert.equal(path.dirname(proof), unit);
const lock = JSON.parse(await readFile(path.join(proof, 'input-lock.json'), 'utf8'));
const out = path.join(proof, 'game-companion'), target = path.join(lock.consumer, 'companion');
await mkdir(out); await mkdir(target);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sources = [];
for (const name of await readdir(path.join(unit, 'companion'))) {
  const source = path.join(unit, 'companion', name), destination = path.join(target, name);
  await copyFile(source, destination, 1);
  const bytes = await readFile(source), staged = await readFile(destination);
  assert.equal(sha(bytes), sha(staged));
  const archivePath = path.join(out, 'inputs', name);
  await mkdir(path.dirname(archivePath), { recursive: true }); await copyFile(source, archivePath, 1);
  sources.push({ path: source, stagedPath: destination, archivePath, sha256: sha(bytes) });
}
await writeFile(path.join(target, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.json', include: ['*.ts', '*.tsx'] }, null, 2));
const commands = [];
for (const [name, command, args] of [
  ['typecheck', path.join(lock.consumer, 'node_modules/.bin/tsgo'), ['-p', path.join(target, 'tsconfig.json')]],
  ['build', process.execPath, [path.join(target, 'build.mjs'), out]],
]) {
  const child = spawn(command, args, { cwd: lock.consumer, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout = [], stderr = [];
  child.stdout.on('data', value => stdout.push(value)); child.stderr.on('data', value => stderr.push(value));
  let stopped = false;
  const stop = () => { stopped = true; if (child.pid) try { process.kill(-child.pid, 'SIGKILL'); } catch {} };
  const timer = setTimeout(stop, 120000); process.once('SIGINT', stop); process.once('SIGTERM', stop);
  let error = null;
  const code = await new Promise(resolve => { child.once('error', e => { error = String(e); resolve(127); }); child.once('close', code => resolve(code)); });
  clearTimeout(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  await writeFile(path.join(out, `${name}.stdout.log`), Buffer.concat(stdout));
  await writeFile(path.join(out, `${name}.stderr.log`), Buffer.concat(stderr));
  commands.push({ name, command, args, code, stopped, error });
  await writeFile(path.join(out, 'commands.json'), JSON.stringify(commands, null, 2));
  assert.equal(code, 0); assert.equal(stopped, false);
}
const assets = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const source = path.join(dir, item.name);
    if (item.isDirectory()) await walk(source);
    else assets.push({ path: source, urlPath: '/' + path.relative(path.join(out, 'dist'), source).replaceAll(path.sep, '/'),
      sha256: sha(await readFile(source)) });
  }
}
await walk(path.join(out, 'dist'));
const capture = JSON.parse(await readFile(path.join(out, 'capture.json'), 'utf8'));
assert.equal(capture.status, 'PASS');
await writeFile(path.join(out, 'build-proof.json'), JSON.stringify({ status: 'PASS_MOUNTED_GAME_BUILD',
  sources, assets, capture, denseInputLockSha256: sha(await readFile(path.join(proof, 'input-lock.json'))), commands,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS_MOUNTED_GAME_BUILD', out }));
