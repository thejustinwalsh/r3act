import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {openBrowser} from 'vitexec/cli';
const origin=process.env.NATIVE_TEST_ORIGIN??'https://async-transition-stress.localhost:1355';
const output=process.env.NATIVE_THREE_RESULT_DIR??'.cache/three-host-browser';
await mkdir(output,{recursive:true});
const sourcePath='src/browser/native_three_host.tsx';
const sha256=value=>createHash('sha256').update(value).digest('hex');
const errors=[];const websocketEvents=[];const consoleEvents=[];
const record=(list,value,limit=80)=>{if(list.length<limit)list.push(value);};
let browser;let originalSource;let sourceMayBePatched=false;let hmrProof=null;let currentPage;let primaryError;
const snapshot=page=>page.evaluate(()=>window.__nativeThreeDiagnostics.snapshot());
const frames=async(page,from,count=12)=>{
 const handle=await page.waitForFunction(({from,count})=>{
  const state=window.__nativeThreeDiagnostics?.snapshot();
  return state&&state.rendererFrames>=from+count&&
   state.requestedFrameEpoch===state.drawnFrameEpoch&&
   state.drawnFrameEpoch===state.hostFrameEpoch?state:false;
 },{from,count},{polling:'raf',timeout:15000});
 try{return await handle.jsonValue();}finally{await handle.dispose();}
};
const assertDraw=(state,label)=>{
 assert.equal(state.requestedFrameEpoch,state.drawnFrameEpoch,
  `${label}: a successful draw omitted the requested epoch`);
 assert.equal(state.drawnFrameEpoch,state.hostFrameEpoch,
  `${label}: drawn epoch differs from the committed Three marker`);
};
const assertActors=(state,label)=>assert.equal(state.activePhaseSetters,
 state.sceneObjects.length,`${label}: actor setter registration differs from live shapes`);
