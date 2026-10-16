const seeds = [82005002, 82005003, 82005004];
const records = await Promise.all(seeds.map(async (seed) =>
  JSON.parse(
    await Deno.readTextFile(
      `results/browser-multi-owner-batch-v1-${seed}.json`,
    ),
  )
));
const fanouts = [1, 4, 16, 64, 256];
const valid = records.length === 3 && records.every((record: any) =>
  record.status === "PASS" && record.count === 10_000 &&
  record.warmupPairs === 8 && record.measuredPairs === 40 &&
  fanouts.length === record.scenarios.length &&
  record.scenarios.every((scenario: any) =>
    scenario.outputParity && scenario.stableIdentity &&
    scenario.runtimeCommitBatchesPerPair === 1 &&
    scenario.runtimeRegionsPerBatch === scenario.fanout &&
    scenario.renderedRowsPerBatch.react === scenario.fanout &&
    scenario.renderedRowsPerBatch.runtime === scenario.fanout
  )
);
if (!valid) throw new Error("Multi-owner browser records failed contracts");
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const scenarios = fanouts.map((fanout) => {
  const samples = records.map((record: any) =>
    record.scenarios.find((scenario: any) => scenario.fanout === fanout)
  );
  const metric = (key: "medianMs" | "p95Ms", arm: "react" | "runtime") =>
    samples.map((sample: any) => sample[key][arm]);
  const medians = {
    react: median(metric("medianMs", "react")),
    runtime: median(metric("medianMs", "runtime")),
  };
  const p95s = {
    react: median(metric("p95Ms", "react")),
    runtime: median(metric("p95Ms", "runtime")),
  };
  const range = (values: number[]) => [Math.min(...values), Math.max(...values)];
  return {
    fanout,
    pageLoadReplications: samples.length,
    medianMs: medians,
    medianPageP95Ms: p95s,
    pageMedianRangeMs: {
      react: range(metric("medianMs", "react")),
      runtime: range(metric("medianMs", "runtime")),
    },
    contractsPass: true,
  };
});
const summary = {
  schemaVersion: "multi-owner-browser-summary-v1",
  status: "PASS",
  profileReplications: 1,
  pageLoadsAreReplicationUnit: true,
  rawFiles: seeds.map((seed) =>
    `results/browser-multi-owner-batch-v1-${seed}.json`
  ),
  browser: records[0].browser,
  protocol: {
    leaves: 10_000,
    warmupPairsPerPage: 8,
    measuredPairsPerPage: 40,
    fanouts,
    react: "React 19.3 + React Compiler + per-row useSyncExternalStore subscriptions",
    runtime: "OXC-emitted owner/site graph + one validated multi-keyed-region commit",
    timing: "Programmatic click to synchronous host output; mount reported separately; layout, paint, and display presentation excluded.",
  },
  scenarios,
  limitations: [
    "Three page loads share one Chrome 155 profile and one MacIntel device; 40 pairs per page are nested observations.",
    "React uses one external-store subscription per row, which is an implementation-specific baseline and not a broad React workload sample.",
    "The test uses a flat 10,000-row DOM and independent boolean leaf updates; it excludes structural edits, lifecycle churn, layout/paint, and frame presentation.",
    "Timer granularity is a material limit near 0.1 ms; treat fine differences between runtime fanouts as approximate.",
  ],
};
await Deno.writeTextFile(
  "results/browser-multi-owner-batch-summary-v1.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(scenarios, null, 2));

const width = 900;
const height = 420;
const left = 88;
const right = 28;
const top = 72;
const bottom = 75;
const plotWidth = width - left - right;
const plotHeight = height - top - bottom;
const values = scenarios.flatMap((row) => [
  ...row.pageMedianRangeMs.react,
  ...row.pageMedianRangeMs.runtime,
]);
const minY = 0.05;
const maxY = 50;
const y = (value: number) =>
  top + (Math.log10(maxY) - Math.log10(Math.max(minY, value))) /
    (Math.log10(maxY) - Math.log10(minY)) * plotHeight;
const x = (index: number) => left + index / (fanouts.length - 1) * plotWidth;
const fmt = (value: number) => `${value.toFixed(value < 1 ? 2 : 1)} ms`;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="multi-owner-title multi-owner-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="multi-owner-title">Multi-owner batch update latency</title>`,
  `<desc id="multi-owner-desc">Logarithmic latency chart across one to 256 independently updated leaves. Points are medians across three production page loads; whiskers show the range of those page medians.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="25" font-size="16" font-weight="700">Many dirty owners, one scheduler commit</text>`,
  `<text x="18" y="45" font-size="10" fill="#555">10,000 keyed leaves · median of 3 production page medians · whiskers show page-median range · log latency axis</text>`,
  `<line x1="620" y1="27" x2="645" y2="27" stroke="#b45309" stroke-width="2"/><circle cx="632" cy="27" r="4" fill="#b45309"/><text x="652" y="31" font-size="10">React 19.3 + Compiler</text>`,
  `<line x1="770" y1="27" x2="795" y2="27" stroke="#047857" stroke-width="2"/><circle cx="782" cy="27" r="4" fill="#047857"/><text x="802" y="31" font-size="10">compiled runtime</text>`,
];
for (const tick of [0.1, 1, 10]) {
  const yy = y(tick);
  svg.push(
    `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#e5e7eb"/><text x="${left - 10}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#555">${fmt(tick)}</text>`,
  );
}
for (const [index, row] of scenarios.entries()) {
  const xx = x(index);
  svg.push(
    `<line x1="${xx}" y1="${top}" x2="${xx}" y2="${height - bottom}" stroke="#f1f5f9"/><text x="${xx}" y="${height - bottom + 18}" text-anchor="middle" font-size="10" fill="#333">${row.fanout} owners</text>`,
  );
}
for (const [arm, color] of [["react", "#b45309"], ["runtime", "#047857"]] as const) {
  const points = scenarios.map((row, index) =>
    `${x(index)},${y(row.medianMs[arm])}`
  ).join(" ");
  svg.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" opacity="0.72"/>`);
  for (const [index, row] of scenarios.entries()) {
    const xx = x(index);
    const value = row.medianMs[arm];
    const [low, high] = row.pageMedianRangeMs[arm];
    const yy = y(value);
    svg.push(
      `<line x1="${xx}" y1="${y(low)}" x2="${xx}" y2="${y(high)}" stroke="${color}" stroke-width="2"/><circle cx="${xx}" cy="${yy}" r="4.5" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${xx + (arm === "runtime" ? 8 : -8)}" y="${yy + (arm === "runtime" ? 13 : -8)}" text-anchor="${arm === "runtime" ? "start" : "end"}" font-size="8" fill="${color}">${fmt(value)}</text>`,
    );
  }
}
svg.push(
  `<text x="18" y="${height - 27}" font-size="8" fill="#555">3 page loads on one Chrome 155 profile/device · 40 paired samples per page · synthetic clicks · no layout, paint, or presented-frame measurement</text></svg>`,
);
Deno.jupyter.svg`${svg.join("")}`;
