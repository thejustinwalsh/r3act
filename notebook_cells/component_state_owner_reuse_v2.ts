const v2Analysis = JSON.parse(await Deno.readTextFile(
  "results/component-state-owner-reuse-v2-analysis.json",
));
const v2SourceLock = JSON.parse(await Deno.readTextFile(
  "results/component-state-owner-reuse-v2-source-lock.json",
));
const v2SnapshotManifest = JSON.parse(await Deno.readTextFile(
  "results/component-state-owner-reuse-v2-source-snapshot-manifest.json",
));
const v2Hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const v2Median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const v2Arms = ["react", "generic", "reuse", "token"] as const;
if (
  v2Analysis.schemaVersion !== "component-state-owner-reuse-v2-analysis-v1" ||
  v2SourceLock.schemaVersion !== "component-state-owner-reuse-v2-source-lock" ||
  v2SourceLock.status !== "FROZEN_BEFORE_LATENCY_COLLECTION" ||
  v2SourceLock.entries.length !== 30 ||
  v2SnapshotManifest.schemaVersion !==
    "component-state-owner-reuse-v2-source-snapshot-manifest" ||
  v2SnapshotManifest.status !== "PASS" ||
  v2SnapshotManifest.entries.length !== 30
) throw new Error("V2 analysis/source snapshot metadata contract failed");

const v2LockBytes = await Deno.readFile(v2Analysis.sourceLock.path);
if (
  v2LockBytes.length !== v2Analysis.sourceLock.bytes ||
  await v2Hash(v2LockBytes) !== v2Analysis.sourceLock.sha256 ||
  v2SnapshotManifest.sourceLock.bytes !== v2LockBytes.length ||
  v2SnapshotManifest.sourceLock.sha256 !== v2Analysis.sourceLock.sha256
) throw new Error("V2 source-lock hash mismatch");
const v2SourceDrift = [];
for (const entry of v2SourceLock.entries as Array<{
  path: string;
  bytes: number;
  sha256: string;
}>) {
  const snapshot = v2SnapshotManifest.entries.find((item: any) =>
    item.sourcePath === entry.path
  );
  if (!snapshot) throw new Error(`V2 source snapshot missing ${entry.path}`);
  const saved = await Deno.readFile(snapshot.snapshotPath);
  if (saved.length !== entry.bytes || await v2Hash(saved) !== entry.sha256) {
    throw new Error(`V2 source snapshot hash mismatch ${entry.path}`);
  }
  let currentMatches = false;
  try {
    const current = await Deno.readFile(entry.path);
    currentMatches = current.length === entry.bytes &&
      await v2Hash(current) === entry.sha256;
  } catch {
    currentMatches = false;
  }
  v2SourceDrift.push({
    path: entry.path,
    current: currentMatches ? "matches collection" : "changed after collection",
  });
}
console.log(
  `V2 sources: ${v2SnapshotManifest.entries.length} archived files match the frozen collection lock; ${v2SourceDrift.filter((entry) => entry.current !== "matches collection").length} live files have since changed. Analysis uses the verified archive and collection records.`,
);
const v2AnalysisBytes = await Deno.readFile(
  "scripts/analyze_component_state_owner_reuse_v2.ts",
);
if (
  v2AnalysisBytes.length !== v2Analysis.analyzer.bytes ||
  await v2Hash(v2AnalysisBytes) !== v2Analysis.analyzer.sha256
) throw new Error("V2 analysis script hash mismatch");

