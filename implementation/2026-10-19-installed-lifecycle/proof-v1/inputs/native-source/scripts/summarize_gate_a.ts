type Arm = "react" | "handwritten" | "compiled";
type GateRecord = {
  sessionId: string;
  pageLoadId: string;
  seed: number;
  entityCount: number;
  browser: { userAgent: string; hardwareConcurrency: number; devicePixelRatio: number };
  summaries: Record<Arm, { medianMs: number; p95Ms: number }>;
  mountMs: Record<Arm, number>;
  outputParity: boolean;
  finalParity: boolean;
  pairs: Array<{
    sameOutput: boolean;
    keyRetention: Record<Arm, { preserved: number; shared: number }>;
  }>;
};

const files = [
  "results/browser-keyed-regions-gate-a-session-1.json",
  "results/browser-keyed-regions-gate-a-chrome-repeat.json",
  "results/browser-keyed-regions-gate-a-session-2.json",
];
const arms: Arm[] = ["react", "handwritten", "compiled"];
const records: GateRecord[] = [];
for (const file of files) {
  const rows = JSON.parse(await Deno.readTextFile(file)) as GateRecord[];
  if (rows.length !== 9) throw new Error(`${file}: expected nine page loads, found ${rows.length}`);
  for (const row of rows) {
    if (!row.outputParity || !row.finalParity || row.pairs.length !== 24 || row.pairs.some((pair) =>
      !pair.sameOutput || arms.some((arm) => pair.keyRetention[arm].preserved !== pair.keyRetention[arm].shared)
    )) {
      throw new Error(`${file}: parity/pair validation failed for seed ${row.seed}`);
    }
  }
  records.push(...rows);
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const sessions = [...new Set(records.map((row) => row.sessionId))];
const summary = sessions.flatMap((sessionId) => [1000, 5000, 10000].map((entityCount) => {
  const pages = records.filter((row) => row.sessionId === sessionId && row.entityCount === entityCount);
  if (pages.length !== 3) throw new Error(`${sessionId}/${entityCount}: expected three independent page loads`);
  return {
    sessionId,
    entityCount,
    pageLoads: pages.map((row) => ({
      pageLoadId: row.pageLoadId,
      seed: row.seed,
      browser: row.browser,
      medianMs: Object.fromEntries(arms.map((arm) => [arm, row.summaries[arm].medianMs])),
      p95Ms: Object.fromEntries(arms.map((arm) => [arm, row.summaries[arm].p95Ms])),
      mountMs: row.mountMs,
    })),
    arms: Object.fromEntries(arms.map((arm) => {
      const pageMedians = pages.map((row) => row.summaries[arm].medianMs);
      const pageP95s = pages.map((row) => row.summaries[arm].p95Ms);
      return [arm, {
        medianOfPageMediansMs: median(pageMedians),
        pageMedianRangeMs: [Math.min(...pageMedians), Math.max(...pageMedians)],
        medianOfPageP95Ms: median(pageP95s),
        pageP95RangeMs: [Math.min(...pageP95s), Math.max(...pageP95s)],
        medianMountMs: median(pages.map((row) => row.mountMs[arm])),
      }];
    })),
    graphToReactMedianRatio: median(pages.map((row) => row.summaries.compiled.medianMs / row.summaries.react.medianMs)),
  };
}));

const output = {
  schemaVersion: 1,
  experiment: "Gate A two-region keyed VDOM browser replication",
  generatedAt: new Date().toISOString(),
  replicationUnit: "one-size page load; timed pairs are nested within page loads",
  sessionCount: sessions.length,
  pageLoadCount: records.length,
  timedPairsPerPage: 24,
  matchedBrowserRepeat: {
    collectionIds: ["gate-a-session-1", "gate-a-chrome-repeat"],
    browserUserAgent: records.find((row) => row.sessionId === "gate-a-session-1")?.browser.userAgent,
    sameUserAgentAcrossCollections: records
      .filter((row) => row.sessionId === "gate-a-chrome-repeat")
      .every((row) => row.browser.userAgent === records.find((sample) => sample.sessionId === "gate-a-session-1")?.browser.userAgent),
    independentBrowserProfile: false,
  },
  crossSurfaceCollectionId: "gate-a-session-2",
  validity: {
    allIntermediateOutputsMatched: true,
    allFinalOutputsMatched: true,
    pageLoadReplicationPerSessionAndSize: 3,
    browserSessionConfoundedWithBrowserSurfaceAndVersion: true,
    paintAndPresentationExcluded: true,
    compilerBuildTimeExcluded: true,
    allPageTailOutliersRetained: true,
  },
  summary,
};
await Deno.writeTextFile("results/browser-keyed-regions-gate-a-summary-v1.json", JSON.stringify(output, null, 2) + "\n");
console.log(`Validated ${records.length} page loads and ${records.length * 24} paired timings; wrote Gate A summary.`);
for (const row of summary) {
  console.log(`${row.sessionId} ${row.entityCount}: React ${row.arms.react.medianOfPageMediansMs.toFixed(3)} ms; whole VDOM ${row.arms.handwritten.medianOfPageMediansMs.toFixed(3)} ms; graph ${row.arms.compiled.medianOfPageMediansMs.toFixed(3)} ms; graph/React ${row.graphToReactMedianRatio.toFixed(3)}×`);
}
