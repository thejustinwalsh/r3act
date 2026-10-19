type RecordValue = {
  schemaVersion: string;
  status: string;
  allContractsPass: boolean;
  collection: string;
  trialId: string;
  replication: number;
  arm: "react" | "runtime-vdom" | "columnar-vdom";
  segmentCount: number;
  measuredFrames: number;
  mountMs: number;
  teardownMs: number;
  primaryCycleCostMs: number;
  fullRafElapsedMs: number;
  warmupFrames: number;
  updateCpuMs: { median: number; p95: number; sum: number; samples: number[] };
  browser: Record<string, unknown>;
};
const base = "results/snake-frame-lifecycle-v1";
const prereg = JSON.parse(
  await Deno.readTextFile(`${base}/preregistration.json`),
);
const lock = JSON.parse(await Deno.readTextFile(`${base}/source-lock.json`));
if (lock.status !== "FROZEN_BEFORE_COLLECTION") {
  throw new Error("Source lock is not frozen");
}
for (
  const file of lock.files as Array<
    { path: string; bytes: number; sha256: string }
  >
) {
  const bytes = await Deno.readFile(file.path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.byteLength !== file.bytes || hash !== file.sha256) {
    throw new Error(`Frozen input changed: ${file.path}`);
  }
}
const records: RecordValue[] = [];
const rawFiles: Array<{ path: string; bytes: number; sha256: string }> = [];
for await (const entry of Deno.readDir(base)) {
  if (!entry.isFile || !/^lifecycle-v1-.*\.json$/.test(entry.name)) continue;
  const path = `${base}/${entry.name}`;
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  rawFiles.push({
    path,
    bytes: bytes.byteLength,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  });
  records.push(JSON.parse(new TextDecoder().decode(bytes)));
}
const schedule = prereg.schedule as Array<{
  replication: number;
  arm: RecordValue["arm"];
  segmentCount: number;
}>;
const keyOf = (
  item: { replication: number; arm: string; segmentCount: number },
) => `${item.replication}/${item.segmentCount}/${item.arm}`;
const expected = new Set(schedule.map(keyOf));
const byTrial = new Map<string, RecordValue>();
for (const record of records) {
  if (record.collection !== "scheduled") {
    throw new Error(
      `Non-scheduled record found in production directory: ${record.trialId}`,
    );
  }
  if (byTrial.has(record.trialId)) {
    throw new Error(`Duplicate trial: ${record.trialId}`);
  }
  byTrial.set(record.trialId, record);
}
const observed = new Set(records.map(keyOf));
const missing = [...expected].filter((key) => !observed.has(key));
const unexpected = [...observed].filter((key) => !expected.has(key));
if (records.length !== schedule.length || missing.length || unexpected.length) {
  throw new Error(JSON.stringify(
    {
      status: "INCOMPLETE",
      expected: schedule.length,
      observed: records.length,
      missing,
      unexpected,
    },
    null,
    2,
  ));
}
for (const record of records) {
  if (
    record.schemaVersion !== "snake-frame-lifecycle-browser-v1" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.measuredFrames !== prereg.design.measuredFrames
  ) throw new Error(`Correctness gate failed for ${record.trialId}`);
}
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const median = (values: number[]) => percentile(values, 0.5);
const armSummary = (segmentCount: number, arm: RecordValue["arm"]) => {
  const cell = records.filter((record) =>
    record.segmentCount === segmentCount && record.arm === arm
  );
  return {
    n: cell.length,
    cycleCostMs: {
      median: median(cell.map((record) => record.primaryCycleCostMs)),
      p95: percentile(cell.map((record) => record.primaryCycleCostMs), 0.95),
    },
    mountMs: median(cell.map((record) => record.mountMs)),
    teardownMs: median(cell.map((record) => record.teardownMs)),
    updateMedianMs: median(cell.map((record) => record.updateCpuMs.median)),
    updateP95Ms: median(cell.map((record) => record.updateCpuMs.p95)),
    medianPageRafElapsedMs: median(cell.map((record) => record.fullRafElapsedMs)),
    estimatedMsPerRafSlot: median(cell.map((record) =>
      record.fullRafElapsedMs /
        (record.warmupFrames + record.measuredFrames + 1)
    )),
  };
};
const comparisons = [512, 1024].map((segmentCount) => {
  const paired = [1, 2, 3, 4, 5].map((replication) => {
    const get = (arm: RecordValue["arm"]) =>
      records.find((record) =>
        record.replication === replication &&
        record.segmentCount === segmentCount && record.arm === arm
      )!;
    const react = get("react");
    const columnar = get("columnar-vdom");
    return {
      replication,
      reactCycleMs: react.primaryCycleCostMs,
      columnarCycleMs: columnar.primaryCycleCostMs,
      columnarToReactCycleRatio: columnar.primaryCycleCostMs /
        react.primaryCycleCostMs,
      reactUpdateMedianMs: react.updateCpuMs.median,
      columnarUpdateMedianMs: columnar.updateCpuMs.median,
      columnarToReactUpdateRatio: columnar.updateCpuMs.median /
        react.updateCpuMs.median,
    };
  });
  const cycleWins = paired.filter((pair) =>
    pair.columnarToReactCycleRatio <= 0.9
  ).length;
  const updateNonworse =
    paired.filter((pair) => pair.columnarToReactUpdateRatio <= 1).length;
  return {
    segmentCount,
    arms: Object.fromEntries(
      ["react", "runtime-vdom", "columnar-vdom"].map((
        arm,
      ) => [arm, armSummary(segmentCount, arm as RecordValue["arm"])]),
    ),
    pairedColumnarVsReact: {
      pairs: paired,
      medianCycleRatio: median(
        paired.map((pair) => pair.columnarToReactCycleRatio),
      ),
      cycleAdvantagePassCount: cycleWins,
      updateMedianRatio: median(
        paired.map((pair) => pair.columnarToReactUpdateRatio),
      ),
      updateNonworsePassCount: updateNonworse,
      cycleAdvantagePass: cycleWins >= 4,
      updateCostPreservedPass: updateNonworse >= 4,
    },
  };
});
const correctnessPass = records.every((record) => record.status === "PASS");
const hypothesisPass = correctnessPass &&
  comparisons.every((item) =>
    item.pairedColumnarVsReact.cycleAdvantagePass &&
    item.pairedColumnarVsReact.updateCostPreservedPass
  );
