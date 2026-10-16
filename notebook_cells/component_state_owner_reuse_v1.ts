const ownerReuseV1ManifestPath =
  "results/component-state-owner-reuse-v1-manifest.json";
const ownerReuseV1Manifest = JSON.parse(
  await Deno.readTextFile(ownerReuseV1ManifestPath),
);
const ownerReuseV1Prereg = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v1-preregistration.json",
  ),
);
const ownerReuseV1Amendment = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v1-amendment-01.json",
  ),
);
const ownerReuseV1SourceLock = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-owner-reuse-v1-source-lock.json",
  ),
);
const ownerReuseV1Arms = ["react", "generic", "reuse"] as const;
const ownerReuseV1Hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
if (
  ownerReuseV1Manifest.schemaVersion !==
    "component-state-owner-reuse-v1-manifest" ||
  ownerReuseV1Manifest.status !== "PASS" ||
  ownerReuseV1Manifest.pageCount !== 5 ||
  ownerReuseV1Manifest.totalMeasuredPairs !== 360 ||
  ownerReuseV1SourceLock.schemaVersion !==
    "component-state-owner-reuse-v1-source-lock" ||
  ownerReuseV1Prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION_AND_COLLECTION" ||
  ownerReuseV1Amendment.status !== "FROZEN_BEFORE_LATENCY_COLLECTION"
) throw new Error("Owner reuse V1 manifest/protocol contract failed");

const ownerReuseV1ManifestBytes = await Deno.readFile(ownerReuseV1ManifestPath);
const ownerReuseV1LockBytes = await Deno.readFile(
  "results/component-state-owner-reuse-v1-source-lock.json",
);
if (
  ownerReuseV1Manifest.sourceLock.bytes !== ownerReuseV1LockBytes.length ||
  await ownerReuseV1Hash(ownerReuseV1LockBytes) !==
    ownerReuseV1Manifest.sourceLock.sha256 ||
  ownerReuseV1Manifest.inputHashes.some((input: any) => {
    if (input.path === "results/component-state-owner-reuse-v1-source-lock.json") {
      return input.sha256 !== ownerReuseV1Manifest.sourceLock.sha256;
    }
    if (input.path === "results/component-state-owner-reuse-v1-preregistration.json") {
      return input.sha256 !== ownerReuseV1Manifest.preregistration.sha256;
    }
    if (input.path === "results/component-state-owner-reuse-v1-amendment-01.json") {
      return input.sha256 !== ownerReuseV1Manifest.amendment.sha256;
    }
    return true;
  })
) throw new Error("Owner reuse V1 protocol/source-lock hash mismatch");

const ownerReuseV1SnapshotManifestPath =
  "results/component-state-owner-reuse-v1-source-snapshot-manifest.json";
const ownerReuseV1SnapshotManifest = JSON.parse(
  await Deno.readTextFile(ownerReuseV1SnapshotManifestPath),
);
if (
  ownerReuseV1SnapshotManifest.schemaVersion !==
    "component-state-owner-reuse-v1-source-snapshot-manifest" ||
  ownerReuseV1SnapshotManifest.status !== "PASS" ||
  ownerReuseV1SnapshotManifest.entries.length !==
    ownerReuseV1SourceLock.entries.length ||
  ownerReuseV1SnapshotManifest.sourceLock.bytes !== ownerReuseV1LockBytes.length ||
  ownerReuseV1SnapshotManifest.sourceLock.sha256 !==
    await ownerReuseV1Hash(ownerReuseV1LockBytes)
) throw new Error("Owner reuse V1 source snapshot manifest mismatch");

const ownerReuseV1SourceDrift = [];
for (const input of ownerReuseV1SourceLock.entries as Array<{
  path: string;
  bytes: number;
  sha256: string;
}>) {
  const snapshot = ownerReuseV1SnapshotManifest.entries.find((entry: any) =>
    entry.sourcePath === input.path
  );
  if (!snapshot) throw new Error(`Owner reuse V1 snapshot missing: ${input.path}`);
  const bytes = await Deno.readFile(snapshot.snapshotPath);
  if (bytes.length !== input.bytes || await ownerReuseV1Hash(bytes) !== input.sha256) {
    throw new Error(`Owner reuse V1 snapshot hash mismatch: ${input.path}`);
  }
  let currentMatches = false;
  try {
    const currentBytes = await Deno.readFile(input.path);
    currentMatches = currentBytes.length === input.bytes &&
      await ownerReuseV1Hash(currentBytes) === input.sha256;
  } catch {
    currentMatches = false;
  }
  ownerReuseV1SourceDrift.push({
    path: input.path,
    current: currentMatches ? "matches collection" : "changed after collection",
  });
}
console.log("V1 frozen source snapshot verified; current workspace drift:");
console.table(ownerReuseV1SourceDrift);

