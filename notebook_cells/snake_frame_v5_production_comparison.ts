const devManifest = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v5-manifest.json",
));
const prodManifest = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v5-production-manifest.json",
));
const prodSchedule = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v5-production-preregistration.json",
));
if (
  devManifest.status !== "PASS" || devManifest.pageLoads !== 100 ||
  prodManifest.status !== "PASS" || prodManifest.pageLoads !== 100 ||
  prodManifest.measuredSamples !== 30000 || prodSchedule.status !== "PREREGISTERED"
) throw new Error("V5 dev/production manifests or schedule are incomplete");

const readPages = async (manifest: any, production: boolean) => {
  const pages = [];
  for (const entry of manifest.files) {
    const path = "results/" + (entry.path ?? entry.file);
    const bytes = await Deno.readFile(path);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    if (hash !== entry.sha256) throw new Error(`SHA-256 mismatch: ${path}`);
    const page = JSON.parse(new TextDecoder().decode(bytes));
    const expected = production
      ? prodSchedule.pages.find((item: any) => item.trialId === page.trialId)
      : null;
    if (
      page.status !== "PASS" || !page.allContractsPass ||
      page.schemaVersion !== "snake-frame-browser-v5" ||
      page.samples.length !== 300 || page.measuredFrames !== 300 ||
      (production && (!expected || page.buildMode !== "production" || page.collection !== "production" || page.arm !== expected.arm || page.segmentCount !== expected.segmentCount))
    ) throw new Error(`V5 page contract failed: ${path}`);
    pages.push({
      ...page,
      mode: production ? "production" : "development",
      replication: production ? expected.replication : Number(page.trialId.match(/rep(\d+)/)?.[1]),
    });
  }
  return pages;
};
const devPages = await readPages(devManifest, false);
const prodPages = await readPages(prodManifest, true);
if (devPages.length !== 100 || prodPages.length !== 100) {
  throw new Error("Expected 100 page loads per collection mode");
}
const percentile = (xs: number[], p: number) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
const pageStats = (page: any) => ({
  commit: median(page.samples.map((s: any) => s.commitMs)),
  p95: percentile(page.samples.map((s: any) => s.commitMs), 0.95),
  cpu: median(page.samples.map((s: any) => s.updateCpuMs)),
  raf: percentile(page.samples.map((s: any) => s.intervalMs), 0.95),
  mount: page.mountMs,
});
const counts = [32, 128, 512, 1024];
const arms = ["react", "runtime", "generated-vdom", "generated", "direct"];
const modes = [
  { label: "Development", pages: devPages },
  { label: "Production", pages: prodPages },
];
const rows: any[] = [];
for (const mode of modes) for (const count of counts) for (const arm of arms) {
  const selected = mode.pages.filter((p: any) => p.segmentCount === count && p.arm === arm);
  if (selected.length !== 5) throw new Error(`${mode.label} balance failure: ${count}/${arm}`);
  const stats = selected.map(pageStats);
  rows.push({
    mode: mode.label,
    segmentCount: count,
    arm,
    mountMs: median(stats.map((s) => s.mount)),
    updateCpuMs: median(stats.map((s) => s.cpu)),
    updateMedianMs: median(stats.map((s) => s.commit)),
    updateP95Ms: median(stats.map((s) => s.p95)),
    rafIntervalP95Ms: median(stats.map((s) => s.raf)),
  });
}
console.log("Paired production-build replication; medians across five page-load summaries (ms)");
console.log("segments | arm | mount | update CPU | update-to-commit median / p95 | RAF interval p95");
for (const row of rows.filter((r) => r.mode === "Production")) {
  console.log(`${row.segmentCount} | ${row.arm} | ${row.mountMs.toFixed(3)} | ${row.updateCpuMs.toFixed(3)} | ${row.updateMedianMs.toFixed(3)} / ${row.updateP95Ms.toFixed(3)} | ${row.rafIntervalP95Ms.toFixed(2)}`);
}
console.log("Production paired median ratios vs React (same size and replication; lower is faster)");
for (const count of counts) for (const arm of arms.filter((a) => a !== "react")) {
  const ratios = [];
  for (let rep = 1; rep <= 5; rep++) {
    const react = prodPages.find((p: any) => p.segmentCount === count && p.arm === "react" && p.replication === rep);
    const candidate = prodPages.find((p: any) => p.segmentCount === count && p.arm === arm && p.replication === rep);
    ratios.push(pageStats(candidate).commit / pageStats(react).commit);
  }
  console.log(`${count} | ${arm} | median paired ratio ${median(ratios).toFixed(3)}× React; ${ratios.filter((x) => x < 1).length}/5 paired page medians faster`);
}

