const root = "results/v6-production";
const preregistrationPath =
  "results/browser-snake-frame-v6-production-preregistration.json";
const preregistration = JSON.parse(
  await Deno.readTextFile(preregistrationPath),
);
if (
  preregistration.schemaVersion !==
    "snake-frame-browser-v6-production-preregistration-v1" ||
  preregistration.status !== "PREREGISTERED" ||
  preregistration.pages.length !== 75 ||
  preregistration.design.buildMode !== "production"
) throw new Error("V6 production preregistration is absent or malformed");
const expected = new Map(
  preregistration.pages.map((page: any) => [page.trialId, page]),
);
const candidates: string[] = [];
for await (const entry of Deno.readDir(root)) {
  if (
    entry.isFile &&
    /^browser-snake-frame-v6-\d+-(react|runtime|generated-vdom|columnar-vdom|direct)-[0-9a-f-]+\.json$/i
      .test(entry.name)
  ) candidates.push(entry.name);
}
candidates.sort();

const files = [];
const environments: string[] = [];
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
    record.schemaVersion !== "snake-frame-browser-v6" ||
    record.collection !== "production-v6" || record.buildMode !== "production" ||
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
  ) throw new Error(`V6 production record contract failed: ${name}`);
  environments.push(JSON.stringify({
    userAgent: record.browser.userAgent,
    viewport: record.browser.viewport,
    devicePixelRatio: record.browser.devicePixelRatio,
    hardwareConcurrency: record.browser.hardwareConcurrency,
    reactVersion: record.reactVersion,
    buildMode: record.buildMode,
  }));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({
    file: name,
    path: `v6-production/${name}`,
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
  });
}
if (files.length !== 75) {
  throw new Error(`Expected 75 V6 production records, found ${files.length}`);
}
if (
  new Set(files.map((file) => file.trialId)).size !== 75 ||
  new Set(files.map((file) => file.pageLoadId)).size !== 75
) throw new Error("V6 production identities are not unique");
if (new Set(environments).size !== 1) {
  throw new Error("V6 production environments are inconsistent");
}
for (const page of preregistration.pages) {
  if (!files.some((file) => file.trialId === page.trialId)) {
    throw new Error(`Missing V6 production page: ${page.trialId}`);
  }
}
const manifest = {
  schemaVersion: "snake-frame-browser-v6-production-manifest-v1",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistrationFile:
    "browser-snake-frame-v6-production-preregistration.json",
  preregistrationSchemaVersion: preregistration.schemaVersion,
  design: preregistration.design,
  collectionContext: {
    buildMode: "production",
    serverInvocation: "pnpm run build; pnpm run preview through Portless",
    recordedBeforeCollection: true,
  },
  environment: JSON.parse(environments[0]),
  pageLoads: files.length,
  measuredSamples: files.reduce((total, file) => total + file.sampleCount, 0),
  files,
  excludedFiles,
};
await Deno.writeTextFile(
  "results/browser-snake-frame-v6-production-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote V6 production manifest: ${files.length} pages, ${manifest.measuredSamples} RAF samples.`,
);
