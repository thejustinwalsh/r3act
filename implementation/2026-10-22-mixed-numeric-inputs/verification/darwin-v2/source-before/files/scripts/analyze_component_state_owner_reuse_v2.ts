const seeds = [83005101, 83005102, 83005103, 83005104, 83005105];
const arms = ["react", "generic", "reuse", "token"] as const;
const groups = [
  { operation: "rotate", direction: null, id: "rotate" },
  { operation: "replace-edge", direction: null, id: "replace-edge" },
  { operation: "filter-half", direction: "shrink", id: "filter-shrink" },
  { operation: "filter-half", direction: "restore", id: "filter-restore" },
] as const;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const sha256 = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const armsOrder = (order: string[]) => order.join(",");
const permutationKeys = (values: string[]): string[] => {
  if (values.length <= 1) return [values.join(",")];
  return values.flatMap((value, index) =>
    permutationKeys([...values.slice(0, index), ...values.slice(index + 1)]).map(
      (tail) => `${value},${tail}`,
    )
  );
};

const files = [
  ...seeds.map((seed) =>
    `results/component-state-owner-reuse-v2/latency/browser-component-state-owner-reuse-v2-${seed}-latency-pass.json`
  ),
  "results/component-state-owner-reuse-v2/diagnostic/browser-component-state-owner-reuse-v2-83005101-diagnostic-pass.json",
];
const inputRecords = [];
for (const path of files) {
  const bytes = await Deno.readFile(path);
  inputRecords.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
}
const sourceLockBytes = await Deno.readFile(
  "results/component-state-owner-reuse-v2-source-lock.json",
);
const sourceLock = JSON.parse(new TextDecoder().decode(sourceLockBytes));
if (
  sourceLock.schemaVersion !== "component-state-owner-reuse-v2-source-lock" ||
  sourceLock.status !== "FROZEN_BEFORE_LATENCY_COLLECTION" ||
  sourceLock.entries.length !== 30
) throw new Error("V2 source-lock contract failed");
for (const entry of sourceLock.entries as Array<{
  path: string;
  bytes: number;
  sha256: string;
}>) {
  const bytes = await Deno.readFile(entry.path);
  if (bytes.length !== entry.bytes || await sha256(bytes) !== entry.sha256) {
    throw new Error(`V2 source drift: ${entry.path}`);
  }
}
const protocolFiles = [
  "results/component-state-owner-reuse-v2-preregistration.json",
  ...[1, 2, 3, 4, 5].map((n) =>
    `results/component-state-owner-reuse-v2-amendment-${String(n).padStart(2, "0")}.json`
  ),
  "results/component-state-owner-reuse-v2-source-lock.json",
];
const protocolHashes = [];
for (const path of protocolFiles) {
  const bytes = await Deno.readFile(path);
  protocolHashes.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
}

const latencyPages: any[] = [];
for (const seed of seeds) {
  const path = files.find((file) => file.includes(`-${seed}-latency-`))!;
  const record = JSON.parse(await Deno.readTextFile(path));
  if (
    record.schemaVersion !== "component-state-owner-reuse-browser-v2" ||
    record.status !== "PASS" || record.mode !== "latency" ||
    record.seed !== seed || record.count !== 10_000 ||
    record.warmupPairs !== 8 || record.measuredPairs !== 24 ||
    record.browser.visibilityState !== "visible" ||
    !arms.every((arm) => record.arms.includes(arm))
  ) throw new Error(`Invalid V2 page record: ${path}`);

  const pageGroups = [];
  for (const group of groups) {
    const scenario = record.scenarios.find((item: any) =>
      item.operation === group.operation
    );
    if (!scenario || scenario.samples.length !== 24) {
      throw new Error(`${seed}/${group.id}: expected 24 paired samples`);
    }
    const samples = scenario.samples.filter((sample: any) =>
      group.direction === null || sample.direction === group.direction
    );
    if (samples.length !== (group.direction === null ? 24 : 12)) {
      throw new Error(`${seed}/${group.id}: unexpected direction sample count`);
    }
    if (
      samples.some((sample: any) => sample.outputParity !== true ||
        arms.some((arm) => sample.identity?.[arm] !== true ||
          sample.retainedState?.[arm] !== true))
    ) throw new Error(`${seed}/${group.id}: correctness contract failed`);
    if (group.direction === null) {
      const observedOrders = new Set(scenario.samples.map((sample: any) =>
        armsOrder(sample.order)
      ));
      const expectedOrders = new Set(permutationKeys([...arms]));
      if (
        observedOrders.size !== 24 ||
        [...expectedOrders].some((order) => !observedOrders.has(order))
      ) throw new Error(`${seed}/${group.id}: arm-order balance failed`);
    }
    const ratioTokenReact = samples.map((sample: any) =>
      sample.milliseconds.token / Math.max(sample.milliseconds.react, 0.001)
    );
    const ratioTokenGeneric = samples.map((sample: any) =>
      sample.milliseconds.token / Math.max(sample.milliseconds.generic, 0.001)
    );
    pageGroups.push({
      id: group.id,
      n: samples.length,
      medianMs: Object.fromEntries(arms.map((arm) => [
        arm,
        median(samples.map((sample: any) => sample.milliseconds[arm])),
      ])),
      p95Ms: Object.fromEntries(arms.map((arm) => [
        arm,
        percentile(samples.map((sample: any) => sample.milliseconds[arm]), 0.95),
      ])),
      tokenOverReact: median(ratioTokenReact),
      tokenOverGeneric: median(ratioTokenGeneric),
    });
  }
  latencyPages.push({
    seed,
    pageLoad: record.collectedAt,
    browser: record.browser,
    status: record.status,
    archiveFile: record.archiveFile,
    groups: pageGroups,
  });
}