const plot = (title: string, metric: "updateMedianMs" | "mountMs" | "rafIntervalP95Ms") => {
  const width = 1000, height = 360, left = 78, right = 28, top = 46, bottom = 64;
  const chartW = width - left - right, chartH = height - top - bottom;
  const selected = rows.filter((r) => r.arm === "react" || r.arm === "generated-vdom");
  const maxValue = Math.max(...selected.map((r) => r[metric])) * 1.15 || 1;
  const x = (i: number) => left + (chartW * i) / (counts.length - 1);
  const y = (v: number) => top + chartH - (v / maxValue) * chartH;
  const series = [
    { arm: "react", mode: "development", label: "React · dev", color: "#d97706", dash: "" },
    { arm: "react", mode: "production", label: "React · prod", color: "#b45309", dash: "" },
    { arm: "generated-vdom", mode: "development", label: "OXC VDOM · dev", color: "#60a5fa", dash: "6 4" },
    { arm: "generated-vdom", mode: "production", label: "OXC VDOM · prod", color: "#1d4ed8", dash: "6 4" },
  ];
  const grid = Array.from({ length: 5 }, (_, i) => {
    const value = maxValue * i / 4;
    return `<line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" stroke="#e2e8f0"/><text x="${left-10}" y="${y(value)+4}" text-anchor="end" fill="#64748b" font-size="11">${value.toFixed(metric === "rafIntervalP95Ms" ? 1 : 2)}</text>`;
  }).join("");
  const lines = series.map((s) => {
    const values = counts.map((count) => rows.find((r) => r.mode === (s.mode === "production" ? "Production" : "Development") && r.segmentCount === count && r.arm === s.arm)[metric]);
    const points = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    const dots = values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="white" stroke="${s.color}" stroke-width="2"/>`).join("");
    return `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>${dots}`;
  }).join("");
  const labels = counts.map((count, i) => `<text x="${x(i)}" y="${height-30}" text-anchor="middle" fill="#475569" font-size="12">${count}</text>`).join("");
  const legend = series.map((s, i) => `<line x1="${left + i*220}" x2="${left+25+i*220}" y1="22" y2="22" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/><text x="${left+32+i*220}" y="26" fill="#334155" font-size="11">${s.label}</text>`).join("");
  return Deno.jupyter.svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${title}</title><rect width="100%" height="100%" fill="white"/>${legend}${grid}<line x1="${left}" x2="${left}" y1="${top}" y2="${top+chartH}" stroke="#94a3b8"/><line x1="${left}" x2="${width-right}" y1="${top+chartH}" y2="${top+chartH}" stroke="#94a3b8"/>${labels}${lines}<text x="${width/2}" y="${height-7}" text-anchor="middle" fill="#64748b" font-size="11">Snake segments</text><text x="18" y="${height/2}" transform="rotate(-90 18 ${height/2})" text-anchor="middle" fill="#64748b" font-size="11">milliseconds</text></svg>`;
};
await Deno.jupyter.display(plot("React and OXC VDOM update-to-commit medians by build mode", "updateMedianMs"));
await Deno.jupyter.display(plot("React and OXC VDOM mount medians by build mode", "mountMs"));
await Deno.jupyter.display(plot("React and OXC VDOM RAF interval p95 by build mode", "rafIntervalP95Ms"));