const v2RawRecords = new Map<string, any>();
for (const input of v2Analysis.rawInputs) {
  const bytes = await Deno.readFile(input.path);
  if (bytes.length !== input.bytes || await v2Hash(bytes) !== input.sha256) {
    throw new Error(`V2 raw input hash mismatch: ${input.path}`);
  }
  v2RawRecords.set(input.path, JSON.parse(new TextDecoder().decode(bytes)));
}
const v2Seeds = [83005101, 83005102, 83005103, 83005104, 83005105];
const v2LatencyPages: any[] = [];
for (const seed of v2Seeds) {
  const record = [...v2RawRecords.values()].find((item: any) =>
    item.mode === "latency" && item.seed === seed
  );
  if (!record || record.status !== "PASS" || record.browser.visibilityState !== "visible") {
    throw new Error(`V2 latency record missing or invalid for seed ${seed}`);
  }
  for (const scenario of record.scenarios) {
    if (scenario.samples.length !== 24) {
      throw new Error(`V2 ${seed}/${scenario.operation}: sample count mismatch`);
    }
    if (scenario.samples.some((sample: any) =>
      sample.outputParity !== true ||
      v2Arms.some((arm) => sample.identity?.[arm] !== true ||
        sample.retainedState?.[arm] !== true)
    )) throw new Error(`V2 ${seed}/${scenario.operation}: correctness mismatch`);
    if (scenario.operation !== "filter-half") {
      const permutations = new Set(scenario.samples.map((sample: any) =>
        sample.order.join(",")
      ));
      if (permutations.size !== 24) {
        throw new Error(`V2 ${seed}/${scenario.operation}: arm-order balance failed`);
      }
    } else if (
      scenario.samples.filter((sample: any) => sample.direction === "shrink").length !== 12 ||
      scenario.samples.filter((sample: any) => sample.direction === "restore").length !== 12
    ) throw new Error(`V2 ${seed}/filter-half: direction balance failed`);
  }
  const rows = [];
  for (const group of [
    { id: "rotate", operation: "rotate", direction: null },
    { id: "replace-edge", operation: "replace-edge", direction: null },
    { id: "filter-shrink", operation: "filter-half", direction: "shrink" },
    { id: "filter-restore", operation: "filter-half", direction: "restore" },
  ]) {
    const scenario = record.scenarios.find((item: any) =>
      item.operation === group.operation
    );
    const samples = scenario.samples.filter((sample: any) =>
      group.direction === null || sample.direction === group.direction
    );
    rows.push({
      id: group.id,
      seed,
      n: samples.length,
      medians: Object.fromEntries(v2Arms.map((arm) => [
        arm,
        v2Median(samples.map((sample: any) => sample.milliseconds[arm])),
      ])),
      tokenOverReact: v2Median(samples.map((sample: any) =>
        sample.milliseconds.token / Math.max(sample.milliseconds.react, 0.001)
      )),
      tokenOverGeneric: v2Median(samples.map((sample: any) =>
        sample.milliseconds.token / Math.max(sample.milliseconds.generic, 0.001)
      )),
    });
  }
  v2LatencyPages.push({ seed, rows });
}
const v2Diagnostic = [...v2RawRecords.values()].find((item: any) =>
  item.mode === "diagnostic"
);
if (!v2Diagnostic || v2Diagnostic.status !== "PASS") {
  throw new Error("V2 diagnostic record missing or failed");
}
const v2DiagnosticChecks = v2Diagnostic.scenarios.map((scenario: any) => ({
  operation: scenario.operation,
  samples: scenario.samples.length,
  pass: scenario.samples.every((sample: any) => {
    const counters = sample.diagnosticCounters?.token ?? {};
    const count = (key: string) =>
      counters[`owner.keyed-region.${key}`] ?? 0;
    return scenario.operation === "rotate"
      ? count("token-hits") === 10_000 &&
        count("token-output-reuses") === 10_000 &&
        count("token-mismatches") === 0 && count("eligibility-visits") === 0 &&
        count("fallback") === 0
      : count("token-mismatches") === 1 && count("fallback") === 1 &&
        count("token-eligibility-visits") === 0 &&
        count("eligibility-visits") === 0;
  }),
}));
if (v2DiagnosticChecks.some((item: any) => !item.pass)) {
  throw new Error("V2 diagnostic mechanism contract failed");
}

const v2GroupIds = ["rotate", "replace-edge", "filter-shrink", "filter-restore"];
const v2GroupLabels = ["Rotation", "Edge replace", "Filter shrink", "Filter restore"];
const v2Summary = v2GroupIds.map((id) => {
  const values = v2LatencyPages.map((page) =>
    page.rows.find((row: any) => row.id === id)!
  );
  return {
    id,
    values,
    tokenOverReact: values.map((row: any) => row.tokenOverReact),
    tokenOverGeneric: values.map((row: any) => row.tokenOverGeneric),
    medianReact: v2Median(values.map((row: any) => row.medians.react)),
    medianGeneric: v2Median(values.map((row: any) => row.medians.generic)),
    medianReuse: v2Median(values.map((row: any) => row.medians.reuse)),
    medianToken: v2Median(values.map((row: any) => row.medians.token)),
    tokenReactPassPages: values.filter((row: any) => row.tokenOverReact <= 0.90).length,
    tokenGenericPassPages: values.filter((row: any) => row.tokenOverGeneric <= 0.50).length,
    medianTokenOverReact: v2Median(values.map((row: any) => row.tokenOverReact)),
    medianTokenOverGeneric: v2Median(values.map((row: any) => row.tokenOverGeneric)),
  };
});
const v2Rotation = v2Summary[0];
const v2FallbackPass = v2Summary.slice(1).every((row) =>
  row.medianTokenOverGeneric <= 1.10
);
const v2Gates = {
  productPrimaryPass: v2Rotation.tokenReactPassPages >= 4,
  runtimePrimaryPass: v2Rotation.tokenGenericPassPages >= 4,
  fallbackPass: v2FallbackPass,
  overallPreregisteredPass: v2Rotation.tokenReactPassPages >= 4 &&
    v2Rotation.tokenGenericPassPages >= 4 && v2FallbackPass,
};
if (
  v2Gates.productPrimaryPass !== v2Analysis.gates.productPrimaryPass ||
  v2Gates.runtimePrimaryPass !== v2Analysis.gates.runtimePrimaryPass ||
  v2Gates.fallbackPass !== v2Analysis.gates.fallbackPass ||
  v2Gates.overallPreregisteredPass !==
    v2Analysis.gates.overallPreregisteredPass
) throw new Error("V2 notebook gate summary disagrees with frozen analyzer");