const ownerReuseV1Median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const ownerReuseV1P95 = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
};
const ownerReuseV1Records = [];
for (const page of ownerReuseV1Manifest.pages as Array<{
  path: string;
  seed: number;
  bytes: number;
  sha256: string;
}>) {
  const bytes = await Deno.readFile(page.path);
  if (bytes.length !== page.bytes || await ownerReuseV1Hash(bytes) !== page.sha256) {
    throw new Error(`Owner reuse V1 raw page hash mismatch: ${page.path}`);
  }
  ownerReuseV1Records.push(JSON.parse(new TextDecoder().decode(bytes)));
}
const ownerReuseV1DiagnosticPage = ownerReuseV1Manifest.diagnostic;
const ownerReuseV1DiagnosticBytes = await Deno.readFile(
  ownerReuseV1DiagnosticPage.path,
);
if (
  ownerReuseV1DiagnosticBytes.length !== ownerReuseV1DiagnosticPage.bytes ||
  await ownerReuseV1Hash(ownerReuseV1DiagnosticBytes) !==
    ownerReuseV1DiagnosticPage.sha256
) throw new Error("Owner reuse V1 diagnostic record hash mismatch");
const ownerReuseV1Diagnostic = JSON.parse(
  new TextDecoder().decode(ownerReuseV1DiagnosticBytes),
);

const ownerReuseV1Directions = [
  { id: "rotate", label: "rotation" },
  { id: "replace-edge", label: "edge replacement" },
  { id: "shrink", label: "filter shrink" },
  { id: "restore", label: "filter restore" },
] as const;
const ownerReuseV1PageRows: any[] = [];
for (const record of ownerReuseV1Records) {
  for (const group of ownerReuseV1Directions) {
    const operation = group.id === "shrink" || group.id === "restore"
      ? "filter-half"
      : group.id;
    const scenario = record.scenarios.find((item: any) =>
      item.operation === operation
    );
    const samples = group.id === "shrink" || group.id === "restore"
      ? scenario.samples.filter((sample: any) => sample.direction === group.id)
      : scenario.samples;
    const pageMedianMs = Object.fromEntries(
      ownerReuseV1Arms.map((arm) => [
        arm,
        ownerReuseV1Median(samples.map((sample: any) => sample.milliseconds[arm])),
      ]),
    );
    ownerReuseV1PageRows.push({
      seed: record.seed,
      group: group.id,
      n: samples.length,
      pageMedianMs,
      pageP95Ms: Object.fromEntries(
        ownerReuseV1Arms.map((arm) => [
          arm,
          ownerReuseV1P95(samples.map((sample: any) => sample.milliseconds[arm])),
        ]),
      ),
      pairedDifferenceMedianMs: ownerReuseV1Median(samples.map((sample: any) =>
        sample.milliseconds.generic - sample.milliseconds.reuse
      )),
      pairedRatioMedian: ownerReuseV1Median(samples.map((sample: any) =>
        sample.milliseconds.reuse /
        Math.max(sample.milliseconds.generic, 0.001)
      )),
    });
  }
}
console.log("Owner-reuse V1 page-level medians; positive paired difference favors reuse:");
console.table(ownerReuseV1PageRows.map((page) => ({
  seed: page.seed,
  group: page.group,
  n: page.n,
  reactMs: page.pageMedianMs.react,
  genericMs: page.pageMedianMs.generic,
  reuseMs: page.pageMedianMs.reuse,
  genericMinusReuseMs: page.pairedDifferenceMedianMs,
  reuseOverGeneric: page.pairedRatioMedian,
})));

