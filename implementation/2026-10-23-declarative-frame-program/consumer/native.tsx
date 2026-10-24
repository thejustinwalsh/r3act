/** @jsxImportSource @r3act/host-three */
// @native-ui
import {createNativeFrameLoop,useFrame,useState,type RuntimeNode} from '@r3act/core';
import {createThreeNativeRoot} from '@r3act/host-three';
import {OBJECTS,WARMUP,MEASURED,createView,gridX,gridY,start,recordAcceptance} from './frame';
function Motion(props:{speed:number;children?:RuntimeNode}) {
  const frame=useFrame();
  return <group key="motion" rotation-y={(frame.timeMs % 1000 / 1000)*props.speed}>{props.children}</group>;
}
function Marker(){const frame=useFrame();return <group key="marker" name="accepted-frame" position-x={frame.timeMs}/>;}
function CallbackProbe(){
  const [position,setPosition]=useState(0);
  useFrame(frame=>setPosition(previous=>previous+frame.delta),[],{phase:'early'});
  return <group key="callback-probe" name="callback-probe" position-x={position}/>;
}
function App(){return <><Marker/>{proof?<CallbackProbe/>:null}<group name="objects">{Array.from({length:OBJECTS},(_,id)=><group key={id}
  name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}><Motion speed={id%4+1}>
  <mesh><boxGeometry args={[.12,.12,.12]}/><meshBasicMaterial color="orange"/></mesh>
  </Motion></group>)}</group></>;}
const proof=new URLSearchParams(location.search).get('proof')==='1';
const counters:Record<string,number>={};
const view=createView(),host=createThreeNativeRoot(view.scene,proof?{rootOptions:{
  profileCounter(frame){for(const [name,count] of Object.entries(frame))
    counters[name]=(counters[name]??0)+count;}
}}:{});
host.root.mount(<App/>);
if(proof)for(const name of Object.keys(counters))delete counters[name];
let drawCurrent=()=>{},expectedPosition=0;
const loop=createNativeFrameLoop({declarative:true,roots:[{root:host.root,stores:[]}],
  draw(frame){recordAcceptance(frame.timeMs);drawCurrent();}});
start(view,{step(time,_epoch,draw){drawCurrent=draw;const result=loop.advance(time);
  if(result.status!=='drawn')throw result.error??new Error(`Native frame ${result.status}`);
  if(proof){expectedPosition+=result.frame.deltaMs/1000;
    const probe=view.scene.getObjectByName('callback-probe');
    if(!probe||Math.abs(probe.position.x-expectedPosition)>1e-10)
      throw new Error(`Installed frame callback position mismatch ${probe?.position.x}/${expectedPosition}`);
  }},
  dispose(){const errors:unknown[]=[];
    try{loop.dispose();}catch(error){errors.push(error);}
    try{host.dispose();}catch(error){errors.push(error);}
    if(errors.length)throw new AggregateError(errors,'Native frame arm cleanup failed');},
  ...(proof?{diagnostics(){
    const ownedDataVerifiedRows=counters['store.owned-data.verified-rows']??0;
    const ownedDataBatches=counters['store.owned-data.batches']??0;
    if(ownedDataVerifiedRows<OBJECTS||ownedDataBatches<1)
      throw new Error(`Owned frame batch proof missing ${ownedDataVerifiedRows}/${ownedDataBatches}`);
    const componentRenders=counters['owner.component-renders']??0;
    if(componentRenders!==0)throw new Error(`Scalar RAF reconstructed ${componentRenders} components`);
    const directCuts=counters['store.mounted-frame.direct-cuts']??0;
    if(directCuts!==WARMUP+MEASURED)throw new Error(`Scalar RAF entered generic traversal instead of direct cuts: ${directCuts}/${WARMUP+MEASURED}`);
    return {ownedDataVerifiedRows,ownedDataBatches,componentRenders,directCuts,callbackPosition:expectedPosition,
      ownedDataRows:counters['store.owned-data.rows']??0};
  }}:{})});