try{
 browser=await openBrowser({gpu:true});
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:960},reducedMotion:'no-preference'});
 const page=await context.newPage();currentPage=page;page.setDefaultTimeout(12000);page.setDefaultNavigationTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 page.on('console',message=>record(consoleEvents,{type:message.type(),text:message.text().slice(0,1000)}));
 page.on('websocket',socket=>{
  record(websocketEvents,{kind:'open',url:socket.url()});
  socket.on('framereceived',({payload})=>{
   const raw=String(payload);
   try{
    const frame=JSON.parse(raw);
    record(websocketEvents,{kind:'received',type:frame.type,event:frame.event,data:frame.data});
   }catch{record(websocketEvents,{kind:'received',raw:raw.slice(0,1000)});}
  });
  socket.on('close',()=>record(websocketEvents,{kind:'close',url:socket.url()}));
  socket.on('socketerror',error=>record(websocketEvents,{kind:'error',message:String(error).slice(0,1000)}));
 });
 await page.goto(origin+'/native-three-host.html',{waitUntil:'networkidle'});
 const initial=await frames(page,0,12);assertDraw(initial,'initial');assertActors(initial,'initial');
 const animated=await frames(page,initial.rendererFrames,24);assertDraw(animated,'animated');assertActors(animated,'animated');
 assert.equal(animated.sceneRenderCount,initial.sceneRenderCount,'frame updates rerendered scene owner');
 assert.equal(animated.actorRenderCount,initial.actorRenderCount,'frame updates rerendered kinetic owners');
 assert.ok(animated.phasePropWrites>initial.phasePropWrites,'compiled Three props did not advance');
 assert.ok(animated.requestedFrameEpoch>initial.requestedFrameEpoch,'playing frame epoch did not advance');
 assert.notDeepEqual(animated.sceneObjects.map(x=>x.rotation),initial.sceneObjects.map(x=>x.rotation));
 assert.deepEqual(animated.sceneObjects.map(x=>x.uuid),initial.sceneObjects.map(x=>x.uuid));
 assert.deepEqual(animated.host,initial.host,'frame updates changed host/resource lifetime');
 assert.equal(initial.sceneObjects[0].geometry,initial.sceneObjects[1].geometry);
 assert.equal(initial.sceneObjects[0].material,initial.sceneObjects[1].material);
 await page.locator('#toggle-motion').click();await page.waitForFunction(()=>!window.__nativeThreeDiagnostics.snapshot().playing);
 const pausing=await snapshot(page);const paused=await frames(page,pausing.rendererFrames,3);
 const still=await frames(page,paused.rendererFrames);assertDraw(paused,'paused');assertDraw(still,'still paused');
 assert.equal(still.phasePropWrites,paused.phasePropWrites);
 assert.equal(still.requestedFrameEpoch,paused.requestedFrameEpoch,'paused frame requests advanced');
 assert.equal(still.drawnFrameEpoch,paused.drawnFrameEpoch,'paused drawn epoch advanced');
 assertActors(still,'paused');
 const relay=still.projectedCenters.find(x=>x.id==='relay');assert.ok(Number.isFinite(relay.x)&&Number.isFinite(relay.y));
 await page.mouse.click(relay.x,relay.y);await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().selectedId==='relay');
 assert.ok((await snapshot(page)).pointerEvents>0,'native pointer did not raycast into scene');
 assert.match(await page.locator('#hud-mount').textContent(),/Ceramic relay/);
 await page.getByRole('button',{name:'Glacier',exact:true}).click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().sceneObjects.every(x=>x.color==='91c7ca'));
 const roughness=page.getByRole('slider',{name:'Surface roughness'});await roughness.focus();await roughness.press('End');
 await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().sceneObjects.every(x=>x.roughness===0.88));
 const updated=await snapshot(page);assert.deepEqual(updated.sceneObjects.map(x=>x.uuid),initial.sceneObjects.map(x=>x.uuid));
 await page.getByRole('button',{name:'Remove selected form',exact:true}).click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().sceneObjects.length===2);
 const removed=await snapshot(page);assert.equal(removed.host.disposedResources,initial.host.disposedResources+2);assert.equal(removed.host.liveResources,0);assert.equal(removed.borrowedAssetsDisposed,false);
 assertActors(removed,'removed keyed actor');
 assert.equal(removed.sceneObjects[0].geometry,initial.sceneObjects[0].geometry);assert.equal(removed.sceneObjects[0].material,initial.sceneObjects[0].material);
 await page.locator('#add-shape').click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().sceneObjects.length===3);
 const added=await snapshot(page);assertActors(added,'added keyed actor');await page.locator('#reorder-shape').click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().actualSceneOrder[0]!== 'orbit-a');
 const reordered=await snapshot(page);assertActors(reordered,'reordered keyed actors');assert.deepEqual(reordered.actualSceneOrder,[...added.actualSceneOrder.slice(1),added.actualSceneOrder[0]]);
 const ids=new Map(added.sceneObjects.map(x=>[x.id,x.uuid]));for(const object of reordered.sceneObjects)assert.equal(object.uuid,ids.get(object.id),'reorder replaced a keyed object');
 await page.locator('#add-shape').click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().host.liveResources===2);
 await page.locator('#reset-scene').click();await page.waitForFunction(()=>window.__nativeThreeDiagnostics.snapshot().selectedId==='orbit-a'&&window.__nativeThreeDiagnostics.snapshot().sceneObjects.length===3);
 const reset=await snapshot(page);assertActors(reset,'reset actors');assert.deepEqual(reset.actualSceneOrder,['orbit-a','orbit-b','relay']);assert.equal(reset.host.liveResources,2);
 assert.equal(reset.sceneObjects[0].uuid,initial.sceneObjects[0].uuid);assert.notEqual(reset.sceneObjects[2].uuid,initial.sceneObjects[2].uuid,'removed/reinserted form reused dead host identity');
 const resumed=await frames(page,reset.rendererFrames,12);assertDraw(resumed,'resumed');assertActors(resumed,'resumed');assert.equal(resumed.actorRenderCount,reset.actorRenderCount);assert.ok(resumed.phasePropWrites>reset.phasePropWrites);assert.ok(resumed.requestedFrameEpoch>reset.requestedFrameEpoch,'playing epoch did not resume');
 await page.screenshot({path:path.join(output,'desktop.png')});
 const token=randomUUID();const sessionKey=`r3act:three-hmr:${token}`;
 const oldTimeOrigin=await page.evaluate(({sessionKey,token})=>{
  const timeOrigin=performance.timeOrigin;
  window.addEventListener('pagehide',()=>{
   sessionStorage.setItem(sessionKey,JSON.stringify({token,timeOrigin,snapshot:window.__nativeThreeDiagnostics?.snapshot()}));
  },{once:true});
  return timeOrigin;
 },{sessionKey,token});
 originalSource=await readFile(sourcePath);
 await writeFile(path.join(output,'hmr-original-source.tsx'),originalSource);
 const patchedSource=Buffer.concat([originalSource,Buffer.from(`\n// native-three-hmr-probe:${token}\n`)]);
 hmrProof={schemaVersion:1,sourcePath,token,sessionKey,originalSha256:sha256(originalSource),patchedSha256:sha256(patchedSource),oldTimeOrigin};
 sourceMayBePatched=true;
 await writeFile(sourcePath,patchedSource);
 hmrProof.writtenSha256=sha256(await readFile(sourcePath));
 assert.equal(hmrProof.writtenSha256,hmrProof.patchedSha256,'HMR source edit was not written exactly');
 await page.waitForFunction(({sessionKey,token,oldTimeOrigin})=>{
  if(performance.timeOrigin===oldTimeOrigin||!window.__nativeThreeDiagnostics)return false;
  const stored=sessionStorage.getItem(sessionKey);
  if(!stored)return false;
  try{return JSON.parse(stored).token===token;}catch{return false;}
 },{sessionKey,token,oldTimeOrigin},{timeout:15000});
 const hmr=await page.evaluate(sessionKey=>{
  const retired=JSON.parse(sessionStorage.getItem(sessionKey));
  sessionStorage.removeItem(sessionKey);
  return {old:retired.snapshot,current:window.__nativeThreeDiagnostics.snapshot(),oldTimeOrigin:retired.timeOrigin,newTimeOrigin:performance.timeOrigin};
 },sessionKey);
 assert.notEqual(hmr.newTimeOrigin,hmr.oldTimeOrigin,'HMR did not create a new page realm');
 assert.equal(hmr.oldTimeOrigin,oldTimeOrigin,'retired pagehide snapshot belongs to a different page');
 hmrProof.newTimeOrigin=hmr.newTimeOrigin;
 hmrProof.reloadTimeOriginChanged=true;
 assert.ok(websocketEvents.some(event=>event.kind==='received'&&event.type==='custom'&&event.event==='r3act:invalidate-native-module'&&event.data?.sourceFile===sourcePath),'HMR invalidation frame was not observed');
 assert.ok(websocketEvents.some(event=>event.kind==='received'&&event.type==='full-reload'),'HMR full-reload frame was not observed');
 const hmrDraw=await frames(page,0,8);assertDraw(hmrDraw,'HMR remount');assertActors(hmrDraw,'HMR remount');
 assert.equal(hmr.old.disposed,true);assert.equal(hmr.old.activePhaseSetters,0);assert.equal(hmr.old.host.liveHandles,0);assert.equal(hmr.old.host.liveResources,0);assert.equal(hmr.old.host.eventRegistrations,0);assert.equal(hmr.old.borrowedAssetsDisposed,true);
 for(const key of ['roots','listeners','readers','retainedActions','transitions'])assert.equal(hmr.old.store[key],0,key+' survived HMR');
 assert.equal(hmr.current.sceneObjects.length,3);assertActors(hmr.current,'HMR current actors');assert.equal(await page.locator('#scene-canvas').count(),1);
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const disposed=await snapshot(page);assert.equal(disposed.activePhaseSetters,0);assert.equal(disposed.host.liveHandles,0);assert.equal(disposed.host.liveResources,0);assert.equal(disposed.host.eventRegistrations,0);assert.equal(disposed.borrowedAssetsDisposed,true);
 for(const key of ['roots','listeners','readers','retainedActions','transitions'])assert.equal(disposed.store[key],0,key+' survived disposal');
 await page.waitForTimeout(180);const disposedLater=await snapshot(page);
 for(const key of ['rendererFrames','requestedFrameEpoch','drawnFrameEpoch','phasePropWrites'])assert.equal(disposedLater[key],disposed[key],`${key} advanced after disposal`);
 assert.equal(disposedLater.activePhaseSetters,0,'actor setters survived disposal wait');
 const mobileContext=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},reducedMotion:'reduce'});const mobile=await mobileContext.newPage();mobile.setDefaultTimeout(12000);mobile.setDefaultNavigationTimeout(20000);mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(origin+'/native-three-host.html',{waitUntil:'networkidle'});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile overflow');
 const mobileInitial=await frames(mobile,0,6);const reduced=await frames(mobile,mobileInitial.rendererFrames,10);assertDraw(mobileInitial,'reduced-motion initial');assertDraw(reduced,'reduced-motion later');assertActors(reduced,'reduced-motion actors');assert.equal(reduced.phasePropWrites,mobileInitial.phasePropWrites,'reduced motion still animated JSX props');assert.equal(reduced.requestedFrameEpoch,mobileInitial.requestedFrameEpoch,'reduced motion requested another animation epoch');
 await mobile.screenshot({path:path.join(output,'mobile.png')});await mobile.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const mobileDisposed=await snapshot(mobile);await mobile.waitForTimeout(180);const mobileDisposedLater=await snapshot(mobile);assert.equal(mobileDisposed.activePhaseSetters,0);for(const key of ['rendererFrames','requestedFrameEpoch','drawnFrameEpoch'])assert.equal(mobileDisposedLater[key],mobileDisposed[key],`mobile ${key} advanced after disposal`);
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'results.json'),JSON.stringify({status:'PASS',initial,animated,paused,still,updated,removed,added,reordered,reset,resumed,hmr,hmrDraw,disposed,disposedLater,mobile:{initial:mobileInitial,reduced,disposed:mobileDisposed,disposedLater:mobileDisposedLater},errors,websocketEvents,consoleEvents},null,2));
 console.log('PASS Three WebGL: compiled frame props without owner rerenders; native raycast selection; material controls; keyed add/remove/reorder; shared/owned resources; reduced motion; HMR and teardown.');
}catch(error){
 primaryError=error;
 let currentSnapshot=null;
 try{currentSnapshot=currentPage&&!currentPage.isClosed()?await snapshot(currentPage):null;}catch{}
 await writeFile(path.join(output,'failure.json'),JSON.stringify({status:'FAIL',message:String(error),errors,currentSnapshot,hmrProof,websocketEvents,consoleEvents},null,2));
}finally{
 const cleanupErrors=[];
 try{await browser?.close();}catch(error){cleanupErrors.push(error);}
 if(sourceMayBePatched&&originalSource){
  try{
   await writeFile(sourcePath,originalSource);
   hmrProof.restoredSha256=sha256(await readFile(sourcePath));
   hmrProof.restoredMatchesOriginal=hmrProof.restoredSha256===hmrProof.originalSha256;
   if(!hmrProof.restoredMatchesOriginal)throw new Error('HMR source bytes did not restore exactly');
  }catch(error){cleanupErrors.push(error);}
  try{
   await writeFile(path.join(output,'hmr-source-proof.json'),JSON.stringify({...hmrProof,websocketEvents,consoleEvents},null,2));
  }catch(error){cleanupErrors.push(error);}
 }
 if(cleanupErrors.length){
  await writeFile(path.join(output,'cleanup-errors.json'),JSON.stringify(cleanupErrors.map(String),null,2));
  if(!primaryError)primaryError=new AggregateError(cleanupErrors,'Three verifier cleanup failed');
 }
}
if(primaryError)throw primaryError;
