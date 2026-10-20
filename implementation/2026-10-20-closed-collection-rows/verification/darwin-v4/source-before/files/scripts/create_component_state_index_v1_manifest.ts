const preregistrationPath =
  "results/component-state-structural-index-v1-preregistration.json";
const sourceLockPath =
  "results/component-state-structural-index-v1-source-lock.json";
const preregistration = JSON.parse(
  await Deno.readTextFile(preregistrationPath),
);
const sourceLock = JSON.parse(await Deno.readTextFile(sourceLockPath));
if (
  preregistration.status !== "FROZEN_BEFORE_COLLECTION" ||
  sourceLock.status !== "FROZEN_BEFORE_COLLECTION" ||
  preregistration.schemaVersion !==
    "component-state-structural-index-preregistration-v1" ||
  sourceLock.schemaVersion !==
    "component-state-structural-index-v1-source-lock" ||
  preregistration.amendments?.[0]?.id !== "AMD-1"
) {
  throw new Error("Structural index preregistration/source lock is invalid");
}

const digest = async (path: string) => {
  const data = await Deno.readFile(path);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return {
    path,
    sha256: [...new Uint8Array(hash)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
    bytes: data.length,
  };
};
const sourceInputs = [];
for (
  const entry of sourceLock.entries as Array<{
    path: string;
    sha256: string;
    bytes: number;
  }>
) {
  const actual = await digest(entry.path);
  if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes) {
    throw new Error(`Frozen source drift: ${entry.path}`);
  }
  sourceInputs.push(actual);
}

const arms = ["react", "rebuild", "delta"] as const;
const operationNames = ["rotate", "replace-edge", "filter-half"] as const;
const armOrders = new Set([
  "react,rebuild,delta",
  "react,delta,rebuild",
  "rebuild,react,delta",
  "rebuild,delta,react",
  "delta,react,rebuild",
  "delta,rebuild,react",
]);
const rawRecords = [];
for (const seed of preregistration.design.seeds as number[]) {
  const path =
    `results/component-state-structural-index-v1/browser-component-state-structural-index-v1-${seed}.json`;
  const record = JSON.parse(await Deno.readTextFile(path));
  if (
    record.schemaVersion !== "component-state-structural-index-browser-v1" ||
    record.status !== "PASS" || record.seed !== seed ||
    record.count !== preregistration.design.count ||
    record.warmupPairs !== preregistration.design.warmupPairsPerOperation ||
    record.measuredPairs !== preregistration.design.measuredPairsPerOperation ||
    record.browser.visibilityState !== "visible" ||
    record.scenarios.length !== operationNames.length
  ) {
    throw new Error(`Page-level contract failed for seed ${seed}`);
  }
  for (const [index, operation] of operationNames.entries()) {
    const scenario = record.scenarios[index];
    if (
      scenario.operation !== operation || !scenario.outputParity ||
      !scenario.identity || !scenario.retainedState ||
      scenario.samples.length !== 24
    ) {
      throw new Error(`${operation} scenario contract failed for seed ${seed}`);
    }
    const pairIds = scenario.samples.map((sample: any) => sample.pair).sort(
      (a: number, b: number) => a - b,
    );
    if (pairIds.some((pair: number, i: number) => pair !== i)) {
      throw new Error(`${operation} pair IDs are invalid for seed ${seed}`);
    }
    const orderCounts = new Map<string, number>();
    for (const sample of scenario.samples as any[]) {
      const order = sample.order.join(",");
      if (
        !armOrders.has(order) || !sample.outputParity ||
        !arms.every((arm) =>
          sample.identity[arm] === true &&
          sample.retainedState[arm] === true &&
          Number.isFinite(sample.milliseconds[arm]) &&
          sample.milliseconds[arm] >= 0
        )
      ) {
        throw new Error(`${operation} sample contract failed for seed ${seed}`);
      }
      orderCounts.set(order, (orderCounts.get(order) ?? 0) + 1);
    }
    if (
      orderCounts.size !== 6 || [...orderCounts.values()].some((n) => n !== 4)
    ) {
      throw new Error(
        `${operation} measured arm orders unbalanced for ${seed}`,
      );
    }
    if (
      operation === "filter-half" &&
      (scenario.samples.filter((sample: any) => sample.direction === "shrink")
            .length !== 12 ||
        scenario.samples.filter((sample: any) => sample.direction === "restore")
            .length !== 12)
    ) {
      throw new Error(`Filter directions unbalanced for seed ${seed}`);
    }
    if (
      operation !== "filter-half" &&
      scenario.samples.some((sample: any) => sample.direction !== null)
    ) {
      throw new Error(
        `Unexpected filter direction in ${operation}, seed ${seed}`,
      );
    }
  }
  rawRecords.push({ path, ...await digest(path) });
}

const inputs = [
  await digest(preregistrationPath),
  await digest(sourceLockPath),
  ...sourceInputs,
  ...rawRecords,
];
const uniqueInputs = [
  ...new Map(inputs.map((item) => [item.path, item])).values(),
];
const manifest = {
  schemaVersion: "component-state-structural-index-v1-manifest",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistration: preregistrationPath,
  sourceLock: sourceLockPath,
  acceptedPages: rawRecords.length,
  seeds: preregistration.design.seeds,
  totalMeasuredPairs: rawRecords.length * operationNames.length * 24,
  inputs: uniqueInputs,
};
await Deno.writeTextFile(
  "results/component-state-structural-index-v1-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Validated and pinned ${rawRecords.length} structural pages and ${uniqueInputs.length} inputs`,
);
