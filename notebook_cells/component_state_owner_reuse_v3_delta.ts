const v3Directory = "results/component-state-owner-reuse-v3";
const v3Manifest = JSON.parse(
  await Deno.readTextFile(`${v3Directory}/delta-profile-manifest.json`),
);
const v3Lock = JSON.parse(
  await Deno.readTextFile(`${v3Directory}/delta-profile-source-lock.json`),
);
const v3V2Snapshot = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v2-source-snapshot-manifest.json",
  ),
);
const v3Hash = async (path: string) => {
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
if (
  v3Manifest.schemaVersion !==
    "component-state-owner-reuse-v3-delta-profile-manifest-v1" ||
  v3Manifest.status !== "PASS" || v3Manifest.replications?.length !== 5
) throw new Error("V3 delta manifest metadata failed");
for (
  const input of v3Lock.entries as Array<{
    path: string;
    bytes: number;
    sha256: string;
  }>
) {
  let actualPath = input.path;
  let actual = await v3Hash(actualPath);
  if (actual.bytes !== input.bytes || actual.sha256 !== input.sha256) {
    const archived = v3V2Snapshot.entries.find((entry: any) =>
      entry.sourcePath === input.path
    );
    if (!archived) throw new Error(`V3 locked input changed: ${input.path}`);
    actualPath = archived.snapshotPath;
    actual = await v3Hash(actualPath);
    if (actual.bytes !== input.bytes || actual.sha256 !== input.sha256) {
      throw new Error(`V3 archived dependency mismatch: ${input.path}`);
    }
    console.log(`V3 shared dependency verified from archive: ${input.path}`);
  }
}
const currentLockHash = await v3Hash(
  `${v3Directory}/delta-profile-source-lock.json`,
);
if (
  currentLockHash.bytes !== v3Manifest.sourceLock.bytes ||
  currentLockHash.sha256 !== v3Manifest.sourceLock.sha256
) throw new Error("V3 source-lock hash differs from post-collection manifest");
const v3Records: any[] = [];
for (
  const entry of v3Manifest.replications as Array<{
    replication: number;
    path: string;
    bytes: number;
    sha256: string;
  }>
) {
  const actual = await v3Hash(entry.path);
  if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
    throw new Error(`V3 profile record hash mismatch: ${entry.path}`);
  }
  const record = JSON.parse(await Deno.readTextFile(entry.path));
  if (
    record.replication !== entry.replication || record.count !== 10_000 ||
    record.measuredPairs !== 12 || record.samples.length !== 12 ||
    !Object.values(record.integrity).every((passed) => passed === true)
  ) throw new Error(`V3 profile contract mismatch: ${entry.path}`);
  for (const sample of record.samples) {
    const edge = sample.stages["token-delta"].edge.counters;
    const rotate = sample.stages["token-delta"].rotate.counters;
    if (
      edge["owner.keyed-region.token-mismatches"] !== 1 ||
      edge["owner.keyed-region.fallback"] !== 1 ||
      edge["owner.keyed-region.delta-owner-deletes"] !== 1 ||
      edge["owner.keyed-region.delta-output-upserts"] !== 1 ||
      edge["owner.keyed-region.delta-owner-upserts"] !== 1 ||
      rotate["owner.keyed-region.token-hits"] !== 10_000 ||
      rotate["owner.keyed-region.token-output-reuses"] !== 10_000 ||
      (rotate["owner.keyed-region.token-mismatches"] ?? 0) !== 0 ||
      (rotate["owner.keyed-region.fallback"] ?? 0) !== 0
    ) {
      throw new Error(
        `V3 per-sample mechanism counter mismatch: ${entry.path}`,
      );
    }
  }
  v3Records.push(record);
}
const v3Median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const v3Range = (
  values: number[],
) => [Math.min(...values), Math.max(...values)];
const v3Arms = ["generic", "token", "token-delta"] as const;
const v3Summary = Object.fromEntries(v3Arms.map((arm) => [
  arm,
  {
    edgeExpandAndCacheMs: v3Records.map((record) =>
      record.stageSummary[arm].edge.phases["owner.expand-and-cache"]
    ),
    edgeRootFlushMs: v3Records.map((record) =>
      record.stageSummary[arm].edge.totalMedianMs
    ),
    rotateRootFlushMs: v3Records.map((record) =>
      record.stageSummary[arm].rotate.totalMedianMs
    ),
  },
]));
const v3ImprovementShares = v3Records.map((record) => {
  const generic = record.stageSummary.generic.edge.phases[
    "owner.expand-and-cache"
  ];
  const token = record.stageSummary.token.edge.phases["owner.expand-and-cache"];
  const delta = record.stageSummary["token-delta"].edge.phases[
    "owner.expand-and-cache"
  ];
  return (token - delta) / (token - generic);
});
const v3RotateRatios = v3Records.map((record) =>
  record.stageSummary["token-delta"].rotate.totalMedianMs /
  record.stageSummary.token.rotate.totalMedianMs
);
const v3H1Median = v3Median(v3ImprovementShares);
const v3H2Median = v3Median(v3RotateRatios);
const v3H3 = v3Manifest.integrity
  .allMeasuredSamplesPassParityIdentityAndChildState &&
  v3Manifest.integrity.allTokenDeltaEdgeAndNextRotationCountersPass;
