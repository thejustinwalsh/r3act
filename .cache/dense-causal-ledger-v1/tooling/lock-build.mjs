import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
assert.equal(process.version,'v24.18.0','Build lock requires pinned Node v24.18.0');
const work = path.resolve(here,'..');
const root = path.resolve(here,'../../..');
const build = path.join(work,'build');
const sha = x => createHash('sha256').update(x).digest('hex');
const hash = async x => sha(await readFile(x));
const proof = JSON.parse(await readFile(path.join(build,'build-proof.json')));
assert.equal(proof.status,'PASS');
assert.equal(proof.productionBuild,true);
const originalProofRelative = '.cache/high-frequency-build-proof-20261013-04/build-proof.json';
const originalProofPath = path.join(root,originalProofRelative);
const frozenLocks = JSON.parse(await readFile(path.join(root,'results/current-owner-kernel-headless-v1/source-build-locks.json')));
assert.equal(await hash(originalProofPath),frozenLocks[originalProofRelative],'original build04 proof differs from frozen source/build lock');
const originalProof = JSON.parse(await readFile(originalProofPath));
assert.equal(originalProof.status,'PASS');
assert.equal(originalProof.productionBuild,true);
// Compiler IDs encode the authored root. The probe build may have different bytes,
// but every native component/program/state-site/sink identity must stay the same.
const nativeIdentity = x => ({
  assertions:x.transforms.native.assertions,
  nativeRegistrations:x.transforms.native.nativeRegistrations,
  nativeOwnerUpdateKernels:x.transforms.native.nativeOwnerUpdateKernels,
});
const originalNativeIdentity = nativeIdentity(originalProof);
const diagnosticNativeIdentity = nativeIdentity(proof);
assert.deepEqual(diagnosticNativeIdentity,originalNativeIdentity,'diagnostic native component/program/site/slot/sink identity drifted from frozen build04');
const nativeIdentitySha256 = sha(JSON.stringify(originalNativeIdentity));
for (const name of ['NativeRowA','NativeRowB']) assert.equal(proof.transforms.native.assertions.find(x=>x.name===name)?.ownerUpdateProgram,true);
for (const name of ['ReactRowA','ReactRowB']) assert.equal(proof.transforms.react.assertions.find(x=>x.name===name)?.memoCacheReadWrite,true);
const files = ['high-frequency.html',...(await readdir(path.join(build,'dist/assets'))).map(x=>'assets/'+x)].sort();
const assets = await Promise.all(files.map(async file=>({file,sha256:await hash(path.join(build,'dist',file))})));
assert.equal(assets.filter(x=>x.file.endsWith('.js') && !x.file.endsWith('.js.map')).length,3);
assert.equal(assets.filter(x=>x.file.endsWith('.css')).length,1);
const maps=[];
for(const item of assets.filter(x=>x.file.endsWith('.js.map'))){
  const map=JSON.parse(await readFile(path.join(build,'dist',item.file)));
  assert.equal(map.version,3);
  maps.push({file:item.file,sha256:item.sha256,sources:map.sources});
}
assert.ok(maps.some(x=>x.sources.some(s=>s.endsWith('component_state_runtime.ts'))),'missing authored native Root source map');
assert.ok(maps.some(x=>x.sources.some(s=>s.endsWith('vdom_snapshot_runtime.ts'))),'missing authored VDOM source map');
assert.ok(maps.some(x=>x.sources.some(s=>s.endsWith('dom_style_writer.ts'))),'missing authored DOM style writer source map');
assert.ok(maps.some(x=>x.sources.some(s=>s.endsWith('react_high_frequency_arm.tsx'))),'missing authored React arm source map');
const tooling=Object.fromEntries(await Promise.all(['prepare.mjs','lock-build.mjs','collect-one.mjs','collect-allocation-one.mjs','analyze.mjs','synthetic-protocol.mjs','preview.config.ts'].map(async x=>[x,await hash(path.join(here,x))])));
const manifest = {schemaVersion:'dense-ledger-build-lock-v1',sourceManifestSha256:await hash(path.join(work,'source-manifest.json')),nodeVersion:process.version,originalBuild04Proof:{path:originalProofRelative,sha256:await hash(originalProofPath)},nativeIdentitySha256,buildProofSha256:await hash(path.join(build,'build-proof.json')),reactCompilerEventsSha256:await hash(path.join(build,'react-compiler-events.json')),tooling,maps,assets};
await writeFile(path.join(work,'build-lock.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(path.join(work,'build-lock.json'));
