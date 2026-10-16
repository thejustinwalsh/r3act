const schedule = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v6-production-preregistration.json",
));
const manifest = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v6-production-manifest.json",
));
const sourceLock = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v6-production-source-lock.json",
));
const sourceSnapshot = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v6-source-snapshot-manifest.json",
));
if (
  schedule.status !== "PREREGISTERED" || schedule.pages.length !== 75 ||
  manifest.status !== "PASS" || manifest.pageLoads !== 75 ||
  manifest.measuredSamples !== 22500 || sourceLock.status !== "FROZEN_BEFORE_COLLECTION" ||
  sourceSnapshot.status !== "PASS" || sourceSnapshot.fileCount !== sourceLock.files.length
) throw new Error("V6 preregistration, manifest, or source lock is incomplete");

const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
for (const entry of sourceLock.files) {
  const bytes = await Deno.readFile(`${sourceSnapshot.snapshotRoot}/${entry.path}`);
  if (bytes.byteLength !== entry.bytes || await hash(bytes) !== entry.sha256) {
    throw new Error(`V6 archived source lock mismatch: ${entry.path}`);
  }
}
for (const dependency of sourceSnapshot.supplementalDependencies ?? []) {
  const bytes = await Deno.readFile(`${sourceSnapshot.snapshotRoot}/${dependency.snapshotPath}`);
  if (bytes.byteLength !== dependency.bytes || await hash(bytes) !== dependency.sha256) {
    throw new Error(`V6 supplemental dependency hash mismatch: ${dependency.sourcePath}`);
  }
}
const pages: any[] = [];
for (const entry of manifest.files) {
  const path = `results/${entry.path}`;
  const bytes = await Deno.readFile(path);
  if (await hash(bytes) !== entry.sha256) throw new Error(`Raw hash mismatch: ${path}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  const expected = schedule.pages.find((page: any) => page.trialId === record.trialId);
  if (
    !expected || record.schemaVersion !== "snake-frame-browser-v6" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.buildMode !== "production" || record.collection !== "production-v6" ||
    record.arm !== expected.arm || record.segmentCount !== expected.segmentCount ||
    record.measuredFrames !== 300 || record.samples.length !== 300 ||
    !record.completeCommitCoverage || !record.allOutputMatches ||
    !record.stableNodeCount || !record.stableNodeIdentity
  ) throw new Error(`V6 page contract failed: ${path}`);
  pages.push({ ...record, replication: expected.replication });
}
if (pages.length !== 75) throw new Error("Expected 75 V6 pages");
const arms = ["react", "runtime", "generated-vdom", "columnar-vdom", "direct"];
const sizes = [128, 512, 1024];
for (const size of sizes) for (const arm of arms) {
  if (pages.filter((page) => page.segmentCount === size && page.arm === arm).length !== 5) {
    throw new Error(`V6 balance failure: ${size}/${arm}`);
  }
}
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const stats = (page: any) => ({
  commit: median(page.samples.map((sample: any) => sample.commitMs)),
  commitP95: percentile(page.samples.map((sample: any) => sample.commitMs), 0.95),
  cpu: median(page.samples.map((sample: any) => sample.updateCpuMs)),
  rafP95: percentile(page.samples.map((sample: any) => sample.intervalMs), 0.95),
  mount: page.mountMs,
});
const summaries = [];
for (const size of sizes) for (const arm of arms) {
  const selected = pages.filter((page) => page.segmentCount === size && page.arm === arm);
  const values = selected.map(stats);
  summaries.push({
    size,
    arm,
    mount: median(values.map((value) => value.mount)),
    cpu: median(values.map((value) => value.cpu)),
    commit: median(values.map((value) => value.commit)),
    commitP95: median(values.map((value) => value.commitP95)),
    rafP95: median(values.map((value) => value.rafP95)),
  });
}
console.log("V6 production: medians across five isolated page-load summaries; milliseconds");
console.log("segments | arm | mount | update CPU | update-to-commit median / p95 | RAF interval p95");
for (const row of summaries) {
  console.log(`${row.size} | ${row.arm} | ${row.mount.toFixed(3)} | ${row.cpu.toFixed(3)} | ${row.commit.toFixed(3)} / ${row.commitP95.toFixed(3)} | ${row.rafP95.toFixed(2)}`);
}
console.log("Paired commit-median ratios vs React (matching replication; <1 favors candidate)");
for (const size of sizes) for (const arm of arms.filter((value) => value !== "react")) {
  const ratios = [];
  for (let replication = 1; replication <= 5; replication++) {
    const react = pages.find((page) => page.segmentCount === size && page.arm === "react" && page.replication === replication);
    const candidate = pages.find((page) => page.segmentCount === size && page.arm === arm && page.replication === replication);
    ratios.push(stats(candidate).commit / stats(react).commit);
  }
  console.log(`${size} | ${arm} | ${median(ratios).toFixed(3)}× React; ${ratios.filter((ratio) => ratio < 1).length}/5 paired pages faster`);
}
console.log("Paired update-CPU median ratios: columnar VDOM vs scalar generated VDOM and runtime VDOM");
for (const size of sizes) for (const comparison of ["generated-vdom", "runtime"]) {
  const ratios = [];
  for (let replication = 1; replication <= 5; replication++) {
    const baseline = pages.find((page) => page.segmentCount === size && page.arm === comparison && page.replication === replication);
    const columnar = pages.find((page) => page.segmentCount === size && page.arm === "columnar-vdom" && page.replication === replication);
    ratios.push(stats(columnar).cpu / stats(baseline).cpu);
  }
  console.log(`${size} | columnar / ${comparison} | ${median(ratios).toFixed(3)}×; ${ratios.filter((ratio) => ratio < 1).length}/5 paired pages lower`);
}

// Exploratory mount amortization: how many measured updates offset extra mount time?
const breakEvenRows: Array<{
  size: number;
  arm: string;
  medianUpdates: number | null;
  minimumUpdates: number | null;
  maximumUpdates: number | null;
  finitePairs: number;
}> = [];
console.log("Exploratory mount-amortization estimate vs React (updates to offset mount difference)");
for (const size of sizes) for (const arm of arms.filter((value) => value !== "react")) {
  const estimates: Array<number | null> = [];
  for (let replication = 1; replication <= 5; replication++) {
    const react = pages.find((page) => page.segmentCount === size && page.arm === "react" && page.replication === replication);
    const candidate = pages.find((page) => page.segmentCount === size && page.arm === arm && page.replication === replication);
    const extraMount = candidate.mountMs - react.mountMs;
    const perUpdateSaving = stats(react).commit - stats(candidate).commit;
    estimates.push(extraMount <= 0 ? 0 : perUpdateSaving > 0 ? Math.ceil(extraMount / perUpdateSaving) : null);
  }
  const finite = estimates.filter((value): value is number => value !== null).sort((a, b) => a - b);
  const summary = finite.length ? {
    medianUpdates: median(finite),
    minimumUpdates: finite[0],
    maximumUpdates: finite.at(-1)!,
  } : { medianUpdates: null, minimumUpdates: null, maximumUpdates: null };
  breakEvenRows.push({ size, arm, ...summary, finitePairs: finite.length });
  console.log(`${size} | ${arm} | ${summary.medianUpdates === null ? "no crossover" : `${summary.medianUpdates} updates (${summary.minimumUpdates}–${summary.maximumUpdates})`} | ${finite.length}/5 pairs`);
}
console.log("This post-hoc estimate uses each paired page's mount time and median update-to-commit time; it excludes compilation, page load, teardown, and presentation, and is especially coarse near the 0.1 ms timer floor.");

const colors: Record<string, string> = {
  react: "#bf5b34", runtime: "#286f86", "generated-vdom": "#455bd4",
  "columnar-vdom": "#168267", direct: "#6d7789",
};
const plot = (title: string, metric: "commit" | "cpu" | "rafP95") => {
  const width = 1000, height = 390, left = 74, right = 24, top = 58, bottom = 58;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const maximum = Math.max(...summaries.map((row: any) => row[metric])) * 1.14 || 1;
  const x = (index: number) => left + chartWidth * index / (sizes.length - 1);
  const y = (value: number) => top + chartHeight - chartHeight * value / maximum;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = maximum * index / 4;
    return `<line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" stroke="#e4e7eb"/><text x="${left-9}" y="${y(value)+4}" text-anchor="end" fill="#56616d" font-size="11">${value.toFixed(metric === "rafP95" ? 1 : 2)}</text>`;
  }).join("");
  const lines = arms.map((arm) => {
    const values = sizes.map((size) => summaries.find((row: any) => row.size === size && row.arm === arm)[metric]);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    const dots = values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="4" fill="white" stroke="${colors[arm]}" stroke-width="2"/>`).join("");
    return `<polyline points="${points}" fill="none" stroke="${colors[arm]}" stroke-width="2.5"/>${dots}`;
  }).join("");
  const labels = sizes.map((size, index) => `<text x="${x(index)}" y="${height-28}" text-anchor="middle" fill="#424b55" font-size="12">${size}</text>`).join("");
  const legend = arms.map((arm, index) => `<line x1="${left+index*178}" x2="${left+24+index*178}" y1="24" y2="24" stroke="${colors[arm]}" stroke-width="3"/><text x="${left+30+index*178}" y="28" fill="#323b45" font-size="11">${arm}</text>`).join("");
  const yLabel = metric === "rafP95" ? "RAF interval p95 (ms)" : metric === "cpu" ? "Update CPU median (ms)" : "Update-to-commit median (ms)";
  return Deno.jupyter.svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${title}</title><rect width="100%" height="100%" fill="white"/>${legend}${grid}<line x1="${left}" x2="${left}" y1="${top}" y2="${top+chartHeight}" stroke="#94a3b8"/><line x1="${left}" x2="${width-right}" y1="${top+chartHeight}" y2="${top+chartHeight}" stroke="#94a3b8"/>${labels}${lines}<text x="${width/2}" y="${height-5}" text-anchor="middle" fill="#56616d" font-size="11">Snake segments</text><text x="17" y="${height/2}" transform="rotate(-90 17 ${height/2})" text-anchor="middle" fill="#56616d" font-size="11">${yLabel}</text></svg>`;
};
await Deno.jupyter.display(plot("V6 production Snake update-to-commit by arm", "commit"));
await Deno.jupyter.display(plot("V6 production Snake update CPU by arm", "cpu"));
await Deno.jupyter.display(plot("V6 production Snake frame interval p95 by arm", "rafP95"));
const breakEvenArms = arms.filter((arm) => arm !== "react");
const breakEvenColors: Record<string, string> = {
  runtime: "#286f86", "generated-vdom": "#455bd4",
  "columnar-vdom": "#168267", direct: "#6d7789",
};
const breakEvenWidth = 980, breakEvenHeight = 390, breakEvenLeft = 76, breakEvenTop = 54;
const breakEvenChartHeight = 260, breakEvenChartWidth = 860, breakEvenMax = 16;
const breakEvenGroupX = (index: number) => breakEvenLeft + 130 + index * 285;
const breakEvenY = (value: number) => breakEvenTop + breakEvenChartHeight - breakEvenChartHeight * value / breakEvenMax;
const breakEvenGrid = Array.from({ length: 5 }, (_, index) => {
  const value = index * 4;
  return `<line x1="${breakEvenLeft}" x2="${breakEvenWidth-22}" y1="${breakEvenY(value)}" y2="${breakEvenY(value)}" stroke="#e4e7eb"/><text x="${breakEvenLeft-10}" y="${breakEvenY(value)+4}" text-anchor="end" fill="#56616d" font-size="11">${value}</text>`;
}).join("");
const breakEvenBars = breakEvenArms.map((arm, armIndex) => sizes.map((size, sizeIndex) => {
  const row = breakEvenRows.find((item) => item.arm === arm && item.size === size)!;
  const value = row.medianUpdates ?? breakEvenMax;
  const barWidth = 34, gap = 8;
  const x = breakEvenGroupX(sizeIndex) + armIndex * (barWidth + gap) - 82;
  const y = breakEvenY(value);
  const height = breakEvenTop + breakEvenChartHeight - y;
  const label = row.medianUpdates === null ? "N/A" : String(row.medianUpdates);
  return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="3" fill="${breakEvenColors[arm]}"/><text x="${x+barWidth/2}" y="${y-6}" text-anchor="middle" fill="#374151" font-size="10">${label}</text>`;
}).join("")).join("");
const breakEvenLabels = sizes.map((size, index) => `<text x="${breakEvenGroupX(index)}" y="${breakEvenTop+breakEvenChartHeight+24}" text-anchor="middle" fill="#424b55" font-size="12">${size} segments</text>`).join("");
const breakEvenLegend = breakEvenArms.map((arm, index) => `<rect x="${breakEvenLeft+index*205}" y="20" width="12" height="12" rx="2" fill="${breakEvenColors[arm]}"/><text x="${breakEvenLeft+18+index*205}" y="30" fill="#323b45" font-size="11">${arm}</text>`).join("");
await Deno.jupyter.display(Deno.jupyter.svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${breakEvenHeight}" viewBox="0 0 ${breakEvenWidth} ${breakEvenHeight}" role="img" aria-label="V6 post hoc mount amortization update count" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Estimated updates to offset VDOM or direct-DOM mount difference versus React</title><rect width="100%" height="100%" fill="white"/>${breakEvenLegend}${breakEvenGrid}<line x1="${breakEvenLeft}" x2="${breakEvenLeft}" y1="${breakEvenTop}" y2="${breakEvenTop+breakEvenChartHeight}" stroke="#94a3b8"/><line x1="${breakEvenLeft}" x2="${breakEvenWidth-22}" y1="${breakEvenTop+breakEvenChartHeight}" y2="${breakEvenTop+breakEvenChartHeight}" stroke="#94a3b8"/>${breakEvenLabels}${breakEvenBars}<text x="18" y="${breakEvenHeight/2}" transform="rotate(-90 18 ${breakEvenHeight/2})" text-anchor="middle" fill="#56616d" font-size="11">Measured updates to amortize mount (median of paired replications)</text></svg>`);
