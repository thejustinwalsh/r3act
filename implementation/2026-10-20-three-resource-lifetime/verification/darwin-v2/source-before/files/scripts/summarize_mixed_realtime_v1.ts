const root = "results/mixed-realtime-v1";
const prereg = JSON.parse(await Deno.readTextFile("results/mixed-realtime-v1-preregistration.json"));
if (prereg.status !== "PREREGISTERED" || prereg.schedule.length !== 30) throw new Error("Invalid preregistration");

const sha256 = async (data: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map((b) => b.toString(16).padStart(2, "0")).join("");
const sourceHashes = [];
const sourceDrift = [];
for (const entry of prereg.sourceLock) {
  const bytes = await Deno.readFile(entry.path);
  const hash = await sha256(bytes);
  const matches = bytes.length === entry.bytes && hash === entry.sha256;
  if (!matches) sourceDrift.push({ path: entry.path, expectedBytes: entry.bytes, actualBytes: bytes.length, expectedSha256: entry.sha256, actualSha256: hash });
  sourceHashes.push({ ...entry, matches, actualBytes: bytes.length, actualSha256: hash });
}
if (sourceDrift.some((entry) => entry.path !== "mixed-realtime-study.md")) throw new Error(`Unexpected frozen-source mismatch: ${sourceDrift.map((x)=>x.path).join(", ")}`);
const files: string[] = [];
for await (const entry of Deno.readDir(root)) if (entry.isFile && entry.name.endsWith(".json")) files.push(entry.name);
files.sort();
if (files.length !== 30) throw new Error(`Expected 30 records; found ${files.length}`);
const pages: any[] = [];
const manifestFiles = [];
for (const file of files) {
  const bytes = await Deno.readFile(`${root}/${file}`);
  const hash = await sha256(bytes);
  const page = JSON.parse(new TextDecoder().decode(bytes));
  const expected = prereg.schedule.find((row: any) => row.trialId === page.trialId);
  if (!expected || page.sequence !== expected.sequence || page.replication !== expected.replication || page.entityCount !== expected.entityCount || page.arm !== expected.arm) throw new Error(`Schedule mismatch: ${file}`);
  if (page.schemaVersion !== "mixed-realtime-browser-v1" || page.status !== "PASS" || page.collection !== "mixed-v1" || page.buildMode !== "production" || page.browser.visibilityState !== "visible" || page.measuredFrames !== 240 || page.warmupFrames !== 60 || page.samples.length !== 240 || page.structuralSamples !== 8 || !page.outputParity || !page.stableNodeCount || !page.structureIdentityPass || !page.completeCommitCoverage) throw new Error(`Contract failure: ${file}`);
  for (const sample of page.samples) if (![sample.commitMs, sample.updateCpuMs, sample.intervalMs].every((n: number) => Number.isFinite(n) && n >= 0)) throw new Error(`Invalid sample in ${file}`);
  pages.push(page);
  manifestFiles.push({ file, trialId: page.trialId, sequence: page.sequence, replication: page.replication, entityCount: page.entityCount, arm: page.arm, sha256: hash });
}
if (new Set(pages.map((p) => p.trialId)).size !== 30) throw new Error("Duplicate trial IDs");

const median = (values: number[]) => { const sorted = [...values].sort((a,b)=>a-b); const n=sorted.length; return n%2 ? sorted[(n-1)/2] : (sorted[n/2-1]+sorted[n/2])/2; };
const pct = (values: number[], p: number) => { const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.max(0,Math.ceil(p*sorted.length)-1)]; };
const result: any = { schemaVersion: "mixed-realtime-v1-summary", status: sourceDrift.length ? "PASS_DATA_WITH_PROTOCOL_FILE_DRIFT" : "PASS_DATA_VALIDATION", pages: pages.length, measuredFrames: pages.length * 240, pageIsReplicationUnit: true, sourceLockValidated: sourceHashes.filter((x:any)=>x.matches).length, sourceLockDrift: sourceDrift, metrics: [], paired: [], decision: {} };
for (const n of [128,512,1024]) {
  const byArm: any = {};
  for (const arm of ["react","runtime"]) {
    const selected = pages.filter((p)=>p.entityCount===n&&p.arm===arm);
    byArm[arm] = {
      pageMedianMs: selected.map((p)=>p.commitLatencySummary.all.medianMs),
      pageP95Ms: selected.map((p)=>p.commitLatencySummary.all.p95Ms),
      structuralMedianMs: selected.map((p)=>p.commitLatencySummary.structuralFrames.medianMs),
      structuralP95Ms: selected.map((p)=>p.commitLatencySummary.structuralFrames.p95Ms),
      ordinaryMedianMs: selected.map((p)=>p.commitLatencySummary.ordinaryFrames.medianMs),
      mountMs: selected.map((p)=>p.mountMs),
      updateCpuMs: selected.map((p)=>p.updateCpuSummary.medianMs),
      rafP95Ms: selected.map((p)=>p.rafIntervalP95Ms),
    };
    if (selected.length !== 5) throw new Error(`Unbalanced cell ${n}/${arm}`);
  }
  for (const arm of ["react","runtime"]) {
    const x=byArm[arm];
    for (const key of ["pageMedianMs","pageP95Ms","structuralMedianMs","structuralP95Ms","ordinaryMedianMs","mountMs","updateCpuMs","rafP95Ms"]) x[`median${key[0].toUpperCase()}${key.slice(1)}`]=median(x[key]);
  }
  const paired = [];
  for (let replication=1;replication<=5;replication++) {
    const a=pages.find((p)=>p.entityCount===n&&p.replication===replication&&p.arm==="react");
    const b=pages.find((p)=>p.entityCount===n&&p.replication===replication&&p.arm==="runtime");
    paired.push({ replication, medianRatio:b.commitLatencySummary.all.medianMs/a.commitLatencySummary.all.medianMs, p95Ratio:b.commitLatencySummary.all.p95Ms/a.commitLatencySummary.all.p95Ms });
  }
  result.metrics.push({ entityCount:n, arms:byArm });
  result.paired.push({ entityCount:n, ratios:paired, geometricMeanMedianRatio:Math.exp(paired.reduce((s,x)=>s+Math.log(x.medianRatio),0)/paired.length), medianP95Ratio:median(paired.map((x)=>x.p95Ratio)), medianRatio:median(paired.map((x)=>x.medianRatio)), wins:paired.filter((x)=>x.medianRatio<1).length });
}
const meetsMedian=result.paired.filter((x:any)=>x.geometricMeanMedianRatio<=0.8).length;
const meetsP95=result.paired.every((x:any)=>x.medianP95Ratio<=1.1);
const allContracts=pages.every((p)=>p.status==="PASS"&&p.outputParity&&p.stableNodeCount&&p.structureIdentityPass&&p.completeCommitCoverage);
result.decision={ allContracts, sizesMeetingGeomeanThreshold:meetsMedian, requiredSizes:2, medianThresholdPassed:meetsMedian>=2, p95GuardPassed:meetsP95, preregisteredSuccess:allContracts&&meetsMedian>=2&&meetsP95 };
await Deno.writeTextFile("results/mixed-realtime-v1-summary.json", JSON.stringify(result,null,2)+"\n");
const manifest={ schemaVersion:"mixed-realtime-v1-manifest", status:sourceDrift.length?"PASS_WITH_PROTOCOL_FILE_DRIFT":"PASS", preregistration:"results/mixed-realtime-v1-preregistration.json", pageLoads:30, measuredFrames:7200, sourceLock:sourceHashes, sourceLockDrift:sourceDrift, files:manifestFiles };
await Deno.writeTextFile("results/mixed-realtime-v1-manifest.json", JSON.stringify(manifest,null,2)+"\n");
for (const row of result.metrics) console.log(`${row.entityCount} | React median/p95 ${row.arms.react.medianPageMedianMs.toFixed(2)}/${row.arms.react.medianPageP95Ms.toFixed(2)} ms | Runtime ${row.arms.runtime.medianPageMedianMs.toFixed(2)}/${row.arms.runtime.medianPageP95Ms.toFixed(2)} ms | structural p95 ${row.arms.react.medianStructuralP95Ms.toFixed(2)} vs ${row.arms.runtime.medianStructuralP95Ms.toFixed(2)} ms`);
for(const row of result.paired) console.log(`${row.entityCount}: paired median ratio GM=${row.geometricMeanMedianRatio.toFixed(3)}, median p95 ratio=${row.medianP95Ratio.toFixed(3)}, wins=${row.wins}/5`);
console.log(JSON.stringify(result.decision));
