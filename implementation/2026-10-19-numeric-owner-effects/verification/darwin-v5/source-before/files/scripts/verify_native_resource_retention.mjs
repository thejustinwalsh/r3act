import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {AsyncResource} from '../src/async_resource_runtime.ts';
import {ComponentStateRoot,defineComponent,Suspense,useAt} from '../src/component_state_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';

assert.equal(typeof global.gc,'function','Run Node with --expose-gc');
const held=[];
async function stage(){
 let settle;
 const promise=new Promise(resolve=>{settle=resolve;});
 const resource=new AsyncResource(promise);
 const value={bytes:new Uint8Array(8192)};
 const weak=new WeakRef(value);
 const View=defineComponent('resource-retention-view',()=>{
  useAt('resource',resource);
  return jsx('p',{},'ready');
 });
 const host=new MemoryVDOMHost();
 const root=new ComponentStateRoot(host,host.createContainer(),{scheduleCommit(){}});
 const candidate=root.prepare(jsx(Suspense,{
  __nativeBoundarySite:'resource-retention-boundary',
  fallback:jsx('p',{},'waiting'),children:jsx(View,{}),
 }));
 assert.equal(candidate.pendingResources.length,1);
 candidate.discard();
 assert.equal(candidate.pendingResources.length,0,'Discard retained its pending resource list');
 held.push(candidate);
 settle(value);
 await promise;
 root.dispose();
 return weak;
}
const weak=await stage();
const control=new WeakRef({control:true});
for(let i=0;i<12;i++){await setImmediate();global.gc();}
assert.equal(control.deref(),undefined,'Control was not collected');
assert.ok(weak.deref()===undefined,'Discarded native handle retained a settled resource payload');
assert.equal(held.length,1);
console.log('PASS: settled resource payload collected while discarded native candidate handle retained. Narrow Node GC check, not a general heap claim.');
