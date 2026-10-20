const root = "results/v5-production";
const preregistrationPath =
  "results/browser-snake-frame-v5-production-preregistration.json";
const preregistration = JSON.parse(
  await Deno.readTextFile(preregistrationPath),
);
if (
  preregistration.schemaVersion !==
    "snake-frame-browser-v5-production-preregistration-v1" ||
  preregistration.status !== "PREREGISTERED" ||
  preregistration.pages.length !== 100 ||
  preregistration.buildMode !== "production"
) throw new Error("Production V5 preregistration is absent or malformed");

const expected = new Map(
  preregistration.pages.map((page: any) => [page.trialId, page]),
);
const candidates: string[] = [];
for await (const entry of Deno.readDir(root)) {
  if (
    entry.isFile &&
    /^browser-snake-frame-v5-\d+-(react|runtime|generated-vdom|generated|direct)-[0-9a-f-]+\.json$/i
      .test(entry.name)
  ) candidates.push(entry.name);
}
candidates.sort();

const files = [];
const environments: Array<Record<string, unknown>> = [];
const excludedFiles: string[] = [];
for (const name of candidates) {
  const bytes = await Deno.readFile(`${root}/${name}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  const page = expected.get(record.trialId) as any;
  if (!page) {
    excludedFiles.push(name);
    continue;
  }
  if (
    record.schemaVersion !== "snake-frame-browser-v5" ||
    record.collection !== "production" || record.buildMode !== "production" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.trialId !== page.trialId || record.arm !== page.arm ||
    record.segmentCount !== page.segmentCount || record.warmupFrames !== 90 ||
    record.measuredFrames !== 300 || record.samples?.length !== 300 ||
    !record.completeCommitCoverage || !record.allOutputMatches ||
    !record.stableNodeCount || !record.stableNodeIdentity ||
    record.browser?.visibilityState !== "visible" ||
    !Number.isFinite(record.mountMs) || record.mountMs < 0 ||
    ![
      record.heapUsedBeforeMountBytes,
      record.heapUsedAfterMountBytes,
      record.heapUsedAfterMeasuredFramesBytes,
    ].every((value: unknown) =>
      value === null ||
      (typeof value === "number" && Number.isFinite(value) && value >= 0)
    ) ||
    !record.samples.every((sample: any) =>
      Number.isSafeInteger(sample.frame) &&
      Number.isFinite(sample.intervalMs) && sample.intervalMs > 0 &&
      Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
      Number.isFinite(sample.commitMs) && sample.commitMs >= 0
    )
  ) throw new Error(`Production V5 record contract failed: ${name}`);
  environments.push({
    userAgent: record.browser.userAgent,
    viewport: record.browser.viewport,
    devicePixelRatio: record.browser.devicePixelRatio,
    hardwareConcurrency: record.browser.hardwareConcurrency,
    reactVersion: record.reactVersion,
    buildMode: record.buildMode,
  });
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({
    file: name,
    path: `v5-production/${name}`,
    sha256,
    trialId: record.trialId,
    pageLoadId: record.pageLoadId,
    arm: record.arm,
    segmentCount: record.segmentCount,
    sampleCount: record.measuredFrames,
    mountMs: record.mountMs,
    heapUsedBeforeMountBytes: record.heapUsedBeforeMountBytes,
    heapUsedAfterMountBytes: record.heapUsedAfterMountBytes,
    heapUsedAfterMeasuredFramesBytes: record.heapUsedAfterMeasuredFramesBytes,
    refreshRateEstimateHz: record.refreshRateEstimateHz,
  });
}
if (files.length !== 100) {
  throw new Error(`Expected 100 production V5 records, found ${files.length}`);
}
if (
  new Set(files.map((file) => file.trialId)).size !== 100 ||
  new Set(files.map((file) => file.pageLoadId)).size !== 100
) throw new Error("Production V5 record identities are not unique");
if (
  new Set(environments.map((environment) => JSON.stringify(environment)))
    .size !== 1
) throw new Error("Production V5 page environments are not consistent");
for (const page of preregistration.pages) {
  if (!files.some((file) => file.trialId === page.trialId)) {
    throw new Error(`Missing production V5 page: ${page.trialId}`);
  }
}

const manifest = {
  schemaVersion: "snake-frame-browser-v5-production-manifest-v1",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistrationFile: "browser-snake-frame-v5-production-preregistration.json",
  preregistrationSchemaVersion: preregistration.schemaVersion,
  protocol: preregistration.protocol,
  collectionContext: {
    buildMode: "production",
    serverInvocation: "pnpm run build; pnpm run preview via Portless",
    recordedBeforeCollection: true,
    pairedSchedule: "Same arm, size, order, and workload as V5 development run",
  },
  environment: { ...environments[0], browser: "Chrome 154" },
  pageLoads: files.length,
  measuredSamples: files.reduce((total, file) => total + file.sampleCount, 0),
  files,
  excludedFiles,
};
await Deno.writeTextFile(
  "results/browser-snake-frame-v5-production-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote production V5 manifest for ${files.length} page loads and ${manifest.measuredSamples} RAF callbacks.`,
);