const v3RuntimeSource = await Deno.readTextFile(
  "src/component_state_runtime_owner_reuse_v3.ts",
);
if (!v3RuntimeSource.includes("delta.base.outputsByKey.delete(key)")) {
  throw new Error(
    "Locked V3 runtime no longer contains the keyed output delete",
  );
}
const v3VDOMSource = await Deno.readTextFile("src/vdom_snapshot_runtime.ts");
const v3KeyedCommitStart = v3VDOMSource.indexOf(
  "commitKeyedRegion(key: string, tree: RuntimeNode): boolean",
);
const v3KeyedCommitEnd = v3VDOMSource.indexOf(
  "commitKeyedRegions(",
  v3KeyedCommitStart,
);
const v3KeyedCommitSource = v3VDOMSource.slice(
  v3KeyedCommitStart,
  v3KeyedCommitEnd,
);
const v3MountedUpdateStart = v3VDOMSource.indexOf(
  "const updateMounted = <H, P>(",
);
const v3MountedUpdateEnd = v3VDOMSource.indexOf(
  "const reconcileChildren = <H, P>(",
  v3MountedUpdateStart,
);
const v3MountedUpdateSource = v3VDOMSource.slice(
  v3MountedUpdateStart,
  v3MountedUpdateEnd,
);
if (
  v3KeyedCommitStart < 0 || v3KeyedCommitEnd < 0 ||
  !v3KeyedCommitSource.includes("normalizeMany(tree)") ||
  !v3KeyedCommitSource.includes("updateMounted(this.host") ||
  v3MountedUpdateStart < 0 || v3MountedUpdateEnd < 0 ||
  !v3MountedUpdateSource.includes("reconcileChildren(")
) {
  throw new Error(
    "V3 source-path assertion failed: keyed commit no longer normalizes and reconciles its candidate subtree",
  );
}
const v3HypothesisResults = {
  H1: {
    pass: v3H1Median >= 0.25,
    threshold: 0.25,
    pairedImprovementShareByProcess: v3ImprovementShares,
    median: v3H1Median,
  },
  H2: {
    pass: v3H2Median <= 1.1,
    maximumMedianRatio: 1.1,
    pairedRotateRootFlushRatioByProcess: v3RotateRatios,
    median: v3H2Median,
  },
  H3: {
    pass: v3H3,
    interpretation:
      "Each edge sample records one owner removal plus one output and owner upsert; the locked runtime deletes the matching output key, and the next rotation records 10,000 token hits/output reuses.",
  },
};
const v3PhaseTable = v3Arms.flatMap((arm) =>
  ([
    ["edge expand/cache", "edgeExpandAndCacheMs"],
    ["edge root.flush", "edgeRootFlushMs"],
    ["rotation root.flush", "rotateRootFlushMs"],
  ] as const).map(([phase, field]) => {
    const values = v3Summary[arm][field];
    return {
      arm,
      phase,
      medianMs: v3Median(values).toFixed(3),
      rangeMs: v3Range(values).map((value) => value.toFixed(3)).join("–"),
    };
  })
);
console.log("V3 staged token-delta diagnostic — MemoryVDOMHost only");
console.table(v3PhaseTable);
console.log("Preregistered mechanism hypotheses:");
console.table(
  Object.entries(v3HypothesisResults).map(([hypothesis, result]) => ({
    hypothesis,
    pass: result.pass,
    median: "median" in result ? result.median : "per-source assertion",
  })),
);
console.log(
  "Paired process summaries:",
  JSON.stringify(
    {
      H1: v3ImprovementShares,
      H2: v3RotateRatios,
      integrity: v3Manifest.integrity,
    },
    null,
    2,
  ),
);
console.log(
  "Source-path observation: commitKeyedRegion normalizes the candidate tree, then updateMounted delegates child work to reconcileChildren. This is consistent with the measured normalization and host-reconciliation phases; source inspection alone does not establish their causal share.",
);

