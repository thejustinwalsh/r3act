import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {AsyncResource} from '../src/async_resource_runtime.ts';
import {createAsyncStore} from '../src/async_store_runtime.ts';
import {ComponentStateRoot,defineComponent,Suspense,useAt,useStoreAt} from '../src/component_state_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';

assert.equal(typeof global.gc,'function','Run Node with --expose-gc');
const retainedCandidates=[];
const roots=[];
const Child=defineComponent('direct-intent-retention:Child',({record})=>
  jsx('button',{onClick:()=>record.bytes.length},'payload'));

async function cycle(id,publish){
  let resolvePending;
  const pending=new AsyncResource(new Promise((resolve)=>{resolvePending=resolve;}));
  const ready=new AsyncResource(Promise.resolve('old'));
  await setImmediate();
  const mode=createAsyncStore(ready,(_state,action)=>action);
  const Gate=defineComponent(`direct-intent-retention:${id}:Gate`,()=>
    jsx('div',{key:'gate-host'},useAt('resource',useStoreAt('mode',mode))));
  const gate=jsx(Suspense,{key:'gate',__nativeBoundarySite:'gate',
    fallback:jsx('div',{key:'gate-host'},'loading'),
    children:jsx(Gate,{key:'gate-child'})});
  const host=new MemoryVDOMHost();
  const root=new ComponentStateRoot(host,host.createContainer(),{
    rootId:`direct-intent-retention-${id}`,scheduleCommit(){},
  });
  roots.push(root);
  root.mount(jsx('section',{},gate));
  mode.dispatch(pending);
  const payload={bytes:new Uint8Array(8192)};
  const weak=new WeakRef(payload);
  root.update(jsx('section',{},[gate,jsx(Child,{key:'child',record:payload})]));
  const blocked=root.preparePending();
  assert.ok(blocked?.blocked,'Desired tree must remain blocked');
  blocked.discard();
  retainedCandidates.push(blocked);
  if(publish){
    resolvePending('ready');
    await setImmediate();
    const accepted=root.preparePending();
    assert.ok(accepted && !accepted.blocked,'Settled desired tree must prepare');
    accepted.commitHost();accepted.publish();accepted.runEffects();
    retainedCandidates.push(accepted);
  }
  root.update(jsx('p',{},'Still mounted'));
  return weak;
}

const discardedWeak=await cycle('superseded',false);
const publishedWeak=await cycle('published',true);
const control=new WeakRef({control:true});
for(let i=0;i<12;i++){await setImmediate();global.gc();}
assert.equal(control.deref(),undefined,'Control was not collected');
assert.equal(discardedWeak.deref(),undefined,
  'Closed blocked candidate retained superseded direct tree');
assert.equal(publishedWeak.deref(),undefined,
  'Closed published candidate retained removed direct tree');
assert.equal(retainedCandidates.length,3);
assert.ok(roots.every((root)=>!root.diagnostics().disposed));
for(const root of roots) root.dispose();
console.log('PASS: superseded and published direct-intent payloads collected with closed candidate handles retained and roots mounted. Narrow bounded Node GC check, not a heap claim.');
