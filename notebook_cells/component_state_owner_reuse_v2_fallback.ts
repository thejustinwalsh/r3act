const fallbackManifest = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v2/fallback-phase-diagnostic-manifest.json",
  ),
);
const fallbackV2SnapshotManifest = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v2-source-snapshot-manifest.json",
  ),
);
const fallbackSources = [];
for (
  const input of fallbackManifest.inputs as Array<{
    path: string;
    sha256: string;
    bytes: number;
    kind: string;
  }>
) {
  const archived = fallbackV2SnapshotManifest.entries.find((entry: any) =>
    entry.sourcePath === input.path
  );
  const resolvedPath = archived?.snapshotPath ?? input.path;
  const bytes = await Deno.readFile(resolvedPath);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.length !== input.bytes || sha256 !== input.sha256) {
    throw new Error(`Fallback profile hash mismatch: ${resolvedPath}`);
  }
  fallbackSources.push({
    path: input.path,
    verifiedFrom: resolvedPath,
    kind: input.kind,
    bytes: input.bytes,
  });
}

const fallbackArms = ["generic", "checked", "token"] as const;
const fallbackPhases = [
  "owner.render-and-key",
  "owner.expand-and-cache",
  "vdom.normalize",
  "vdom.reconcile-host",
  "root.flush",
] as const;
const fallbackPaths = Array.from(
  { length: 5 },
  (_, index) =>
    `results/component-state-owner-reuse-v2/fallback-phase-diagnostic-${
      index + 1
    }.json`,
);
const fallbackRecords = await Promise.all(
  fallbackPaths.map(async (path, index) => {
    const record = JSON.parse(await Deno.readTextFile(path));
    if (
      record.schemaVersion !==
        "component-state-owner-reuse-v2-fallback-phase-diagnostic-v1" ||
      record.replication !== index + 1 || record.count !== 10_000 ||
      record.measuredPairedUpdates !== 12 ||
      record.integrity?.allOutputParity !== true ||
      record.integrity?.allHostIdentity !== true ||
      record.integrity?.allChildStateRetained !== true
    ) throw new Error(`Fallback diagnostic contract failed: ${path}`);
    return record;
  }),
);
const fallbackMedian = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const fallbackRange = (values: number[]) => [
  Math.min(...values),
  Math.max(...values),
];
const fallbackSummary = Object.fromEntries(fallbackArms.map((arm) => [
  arm,
  Object.fromEntries(fallbackPhases.map((phase) => {
    const values = fallbackRecords.map((record) =>
      record.phaseSummaryMs[arm][phase]
    );
    return [phase, {
      median: fallbackMedian(values),
      range: fallbackRange(values),
    }];
  })),
]));
const fallbackDeltas = Object.fromEntries(fallbackPhases.map((phase) => {
  const values = fallbackRecords.map((record) =>
    record.phaseSummaryMs.token[phase] - record.phaseSummaryMs.generic[phase]
  );
  return [phase, {
    median: fallbackMedian(values),
    range: fallbackRange(values),
  }];
}));
const fallbackCounters = Object.fromEntries(fallbackArms.map((arm) => [
  arm,
  Object.fromEntries(
    [
      "owner.component-visits",
      "owner.cached-reused",
      "owner.created",
      "owner.keyed-region.fallback",
      "owner.keyed-region.token-mismatches",
    ].map((counter) => [
      counter,
      fallbackRecords.reduce(
        (sum, record) => sum + (record.diagnosticCounters[arm][counter] ?? 0),
        0,
      ),
    ]),
  ),
]));
const fallbackRollup = {
  replications: fallbackRecords.length,
  integrity: fallbackManifest.integrity,
  phaseMediansAcrossReplicationsMs: fallbackSummary,
  tokenMinusGenericPairedReplicationMedianMs: fallbackDeltas,
  summedMechanismCounters: fallbackCounters,
};
console.log(
  "Exploratory MemoryVDOM fallback diagnostic (not browser latency):",
);
console.table(fallbackArms.flatMap((arm) =>
  fallbackPhases.map((phase) => ({
    arm,
    phase,
    medianMs: fallbackSummary[arm][phase].median.toFixed(3),
    rangeMs: fallbackSummary[arm][phase].range.map((value) => value.toFixed(3))
      .join("–"),
  }))
));
console.log(JSON.stringify(fallbackRollup, null, 2));

const fallbackColors = {
  generic: "#1678c8",
  checked: "#db7b28",
  token: "#23a184",
};
const fallbackWidth = 1020;
const fallbackHeight = 350;
const fallbackChartLeft = 210;
const fallbackChartRight = 980;
const fallbackScale = (fallbackChartRight - fallbackChartLeft) / 16;
const fallbackBars: string[] = [];
for (let row = 0; row < fallbackPhases.length; row++) {
  const phase = fallbackPhases[row];
  const y = 55 + row * 56;
  fallbackBars.push(
    `<text x="${fallbackChartLeft - 12}" y="${
      y + 20
    }" text-anchor="end" class="phase">${phase}</text>`,
  );
  for (let column = 0; column < fallbackArms.length; column++) {
    const arm = fallbackArms[column];
    const value = fallbackSummary[arm][phase].median;
    const barY = y + column * 12;
    const width = Math.max(1, value * fallbackScale);
    fallbackBars.push(
      `<rect x="${fallbackChartLeft}" y="${barY}" width="${
        width.toFixed(2)
      }" height="9" fill="${fallbackColors[arm]}" rx="2"/><text x="${
        (fallbackChartLeft + width + 7).toFixed(2)
      }" y="${barY + 8}" class="value">${value.toFixed(2)}</text>`,
    );
  }
}
const fallbackTicks = [0, 4, 8, 12, 16].map((value) => {
  const x = fallbackChartLeft + value * fallbackScale;
  return `<line x1="${x}" y1="38" x2="${x}" y2="330" class="grid"/><text x="${x}" y="28" text-anchor="middle" class="tick">${value} ms</text>`;
});
const fallbackLegend = fallbackArms.map((arm, index) => {
  const x = fallbackChartLeft + index * 160;
  return `<rect x="${x}" y="${
    fallbackHeight - 10
  }" width="10" height="10" fill="${fallbackColors[arm]}" rx="2"/><text x="${
    x + 16
  }" y="${fallbackHeight - 1}" class="legend">${arm}</text>`;
}).join("");
const fallbackSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${fallbackWidth}" height="${fallbackHeight}" viewBox="0 0 ${fallbackWidth} ${fallbackHeight}" role="img" aria-labelledby="fallbackTitle fallbackDescription"><title id="fallbackTitle">Memory-host phase profile for edge replacement</title><desc id="fallbackDescription">Median diagnostic phase durations across five fresh Deno processes for generic, checked reuse, and token fallback. This chart does not show browser latency.</desc><style>text{font-family:system-ui,sans-serif;fill:#273548}.phase{font-size:12px}.value{font-size:10px;fill:#526174}.tick,.legend{font-size:11px;fill:#526174}.grid{stroke:#dbe3eb;stroke-width:1}</style><text x="${fallbackChartLeft}" y="16" class="tick">Median of five process medians · 10,000 keyed rows · diagnostic only</text>${
    fallbackTicks.join("")
  }${fallbackBars.join("")}${fallbackLegend}</svg>`;
Deno.jupyter.svg`${fallbackSvg}`;
