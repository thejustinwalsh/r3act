const browserPhaseRecord = JSON.parse(
  await Deno.readTextFile(
    "results/browser-component-state-structural-profile-v8-83001053.json",
  ),
);
const diagnosticTimingRecord = JSON.parse(
  await Deno.readTextFile(
    "results/browser-component-state-structural-v4-83001053.json",
  ),
);
const uninstrumentedFollowup = JSON.parse(
  await Deno.readTextFile(
    "results/browser-component-state-structural-v4-83001054.json",
  ),
);
const browserPhaseOperations = ["rotate", "replace-edge", "filter-half"];
if (
  browserPhaseRecord.schemaVersion !==
    "component-state-structural-browser-phase-profile-v8" ||
  browserPhaseRecord.count !== 10_000 ||
  diagnosticTimingRecord.schemaVersion !==
    "component-state-structural-browser-v4" ||
  diagnosticTimingRecord.status !== "PASS" ||
  diagnosticTimingRecord.count !== 10_000 ||
  uninstrumentedFollowup.schemaVersion !==
    "component-state-structural-browser-v4" ||
  uninstrumentedFollowup.status !== "PASS" ||
  uninstrumentedFollowup.count !== 10_000 ||
  browserPhaseRecord.operations.length !== 3 ||
  !browserPhaseRecord.operations.every((operation: any) =>
    operation.measuredUpdates === 24 && operation.samples.length === 24 &&
    operation.workCountMedians &&
    Object.values(operation.workCountMedians).every((count: any) =>
      Number.isSafeInteger(count) && count >= 0
    ) &&
    operation.samples.every((sample: any, index: number) =>
      sample.pair === index && Number.isFinite(sample.totalUpdateMs) &&
      Number.isFinite(sample.rootFlushMs) &&
      Number.isFinite(sample.outsideRootFlushMs) && sample.workCounts &&
      Object.values(sample.workCounts).every((count: any) =>
        Number.isSafeInteger(count) && count >= 0
      )
    )
  ) ||
  !diagnosticTimingRecord.scenarios.every((scenario: any) =>
    scenario.outputParity && scenario.identity && scenario.retainedState
  ) ||
  !uninstrumentedFollowup.scenarios.every((scenario: any) =>
    scenario.outputParity && scenario.identity && scenario.retainedState
  )
) {
  throw new Error("Browser structural profile failed sample or parity checks");
}
const browserPhasePercentile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
const browserPhaseMedian = (values: number[]) =>
  browserPhasePercentile(values, 0.5);
