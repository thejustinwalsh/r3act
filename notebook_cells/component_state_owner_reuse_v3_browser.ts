const ownerV3BrowserDirectory = "results/component-state-owner-reuse-v3";
const ownerV3BrowserManifest = JSON.parse(
  await Deno.readTextFile(
    `${ownerV3BrowserDirectory}/browser-manifest.json`,
  ),
);
const ownerV3BrowserLock = JSON.parse(
  await Deno.readTextFile(
    `${ownerV3BrowserDirectory}/browser-source-lock.json`,
  ),
);
const ownerV3BrowserV2Snapshot = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v2-source-snapshot-manifest.json",
  ),
);
const ownerV3BrowserHash = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return {
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  };
};
const ownerV3BrowserAssert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
ownerV3BrowserAssert(
  ownerV3BrowserManifest.schemaVersion ===
      "component-state-owner-reuse-v3-browser-manifest-v1" &&
    ownerV3BrowserManifest.status === "PASS" &&
    ownerV3BrowserManifest.decision === "FAIL" &&
    ownerV3BrowserManifest.replications.length === 5,
  "V3 browser manifest contract failed",
);
for (
  const entry of [
    ...ownerV3BrowserLock.sourceEntries,
    ...ownerV3BrowserLock.buildAssets,
  ]
) {
  let actualPath = entry.path;
  let actual = await ownerV3BrowserHash(actualPath);
  if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
    const archived = ownerV3BrowserV2Snapshot.entries.find((item: any) =>
      item.sourcePath === entry.path
    );
    if (!archived) throw new Error(`V3 frozen browser input changed: ${entry.path}`);
    actualPath = archived.snapshotPath;
    actual = await ownerV3BrowserHash(actualPath);
  }
  ownerV3BrowserAssert(
    actual.bytes === entry.bytes && actual.sha256 === entry.sha256,
    `V3 frozen browser input changed: ${actualPath}`,
  );
}
const lockHash = await ownerV3BrowserHash(
  `${ownerV3BrowserDirectory}/browser-source-lock.json`,
);
ownerV3BrowserAssert(
  lockHash.bytes === ownerV3BrowserManifest.sourceLock.bytes &&
    lockHash.sha256 === ownerV3BrowserManifest.sourceLock.sha256,
  "V3 browser source-lock hash differs from manifest",
);
const analyzerHash = await ownerV3BrowserHash(
  "scripts/create_component_state_owner_reuse_v3_browser_manifest.ts",
);
ownerV3BrowserAssert(
  analyzerHash.bytes === ownerV3BrowserManifest.analysisScript.bytes &&
    analyzerHash.sha256 === ownerV3BrowserManifest.analysisScript.sha256,
  "V3 browser manifest analyzer hash differs",
);
const ownerV3BrowserArms = [
  "react",
  "generic",
  "token",
  "token-delta",
] as const;
const ownerV3BrowserRecords: any[] = [];
for (const entry of ownerV3BrowserManifest.replications) {
  const rawHash = await ownerV3BrowserHash(entry.path);
  ownerV3BrowserAssert(
    rawHash.bytes === entry.bytes && rawHash.sha256 === entry.sha256,
    `V3 raw browser record hash differs: ${entry.path}`,
  );
  const record = JSON.parse(await Deno.readTextFile(entry.path));
  ownerV3BrowserAssert(
    record.status === "PASS" &&
      record.seed === 83_005_300 + entry.replication &&
      record.count === 10_000 && record.warmupPairs === 8 &&
      record.measuredPairs === 24 && record.samples.length === 24 &&
      record.browser.visibilityState === "visible" &&
      record.browser.buildMode === "production",
    `V3 browser record contract failed: ${entry.path}`,
  );
  ownerV3BrowserAssert(
    Object.values(record.integrity).every((value) => value === true),
    `V3 browser integrity gate failed: ${entry.path}`,
  );
  ownerV3BrowserRecords.push(record);
}
const ownerV3BrowserMedian = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const ownerV3BrowserStages = ["edge", "rotate"] as const;
const ownerV3BrowserSummary = Object.fromEntries(
  ownerV3BrowserStages.map((stage) => [
    stage,
    {
      times: Object.fromEntries(ownerV3BrowserArms.map((arm) => [
        arm,
        ownerV3BrowserMedian(
          ownerV3BrowserRecords.map((record) =>
            record.stages[stage].medianMs[arm]
          ),
        ),
      ])),
      ratios: Object.fromEntries(
        [
          "tokenOverGeneric",
          "deltaOverGeneric",
          "deltaOverReact",
          "deltaOverToken",
        ]
          .map((key) => [
            key,
            ownerV3BrowserMedian(
              ownerV3BrowserRecords.map((record) =>
                record.stages[stage].pairedRatioMedian[key]
              ),
            ),
          ]),
      ),
    },
  ]),
);
const ownerV3BrowserEdgePasses =
  ownerV3BrowserRecords.filter((record) =>
    record.stages.edge.pairedRatioMedian.deltaOverGeneric <= 1.10
  ).length;
