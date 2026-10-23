const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const summary = JSON.parse(await Deno.readTextFile("results/async-dag-frontier-v2/summary.json"));
const fmt = (value: number) => value.toFixed(1);
const markdown = `### Async dependency frontier — v2 browser results

The preregistered v2 run completed **30/30 paired page blocks** in visible production Chrome 155. The compiled DAG and explicit-preload React both launched the three known-key requests together and respected all hard dependencies. The DAG preserved the previous keyed DOM while pending and committed one complete target model in every block.

| Arm | Median | p95 |
| --- | ---: | ---: |
| Sequential React loader control | ${fmt(summary.latency.serial.medianMs)} ms | ${fmt(summary.latency.serial.p95Ms)} ms |
| React with explicit preload | ${fmt(summary.latency.reactPreload.medianMs)} ms | ${fmt(summary.latency.reactPreload.p95Ms)} ms |
| Compiled DAG | ${fmt(summary.latency.dag.medianMs)} ms | ${fmt(summary.latency.dag.p95Ms)} ms |

The paired median DAG/sequential ratio is **${summary.pairedComparisons.dagVsSequentialControl.pairedMedianRatio.toFixed(3)}** (a ${fmt(summary.pairedComparisons.dagVsSequentialControl.pairedMedianSpeedupFraction * 100)}% reduction), clearing the preregistered 20% threshold. The paired median DAG/preloaded-React ratio is **${summary.pairedComparisons.dagVsReactPreload.pairedMedianRatio.toFixed(3)}**; DAG p95 is **${fmt(summary.pairedComparisons.dagVsReactPreload.absoluteP95Ratio * 100)}%** of React p95, inside the 110% guard. This supports automatic dependency discovery and waterfall avoidance; it does not show a meaningful speed advantage over React already given equal preload knowledge.

Mechanism checks passed in 30/30 blocks: all independent DAG requests started within 16.7 ms (median start gap ${fmt(summary.mechanism.dagIndependentStartGapMedianMs)} ms); every dependent task started within 16.7 ms after its final prerequisite (maximum observed lag ${fmt(summary.mechanism.dagDependentStartLagMaxMs)} ms); there were no hard-edge violations. These requests overlap on the network; JavaScript callbacks remain serial on the main thread.

The earlier v1 attempt is preserved but excluded: its initial React boundary readiness race caused 20/30 pending-view checks to sample the visible fallback. V2 awaits the initial layout commit and collects fresh records. Limits: one machine/browser profile, synthetic delayed I/O, and completion-to-layout-commit timing; no paint/scroll smoothness, CPU-heavy work, cancellation, speculative fetch, worker execution, server streaming, or hydration was tested. See [the frozen v2 protocol](./async-dag-frontier-v2-protocol.md), [raw data and preregistration](./results/async-dag-frontier-v2/), and [appendix section 8.20](./empirical-appendix.md#820-preregistered-async-dag-frontier-study-v2).
`;
const code = await Deno.readTextFile("notebook_cells/async_dag_frontier_results.ts");
const cellTag = "async-dag-frontier-results";
const put = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
put(cellTag, { cell_type: "markdown", id: cellTag, metadata: { tags: [cellTag] }, source: markdown.split("\n").map((line) => line + "\n") });
put("async-dag-frontier-results-svg", {
  cell_type: "code",
  execution_count: null,
  id: "async-dag-frontier-results-svg",
  metadata: { tags: ["async-dag-frontier-results-svg"] },
  outputs: [{ output_type: "display_data", data: { "image/svg+xml": [svgFromSummary(summary)], "text/plain": ["Async DAG frontier v2 latency and paired-ratio chart (SVG)."] }, metadata: {} }],
  source: code.split("\n").map((line) => line + "\n"),
});
const oldProtocolIndex = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes("async-dag-frontier-protocol-markdown"));
if (oldProtocolIndex >= 0) {
  notebook.cells[oldProtocolIndex] = {
    cell_type: "markdown", id: "async-dag-frontier-protocol-markdown", metadata: { tags: ["async-dag-frontier-protocol-markdown"] },
    source: ["The async frontier study is now complete. The original motivation, task graph, and decision rules remain in the next code/diagram cell; the frozen corrected v2 protocol and source hashes are in [async-dag-frontier-v2-protocol.md](./async-dag-frontier-v2-protocol.md). Results are summarized in the following section and raw records are preserved under `results/async-dag-frontier-v2/`.\n"],
  };
}
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated the research notebook with v2 results and an SVG latency/paired-ratio chart.");