const diagnosticPath = files.at(-1)!;
const diagnostic = JSON.parse(await Deno.readTextFile(diagnosticPath));
if (
  diagnostic.schemaVersion !== "component-state-owner-reuse-browser-v2" ||
  diagnostic.status !== "PASS" || diagnostic.mode !== "diagnostic" ||
  diagnostic.browser.visibilityState !== "visible"
) throw new Error("V2 diagnostic record contract failed");
const diagnosticMechanism: any[] = diagnostic.scenarios.map((scenario: any) => {
  const checks = scenario.samples.map((sample: any) => {
    const token = sample.diagnosticCounters?.token ?? {};
    const value = (key: string) => token[`owner.keyed-region.${key}`] ?? 0;
    return scenario.operation === "rotate"
      ? value("token-hits") === 10_000 &&
        value("token-output-reuses") === 10_000 &&
        value("token-mismatches") === 0 &&
        value("eligibility-visits") === 0 && value("fallback") === 0
      : value("token-mismatches") === 1 &&
        value("fallback") === 1 &&
        value("token-eligibility-visits") === 0 &&
        value("eligibility-visits") === 0;
  });
  return {
    operation: scenario.operation,
    samples: scenario.samples.length,
    pass: checks.every(Boolean),
    tokenFastPathHits: scenario.samples.reduce((sum: number, sample: any) =>
      sum + (sample.diagnosticCounters?.token?.[
        "owner.keyed-region.token-hits"
      ] ?? 0), 0),
    cachedOutputsReused: scenario.samples.reduce((sum: number, sample: any) =>
      sum + (sample.diagnosticCounters?.token?.[
        "owner.keyed-region.token-output-reuses"
      ] ?? 0), 0),
    earlyMismatches: scenario.samples.reduce((sum: number, sample: any) =>
      sum + (sample.diagnosticCounters?.token?.[
        "owner.keyed-region.token-mismatches"
      ] ?? 0), 0),
    eligibilityVisits: scenario.samples.reduce((sum: number, sample: any) =>
      sum + (sample.diagnosticCounters?.token?.[
        "owner.keyed-region.eligibility-visits"
      ] ?? 0), 0),
  };
});

const summary = groups.map((group) => {
  const values = latencyPages.map((page) =>
    page.groups.find((row: any) => row.id === group.id)!
  );
  const ratiosReact = values.map((row) => row.tokenOverReact);
  const ratiosGeneric = values.map((row) => row.tokenOverGeneric);
  return {
    id: group.id,
    pageCount: values.length,
    nPerPage: values[0].n,
    medianPageLatencyMs: Object.fromEntries(arms.map((arm) => [
      arm,
      median(values.map((row) => row.medianMs[arm])),
    ])),
    tokenOverReactByPage: ratiosReact,
    tokenOverReactMedian: median(ratiosReact),
    tokenOverGenericByPage: ratiosGeneric,
    tokenOverGenericMedian: median(ratiosGeneric),
    tokenOverReactPassPages: ratiosReact.filter((ratio) => ratio <= 0.90).length,
    tokenOverGenericPassPages: ratiosGeneric.filter((ratio) => ratio <= 0.50).length,
    fallbackPass: group.id === "rotate"
      ? null
      : median(ratiosGeneric) <= 1.10,
  };
});
const rotation = summary.find((row) => row.id === "rotate")!;
const fallbackGroups = summary.filter((row) => row.id !== "rotate");
const productPrimaryPass = rotation.tokenOverReactPassPages >= 4;
const runtimePrimaryPass = rotation.tokenOverGenericPassPages >= 4;
const fallbackPass = fallbackGroups.every((row) => row.fallbackPass);
const mechanismPass = diagnosticMechanism.every((row) => row.pass);
const correctnessPass = latencyPages.every((page) =>
  page.groups.every((group: any) => group.n === 24 || group.n === 12)
);

const analyzerBytes = await Deno.readFile(
  "scripts/analyze_component_state_owner_reuse_v2.ts",
);
const result = {
  schemaVersion: "component-state-owner-reuse-v2-analysis-v1",
  createdAt: new Date().toISOString(),
  protocol: "results/component-state-owner-reuse-v2-preregistration.json",
  amendments: [1, 2, 3, 4, 5].map((n) =>
    `results/component-state-owner-reuse-v2-amendment-${String(n).padStart(2, "0")}.json`
  ),
  protocolHashes,
  sourceLock: {
    path: "results/component-state-owner-reuse-v2-source-lock.json",
    bytes: sourceLockBytes.length,
    sha256: await sha256(sourceLockBytes),
    lockedInputCount: sourceLock.entries.length,
    allCurrentInputsMatchLock: true,
  },
  rawInputs: inputRecords,
  analyzer: {
    path: "scripts/analyze_component_state_owner_reuse_v2.ts",
    bytes: analyzerBytes.length,
    sha256: await sha256(analyzerBytes),
  },
  integrity: {
    pageCount: latencyPages.length,
    latencyRecordsPass: latencyPages.length === 5,
    allLatencyPagesVisible: latencyPages.every((page) =>
      page.browser.visibilityState === "visible"
    ),
    allCorrectnessChecksPass: correctnessPass,
    diagnosticMechanismPass: mechanismPass,
  },
  gates: {
    productPrimaryPass,
    runtimePrimaryPass,
    fallbackPass,
    overallPreregisteredPass: productPrimaryPass && runtimePrimaryPass &&
      fallbackPass && mechanismPass && correctnessPass,
  },
  diagnosticMechanism,
  summary,
  pages: latencyPages,
};
await Deno.writeTextFile(
  "results/component-state-owner-reuse-v2-analysis.json",
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({
  integrity: result.integrity,
  gates: result.gates,
  summary,
  diagnosticMechanism,
}, null, 2));
