const frontier = JSON.parse(await Deno.readTextFile("results/async-dag-frontier-v2/summary.json"));
const armRows = [
  { id: "serial", label: "Sequential React control", color: "#64748b" },
  { id: "reactPreload", label: "React explicit preload", color: "#2563eb" },
  { id: "dag", label: "Compiled DAG", color: "#16a34a" },
];
const chartWidth = 980;
const chartHeight = 470;
const latencyScale = 0.88;
const latencyRows = armRows.map((arm, index) => {
  const y = 104 + index * 58;
  const stats = frontier.latency[arm.id];
  const medianWidth = stats.medianMs * latencyScale;
  const p95X = 250 + stats.p95Ms * latencyScale;
  return `<text x="24" y="${y + 5}" font-size="15" fill="#1f2937">${arm.label}</text><rect x="250" y="${y - 15}" width="${medianWidth}" height="26" rx="5" fill="${arm.color}" opacity="0.85"/><line x1="${p95X}" y1="${y - 20}" x2="${p95X}" y2="${y + 16}" stroke="#111827" stroke-width="3"/><text x="${p95X + 10}" y="${y + 5}" font-size="13" fill="#374151">${stats.medianMs.toFixed(1)} / ${stats.p95Ms.toFixed(1)} ms</text>`;
});
const pairRows = [
  { key: "dagVsSequentialControl", label: "DAG / sequential control", color: "#16a34a" },
  { key: "dagVsReactPreload", label: "DAG / preloaded React", color: "#2563eb" },
];
const ratioMin = 0.30;
const ratioMax = 1.15;
const ratioX = (value: number) => 564 + ((value - ratioMin) / (ratioMax - ratioMin)) * 370;
const ratioRows = pairRows.map((pair, index) => {
  const y = 330 + index * 56;
  const ratios = frontier.pairedComparisons[pair.key].allRatios.toSorted((a: number, b: number) => a - b);
  const lo = ratios[0], hi = ratios[ratios.length - 1];
  const mid = frontier.pairedComparisons[pair.key].pairedMedianRatio;
  return `<text x="24" y="${y + 5}" font-size="15" fill="#1f2937">${pair.label}</text><line x1="${ratioX(lo)}" y1="${y}" x2="${ratioX(hi)}" y2="${y}" stroke="${pair.color}" stroke-width="5" stroke-linecap="round"/><circle cx="${ratioX(mid)}" cy="${y}" r="8" fill="${pair.color}" stroke="white" stroke-width="2"/><text x="${ratioX(mid) + 12}" y="${y + 5}" font-size="13" fill="#374151">median ${mid.toFixed(3)}</text>`;
});
const ratioTicks = [0.4, 0.6, 0.8, 1.0].map((value) => `<line x1="${ratioX(value)}" y1="302" x2="${ratioX(value)}" y2="435" stroke="${value === 1 ? "#111827" : "#e5e7eb"}" stroke-width="${value === 1 ? 2 : 1}"/><text x="${ratioX(value)}" y="456" text-anchor="middle" font-size="12" fill="#64748b">${value.toFixed(1)}×</text>`).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="470" viewBox="0 0 980 470" role="img" aria-labelledby="frontier-title frontier-desc" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title id="frontier-title">Async DAG frontier v2: latency and paired ratios</title><desc id="frontier-desc">Across 30 browser page blocks, median and p95 completion-to-layout-commit times are shown beside the distribution range and paired median ratio for the DAG against the serial control and preloaded React.</desc><rect x="0" y="0" width="980" height="470" rx="14" fill="#fff" stroke="#e5e7eb"/><text x="24" y="35" font-size="21" font-weight="700" fill="#111827">Async DAG frontier v2 · 30 paired page blocks</text><text x="24" y="64" font-size="13" fill="#64748b">Latency bars show median; black marker shows p95 · lower paired ratio favors DAG · n=30</text><line x1="250" y1="84" x2="250" y2="260" stroke="#d1d5db"/><text x="250" y="285" font-size="12" fill="#64748b">0 ms</text><text x="650" y="285" font-size="12" fill="#64748b">≈450 ms</text>${latencyRows.join("")}<line x1="24" y1="300" x2="950" y2="300" stroke="#e5e7eb"/><text x="24" y="326" font-size="14" font-weight="650" fill="#111827">Paired DAG / baseline latency ratio · each point range is min–max</text>${ratioTicks}${ratioRows.join("")}<text x="564" y="456" font-size="12" fill="#64748b">Ratio below 1.0 means DAG completed sooner</text></svg>`;
Deno.jupyter.svg`${svg}`;
