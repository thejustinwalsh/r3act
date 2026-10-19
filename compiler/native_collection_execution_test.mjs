import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
const directory=path.resolve('.');const nativeImport=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const artifact=path.join(directory,'.cache',`native-collection-execution-${randomUUID()}`);
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {jsx,useState,useEffect,createKeyedCollection} from ${JSON.stringify(nativeImport)};
export const rows=createKeyedCollection(Array.from({length:1000},(_,i)=>({id:String(i),label:'Row '+i})),row=>row.id);
export const trace={renders:0,mounts:0,cleanups:0};
export function Row({row}:{row:{id:string,label:string}}){
 trace.renders++;
 const [tick,setTick]=useState(0);
 const [draft,setDraft]=useState(row.label);
 useEffect(()=>{trace.mounts++;return ()=>{trace.cleanups++}});
 if(row.label==='BAD')throw new Error('row candidate failed');
 return <li data-row={row.id} data-tick={tick}><button onClick={()=>setTick(previous=>previous+1)}>Tick</button><input value={draft} onInput={(event:any)=>setDraft(event.value)}/><span>{row.label}</span></li>;
}
export function Rows(){return <ul>{rows.map(row=><Row row={row}/>)}</ul>;}
export const tiny=createKeyedCollection([{id:'tinyA',label:'A'},{id:'tinyB',label:'B'}],row=>row.id);
export function HostChild({id}:{id:string}){const [value,setValue]=useState(0);return <button data-child={id} onClick={()=>setValue(previous=>previous+1)}>{value}</button>;}
export function CountHost(){return <section><output data-count="yes">{tiny.size}v{tiny.version}</output><ul>{tiny.map(row=><li key={row.id}><HostChild id={row.id}/></li>)}</ul></section>;}
export function App({title='initial'}:{title?:string}){return <section><h1>{title}</h1><Rows/></section>;}
`;
const plugin=nativeModuleCompilerPlugin({root:directory,compilerBinary:path.join(directory,'compiler/oxc-spike/target/debug/ui-graph-compiler-spike')});const context={addWatchFile(){},error(message){throw new Error(String(message))}};let root;
try{
 await mkdir(artifact);await writeFile(path.join(artifact,'authored.tsx'),authored,{flag:'wx'});
 const transformed=await plugin.transform.call(context,authored,path.join(artifact,'authored.tsx'));assert.ok(transformed.code.includes('renderCollectionAt'),'Collection map was not compiled');
 const emitted=await transformWithOxc(transformed.code,path.join(artifact,'authored.tsx'),{lang:'tsx',jsx:{runtime:'classic',pragma:'jsx',pragmaFrag:'Fragment'}});const filename=path.join(artifact,'emitted.mjs');await writeFile(filename,emitted.code,{flag:'wx'});const app=await import(pathToFileURL(filename).href);
 const host=new MemoryVDOMHost();const container=host.createContainer();let counters={};root=createNativeRoot(host,container,{scheduleCommit(){},profileCounter(next){counters=next}});root.mount(jsx(app.App,{}));
 const walk=(node,predicate)=>predicate(node)?node:node.children.map(child=>walk(child,predicate)).find(Boolean);const row=id=>walk(container,node=>node.props['data-row']===id);const list=()=>walk(container,node=>node.tag==='ul');const input=node=>node.children.find(child=>child.tag==='input');const button=node=>node.children.find(child=>child.tag==='button');const text=node=>(node.text??'')+node.children.map(text).join('');
 assert.equal(app.trace.mounts,1000);assert.equal(list().children.length,1000);const retained=row('5');input(retained).props.onInput({value:'Retained draft'});root.flush();button(retained).props.onClick();root.flush();assert.equal(row('5').props['data-tick'],1);
 const edits=operations=>{assert.equal(app.rows.apply(app.rows.version,operations).ok,true);root.flush();};const beforeRenders=app.trace.renders;
 edits([{type:'insert',key:'new',value:{id:'new',label:'New row'},beforeKey:'5'}]);assert.equal(app.trace.renders-beforeRenders,1,'One insert re-executed unaffected rows');assert.equal(row('5'),retained);assert.equal(input(retained).props.value,'Retained draft');assert.equal(list().children.length,1001);
 edits([{type:'move',key:'new',beforeKey:'0'}]);assert.equal(list().children[0].props['data-row'],'new');assert.equal(row('5'),retained);
 edits([{type:'replace',key:'new',value:{id:'new',label:'Replacement'}}]);assert.ok(text(row('new')).includes('Replacement'));
 edits([{type:'remove',key:'7'}]);assert.equal(row('7'),undefined);assert.equal(app.trace.cleanups,1);
 edits([{type:'remove',key:'5'},{type:'insert',key:'5',value:{id:'5',label:'Fresh row'},beforeKey:null}]);assert.notEqual(row('5'),retained);assert.equal(input(row('5')).props.value,'Fresh row');assert.equal(row('5').props['data-tick'],0);
 root.update(jsx(app.App,{title:'Full fallback'}));assert.equal(list().children.length,1000);assert.equal(row('7'),undefined);assert.ok(text(row('new')).includes('Replacement'));assert.equal(input(row('5')).props.value,'Fresh row');
 const oldCount=list().children.length;assert.equal(app.rows.apply(app.rows.version,[{type:'insert',key:'bad',value:{id:'bad',label:'BAD'},beforeKey:null}]).ok,true);assert.throws(()=>root.flush(),/row candidate failed/);assert.equal(list().children.length,oldCount);assert.equal(row('bad'),undefined);
 edits([{type:'replace',key:'bad',value:{id:'bad',label:'Recovered'}}]);assert.ok(row('bad'));assert.ok(text(row('bad')).includes('Recovered'));
 const counterHost=new MemoryVDOMHost(), counterContainer=counterHost.createContainer();
 const counterRoot=createNativeRoot(counterHost,counterContainer,{scheduleCommit(){}});
 try{
  counterRoot.mount(jsx(app.CountHost,{}));
  const count=()=>text(walk(counterContainer,node=>node.props['data-count']==='yes'));
  const child=id=>walk(counterContainer,node=>node.props['data-child']===id);
  assert.equal(count(),'2v0');
  child('tinyA').props.onClick();counterRoot.flush();child('tinyA').props.onClick();counterRoot.flush();
  assert.equal(text(child('tinyA')),'2');assert.equal(text(child('tinyB')),'0');
  const childNode=child('tinyA');app.tiny.apply(app.tiny.version,[{type:'move',key:'tinyA',beforeKey:null}]);counterRoot.flush();
  assert.equal(count(),'2v1');assert.equal(child('tinyA'),childNode);assert.equal(text(child('tinyA')),'2');assert.equal(text(child('tinyB')),'0');
  app.tiny.apply(app.tiny.version,[{type:'insert',key:'tinyC',value:{id:'tinyC',label:'C'},beforeKey:null}]);counterRoot.flush();assert.equal(count(),'3v2');assert.equal(text(child('tinyC')),'0');
 }finally{counterRoot.dispose();}
 assert.equal(app.tiny.stats().readerCount,0);
 root.dispose();assert.equal(app.trace.mounts,app.trace.cleanups);assert.equal(app.rows.stats().readerCount,0);assert.equal(app.rows.stats().retainedBatches,0);
 console.log('Compiled collection execution PASS: sparse bound rows, keyed lifetimes, full fallback, candidate failure recovery, intrinsic nested identities, derived count fallback and disposal.',JSON.stringify(counters));
}finally{root?.dispose();plugin.closeBundle?.call({});}
