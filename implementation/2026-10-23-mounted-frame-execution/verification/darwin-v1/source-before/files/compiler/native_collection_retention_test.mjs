import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {transformWithOxc} from 'vite';
import {nativeModuleCompilerPlugin} from './vite_native_module.ts';
import {createNativeRoot} from '../src/native_runtime_api.ts';
import {MemoryVDOMHost} from '../src/vdom_snapshot_runtime.ts';
import {jsx} from '../src/jsx_binding_runtime.ts';
assert.equal(typeof globalThis.gc,'function','Run with --expose-gc');
const directory=path.resolve('.');const nativeImport=pathToFileURL(path.join(directory,'src/native_runtime_api.ts')).href;
const authored=`/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {jsx,createKeyedCollection} from ${JSON.stringify(nativeImport)};
export const rows=createKeyedCollection([{id:'dead',payload:{value:'removed'}},{id:'live',payload:{value:'surviving'}}],row=>row.id);
export function Row({row}:any){return <li data-id={row.id} onClick={()=>row.payload}>{row.id}</li>;}
export function List(){return <ul>{rows.map(row=><Row key={row.id} row={row}/>)}</ul>;}
export function App(){return <section><List/></section>;}
`;
const plugin=nativeModuleCompilerPlugin({root:directory});const context={addWatchFile(){},error(message){throw new Error(String(message))}};let root;
try{
 const transformed=await plugin.transform.call(context,authored,path.join(directory,'.cache/native-collection-retention.tsx'));
 const emitted=await transformWithOxc(transformed.code,'.cache/native-collection-retention.tsx',{lang:'tsx',jsx:{runtime:'classic'}});await mkdir('.cache',{recursive:true});const filename=path.join(directory,'.cache/native-collection-retention.mjs');await writeFile(filename,emitted.code);const app=await import(pathToFileURL(filename).href+'?test='+Date.now());
 const host=new MemoryVDOMHost(),container=host.createContainer();root=createNativeRoot(host,container,{scheduleCommit(){}});root.mount(jsx(app.App,{}));
 const removeAndTrack=()=>{const row=app.rows.get('dead');const weak=new WeakRef(row);assert.ok(app.rows.apply(app.rows.version,[{type:'remove',key:'dead'}]).ok);root.flush();return weak;};
 const weak=removeAndTrack();const control=(()=>new WeakRef({control:true}))();
 // Never dereference during this loop: deref keeps the object alive until the
 // end of the current job, which would invalidate a repeated GC probe.
 for(let cycle=0;cycle<8;cycle++){await new Promise(resolve=>setImmediate(resolve));globalThis.gc();}
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(control.deref(),undefined,'Control object retained; GC evidence is inconclusive');
 assert.equal(weak.deref(),undefined,'Removed row retained while its root remains mounted');
 assert.equal(app.rows.stats().retainedBatches,0);assert.equal(root.diagnostics().disposed,false);
 console.log('Compiled collection retention PASS: removed row collected while root remains mounted; control collected.');
}finally{root?.dispose();plugin.closeBundle?.call({});}
