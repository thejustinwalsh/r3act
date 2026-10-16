import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const work=path.resolve(here,'..');
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const sorted=a=>[...a].sort((x,y)=>x-y);
const median=a=>{assert.ok(a.length);const b=sorted(a);return(b[Math.floor((b.length-1)/2)]+b[Math.floor(b.length/2)])/2};
const p95=a=>sorted(a)[Math.ceil(a.length*.95)-1];
const describe=a=>({n:a.length,min:Math.min(...a),median:median(a),p95:p95(a),max:Math.max(...a),negative:a.filter(x=>x<0).length,positive:a.filter(x=>x>0).length});
const phasePairs={
  native_dispatch:['native.dispatch.start','native.dispatch.end'],
  native_capture:['native.capture.start','native.capture.end'],
  native_resolution:['native.resolve.start','native.resolve.end'],
  native_validation_and_dependency_gather:['vdom.validate.start','vdom.validate.dependencies.end'],
  native_stage_setup:['vdom.validate.dependencies.end','vdom.stage.prepare.end'],
  native_mirror:['vdom.stage.prepare.end','vdom.mirror.end'],
  native_kernel:['vdom.kernel.start','vdom.kernel.end'],
  native_postkernel_stage:['vdom.kernel.end','vdom.stage.verify.end'],
  native_host_and_equality:['vdom.stage.verify.end','vdom.host.end'],
  native_cleanup:['vdom.cleanup.start','vdom.cleanup.end'],
  native_ack:['native.ack.start','native.ack.end'],
  react_dispatch:['react.dispatch.start','react.dispatch.end'],
  react_internal_unresolved:['react.dispatch.end','react.flushSync.end'],
};
export function analyze(original,off,on,count){
  const inputs={original,off,on,count};
  for(const [mode,r] of Object.entries(inputs)){
    assert.equal(r?.schemaVersion,'dense-ledger-record-v1');assert.equal(r.status,'PASS');assert.equal(r.mode,mode);
    assert.equal(r.rows,original.rows);assert.equal(r.arm,original.arm);
    assert.equal(r.result?.status,'PASS');assert.equal(r.result?.samples?.length,240);
    assert.equal(r.result?.warmupSamples?.length,60);
    assert.deepEqual(r.result?.checks,{output:true,order:true,identity:true,lifecycle:true,deadSetters:true,visible:true});
    assert.deepEqual(r.result?.errors,[]);
    assert.deepEqual(r.result?.active,{mounts:r.rows,cleanups:0,writers:r.rows});
    assert.deepEqual(r.result?.afterDispose,{mounts:r.rows,cleanups:r.rows,writers:0});
    assert.equal(r.result?.deadSetterProbeCount,r.rows);
    assert.equal(r.result?.deadSetterThrows,r.arm==='native'?r.rows:0);
    assert.deepEqual(r.pageErrors,[]);assert.deepEqual(r.cleanupErrors,[]);assert.equal(r.stopReason,null);
    assert.equal(r.sourceIdentity,mode==='original'?'frozen-qualified-build04':'archived-source-diagnostic-snapshot');
    assert.equal(r.origin,mode==='original'?'https://react-runtime-headless.localhost:1355':off.origin);
    assert.ok(new URL(r.origin).protocol==='https:'&&new URL(r.origin).hostname.endsWith('.localhost'));
    assert.deepEqual(r.browser?.headless,true);assert.deepEqual(r.browser?.gpu,false);
    assert.deepEqual(r.browser?.viewport,{width:1200,height:900});
    assert.equal(r.browser?.version,original.browser?.version);
    assert.equal(r.navigation?.status,200);assert.equal(r.navigation?.crossOriginIsolated,true);
    assert.equal(r.navigation?.headers?.['cross-origin-opener-policy'],'same-origin');
    assert.equal(r.navigation?.headers?.['cross-origin-embedder-policy'],'require-corp');
    assert.equal(r.result?.arm,r.arm);assert.equal(r.result?.rows,r.rows);
    assert.equal(r.result?.dirty,'all');assert.equal(r.result?.placement,'contiguous');assert.equal(r.result?.programs,'homogeneous');
    assert.equal(r.result?.warmupFrames,60);assert.equal(r.result?.measuredFrames,240);
    for(const [index,s] of r.result.warmupSamples.entries())assert.equal(s.frame,index+1);
    for(const [index,s] of r.result.samples.entries())assert.equal(s.frame,index+61);
    assert.ok(finite(r.timerQuantumMs)&&r.timerQuantumMs>0);
    for(const s of r.result.samples)assert.ok(finite(s.commitMs)&&s.commitMs>=0&&s.dirtyCount===r.rows);
    assert.ok(r.assetResponses.length>=3&&r.assetResponses.every(a=>a.sha256===a.expectedSha256&&a.status===200));
  }
  assert.equal(off.buildLockSha256,on.buildLockSha256);assert.equal(on.buildLockSha256,count.buildLockSha256);
  assert.notEqual(original.buildLockSha256,on.buildLockSha256);
  assert.equal(off.origin,on.origin);assert.equal(on.origin,count.origin);
  assert.equal(off.result.ledger?.mode,'off');assert.deepEqual(off.result.ledger?.events,[]);
  assert.equal(on.result.ledger?.mode,'on');assert.deepEqual(on.result.ledger?.counts,{});
  assert.equal(count.result.ledger?.mode,'count');assert.deepEqual(count.result.ledger?.events,[]);
  for(const r of [off,on,count])assert.equal(r.result.ledger?.countScope,'measured-only-frames-61-300');
  assert.ok(Object.keys(count.result.ledger.counts).length>0);
  for(const value of Object.values(count.result.ledger.counts))assert.ok(Number.isSafeInteger(value)&&value>=0);
  assert.equal(count.result.ledger.counts[original.arm+'.setter.calls'],original.rows*240);
  const eventsByFrame=new Map();
  for(const e of on.result.ledger.events){
    assert.ok(Number.isInteger(e.frame)&&e.frame>=1&&e.frame<=300&&finite(e.atMs));
    const list=eventsByFrame.get(e.frame)??[];list.push(e);eventsByFrame.set(e.frame,list);
  }
  const phaseDurations={};const residual=[];const invalid=[];
  const wanted=original.arm==='native'?Object.keys(phasePairs).filter(x=>x.startsWith('native_')):Object.keys(phasePairs).filter(x=>x.startsWith('react_'));
  for(const name of wanted)phaseDurations[name]=[];
  for(let i=0;i<240;i++){
    const frame=i+61,events=eventsByFrame.get(frame)??[];
    assert.ok(events.length>0,`missing phase events for frame ${frame}`);
    for(let j=1;j<events.length;j++)assert.ok(events[j].atMs>=events[j-1].atMs,`nonmonotonic marks frame ${frame}`);
    const lookup=new Map();for(const e of events){assert.ok(!lookup.has(e.label),`duplicate mark ${e.label} frame ${frame}`);lookup.set(e.label,e.atMs)}
    assert.ok(lookup.has('commit.start')&&lookup.has('commit.end'));
    let sum=0;
    const intervals=[];
    for(const name of wanted){
      const [start,end]=phasePairs[name];
      if(!lookup.has(start)||!lookup.has(end)){invalid.push({frame,phase:name,reason:'missing boundary'});continue}
      const duration=lookup.get(end)-lookup.get(start);
      assert.ok(finite(duration)&&duration>=0);
      assert.ok(lookup.get(start)>=lookup.get('commit.start')&&lookup.get(end)<=lookup.get('commit.end'),`phase outside commit: ${name}`);
      intervals.push({name,start:lookup.get(start),end:lookup.get(end)});
      phaseDurations[name].push(duration);sum+=duration;
    }
    intervals.sort((a,b)=>a.start-b.start);
    for(let j=1;j<intervals.length;j++)assert.ok(intervals[j].start>=intervals[j-1].end,`overlapping phases ${intervals[j-1].name}/${intervals[j].name}`);
    residual.push(on.result.samples[i].commitMs-sum);
  }
  // Time pairs are from separate fresh pages at matching frame positions. They quantify drift plus overhead.
  const originalTimes=original.result.samples.map(x=>x.commitMs);
  const offTimes=off.result.samples.map(x=>x.commitMs);
  const onTimes=on.result.samples.map(x=>x.commitMs);
  const buildShapeDelta=offTimes.map((x,i)=>x-originalTimes[i]);
  const epsilon=onTimes.map((x,i)=>x-offTimes[i]);
  const phaseSummary=Object.fromEntries(Object.entries(phaseDurations).map(([k,v])=>[k,v.length===240?describe(v):{status:'UNRESOLVED',captured:v.length}]));
  const quantumMs=Math.max(.005,...Object.values(inputs).map(r=>r.timerQuantumMs));
  const floorMs=5*quantumMs;
  return {schemaVersion:'dense-ledger-analysis-v1',arm:original.arm,rows:original.rows,status:invalid.length||residual.some(x=>x<-quantumMs)?'UNRESOLVED':'DIAGNOSTIC',decisionGrade:false,
    interpretation:'One fresh original/off/on/count page per arm and size. Per-frame deltas include run drift; repeat controlled blocks before threshold decisions. Native validation interval also includes reached dependency gather. React internal render/host remain unresolved. Native host span includes equality and wrapper cost. GC is not timed separately.',
    sourceIdentities:{original:original.buildLockSha256,diagnostic:on.buildLockSha256},timer:{preregisteredQuantumMs:.005,observedQuantumMs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.timerQuantumMs])),fiveTickFloorMs:floorMs,belowFloor:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.result.samples.filter(s=>s.commitMs<floorMs).length]))},
    totals:{original:describe(originalTimes),off:describe(offTimes),on:describe(onTimes)},buildShapeDelta:describe(buildShapeDelta),epsilon:describe(epsilon),q:describe(residual),phases:phaseSummary,counts:count.result.ledger.counts,invalid,
    coldMountAndFrameZeroMs:Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.result.mountAndFrameZeroInitializationMs??null])),countScope:'measured-only-frames-61-300',
    limits:['Phase intervals are source-marked batch spans, not removable savings.','q includes every unassigned interval and timer/mark cost; negative q is retained.','Counter mode is separate and does not qualify phase time.','No GC pause or allocation fraction is inferred from whole-page samples.']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),option=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]??null};
  assert.equal(args.length,10,'Usage: analyze.mjs --original FILE --off FILE --on FILE --count FILE --out FILE');
  const read=async k=>JSON.parse(await readFile(path.resolve(option(k))));
  const result=analyze(await read('--original'),await read('--off'),await read('--on'),await read('--count'));
  await writeFile(path.resolve(option('--out')),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(result.status);
}