const filterDirectionBySample = (record: any) => {
  const stateStart = (record.seed ^ "filter-half".length) >>> 0 || 1;
  let state = stateStart;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  const pairs = Array.from(
    { length: record.warmupPairs + record.measuredPairs },
    (_, pair) => pair,
  );
  for (let index = pairs.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [pairs[index], pairs[other]] = [pairs[other], pairs[index]];
  }
  const directionBySample = new Map<number, "shrink" | "restore">();
  pairs.forEach((pair, updateIndex) => {
    if (pair >= record.warmupPairs) {
      directionBySample.set(
        pair - record.warmupPairs,
        updateIndex % 2 === 0 ? "shrink" : "restore",
      );
    }
  });
  return directionBySample;
};
const diagnosticFilterScenario = browserPhaseRecord.operations.find((
  scenario: any,
) => scenario.operation === "filter-half");
const diagnosticFilterDirections = filterDirectionBySample(
  diagnosticTimingRecord,
);
for (const sample of diagnosticFilterScenario.samples) {
  const direction = diagnosticFilterDirections.get(sample.pair);
  const workDirection = sample.workCounts["owner.retired"] > 0
    ? "shrink"
    : sample.workCounts["owner.created"] > 0
    ? "restore"
    : null;
  if (direction !== workDirection) {
    throw new Error(
      `Filter direction reconstruction mismatch for diagnostic sample ${sample.pair}`,
    );
  }
}
const uninstrumentedFilterScenario = uninstrumentedFollowup.scenarios.find((
  scenario: any,
) => scenario.operation === "filter-half");
const uninstrumentedFilterDirections = filterDirectionBySample(
  uninstrumentedFollowup,
);
const browserPhaseRows = browserPhaseOperations.flatMap((name) => {
  const operation = browserPhaseRecord.operations.find((item: any) =>
    item.operation === name
  );
  const scenario = diagnosticTimingRecord.scenarios.find((item: any) =>
    item.operation === name
  );
  const uninstrumentedScenario = uninstrumentedFollowup.scenarios.find((
    item: any,
  ) => item.operation === name);
  const diagnosticPairs = new Map<number, any>(
    scenario.samples.map((sample: any) => [sample.pair, sample]),
  );
  const groups = name === "filter-half"
    ? [
      {
        label: "filter-half · shrink",
        direction: "shrink",
        samples: operation.samples.filter((sample: any) =>
          (sample.workCounts["owner.retired"] ?? 0) > 0
        ),
      },
      {
        label: "filter-half · restore",
        direction: "restore",
        samples: operation.samples.filter((sample: any) =>
          (sample.workCounts["owner.created"] ?? 0) > 0
        ),
      },
    ]
    : [{ label: name, direction: null, samples: operation.samples }];
  return groups.map(({ label, direction, samples }) => {
    const callValues = (phase: string) =>
      samples.flatMap((sample: any) => sample.phaseCalls[phase] ?? []);
    const fallbackSamples = samples.filter((sample: any) =>
      sample.phaseCalls["dispatch.path.full-reconcile"]?.length
    );
    const summarizePhase = (phase: string) => {
      const values = callValues(phase);
      return {
        calls: values.length,
        medianMs: values.length ? browserPhaseMedian(values) : 0,
      };
    };
    const countNames = new Set(
      samples.flatMap((sample: any) => Object.keys(sample.workCounts)),
    );
    const workCounts = Object.fromEntries(
      [...countNames].sort().map((key) => [
        key,
        browserPhaseMedian(
          samples.map((sample: any) => sample.workCounts[key] ?? 0),
        ),
      ]),
    );
    const pairedSamples = samples.map((sample: any) =>
      diagnosticPairs.get(sample.pair)
    );
    const uninstrumentedSamples = name === "filter-half"
      ? uninstrumentedFilterScenario.samples.filter((sample: any) =>
        uninstrumentedFilterDirections.get(sample.pair) === direction
      )
      : uninstrumentedScenario.samples;
    return {
      operation: label,
      updates: samples.length,
      totalUpdateMedianMs: browserPhaseMedian(
        samples.map((sample: any) => sample.totalUpdateMs),
      ),
      diagnosticReactMedianMs: browserPhaseMedian(
        pairedSamples.map((sample: any) => sample.milliseconds.react),
      ),
      diagnosticRuntimeMedianMs: browserPhaseMedian(
        pairedSamples.map((sample: any) => sample.milliseconds.runtime),
      ),
      uninstrumentedUpdates: uninstrumentedSamples.length,
      uninstrumentedReactMedianMs: browserPhaseMedian(
        uninstrumentedSamples.map((sample: any) => sample.milliseconds.react),
      ),
      uninstrumentedRuntimeMedianMs: browserPhaseMedian(
        uninstrumentedSamples.map((sample: any) => sample.milliseconds.runtime),
      ),
      uninstrumentedReactP95Ms: browserPhasePercentile(
        uninstrumentedSamples.map((sample: any) => sample.milliseconds.react),
        0.95,
      ),
      uninstrumentedRuntimeP95Ms: browserPhasePercentile(
        uninstrumentedSamples.map((sample: any) => sample.milliseconds.runtime),
        0.95,
      ),
      uninstrumentedMedianPairedDifferenceMs: browserPhaseMedian(
        uninstrumentedSamples.map((sample: any) =>
          sample.milliseconds.react - sample.milliseconds.runtime
        ),
      ),
      uninstrumentedMedianPairedRatio: browserPhaseMedian(
        uninstrumentedSamples.map((sample: any) =>
          sample.milliseconds.react / sample.milliseconds.runtime
        ),
      ),
      workCounts,
      keyIndexCombinedVisits:
        (workCounts["vdom.key-index.incremental-old-visits"] ?? 0) +
        (workCounts["vdom.key-index.incremental-new-visits"] ?? 0),
      hostMutationCalls: Object.entries(workCounts)
        .filter(([key]) => key.startsWith("host."))
        .reduce((sum, [, count]) => sum + (count as number), 0),
      rootFlushMedianMs: browserPhaseMedian(
        samples.map((sample: any) => sample.rootFlushMs),
      ),
      outsideFlushMedianMs: browserPhaseMedian(
        samples.map((sample: any) => sample.outsideRootFlushMs),
      ),
      ownerExpandMedianMs: summarizePhase("owner.expand-and-cache").medianMs,
      hostReconcileMedianMs: summarizePhase("vdom.reconcile-host").medianMs,
      fallbackCount: fallbackSamples.length,
      multiOwnerFlushCount: samples.filter((sample: any) =>
        sample.phaseCalls["dispatch.diagnostic.dirty-owner-count.2"]?.length
      ).length,
      singleOwnerFlushCount: samples.filter((sample: any) =>
        sample.phaseCalls["dispatch.diagnostic.dirty-owner-count.1"]?.length
      ).length,
      partialNestedSubtreeBailCount: samples.filter((sample: any) =>
        sample.phaseCalls["dispatch.partial-bail.owner-has-nested-subtree"]
          ?.length
      ).length,
      fallbackMedianMs: browserPhaseMedian(
        fallbackSamples.map((sample: any) =>
          sample.totalUpdateMs
        ),
      ),
      fallbackExpandMs: summarizePhase("owner.full-expand").medianMs,
      fallbackCommitMs: summarizePhase("vdom.full-commit").medianMs,
    };
  });
});

