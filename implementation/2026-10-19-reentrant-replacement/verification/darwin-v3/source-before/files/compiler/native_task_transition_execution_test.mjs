import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot,createWorld,AsyncResource,NativeTaskTransitionQueue} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
const directory=path.resolve('.');
const api=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {asyncTask,createStore,use,useState,Suspense,jsx} from ${JSON.stringify(api)};
export const query=createStore('old');
export const old=deferred<string>();
export const fresh=deferred<string>();
export const starts:string[]=[];
export function deferred<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(yes=>resolve=yes);return {promise,resolve};}
export const tasks=[
 asyncTask('search',async(values,signal)=>{const value=String(values.get('$query'));starts.push('search:'+value);return value==='old'?old.promise:fresh.promise;}),
 asyncTask('catalog',async(values)=>{const request=values.get('$request') as {locale:string};starts.push('catalog');return request.locale;}),
 asyncTask('panel',async(values)=>({search:String(values.get('search')),catalog:String(values.get('catalog'))})),
] as const;
export function Model({resource}:{resource:any}){const model=use(resource) as {search:string,catalog:string};return <output data-model="yes">{model.search}:{model.catalog}</output>;}
export function SearchFirst({search,model}:{search:any,model:any}){use(search);return <Model resource={model}/>;}
export function App({search,model}:{search:any,model:any}){
 const [draft,setDraft]=useState('');const[position,setPosition]=useState(5);
 return <section><input data-draft="yes" value={draft} onInput={(event:Event)=>setDraft((event.target as HTMLInputElement).value)}/><button data-move="yes" data-position={position} onClick={()=>setPosition(n=>n+1)}>Move</button><Suspense fallback={<p>waiting</p>}><SearchFirst search={search} model={model}/></Suspense></section>;
}
`;
const plugin=nativeModuleCompilerPlugin({root:directory});const context={addWatchFile(){},error(message){throw Error(String(message))}};
const roots=[];const queue=new NativeTaskTransitionQueue();
const find=(node,key)=>node.props[key]==='yes'?node:node.children.map(c=>find(c,key)).find(Boolean);
const text=n=>(n.text??'')+n.children.map(text).join('');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
try{
 const transformed=await plugin.transform.call(context,authored,path.join(directory,'.cache/native-task-transition.tsx'));
 assert.ok(transformed.code.includes(`asyncTask('search',["$query"],`)||transformed.code.includes(`asyncTask('search', ["$query"],`),'Compiler did not supply search edge');
 assert.ok(transformed.code.includes('compiledNativeComponentPlan'));
 assert.ok(transformed.code.includes('__nativeBoundarySite'));
 const emitted=await transformWithOxc(transformed.code,'.cache/native-task-transition.tsx',{lang:'tsx',jsx:{runtime:'classic'}});
 await mkdir('.cache',{recursive:true});const file=path.join(directory,'.cache/native-task-transition.mjs');await writeFile(file,emitted.code);
 const app=await import(pathToFileURL(file).href+'?test='+Date.now());
 const world=createWorld();
 const initialSearch=new AsyncResource(Promise.resolve('initial'));
 const initialModel=new AsyncResource(Promise.resolve({search:'initial',catalog:'en'}));
 const make=id=>{const host=new MemoryVDOMHost(),container=host.createContainer();const root=createNativeRoot(host,container,{rootId:id,world,scheduleCommit(){}});roots.push(root);root.mount(jsx(app.App,{search:initialSearch,model:initialModel}));return {root,container};};
 const left=make('task-compiled-left'),right=make('task-compiled-right');
 await tick();left.root.flush();right.root.flush();
 const leftDraft=find(left.container,'data-draft'),rightDraft=find(right.container,'data-draft');
 leftDraft.props.onInput({target:{value:'Kept left'}});left.root.flush();rightDraft.props.onInput({target:{value:'Kept right'}});right.root.flush();
 const handle=queue.enqueue(app.tasks,[left,right].map(({root})=>({root,buildTree:execution=>jsx(app.App,{search:execution.resource('search'),model:execution.resource('panel')})})),{inputs:{'$request':Object.freeze({locale:'en'})},liveInputs:{'$query':app.query}});
 assert.deepEqual(app.starts,['search:old','catalog'],'DAG did not prewarm the task hidden behind SearchFirst');
 await tick();assert.equal(text(find(left.container,'data-model')),'initial:en');
 find(left.container,'data-move').props.onClick();left.root.flush();
 app.query.dispatch('new');await tick();
 assert.deepEqual(app.starts,['search:old','catalog','search:new'],'Completed unaffected catalog branch was rerun or stale search was not restarted');
 app.old.resolve('obsolete');await tick();
 assert.equal(text(find(left.container,'data-model')),'initial:en','Late obsolete provider published');
 app.fresh.resolve('current');
 const resolution=await Promise.race([handle.completion,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Task publication timed out: '+JSON.stringify({work:handle.snapshot(),left:left.root.diagnostics(),right:right.root.diagnostics(),starts:app.starts}))),2000))]);
 assert.equal(resolution.status,'committed');
 assert.equal(text(find(left.container,'data-model')),'current:en');assert.equal(text(find(right.container,'data-model')),'current:en');
 assert.equal(find(left.container,'data-draft'),leftDraft);assert.equal(leftDraft.props.value,'Kept left');assert.equal(rightDraft.props.value,'Kept right');
 assert.equal(find(left.container,'data-move').props['data-position'],6);
 find(left.container,'data-move').props.onClick();left.root.flush();assert.equal(find(left.container,'data-move').props['data-position'],7,'Numeric source died after task publication');
 assert.ok(handle.snapshot().reused.includes('catalog'));
 queue.dispose();for(const root of roots)root.dispose();
 assert.equal(app.query.diagnostics().roots,0);assert.equal(app.query.diagnostics().readers,0);assert.equal(app.query.diagnostics().listeners,0);
 console.log('PASS compiled native tasks: Rust-authored TSX/DAG edges, hidden-branch prewarming, shared equal cuts, live source restart, unaffected completed reuse, ignored late old output, grouped reveal, drafts/numeric bindings and cleanup.');
}finally{queue.dispose();for(const root of roots)root.dispose();await plugin.closeBundle();}
