const directory = "results/component-state-owner-reuse-v3";
const sourceLockPath = `${directory}/browser-source-lock.json`;
const sourceLock = JSON.parse(await Deno.readTextFile(sourceLockPath));
const hash = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return {
    path,
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  };
};
const median = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const arms = ["react", "generic", "token", "token-delta"] as const;
const stages = ["edge", "rotate"] as const;
const replications = [];
const rows: any[] = [];
for (let replication = 1; replication <= 5; replication++) {
  const path =
    `${directory}/browser-production/component-state-owner-reuse-v3-browser-${
      83_005_300 + replication
    }.json`;
  const record = JSON.parse(await Deno.readTextFile(path));
  if (
    record.schemaVersion !== "component-state-owner-reuse-v3-browser-v1" ||
    record.status !== "PASS" || record.replication !== replication ||
    record.seed !== 83_005_300 + replication || record.count !== 10_000 ||
    record.warmupPairs !== 8 || record.measuredPairs !== 24 ||
    record.browser?.buildMode !== "production" ||
    record.browser?.visibilityState !== "visible" ||
    record.reactCompiler?.package !== "babel-plugin-react-compiler" ||
    record.reactCompiler?.target !== "19" ||
    record.samples?.length !== 24 ||
    Object.values(record.integrity ?? {}).some((passed) => passed !== true)
  ) throw new Error(`V3 browser record contract failed: ${path}`);
  for (const sample of record.samples) {
    if (
      !sample.parity?.edge || !sample.parity?.rotate ||
      arms.some((arm) =>
        !sample.identity?.[arm]?.edge || !sample.identity?.[arm]?.rotate ||
        !sample.retainedState?.[arm]?.edge ||
        !sample.retainedState?.[arm]?.rotate
      )
    ) throw new Error(`V3 browser sample integrity failed: ${path}`);
  }
  const fileHash = await hash(path);
  replications.push({ replication, ...fileHash });
  for (const stage of stages) {
    rows.push({
      replication,
      stage,
      medianMs: record.stages[stage].medianMs,
      p95Ms: record.stages[stage].p95Ms,
      pairedRatioMedian: record.stages[stage].pairedRatioMedian,
    });
  }
}
if (
  sourceLock.schemaVersion !==
    "component-state-owner-reuse-v3-browser-source-lock-v1" ||
  sourceLock.status !== "FROZEN_BEFORE_PRODUCTION_PAGE_COLLECTION" ||
  sourceLock.sourceEntries?.length !== 19 ||
  sourceLock.buildAssets?.length !== 4
) throw new Error("V3 browser source-lock contract failed");
const summary = Object.fromEntries(stages.map((stage) => {
  const stageRows = rows.filter((row) => row.stage === stage);
  const pageLevelRatios = Object.fromEntries(
    ["tokenOverGeneric", "deltaOverGeneric", "deltaOverReact", "deltaOverToken"]
      .map((key) => [
        key,
        median(stageRows.map((row) => row.pairedRatioMedian[key])),
      ]),
  );
  const pageLevelTimes = Object.fromEntries(arms.map((arm) => [
    arm,
    {
      medianOfPageMedians: median(
        stageRows.map((row) => row.medianMs[arm]),
      ),
      rangeOfPageMedians: [
        Math.min(...stageRows.map((row) => row.medianMs[arm])),
        Math.max(...stageRows.map((row) => row.medianMs[arm])),
      ],
      medianOfPageP95s: median(stageRows.map((row) => row.p95Ms[arm])),
    },
  ]));
  const pagePasses = stageRows.map((row) =>
    stage === "edge"
      ? {
        replication: row.replication,
        deltaOverGeneric: row.pairedRatioMedian.deltaOverGeneric,
        edgeFallbackPass: row.pairedRatioMedian.deltaOverGeneric <= 1.10,
      }
      : {
        replication: row.replication,
        deltaOverGeneric: row.pairedRatioMedian.deltaOverGeneric,
        deltaOverReact: row.pairedRatioMedian.deltaOverReact,
        rotationRuntimePass: row.pairedRatioMedian.deltaOverGeneric <= 0.50,
        rotationReactPass: row.pairedRatioMedian.deltaOverReact <= 0.90,
      }
  );
  return [stage, { pageLevelTimes, pageLevelRatios, pagePasses }];
}));
const edgePassCount =
  summary.edge.pagePasses.filter((row: any) => row.edgeFallbackPass).length;
const rotationRuntimePassCount =
  summary.rotate.pagePasses.filter((row: any) => row.rotationRuntimePass)
    .length;
const rotationReactPassCount =
  summary.rotate.pagePasses.filter((row: any) => row.rotationReactPass).length;
const manifest = {
  schemaVersion: "component-state-owner-reuse-v3-browser-manifest-v1",
  createdAt: new Date().toISOString(),
  status: "PASS",
  decision: edgePassCount >= 4 && rotationRuntimePassCount >= 4 &&
      rotationReactPassCount >= 4
    ? "PASS"
    : "FAIL",
  preregistration: `${directory}/browser-preregistration.json`,
  preregistrationAmendment:
    `${directory}/browser-preregistration-amendment-1.json`,
  sourceLock: {
    ...await hash(sourceLockPath),
    lockedInputCount: sourceLock.sourceEntries.length,
    builtAssetCount: sourceLock.buildAssets.length,
    status: sourceLock.status,
  },
  analysisScript: await hash(
    "scripts/create_component_state_owner_reuse_v3_browser_manifest.ts",
  ),
  replicationUnit:
    "Fresh visible production browser page; five page replications",
  design: {
    count: 10_000,
    warmupPairs: 8,
    measuredPairs: 24,
    compilerBaseline: "React 19.3 + build-verified React Compiler target 19",
  },
  integrity: {
    allFivePagesPresent: replications.length === 5,
    allPagesPassOutputIdentityAndChildState: true,
    allPagesUseVerifiedReactCompilerBuild: true,
  },
  decisionRules: {
    edgeFallbackPasses:
      `${edgePassCount}/5; require at least 4/5 at <=1.10x generic`,
    rotationRuntimePasses:
      `${rotationRuntimePassCount}/5; require at least 4/5 at <=0.50x generic`,
    rotationReactPasses:
      `${rotationReactPassCount}/5; require at least 4/5 at <=0.90x React Compiler`,
    overall: edgePassCount >= 4 && rotationRuntimePassCount >= 4 &&
        rotationReactPassCount >= 4
      ? "PASS"
      : "FAIL",
  },
  summary,
  replications,
  limitations: [
    "One device and browser profile; the five fresh pages are not independent device replications.",
    "The focused workload measures update dispatch through host commit, not layout, paint, or presentation.",
    "The sequence tests one keyed edge replacement followed by a same-membership rotation; it does not generalize to arbitrary JSX or structural churn.",
    "No manually memoized React arm is included; the React Compiler output is build-verified.",
  ],
};
await Deno.writeTextFile(
  `${directory}/browser-manifest.json`,
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
