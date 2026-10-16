const treeShapeSummary = JSON.parse(
  await Deno.readTextFile(
    "results/browser-component-state-tree-shape-summary-v1.json",
  ),
);
if (
  treeShapeSummary.status !== "PASS" ||
  treeShapeSummary.scenarios.length !== 4 ||
  treeShapeSummary.scenarios.some((row: any) => !row.contractsPass)
) {
  throw new Error("Tree-shape browser comparison failed its contracts");
}
const rows = treeShapeSummary.scenarios;
const svgWidth = 920;
const svgHeight = 460;
const left = 96;
const right = 34;
const top = 76;
const bottom = 92;
const plotWidth = svgWidth - left - right;
const plotHeight = svgHeight - top - bottom;
const allValues = rows.flatMap((
  row: any,
) => [row.pageMedianRangeMs.react[0], row.pageMedianRangeMs.runtime[0]]);
const minY = Math.min(0.003, ...allValues) / 1.2;
const maxY = Math.max(
  30,
  ...rows.flatMap((
    row: any,
  ) => [row.pageMedianRangeMs.react[1], row.pageMedianRangeMs.runtime[1]]),
) * 1.15;
const logMin = Math.log10(minY);
const logMax = Math.log10(maxY);
const y = (value: number) =>
  top + (logMax - Math.log10(value)) / (logMax - logMin) * plotHeight;
const x = (index: number) => left + (index / (rows.length - 1)) * plotWidth;
const fmt = (value: number) =>
  value < 1 ? `${(value * 1000).toFixed(1)} µs` : `${value.toFixed(2)} ms`;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-labelledby="tree-shape-title tree-shape-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="tree-shape-title">Leaf-local update latency across component tree shapes</title>`,
  `<desc id="tree-shape-desc">Logarithmic chart comparing React Compiler and compiled runtime medians for flat, ten, one hundred, and one thousand Fragment-only component groups. The DOM remains 10,000 spans in every case. Whiskers show min to max across three page-load medians.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="25" font-size="16" font-weight="700">One leaf-local update · component topology varies, DOM held constant</text>`,
  `<text x="18" y="45" font-size="10" fill="#555">10,000 identical spans · median per update · whiskers = min–max across 3 page loads · log latency axis</text>`,
  `<line x1="626" y1="27" x2="651" y2="27" stroke="#b45309" stroke-width="2"/><circle cx="638" cy="27" r="4" fill="#b45309"/><text x="658" y="31" font-size="10">React 19.3 + Compiler</text>`,
  `<line x1="785" y1="27" x2="810" y2="27" stroke="#047857" stroke-width="2"/><circle cx="797" cy="27" r="4" fill="#047857"/><text x="817" y="31" font-size="10">compiled runtime</text>`,
];
const ticks = [0.003, 0.01, 0.1, 1, 10, 100].filter((value) =>
  value >= minY && value <= maxY
);
for (const tick of ticks) {
  const yy = y(tick);
  svg.push(
    `<line x1="${left}" y1="${yy}" x2="${
      svgWidth - right
    }" y2="${yy}" stroke="#e5e7eb"/><text x="${left - 10}" y="${
      yy + 3
    }" text-anchor="end" font-size="9" fill="#555">${fmt(tick)}</text>`,
  );
}
for (const [index, row] of rows.entries()) {
  const xx = x(index);
  svg.push(
    `<line x1="${xx}" y1="${top}" x2="${xx}" y2="${
      svgHeight - bottom
    }" stroke="#f1f5f9"/><text x="${xx}" y="${
      svgHeight - bottom + 18
    }" text-anchor="middle" font-size="10" fill="#333">${row.label}</text><text x="${xx}" y="${
      svgHeight - bottom + 34
    }" text-anchor="middle" font-size="8" fill="#666">${row.pageLoadReplications} page loads</text>`,
  );
}
for (
  const [arm, color] of [["react", "#b45309"], ["runtime", "#047857"]] as const
) {
  const points = rows.map((row: any, index: number) =>
    `${x(index)},${y(row.medianMs[arm])}`
  ).join(" ");
  svg.push(
    `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" opacity="0.72"/>`,
  );
  for (const [index, row] of rows.entries()) {
    const xx = x(index);
    const value = row.medianMs[arm];
    const range = row.pageMedianRangeMs[arm];
    const yy = y(value);
    svg.push(
      `<line x1="${xx}" y1="${y(range[0])}" x2="${xx}" y2="${
        y(range[1])
      }" stroke="${color}" stroke-width="2"/><line x1="${xx - 5}" y1="${
        y(range[0])
      }" x2="${xx + 5}" y2="${y(range[0])}" stroke="${color}"/><line x1="${
        xx - 5
      }" y1="${y(range[1])}" x2="${xx + 5}" y2="${
        y(range[1])
      }" stroke="${color}"/><circle cx="${xx}" cy="${yy}" r="4.5" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${
        xx + (arm === "runtime" ? 8 : -8)
      }" y="${yy + (arm === "runtime" ? 14 : -8)}" text-anchor="${
        arm === "runtime" ? "start" : "end"
      }" font-size="8" fill="${color}">${fmt(value)}</text>`,
    );
  }
}
svg.push(
  `<text x="${left + plotWidth / 2}" y="${
    svgHeight - 7
  }" text-anchor="middle" font-size="10" fill="#333">component groups × leaves per group (groups return Fragments)</text><text x="16" y="${
    top + plotHeight / 2
  }" transform="rotate(-90 16 ${
    top + plotHeight / 2
  })" text-anchor="middle" font-size="10" fill="#333">median commit latency per update</text><text x="18" y="${
    svgHeight - 29
  }" font-size="8" fill="#555">${treeShapeSummary.rawFiles.length} page loads · one Chrome profile/device · programmatic clicks · mount separate · layout and paint excluded</text></svg>`,
);
console.log(JSON.stringify(
  rows.map((row: any) => ({
    topology: row.label,
    medianMs: row.medianMs,
    pageMedianRangeMs: row.pageMedianRangeMs,
    medianPageP95Ms: row.medianPageP95Ms,
    medianPerPageSpeedup: row.medianPerPageSpeedup,
    pairedSampleWins: row.pairedSampleWins,
  })),
  null,
  2,
));
Deno.jupyter.svg`${svg.join("")}`;
