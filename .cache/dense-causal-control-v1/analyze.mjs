import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const project=path.resolve(here,'../..');
const ledger=path.join(project,'.cache/dense-causal-ledger-v1');
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=async p=>sha(await readFile(p));
const sorted=a=>[...a].sort((x,y)=>x-y);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const median=a=>{assert.ok(a.length);const b=sorted(a);return(b[(b.length-1)>>1]+b[a.length>>1])/2};
const p95=a=>sorted(a)[Math.ceil(.95*a.length)-1];
const describe=a=>({n:a.length,min:Math.min(...a),median:median(a),p95:p95(a),max:Math.max(...a),range:[Math.min(...a),Math.max(...a)]});
const phases={
  dispatch:['native.dispatch.start','native.dispatch.end'],
  capture:['native.capture.start','native.capture.end'],
  resolution:['native.resolve.start','native.resolve.end'],
  validation_and_dependency_gather:['vdom.validate.start','vdom.validate.dependencies.end'],
  stage_setup:['vdom.validate.dependencies.end','vdom.stage.prepare.end'],
  mirror:['vdom.stage.prepare.end','vdom.mirror.end'],
  kernel:['vdom.kernel.start','vdom.kernel.end'],
  postkernel_stage:['vdom.kernel.end','vdom.stage.verify.end'],
  host_and_equality:['vdom.stage.verify.end','vdom.host.end'],
  cleanup:['vdom.cleanup.start','vdom.cleanup.end'],
  acknowledgement:['native.ack.start','native.ack.end'],
};
const markOrder=['commit.start','native.dispatch.start','native.dispatch.end','native.flush.start','native.capture.start','native.capture.end','native.resolve.start','native.resolve.end','vdom.validate.start','vdom.validate.packed.end','vdom.validate.dependencies.end','vdom.stage.prepare.end','vdom.mirror.end','vdom.kernel.start','vdom.kernel.end','vdom.stage.verify.end','vdom.host.end','vdom.cleanup.start','vdom.cleanup.end','native.ack.start','native.ack.end','native.flush.end','commit.end'];
const expectedChecks={output:true,order:true,identity:true,lifecycle:true,deadSetters:true,visible:true};
export function validatePage(r,slot,rows,plan,assets,diagnosticOrigin){
  assert.equal(r.schemaVersion,'dense-ledger-record-v1');
  assert.equal(r.status,'PASS');assert.equal(r.mode,slot.mode);assert.equal(r.arm,'native');assert.equal(r.rows,rows);
  assert.equal(r.nodeVersion,plan.sourceLocks.nodeVersion);
  assert.equal(r.sourceIdentity,slot.mode==='original'?'frozen-qualified-build04':'archived-source-diagnostic-snapshot');
  assert.equal(r.buildLockSha256,slot.mode==='original'?plan.sourceLocks.originalFrozenConfigSha256:plan.sourceLocks.diagnosticBuildLockSha256);
  assert.equal(r.origin,slot.mode==='original'?'https://react-runtime-headless.localhost:1355':diagnosticOrigin);
  assert.equal(new URL(r.origin).protocol,'https:');assert.ok(new URL(r.origin).hostname.endsWith('.localhost'));
  assert.equal(r.browser?.version,plan.sourceLocks.chromiumVersion);assert.equal(r.browser?.headless,true);assert.equal(r.browser?.gpu,false);
  assert.deepEqual(r.browser?.viewport,{width:1200,height:900});
  assert.equal(r.navigation?.status,200);assert.equal(r.navigation?.crossOriginIsolated,true);
  assert.equal(r.navigation?.headers?.['cross-origin-opener-policy'],'same-origin');
  assert.equal(r.navigation?.headers?.['cross-origin-embedder-policy'],'require-corp');
  assert.deepEqual(r.pageErrors,[]);assert.deepEqual(r.cleanupErrors,[]);assert.equal(r.stopReason,null);assert.equal(r.error,null);
  assert.ok(Number.isFinite(Date.parse(r.startedAt))&&Number.isFinite(Date.parse(r.completedAt))&&Date.parse(r.completedAt)>=Date.parse(r.startedAt));
  assert.ok(Date.parse(r.startedAt)>=Date.parse(plan.createdAt),'page predates preregistration');
  assert.ok(typeof r.runId==='string'&&r.runId.length>0);
  const x=r.result;
  assert.equal(x?.schemaVersion,'current-product-high-frequency-v1');assert.equal(x.status,'PASS');assert.equal(x.production,true);
  assert.equal(x.arm,'native');assert.equal(x.rows,rows);assert.equal(x.dirty,'all');assert.equal(x.placement,'contiguous');assert.equal(x.programs,'homogeneous');
  assert.equal(x.warmupFrames,60);assert.equal(x.measuredFrames,240);
  assert.equal(x.warmupSamples?.length,60);assert.equal(x.samples?.length,240);
  for(let i=0;i<60;i++){const s=x.warmupSamples[i];assert.equal(s.frame,i+1);assert.ok(finite(s.commitMs)&&s.commitMs>=0);assert.ok(finite(s.intervalMs)&&s.intervalMs>=0)}
  for(let i=0;i<240;i++){const s=x.samples[i];assert.equal(s.frame,i+61);assert.ok(finite(s.commitMs)&&s.commitMs>=0);assert.ok(finite(s.intervalMs)&&s.intervalMs>=0);assert.equal(s.dirtyCount,rows)}
  assert.deepEqual(x.checks,expectedChecks);assert.deepEqual(x.errors,[]);
  assert.deepEqual(x.active,{mounts:rows,cleanups:0,writers:rows});
  assert.deepEqual(x.afterDispose,{mounts:rows,cleanups:rows,writers:0});
  assert.equal(x.deadSetterProbeCount,rows);assert.equal(x.deadSetterThrows,rows);
  assert.equal(x.timingContract,'dirtyIds are selected once by this shared harness before the commit timer; selection runs identically for both arms and is excluded. step includes per-ID setter dispatch and synchronous host commit. DOM inspection and correctness checks run after the timer. mountAndFrameZeroInitializationMs includes arm creation, mount, and initial frame-zero state commit.');
  assert.ok(finite(r.timerQuantumMs)&&r.timerQuantumMs>0);
  const map=new Map(assets.map(a=>['/'+a.file,a.sha256]));
  const needed=['/high-frequency.html',...assets.filter(a=>a.file.endsWith('.js')||a.file.endsWith('.css')).map(a=>'/'+a.file).filter(p=>!p.includes('react_high_frequency_arm-'))];
  for(const item of r.assetResponses??[]){assert.equal(item.status,200);assert.equal(item.expectedSha256,map.get(item.path));assert.equal(item.sha256,item.expectedSha256)}
  for(const name of needed)assert.ok(r.assetResponses.some(a=>a.path===name&&a.sha256===map.get(name)),`missing served asset ${name}`);
  if(slot.mode==='original')assert.equal(x.ledger,undefined);
  else{
    assert.equal(x.ledger?.mode,slot.mode);assert.equal(x.ledger?.countScope,'measured-only-frames-61-300');
    assert.deepEqual(x.ledger?.counts,{});if(slot.mode==='off')assert.deepEqual(x.ledger?.events,[]);
  }
  return {median:median(x.samples.map(s=>s.commitMs)),p95:p95(x.samples.map(s=>s.commitMs)),timerQuantumMs:r.timerQuantumMs};
}
export function phasePage(r){
  const events=new Map();
  for(const e of r.result.ledger.events){assert.ok(Number.isInteger(e.frame)&&e.frame>=1&&e.frame<=300&&finite(e.atMs));const list=events.get(e.frame)??[];list.push(e);events.set(e.frame,list)}
  const duration=Object.fromEntries(Object.keys(phases).map(k=>[k,[]])),q=[];
  assert.equal(events.size,300,'missing or extra event frame');
  for(let frame=1;frame<=300;frame++){
    const list=events.get(frame);assert.ok(list?.length,`missing marks frame ${frame}`);
    assert.deepEqual(list.map(e=>e.label),markOrder,`wrong mark sequence frame ${frame}`);
    const marks=new Map();for(const e of list){assert.ok(!marks.has(e.label));marks.set(e.label,e.atMs)}
    for(let j=1;j<list.length;j++)assert.ok(list[j].atMs>=list[j-1].atMs);
    const sample=frame<=60?r.result.warmupSamples[frame-1]:r.result.samples[frame-61];
    const markedCommitMs=marks.get('commit.end')-marks.get('commit.start');
    assert.ok(markedCommitMs<=sample.commitMs+r.timerQuantumMs&&sample.commitMs-markedCommitMs<=5*r.timerQuantumMs,`commit marks do not reconcile frame ${frame}`);
    if(frame<=60)continue;
    const spans=[];let sum=0;
    for(const [name,[start,end]] of Object.entries(phases)){
      assert.ok(marks.has(start)&&marks.has(end),`missing ${name} frame ${frame}`);
      const a=marks.get(start),b=marks.get(end);assert.ok(a>=marks.get('commit.start')&&b<=marks.get('commit.end')&&b>=a);
      spans.push([a,b,name]);duration[name].push(b-a);sum+=b-a;
    }
    spans.sort((a,b)=>a[0]-b[0]);for(let j=1;j<spans.length;j++)assert.ok(spans[j][0]>=spans[j-1][1],`overlap frame ${frame}`);
    const residual=sample.commitMs-sum;assert.ok(residual>=-r.timerQuantumMs,`negative residual frame ${frame}`);q.push(residual);
  }
  return {phases:Object.fromEntries(Object.entries(duration).map(([k,v])=>[k,describe(v)])),q:describe(q),fiveTickFloorMs:5*r.timerQuantumMs};
}
export function assertOrderRun(r,slot,expectedSequence,state){
  assert.equal(slot.sequence,expectedSequence,'wrong preregistered slot order');
  assert.ok(!state.seenRuns.has(r.runId),'duplicate run');
  assert.ok(Date.parse(r.startedAt)>=state.previousCompleted,'recorded order/overlap mismatch');
  state.seenRuns.add(r.runId);
  state.previousCompleted=Date.parse(r.completedAt);
}
async function main(){
  const args=process.argv.slice(2),option=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]??null};
  assert.equal(args.length,4,'Usage: analyze.mjs --rows 1024|10000 --out NEW_JSON');
  const rows=Number(option('--rows'));assert.ok([1024,10000].includes(rows));
  assert.equal(process.version,'v24.18.0');
  const out=path.resolve(option('--out'));assert.ok(out.startsWith(here+path.sep));
  const plan=JSON.parse(await readFile(path.join(here,'protocol.json')));assert.equal(plan.schemaVersion,'dense-causal-control-protocol-v1');
  assert.equal(await hash(path.join(project,'results/current-owner-kernel-headless-v1/frozen-config.json')),plan.sourceLocks.originalFrozenConfigSha256);
  assert.equal(await hash(path.join(ledger,'build-lock.json')),plan.sourceLocks.diagnosticBuildLockSha256);
  assert.equal(await hash(path.join(ledger,'source-manifest.json')),plan.sourceLocks.diagnosticSourceManifestSha256);
  const frozen=JSON.parse(await readFile(path.join(project,'results/current-owner-kernel-headless-v1/frozen-config.json')));
  const lock=JSON.parse(await readFile(path.join(ledger,'build-lock.json')));assert.equal(lock.nativeIdentitySha256,plan.sourceLocks.nativeIdentitySha256);
  const selected=plan.sizes.find(s=>s.rows===rows);assert.ok(selected&&selected.blocks.length===6);
  const allPermutations=['original,off,on','original,on,off','off,original,on','off,on,original','on,original,off','on,off,original'];
  const orders=selected.blocks.map(b=>b.order.join(','));assert.deepEqual([...orders].sort(),[...allPermutations].sort());
  let seed=plan.seed>>>0,shuffled=[...allPermutations];
  for(let i=shuffled.length-1;i>0;i--){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;const j=seed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  assert.deepEqual(orders,shuffled,'block order differs from registered seed');
  const errors=[],pages=[],blocks=[];const orderState={seenRuns:new Set(),previousCompleted:-Infinity};let diagnosticOrigin=null;
  for(const block of selected.blocks){
    const p={block:block.block,order:block.order,pages:{},differences:null};
    for(const slot of block.slots){
      let r;
      try{
        assert.equal(slot.mode,block.order[pages.length%3]);
        r=JSON.parse(await readFile(path.join(project,slot.record)));
        if(slot.mode!=='original'&&!diagnosticOrigin)diagnosticOrigin=r.origin;
        const assetList=slot.mode==='original'?frozen.productionAssets:lock.assets.filter(a=>!a.file.endsWith('.map'));
        const summary=validatePage(r,slot,rows,plan,assetList,diagnosticOrigin);
        assertOrderRun(r,slot,pages.length+1,orderState);
        p.pages[slot.mode]={record:slot.record,runId:r.runId,startedAt:r.startedAt,completedAt:r.completedAt,...summary,...(slot.mode==='on'?phasePage(r):{})};
        pages.push({slot:slot.sequence,block:block.block,mode:slot.mode,record:slot.record,status:'PASS',...summary});
      }catch(error){errors.push({slot:slot.sequence,mode:slot.mode,record:slot.record,error:String(error)});pages.push({slot:slot.sequence,block:block.block,mode:slot.mode,record:slot.record,status:'INVALID',rawStatus:r?.status??null});}
    }
    if(['original','off','on'].every(m=>p.pages[m]))p.differences={
      off_minus_original:{median:p.pages.off.median-p.pages.original.median,p95:p.pages.off.p95-p.pages.original.p95},
      on_minus_off:{median:p.pages.on.median-p.pages.off.median,p95:p.pages.on.p95-p.pages.off.p95},
    };
    blocks.push(p);
  }
  const complete=errors.length===0&&blocks.every(b=>b.differences);
  const control=complete?Object.fromEntries(['off_minus_original','on_minus_off'].map(k=>[k,Object.fromEntries(['median','p95'].map(metric=>[metric,describe(blocks.map(b=>b.differences[k][metric]))]))])):null;
  const modePages=complete?Object.fromEntries(['original','off','on'].map(mode=>[mode,{pageMedians:describe(blocks.map(b=>b.pages[mode].median)),pageP95s:describe(blocks.map(b=>b.pages[mode].p95))}])):null;
  const phaseSummary=complete?Object.fromEntries(Object.keys(phases).map(name=>[name,{pageMedians:describe(blocks.map(b=>b.pages.on.phases[name].median)),pageP95s:describe(blocks.map(b=>b.pages.on.phases[name].p95)),belowFiveTickFloorPages:blocks.filter(b=>b.pages.on.phases[name].median<b.pages.on.fiveTickFloorMs).length}])):null;
  const referenceMs=complete?median(blocks.map(b=>b.pages.original.median)):null;
  const widthMs=complete?Math.max(...['off_minus_original','on_minus_off'].map(k=>control[k].median.max-control[k].median.min)):null;
  const p95ReferenceMs=complete?median(blocks.map(b=>b.pages.original.p95)):null;
  const p95WidthMs=complete?Math.max(...['off_minus_original','on_minus_off'].map(k=>control[k].p95.max-control[k].p95.min)):null;
  const medianMagnitudeMs=complete?Math.max(...['off_minus_original','on_minus_off'].flatMap(k=>[Math.abs(control[k].median.min),Math.abs(control[k].median.max)])):null;
  const p95MagnitudeMs=complete?Math.max(...['off_minus_original','on_minus_off'].flatMap(k=>[Math.abs(control[k].p95.min),Math.abs(control[k].p95.max)])):null;
  const dispatchAboveFloor=complete&&blocks.every(b=>b.pages.on.phases.dispatch.median>=b.pages.on.fiveTickFloorMs);
  const controlScreen=complete?(widthMs<=.10*referenceMs&&medianMagnitudeMs<=.10*referenceMs&&p95WidthMs<=.10*p95ReferenceMs&&p95MagnitudeMs<=.10*p95ReferenceMs&&dispatchAboveFloor?'PASS_DESCRIPTIVE_STABILITY_SCREEN':'UNSTABLE_OR_BELOW_FLOOR_STOP_UNRESOLVED'):'INVALID_STOP';
  const result={schemaVersion:'dense-causal-control-analysis-v1',rows,arm:'native',protocolSha256:await hash(path.join(here,'protocol.json')),status:complete?'DIAGNOSTIC':'INVALID',decisionGrade:false,pages,blocks,modePages,control,phaseSummary,
    referenceMs,controlMedianEnvelopeWidthMs:widthMs,controlMedianMagnitudeMs:medianMagnitudeMs,referenceP95Ms:p95ReferenceMs,controlP95EnvelopeWidthMs:p95WidthMs,controlP95MagnitudeMs:p95MagnitudeMs,dispatchAboveFiveTickFloor:dispatchAboveFloor,controlScreen,
    threshold:{strongWinTargetRatio:0.8,neededCurrentTotalShare:rows===1024 ? 0.395 : 0.465,interpretation:'Registered 0.8 requirement at this size; React denominator is fixed from the original qualification. This is not an observed saving.'},
    nextSizeGate:rows===1024?(controlScreen==='PASS_DESCRIPTIVE_STABILITY_SCREEN'?'PRIMARY_REVIEW_REQUIRED_FOR_10000':'STOP_10000_UNRESOLVED'):'FINITE_TARGETED_RECORDING_COMPLETE_STOP',
    tenThousandAutomaticallyEligible:false,semanticRemovableAndNewCostBounds:'ABSENT_REQUIRES_PRIMARY_REVIEW',
    errors,limits:['Independent unit is a fresh page/block; six blocks are descriptive, not a population confidence interval.','off−original includes diagnostic build shape, JIT and environment. on−off includes probes, JIT and environment. Their ranges are not guaranteed phase overhead corrections.','Phase pages are source-marked diagnostic gross costs; no sum of page medians is a savings estimate.','Semantic necessary floor and new mechanism cost are absent; no removable-share bound or decision-grade conclusion is computed.','No adaptive favorable retries. Preserve failures and stop after this one targeted recording.']};
  await writeFile(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(`${result.status} ${out}`);
  if(result.status!=='DIAGNOSTIC')process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
