const structuralSeeds = [83001024, 83001025, 83001026];
const structuralOperations = ["rotate", "replace-edge", "filter-half"] as const;
const structuralRecords = await Promise.all(
  structuralSeeds.map(async (seed) =>
    JSON.parse(
      await Deno.readTextFile(
        `results/browser-component-state-structural-v4-${seed}.json`,
      ),
    )
  ),
);
const structuralValid = structuralRecords.length === 3 &&
  structuralRecords.every((record: any) =>
    record.schemaVersion === "component-state-structural-browser-v4" &&
    record.status === "PASS" && record.count === 10_000 &&
    record.warmupPairs === 8 && record.measuredPairs === 24 &&
    record.runtimeStrategy.includes("last-placed-index move plan") &&
    record.scenarios.length === structuralOperations.length &&
    structuralOperations.every((operation) => {
      const scenario = record.scenarios.find((item: any) =>
        item.operation === operation
      );
      return scenario?.samples.length === 24 && scenario.outputParity &&
        scenario.identity && scenario.retainedState &&
        scenario.samples.every((sample: any) =>
          sample.outputParity && sample.identity?.react &&
          sample.identity?.runtime && sample.retainedState?.react &&
          sample.retainedState?.runtime &&
          sample.milliseconds?.react >= 0 &&
          sample.milliseconds?.runtime >= 0
        );
    })
  );
if (!structuralValid) {
  throw new Error(
    "Structural component-state browser records failed contracts",
  );
}
const structuralMedian = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const structuralRange = (values: number[]) => [
  Math.min(...values),
  Math.max(...values),
];
const structuralSummaryRows = structuralOperations.map((operation) => {
  const pages = structuralRecords.map((record: any) =>
    record.scenarios.find((item: any) => item.operation === operation)
  );
  const pageMedians = (arm: "react" | "runtime") =>
    pages.map((page: any) => page.medianMs[arm]);
  const pageP95s = (arm: "react" | "runtime") =>
    pages.map((page: any) => page.p95Ms[arm]);
  return {
    operation,
    pageLoads: pages.length,
    medianOfPageMediansMs: {
      react: structuralMedian(pageMedians("react")),
      runtime: structuralMedian(pageMedians("runtime")),
    },
    medianOfPageP95Ms: {
      react: structuralMedian(pageP95s("react")),
      runtime: structuralMedian(pageP95s("runtime")),
    },
    pageMedianRangeMs: {
      react: structuralRange(pageMedians("react")),
      runtime: structuralRange(pageMedians("runtime")),
    },
    mountMs: {
      react: structuralMedian(pages.map((page: any) => page.mountMs.react)),
      runtime: structuralMedian(pages.map((page: any) => page.mountMs.runtime)),
    },
    contractsPass: true,
  };
});
const structuralSummary = {
  schemaVersion: "component-state-structural-browser-summary-v4",
  status: "PASS",
  pageLoadsAreReplicationUnit: true,
  profileReplications: 1,
  rawFiles: structuralSeeds.map((seed) =>
    `results/browser-component-state-structural-v4-${seed}.json`
  ),
  protocol: {
    leaves: 10_000,
    warmupPairsPerPage: 8,
    measuredPairsPerPage: 24,
    operations: structuralOperations,
    react:
      "React 19.3 + React Compiler with keyed row components owning useState",
    runtime:
      "OXC-generated component and state-site metadata; structural updates expand the dirty owner subtree and use a linear last-placed-index keyed VDOM move plan",
    timing:
      "Programmatic click to synchronous host commit; mount reported separately; layout, paint, and display presentation excluded.",
  },
  scenarios: structuralSummaryRows,
  limitations: [
    "Three page loads share one Chrome 154 profile and one MacIntel device; each page is the replication unit and 24 pairs are nested observations.",
    "The linear last-placed-index plan can move more retained host nodes than an LIS plan; it still normalizes and scans the sibling sequence and does not use the dependency DAG to select structural intervals.",
    "React Compiler is enabled; source render counters are omitted to avoid changing compiler memoization.",
    "Three fresh page loads share one Chrome 154 profile and one MacIntel device; more independent device/browser replications are needed.",
    "The benchmark excludes layout, paint, display presentation, repeated churn memory, and lifecycle instrumentation.",
    "OXC lowers the checked-in TSX component and state-site fixture; the structural operation callback is supplied by the harness.",
  ],
};
await Deno.writeTextFile(
  "results/browser-component-state-structural-summary-v4.json",
  JSON.stringify(structuralSummary, null, 2) + "\n",
);
console.log(JSON.stringify(structuralSummary.scenarios, null, 2));