function svgFromSummary(frontier: any) {
  const arms = [
    { id: "serial", label: "Sequential React control", color: "#64748b" },
    { id: "reactPreload", label: "React explicit preload", color: "#2563eb" },
    { id: "dag", label: "Compiled DAG", color: "#16a34a" },
  ];
  const latencyScale = 0.88;
  const latencyRows = arms.map((arm, index) => {
    const y = 104 + index * 58;
    const stats = frontier.latency[arm.id];
    const p95X = 250 + stats.p95Ms * latencyScale;
    return `<text x="24" y="${y + 5}" font-size="15" fill="#1f2937">${arm.label}</text><rect x="250" y="${y - 15}" width="${stats.medianMs * latencyScale}" height="26" rx="5" fill="${arm.color}" opacity="0.85"/><line x1="${p95X}" y1="${y - 20}" x2="${p95X}" y2="${y + 16}" stroke="#111827" stroke-width="3"/><text x="${p95X + 10}" y="${y + 5}" font-size="13" fill="#374151">${stats.medianMs.toFixed(1)} / ${stats.p95Ms.toFixed(1)} ms</text>`;
  });
  const pairRows = [
    { key: "dagVsSequentialControl", label: "DAG / sequential control", color: "#16a34a" },
    { key: "dagVsReactPreload", label: "DAG / preloaded React", color: "#2563eb" },
  ];
  const x = (value: number) => 564 + ((value - 0.30) / 0.85) * 370;
  const ratioTicks = [0.4, 0.6, 0.8, 1.0].map((value) => `<line x1="${x(value)}" y1="302" x2="${x(value)}" y2="435" stroke="${value === 1 ? "#111827" : "#e5e7eb"}" stroke-width="${value === 1 ? 2 : 1}"/><text x="${x(value)}" y="456" text-anchor="middle" font-size="12" fill="#64748b">${value.toFixed(1)}×</text>`).join("");
  const ratioRows = pairRows.map((pair, index) => {
    const y = 330 + index * 56;
    const ratios = frontier.pairedComparisons[pair.key].allRatios.toSorted((a: number, b: number) => a - b);
    const median = frontier.pairedComparisons[pair.key].pairedMedianRatio;
    return `<text x="24" y="${y + 5}" font-size="15" fill="#1f2937">${pair.label}</text><line x1="${x(ratios[0])}" y1="${y}" x2="${x(ratios.at(-1))}" y2="${y}" stroke="${pair.color}" stroke-width="5" stroke-linecap="round"/><circle cx="${x(median)}" cy="${y}" r="8" fill="${pair.color}" stroke="white" stroke-width="2"/><text x="${x(median) + 12}" y="${y + 5}" font-size="13" fill="#374151">median ${median.toFixed(3)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="470" viewBox="0 0 980 470" role="img" aria-labelledby="frontier-title frontier-desc" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title id="frontier-title">Async DAG frontier v2: latency and paired ratios</title><desc id="frontier-desc">Across 30 browser page blocks, median and p95 completion-to-layout-commit times are shown beside the distribution range and paired median ratio for the DAG against the serial control and preloaded React.</desc><rect x="0" y="0" width="980" height="470" rx="14" fill="#fff" stroke="#e5e7eb"/><text x="24" y="35" font-size="21" font-weight="700" fill="#111827">Async DAG frontier v2 · 30 paired page blocks</text><text x="24" y="64" font-size="13" fill="#64748b">Latency bars show median; black marker shows p95 · lower paired ratio favors DAG · n=30</text><line x1="250" y1="84" x2="250" y2="260" stroke="#d1d5db"/><text x="250" y="285" font-size="12" fill="#64748b">0 ms</text><text x="650" y="285" font-size="12" fill="#64748b">≈450 ms</text>${latencyRows.join("")}<line x1="24" y1="300" x2="950" y2="300" stroke="#e5e7eb"/><text x="24" y="326" font-size="14" font-weight="650" fill="#111827">Paired DAG / baseline latency ratio · each line is min–max</text>${ratioTicks}${ratioRows.join("")}<text x="564" y="456" font-size="12" fill="#64748b">Ratio below 1.0 means DAG completed sooner</text></svg>`;
}
