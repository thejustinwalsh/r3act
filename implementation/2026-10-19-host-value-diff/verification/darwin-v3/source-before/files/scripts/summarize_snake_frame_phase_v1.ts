const base = "results/snake-frame-phase-v1";
const prereg = JSON.parse(await Deno.readTextFile(`${base}/preregistration.json`));
const lock = JSON.parse(await Deno.readTextFile(`${base}/source-lock.json`));
const hash = async (bytes: Uint8Array) => {
  const owned = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", owned);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
if (
  prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION" ||
  prereg.schedule.length !== 30 ||
  lock.status !== "FROZEN_BEFORE_COLLECTION"
) throw new Error("Phase study preregistration or source lock is invalid");
for (const entry of [...lock.sourceFiles, ...lock.productionAssets]) {
  const bytes = await Deno.readFile(entry.path);
  if (bytes.byteLength !== entry.bytes || await hash(bytes) !== entry.sha256) {
    throw new Error(`Frozen phase-study input changed: ${entry.path}`);
  }
}
const expected = new Map<string, any>(prereg.schedule.map((page: any): [string, any] => [
  `phase-v1-s${page.segmentCount}-r${page.replication}-${page.arm}`,
  page,
]));
const files: string[] = [];
for await (const entry of Deno.readDir(base)) {
  if (entry.isFile && /^phase-v1-s\d+-r\d+-.+-\d+\.json$/.test(entry.name)) {
    files.push(`${base}/${entry.name}`);
  }
}
const seen = new Set<string>();
const records: any[] = [];
const manifestRecords = [];
for (const file of files.sort()) {
  const bytes = await Deno.readFile(file);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  const key = record.trialId;
  if (!expected.has(key) || seen.has(key)) {
    throw new Error(`Unexpected or duplicate scheduled phase record: ${key}`);
  }
  if (
    record.collection !== "scheduled" || record.status !== "PASS" ||
    record.allContractsPass !== true ||
    record.longAnimationFrameSupport?.supported !== true ||
    record.measuredFrames !== 240 ||
    record.measuredRafMs?.samples?.length !== 240 ||
    record.updateCpuMs?.samples?.length !== 240 ||
    !record.outputMatches || !record.stableNodeIdentity ||
    !record.emptyContainerAfterTeardown
  ) throw new Error(`Phase record contract failed: ${key}`);
  const expectedPage = expected.get(key) as any;
  if (
    expectedPage.replication !== record.replication ||
    expectedPage.arm !== record.arm ||
    expectedPage.segmentCount !== record.segmentCount
  ) throw new Error(`Scheduled phase metadata mismatch: ${key}`);
  seen.add(key);
  records.push(record);
  manifestRecords.push({
    path: file,
    bytes: bytes.byteLength,
    sha256: await hash(bytes),
  });
}
const missing = [...expected.keys()].filter((key) => !seen.has(key));
if (missing.length) throw new Error(`Missing ${missing.length} scheduled phase records`);
const summarizePage = (record: any) => {
  const entries = record.longAnimationFrames.entries;
  const loafDuration = entries.map((entry: any) => entry.durationMs);
  const scriptDuration = entries.map((entry: any) => entry.scriptDurationSumMs);
  const layoutTail = entries.map((entry: any) =>
    entry.styleAndLayoutStartToEndMs ?? 0
  );
  const renderPrefix = entries.map((entry: any) =>
    entry.renderToStyleAndLayoutStartMs ?? 0
  );
  return {
    trialId: record.trialId,
    replication: record.replication,
    segmentCount: record.segmentCount,
    arm: record.arm,
    loafCount: entries.length,
    totalLoafDurationMs: loafDuration.reduce((sum: number, value: number) => sum + value, 0),
    loafDurationMedianMs: loafDuration.length ? median(loafDuration) : null,
    loafDurationP95Ms: loafDuration.length ? percentile(loafDuration, 0.95) : null,
    totalScriptAttributedDurationMs: scriptDuration.reduce((sum: number, value: number) => sum + value, 0),
    totalPostStyleAndLayoutStartMs: layoutTail.reduce((sum: number, value: number) => sum + value, 0),
    totalRenderStartToStyleAndLayoutStartMs: renderPrefix.reduce((sum: number, value: number) => sum + value, 0),
    updateCpuMedianMs: record.updateCpuMs.median,
    updateCpuP95Ms: record.updateCpuMs.p95,
    rafMedianMs: record.measuredRafMs.median,
    rafP95Ms: record.measuredRafMs.p95,
    baselineMedianMs: record.baselineRafMs.median,
  };
};
const pages = records.map(summarizePage);
const arms = ["react", "runtime-vdom", "columnar-vdom"];
const sizes = [1024, 8192];
const comparisons = sizes.map((segmentCount) => {
  const group = pages.filter((page) => page.segmentCount === segmentCount);
  const armSummary: Record<string, any> = {};
  for (const arm of arms) {
    const armPages = group.filter((page) => page.arm === arm);
    const observed = armPages.flatMap((page) => page.loafCount ? [page] : []);
    armSummary[arm] = {
      n: armPages.length,
      pagesWithLoaf: observed.length,
      pageMedian: {
        loafCount: median(armPages.map((page) => page.loafCount)),
        totalLoafDurationMs: median(armPages.map((page) => page.totalLoafDurationMs)),
        totalScriptAttributedDurationMs: observed.length
          ? median(observed.map((page) => page.totalScriptAttributedDurationMs))
          : null,
        totalPostStyleAndLayoutStartMs: observed.length
          ? median(observed.map((page) => page.totalPostStyleAndLayoutStartMs))
          : null,
        totalRenderStartToStyleAndLayoutStartMs: observed.length
          ? median(observed.map((page) => page.totalRenderStartToStyleAndLayoutStartMs))
          : null,
        updateCpuMedianMs: median(armPages.map((page) => page.updateCpuMedianMs)),
        updateCpuP95Ms: median(armPages.map((page) => page.updateCpuP95Ms)),
        rafMedianMs: median(armPages.map((page) => page.rafMedianMs)),
        rafP95Ms: median(armPages.map((page) => page.rafP95Ms)),
      },
    };
  }
  const pairs = Array.from({ length: 5 }, (_, index) => {
    const replication = index + 1;
    const byArm = Object.fromEntries(arms.map((arm) => [
      arm,
      group.find((page) => page.arm === arm && page.replication === replication),
    ]));
    return { replication, arms: byArm };
  });
  return { segmentCount, arms: armSummary, pairs };
});
const manifest = {
  schemaVersion: "snake-frame-phase-manifest-v1",
  status: "PASS",
  preregistration: `${base}/preregistration.json`,
  sourceLock: `${base}/source-lock.json`,
  recordCount: records.length,
  records: manifestRecords,
};
const summary = {
  schemaVersion: "snake-frame-phase-summary-v1",
  status: "DESCRIPTIVE_COMPLETE",
  recordCount: records.length,
  preregisteredRecordCount: expected.size,
  allContractsPass: records.every((record) => record.allContractsPass),
  apiSupportedOnAllPages: records.every((record) => record.longAnimationFrameSupport.supported),
  interpretation: "Long Animation Frames entries are thresholded (>50 ms) main-thread diagnostics. Script duration and styleAndLayoutStart-to-entry-end are separately reported observables, not mutually exclusive parts of total frame time; absent entries do not imply zero rendering cost. No presentation or causality claim is made.",
  comparisons,
  pages,
  manifest: `${base}/manifest.json`,
  sourceLock: `${base}/source-lock.json`,
  preregistration: `${base}/preregistration.json`,
};
await Deno.writeTextFile(`${base}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
await Deno.writeTextFile(`${base}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  status: summary.status,
  records: summary.recordCount,
  allContractsPass: summary.allContractsPass,
  comparisons: summary.comparisons.map((row) => ({
    segments: row.segmentCount,
    arms: Object.fromEntries(Object.entries(row.arms).map(([arm, stats]: any) => [arm, stats.pageMedian])),
  })),
}, null, 2));
