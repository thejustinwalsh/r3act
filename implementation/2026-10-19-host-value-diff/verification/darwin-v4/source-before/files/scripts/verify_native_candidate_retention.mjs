import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {ComponentStateRoot,defineComponent} from '../src/component_state_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';

assert.equal(typeof global.gc,'function','Run Node with --expose-gc');
const host=new MemoryVDOMHost();
const container=host.createContainer();
const root=new ComponentStateRoot(host,container,{scheduleCommit(){}});
const Child=defineComponent('retention-child',({record})=>jsx('button',{onClick:()=>record.bytes.length},'value'));
const retainedCandidates=[];
function prepare(){
 const discardedValue={bytes:new Uint8Array(8192)};
 const discardedWeak=new WeakRef(discardedValue);
 const discarded=root.prepare(jsx(Child,{record:discardedValue}));
 discarded.discard();retainedCandidates.push(discarded);
 const publishedValue={bytes:new Uint8Array(8192)};
 const publishedWeak=new WeakRef(publishedValue);
 const published=root.prepare(jsx(Child,{record:publishedValue}));
 published.commitHost();published.publish();published.runEffects();retainedCandidates.push(published);
 root.update(jsx('p',{},'Still mounted'));
 return {discardedWeak,publishedWeak,control:new WeakRef({control:true})};
}
const weak=prepare();
for(let i=0;i<12;i++){await setImmediate();global.gc();}
assert.equal(weak.control.deref(),undefined,'Control was not collected');
assert.equal(weak.discardedWeak.deref(),undefined,'Retained discarded handle held private render data');
assert.equal(weak.publishedWeak.deref(),undefined,'Retained finished handle held removed render data');
assert.equal(retainedCandidates.length,2);
assert.equal(root.diagnostics().disposed,false);
root.dispose();
console.log('PASS: discarded and removed published render data collected while native candidate handles retained and root mounted. Narrow Node GC check, not a heap claim.');
