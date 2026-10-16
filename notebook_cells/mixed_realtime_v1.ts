const prereg = JSON.parse(await Deno.readTextFile("results/mixed-realtime-v1-preregistration.json"));
const manifest = JSON.parse(await Deno.readTextFile("results/mixed-realtime-v1-manifest.json"));
const summary = JSON.parse(await Deno.readTextFile("results/mixed-realtime-v1-summary.json"));
if (prereg.status !== "PREREGISTERED" || !manifest.status.startsWith("PASS") || manifest.files.length !== 30 || summary.pages !== 30) throw new Error("Mixed realtime v1 manifest is incomplete");
const hash = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b)=>b.toString(16).padStart(2,"0")).join("");
for (const locked of manifest.sourceLock.filter((item:any)=>item.matches)) {
  const bytes=await Deno.readFile(locked.path);
  if(bytes.length!==locked.bytes || await hash(bytes)!==locked.sha256) throw new Error(`Frozen source changed: ${locked.path}`);
}
if (manifest.sourceLockDrift?.length) console.warn("Protocol-file drift after collection:", manifest.sourceLockDrift.map((x:any)=>x.path).join(", "), "The preregistration JSON and locked benchmark sources remain available; do not call the complete source lock intact.");
const pages:any[]=[];
for(const entry of manifest.files){
  const bytes=await Deno.readFile(`results/mixed-realtime-v1/${entry.file}`);
  if(await hash(bytes)!==entry.sha256) throw new Error(`Raw record hash mismatch: ${entry.file}`);
  const page=JSON.parse(new TextDecoder().decode(bytes));
  const expected=prereg.schedule.find((x:any)=>x.trialId===page.trialId);
  if(!expected || page.sequence!==expected.sequence || page.arm!==expected.arm || page.entityCount!==expected.entityCount || page.replication!==expected.replication || page.status!=="PASS" || !page.outputParity || !page.stableNodeCount || !page.structureIdentityPass || !page.completeCommitCoverage || page.samples.length!==240 || page.structuralSamples!==8 || page.buildMode!=="production") throw new Error(`Raw record contract failed: ${entry.file}`);
  pages.push(page);
}
if(pages.length!==30 || pages.reduce((n,p)=>n+p.samples.length,0)!==7200) throw new Error("Unexpected sample count");
console.log(`Verified ${pages.length} visible production page loads, ${pages.length*240} frame samples, ${manifest.sourceLockValidated ?? manifest.sourceLock.filter((x:any)=>x.matches).length}/${manifest.sourceLock.length} frozen source files, and every raw SHA-256.`);
console.log("entity count | React median/p95 | runtime median/p95 | paired median ratio GM | median p95 ratio | structural p95 React/runtime");
for(const m of summary.metrics){
  const p=summary.paired.find((x:any)=>x.entityCount===m.entityCount);
  console.log(`${m.entityCount} | ${m.arms.react.medianPageMedianMs.toFixed(2)}/${m.arms.react.medianPageP95Ms.toFixed(2)} ms | ${m.arms.runtime.medianPageMedianMs.toFixed(2)}/${m.arms.runtime.medianPageP95Ms.toFixed(2)} ms | ${p.geometricMeanMedianRatio.toFixed(3)} | ${p.medianP95Ratio.toFixed(3)} | ${m.arms.react.medianStructuralP95Ms.toFixed(2)}/${m.arms.runtime.medianStructuralP95Ms.toFixed(2)} ms`);
}
console.log(`Preregistered decision: ${summary.decision.preregisteredSuccess ? "PASS" : "FAIL"}. Correctness contracts ${summary.decision.allContracts ? "pass" : "fail"}; median threshold at ${summary.decision.sizesMeetingGeomeanThreshold}/${summary.decision.requiredSizes} sizes; p95 guard ${summary.decision.p95GuardPassed ? "passes" : "fails"}.`);
const metricKeys=["medianPageMedianMs","medianPageP95Ms","medianStructuralP95Ms"];
const metricNames=["All-frame update→commit median","All-frame update→commit p95","Structural-frame update→commit p95"];
const colors={react:"#d97706",runtime:"#2563eb"};
for(let k=0;k<metricKeys.length;k++){
  const width=900,height=310,left=190,right=70,top=48,bottom=40;
  const rows=summary.metrics.flatMap((m:any)=>[{label:`${m.entityCount} · React`,value:m.arms.react[metricKeys[k]],color:colors.react},{label:`${m.entityCount} · Runtime`,value:m.arms.runtime[metricKeys[k]],color:colors.runtime}]);
  const max=Math.max(...rows.map((x:any)=>x.value))*1.12;
  const rowH=(height-top-bottom)/rows.length;
  const body=[`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricNames[k]}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif">`,`<title>${metricNames[k]}</title>`,`<text x="${width/2}" y="25" text-anchor="middle" font-size="17" font-weight="650" fill="#111827">${metricNames[k]} · lower is better</text>`];
  for(let tick=0;tick<=4;tick++){const value=max*tick/4,x=left+(width-left-right)*tick/4;body.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${height-bottom}" stroke="#e5e7eb"/><text x="${x}" y="${height-14}" text-anchor="middle" font-size="11" fill="#6b7280">${value.toFixed(1)} ms</text>`)}
  rows.forEach((r:any,i:number)=>{const y=top+i*rowH+4,w=(width-left-right)*r.value/max;body.push(`<text x="${left-10}" y="${y+rowH*.57}" text-anchor="end" font-size="12" fill="#374151">${r.label}</text><rect x="${left}" y="${y}" width="${w}" height="${rowH*.68}" rx="3" fill="${r.color}"/><text x="${left+w+7}" y="${y+rowH*.55}" font-size="11" fill="#111827">${r.value.toFixed(2)}</text>`)});
  body.push(`<text x="${width/2}" y="${height-1}" text-anchor="middle" font-size="10" fill="#6b7280">Median of five page-level summaries; page load is the replication unit.</text></svg>`);
  await Deno.jupyter.display(Deno.jupyter.svg`${body.join("")}`);
}
