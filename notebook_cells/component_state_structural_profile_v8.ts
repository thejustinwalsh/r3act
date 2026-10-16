const structuralProfileV8Manifest = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-profile-v8-83004001-83004005-manifest.json",
  ),
);
const structuralProfileV8SourceAudit = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-profile-v8-source-drift-audit.json",
  ),
);
const structuralProfileV8Seeds = [
  83004001,
  83004002,
  83004003,
  83004004,
  83004005,
];
if (
  structuralProfileV8Manifest.schemaVersion !==
    "component-state-structural-profile-v8-multipage-manifest" ||
  structuralProfileV8Manifest.status !==
    "POST_COLLECTION_PINNED_DIAGNOSTIC" ||
  JSON.stringify(structuralProfileV8Manifest.seeds) !==
    JSON.stringify(structuralProfileV8Seeds) ||
  structuralProfileV8Manifest.pageCount !== 5 ||
  structuralProfileV8Manifest.profiles.length !== 5 ||
  structuralProfileV8Manifest.sourceInputs.length !== 15 ||
  structuralProfileV8SourceAudit.schemaVersion !==
    "component-state-structural-profile-v8-source-drift-audit"
) {
  throw new Error("Structural profile V8 multi-page manifest contract failed");
}
const structuralProfileV8Hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const structuralProfileV8ManifestBytes = await Deno.readFile(
  "results/component-state-structural-profile-v8-83004001-83004005-manifest.json",
);
if (
  structuralProfileV8SourceAudit.originalManifest.bytes !==
    structuralProfileV8ManifestBytes.length ||
  await structuralProfileV8Hash(structuralProfileV8ManifestBytes) !==
    structuralProfileV8SourceAudit.originalManifest.sha256
) {
  throw new Error("Structural profile V8 historical manifest changed");
}
const structuralProfileV8SourceDrift: Array<{
  path: string;
  status: string;
  recoveredCopies: number;
}> = [];
for (const recorded of structuralProfileV8SourceAudit.sourceInputs as Array<{
  path: string;
  historicalBytes: number;
  historicalSha256: string;
  recoveredCopies: string[];
}>) {
  const input = structuralProfileV8Manifest.sourceInputs.find((item: any) =>
    item.path === recorded.path
  );
  if (
    !input || input.bytes !== recorded.historicalBytes ||
    input.sha256 !== recorded.historicalSha256
  ) {
    throw new Error(`Source drift audit disagrees with original manifest: ${recorded.path}`);
  }
  const bytes = await Deno.readFile(recorded.path);
  const matchesCollection = bytes.length === recorded.historicalBytes &&
    await structuralProfileV8Hash(bytes) === recorded.historicalSha256;
  for (const recoveredPath of recorded.recoveredCopies) {
    const recovered = await Deno.readFile(recoveredPath);
    if (
      recovered.length !== recorded.historicalBytes ||
      await structuralProfileV8Hash(recovered) !== recorded.historicalSha256
    ) {
      throw new Error(`Recovered source does not match collection hash: ${recoveredPath}`);
    }
  }
  structuralProfileV8SourceDrift.push({
    path: recorded.path,
    status: matchesCollection ? "matches collection" : "changed after collection",
    recoveredCopies: recorded.recoveredCopies.length,
  });
}
if (structuralProfileV8SourceDrift.length !== 15) {
  throw new Error("Structural profile V8 source drift audit is incomplete");
}
console.log("Historical source-file audit (raw profile hashes are verified separately):");
console.table(structuralProfileV8SourceDrift);
for (const profile of structuralProfileV8Manifest.profiles as Array<{
  path: string;
  bytes: number;
  sha256: string;
}>) {
  const bytes = await Deno.readFile(profile.path);
  if (
    bytes.length !== profile.bytes ||
    await structuralProfileV8Hash(bytes) !== profile.sha256
  ) {
    throw new Error(`Structural profile V8 data hash mismatch: ${profile.path}`);
  }
}

