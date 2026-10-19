const manifest = JSON.parse(await Deno.readTextFile("results/browser-component-state-react-manifest-v1.json"));
if (manifest.schemaVersion !== "component-state-react-browser-manifest-v1" || manifest.status !== "COMPLETE" || !manifest.pageLoadsAreReplicationUnit) {
  throw new Error("Invalid component-state React browser run manifest");
}
const manifestCounts = [100, 1_000, 5_000, 10_000];
if (manifest.records.length !== 12 || manifestCounts.some((count) =>
  manifest.records.filter((item: any) => item.count === count).length !== 3
)) throw new Error("Expected three manifest-listed production page loads at every size");
const files: Array<{ name: string; record: any }> = await Promise.all(manifest.records.map(async (item: any) => ({
  name: item.file.replace(/^results\//, ""),
  record: JSON.parse(await Deno.readTextFile(item.file)),
})));
if (!files.length) throw new Error("No component-state React browser records found");

const first = files[0].record;
const expectedCounts = new Set([100, 1_000, 5_000, 10_000]);
for (const { name, record } of files) {
  if (record.status !== "PASS" || !expectedCounts.has(record.count) ||
    !manifest.records.some((item: any) => item.file === `results/${name}` && item.count === record.count && item.seed === record.seed) ||
    record.warmupPairs !== 8 || record.measuredPairs !== 40 || record.updatesPerSample !== 100 ||
    record.samples?.length !== 40 || !record.finalOutputParity || !record.stableTargetIdentity ||
    !record.partialCommitContract || record.partialCommitsPerUpdate !== 1 ||
    record.rendersPerUpdate?.react !== 1 || record.rendersPerUpdate?.runtime !== 1 ||
    JSON.stringify(record.browser) !== JSON.stringify(manifest.browser) ||
    record.browser?.userAgent !== first.browser.userAgent || record.browser?.platform !== first.browser.platform) {
    throw new Error(`Invalid, incompatible, or failed browser record: ${name}`);
  }
}

const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = ordered.length >>> 1;
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
};
const counts = [...new Set(files.map(({ record }) => record.count))].sort((a, b) => a - b);
const scenarios = counts.map((count) => {
  const runs = files.filter(({ record }) => record.count === count);
  const medianMs = {
    react: median(runs.map(({ record }) => record.medianMs.react)),
    runtime: median(runs.map(({ record }) => record.medianMs.runtime)),
  };
  const p95Ms = {
    react: median(runs.map(({ record }) => record.p95Ms.react)),
    runtime: median(runs.map(({ record }) => record.p95Ms.runtime)),
  };
  const speedups = runs.map(({ record }) => record.medianMs.react / record.medianMs.runtime);
  const wins = runs.flatMap(({ record }) => record.samples.map((sample: any) => ({
    react: sample.milliseconds.react,
    runtime: sample.milliseconds.runtime,
  })));
  return {
    count,
    pageLoadReplications: runs.length,
    medianMs,
    pageMedianRangeMs: {
      react: [Math.min(...runs.map(({ record }) => record.medianMs.react)), Math.max(...runs.map(({ record }) => record.medianMs.react))],
      runtime: [Math.min(...runs.map(({ record }) => record.medianMs.runtime)), Math.max(...runs.map(({ record }) => record.medianMs.runtime))],
    },
    medianPageP95Ms: p95Ms,
    medianMountMs: {
      react: median(runs.map(({ record }) => record.mountMs.react)),
      runtime: median(runs.map(({ record }) => record.mountMs.runtime)),
    },
    medianPerPageSpeedup: median(speedups),
    pairedSampleWins: {
      runtime: wins.filter((sample: any) => sample.runtime < sample.react).length,
      react: wins.filter((sample: any) => sample.react < sample.runtime).length,
      ties: wins.filter((sample: any) => sample.react === sample.runtime).length,
      total: wins.length,
    },
    runs: runs.map(({ name, record }) => ({
      file: `results/${name}`,
      seed: record.seed,
      collectedAt: record.collectedAt,
      medianMs: record.medianMs,
      p95Ms: record.p95Ms,
      mountMs: record.mountMs,
    })),
    contractsPass: runs.every(({ record }) => record.finalOutputParity && record.stableTargetIdentity && record.partialCommitContract),
  };
});
const summary = {
  schemaVersion: "component-state-react-browser-summary-v1",
  status: "PASS",
  benchmark: "one keyed leaf-local boolean state update in a tree with count sibling components",
  primaryUnit: "median milliseconds per update, summarized first within page load then across page-load medians",
  browser: first.browser,
  manifestFile: "results/browser-component-state-react-manifest-v1.json",
  deployment: manifest.deployment,
  pageLoadsAreReplicationUnit: true,
  independentBrowserProfiles: 1,
  scenarios,
  methodology: {
    warmupPairs: 8,
    measuredPairsPerPage: 40,
    updatesPerPairArm: 100,
    armOrder: "seeded randomized within page; both arms receive the same programmatic HTMLElement.click() event path shape",
    react: "React 19.3.0 production build with React Compiler enabled, local useState leaf, React DOM event path",
    runtime: "OXC-generated owner/site state component, native leaf listener, graph-selected owner and indexed keyed-region commit",
    timing: "programmatic event dispatch through committed DOM text/attribute; mount measured separately; layout and paint excluded",
    correctness: "every update checks target output; final full tree parity, stable target identity, one render per update, and one runtime partial commit per update",
  },
  limitation: "All page loads used one Chrome 155 profile and one MacIntel device. Repeated page loads are not independent browser-profile or device replications. This is one favorable keyed-leaf local-state workload; it does not cover other React tree shapes, multi-owner batches, structural updates, lifecycle churn, real user input, paint, or general framework superiority. The data show size-correlated scaling in this fixture but do not by themselves identify the exact React internal traversal responsible.",
  rawFiles: files.map(({ name }) => `results/${name}`),
};
await Deno.writeTextFile("results/browser-component-state-react-summary-v1.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(scenarios.map(({ count, pageLoadReplications, medianMs, pageMedianRangeMs, medianPageP95Ms, medianPerPageSpeedup, pairedSampleWins }) => ({
  count, pageLoadReplications, medianMs, pageMedianRangeMs, medianPageP95Ms, medianPerPageSpeedup, pairedSampleWins,
})), null, 2));
console.log("Saved results/browser-component-state-react-summary-v1.json");