const browserPhaseColors = {
  total: "#243b53",
  flush: "#486581",
  outside: "#829ab1",
  owner: "#d97706",
  host: "#0f766e",
  fallbackExpand: "#b91c1c",
  fallbackCommit: "#7f1d1d",
};
const browserPhaseLegend = [
  ["total", "total update"],
  ["flush", "root.flush"],
  ["outside", "outside flush"],
  ["owner", "owner expand/cache"],
  ["host", "VDOM host reconcile"],
  ["fallbackExpand", "full fallback expand (diagnostic only)"],
  ["fallbackCommit", "full fallback commit (diagnostic only)"],
] as const;
const browserPhaseWidth = 1020;
const browserPhaseHeight = 690;
const browserPhaseLeft = 220;
const browserPhaseRight = 38;
const browserPhaseTop = 88;
const browserPhaseMax = 55;
const browserPhasePlotWidth = browserPhaseWidth - browserPhaseLeft -
  browserPhaseRight;
const browserPhaseScale = browserPhasePlotWidth / browserPhaseMax;
const browserPhaseSvg: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${browserPhaseHeight}" viewBox="0 0 ${browserPhaseWidth} ${browserPhaseHeight}" role="img" aria-labelledby="browser-phase-title browser-phase-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="browser-phase-title">Browser structural update phase profile</title>`,
  `<desc id="browser-phase-desc">Grouped horizontal bars show total update, runtime flush, paired time outside the flush, owner expansion and VDOM host reconciliation medians for rotate, edge replacement and half filtering. The corrected diagnostic observed no full-reconcile fallback. Bars overlap in scope and are not additive.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="26" font-size="16" font-weight="700">10,000-row structural updates · one Chrome 154 page · 24 measured pairs</text>`,
  `<text x="18" y="47" font-size="10" fill="#555">Filter shrink and restore are separated because they have different work. Diagnostic scopes overlap and bars are not additive.</text>`,
];
for (let index = 0; index < browserPhaseLegend.length; index++) {
  const [key, label] = browserPhaseLegend[index];
  const column = index % 4;
  const row = Math.floor(index / 4);
  const x = 22 + column * 245;
  const y = 69 + row * 15;
  browserPhaseSvg.push(
    `<rect x="${x}" y="${y - 8}" width="9" height="9" rx="2" fill="${
      browserPhaseColors[key]
    }"/><text x="${
      x + 14
    }" y="${y}" fill="#48515b" font-size="9">${label}</text>`,
  );
}
for (let tick = 0; tick <= browserPhaseMax; tick += 10) {
  const x = browserPhaseLeft + tick * browserPhaseScale;
  browserPhaseSvg.push(
    `<line x1="${x}" x2="${x}" y1="${
      browserPhaseTop - 5
    }" y2="645" stroke="#e5e7eb"/><text x="${x}" y="665" text-anchor="middle" fill="#59636e" font-size="10">${tick}</text>`,
  );
}
const browserPhaseSeries = [
  ["totalUpdateMedianMs", "total", "total"],
  ["rootFlushMedianMs", "flush", "root.flush"],
  ["outsideFlushMedianMs", "outside", "outside flush"],
  ["ownerExpandMedianMs", "owner", "owner.expand/cache"],
  ["hostReconcileMedianMs", "host", "VDOM host reconcile"],
  ["fallbackExpandMs", "fallbackExpand", "full fallback expand (n=0)"],
  ["fallbackCommitMs", "fallbackCommit", "full fallback commit (n=0)"],
] as const;
let browserPhaseY = browserPhaseTop;
for (const row of browserPhaseRows) {
  browserPhaseSvg.push(
    `<text x="${browserPhaseLeft - 12}" y="${
      browserPhaseY + 12
    }" text-anchor="end" fill="#17202a" font-size="12" font-weight="700">${row.operation}</text>`,
  );
  browserPhaseY += 4;
  for (const [field, colorKey, label] of browserPhaseSeries) {
    const value = row[field];
    const width = Math.max(0, value * browserPhaseScale);
    browserPhaseSvg.push(
      `<text x="${browserPhaseLeft - 10}" y="${
        browserPhaseY + 9
      }" text-anchor="end" fill="#48515b" font-size="9">${label}</text><rect x="${browserPhaseLeft}" y="${browserPhaseY}" width="${width}" height="11" rx="2" fill="${
        browserPhaseColors[colorKey]
      }"/><text x="${browserPhaseLeft + width + 4}" y="${
        browserPhaseY + 9
      }" fill="#303840" font-size="9">${value.toFixed(1)}</text>`,
    );
    browserPhaseY += 17;
  }
  browserPhaseY += 16;
}
browserPhaseSvg.push(
  `<text x="${
    browserPhaseLeft + browserPhasePlotWidth / 2
  }" y="684" text-anchor="middle" fill="#59636e" font-size="10">Median milliseconds · p95 and raw paired samples are in the archived JSON</text></svg>`,
);

