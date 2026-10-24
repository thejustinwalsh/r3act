import * as THREE from 'three';
export const OBJECTS = 256;
export const WARMUP = 12;
export const MEASURED = 60;
export const phase = (time: number) => time % 1000 / 1000;
export const gridX = (id: number) => (id % 16 - 7.5) * .45;
export const gridY = (id: number) => (Math.floor(id / 16) - 7.5) * .45;
export type Sample = { epoch: number; requestedAt: number; rafTime: number;
  submitEnd: number; drawStart: number; drawEnd: number; acceptedTime: number;
  drawnEpoch: number; ageFrames: number; intervalMs: number | null };
export function createView() {
  const canvas = document.querySelector('canvas')!;
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.setSize(640,480,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.NoToneMapping;
  const scene=new THREE.Scene(); scene.background=new THREE.Color('black');
  const camera=Object.assign(new THREE.OrthographicCamera(-4,4,4,-4,.1,100),{manual:true as const});
  camera.position.z=10; camera.updateProjectionMatrix(); scene.add(camera);
  return {canvas,renderer,scene,camera};
}
export type View=ReturnType<typeof createView>;
const acceptanceEvents:Array<{time:number;at:number}>=[];
export const recordAcceptance=(time:number)=>acceptanceEvents.push({time,at:performance.now()});
export function start(view:View, arm:{ step(time:number,epoch:number,draw:()=>void):void;
  dispose():void|Promise<void>; diagnostics?:()=>Readonly<Record<string,number>> }) {
  const samples:Sample[]=[];
  const times=new Map<number,number>(); let stopped=false, handle=0, previous:number|undefined;
  let epoch=0; let resolveDone:(value:unknown)=>void, rejectDone:(error:unknown)=>void;
  const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
  const identities:THREE.Object3D[][]=[];
  const resources=new Map<THREE.BufferGeometry|THREE.Material,number>();
  let disposedResources=0,resolveDisposed!:()=>void;
  const allDisposed=new Promise<void>(resolve=>{resolveDisposed=resolve;});
  const track=()=>{
    const objects=view.scene.getObjectByName('objects')?.children??[];
    for(const object of objects){
      const motion=object.children[0],mesh=motion.children[0] as THREE.Mesh;
      identities.push([object,motion,mesh]);
      for(const resource of [mesh.geometry,mesh.material as THREE.Material]){
        if(resources.has(resource))throw new Error('Unexpected shared resource');
        resources.set(resource,0);
        resource.addEventListener('dispose',()=>{const count=resources.get(resource)!;
          resources.set(resource,count+1);
          if(count===0&&++disposedResources===resources.size)resolveDisposed();
        });
      }
    }
  };
  let disposal:Promise<{remaining:number;resources:number;exactDisposals:number}>|undefined;
  const dispose=()=>disposal??=(async()=>{ stopped=true; cancelAnimationFrame(handle);
    const errors:unknown[]=[];
    try{await arm.dispose();}catch(error){errors.push(error);}
    if(resources.size&&disposedResources<resources.size){
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try{await Promise.race([allDisposed,new Promise<void>((_resolve,reject)=>{
        timeout=setTimeout(()=>reject(new Error('Resource disposal deadline')),10000);
      })]);}catch(error){errors.push(error);}finally{clearTimeout(timeout);}
    }
    await new Promise<void>(resolve=>{
      if(typeof requestIdleCallback==='function')requestIdleCallback(()=>resolve(),{timeout:1000});
      else setTimeout(resolve,0);
    });
    try{view.scene.remove(view.camera);}catch(error){errors.push(error);}
    const remaining=view.scene.children.length;
    const disposed=[...resources.values()];
    try{view.renderer.dispose();}catch(error){errors.push(error);}
    try{view.renderer.forceContextLoss();}catch(error){errors.push(error);}
    if(remaining!==0 || resources.size!==OBJECTS*2 || disposed.some(count=>count!==1))
      errors.push(new Error(`Teardown mismatch ${remaining}/${resources.size}/${disposed.filter(count=>count!==1).length}`));
    if(errors.length)throw new AggregateError(errors,`Frame consumer cleanup failed: ${errors.map(String).join('; ')}`);
    return {remaining,resources:resources.size,exactDisposals:disposed.length}; })();
  const tick=(time:number)=>{
    if(stopped)return;
    try {
      if(epoch===0)track();
      epoch++; times.set(time,epoch); const requestedAt=performance.now(); let submitEnd=requestedAt;
      let drawCount=0;
      arm.step(time,epoch,()=>{
        submitEnd=performance.now(); drawCount++;
        const marker=view.scene.getObjectByName('accepted-frame');
        const acceptedTime=marker?.position.x ?? -1;
        const drawnEpoch=times.get(acceptedTime) ?? 0;
        const expected=phase(acceptedTime);
        const objects=view.scene.getObjectByName('objects')?.children ?? [];
        if(objects.length!==OBJECTS)throw new Error('Object membership mismatch');
        for(let id=0;id<objects.length;id++){
          const motion=objects[id].children[0];
          if(identities[id][0]!==objects[id]||identities[id][1]!==motion||identities[id][2]!==motion.children[0])
            throw new Error(`Retained identity mismatch ${id}`);
          if(!motion || Math.abs(motion.rotation.y-expected*(id%4+1))>1e-9)
            throw new Error(`Host value mismatch ${id}`);
        }
        const drawStart=performance.now(); view.renderer.render(view.scene,view.camera);
        const drawEnd=performance.now();
        samples.push({epoch,requestedAt,rafTime:time,submitEnd,drawStart,drawEnd,acceptedTime,
          drawnEpoch,ageFrames:epoch-drawnEpoch,intervalMs:previous===undefined?null:time-previous});
      });
      if(drawCount!==1)throw new Error(`Expected one draw, received ${drawCount}`);
      previous=time;
      if(epoch<WARMUP+MEASURED)handle=requestAnimationFrame(tick);
      else {
        const gl=view.renderer.getContext(), pixels=new Uint8Array(640*480*4);
        gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]||pixels[i+1]||pixels[i+2])lit++;
        if(!lit)throw new Error('Empty WebGL output');
        const proofDiagnostics=arm.diagnostics?.();
        resolveDone!({samples,accepted:acceptanceEvents,litPixels:lit,warmup:WARMUP,measured:MEASURED,
          ...(proofDiagnostics?{proofDiagnostics}:{}),
          interval:'RAF callback entry through application-requested draw; React commits may occur outside it',
          presentation:'No physical presentation observation'});
      }
    }catch(error){void dispose().then(()=>rejectDone!(error),cleanup=>
      rejectDone!(new AggregateError([error,cleanup],'Frame consumer and cleanup failed')));}
  };
  Object.assign(window,{__frameProgram:{done,dispose,recordAcceptance,
    ready:()=>view.scene.getObjectByName('objects')?.children.length===OBJECTS,
    run(){if(handle||stopped)throw new Error('Already started');handle=requestAnimationFrame(tick);}}});
  return {recordAcceptance};
}
