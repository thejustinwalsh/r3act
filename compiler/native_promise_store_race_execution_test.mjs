import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot,createWorld,NativeRootWorkQueue} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';

const directory=path.resolve('.');
const nativeImport=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {Suspense,use,useState,useEffect,createStore,createStoreSelector,jsx} from ${JSON.stringify(nativeImport)};
export function deferred<T=string>(){
 let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
export const oldB=deferred<string>();
export const replacementB=deferred<string>();
export const rejectedB=deferred<string>();
export const modeStore=createStore('A',(_state:'A'|'B',next:'A'|'B')=>next);
export const storeA=createStore(Promise.resolve('base-A'),(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);
export const storeB=createStore(Promise.resolve('base-B'),(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);
export const edits=createStore(0,(state:number,delta:number)=>state+delta);
export const selectionA=createStoreSelector([storeA],([value])=>value);
export const selectionB=createStoreSelector([storeB],([value])=>value);
export let setups=0;
export let cleanups=0;
export let active=0;
export function Reader({label}:{label:string}){
 const mode=use(modeStore);
 const selected=mode==='A'?selectionA:selectionB;
 const promise=use(selected);
 const value=use(promise);
 const edit=use(edits);
 useEffect(()=>{setups++;active++;return()=>{cleanups++;active--;};});
 return <output data-reader={label} data-mode={mode}>{label}:{mode}:{value}:{edit}</output>;
}
export function Pair(){
 const [showLate,setShowLate]=useState(false);
 return <main><button data-add-late="yes" onClick={()=>setShowLate(true)}>Add late reader</button><Suspense fallback={<i data-fallback="left">left pending</i>} error={(reason:unknown)=><i data-error="left">left error:{String(reason)}</i>}><Reader key="stable-left" label="left"/></Suspense><Suspense fallback={<i data-fallback="right">right pending</i>} error={(reason:unknown)=><i data-error="right">right error:{String(reason)}</i>}><Reader key="stable-right" label="right"/></Suspense>{showLate?<Suspense fallback={<i data-fallback="late">late pending</i>} error={(reason:unknown)=><i data-error="late">late error:{String(reason)}</i>}><Reader key="stable-late" label="late"/></Suspense>:null}</main>;
}
`;

const plugin=nativeModuleCompilerPlugin({root:directory});
const context={addWatchFile(){},error(message){throw new Error(String(message))},async resolve(specifier){return specifier===nativeImport?{id:path.join(directory,'src/native_runtime_api.ts')}:null;}};
const roots=[];
const errors=[];
const queue=new NativeRootWorkQueue({onError:error=>errors.push(error)});
const within=async(label,promise,ms=1500)=>{
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms);})]);}
 finally{clearTimeout(timer);}
};
const settle=async()=>within('promise/queue settlement',new Promise(resolve=>setTimeout(resolve,0)));
const walk=(node,predicate)=>predicate(node)?node:node.children.map(child=>walk(child,predicate)).find(Boolean);
const read=(container,label)=>walk(container,node=>node.props['data-reader']===label);
const content=node=>(node.text??'')+node.children.map(content).join('');
const findButton=container=>walk(container,node=>node.props['data-add-late']==='yes');
const world=createWorld();
let monitorFallback=false;const fallbackPlacements=[];
class ObservedHost extends MemoryVDOMHost {
 place(parent,node,before){if(monitorFallback&&node.props['data-fallback'])fallbackPlacements.push(node.props['data-fallback']);return super.place(parent,node,before);}
}
const makeRoot=id=>{
 const host=new ObservedHost(),container=host.createContainer();
 const root=createNativeRoot(host,container,{rootId:id,world,scheduleCommit(){}});
 roots.push(root);return {root,container};
};
const expect=(side,label,value)=>assert.equal(content(read(side.container,label)),value,`${side.root.rootId}/${label}`);

try{
 const transformed=await plugin.transform.call(context,authored,path.join(directory,'.cache/native-promise-store-race.tsx'));
 assert.ok(transformed?.code,'Native compiler did not transform authored TSX');
 assert.ok(transformed.code.includes('useStoreAt')&&transformed.code.includes('useAt'),'Nested use(use(source)) was not lowered');
 assert.ok(transformed.code.includes('#component:Reader#store:0')&&transformed.code.includes('#component:Reader#store:1'),'Compiler did not emit stable distinct read sites');
 const emitted=await transformWithOxc(transformed.code,'.cache/native-promise-store-race.tsx',{lang:'tsx',jsx:{runtime:'classic',pragma:'jsx',pragmaFrag:'Fragment'}});
 await mkdir('.cache',{recursive:true});
 const filename=path.join(directory,'.cache/native-promise-store-race.mjs');
 await writeFile(filename,emitted.code);
 const app=await import(pathToFileURL(filename).href+'?test='+Date.now());
 await settle();

 const lead=makeRoot('promise-race-lead'),fork=makeRoot('promise-race-fork'),lag=makeRoot('promise-race-lag');
 for(const side of [lead,fork,lag])side.root.mount(jsx(app.Pair,{}));
 await settle();for(const side of [lead,fork,lag])side.root.flush();
 for(const side of [lead,fork,lag]){
  expect(side,'left','left:A:base-A:0');expect(side,'right','right:A:base-A:0');
 }
 assert.equal(app.active,6,'Initial effects should activate once per reader and root');
 monitorFallback=true;
 const originalReaders=[lead,fork].map(side=>['left','right'].map(label=>read(side.container,label)));

 // Capture the committed DOM handler now; invoke it after the candidate is
 // pending to mount a reader into the lagging, nonparticipant root.
 const mountLateInLag=findButton(lag.container).props.onClick;

 // Mode and B-source promise actions belong to one explicit root scope.
 // Until the grouped candidate is ready, the committed tree remains mode A.
 for(const store of [app.modeStore,app.storeB])store.beginTransition('held-mode-B',['promise-race-lead','promise-race-fork']);
 app.modeStore.dispatch('B',{kind:'transition',transitionId:'held-mode-B'});
 app.storeB.dispatch(app.oldB.promise,{kind:'transition',transitionId:'held-mode-B'});
 const held=queue.enqueue({ renderPreparation: "repeatable",id:'held-mode-B',roots:[lead,fork].map(side=>({root:side.root,tree:jsx(app.Pair,{})})),transitions:['held-mode-B'],finishTransitions:true});
 assert.equal(held.status,'pending','Mode B candidate should wait for its selected store promise');
 assert.equal(app.active,6,'A suspended B candidate activated reader effects before publication');
 for(const side of [lead,fork])expect(side,'left','left:A:base-A:0');
 mountLateInLag();lag.root.flush();
 expect(lag,'late','late:A:base-A:0');
 assert.equal(app.active,7,'The committed setter did not mount one late reader in the lagging root');

 // An urgent independent edit replays over visible mode A while the B-mode
 // candidate stays held. The late root remains pinned to its own A projection.
 app.edits.dispatch(1);for(const side of [lead,fork,lag])side.root.flush();
 for(const side of [lead,fork]){
  expect(side,'left','left:A:base-A:1');expect(side,'right','right:A:base-A:1');
 }
 expect(lag,'late','late:A:base-A:1');

 // Replace the pending B promise within the same scope and continue this same
 // queue handle. Settling oldB late must not publish or finish held-mode-B.
 app.storeB.dispatch(app.replacementB.promise,{kind:'transition',transitionId:'held-mode-B'});
 await settle();
 assert.equal(held.status,'pending','Replacement B promise should keep the original group pending');
 const activeBeforeStaleSettlement=app.active;
 app.oldB.resolve('stale-B');await settle();
 assert.equal(held.status,'pending','Late settlement of the replaced B promise must not publish the group');
 assert.equal(app.active,activeBeforeStaleSettlement,'A stale B candidate activated or cleaned effects');
 for(const side of [lead,fork])expect(side,'left','left:A:base-A:1');
 app.replacementB.resolve('fresh-B');await settle();
 assert.equal(held.status,'committed','The same queued work should publish after its current B promise resolves');
 for(const side of [lead,fork]){
  for(const label of ['left','right'])expect(side,label,`${label}:B:fresh-B:1`);
 }
 expect(lag,'late','late:A:base-A:1');
 assert.equal(app.active,7,'Switching selected stores reactivated or leaked stable component effects');
 assert.equal(app.setups,7);assert.equal(app.cleanups,0);
 for(const [index,side] of [lead,fork].entries())for(const [column,label] of ['left','right'].entries())assert.equal(read(side.container,label),originalReaders[index][column]);
 lag.root.flush();expect(lag,'late','late:B:fresh-B:1');
 assert.equal(app.storeA.diagnostics().readers,0,'Old selector source readers were not retired after all roots switched');

 // Rejection renders each reader's local error boundary. A fresh store-held
 // promise retries the same compiled boundary sites with fresh reader lifetimes.
 app.storeB.dispatch(app.rejectedB.promise);
 const rejecting=queue.enqueue({ renderPreparation: "repeatable",id:'reject-mode-B',roots:[lead,fork].map(side=>({root:side.root,tree:jsx(app.Pair,{})}))});
 await settle();assert.equal(rejecting.status,'pending');
 app.rejectedB.reject(new Error('B failed'));await settle();
 assert.equal(rejecting.status,'committed','Rejected resource should publish its authored local error branches');
 for(const side of [lead,fork])for(const label of ['left','right'])assert.ok(walk(side.container,node=>node.props['data-error']===label),`${side.root.rootId}/${label} did not show its local rejection`);
 assert.equal(app.active,3,'Only the untouched lag root readers should survive the grouped rejection');
 app.storeB.dispatch(Promise.resolve('retry-B'));
 const retry=queue.enqueue({ renderPreparation: "repeatable",id:'retry-mode-B',roots:[lead,fork].map(side=>({root:side.root,tree:jsx(app.Pair,{})}))});
 await settle();assert.equal(retry.status,'committed');
 for(const side of [lead,fork])for(const label of ['left','right'])expect(side,label,`${label}:B:retry-B:1`);
 assert.equal(app.active,7,'Rejection/retry leaked or duplicated reader effects');

 for(const side of roots)side.dispose();queue.dispose();
 assert.equal(app.active,0,'Root disposal did not clean up activated reader effects');
 assert.equal(app.setups,app.cleanups,'Effect setup/cleanup accounting did not balance');
 for(const store of [app.modeStore,app.storeA,app.storeB,app.edits])assert.deepEqual(store.diagnostics(),{roots:0,listeners:0,readers:0,retainedActions:0,transitions:0},'Store retained ownership after disposal');
 for(const root of roots){assert.equal(root.diagnostics().ownerCount,0);}
 assert.deepEqual(fallbackPlacements,[],'A fallback was inserted after initial reveal');
 assert.equal(errors.length,0,`Unexpected queue errors: ${errors.map(String).join('; ')}`);
 console.log('PASS compiled promise/store race: authored nested reads, same-scope mode/source transition, urgent replay over committed A, late child in lagging root, B-promise replacement and stale settlement, grouped fork publication, rejection/retry, and cleanup.');
}finally{
 queue.dispose();for(const root of roots)root.dispose();await plugin.closeBundle();
}
