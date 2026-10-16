const structuralIndexV1Manifest = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-index-v1-manifest.json",
  ),
);
const structuralIndexV1Prereg = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-index-v1-preregistration.json",
  ),
);
const structuralIndexV1SourceAudit = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-index-v1-source-drift-audit.json",
  ),
);
if (
  structuralIndexV1Manifest.schemaVersion !==
    "component-state-structural-index-v1-manifest" ||
  structuralIndexV1Manifest.status !== "PASS" ||
  structuralIndexV1Manifest.acceptedPages !== 5 ||
  structuralIndexV1Manifest.totalMeasuredPairs !== 360 ||
  structuralIndexV1Prereg.status !== "FROZEN_BEFORE_COLLECTION" ||
  structuralIndexV1Prereg.amendments?.[0]?.id !== "AMD-1" ||
  structuralIndexV1SourceAudit.schemaVersion !==
    "component-state-structural-index-v1-source-drift-audit" ||
  structuralIndexV1SourceAudit.verifiedAcceptedRawPages !== 5
) {
  throw new Error("Structural index V1 preregistration/manifest failed");
}
const structuralIndexV1Hash = async (data: Uint8Array) => {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const structuralIndexV1ManifestBytes = await Deno.readFile(
  "results/component-state-structural-index-v1-manifest.json",
);
if (
  structuralIndexV1SourceAudit.originalManifest.bytes !==
    structuralIndexV1ManifestBytes.length ||
  await structuralIndexV1Hash(structuralIndexV1ManifestBytes) !==
    structuralIndexV1SourceAudit.originalManifest.sha256
) {
  throw new Error("Structural index V1 historical manifest changed");
}
const structuralIndexV1SourceDrift: Array<{
  path: string;
  status: string;
  recoveredCopies: number;
}> = [];
for (
  const recorded of structuralIndexV1SourceAudit.inputs as Array<{
    path: string;
    historicalSha256: string;
    historicalBytes: number;
    recoveredCopies: string[];
  }>
) {
  const input = structuralIndexV1Manifest.inputs.find((item: any) =>
    item.path === recorded.path
  );
  if (
    !input || input.sha256 !== recorded.historicalSha256 ||
    input.bytes !== recorded.historicalBytes
  ) {
    throw new Error(`Source audit disagrees with manifest: ${recorded.path}`);
  }
  const data = await Deno.readFile(recorded.path);
  const currentHash = await structuralIndexV1Hash(data);
  const matchesCollection = currentHash === recorded.historicalSha256 &&
    data.length === recorded.historicalBytes;
  const acceptedRawPage = recorded.path.startsWith(
    "results/component-state-structural-index-v1/browser-component-state-structural-index-v1-",
  );
  if (acceptedRawPage && !matchesCollection) {
    throw new Error(`Accepted raw page hash mismatch: ${recorded.path}`);
  }
  for (const recoveredPath of recorded.recoveredCopies) {
    const recovered = await Deno.readFile(recoveredPath);
    if (
      recovered.length !== recorded.historicalBytes ||
      await structuralIndexV1Hash(recovered) !== recorded.historicalSha256
    ) {
      throw new Error(`Recovered source hash mismatch: ${recoveredPath}`);
    }
  }
  structuralIndexV1SourceDrift.push({
    path: recorded.path,
    status: matchesCollection ? "matches collection" : "changed after collection",
    recoveredCopies: recorded.recoveredCopies.length,
  });
}
if (structuralIndexV1SourceDrift.length !== structuralIndexV1Manifest.inputs.length) {
  throw new Error("Structural index V1 source audit is incomplete");
}
console.log("Structural index V1 historical-input audit:");
console.table(structuralIndexV1SourceDrift);

const structuralIndexV1Arms = ["react", "rebuild", "delta"] as const;
const structuralIndexV1Operations = [
  "rotate",
  "replace-edge",
  "filter-half",
] as const;
const structuralIndexV1Median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const structuralIndexV1Percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const structuralIndexV1Records = await Promise.all(
  (structuralIndexV1Prereg.design.seeds as number[]).map(async (seed) =>
    JSON.parse(
      await Deno.readTextFile(
        `results/component-state-structural-index-v1/browser-component-state-structural-index-v1-${seed}.json`,
      ),
    )
  ),
);
const structuralIndexV1GroupNames = [
  "rotate",
  "replace-edge",
  "shrink",
  "restore",
] as const;
const structuralIndexV1PageSummaries = structuralIndexV1Records.flatMap(
  (record: any) =>
    structuralIndexV1GroupNames.map((group) => {
      const operation = group === "shrink" || group === "restore"
        ? "filter-half"
        : group;
      const scenario = record.scenarios.find((item: any) =>
        item.operation === operation
      );
      const samples = group === "shrink" || group === "restore"
        ? scenario.samples.filter((sample: any) => sample.direction === group)
        : scenario.samples;
      const armMedianMs = Object.fromEntries(
        structuralIndexV1Arms.map((arm) => [
          arm,
          structuralIndexV1Median(
            samples.map((sample: any) => sample.milliseconds[arm]),
          ),
        ]),
      );
      const pairedDifferences = samples.map((sample: any) =>
        sample.milliseconds.rebuild - sample.milliseconds.delta
      );
      const pairedRatios = samples.map((sample: any) =>
        sample.milliseconds.rebuild / sample.milliseconds.delta
      );
      return {
        seed: record.seed,
        page: String(record.seed).slice(-1),
        group,
        n: samples.length,
        armMedianMs,
        armP95Ms: Object.fromEntries(
          structuralIndexV1Arms.map((arm) => [
            arm,
            structuralIndexV1Percentile(
              samples.map((sample: any) => sample.milliseconds[arm]),
              0.95,
            ),
          ]),
        ),
        pairedDifferenceMedianMs: structuralIndexV1Median(pairedDifferences),
        pairedRatioMedian: structuralIndexV1Median(pairedRatios),
      };
    }),
);
const structuralIndexV1GroupSummary = structuralIndexV1GroupNames.map(
  (group) => {
    const pages = structuralIndexV1PageSummaries.filter((page) =>
      page.group === group
    );
    const median = (pick: (page: any) => number) =>
      structuralIndexV1Median(pages.map(pick));
    return {
      group,
      pages: pages.length,
      updatesPerPage: pages[0].n,
      reactMedianOfPageMediansMs: median((page) => page.armMedianMs.react),
      rebuildMedianOfPageMediansMs: median((page) => page.armMedianMs.rebuild),
      deltaMedianOfPageMediansMs: median((page) => page.armMedianMs.delta),
      pairedDifferenceMedianOfPageMediansMs: median((page) =>
        page.pairedDifferenceMedianMs
      ),
      pairedRatioMedianOfPageMedians: median((page) => page.pairedRatioMedian),
      pagesDeltaFaster:
        pages.filter((page) => page.pairedDifferenceMedianMs > 0).length,
    };
  },
);
console.table(structuralIndexV1GroupSummary);
console.table(structuralIndexV1PageSummaries.map((page: any) => ({
  seed: page.seed,
  operation: page.group,
  n: page.n,
  reactMedianMs: page.armMedianMs.react,
  rebuildMedianMs: page.armMedianMs.rebuild,
  deltaMedianMs: page.armMedianMs.delta,
  pairedRebuildMinusDeltaMs: page.pairedDifferenceMedianMs,
  pairedRebuildOverDelta: page.pairedRatioMedian,
  deltaP95Ms: page.armP95Ms.delta,
})));

const structuralIndexV1Lifecycle = structuralIndexV1Records.map(
  (record: any) => {
    const scenario = record.scenarios.find((item: any) =>
      item.operation === "filter-half"
    );
    const total = (arm: "rebuild" | "delta") =>
      scenario.mountMs[arm] + scenario.teardownMs[arm] +
      scenario.samples.reduce(
        (sum: number, sample: any) => sum + sample.milliseconds[arm],
        0,
      );
    return {
      seed: record.seed,
      rebuildLifecycleMs: total("rebuild"),
      deltaLifecycleMs: total("delta"),
      rebuildMinusDeltaMs: total("rebuild") - total("delta"),
    };
  },
);
console.table(structuralIndexV1Lifecycle);
console.table([{
  pages: structuralIndexV1Lifecycle.length,
  medianLifecycleSavingsMs: structuralIndexV1Median(
    structuralIndexV1Lifecycle.map((item) => item.rebuildMinusDeltaMs),
  ),
  pagesDeltaLifecycleFaster: structuralIndexV1Lifecycle.filter((item) =>
    item.rebuildMinusDeltaMs > 0
  ).length,
}]);

const structuralIndexV1Width = 920;
const structuralIndexV1Height = 470;
const structuralIndexV1Left = 190;
const structuralIndexV1Right = 34;
const structuralIndexV1Top = 66;
const structuralIndexV1Bottom = 64;
const structuralIndexV1PlotW = structuralIndexV1Width -
  structuralIndexV1Left - structuralIndexV1Right;
const structuralIndexV1PlotH = structuralIndexV1Height -
  structuralIndexV1Top - structuralIndexV1Bottom;
const structuralIndexV1AllDiffs = structuralIndexV1PageSummaries.map((page) =>
  page.pairedDifferenceMedianMs
);
const structuralIndexV1DiffMin = Math.min(-1, ...structuralIndexV1AllDiffs);
const structuralIndexV1DiffMax = Math.max(1, ...structuralIndexV1AllDiffs);
const structuralIndexV1Y = (value: number) =>
  structuralIndexV1Top +
  (structuralIndexV1DiffMax - value) /
    (structuralIndexV1DiffMax - structuralIndexV1DiffMin) *
    structuralIndexV1PlotH;
const structuralIndexV1Groups = [
  { id: "rotate", label: "Rotate" },
  { id: "replace-edge", label: "Replace edge" },
  { id: "shrink", label: "Filter shrink" },
  { id: "restore", label: "Filter restore" },
];
const structuralIndexV1Colors = [
  "#2563eb",
  "#d97706",
  "#0f766e",
  "#9333ea",
  "#dc2626",
];
const structuralIndexV1DiffSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${structuralIndexV1Height}" viewBox="0 0 ${structuralIndexV1Width} ${structuralIndexV1Height}" role="img" aria-labelledby="struct-index-diff-title struct-index-diff-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="struct-index-diff-title">Stateful structural update paired differences</title>`,
  `<desc id="struct-index-diff-desc">Each point is one page-level median paired update difference, subtree rebuild minus delta index maintenance. Positive values favor delta. Five page replications are shown for rotation, edge replacement, filter shrink, and filter restore. React is contextual and omitted from this causal chart.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="27" font-size="16" font-weight="700">Stateful keyed updates · rebuild − delta</text>`,
  `<text x="18" y="47" fill="#555" font-size="10">Positive values favor delta. Each mark is a page median; N=5 visible pages on one device.</text>`,
];
for (
  let tick = Math.ceil(structuralIndexV1DiffMin);
  tick <= Math.floor(structuralIndexV1DiffMax);
  tick++
) {
  const y = structuralIndexV1Y(tick);
  structuralIndexV1DiffSvg.push(
    `<line x1="${structuralIndexV1Left}" x2="${
      structuralIndexV1Width - structuralIndexV1Right
    }" y1="${y}" y2="${y}" stroke="${
      tick === 0 ? "#111827" : "#e5e7eb"
    }" stroke-width="${tick === 0 ? 1.6 : 1}"/>`,
    `<text x="${structuralIndexV1Left - 12}" y="${
      y + 4
    }" text-anchor="end" fill="#555" font-size="10">${tick}</text>`,
  );
}
const structuralIndexV1Step = structuralIndexV1PlotW /
  structuralIndexV1Groups.length;
