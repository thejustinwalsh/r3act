const seeds = [83005001, 83005002, 83005003, 83005004, 83005005];
const operations = ["rotate", "replace-edge", "filter-half"] as const;
const arms = ["react", "generic", "reuse"] as const;
const preregPath = "results/component-state-owner-reuse-v1-preregistration.json";
const amendmentPath = "results/component-state-owner-reuse-v1-amendment-01.json";
const lockPath = "results/component-state-owner-reuse-v1-source-lock.json";
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
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

const preregBytes = await Deno.readFile(preregPath);
const amendmentBytes = await Deno.readFile(amendmentPath);
const lockBytes = await Deno.readFile(lockPath);
const prereg = JSON.parse(new TextDecoder().decode(preregBytes));
const amendment = JSON.parse(new TextDecoder().decode(amendmentBytes));
const lock = JSON.parse(new TextDecoder().decode(lockBytes));
if (
  prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION_AND_COLLECTION" ||
  amendment.status !== "FROZEN_BEFORE_LATENCY_COLLECTION" ||
  lock.schemaVersion !== "component-state-owner-reuse-v1-source-lock" ||
  lock.status !== "FROZEN_BEFORE_LATENCY_COLLECTION"
) throw new Error("Owner reuse protocol or source lock is not frozen");

for (const entry of lock.entries) {
  const bytes = await Deno.readFile(entry.path);
  if (bytes.length !== entry.bytes || await hash(bytes) !== entry.sha256) {
    throw new Error(`Source lock mismatch: ${entry.path}`);
  }
}

const records = [];
for (const seed of seeds) {
  const path =
    `results/component-state-owner-reuse-v1/latency/browser-component-state-owner-reuse-v1-${seed}.json`;
  const bytes = await Deno.readFile(path);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.schemaVersion !== "component-state-owner-reuse-browser-v1" ||
    record.mode !== "latency" || record.status !== "PASS" ||
    record.seed !== seed || record.count !== 10_000 ||
    record.warmupPairs !== 8 || record.measuredPairs !== 24 ||
    record.browser?.visibilityState !== "visible" ||
    record.scenarios.length !== operations.length
  ) throw new Error(`Owner reuse page contract failed: ${path}`);

  for (const operation of operations) {
    const scenario = record.scenarios.find((item: any) =>
      item.operation === operation
    );
    if (!scenario || scenario.samples.length !== 24) {
      throw new Error(`${seed}/${operation}: expected 24 samples`);
    }
    const pairs = new Set<number>();
    const orders = new Map<string, number>();
    for (const sample of scenario.samples) {
      pairs.add(sample.pair);
      const order = sample.order.join(",");
      orders.set(order, (orders.get(order) ?? 0) + 1);
      if (
        !sample.outputParity ||
        arms.some((arm) =>
          sample.identity?.[arm] !== true ||
          sample.retainedState?.[arm] !== true ||
          !Number.isFinite(sample.milliseconds?.[arm])
        )
      ) throw new Error(`${seed}/${operation}/${sample.pair}: correctness failed`);
    }
    if (
      pairs.size !== 24 || [...pairs].some((pair) => pair < 0 || pair > 23) ||
      orders.size !== 6 || [...orders.values()].some((count) => count !== 4)
    ) throw new Error(`${seed}/${operation}: pair/order balance failed`);
    if (operation === "filter-half") {
      const shrink = scenario.samples.filter((sample: any) =>
        sample.direction === "shrink"
      ).length;
      const restore = scenario.samples.filter((sample: any) =>
        sample.direction === "restore"
      ).length;
      if (shrink !== 12 || restore !== 12) {
        throw new Error(`${seed}: filter direction split was ${shrink}/${restore}`);
      }
    } else if (scenario.samples.some((sample: any) => sample.direction !== null)) {
      throw new Error(`${seed}/${operation}: unexpected direction label`);
    }

    for (const arm of arms) {
      const observed = scenario.samples.map((sample: any) =>
        sample.milliseconds[arm]
      );
      if (
        Math.abs(median(observed) - scenario.pageMedianMs[arm]) > 1e-9 ||
        Math.abs(percentile(observed, 0.95) - scenario.pageP95Ms[arm]) > 1e-9
      ) throw new Error(`${seed}/${operation}/${arm}: summary mismatch`);
    }
    const differences = scenario.samples.map((sample: any) =>
      sample.milliseconds.generic - sample.milliseconds.reuse
    );
    const ratios = scenario.samples.map((sample: any) =>
      sample.milliseconds.reuse /
      Math.max(sample.milliseconds.generic, 0.001)
    );
    if (
      Math.abs(
        median(differences) - scenario.pairedDifferenceMedianMs.genericMinusReuse,
      ) > 1e-9 ||
      Math.abs(median(ratios) - scenario.pairedRatioMedian.reuseOverGeneric) > 1e-9
    ) throw new Error(`${seed}/${operation}: paired summary mismatch`);
  }
  records.push({
    path,
    seed,
    bytes: bytes.length,
    sha256: await hash(bytes),
    browser: record.browser,
  });
}
const browserStrings = new Set(records.map((record) =>
  JSON.stringify(record.browser)
));
if (browserStrings.size !== 1) {
  throw new Error("Pages do not share a common browser/device profile");
}