console.log("V2 five-page summary: median of page medians and page-level paired ratios; no sample pooling.");
console.table(v2Summary.map((row) => ({
  operation: row.id,
  nPerPage: row.values[0].n,
  ReactMs: row.medianReact,
  genericMs: row.medianGeneric,
  V1CheckedMs: row.medianReuse,
  V2TokenMs: row.medianToken,
  tokenOverReact: row.medianTokenOverReact,
  tokenOverGeneric: row.medianTokenOverGeneric,
  ReactGatePages: `${row.tokenReactPassPages}/5`,
  genericGatePages: `${row.tokenGenericPassPages}/5`,
})));
console.log("Preregistered gates and diagnostic checks:");
console.log(JSON.stringify({ gates: v2Gates, diagnostics: v2DiagnosticChecks }, null, 2));
console.log("V2 collection inputs verified; source-lock/current-source status:");
console.table(v2SourceDrift);

const v2RatioSvg: string[] = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="460" viewBox="0 0 960 460" role="img" aria-labelledby="v2-ratio-title v2-ratio-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">',
  '<title id="v2-ratio-title">V2 token path paired latency ratios across five pages</title>',
  '<desc id="v2-ratio-desc">Each point is a page-level median of paired update ratios for token reuse divided by generic expansion. Rotation meets both gates. Edge replacement exceeds the 1.10 fallback guardrail; filter shrink and restore remain within it.</desc>',
  '<rect width="100%" height="100%" fill="white"/>',
  '<text x="24" y="27" font-size="17" font-weight="700">Token path / generic runtime · paired page medians</text>',
  '<text x="24" y="47" font-size="11" fill="#555">Each dot is one fresh visible page; lower is faster. Rotation gate: 0.50×. Membership fallback ceiling: 1.10×.</text>',
];
const v2Plot = { left: 90, top: 70, width: 825, height: 300, min: 0.30, max: 1.32 };
const v2Y = (value: number) => v2Plot.top +
  (v2Plot.max - value) / (v2Plot.max - v2Plot.min) * v2Plot.height;
for (const tick of [0.3, 0.5, 0.7, 0.9, 1.0, 1.1, 1.2, 1.3]) {
  const y = v2Y(tick);
  const color = tick === 1.1 ? "#d97706" : tick === 1 ? "#334155" :
    tick === 0.5 ? "#0f766e" : "#e5e7eb";
  v2RatioSvg.push(
    `<line x1="${v2Plot.left}" x2="${v2Plot.left + v2Plot.width}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="${tick === 1.1 || tick === 1 || tick === 0.5 ? 1.6 : 1}"${tick === 1.1 ? ' stroke-dasharray="5 4"' : ""}/><text x="${v2Plot.left - 12}" y="${y + 4}" text-anchor="end" fill="#555" font-size="10">${tick.toFixed(1)}</text>`,
  );
}
const v2Step = v2Plot.width / v2Summary.length;
for (const [groupIndex, group] of v2Summary.entries()) {
  const center = v2Plot.left + v2Step * (groupIndex + 0.5);
  v2RatioSvg.push(
    `<text x="${center}" y="${v2Plot.top + v2Plot.height + 24}" text-anchor="middle" fill="#333" font-size="11">${v2GroupLabels[groupIndex]}</text>`,
  );
  for (const [pageIndex, value] of group.tokenOverGeneric.entries()) {
    const x = center + (pageIndex - 2) * 17;
    const y = v2Y(value);
    v2RatioSvg.push(
      `<circle cx="${x}" cy="${y}" r="5.5" fill="#0f766e" stroke="white" stroke-width="1.2"><title>Seed ${v2Seeds[pageIndex]}: ${value.toFixed(3)}×</title></circle>`,
    );
  }
}
v2RatioSvg.push(
  `<text x="20" y="220" transform="rotate(-90 20 220)" text-anchor="middle" fill="#444" font-size="11">Token / generic paired update ratio</text>`,
  '<circle cx="345" cy="432" r="5" fill="#0f766e"/><text x="357" y="436" font-size="10" fill="#444">Page-level paired median</text><line x1="535" x2="560" y1="432" y2="432" stroke="#d97706" stroke-width="1.6" stroke-dasharray="5 4"/><text x="568" y="436" font-size="10" fill="#444">1.10× fallback ceiling</text>',
  '</svg>',
);
Deno.jupyter.svg`${v2RatioSvg.join("")}`;

