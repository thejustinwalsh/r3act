/** @jsxImportSource react */
import React,{useRef} from 'react';
import {createRoot,unmountComponentAtNode,useFrame} from '@react-three/fiber/legacy';
import type {Group} from 'three';
import {OBJECTS,createView,gridX,gridY,phase,start,recordAcceptance} from './frame';
let time=0;
function Motion({speed,children}:{speed:number;children:React.ReactNode}){
 const target=useRef<Group>(null);
 useFrame(()=>{target.current!.rotation.y=phase(time)*speed;},{phase:'update'});
 return <group ref={target}>{children}</group>;
}
function Marker(){const target=useRef<Group>(null);
 useFrame(()=>{target.current!.position.x=time;recordAcceptance(time);},{phase:'update'});
 return <group name="accepted-frame" ref={target}/>;}
function RenderTakeover(){useFrame(()=>{},{phase:'render'});return null;}
function App(){return <><Marker/><RenderTakeover/><group name="objects">{Array.from({length:OBJECTS},(_,id)=><group key={id}
 name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}><Motion speed={id%4+1}>
 <mesh><boxGeometry args={[.12,.12,.12]}/><meshBasicMaterial color="orange"/></mesh>
 </Motion></group>)}</group></>;}
const view=createView(),root=createRoot(view.canvas);
await root.configure({gl:view.renderer,scene:view.scene,camera:view.camera,frameloop:'never',dpr:1,
 size:{width:640,height:480,top:0,left:0}});
const store=root.render(<App/>);
start(view,{step(value,_epoch,draw){time=value;store.getState().advance(performance.now());draw();},
 async dispose(){await new Promise<void>(resolve=>unmountComponentAtNode(view.canvas,()=>resolve()));}});