const ownerReuseV1Summary = ownerReuseV1Directions.map((group) => {
  const pages = ownerReuseV1PageRows.filter((page) => page.group === group.id);
  const summarize = (select: (page: any) => number) => {
    const values = pages.map(select);
    return {
      median: ownerReuseV1Median(values),
      min: Math.min(...values),
      max: Math.max(...values),
      values,
    };
  };
  return {
    group: group.id,
    pages: pages.length,
    reactMs: summarize((page) => page.pageMedianMs.react),
    genericMs: summarize((page) => page.pageMedianMs.generic),
    reuseMs: summarize((page) => page.pageMedianMs.reuse),
    differenceMs: summarize((page) => page.pairedDifferenceMedianMs),
    ratio: summarize((page) => page.pairedRatioMedian),
    reuseWins: pages.filter((page) => page.pairedRatioMedian < 1).length,
  };
});
console.log("Across-page summary of page-level medians (no sample pooling):");
console.table(ownerReuseV1Summary.map((row) => ({
  group: row.group,
  pages: row.pages,
  reactMedianMs: row.reactMs.median,
  genericMedianMs: row.genericMs.median,
  reuseMedianMs: row.reuseMs.median,
  pairedDifferenceMedianMs: row.differenceMs.median,
  pairedDifferenceRangeMs: `${row.differenceMs.min}–${row.differenceMs.max}`,
  pairedRatioMedian: row.ratio.median,
  pairedRatioRange: `${row.ratio.min}–${row.ratio.max}`,
  reuseWins: row.reuseWins,
}))); 

const ownerReuseV1Rotation = ownerReuseV1Summary.find((row) =>
  row.group === "rotate"
)!;
const ownerReuseV1PrimaryPass = ownerReuseV1Rotation.ratio.values.filter((ratio) =>
  ratio <= 0.8
).length >= 4;
const ownerReuseV1Guardrail = ownerReuseV1Summary.filter((row) =>
  row.group !== "rotate"
).every((row) => row.ratio.median <= 1.1);
const ownerReuseV1RotateDiagnostic = ownerReuseV1Diagnostic.scenarios.find(
  (item: any) => item.operation === "rotate",
);
const ownerReuseV1DiagnosticSamples = ownerReuseV1RotateDiagnostic.samples;
const ownerReuseV1GenericVisits = ownerReuseV1DiagnosticSamples.map((sample: any) =>
  sample.diagnosticCounters.generic["owner.component-visits"] ?? 0
);
const ownerReuseV1ReuseVisits = ownerReuseV1DiagnosticSamples.map((sample: any) =>
  sample.diagnosticCounters.reuse["owner.component-visits"] ?? 0
);
const ownerReuseV1CacheHits = ownerReuseV1DiagnosticSamples.map((sample: any) =>
  sample.diagnosticCounters.reuse["owner.keyed-region.cache-hits"] ?? 0
);
const ownerReuseV1VisitReduction = 1 - ownerReuseV1Median(ownerReuseV1ReuseVisits) /
  Math.max(ownerReuseV1Median(ownerReuseV1GenericVisits), 1);
const ownerReuseV1MechanismPass = ownerReuseV1VisitReduction >= 0.75 &&
  ownerReuseV1CacheHits.every((count) => count === 10_000) &&
  ownerReuseV1DiagnosticSamples.every((sample: any) =>
    (sample.diagnosticCounters.reuse["owner.keyed-region.fallback"] ?? 0) === 0
  );
const ownerReuseV1MechanismRows: any[] = [];
for (const operation of ["rotate", "replace-edge", "filter-half"] as const) {
  const scenario = ownerReuseV1Diagnostic.scenarios.find((item: any) =>
    item.operation === operation
  );
  for (const direction of operation === "filter-half"
    ? ["shrink", "restore"] as const
    : [null] as const) {
    const samples = scenario.samples.filter((sample: any) =>
      direction === null || sample.direction === direction
    );
    const genericVisits = samples.map((sample: any) =>
      sample.diagnosticCounters.generic["owner.component-visits"] ?? 0
    );
    const reuseVisits = samples.map((sample: any) =>
      sample.diagnosticCounters.reuse["owner.component-visits"] ?? 0
    );
    const cacheHits = samples.map((sample: any) =>
      sample.diagnosticCounters.reuse["owner.keyed-region.cache-hits"] ?? 0
    );
    const fallbacks = samples.map((sample: any) =>
      sample.diagnosticCounters.reuse["owner.keyed-region.fallback"] ?? 0
    );
    ownerReuseV1MechanismRows.push({
      operation,
      direction: direction ?? "—",
      samples: samples.length,
      genericVisits: ownerReuseV1Median(genericVisits),
      reuseVisits: ownerReuseV1Median(reuseVisits),
      cacheHits: ownerReuseV1Median(cacheHits),
      fallbackCount: ownerReuseV1Median(fallbacks),
    });
    if (operation === "rotate") {
      if (
        genericVisits.some((count) => count !== 10_000) ||
        reuseVisits.some((count) => count !== 0) ||
        cacheHits.some((count) => count !== 10_000) ||
        fallbacks.some((count) => count !== 0)
      ) throw new Error("Rotation mechanism counters violate the frozen claim");
    } else if (
      fallbacks.some((count) => count !== 1) ||
      genericVisits.some((count, index) => count !== reuseVisits[index])
    ) throw new Error(`${operation}/${direction}: fallback did not match generic visits`);
  }
}
console.log("Diagnostic work counters (separate from latency records):");
console.table(ownerReuseV1MechanismRows);
console.log("Decision gates from the frozen amendment:");
console.table([
  {
    gate: "rotation primary latency",
    result: ownerReuseV1PrimaryPass ? "PASS" : "FAIL",
    evidence: `${ownerReuseV1Rotation.ratio.values.filter((ratio) => ratio <= 0.8).length}/5 pages at ratio ≤ 0.80`,
  },
  {
    gate: "edge/filter fallback guardrails",
    result: ownerReuseV1Guardrail ? "PASS" : "FAIL",
    evidence: `median page ratio ≤ 1.10 for edge, shrink, restore`,
  },
  {
    gate: "rotation mechanism",
    result: ownerReuseV1MechanismPass ? "PASS" : "FAIL",
    evidence: `${(ownerReuseV1VisitReduction * 100).toFixed(1)}% fewer generic component visits; all 10,000 cache hits required`,
  },
]);