const v2LatencySvg: string[] = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="460" viewBox="0 0 960 460" role="img" aria-labelledby="v2-latency-title v2-latency-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">',
  '<title id="v2-latency-title">V2 structural update latency medians across five pages</title>',
  '<desc id="v2-latency-desc">Grouped bars show the median of five page-level update-to-host-commit medians for React, generic expansion, V1 checked reuse, and V2 token reuse for rotation, edge replacement, filter shrink, and filter restore.</desc>',
  '<rect width="100%" height="100%" fill="white"/>',
  '<text x="24" y="27" font-size="17" font-weight="700">Update-to-host-commit latency · median of five page medians</text>',
  '<text x="24" y="47" font-size="11" fill="#555">Milliseconds; each page uses 24 paired updates (12 per filter direction).</text>',
];
const v2LatencyPlot = { left: 75, top: 72, width: 840, height: 285, max: 50 };
const v2LatencyColors = { react: "#64748b", generic: "#d97706", reuse: "#94a3b8", token: "#0f766e" };
for (let tick = 0; tick <= v2LatencyPlot.max; tick += 10) {
  const y = v2LatencyPlot.top + v2LatencyPlot.height -
    tick / v2LatencyPlot.max * v2LatencyPlot.height;
  v2LatencySvg.push(
    `<line x1="${v2LatencyPlot.left}" x2="${v2LatencyPlot.left + v2LatencyPlot.width}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${v2LatencyPlot.left - 12}" y="${y + 4}" text-anchor="end" font-size="10" fill="#555">${tick}</text>`,
  );
}
const v2LatencyGroupW = v2LatencyPlot.width / v2Summary.length;
for (const [groupIndex, group] of v2Summary.entries()) {
  const groupX = v2LatencyPlot.left + groupIndex * v2LatencyGroupW;
  v2LatencySvg.push(
    `<text x="${groupX + v2LatencyGroupW / 2}" y="${v2LatencyPlot.top + v2LatencyPlot.height + 24}" text-anchor="middle" font-size="10" fill="#333">${v2GroupLabels[groupIndex]}</text>`,
  );
  for (const [armIndex, arm] of v2Arms.entries()) {
    const value = group[`median${arm[0].toUpperCase()}${arm.slice(1)}` as "medianReact" | "medianGeneric" | "medianReuse" | "medianToken"];
    const barW = 31;
    const x = groupX + 27 + armIndex * 44;
    const h = value / v2LatencyPlot.max * v2LatencyPlot.height;
    const y = v2LatencyPlot.top + v2LatencyPlot.height - h;
    v2LatencySvg.push(
      `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="${v2LatencyColors[arm]}"><title>${v2GroupLabels[groupIndex]} ${arm}: ${value.toFixed(2)} ms</title></rect><text x="${x + barW / 2}" y="${Math.max(v2LatencyPlot.top + 10, y - 4)}" text-anchor="middle" font-size="8" fill="#333">${value.toFixed(1)}</text>`,
    );
  }
}
for (const [index, arm] of v2Arms.entries()) {
  const x = 210 + index * 150;
  v2LatencySvg.push(
    `<rect x="${x}" y="412" width="13" height="13" fill="${v2LatencyColors[arm]}"/><text x="${x + 19}" y="423" font-size="10" fill="#444">${arm === "reuse" ? "V1 checked" : arm === "token" ? "V2 token" : arm}</text>`,
  );
}
v2LatencySvg.push(
  `<text x="18" y="220" transform="rotate(-90 18 220)" text-anchor="middle" font-size="10" fill="#444">Milliseconds</text>`,
  '</svg>',
);
Deno.jupyter.svg`${v2LatencySvg.join("")}`;
