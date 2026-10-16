import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.version,'v24.18.0','Snapshot preparation requires pinned Node v24.18.0');
const root = path.resolve(here, '../../..');
const work = path.resolve(here, '..');
const snapshot = path.join(work, 'snapshot');
for(const target of [snapshot,path.join(work,'source-manifest.json')]){
  try{await access(target);throw new Error(`Refusing to replace existing diagnostic attempt: ${target}`)}
  catch(error){if(error?.code!=='ENOENT')throw error}
}
const archive = 'implementation/2026-10-13-derived-array-eligibility/source-and-verification.tar.gz';
const lockPath = 'results/current-owner-kernel-headless-v1/source-build-locks.json';
const frozenPath = 'results/current-owner-kernel-headless-v1/frozen-config.json';
const sha = b => createHash('sha256').update(b).digest('hex');
const json = x => JSON.stringify(x, null, 2) + '\n';
const frozen = JSON.parse(await readFile(path.join(root, frozenPath)));
const locks = JSON.parse(await readFile(path.join(root, lockPath)));
assert.equal(sha(await readFile(path.join(root, archive))), frozen.candidate.sourceArchiveSha256);
assert.equal(sha(await readFile(path.join(root, '.cache/current-owner-kernel-headless-20261013-v1/source-build-locks.json'))), frozen.candidate.sourceBuildLockSha256);
const list = execFileSync('tar', ['-tzf', path.join(root, archive)], {encoding:'utf8'}).trim().split('\n');
for (const name of list) assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'), `unsafe archive member ${name}`);
const verbose = execFileSync('tar', ['-tvzf', path.join(root, archive)], {encoding:'utf8'}).trim().split('\n');
assert.equal(verbose.length,list.length);
for (const line of verbose) assert.ok(line[0]==='-'||line[0]==='d',`archive contains link or special file: ${line}`);
await mkdir(snapshot, {recursive:true});
const members = list.filter(x => x.startsWith('src/') || x.startsWith('compiler/') || ['package.json','pnpm-lock.yaml','deno.lock'].includes(x));
execFileSync('tar', ['-xzf', path.join(root, archive), '-C', snapshot, ...members], {timeout:30_000});
const stage = '.cache/high-frequency-harness-stage';
await cp(path.join(root, stage), path.join(snapshot, stage), {recursive:true, force:false, errorOnExist:true});
const originals = {};
const archivedNames = new Set(members);
const copiedNames = Object.keys(locks).filter(name=>archivedNames.has(name)||name.startsWith(stage+'/'));
for (const name of copiedNames) {
  const bytes = await readFile(path.join(snapshot,name));
  const expected = locks[name];
  assert.equal(sha(bytes), expected, `archived input differs from frozen lock: ${name}`);
  originals[name] = expected;
}
const patches = [
  ['src/component_state_runtime.ts', 'native-root'],
  ['src/vdom_snapshot_runtime.ts', 'native-vdom'],
  [`${stage}/src/browser/high_frequency_harness.ts`, 'harness'],
  [`${stage}/src/browser/native_high_frequency_arm.tsx`, 'native-arm'],
  [`${stage}/src/browser/react_high_frequency_arm.tsx`, 'react-arm'],
  [`${stage}/vite.config.ts`, 'vite'],
];
for (const [name, patchName] of patches) {
  let source = await readFile(path.join(snapshot,name),'utf8');
  const operations = JSON.parse(await readFile(path.join(here,'patches',patchName+'.json'),'utf8'));
  for (const {find,replace,expectedOccurrences = 1} of operations) {
    assert.equal(source.split(find).length - 1,expectedOccurrences, `anchor count mismatch: ${patchName} ${find.slice(0,80)}`);
    source = source.replace(find,replace);
  }
  await writeFile(path.join(snapshot,name),source);
}
const after = {};
for (const name of Object.keys(originals)) after[name] = sha(await readFile(path.join(snapshot,name)));
const patchHashes = Object.fromEntries(await Promise.all(patches.map(async([,name])=>[name,sha(await readFile(path.join(here,'patches',name+'.json')))])));
await writeFile(path.join(work,'source-manifest.json'),json({schemaVersion:'dense-ledger-source-manifest-v1',baselineStudy:frozen.studyId,preparedWithNode:process.version,archive:{path:archive,sha256:frozen.candidate.sourceArchiveSha256},frozenLock:{path:lockPath,sha256:sha(await readFile(path.join(root,lockPath)))},originals,after,patches,patchHashes}));
console.log(`Prepared diagnostic snapshot: ${snapshot}`);