const structuralWidth = 900;
const structuralHeight = 430;
const structuralLeft = 90;
const structuralRight = 28;
const structuralTop = 72;
const structuralBottom = 82;
const structuralPlotWidth = structuralWidth - structuralLeft -
  structuralRight;
const structuralPlotHeight = structuralHeight - structuralTop -
  structuralBottom;
const structuralYMin = 5;
const structuralYMax = 400;
const structuralY = (value: number) =>
  structuralTop +
  (Math.log10(structuralYMax) - Math.log10(Math.max(structuralYMin, value))) /
    (Math.log10(structuralYMax) - Math.log10(structuralYMin)) *
    structuralPlotHeight;
const structuralX = (index: number, armIndex: number) =>
  structuralLeft +
  (index + 0.5) / structuralSummaryRows.length * structuralPlotWidth +
  (armIndex === 0 ? -18 : 18);
const structuralSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${structuralHeight}" viewBox="0 0 ${structuralWidth} ${structuralHeight}" role="img" aria-labelledby="structural-title structural-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="structural-title">Keyed structural update latency</title>`,
  `<desc id="structural-desc">Logarithmic chart of median synchronous update latency across three fresh page loads for rotate, edge replacement, and half-list filtering with 10,000 keyed rows. Page p95s are printed below to expose the filter tail.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="25" font-size="16" font-weight="700">Structural parent updates with stateful keyed rows</text>`,
  `<text x="18" y="45" font-size="10" fill="#555">10,000 rows · median of 3 page medians · whiskers show page median range · log latency axis</text>`,
  `<circle cx="610" cy="27" r="4" fill="#b45309"/><text x="620" y="31" font-size="10">React 19.3 + Compiler</text>`,
  `<circle cx="755" cy="27" r="4" fill="#047857"/><text x="765" y="31" font-size="10">compiled runtime</text>`,
];
for (const tick of [10, 30, 100, 300]) {
  const yy = structuralY(tick);
  structuralSvg.push(
    `<line x1="${structuralLeft}" y1="${yy}" x2="${
      structuralWidth - structuralRight
    }" y2="${yy}" stroke="#e5e7eb"/><text x="${structuralLeft - 10}" y="${
      yy + 3
    }" text-anchor="end" font-size="9" fill="#555">${tick} ms</text>`,
  );
}
for (let index = 0; index < structuralSummaryRows.length; index++) {
  const row = structuralSummaryRows[index];
  for (const [armIndex, arm] of (["react", "runtime"] as const).entries()) {
    const x = structuralX(index, armIndex);
    const color = arm === "react" ? "#b45309" : "#047857";
    const median = row.medianOfPageMediansMs[arm];
    const [low, high] = row.pageMedianRangeMs[arm];
    structuralSvg.push(
      `<line x1="${x}" y1="${structuralY(low)}" x2="${x}" y2="${
        structuralY(high)
      }" stroke="${color}" stroke-width="2"/><line x1="${x - 5}" y1="${
        structuralY(low)
      }" x2="${x + 5}" y2="${structuralY(low)}" stroke="${color}"/><line x1="${
        x - 5
      }" y1="${structuralY(high)}" x2="${x + 5}" y2="${
        structuralY(high)
      }" stroke="${color}"/><circle cx="${x}" cy="${
        structuralY(median)
      }" r="5" fill="${color}"/><text x="${x}" y="${
        structuralY(median) - 9
      }" text-anchor="middle" font-size="9" fill="${color}">${
        median.toFixed(1)
      }</text>`,
    );
  }
  const labelX = structuralLeft +
    (index + 0.5) / structuralSummaryRows.length * structuralPlotWidth;
  structuralSvg.push(
    `<text x="${labelX}" y="${
      structuralHeight - 56
    }" text-anchor="middle" font-size="10">${row.operation}</text><text x="${labelX}" y="${
      structuralHeight - 34
    }" text-anchor="middle" font-size="9" fill="#555">p95 React/runtime: ${
      row.medianOfPageP95Ms.react.toFixed(1)
    } / ${row.medianOfPageP95Ms.runtime.toFixed(1)} ms</text>`,
  );
}
structuralSvg.push(`</svg>`);
Deno.jupyter.svg`${structuralSvg.join("")}`;