const structuralProfileV8Median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const structuralProfileV8P95 = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)];
};
const structuralProfileV8Metric = (sample: any, name: string): number => {
  if (name === "totalUpdateMs") return sample.totalUpdateMs;
  if (name === "rootFlushMs") return sample.rootFlushMs;
  if (name === "outsideRootFlushMs") return sample.outsideRootFlushMs;
  if (name.startsWith("phase:")) {
    return sample.phaseCalls[name.slice(6)]?.[0] ?? 0;
  }
  if (name.startsWith("work:")) {
    return sample.workCounts[name.slice(5)] ?? 0;
  }
  throw new Error(`Unknown profile metric ${name}`);
};
const structuralProfileV8Names = [
  "totalUpdateMs",
  "rootFlushMs",
  "outsideRootFlushMs",
  "phase:owner.expand-and-cache",
  "phase:vdom.normalize",
  "phase:vdom.reconcile-host",
  "work:owner.component-visits",
  "work:owner.cached-reused",
  "work:owner.created",
  "work:owner.retired",
  "work:host.insertions",
  "work:host.removals",
  "work:host.moves",
  "work:vdom.key-index.incremental-old-visits",
  "work:vdom.key-index.incremental-new-visits",
];
const structuralProfileV8Rows: any[] = [];
for (const profileRef of structuralProfileV8Manifest.profiles as Array<{
  path: string;
  seed: number;
}>) {
  const profile = JSON.parse(await Deno.readTextFile(profileRef.path));
  if (
    profile.schemaVersion !==
      "component-state-structural-browser-phase-profile-v8" ||
    profile.seed !== profileRef.seed || profile.count !== 10_000 ||
    profile.operations.length !== 3
  ) {
    throw new Error(`Unexpected structural profile: ${profileRef.path}`);
  }
  for (const operation of profile.operations) {
    if (operation.measuredUpdates !== 24 || operation.samples.length !== 24) {
      throw new Error(`${profile.seed}/${operation.operation}: expected 24 samples`);
    }
    let groups: Array<{ label: string; samples: any[] }>;
    if (operation.operation === "filter-half") {
      const shrink: any[] = [];
      const restore: any[] = [];
      for (const sample of operation.samples) {
        const created = sample.workCounts["owner.created"] ?? 0;
        const retired = sample.workCounts["owner.retired"] ?? 0;
        if (retired === 5_000 && created === 0) shrink.push(sample);
        else if (created === 5_000 && retired === 0) restore.push(sample);
        else throw new Error(`${profile.seed}/filter pair ${sample.pair}: direction is ambiguous`);
      }
      if (shrink.length + restore.length !== 24 || !shrink.length || !restore.length) {
        throw new Error(`${profile.seed}: filter directions do not account for all 24 samples`);
      }
      groups = [
        { label: "filter shrink", samples: shrink },
        { label: "filter restore", samples: restore },
      ];
    } else {
      groups = [{ label: operation.operation, samples: operation.samples }];
    }
    for (const group of groups) {
      const values = Object.fromEntries(
        structuralProfileV8Names.map((name) => [
          name,
          group.samples.map((sample) => structuralProfileV8Metric(sample, name)),
        ]),
      ) as Record<string, number[]>;
      const workMedian = (name: string) =>
        structuralProfileV8Median(values[`work:${name}`]);
      structuralProfileV8Rows.push({
        seed: profile.seed,
        operation: group.label,
        n: group.samples.length,
        totalMedianMs: structuralProfileV8Median(values.totalUpdateMs),
        totalP95Ms: structuralProfileV8P95(values.totalUpdateMs),
        rootFlushMedianMs: structuralProfileV8Median(values.rootFlushMs),
        outsideFlushMedianMs: structuralProfileV8Median(values.outsideRootFlushMs),
        expandMedianMs: structuralProfileV8Median(values["phase:owner.expand-and-cache"]),
        normalizeMedianMs: structuralProfileV8Median(values["phase:vdom.normalize"]),
        reconcileMedianMs: structuralProfileV8Median(values["phase:vdom.reconcile-host"]),
        ownerVisitsMedian: workMedian("owner.component-visits"),
        reusedOwnersMedian: workMedian("owner.cached-reused"),
        createdOwnersMedian: workMedian("owner.created"),
        retiredOwnersMedian: workMedian("owner.retired"),
        insertionsMedian: workMedian("host.insertions"),
        removalsMedian: workMedian("host.removals"),
        movesMedian: workMedian("host.moves"),
        keyIndexVisitsMedian:
          workMedian("vdom.key-index.incremental-old-visits") +
          workMedian("vdom.key-index.incremental-new-visits"),
      });
    }
  }
}
console.log("Page-level medians (filter direction identified from created/retired owner counters):");
console.table(structuralProfileV8Rows);

