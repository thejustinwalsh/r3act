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
import {use,useState,useEffect,createStore,createStoreSelector,createKeyedCollection,jsx} from ${JSON.stringify(nativeImport)};
export const a=createStore(1,(s:number,n:number)=>s+n);
export const b=createStore(10,(s:number,n:number)=>s+n);
export const total=createStoreSelector([a,b],([a,b])=>Number(a)+Number(b));
export const rows=createKeyedCollection([{id:'a'},{id:'b'}],row=>row.id);
export let activeEffects=0;
export function Badge(){
 useEffect(()=>{activeEffects++;return ()=>{activeEffects--;};});
 return <span>Ready</span>;
}
export function App({phase}:{phase:string}){
 const value=use(total);
 const [position,setPosition]=useState(5);
 const [draft,setDraft]=useState('');
 return <section><button data-move="yes" data-position={position} onClick={()=>setPosition(n=>n+1)}>Move</button><input data-draft="yes" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><output data-total="yes">{value}</output><Badge key={phase}/></section>;
}
export function CollectionRow({row}:{row:{id:string}}){
 const [tick,setTick]=useState(0);
 const [draft,setDraft]=useState('');
 return <li data-row={row.id} data-tick={tick}><input value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button onClick={()=>setTick(n=>n+1)}>Tick</button></li>;
}
export function CollectionApp(){return <ul>{rows.map(row=><CollectionRow key={row.id} row={row}/>)}</ul>;}
`;
const plugin=nativeModuleCompilerPlugin({root:directory});
const context={addWatchFile(){},error(message){throw new Error(String(message))}};
const roots=[];
const errors=[];
const queue=new NativeRootWorkQueue({onError:error=>errors.push(error)});
try{
 const transformed=await plugin.transform.call(context,authored,path.join(directory,'.cache/native-queue-execution.tsx'));
 assert.ok(transformed.code.includes('useStoreAt'));
 assert.match(transformed.code, /__nativeBindStateProps?At\(/);
 const emitted=await transformWithOxc(transformed.code,'.cache/native-queue-execution.tsx',{lang:'tsx',jsx:{runtime:'classic'}});
 await mkdir('.cache',{recursive:true});const filename=path.join(directory,'.cache/native-queue-execution.mjs');await writeFile(filename,emitted.code);
 const app=await import(pathToFileURL(filename).href+'?test='+Date.now());
 const world=createWorld();
 const make=id=>{const host=new MemoryVDOMHost();const container=host.createContainer();const root=createNativeRoot(host,container,{rootId:id,world,scheduleCommit(){}});roots.push(root);root.mount(jsx(app.App,{phase:'initial'}));return {root,container};};
 const left=make('compiled-queue-left'),right=make('compiled-queue-right');
 const find=(node,key)=>node.props[key]==='yes'?node:node.children.map(child=>find(child,key)).find(Boolean);
 const text=node=>(node.text??'')+node.children.map(text).join('');
 const total=side=>text(find(side.container,'data-total'));
 assert.equal(total(left),'11');assert.equal(app.activeEffects,2);
 const draft=find(left.container,'data-draft');draft.props.onInput({target:{value:'Keep my draft'}});left.root.flush();
 const start=(id,deltaA,deltaB)=>{
  for(const store of [app.a,app.b])store.beginTransition(id,roots.map(root=>root.rootId));
  app.a.dispatch(deltaA,{kind:'transition',transitionId:id});app.b.dispatch(deltaB,{kind:'transition',transitionId:id});
  return queue.enqueue({ renderPreparation: "repeatable",id,roots:[left,right].map(({root})=>({root,tree:jsx(app.App,{phase:id})})),pending:['ready'],transitions:[id],finishTransitions:true});
 };
 const slow=start('slow',10,100),fast=start('fast',2,20);
 app.a.dispatch(1);find(left.container,'data-move').props.onClick();left.root.flush();right.root.flush();
 assert.equal(total(left),'12');
 const observed=[];
 const unsubs=[app.a.subscribe(left.root.rootId,()=>observed.push([total(left),total(right),app.a.getStateForRoot(left.root.rootId),app.b.getStateForRoot(right.root.rootId)])),app.b.subscribe(right.root.rootId,()=>observed.push([total(left),total(right),app.a.getStateForRoot(left.root.rootId),app.b.getStateForRoot(right.root.rootId)]))];
 fast.resolve('ready');assert.equal(fast.status,'committed');assert.equal(slow.status,'pending');
 assert.deepEqual(observed,[['34','34',4,30],['34','34',4,30]]);observed.length=0;
 assert.equal(find(left.container,'data-draft'),draft);assert.equal(draft.props.value,'Keep my draft');
 assert.equal(find(left.container,'data-move').props['data-position'],6);
 slow.resolve('ready');assert.equal(total(left),'144');assert.equal(total(right),'144');
 assert.deepEqual(observed,[['144','144',14,130],['144','144',14,130]]);
 assert.equal(app.activeEffects,2,'Keyed lifecycle replacements leaked effects');
 find(left.container,'data-move').props.onClick();left.root.flush();assert.equal(find(left.container,'data-move').props['data-position'],7,'Canonical source binding was lost after candidate publication');
 const canceled=queue.enqueue({ renderPreparation: "repeatable",id:'cancelled',roots:[{root:left.root,tree:jsx(app.App,{phase:'never'})}],pending:['ready']});canceled.cancel();canceled.resolve('ready');assert.equal(canceled.status,'cancelled');assert.equal(total(left),'144');
 const collectionHost=new MemoryVDOMHost();const collectionContainer=collectionHost.createContainer();
 const collectionRoot=createNativeRoot(collectionHost,collectionContainer,{rootId:'compiled-queue-collection',world,scheduleCommit(){}});roots.push(collectionRoot);
 assert.equal(queue.enqueue({ renderPreparation: "repeatable",id:'collection-init',roots:[{root:collectionRoot,tree:jsx(app.CollectionApp,{})}]}).status,'committed');
 const rowById=id=>collectionContainer.children[0].children.find(node=>node.props['data-row']===id);
 const rowA=rowById('a'),inputA=rowA.children[0];inputA.props.onInput({target:{value:'Row draft'}});collectionRoot.flush();
 rowA.children[1].props.onClick();collectionRoot.flush();assert.equal(rowA.props['data-tick'],1);
 app.rows.apply([{kind:'insert',key:'c',value:{id:'c'},before:'a'}]);collectionRoot.flush();
 assert.equal(rowById('a'),rowA);assert.equal(rowA.children[0],inputA);assert.equal(inputA.props.value,'Row draft');
 rowA.children[1].props.onClick();collectionRoot.flush();assert.equal(rowA.props['data-tick'],2);
 for(const unsub of unsubs)unsub();queue.dispose();for(const root of roots)root.dispose();
 assert.equal(app.activeEffects,0);assert.equal(app.a.diagnostics().roots,0);assert.equal(app.b.diagnostics().roots,0);assert.equal(errors.length,0,String(errors));
 assert.equal(app.rows.stats().readerCount,0);
 console.log('PASS compiled native root queue: actual TSX/use(store)/numeric prop lowering, two stores/two roots, reverse readiness and urgent replay, coherent subscribers, preserved draft/host identity, canonical source writes, cancellation, effect/reader teardown.');
}finally{
 queue.dispose();for(const root of roots)root.dispose();await plugin.closeBundle();
}
