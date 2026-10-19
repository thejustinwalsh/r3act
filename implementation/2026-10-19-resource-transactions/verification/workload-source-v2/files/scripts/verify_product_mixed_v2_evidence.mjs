/** Independent recomputation; reads frozen evidence without changing it. */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const json = async name => JSON.parse(await readFile(name, "utf8"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const preregBytes = await readFile("results/product-mixed-v2-preregistration.json");
const prereg = JSON.parse(preregBytes);
const manifest = await json("results/product-mixed-v2-manifest.json");
const summary = await json("results/product-mixed-v2-summary.json");
assert.equal(manifest.status, "COLLECTION_COMPLETE");
assert.deepEqual(manifest.postCollectionChangedFiles, []);
assert.equal(manifest.preregistrationSha256, sha(preregBytes));
assert.equal(manifest.files.length, 30);
assert.equal(sha(await readFile(prereg.archive)), prereg.archiveSha256);
assert.equal(sha(await readFile(prereg.protocol)), prereg.protocolSha256);
assert.deepEqual((await readdir("results/product-mixed-v2")).sort(), prereg.schedule.map(s => `sequence-${String(s.sequence).padStart(2,"0")}.json`).sort());
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
const p95 = values => [...values].sort((a,b) => a-b)[Math.ceil(values.length*.95)-1];
const close = (actual, expected) => assert.ok(Math.abs(actual-expected)<1e-9, `${actual} != ${expected}`);
const rows = [];
for (const scheduled of prereg.schedule) {
  const record = manifest.files.find(f => f.sequence===scheduled.sequence);
  assert.ok(record);
  const bytes = await readFile(record.file); assert.equal(sha(bytes),record.sha256);
  const wrapper = JSON.parse(bytes); const r = wrapper.result;
  assert.deepEqual(wrapper.schedule,scheduled); assert.deepEqual(wrapper.browserErrors,[]);
  assert.equal(wrapper.preregistrationSha256,sha(preregBytes));
  assert.equal(wrapper.archiveSha256,prereg.archiveSha256); assert.equal(wrapper.protocolSha256,prereg.protocolSha256);
  assert.deepEqual(wrapper.endVisibility,{state:"visible",focused:true});
  assert.equal(r.status,"PASS"); assert.equal(r.production,true); assert.equal(r.mode,"confirm");
  assert.equal(r.samples.length,240);
  assert.deepEqual(r.samples.filter(x=>x.structural).map(x=>x.frame),[90,120,150,180,210,240,270,300]);
  assert.ok(Object.values(r.checks).every(v=>v===true));
  const values=r.samples.map(x=>x.commitMs);
  const ordinary=r.samples.filter(x=>!x.structural).map(x=>x.commitMs);
  const structural=r.samples.filter(x=>x.structural).map(x=>x.commitMs);
  rows.push({...scheduled,median:median(values),p95:p95(values),ordinaryMedian:median(ordinary),structuralP95:p95(structural),total:r.mountMs+values.reduce((a,b)=>a+b,0)+r.disposeMs});
}
assert.equal(summary.gate,"FAIL");
assert.deepEqual(summary.validation.invalidPages,[]);
assert.deepEqual(summary.validation.preregistrationErrors,[]);
assert.deepEqual(summary.validation.archiveContentErrors,[]);
for (const size of [128,512,1024]) {
  const pairs=Array.from({length:5},(_,pair)=>({native:rows.find(x=>x.size===size&&x.pair===pair&&x.arm==="native"),react:rows.find(x=>x.size===size&&x.pair===pair&&x.arm==="react")}));
  const ratios=pairs.map(x=>x.native.median/x.react.median);
  const geomean=Math.exp(ratios.reduce((s,r)=>s+Math.log(r),0)/5);
  const tail=median(pairs.map(x=>x.native.p95/x.react.p95));
  const s=summary.sizes.find(x=>x.size===size);
  for (const arm of ["native","react"]) {
    close(s.arms[arm].pageMedianOfPageMediansMs.all,median(pairs.map(x=>x[arm].median)));
    close(s.arms[arm].pageMedianOfPageMediansMs.ordinary,median(pairs.map(x=>x[arm].ordinaryMedian)));
    close(s.arms[arm].pageMedianOfPageP95sMs.structural,median(pairs.map(x=>x[arm].structuralP95)));
    close(s.arms[arm].pageMedianLifecycleCpuMs,median(pairs.map(x=>x[arm].total)));
  }
  if (size!==128) {
    close(s.decision.pairedMedianGeometricMeanRatio,geomean);
    close(s.decision.medianPairedP95Ratio,tail);
    assert.ok(geomean>prereg.decision.medianRatioMax && tail>prereg.decision.p95RatioMax);
  } else {
    assert.ok(pairs.some(x=>x.react.median<=prereg.clock.minPositiveDeltaMs*prereg.decision.minDenominatorTicks));
    assert.equal(s.decision.pairedMedianGeometricMeanRatio,null);
  }
}
const memoryDir="results/product-mixed-v2-memory";
const memory=await json(`${memoryDir}/results.json`); const mp=await json(`${memoryDir}/preregistration.json`);
assert.equal(memory.status,"PASS"); assert.equal(memory.records.length,6);
assert.equal(mp.frozenLatencyStudy.preregistrationSha256,sha(preregBytes));
assert.equal(mp.profilerSha256,sha(await readFile("scripts/profile_product_mixed_v2_memory.mjs")));
for (const record of memory.records) {
  const p=await json(`${memoryDir}/${record.file}`);
  assert.equal(p.status,"PASS"); assert.equal(p.harnessResult.samples.length,240);
  assert.ok(p.cdp.stoppedSamplingProfile.head); assert.ok(p.heapUsageAfterForcedGC.usedSize>0);
}
console.log("PASS independent evidence verification: 30 hash-locked pages, 7200 frames, exact paired ratios/FAIL gate, lifecycle totals and six separate memory profiles.");
