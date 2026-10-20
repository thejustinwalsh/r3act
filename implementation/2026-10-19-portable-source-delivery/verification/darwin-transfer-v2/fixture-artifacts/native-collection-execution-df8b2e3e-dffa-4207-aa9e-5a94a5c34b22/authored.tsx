/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {jsx,useState,useEffect,createKeyedCollection} from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
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
