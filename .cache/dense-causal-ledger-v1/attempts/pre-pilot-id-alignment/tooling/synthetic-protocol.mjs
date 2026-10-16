import assert from 'node:assert/strict';
import { analyze } from './analyze.mjs';
const checks={output:true,order:true,identity:true,lifecycle:true,deadSetters:true,visible:true};
const warm=()=>Array.from({length:60},(_,i)=>({frame:i+1,commitMs:1,intervalMs:16}));
const samples=rows=>Array.from({length:240},(_,i)=>({frame:i+61,dirtyCount:rows,commitMs:1,intervalMs:16}));
const diagnosticOrigin='https://dense-ledger.localhost:1355';
function record(mode,arm='react'){
  const rows=128;
  return {schemaVersion:'dense-ledger-record-v1',status:'PASS',mode,arm,rows,timerQuantumMs:.005,
    sourceIdentity:mode==='original'?'frozen-qualified-build04':'archived-source-diagnostic-snapshot',
    origin:mode==='original'?'https://react-runtime-headless.localhost:1355':diagnosticOrigin,
    browser:{version:'synthetic-browser',headless:true,gpu:false,viewport:{width:1200,height:900}},
    navigation:{status:200,crossOriginIsolated:true,headers:{'cross-origin-opener-policy':'same-origin','cross-origin-embedder-policy':'require-corp'}},
    buildLockSha256:mode==='original'?'base':'diag',pageErrors:[],cleanupErrors:[],stopReason:null,
    assetResponses:[1,2,3].map((_,i)=>({path:String(i),status:200,sha256:'a',expectedSha256:'a'})),
    result:{status:'PASS',arm,rows,dirty:'all',placement:'contiguous',programs:'homogeneous',warmupFrames:60,measuredFrames:240,
      checks,errors:[],active:{mounts:rows,cleanups:0,writers:rows},afterDispose:{mounts:rows,cleanups:rows,writers:0},deadSetterProbeCount:rows,deadSetterThrows:arm==='native'?rows:0,
      warmupSamples:warm(),samples:samples(rows),ledger:mode==='original'?undefined:{mode,countScope:'measured-only-frames-61-300',events:[],counts:{}}}};
}
const reactLabels=['commit.start','react.flushSync.start','react.dispatch.start','react.dispatch.end','react.flushSync.end','commit.end'];
const nativeLabels=['commit.start','native.dispatch.start','native.dispatch.end','native.flush.start','native.capture.start','native.capture.end','native.resolve.start','native.resolve.end','vdom.validate.start','vdom.validate.packed.end','vdom.validate.dependencies.end','vdom.stage.prepare.end','vdom.mirror.end','vdom.kernel.start','vdom.kernel.end','vdom.stage.verify.end','vdom.host.end','vdom.cleanup.start','vdom.cleanup.end','native.ack.start','native.ack.end','native.flush.end','commit.end'];
function setMarks(on,labels){for(let frame=1;frame<=300;frame++)on.result.ledger.events.push(...labels.map((label,i)=>({frame,label,atMs:frame*10+i*.01})))}
function suite(arm,labels){
  const original=record('original',arm),off=record('off',arm),on=record('on',arm),count=record('count',arm);
  count.result.ledger.counts[arm+'.setter.calls']=128*240;
  setMarks(on,labels);
  assert.equal(analyze(original,off,on,count).status,'DIAGNOSTIC');
  const missingLabel=arm==='native'?'vdom.kernel.end':'react.dispatch.end';
  const missing=structuredClone(on);missing.result.ledger.events=missing.result.ledger.events.filter(e=>!(e.frame===61&&e.label===missingLabel));
  assert.equal(analyze(original,off,missing,count).status,'UNRESOLVED');
  const negative=structuredClone(on);negative.result.samples[0].commitMs=.001;
  assert.equal(analyze(original,off,negative,count).status,'UNRESOLVED');
  const wrongFrames=structuredClone(off);wrongFrames.result.samples[0].frame=62;assert.throws(()=>analyze(original,wrongFrames,on,count));
  const wrongCountScope=structuredClone(count);wrongCountScope.result.ledger.countScope='warmup-plus-measured';assert.throws(()=>analyze(original,off,on,wrongCountScope));
  const wrongCount=structuredClone(count);wrongCount.result.ledger.counts[arm+'.setter.calls']=128*300;assert.throws(()=>analyze(original,off,on,wrongCount));
  const sourceDrift=structuredClone(off);sourceDrift.buildLockSha256='other';assert.throws(()=>analyze(original,sourceDrift,on,count));
  const cleanupFailure=structuredClone(on);cleanupFailure.cleanupErrors=['browser close failed'];assert.throws(()=>analyze(original,off,cleanupFailure,count));
  const disposalFailure=structuredClone(on);disposalFailure.result.afterDispose.writers=1;assert.throws(()=>analyze(original,off,disposalFailure,count));
  const partial=structuredClone(on);partial.status='INCOMPLETE';assert.throws(()=>analyze(original,off,partial,count));
  const wrongAsset=structuredClone(on);wrongAsset.assetResponses[0].sha256='bad';assert.throws(()=>analyze(original,off,wrongAsset,count));
  const wrongOrigin=structuredClone(off);wrongOrigin.origin='https://other.localhost';assert.throws(()=>analyze(original,wrongOrigin,on,count));
  const wrongBrowser=structuredClone(off);wrongBrowser.browser.headless=false;assert.throws(()=>analyze(original,wrongBrowser,on,count));
  const mountEvent=structuredClone(on);mountEvent.result.ledger.events.unshift({frame:0,label:'native.mount',atMs:0});assert.throws(()=>analyze(original,off,mountEvent,count));
  const disposalEvent=structuredClone(on);disposalEvent.result.ledger.events.push({frame:301,label:'dispose',atMs:9999});assert.throws(()=>analyze(original,off,disposalEvent,count));
}
suite('react',reactLabels);
suite('native',nativeLabels);
console.log('Synthetic protocol checks passed for native and React');
