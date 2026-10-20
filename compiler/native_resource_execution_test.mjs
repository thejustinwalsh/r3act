import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot,createWorld} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';

const directory=path.resolve('.');
const nativeImport=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {Suspense,use,useState,useEffect,createStore,jsx} from ${JSON.stringify(nativeImport)};
export const first=deferred();
export const second=deferred();
export const warmOther=deferred();
export const rejected=deferred();
export const replacement=deferred();
export const candidatePending=deferred();
export const resourceStore=createStore(first.promise,(_state:PromiseLike<string>,next:PromiseLike<string>)=>next);
export let activeEffects=0;
export let effectSetups=0;
export let effectCleanups=0;
export function deferred<T=string>(){
 let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;
 const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
 return {promise,resolve,reject};
}
export function Child({name}:{name:string}){
 const value=use(use(resourceStore));
 const [count,setCount]=useState(0);
 const [draft,setDraft]=useState('');
 useEffect(()=>{activeEffects++;effectSetups++;return()=>{activeEffects--;effectCleanups++;};});
 return <article data-child={name}><button data-count={name} onClick={()=>setCount(n=>n+1)}>{count}</button><input data-draft={name} value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><output>{name}:{value}</output></article>;
}
export function App(){
 return <main><Suspense fallback={<p data-fallback="left">left waiting</p>} error={(reason:unknown)=><strong data-error="left">left error:{String(reason)}</strong>}><Child name="left"/></Suspense><Suspense fallback={<p data-fallback="right">right waiting</p>} error={(reason:unknown)=><strong data-error="right">right error:{String(reason)}</strong>}><Child name="right"/></Suspense></main>;
}
export function WarmA(){return <b>{use(first.promise)}</b>;}
export function WarmB(){return <i>{use(warmOther.promise)}</i>;}
export function Warm(){return <Suspense fallback={<p>warm waiting</p>}><WarmA/><WarmB/></Suspense>;}
export function Candidate(){return <Suspense fallback={<p>candidate fallback</p>}><Child key="candidate" name="candidate"/></Suspense>;}
`;

const plugin=nativeModuleCompilerPlugin({
 root:directory,
 compilerBinary:path.join(directory,'compiler/oxc-spike/target/debug/ui-graph-compiler-spike'),
});
const context={addWatchFile(){},error(message){throw new Error(String(message))}};
const roots=[];
let tempDirectory;
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setTimeout(resolve,0));};
const locate=(node,predicate)=>predicate(node)?node:node.children.map(child=>locate(child,predicate)).find(Boolean);
const by=(container,key,value)=>locate(container,node=>node.props[key]===value);
const text=node=>(node.text??'')+node.children.map(text).join('');
try{
 const cacheDirectory=path.join(directory,'.cache');
 await mkdir(cacheDirectory,{recursive:true});
 tempDirectory=await mkdtemp(path.join(cacheDirectory,'native-resource-execution-'));
 const sourcePath=path.join(tempDirectory,'native-resource-execution.tsx');
 const transformedPath=path.join(tempDirectory,'native-resource-execution.transformed.tsx');
 const filename=path.join(tempDirectory,'native-resource-execution.mjs');
 await writeFile(sourcePath,authored,{flag:'wx'});
 const transformed=await plugin.transform.call(context,authored,sourcePath);
 assert.ok(transformed?.code,'Native TSX compiler did not transform the resource fixture');
 await writeFile(transformedPath,transformed.code,{flag:'wx'});
 assert.ok(transformed.code.includes('__nativeBoundarySite'),'Compiler did not inject lexical Suspense identities');
 assert.ok(transformed.code.includes('useAt'),'Compiler did not lower promise reads');
 assert.ok(transformed.code.includes('useStoreAt'),'Compiler did not lower the nested store read');
 const emitted=await transformWithOxc(transformed.code,sourcePath,{lang:'tsx',jsx:{runtime:'classic',pragma:'jsx',pragmaFrag:'Fragment'}});
 await writeFile(filename,emitted.code);
 const app=await import(pathToFileURL(filename).href+'?test='+Date.now());
 const host=new MemoryVDOMHost(),container=host.createContainer(),world=createWorld();
 const root=createNativeRoot(host,container,{rootId:'compiled-native-resource'});roots.push(root);
 root.mount(jsx(app.App,{}));
 const warmHost=new MemoryVDOMHost(),warmContainer=warmHost.createContainer();
 const warmRoot=createNativeRoot(warmHost,warmContainer,{rootId:'compiled-native-warm',world});roots.push(warmRoot);
 const warmCandidate=warmRoot.prepare(jsx(app.Warm,{}), { renderPreparation: "repeatable" });
 assert.equal(warmCandidate.pendingResources.length,2,'A first pending sibling prevented observation of a distinct second resource');
 warmCandidate.commitHost();warmCandidate.publish();warmCandidate.runEffects();
 assert.equal(text(container),'left waitingright waiting','Sibling boundaries did not both discover pending resources during startup');
 assert.equal(app.activeEffects,0,'Suspended candidate effects ran before reveal');
 app.first.resolve('ready');await flush();
 assert.equal(text(warmContainer),'warm waiting','Boundary revealed before its second observed sibling was ready');
 app.warmOther.resolve('other');await flush();
 assert.equal(text(warmContainer),'readyother');
 assert.equal(text(container),'0left:ready0right:ready','Both sibling primaries did not reveal after settlement');
 assert.equal(app.activeEffects,2,'The two instances of Child did not activate independently');
 const leftArticle=by(container,'data-child','left'),rightArticle=by(container,'data-child','right');
 const leftInput=by(container,'data-draft','left'),rightInput=by(container,'data-draft','right');
 by(container,'data-count','left').props.onClick();leftInput.props.onInput({target:{value:'left draft'}});
 rightInput.props.onInput({target:{value:'right draft'}});await flush();
 assert.equal(by(container,'data-count','left').children.map(text).join(''),'1');
 app.resourceStore.dispatch(app.second.promise);await flush();
 assert.equal(text(container),'1left:ready0right:ready','Replacement pending state did not retain revealed primary content');
 assert.equal(by(container,'data-child','left'),leftArticle,'Replacement changed the left host subtree identity');
 assert.equal(by(container,'data-draft','left'),leftInput,'Replacement changed the left input identity');
 assert.equal(leftInput.props.value,'left draft','Replacement lost the left input draft');
 assert.equal(rightInput.props.value,'right draft','Replacement lost the right input draft');
 app.second.resolve('next');await flush();
 assert.equal(text(container),'1left:next0right:next','Replacement resource did not reveal both current primaries');
 assert.equal(by(container,'data-child','left'),leftArticle);
 assert.equal(by(container,'data-draft','right'),rightInput);
 assert.equal(leftInput.props.value,'left draft');assert.equal(rightInput.props.value,'right draft');
 assert.equal(app.activeEffects,2,'Replacing a resource leaked or duplicated effects');
 app.resourceStore.dispatch(app.rejected.promise);await flush();
 app.rejected.reject('broken');await flush();
 assert.equal(by(container,'data-error','left')!==undefined,true,'Left boundary did not render its local rejection');
 assert.equal(by(container,'data-error','right')!==undefined,true,'Right boundary did not render its local rejection');
 assert.equal(text(container),'left error:brokenright error:broken');
 app.resourceStore.dispatch(app.replacement.promise);await flush();
 assert.equal(text(container),'left error:brokenright error:broken','Rejected boundary did not retain its local error while replacement was pending');
 app.replacement.resolve('recovered');await flush();
 assert.equal(text(container),'0left:recovered0right:recovered','Replacement identity did not retry rejected boundaries with fresh owner lifetimes');
 assert.equal(app.activeEffects,2,'Error/replacement cycle leaked or duplicated Child effects');
 assert.ok(app.effectSetups>=4&&app.effectCleanups>=2,'Replacement/error path did not exercise lifecycle cleanup');

 app.resourceStore.dispatch(app.candidatePending.promise);await flush();
 const candidate= root.prepare(jsx(app.Candidate,{}), { renderPreparation: "repeatable" });
 assert.ok(candidate.pendingResources.length>0,'Candidate did not observe the pending resource');
 candidate.discard();
 assert.equal(app.activeEffects,2,'Discarded candidate activated or cleaned live effects');
 const disposeHost=new MemoryVDOMHost(),disposeContainer=disposeHost.createContainer();
 const disposeRoot=createNativeRoot(disposeHost,disposeContainer,{rootId:'compiled-native-resource-dispose',world});roots.push(disposeRoot);
 app.resourceStore.dispatch(app.candidatePending.promise);await flush();
 disposeRoot.mount(jsx(app.Candidate,{}));
 assert.equal(text(disposeContainer),'candidate fallback');
 const setupsBeforeDispose=app.effectSetups;
 disposeRoot.dispose();
 app.candidatePending.resolve('after dispose');await flush();
 assert.equal(app.effectSetups,setupsBeforeDispose,'Disposed pending root retried and activated an effect');
 assert.equal(app.activeEffects,2,'Disposing a separate pending root changed live root effects');
 root.dispose();assert.equal(app.activeEffects,0,'Root disposal did not clean up active effects');
 console.log('PASS compiled native resource execution: authored TSX/use(store)/use(promise)/nested use, lexical Suspense sites, sibling fallback/reveal, per-boundary Child identity/state/effects, retained input drafts, local rejection/replacement, candidate discard, and disposal cleanup.');
 console.log(`Evidence artifacts: ${tempDirectory}`);
}finally{
 for(const root of roots)root.dispose();
 await plugin.closeBundle();
}