const ownerV3BrowserRotationRuntimePasses = ownerV3BrowserRecords.filter(
  (record) => record.stages.rotate.pairedRatioMedian.deltaOverGeneric <= 0.50,
).length;
const ownerV3BrowserRotationReactPasses = ownerV3BrowserRecords.filter(
  (record) => record.stages.rotate.pairedRatioMedian.deltaOverReact <= 0.90,
).length;
ownerV3BrowserAssert(
  ownerV3BrowserEdgePasses === 4 &&
    ownerV3BrowserRotationRuntimePasses === 5 &&
    ownerV3BrowserRotationReactPasses === 0,
  "V3 browser preregistered decision counts changed",
);
for (const stage of ownerV3BrowserStages) {
  for (const arm of ownerV3BrowserArms) {
    const manifestValue = ownerV3BrowserManifest.summary[stage].pageLevelTimes[
      arm
    ].medianOfPageMedians;
    ownerV3BrowserAssert(
      Math.abs(ownerV3BrowserSummary[stage].times[arm] - manifestValue) <
        1e-9,
      `V3 browser summary mismatch: ${stage}/${arm}`,
    );
  }
}
console.log("V3 production browser study · n=5 fresh visible pages");
console.table(ownerV3BrowserStages.map((stage) => ({
  operation: stage === "edge" ? "Edge replacement" : "Same-key rotation",
  reactCompilerMs: ownerV3BrowserSummary[stage].times.react,
  genericMs: ownerV3BrowserSummary[stage].times.generic,
  tokenMs: ownerV3BrowserSummary[stage].times.token,
  tokenDeltaMs: ownerV3BrowserSummary[stage].times["token-delta"],
  deltaOverGeneric: ownerV3BrowserSummary[stage].ratios.deltaOverGeneric,
  deltaOverReact: ownerV3BrowserSummary[stage].ratios.deltaOverReact,
})));
console.log(
  `Preregistered gates: edge ${ownerV3BrowserEdgePasses}/5 (need 4), rotation vs generic ${ownerV3BrowserRotationRuntimePasses}/5 (need 4), rotation vs React Compiler ${ownerV3BrowserRotationReactPasses}/5 (need 4). Overall: FAIL.`,
);
console.log(
  "The page is the replication unit; 24 paired samples are nested within each page. Timing ends at host commit and excludes layout, paint, and presentation.",
);

const ownerV3ChartWidth = 1040;
const ownerV3ChartHeight = 430;
const ownerV3ChartLeft = 210;
const ownerV3ChartRight = 960;
const ownerV3ChartScale = (ownerV3ChartRight - ownerV3ChartLeft) / 14;
const ownerV3ChartColors = {
  react: "#4e79a7",
  generic: "#f28e2b",
  token: "#59a14f",
  "token-delta": "#7f6aad",
};
const ownerV3ChartBars: string[] = [];
const ownerV3ChartTicks = [0, 2, 4, 6, 8, 10, 12, 14].map((value) => {
  const x = ownerV3ChartLeft + value * ownerV3ChartScale;
  return `<line x1="${x}" y1="48" x2="${x}" y2="365" stroke="#e5e7eb"/><text x="${x}" y="39" text-anchor="middle" fill="#59636e" font-size="11">${value}</text>`;
});
for (
  let stageIndex = 0;
  stageIndex < ownerV3BrowserStages.length;
  stageIndex++
) {
  const stage = ownerV3BrowserStages[stageIndex];
  const groupY = 85 + stageIndex * 160;
  ownerV3ChartBars.push(
    `<text x="${ownerV3ChartLeft - 14}" y="${
      groupY + 12
    }" text-anchor="end" fill="#111827" font-size="13" font-weight="650">${
      stage === "edge" ? "Edge replacement" : "Same-key rotation"
    }</text>`,
  );
  for (let armIndex = 0; armIndex < ownerV3BrowserArms.length; armIndex++) {
    const arm = ownerV3BrowserArms[armIndex];
    const value = ownerV3BrowserSummary[stage].times[arm];
    const y = groupY + 22 + armIndex * 24;
    const width = value * ownerV3ChartScale;
    ownerV3ChartBars.push(
      `<text x="${ownerV3ChartLeft - 10}" y="${
        y + 10
      }" text-anchor="end" fill="#48515b" font-size="10">${arm}</text><rect x="${ownerV3ChartLeft}" y="${y}" width="${
        width.toFixed(2)
      }" height="14" rx="3" fill="${ownerV3ChartColors[arm]}"/><text x="${
        (ownerV3ChartLeft + width + 6).toFixed(2)
      }" y="${y + 11}" fill="#303840" font-size="10">${
        value.toFixed(2)
      } ms</text>`,
    );
  }
}
const ownerV3BrowserSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${ownerV3ChartWidth}" height="${ownerV3ChartHeight}" viewBox="0 0 ${ownerV3ChartWidth} ${ownerV3ChartHeight}" role="img" aria-labelledby="ownerV3Title ownerV3Desc" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title id="ownerV3Title">V3 keyed-owner production browser comparison</title><desc id="ownerV3Desc">Median of five page-level medians for 10,000 keyed rows. React Compiler is faster on both operations. Token-delta is faster than generic on same-key rotation.</desc><rect width="100%" height="100%" fill="white"/><text x="${ownerV3ChartLeft}" y="18" fill="#59636e" font-size="11">Median of five page medians · 10,000 keyed rows · update through host commit (ms)</text>${
    ownerV3ChartTicks.join("")
  }${
    ownerV3ChartBars.join("")
  }<text x="${ownerV3ChartLeft}" y="402" fill="#59636e" font-size="10">All five pages pass parity, host identity, and child-state retention. Layout/paint excluded.</text></svg>`;
// @ts-ignore Deno Jupyter adds the `jupyter.svg` template tag at notebook runtime.
await Deno.jupyter.display(Deno.jupyter.svg`${ownerV3BrowserSvg}`);