console.table(
  browserPhaseRows.map((row) => ({
    operation: row.operation,
    n: row.updates,
    diagnosticRuntimeMs: row.diagnosticRuntimeMedianMs,
    sameSeedDiagnosticReactMs: row.diagnosticReactMedianMs,
    uninstrumentedN: row.uninstrumentedUpdates,
    uninstrumentedFollowupRuntimeMs: row.uninstrumentedRuntimeMedianMs,
    uninstrumentedFollowupReactMs: row.uninstrumentedReactMedianMs,
    uninstrumentedPairedDiffMs: row.uninstrumentedMedianPairedDifferenceMs,
    uninstrumentedPairedRatio: row.uninstrumentedMedianPairedRatio,
    rootFlushMs: row.rootFlushMedianMs,
    ownerExpandMs: row.ownerExpandMedianMs,
    hostReconcileMs: row.hostReconcileMedianMs,
    keyIndexVisits: row.keyIndexCombinedVisits,
    hostMethodCalls: row.hostMutationCalls,
  })),
);
Deno.jupyter.svg`${browserPhaseSvg.join("")}`;

const workCountWidth = 1060;
const workCountHeight = 430;
const workCountLeft = 210;
const workCountRight = 170;
const workCountPlotWidth = workCountWidth - workCountLeft - workCountRight;
const workCountMax = 10_000;
const workCountScale = workCountPlotWidth / workCountMax;
const workCountSvg: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${workCountHeight}" viewBox="0 0 ${workCountWidth} ${workCountHeight}" role="img" aria-labelledby="work-count-title work-count-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="work-count-title">Structural update work counts</title>`,
  `<desc id="work-count-desc">For each structural operation, bars compare median component-owner visits with combined old and new key-index subtree visits. These counts explain visited work, not elapsed time; host mutation details are in the table.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="24" font-size="15" font-weight="700">Median visits by structural direction · diagnostic seed 83001053</text>`,
];
const workCountSeries = [
  {
    field: "owner.component-visits",
    label: "component-owner visits",
    color: "#2563eb",
  },
  {
    field: "vdom.key-index.incremental-old-visits",
    label: "key-index detach visits",
    color: "#d97706",
  },
  {
    field: "vdom.key-index.incremental-new-visits",
    label: "key-index attach visits",
    color: "#0f766e",
  },
] as const;
for (let tick = 0; tick <= workCountMax; tick += 10_000) {
  const x = workCountLeft + tick * workCountScale;
  workCountSvg.push(
    `<line x1="${x}" x2="${x}" y1="48" y2="360" stroke="#e5e7eb"/><text x="${x}" y="382" text-anchor="middle" fill="#59636e" font-size="10">${tick.toLocaleString()}</text>`,
  );
}
browserPhaseRows.forEach((row, rowIndex) => {
  const groupY = 61 + rowIndex * 78;
  workCountSvg.push(
    `<text x="${workCountLeft - 12}" y="${
      groupY + 27
    }" text-anchor="end" fill="#17202a" font-size="12" font-weight="700">${row.operation}</text>`,
  );
  workCountSeries.forEach((series, seriesIndex) => {
    const value = row.workCounts[series.field] ?? 0;
    const y = groupY + seriesIndex * 17;
    const width = value * workCountScale;
    workCountSvg.push(
      `<rect x="${workCountLeft}" y="${y}" width="${width}" height="12" rx="2" fill="${series.color}"/><text x="${
        workCountLeft + width + 5
      }" y="${
        y + 10
      }" fill="#303840" font-size="10">${value.toLocaleString()}</text>`,
    );
  });
});
workCountSeries.forEach((series, index) => {
  workCountSvg.push(
    `<rect x="${
      workCountLeft + index * 215
    }" y="405" width="10" height="10" rx="2" fill="${series.color}"/><text x="${
      workCountLeft + 15 + index * 215
    }" y="414" fill="#48515b" font-size="10">${series.label}</text>`,
  );
});
workCountSvg.push(
  `<text x="${
    workCountLeft + workCountPlotWidth / 2
  }" y="397" text-anchor="middle" fill="#59636e" font-size="10">Visited nodes per update · filter directions are separate</text></svg>`,
);
console.table(
  browserPhaseRows.map(({
    operation,
    workCounts,
    keyIndexCombinedVisits,
    hostMutationCalls,
    diagnosticReactMedianMs,
    diagnosticRuntimeMedianMs,
    uninstrumentedReactMedianMs,
    uninstrumentedRuntimeMedianMs,
  }) => ({
    operation,
    diagnosticReactMedianMs,
    diagnosticRuntimeMedianMs,
    uninstrumentedReactMedianMs,
    uninstrumentedRuntimeMedianMs,
    ownerVisits: workCounts["owner.component-visits"] ?? 0,
    ownerRenders: workCounts["owner.component-renders"] ?? 0,
    cachedReuse: workCounts["owner.cached-reused"] ?? 0,
    createdOwners: workCounts["owner.created"] ?? 0,
    retiredOwners: workCounts["owner.retired"] ?? 0,
    oldKeyIndexVisits: workCounts["vdom.key-index.incremental-old-visits"] ?? 0,
    newKeyIndexVisits: workCounts["vdom.key-index.incremental-new-visits"] ?? 0,
    keyIndexCombinedVisits,
    hostMutationCalls,
  })),
);
Deno.jupyter.svg`${workCountSvg.join("")}`;