for (const [groupIndex, group] of structuralIndexV1Groups.entries()) {
  const center = structuralIndexV1Left + structuralIndexV1Step *
      (groupIndex + 0.5);
  structuralIndexV1DiffSvg.push(
    `<text x="${center}" y="${
      structuralIndexV1Height - 28
    }" text-anchor="middle" fill="#333" font-size="11">${group.label}</text>`,
  );
  const pages = structuralIndexV1PageSummaries.filter((page) =>
    page.group === group.id
  );
  for (const [pageIndex, page] of pages.entries()) {
    const x = center + (pageIndex - (pages.length - 1) / 2) * 18;
    const y = structuralIndexV1Y(page.pairedDifferenceMedianMs);
    structuralIndexV1DiffSvg.push(
      `<circle cx="${x}" cy="${y}" r="5.5" fill="${
        structuralIndexV1Colors[pageIndex]
      }" stroke="white" stroke-width="1.2"><title>Seed ${page.seed}: ${
        page.pairedDifferenceMedianMs.toFixed(2)
      } ms</title></circle>`,
    );
  }
}
structuralIndexV1DiffSvg.push(
  `<text x="20" y="${
    structuralIndexV1Top + structuralIndexV1PlotH / 2
  }" transform="rotate(-90 20 ${
    structuralIndexV1Top + structuralIndexV1PlotH / 2
  })" text-anchor="middle" fill="#444" font-size="11">Paired update difference (ms)</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${structuralIndexV1DiffSvg.join("")}`;

const structuralIndexV1BarW = 920;
const structuralIndexV1BarH = 420;
const structuralIndexV1BarLeft = 190;
const structuralIndexV1BarRight = 140;
const structuralIndexV1BarTop = 68;
const structuralIndexV1BarRow = 76;
const structuralIndexV1Max = Math.ceil(
  Math.max(
    ...structuralIndexV1GroupSummary.flatMap((item) => [
      item.reactMedianOfPageMediansMs,
      item.rebuildMedianOfPageMediansMs,
      item.deltaMedianOfPageMediansMs,
    ]),
  ) / 5,
) * 5;
const structuralIndexV1BarPlotW = structuralIndexV1BarW -
  structuralIndexV1BarLeft - structuralIndexV1BarRight;
const structuralIndexV1BarSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${structuralIndexV1BarH}" viewBox="0 0 ${structuralIndexV1BarW} ${structuralIndexV1BarH}" role="img" aria-labelledby="struct-index-arm-title struct-index-arm-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="struct-index-arm-title">React, rebuild, and delta structural update medians</title>`,
  `<desc id="struct-index-arm-desc">Median of five page medians for React context, subtree index rebuild, and delta index maintenance. Lower is faster. Filter directions are shown separately.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="27" font-size="16" font-weight="700">Median update time by arm and structural operation</text>`,
];
const structuralIndexV1BarColors = {
  react: "#64748b",
  rebuild: "#d97706",
  delta: "#0f766e",
};
for (let tick = 0; tick <= structuralIndexV1Max; tick += 5) {
  const x = structuralIndexV1BarLeft + tick / structuralIndexV1Max *
      structuralIndexV1BarPlotW;
  structuralIndexV1BarSvg.push(
    `<line x1="${x}" x2="${x}" y1="${structuralIndexV1BarTop - 10}" y2="${
      structuralIndexV1BarH - 44
    }" stroke="#e5e7eb"/>`,
    `<text x="${x}" y="${
      structuralIndexV1BarH - 25
    }" text-anchor="middle" fill="#555" font-size="10">${tick}</text>`,
  );
}
for (const [index, group] of structuralIndexV1GroupSummary.entries()) {
  const y = structuralIndexV1BarTop + index * structuralIndexV1BarRow;
  structuralIndexV1BarSvg.push(
    `<text x="${structuralIndexV1BarLeft - 12}" y="${
      y + 24
    }" text-anchor="end" fill="#333" font-size="11">${
      structuralIndexV1Groups[index].label
    }</text>`,
  );
  for (const [armIndex, arm] of structuralIndexV1Arms.entries()) {
    const value = arm === "react"
      ? group.reactMedianOfPageMediansMs
      : arm === "rebuild"
      ? group.rebuildMedianOfPageMediansMs
      : group.deltaMedianOfPageMediansMs;
    const barY = y + armIndex * 18;
    const width = value / structuralIndexV1Max * structuralIndexV1BarPlotW;
    structuralIndexV1BarSvg.push(
      `<rect x="${structuralIndexV1BarLeft}" y="${barY}" width="${width}" height="13" fill="${
        structuralIndexV1BarColors[arm]
      }"/>`,
      `<text x="${structuralIndexV1BarLeft + width + 5}" y="${
        barY + 10
      }" fill="#333" font-size="10">${value.toFixed(2)} ms · ${arm}</text>`,
    );
  }
}
structuralIndexV1BarSvg.push(
  `<text x="${structuralIndexV1BarLeft + structuralIndexV1BarPlotW / 2}" y="${
    structuralIndexV1BarH - 7
  }" text-anchor="middle" fill="#555" font-size="10">Update-to-commit time (ms; lower is faster)</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${structuralIndexV1BarSvg.join("")}`;