const result = {
  schemaVersion: "snake-frame-lifecycle-v1-summary",
  status: hypothesisPass ? "HYPOTHESIS_PASS" : "HYPOTHESIS_FAIL",
  collectionStatus: "COMPLETE",
  preregistration: prereg.schemaVersion,
  preregistrationAmendments: prereg.amendments ?? [],
  sourceLock: {
    status: lock.status,
    includedFiles: lock.includedFiles,
    generatedAt: lock.generatedAt,
  },
  n: records.length,
  rawManifest: `${base}/manifest.json`,
  correctnessPass,
  comparisons,
  interpretation: prereg.decisionRules.interpretation,
  limits: [
    "Same physical device and browser profile; no independent-device replication.",
    "Fixed topology, 512 and 1,024 entities, 300 measured updates per page.",
    "Primary metric excludes navigation, network, parse, JavaScript evaluation, compiler work, layout, paint, GPU, and display wait.",
    "Smoke pages are stored outside this production collection and are not analyzed here.",
    "Exploratory cadence is full RAF wall time divided by scheduled callback slots; individual RAF intervals and physical presentation timestamps were not recorded.",
  ],
  records: records.map((record) => ({
    trialId: record.trialId,
    replication: record.replication,
    arm: record.arm,
    segmentCount: record.segmentCount,
    mountMs: record.mountMs,
    updateCpuSumMs: record.updateCpuMs.sum,
    updateMedianMs: record.updateCpuMs.median,
    updateP95Ms: record.updateCpuMs.p95,
    teardownMs: record.teardownMs,
    primaryCycleCostMs: record.primaryCycleCostMs,
    fullRafElapsedMs: record.fullRafElapsedMs,
    estimatedMsPerRafSlot: record.fullRafElapsedMs /
      (record.warmupFrames + record.measuredFrames + 1),
  })),
};
const manifest = {
  schemaVersion: "snake-frame-lifecycle-v1-raw-manifest",
  status: "PASS",
  preregistration: `${base}/preregistration.json`,
  sourceLock: `${base}/source-lock.json`,
  recordCount: rawFiles.length,
  records: rawFiles.sort((a, b) => a.path.localeCompare(b.path)),
};
await Deno.writeTextFile(
  `${base}/manifest.json`,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await Deno.writeTextFile(
  `${base}/summary.json`,
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify(
  {
    status: result.status,
    n: result.n,
    correctnessPass,
    bySize: comparisons.map((item) => ({
      segmentCount: item.segmentCount,
      cyclePasses: item.pairedColumnarVsReact.cycleAdvantagePassCount,
      updatePasses: item.pairedColumnarVsReact.updateNonworsePassCount,
      medianCycleRatio: item.pairedColumnarVsReact.medianCycleRatio,
    })),
  },
  null,
  2,
));