const structuralProfileV8Labels = [
  "rotate",
  "replace-edge",
  "filter shrink",
  "filter restore",
];
const structuralProfileV8Summary = structuralProfileV8Labels.map((operation) => {
  const pages = structuralProfileV8Rows.filter((row) => row.operation === operation);
  const summarize = (key: string) => {
    const values = pages.map((page) => page[key]);
    return {
      median: structuralProfileV8Median(values),
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };
  return {
    operation,
    pages: pages.length,
    totalMs: summarize("totalMedianMs"),
    outsideFlushMs: summarize("outsideFlushMedianMs"),
    expandCacheMs: summarize("expandMedianMs"),
    normalizeMs: summarize("normalizeMedianMs"),
    reconcileMs: summarize("reconcileMedianMs"),
    ownerVisits: summarize("ownerVisitsMedian"),
    reused: summarize("reusedOwnersMedian"),
    hostInserts: summarize("insertionsMedian"),
    hostRemoves: summarize("removalsMedian"),
    hostMoves: summarize("movesMedian"),
    keyIndexVisits: summarize("keyIndexVisitsMedian"),
  };
});
console.log("Median and range across five page-level medians (no pooling):");
console.table(structuralProfileV8Summary.map((row) => ({
  operation: row.operation,
  pages: row.pages,
  totalMedianMs: row.totalMs.median,
  totalRangeMs: `${row.totalMs.min}–${row.totalMs.max}`,
  outsideFlushMedianMs: row.outsideFlushMs.median,
  expandMedianMs: row.expandCacheMs.median,
  normalizeMedianMs: row.normalizeMs.median,
  reconcileMedianMs: row.reconcileMs.median,
  ownerVisits: row.ownerVisits.median,
  reusedOwners: row.reused.median,
  hostMutations:
    row.hostInserts.median + row.hostRemoves.median + row.hostMoves.median,
  keyIndexVisits: row.keyIndexVisits.median,
})));

const structuralProfileV8ChartW = 960;
const structuralProfileV8ChartH = 320;
const structuralProfileV8Left = 165;
const structuralProfileV8Top = 38;
const structuralProfileV8Row = 58;
const structuralProfileV8PlotW = 590;
const structuralProfileV8Max = 14;
const structuralProfileV8Svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${structuralProfileV8ChartW}" height="${structuralProfileV8ChartH}" viewBox="0 0 ${structuralProfileV8ChartW} ${structuralProfileV8ChartH}">`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="${structuralProfileV8ChartW / 2}" y="18" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#222">Five-page diagnostic phase medians (median of page medians; ms)</text>`,
];
for (let tick = 0; tick <= structuralProfileV8Max; tick += 2) {
  const x = structuralProfileV8Left +
    tick / structuralProfileV8Max * structuralProfileV8PlotW;
  structuralProfileV8Svg.push(
    `<line x1="${x}" x2="${x}" y1="${structuralProfileV8Top - 8}" y2="${structuralProfileV8ChartH - 28}" stroke="#e5e7eb"/>`,
    `<text x="${x}" y="${structuralProfileV8ChartH - 12}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#555">${tick}</text>`,
  );
}
const structuralProfileV8Series = [
  { name: "owner expand/cache", key: "expandCacheMs", color: "#2563eb" },
  { name: "VDOM normalize", key: "normalizeMs", color: "#d97706" },
  { name: "host reconcile", key: "reconcileMs", color: "#0f766e" },
] as const;
for (const [rowIndex, summary] of structuralProfileV8Summary.entries()) {
  const y = structuralProfileV8Top + rowIndex * structuralProfileV8Row;
  structuralProfileV8Svg.push(
    `<text x="${structuralProfileV8Left - 10}" y="${y + 27}" text-anchor="end" font-size="11" font-family="sans-serif" fill="#333">${summary.operation}</text>`,
  );
  for (const [seriesIndex, series] of structuralProfileV8Series.entries()) {
    const value = summary[series.key].median;
    const barY = y + seriesIndex * 13;
    const width = Math.min(value, structuralProfileV8Max) /
      structuralProfileV8Max * structuralProfileV8PlotW;
    structuralProfileV8Svg.push(
      `<rect x="${structuralProfileV8Left}" y="${barY}" width="${width}" height="10" fill="${series.color}"/>`,
      `<text x="${structuralProfileV8Left + width + 5}" y="${barY + 9}" font-size="9" font-family="sans-serif" fill="#333">${value.toFixed(2)} ms</text>`,
    );
  }
}
structuralProfileV8Svg.push(
  `<text x="${structuralProfileV8Left + structuralProfileV8PlotW / 2}" y="${structuralProfileV8ChartH - 1}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#555">Instrumented phase duration (ms); scopes overlap</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${structuralProfileV8Svg.join("")}`;
