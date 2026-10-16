const browserStateSummary = JSON.parse(await Deno.readTextFile("results/browser-component-state-react-summary-v1.json"));
if (browserStateSummary.status !== "PASS" || browserStateSummary.scenarios.some((row: any) => !row.contractsPass)) {
  throw new Error("Browser local-state comparison failed its contracts");
}
const browserRows = browserStateSummary.scenarios;
const svgWidth = 900;
const svgHeight = 450;
const left = 96;
const right = 34;
const top = 72;
const bottom = 86;
const plotWidth = svgWidth - left - right;
const plotHeight = svgHeight - top - bottom;
const minY = 0.003;
const maxY = 20;
const x = (count: number) => left + (Math.log10(count) - 2) / 2 * plotWidth;
const y = (value: number) => top + (Math.log10(maxY) - Math.log10(value)) / (Math.log10(maxY) - Math.log10(minY)) * plotHeight;
const fmt = (value: number) => value < 1 ? `${(value * 1000).toFixed(1)} µs` : `${value.toFixed(2)} ms`;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-labelledby="browser-state-title browser-state-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="browser-state-title">One local state update: React Compiler vs compiled runtime</title>`,
  `<desc id="browser-state-desc">Log-log chart of median milliseconds per update at 100, 1000, 5000, and 10000 sibling components. Points are medians across browser page-load medians; vertical whiskers span the page-level median range. React grows with tree size while the specialized runtime remains nearly flat.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="26" font-size="16" font-weight="700">One component-local state update · production browser</text>`,
  `<text x="18" y="46" font-size="10" fill="#555">Median per update · whiskers = min–max page median · logarithmic axes</text>`,
  `<line x1="635" y1="27" x2="660" y2="27" stroke="#b45309" stroke-width="2"/><circle cx="647" cy="27" r="4" fill="#b45309"/><text x="667" y="31" font-size="10">React 19.3 + Compiler</text>`,
  `<line x1="790" y1="27" x2="815" y2="27" stroke="#047857" stroke-width="2"/><circle cx="802" cy="27" r="4" fill="#047857"/><text x="822" y="31" font-size="10">compiled runtime</text>`,
];
for (const tick of [0.003, 0.01, 0.1, 1, 10]) {
  const yy = y(tick);
  svg.push(`<line x1="${left}" y1="${yy}" x2="${svgWidth - right}" y2="${yy}" stroke="#e5e7eb"/><text x="${left - 10}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#555">${fmt(tick)}</text>`);
}
for (const row of browserRows) {
  const xx = x(row.count);
  svg.push(`<line x1="${xx}" y1="${top}" x2="${xx}" y2="${svgHeight - bottom}" stroke="#f1f5f9"/><text x="${xx}" y="${svgHeight - bottom + 19}" text-anchor="middle" font-size="10" fill="#333">${row.count.toLocaleString()}</text><text x="${xx}" y="${svgHeight - bottom + 34}" text-anchor="middle" font-size="8" fill="#666">n=${row.pageLoadReplications} pages</text>`);
}
for (const [arm, color] of [["react", "#b45309"], ["runtime", "#047857"]] as const) {
  const points = browserRows.map((row: any) => `${x(row.count)},${y(row.medianMs[arm])}`).join(" ");
  svg.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" opacity="0.72"/>`);
  for (const row of browserRows) {
    const xx = x(row.count);
    const value = row.medianMs[arm];
    const range = row.pageMedianRangeMs[arm];
    const yy = y(value);
    svg.push(`<line x1="${xx}" y1="${y(range[0])}" x2="${xx}" y2="${y(range[1])}" stroke="${color}" stroke-width="2"/><line x1="${xx - 5}" y1="${y(range[0])}" x2="${xx + 5}" y2="${y(range[0])}" stroke="${color}"/><line x1="${xx - 5}" y1="${y(range[1])}" x2="${xx + 5}" y2="${y(range[1])}" stroke="${color}"/><circle cx="${xx}" cy="${yy}" r="4.5" fill="${color}" stroke="white" stroke-width="1.5"/><text x="${xx + 8}" y="${yy + (arm === "runtime" ? 13 : -8)}" font-size="9" fill="${color}">${fmt(value)}</text>`);
  }
}
svg.push(`<text x="${left + plotWidth / 2}" y="${svgHeight - 7}" text-anchor="middle" font-size="10" fill="#333">sibling components in the mounted tree</text><text x="16" y="${top + plotHeight / 2}" transform="rotate(-90 16 ${top + plotHeight / 2})" text-anchor="middle" font-size="10" fill="#333">median commit latency per update</text><text x="18" y="${svgHeight - 29}" font-size="8" fill="#555">${browserStateSummary.rawFiles.length} page loads · Chrome 155 / one MacIntel device · 8 warmups + 40 measured pairs/page · 100 updates/pair · no layout or paint</text></svg>`);
console.log(JSON.stringify(browserRows.map((row: any) => ({
  count: row.count,
  pages: row.pageLoadReplications,
  medianMs: row.medianMs,
  pageMedianRangeMs: row.pageMedianRangeMs,
  medianPageP95Ms: row.medianPageP95Ms,
  medianPerPageSpeedup: row.medianPerPageSpeedup,
})), null, 2));
Deno.jupyter.svg`${svg.join("")}`;
