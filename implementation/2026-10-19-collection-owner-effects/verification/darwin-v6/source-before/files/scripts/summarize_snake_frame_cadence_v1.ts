type Arm = "react" | "runtime-vdom" | "columnar-vdom";
type RecordValue = {
  schemaVersion: string;
  status: string;
  allContractsPass: boolean;
  collection: string;
  trialId: string;
  replication: number;
  arm: Arm;
  segmentCount: number;
  calibrationFrames: number;
  warmupFrames: number;
  measuredFrames: number;
  baselineRafMs: { median: number; p95: number; samples: number[] };
  measuredRafMs: {
    median: number;
    p95: number;
    lateCallbackCount: number;
    lateCallbackRate: number;
    estimatedMissedSlots: number;
    samples: number[];
  };
  updateCpuMs: { median: number; p95: number; sum: number; samples: number[] };
  mountMs: number;
  teardownMs: number;
  browser: { buildMode: string; visibilityState: string; userAgent: string };
};
const base = "results/snake-frame-cadence-v1";
const prereg = JSON.parse(await Deno.readTextFile(`${base}/preregistration.json`));
const lock = JSON.parse(await Deno.readTextFile(`${base}/source-lock.json`));
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
if (
  prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION" ||
  prereg.schedule.length !== 45 ||
  lock.status !== "FROZEN_BEFORE_COLLECTION"
) throw new Error("Cadence preregistration/source lock is incomplete");
for (const entry of [...lock.sourceFiles, ...lock.productionAssets]) {
  const bytes = await Deno.readFile(entry.path);
  if (bytes.byteLength !== entry.bytes || await hash(bytes) !== entry.sha256) {
    throw new Error(`Frozen cadence input changed: ${entry.path}`);
  }
}
const records: RecordValue[] = [];
const rawFiles: Array<{ path: string; bytes: number; sha256: string }> = [];
for await (const entry of Deno.readDir(base)) {
  if (!entry.isFile || !/^cadence-v1-.*\.json$/.test(entry.name)) continue;
  const path = `${base}/${entry.name}`;
  const bytes = await Deno.readFile(path);
  rawFiles.push({ path, bytes: bytes.length, sha256: await hash(bytes) });
  records.push(JSON.parse(new TextDecoder().decode(bytes)));
}
const expected = new Set(prereg.schedule.map((item: any) =>
  `${item.replication}/${item.segmentCount}/${item.arm}`
));
const observed = new Set(records.map((item) =>
  `${item.replication}/${item.segmentCount}/${item.arm}`
));
if (
  records.length !== prereg.schedule.length || observed.size !== expected.size ||
  [...expected].some((key) => !observed.has(key))
) throw new Error(JSON.stringify({ expected: expected.size, observed: observed.size }));
for (const record of records) {
  if (
    record.schemaVersion !== "snake-frame-cadence-browser-v1" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.collection !== "scheduled" ||
    record.browser.buildMode !== "production" ||
    record.browser.visibilityState !== "visible" ||
    record.calibrationFrames !== 120 || record.warmupFrames !== 60 ||
    record.measuredFrames !== 240 || record.baselineRafMs.samples.length !== 120 ||
    record.measuredRafMs.samples.length !== 240 ||
    record.updateCpuMs.samples.length !== 240
  ) throw new Error(`Cadence record contract failed: ${record.trialId}`);
}
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const median = (values: number[]) => percentile(values, 0.5);
const sizes = [1024, 4096, 8192];
const arms: Arm[] = ["react", "runtime-vdom", "columnar-vdom"];
const comparisons = sizes.map((segmentCount) => {
  const byArm = Object.fromEntries(arms.map((arm) => {
    const pages = records.filter((record) =>
      record.segmentCount === segmentCount && record.arm === arm
    );
    return [arm, {
      n: pages.length,
      updateCpuMedianMs: median(pages.map((record) => record.updateCpuMs.median)),
      updateCpuP95Ms: median(pages.map((record) => record.updateCpuMs.p95)),
      rafIntervalMedianMs: median(pages.map((record) => record.measuredRafMs.median)),
      rafIntervalP95Ms: median(pages.map((record) => record.measuredRafMs.p95)),
      lateCallbackRate: median(pages.map((record) => record.measuredRafMs.lateCallbackRate)),
      estimatedMissedSlots: median(pages.map((record) => record.measuredRafMs.estimatedMissedSlots)),
      baselineMedianMs: median(pages.map((record) => record.baselineRafMs.median)),
      mountMedianMs: median(pages.map((record) => record.mountMs)),
      teardownMedianMs: median(pages.map((record) => record.teardownMs)),
    }];
  })) as Record<Arm, Record<string, number>>;
  const pairs = [1, 2, 3, 4, 5].map((replication) => {
    const find = (arm: Arm) => records.find((record) =>
      record.segmentCount === segmentCount && record.replication === replication &&
      record.arm === arm
    )!;
    const react = find("react");
    const columnar = find("columnar-vdom");
    return {
      replication,
      reactUpdateMedianMs: react.updateCpuMs.median,
      columnarUpdateMedianMs: columnar.updateCpuMs.median,
      reactLateCallbackRate: react.measuredRafMs.lateCallbackRate,
      columnarLateCallbackRate: columnar.measuredRafMs.lateCallbackRate,
      reactEstimatedMissedSlots: react.measuredRafMs.estimatedMissedSlots,
      columnarEstimatedMissedSlots: columnar.measuredRafMs.estimatedMissedSlots,
    };
  });
  return { segmentCount, arms: byArm, pairs };
});
const updateCpuWins = comparisons.filter((item) => item.segmentCount >= 4096)
  .map((item) => ({
    segmentCount: item.segmentCount,
    wins: item.pairs.filter((pair) =>
      pair.columnarUpdateMedianMs < pair.reactUpdateMedianMs
    ).length,
  }));
