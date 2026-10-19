import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
const directory=path.resolve('.');
const nativeImport=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {use, useState, createStore, createStoreSelector, jsx} from ${JSON.stringify(nativeImport)};
export const a=createStore(0);
export const b=createStore(10);
export const total=createStoreSelector([a,b],([a,b])=>Number(a)+Number(b));
export const controls:Record<string,(v:any)=>boolean>={};
export let fail=false;
export function setFailure(next:boolean){fail=next;}
export function App(){
 const value=use(total);
 const [active,setActive]=useState(true);
 controls.active=setActive;
 if(fail)throw new Error('candidate failure');
 return <section><button data-total="yes" onClick={()=>a.dispatch(previous=>previous+1)}>Total {value}</button>{active?<Conditional/>:null}</section>;
}
export function Conditional(){
 const [enabled,setEnabled]=useState(true);
 if(enabled){const current=use(a);return <output data-conditional="yes" onClick={()=>setEnabled(false)}>{current}</output>;}
 return <output data-conditional="yes">Disabled</output>;
}
`;
const plugin=nativeModuleCompilerPlugin({root:directory});
const context={addWatchFile(){},error(message){throw new Error(String(message))}};
const roots=[];
try{
 const transformed=await plugin.transform.call(context,authored,path.join(directory,'.cache/native-store-execution.tsx'));
 assert.ok(transformed.code.includes('useStoreAt'),'Authored use(store) was not compiled');
 const emitted=await transformWithOxc(transformed.code,'.cache/native-store-execution.tsx',{lang:'tsx',jsx:{runtime:'classic'}});
 await mkdir('.cache',{recursive:true});const filename=path.join(directory,'.cache/native-store-execution.mjs');await writeFile(filename,emitted.code);
 const app=await import(pathToFileURL(filename).href+'?test='+Date.now());
 const make=(id)=>{const host=new MemoryVDOMHost();const container=host.createContainer();const root=createNativeRoot(host,container,{rootId:id,scheduleCommit(){}});roots.push(root);root.mount(jsx(app.App,{}));return {root,container};};
 const left=make('native-left'),right=make('native-right');
 const walk=(node,key)=>node.props[key]==='yes'?node:node.children.map(child=>walk(child,key)).find(Boolean);
 const text=node=>(node.text??'')+node.children.map(text).join('');
 const readTotal=side=>text(walk(side.container,'data-total'));
 assert.equal(readTotal(left),'Total 10');
 walk(left.container,'data-total').props.onClick();left.root.flush();right.root.flush();
 assert.equal(readTotal(left),'Total 11');assert.equal(readTotal(right),'Total 11');
 app.a.beginTransition('slow',[left.root.rootId,right.root.rootId]);
 app.a.dispatch(20,{kind:'transition',transitionId:'slow'});
 left.root.flush();right.root.flush();assert.equal(readTotal(left),'Total 11');
 app.b.dispatch(12);left.root.flush();right.root.flush();assert.equal(readTotal(left),'Total 13');
 app.a.commitTransitionRoots('slow',[left.root.rootId,right.root.rootId],{finish:true});left.root.flush();right.root.flush();assert.equal(readTotal(left),'Total 32');assert.equal(readTotal(right),'Total 32');
 app.setFailure(true);app.b.dispatch(14);assert.throws(()=>left.root.flush(),/candidate failure/);assert.equal(readTotal(left),'Total 32');
 app.setFailure(false);left.root.flush();right.root.flush();assert.equal(readTotal(left),'Total 34','Failed store candidate lost pending work');
 app.a.beginTransition('T1',[left.root.rootId,right.root.rootId]);
 app.a.beginTransition('T2',[left.root.rootId,right.root.rootId]);
 app.a.dispatch(previous=>previous+2,{kind:'transition',transitionId:'T1'});
 app.a.dispatch(previous=>previous+3,{kind:'transition',transitionId:'T2'});
 app.a.commitTransitionRoots('T2',[right.root.rootId],{finish:true});right.root.flush();left.root.flush();
 assert.equal(readTotal(right),'Total 37');assert.equal(readTotal(left),'Total 34');
 app.a.commitTransitionRoots('T1',[left.root.rootId,right.root.rootId],{finish:true});left.root.flush();right.root.flush();
 assert.equal(readTotal(left),'Total 36');assert.equal(readTotal(right),'Total 39');
 app.a.commitTransitionRoots('T2',[left.root.rootId]);left.root.flush();right.root.flush();
 assert.equal(readTotal(left),'Total 39');assert.equal(readTotal(right),'Total 39');
 walk(right.container,'data-conditional').props.onClick();right.root.flush();assert.equal(text(walk(right.container,'data-conditional')),'Disabled');
 for(const root of roots)root.dispose();
 assert.deepEqual(app.a.diagnostics(),{roots:0,listeners:0,readers:0,retainedActions:0,transitions:0});
 assert.equal(app.b.diagnostics().roots,0);
 console.log('Compiled use(store) execution PASS (selectors, two roots, held transition, urgent replay, independent out-of-order projections, failed candidate retry and cleanup).');
}finally{for(const root of roots)root.dispose();plugin.closeBundle?.call({});}