const sourceLock = {
  path: lockPath,
  bytes: lockBytes.length,
  sha256: await hash(lockBytes),
};
const preregistration = {
  path: preregPath,
  bytes: preregBytes.length,
  sha256: await hash(preregBytes),
};
const amendmentRecord = {
  path: amendmentPath,
  bytes: amendmentBytes.length,
  sha256: await hash(amendmentBytes),
};
const diagnosticPath =
  "results/component-state-owner-reuse-v1/diagnostic/browser-component-state-owner-reuse-v1-83005001.json";
const diagnosticBytes = await Deno.readFile(diagnosticPath);
const diagnostic = JSON.parse(new TextDecoder().decode(diagnosticBytes));
if (
  diagnostic.schemaVersion !== "component-state-owner-reuse-browser-v1" ||
  diagnostic.mode !== "diagnostic" || diagnostic.status !== "PASS" ||
  diagnostic.seed !== 83005001 || diagnostic.count !== 10_000 ||
  diagnostic.warmupPairs !== 8 || diagnostic.measuredPairs !== 24 ||
  diagnostic.browser?.visibilityState !== "visible" ||
  diagnostic.scenarios.length !== operations.length
) throw new Error("Owner reuse diagnostic page contract failed");
for (const operation of operations) {
  const scenario = diagnostic.scenarios.find((item: any) =>
    item.operation === operation
  );
  if (
    !scenario || scenario.samples.length !== 24 ||
    scenario.samples.some((sample: any) =>
      !sample.diagnosticCounters?.generic || !sample.diagnosticCounters?.reuse
    )
  ) throw new Error(`Missing ${operation} diagnostic counters`);
}
if (JSON.stringify(diagnostic.browser) !== JSON.stringify(records[0].browser)) {
  throw new Error("Diagnostic page does not share the latency browser profile");
}
const diagnosticRecord = {
  path: diagnosticPath,
  seed: diagnostic.seed,
  bytes: diagnosticBytes.length,
  sha256: await hash(diagnosticBytes),
  browser: diagnostic.browser,
};
const manifest = {
  schemaVersion: "component-state-owner-reuse-v1-manifest",
  status: "PASS",
  interpretation:
    "Five accepted visible production-page latency records. Page is the replication unit; within-page samples are repeated measures. The separate diagnostic pass is recorded outside this latency manifest.",
  seeds,
  count: 10_000,
  pageCount: records.length,
  totalMeasuredPairs: records.length * operations.length * 24,
  sourceLock,
  preregistration,
  amendment: amendmentRecord,
  diagnostic: diagnosticRecord,
  inputHashes: [sourceLock, preregistration, amendmentRecord],
  pages: records,
};
const output =
  "results/component-state-owner-reuse-v1-manifest.json";
await Deno.writeTextFile(output, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  JSON.stringify({
    output,
    pages: records.length,
    measuredPairs: manifest.totalMeasuredPairs,
    sourceInputs: lock.entries.length,
  }, null, 2),
);
