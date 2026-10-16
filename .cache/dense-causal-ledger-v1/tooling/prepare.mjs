import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
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
const extractionArchive = 'implementation/2026-10-13-current-kernel-headless-confirmation/source-build-comparison-and-diagnostics.tar.gz';
const extractionArchiveSha256 = 'a5e71711b280429128e7b1a5c027c90b0edff5a8068c87bad701e75d4b385db7';
const lockPath = 'results/current-owner-kernel-headless-v1/source-build-locks.json';
const frozenPath = 'results/current-owner-kernel-headless-v1/frozen-config.json';
const sha = b => createHash('sha256').update(b).digest('hex');
const json = x => JSON.stringify(x, null, 2) + '\n';
const frozen = JSON.parse(await readFile(path.join(root, frozenPath)));
const locks = JSON.parse(await readFile(path.join(root, lockPath)));
assert.equal(sha(await readFile(path.join(root, archive))), frozen.candidate.sourceArchiveSha256);
assert.equal(sha(await readFile(path.join(root, extractionArchive))), extractionArchiveSha256);
assert.equal(sha(await readFile(path.join(root, '.cache/current-owner-kernel-headless-20261013-v1/source-build-locks.json'))), frozen.candidate.sourceBuildLockSha256);
const list = execFileSync('tar', ['-tzf', path.join(root, extractionArchive)], {encoding:'utf8'}).trim().split('\n');
assert.equal(new Set(list).size,list.length,'duplicate archive member path');
const allowedRoots = new Set(['.cache','compiler','deno.browser.json','deno.lock','implementation','package.json','performance-implementation-plan.md','pnpm-lock.yaml','research.ipynb','results','scripts','src']);
for (const name of list) assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'), `unsafe archive member ${name}`);
for (const name of list) assert.ok(allowedRoots.has(name.split('/')[0]),`unexpected archive root ${name}`);
const verbose = execFileSync('tar', ['-tvzf', path.join(root, extractionArchive)], {encoding:'utf8'}).trim().split('\n');
assert.equal(verbose.length,list.length);
for (const line of verbose) assert.ok(line[0]==='-'||line[0]==='d',`archive contains link or special file: ${line}`);
await mkdir(snapshot, {recursive:true});
const stage = '.cache/high-frequency-harness-stage';
const members = list.filter(x => Object.hasOwn(locks,x) && (x.startsWith('src/') || x.startsWith('compiler/') || x.startsWith(stage+'/') || ['package.json','pnpm-lock.yaml','deno.lock'].includes(x)));
assert.ok(members.includes('compiler/host_jsx_declarations.ts'),'confirmation archive lacks locked host JSX module');
for(const required of ['compiler/vite_native_plugin.ts','compiler/vite_native_module.ts','compiler/oxc-spike/target/debug/ui-graph-compiler-spike',`${stage}/vite.config.ts`,`${stage}/build_proof_plugin.ts`])assert.ok(members.includes(required),`missing locked build import ${required}`);
execFileSync('tar', ['-xzf', path.join(root, extractionArchive), '-C', snapshot, ...members], {timeout:30_000});
const originals = {};
for (const name of members) {
  const bytes = await readFile(path.join(snapshot,name));
  const expected = locks[name];
  assert.equal(sha(bytes), expected, `archived input differs from frozen lock: ${name}`);
  originals[name] = expected;
}
const requiredImports = ['compiler/vite_native_plugin.ts','compiler/vite_native_module.ts','compiler/host_jsx_declarations.ts',`${stage}/vite.config.ts`,`${stage}/build_proof_plugin.ts`];
const importClosure = [];
for(const from of requiredImports){
  const source=await readFile(path.join(snapshot,from),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(|export\s*\*\s*from\s*)["'](\.[^"']+)["']/g)){
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(from),match[1]));
    assert.ok(Object.hasOwn(originals,target),`unlocked/missing relative import ${from} -> ${target}`);
    importClosure.push({from,target,sha256:originals[target]});
  }
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
await writeFile(path.join(work,'source-manifest.json'),json({schemaVersion:'dense-ledger-source-manifest-v1',baselineStudy:frozen.studyId,preparedWithNode:process.version,archive:{path:archive,sha256:frozen.candidate.sourceArchiveSha256,purpose:'frozen candidate identity'},extractionArchive:{path:extractionArchive,sha256:extractionArchiveSha256,purpose:'complete verified baseline build/source extraction'},frozenLock:{path:lockPath,sha256:sha(await readFile(path.join(root,lockPath)))},importClosure,originals,after,patches,patchHashes}));
console.log(`Prepared diagnostic snapshot: ${snapshot}`);