const ownerReuseV1RatioW = 920;
const ownerReuseV1RatioH = 360;
const ownerReuseV1Left = 175;
const ownerReuseV1Right = 40;
const ownerReuseV1Top = 50;
const ownerReuseV1PlotW = ownerReuseV1RatioW - ownerReuseV1Left - ownerReuseV1Right;
const ownerReuseV1PlotH = 245;
const ownerReuseV1Min = 0.4;
const ownerReuseV1Max = 1.8;
const ownerReuseV1Y = (value: number) => ownerReuseV1Top +
  (ownerReuseV1Max - value) / (ownerReuseV1Max - ownerReuseV1Min) *
    ownerReuseV1PlotH;
const ownerReuseV1RatioSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${ownerReuseV1RatioH}" viewBox="0 0 ${ownerReuseV1RatioW} ${ownerReuseV1RatioH}" role="img" aria-labelledby="owner-reuse-ratio-title owner-reuse-ratio-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="owner-reuse-ratio-title">Keyed owner reuse paired update ratios</title>`,
  `<desc id="owner-reuse-ratio-desc">Five page-level medians for reuse divided by generic runtime time. Values below one favor reuse. The 0.8 line is the preregistered rotation target; the 1.1 line is the fallback guardrail.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="26" font-size="16" font-weight="700">Keyed-owner treatment / generic runtime · page median ratios</text>`,
  `<text x="18" y="44" fill="#555" font-size="10">Each dot is one fresh page; values below 1 favor reuse. React is contextual.</text>`,
];
for (const tick of [0.4, 0.6, 0.8, 1, 1.1, 1.2, 1.4, 1.6, 1.8]) {
  const y = ownerReuseV1Y(tick);
  const stroke = tick === 1 ? "#334155" : tick === 0.8 ? "#0f766e" :
    tick === 1.1 ? "#d97706" : "#e5e7eb";
  ownerReuseV1RatioSvg.push(
    `<line x1="${ownerReuseV1Left}" x2="${ownerReuseV1Left + ownerReuseV1PlotW}" y1="${y}" y2="${y}" stroke="${stroke}" stroke-width="${tick === 1 || tick === 0.8 || tick === 1.1 ? 1.6 : 1}"/>`,
    `<text x="${ownerReuseV1Left - 12}" y="${y + 4}" text-anchor="end" fill="#555" font-size="10">${tick}</text>`,
  );
}
const ownerReuseV1GroupIds = ["rotate", "replace-edge", "shrink", "restore"];
const ownerReuseV1GroupLabels = ["Rotation", "Edge replace", "Filter shrink", "Filter restore"];
const ownerReuseV1Step = ownerReuseV1PlotW / ownerReuseV1GroupIds.length;
for (const [groupIndex, group] of ownerReuseV1GroupIds.entries()) {
  const center = ownerReuseV1Left + ownerReuseV1Step * (groupIndex + 0.5);
  ownerReuseV1RatioSvg.push(
    `<text x="${center}" y="${ownerReuseV1RatioH - 28}" text-anchor="middle" fill="#333" font-size="11">${ownerReuseV1GroupLabels[groupIndex]}</text>`,
  );
  const pages = ownerReuseV1PageRows.filter((page) => page.group === group);
  for (const [pageIndex, page] of pages.entries()) {
    const x = center + (pageIndex - (pages.length - 1) / 2) * 18;
    const y = ownerReuseV1Y(page.pairedRatioMedian);
    ownerReuseV1RatioSvg.push(
      `<circle cx="${x}" cy="${y}" r="5.5" fill="#0f766e" stroke="white" stroke-width="1.2"><title>Seed ${page.seed}: ${page.pairedRatioMedian.toFixed(3)}</title></circle>`,
    );
  }
}
ownerReuseV1RatioSvg.push(
  `<text x="20" y="${ownerReuseV1Top + ownerReuseV1PlotH / 2}" transform="rotate(-90 20 ${ownerReuseV1Top + ownerReuseV1PlotH / 2})" text-anchor="middle" fill="#444" font-size="11">Paired update ratio (treatment / generic)</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${ownerReuseV1RatioSvg.join("")}`;

const ownerReuseV1BarW = 920;
const ownerReuseV1BarH = 390;
const ownerReuseV1BarLeft = 185;
const ownerReuseV1BarRight = 110;
const ownerReuseV1BarTop = 68;
const ownerReuseV1BarRow = 74;
const ownerReuseV1BarMax = Math.ceil(
  Math.max(...ownerReuseV1Summary.flatMap((group) => [
    group.reactMs.median,
    group.genericMs.median,
    group.reuseMs.median,
  ])) / 5,
) * 5;
const ownerReuseV1BarPlotW = ownerReuseV1BarW - ownerReuseV1BarLeft - ownerReuseV1BarRight;
const ownerReuseV1BarSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${ownerReuseV1BarH}" viewBox="0 0 ${ownerReuseV1BarW} ${ownerReuseV1BarH}" role="img" aria-labelledby="owner-reuse-bars-title owner-reuse-bars-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="owner-reuse-bars-title">React context and owner-reuse update medians</title>`,
  `<desc id="owner-reuse-bars-desc">Median of five page medians for React, generic component-state runtime, and compiler-marked keyed-owner reuse, shown separately for four structural operations.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="27" font-size="16" font-weight="700">Update-to-host-commit time · median of five page medians</text>`,
];
for (let tick = 0; tick <= ownerReuseV1BarMax; tick += 5) {
  const x = ownerReuseV1BarLeft + tick / ownerReuseV1BarMax * ownerReuseV1BarPlotW;
  ownerReuseV1BarSvg.push(
    `<line x1="${x}" x2="${x}" y1="${ownerReuseV1BarTop - 8}" y2="${ownerReuseV1BarH - 40}" stroke="#e5e7eb"/>`,
    `<text x="${x}" y="${ownerReuseV1BarH - 22}" text-anchor="middle" fill="#555" font-size="10">${tick}</text>`,
  );
}
const ownerReuseV1Colors = { react: "#64748b", generic: "#d97706", reuse: "#0f766e" };
for (const [index, group] of ownerReuseV1Summary.entries()) {
  const y = ownerReuseV1BarTop + index * ownerReuseV1BarRow;
  ownerReuseV1BarSvg.push(
    `<text x="${ownerReuseV1BarLeft - 12}" y="${y + 25}" text-anchor="end" fill="#333" font-size="11">${ownerReuseV1GroupLabels[index]}</text>`,
  );
  for (const [armIndex, arm] of ownerReuseV1Arms.entries()) {
    const value = arm === "react" ? group.reactMs.median :
      arm === "generic" ? group.genericMs.median : group.reuseMs.median;
    const barY = y + armIndex * 17;
    const width = value / ownerReuseV1BarMax * ownerReuseV1BarPlotW;
    ownerReuseV1BarSvg.push(
      `<rect x="${ownerReuseV1BarLeft}" y="${barY}" width="${width}" height="12" fill="${ownerReuseV1Colors[arm]}"/>`,
      `<text x="${ownerReuseV1BarLeft + width + 5}" y="${barY + 10}" fill="#333" font-size="10">${value.toFixed(2)} ms · ${arm}</text>`,
    );
  }
}
ownerReuseV1BarSvg.push(
  `<text x="${ownerReuseV1BarLeft + ownerReuseV1BarPlotW / 2}" y="${ownerReuseV1BarH - 5}" text-anchor="middle" fill="#555" font-size="10">Update-to-host-commit time (ms; lower is faster)</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${ownerReuseV1BarSvg.join("")}`;
