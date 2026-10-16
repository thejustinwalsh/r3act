import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertOrderRun, phasePage, validatePage } from './analyze.mjs';

assert.equal(process.version,'v24.18.0');
const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'../..');
const ledger=path.join(project,'.cache/dense-causal-ledger-v1');
const plan=JSON.parse(await readFile(path.join(here,'protocol.json')));
const frozen=JSON.parse(await readFile(path.join(project,'results/current-owner-kernel-headless-v1/frozen-config.json')));
const lock=JSON.parse(await readFile(path.join(ledger,'build-lock.json')));
const dirs=await readdir(path.join(ledger,'runs'));
const template={};
for(const mode of ['original','off','on']){
  const dir=dirs.find(x=>x.startsWith(`${mode}-native-1024-`));
  assert.ok(dir,`missing archived ${mode} template`);
  template[mode]=JSON.parse(await readFile(path.join(ledger,'runs',dir,'record.json')));
  assert.equal(template[mode].status,'PASS');
}
const clone=x=>structuredClone(x);
const slots=plan.sizes[0].blocks.flatMap(b=>b.slots);
const scheduled=(mode,sequence)=>{
  const r=clone(template[mode]);
  r.runId=`synthetic-${sequence}-${mode}`;
  const started=Date.parse(plan.createdAt)+sequence*60_000;
  r.startedAt=new Date(started).toISOString();r.completedAt=new Date(started+30_000).toISOString();
  return r;
};
const assets=mode=>mode==='original'?frozen.productionAssets:lock.assets.filter(a=>!a.file.endsWith('.map'));
const diagnosticOrigin=template.off.origin;
const first=scheduled('original',1),second=scheduled('off',2),third=scheduled('on',3);
for(const [r,slot] of [[first,slots[0]],[second,slots[1]],[third,slots[2]]]){
  validatePage(r,slot,1024,plan,assets(slot.mode),diagnosticOrigin);
  if(slot.mode==='on')phasePage(r);
}
const state={seenRuns:new Set(),previousCompleted:-Infinity};
assertOrderRun(first,slots[0],1,state);
assertOrderRun(second,slots[1],2,state);
assertOrderRun(third,slots[2],3,state);
const rejects=(label,fn)=>assert.throws(fn,undefined,label);
rejects('wrong order',()=>assertOrderRun(scheduled('original',1),slots[1],1,{seenRuns:new Set(),previousCompleted:-Infinity}));
rejects('reused record',()=>assertOrderRun({...second,runId:first.runId},slots[1],2,{seenRuns:new Set([first.runId]),previousCompleted:Date.parse(first.completedAt)}));
rejects('wrong source identity',()=>validatePage({...second,buildLockSha256:'0'.repeat(64)},slots[1],1024,plan,assets('off'),diagnosticOrigin));
rejects('incomplete lifecycle',()=>validatePage({...second,result:{...second.result,afterDispose:{mounts:1024,cleanups:0,writers:1024}}},slots[1],1024,plan,assets('off'),diagnosticOrigin));
const badNonfinite=clone(third);
badNonfinite.result.ledger.events.find(e=>e.frame===61&&e.label==='native.dispatch.end').atMs=NaN;
rejects('nonfinite interval',()=>phasePage(badNonfinite));
const badNegative=clone(third);
const measured=badNegative.result.ledger.events.filter(e=>e.frame===61);
measured.find(e=>e.label==='native.dispatch.end').atMs=measured.find(e=>e.label==='native.dispatch.start').atMs-1;
rejects('negative interval',()=>phasePage(badNegative));
console.log('PASS synthetic targeted-control protocol: accepted template, wrong order, reused record, source drift, lifecycle, nonfinite and negative spans');
