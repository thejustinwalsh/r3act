/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import {Suspense,use,useState,useEffect,createStore,jsx} from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
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