const cadenceAt8192 = comparisons.find((item) => item.segmentCount === 8192)!;
const cadenceWins = cadenceAt8192.pairs.filter((pair) =>
  pair.columnarEstimatedMissedSlots < pair.reactEstimatedMissedSlots
).length;
const zeroHeadroom = ["react", "columnar-vdom"].every((arm) => {
  const pages = records.filter((record) =>
    record.segmentCount === 8192 && record.arm === arm
  );
  return pages.filter((record) => record.measuredRafMs.lateCallbackCount === 0)
      .length >= 4;
});
const correctnessPass = records.every((record) => record.allContractsPass);
const updateCpuPass = updateCpuWins.length === 2 &&
  updateCpuWins.every((entry) => entry.wins >= 4);
const cadenceAdvantagePass = cadenceWins >= 4;
const status = zeroHeadroom
  ? "CADENCE_INCONCLUSIVE_FLOOR"
  : correctnessPass && updateCpuPass && cadenceAdvantagePass
  ? "HYPOTHESIS_PASS"
  : "HYPOTHESIS_FAIL";
const summary = {
  schemaVersion: "snake-frame-cadence-summary-v1",
  status,
  collectionStatus: "COMPLETE",
  preregistration: `${base}/preregistration.json`,
  sourceLock: `${base}/source-lock.json`,
  recordCount: records.length,
  correctnessPass,
  updateCpuPass,
  cadenceAdvantagePass,
  zeroHeadroom,
  updateCpuWins,
  cadenceWinsAt8192: cadenceWins,
  comparisons,
  interpretation: prereg.decisionRules.interpretation,
  limitations: prereg.design.exclusions,
  rawManifest: `${base}/manifest.json`,
  records: records.map((record) => ({
    trialId: record.trialId,
    replication: record.replication,
    arm: record.arm,
    segmentCount: record.segmentCount,
    baselineMedianMs: record.baselineRafMs.median,
    updateCpuMedianMs: record.updateCpuMs.median,
    updateCpuP95Ms: record.updateCpuMs.p95,
    rafMedianMs: record.measuredRafMs.median,
    rafP95Ms: record.measuredRafMs.p95,
    lateCallbackCount: record.measuredRafMs.lateCallbackCount,
    estimatedMissedSlots: record.measuredRafMs.estimatedMissedSlots,
  })),
};
const manifest = {
  schemaVersion: "snake-frame-cadence-manifest-v1",
  status: "PASS",
  preregistration: `${base}/preregistration.json`,
  sourceLock: `${base}/source-lock.json`,
  recordCount: rawFiles.length,
  records: rawFiles.sort((a, b) => a.path.localeCompare(b.path)),
};
await Deno.writeTextFile(`${base}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
await Deno.writeTextFile(`${base}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  status,
  recordCount: records.length,
  correctnessPass,
  updateCpuWins,
  cadenceWinsAt8192: cadenceWins,
  zeroHeadroom,
}, null, 2));
