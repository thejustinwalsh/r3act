/** @jsxImportSource react */
import React,{useLayoutEffect,useSyncExternalStore} from 'react';
import {createRoot,unmountComponentAtNode} from '@react-three/fiber/legacy';
import {OBJECTS,createView,gridX,gridY,phase,start,recordAcceptance} from './frame';
let time=0;const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
const getSnapshot=()=>time;
function Motion({speed,children}:{speed:number;children:React.ReactNode}){
 const value=useSyncExternalStore(subscribe,getSnapshot);
 return <group rotation-y={phase(value)*speed}>{children}</group>;
}
function Marker(){const value=useSyncExternalStore(subscribe,getSnapshot);
 useLayoutEffect(()=>{recordAcceptance(value);},[value]);
 return <group name="accepted-frame" position-x={value}/>;}
function App(){return <><Marker/><group name="objects">{Array.from({length:OBJECTS},(_,id)=><group key={id}
 name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}><Motion speed={id%4+1}>
 <mesh><boxGeometry args={[.12,.12,.12]}/><meshBasicMaterial color="orange"/></mesh>
 </Motion></group>)}</group></>;}
const view=createView(),root=createRoot(view.canvas);
await root.configure({gl:view.renderer,scene:view.scene,camera:view.camera,frameloop:'never',dpr:1,
 size:{width:640,height:480,top:0,left:0}});
root.render(<App/>);
start(view,{step(value,_epoch,draw){time=value;for(const fn of listeners)fn();draw();},
 async dispose(){await new Promise<void>(resolve=>unmountComponentAtNode(view.canvas,()=>resolve()));}});