const v3Width = 1040;
const v3Height = 350;
const v3Left = 210;
const v3Right = 960;
const v3Scale = (v3Right - v3Left) / 16;
const v3Colors = {
  generic: "#1678c8",
  token: "#db7b28",
  "token-delta": "#23a184",
};
const v3Phases = [
  ["Edge: expansion/cache", "edgeExpandAndCacheMs"],
  ["Edge: total root.flush", "edgeRootFlushMs"],
  ["Rotation: total root.flush", "rotateRootFlushMs"],
] as const;
const v3Bars: string[] = [];
for (let row = 0; row < v3Phases.length; row++) {
  const [label, field] = v3Phases[row];
  const y = 52 + row * 82;
  v3Bars.push(
    `<text x="${v3Left - 12}" y="${
      y + 22
    }" text-anchor="end" class="phase">${label}</text>`,
  );
  for (let column = 0; column < v3Arms.length; column++) {
    const arm = v3Arms[column];
    const value = v3Median(v3Summary[arm][field]);
    const width = Math.max(1, value * v3Scale);
    const barY = y + column * 15;
    v3Bars.push(
      `<rect x="${v3Left}" y="${barY}" width="${
        width.toFixed(2)
      }" height="10" fill="${v3Colors[arm]}" rx="2"/><text x="${
        (v3Left + width + 7).toFixed(2)
      }" y="${barY + 9}" class="value">${value.toFixed(2)} ms</text>`,
    );
  }
}
const v3Ticks = [0, 4, 8, 12, 16].map((value) => {
  const x = v3Left + value * v3Scale;
  return `<line x1="${x}" y1="35" x2="${x}" y2="300" class="grid"/><text x="${x}" y="26" text-anchor="middle" class="tick">${value} ms</text>`;
});
const v3Legend = v3Arms.map((arm, index) => {
  const x = v3Left + index * 170;
  return `<rect x="${x}" y="324" width="10" height="10" fill="${
    v3Colors[arm]
  }" rx="2"/><text x="${x + 16}" y="333" class="legend">${arm}</text>`;
}).join("");
const v3Svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${v3Width}" height="${v3Height}" viewBox="0 0 ${v3Width} ${v3Height}" role="img" aria-labelledby="v3Title v3Desc"><title id="v3Title">V3 staged delta-cache mechanism profile</title><desc id="v3Desc">Median phase timings across five fresh Deno processes on a MemoryVDOMHost; diagnostic only, not browser or React latency.</desc><style>text{font-family:system-ui,sans-serif;fill:#273548}.phase{font-size:12px}.value{font-size:10px;fill:#526174}.tick,.legend{font-size:11px;fill:#526174}.grid{stroke:#dbe3eb;stroke-width:1}</style><text x="${v3Left}" y="14" class="tick">Median of five process medians · 10,000 keyed rows · diagnostic only</text>${
    v3Ticks.join("")
  }${v3Bars.join("")}${v3Legend}</svg>`;
// @ts-ignore Deno Jupyter adds the `jupyter.svg` template tag at notebook runtime.
await Deno.jupyter.display(Deno.jupyter.svg`${v3Svg}`);

const v3PhaseFields = [
  ["Component render and owner key", "owner.render-and-key"],
  ["Owner expansion and cache", "owner.expand-and-cache"],
  ["VDOM normalization", "vdom.normalize"],
  ["Host reconciliation", "vdom.reconcile-host"],
] as const;
const v3EdgePhaseMedians = Object.fromEntries(v3PhaseFields.map(([label, key]) => [
  label,
  v3Median(v3Records.map((record) =>
    record.stageSummary["token-delta"].edge.phases[key]
  )),
]));
const v3RotatePhaseMedians = Object.fromEntries(v3PhaseFields.map(([label, key]) => [
  label,
  v3Median(v3Records.map((record) =>
    record.stageSummary["token-delta"].rotate.phases[key]
  )),
]));
const v3WorkCounters = {
  edgeOwnerVisitsPerSample: v3Records.map((record) =>
    record.counterSummary["token-delta"].edge[
      "owner.component-visits"
    ] / record.measuredPairs
  ),
  edgeCachedOwnersPerSample: v3Records.map((record) =>
    record.counterSummary["token-delta"].edge[
      "owner.cached-reused"
    ] / record.measuredPairs
  ),
  edgeOwnersCreatedPerSample: v3Records.map((record) =>
    record.counterSummary["token-delta"].edge["owner.created"] /
      record.measuredPairs
  ),
  edgeOwnersRetiredPerSample: v3Records.map((record) =>
    record.counterSummary["token-delta"].edge["owner.retired"] /
      record.measuredPairs
  ),
  rotationTokenHitsPerSample: v3Records.map((record) =>
    record.counterSummary["token-delta"].rotate[
      "owner.keyed-region.token-hits"
    ] / record.measuredPairs
  ),
};
if (
  v3WorkCounters.edgeOwnerVisitsPerSample.some((value) => value !== 10_000) ||
  v3WorkCounters.edgeCachedOwnersPerSample.some((value) => value !== 9_999) ||
  v3WorkCounters.edgeOwnersCreatedPerSample.some((value) => value !== 1) ||
  v3WorkCounters.edgeOwnersRetiredPerSample.some((value) => value !== 1) ||
  v3WorkCounters.rotationTokenHitsPerSample.some((value) => value !== 10_000)
) throw new Error("V3 structural work-counter summary changed");
console.log("V3 token-delta phase medians across five fresh processes (ms)");
console.table(v3PhaseFields.map(([phase]) => ({
  phase,
  edgeMedian: v3EdgePhaseMedians[phase].toFixed(3),
  rotationMedian: v3RotatePhaseMedians[phase].toFixed(3),
})));
console.log("V3 work per measured edge/rotation sample");
console.table(Object.entries(v3WorkCounters).map(([counter, values]) => ({
  counter,
  perSampleMedian: v3Median(values),
  processRange: `${Math.min(...values)}–${Math.max(...values)}`,
})));

const v3PhaseWidth = 1040;
const v3PhaseHeight = 330;
const v3PhaseLeft = 300;
const v3PhaseRight = 940;
const v3PhaseScale = (v3PhaseRight - v3PhaseLeft) / 8.5;
const v3PhaseColors = { edge: "#db7b28", rotation: "#1678c8" };
const v3PhaseBars: string[] = [];
for (let row = 0; row < v3PhaseFields.length; row++) {
  const [label] = v3PhaseFields[row];
  const y = 52 + row * 59;
  v3PhaseBars.push(
    `<text x="${v3PhaseLeft - 12}" y="${y + 23}" text-anchor="end" class="phase">${label}</text>`,
  );
  for (const [stage, summary, offset] of [
    ["edge", v3EdgePhaseMedians, 0],
    ["rotation", v3RotatePhaseMedians, 17],
  ] as const) {
    const value = summary[label];
    const width = Math.max(1, value * v3PhaseScale);
    const barY = y + offset;
    v3PhaseBars.push(
      `<rect x="${v3PhaseLeft}" y="${barY}" width="${width.toFixed(2)}" height="10" fill="${v3PhaseColors[stage]}" rx="2"/><text x="${(v3PhaseLeft + width + 7).toFixed(2)}" y="${barY + 9}" class="value">${value.toFixed(2)} ms</text>`,
    );
  }
}
const v3PhaseTicks = [0, 2, 4, 6, 8].map((value) => {
  const x = v3PhaseLeft + value * v3PhaseScale;
  return `<line x1="${x}" y1="35" x2="${x}" y2="288" class="grid"/><text x="${x}" y="26" text-anchor="middle" class="tick">${value} ms</text>`;
});
const v3PhaseLegend = `<rect x="${v3PhaseLeft}" y="310" width="10" height="10" fill="${v3PhaseColors.edge}" rx="2"/><text x="${v3PhaseLeft + 16}" y="319" class="legend">Edge replacement</text><rect x="${v3PhaseLeft + 170}" y="310" width="10" height="10" fill="${v3PhaseColors.rotation}" rx="2"/><text x="${v3PhaseLeft + 186}" y="319" class="legend">Same-key rotation</text>`;
const v3PhaseSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${v3PhaseWidth}" height="${v3PhaseHeight}" viewBox="0 0 ${v3PhaseWidth} ${v3PhaseHeight}" role="img" aria-labelledby="v3PhaseTitle v3PhaseDesc"><title id="v3PhaseTitle">V3 token-delta phase profile</title><desc id="v3PhaseDesc">Diagnostic phase medians across five fresh Deno processes, comparing a one-key edge replacement with same-key rotation on a MemoryVDOMHost. Instrumented phases are not additive and include no React timing.</desc><style>text{font-family:system-ui,sans-serif;fill:#273548}.phase{font-size:12px}.value{font-size:10px;fill:#526174}.tick,.legend{font-size:11px;fill:#526174}.grid{stroke:#dbe3eb;stroke-width:1}</style><text x="${v3PhaseLeft}" y="14" class="tick">Median of five process medians · MemoryVDOMHost · instrumented diagnostic</text>${v3PhaseTicks.join("")}${v3PhaseBars.join("")}${v3PhaseLegend}</svg>`;
// @ts-ignore Deno Jupyter adds the `jupyter.svg` template tag at notebook runtime.
await Deno.jupyter.display(Deno.jupyter.svg`${v3PhaseSvg}`);
