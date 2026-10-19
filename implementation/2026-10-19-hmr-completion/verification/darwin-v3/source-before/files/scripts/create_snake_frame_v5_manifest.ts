const directory = "results";
const preregistration = JSON.parse(
  await Deno.readTextFile(
    `${directory}/browser-snake-frame-v5-preregistration.json`,
  ),
);
if (
  preregistration.schemaVersion !==
    "snake-frame-browser-v5-preregistration-v1" ||
  preregistration.status !== "PREREGISTERED" ||
  preregistration.pages.length !== 100
) throw new Error("V5 preregistration is absent or malformed");

const expected = new Map(
  preregistration.pages.map((page: any) => [page.trialId, page]),
);
const candidatePattern =
  /^browser-snake-frame-v5-\d+-(react|runtime|generated-vdom|generated|direct)-[0-9a-f-]+\.json$/i;
const candidates: string[] = [];
for await (const entry of Deno.readDir(directory)) {
  if (entry.isFile && candidatePattern.test(entry.name)) {
    candidates.push(entry.name);
  }
}
candidates.sort();

const files = [];
const environments: Array<Record<string, unknown>> = [];
const excludedFiles: string[] = [];
for (const name of candidates) {
  const bytes = await Deno.readFile(`${directory}/${name}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  const expectedPage = expected.get(record.trialId) as any;
  if (!expectedPage) {
    excludedFiles.push(name);
    continue;
  }
  if (
    record.schemaVersion !== "snake-frame-browser-v5" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.trialId !== expectedPage.trialId ||
    record.arm !== expectedPage.arm ||
    record.segmentCount !== expectedPage.segmentCount ||
    record.warmupFrames !== 90 || record.measuredFrames !== 300 ||
    record.samples?.length !== 300 || !record.completeCommitCoverage ||
    !record.allOutputMatches || !record.stableNodeCount ||
    !record.stableNodeIdentity ||
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
  ) throw new Error(`V5 record contract failed: ${name}`);
  environments.push({
    userAgent: record.browser.userAgent,
    viewport: record.browser.viewport,
    devicePixelRatio: record.browser.devicePixelRatio,
    hardwareConcurrency: record.browser.hardwareConcurrency,
    reactVersion: record.reactVersion,
  });
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({
    file: name,
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
  throw new Error(
    `Expected 100 preregistered V5 records, found ${files.length}`,
  );
}
if (new Set(files.map((file) => file.trialId)).size !== 100) {
  throw new Error("V5 trial IDs are not unique");
}
if (new Set(files.map((file) => file.pageLoadId)).size !== 100) {
  throw new Error("V5 page-load IDs are not unique");
}
if (
  new Set(environments.map((environment) => JSON.stringify(environment)))
    .size !== 1
) throw new Error("V5 page environments are not consistent");
for (const page of preregistration.pages) {
  if (!files.some((file) => file.trialId === page.trialId)) {
    throw new Error(`Missing preregistered V5 page: ${page.trialId}`);
  }
}

const manifest = {
  schemaVersion: "snake-frame-browser-v5-manifest-v1",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistrationFile: "browser-snake-frame-v5-preregistration.json",
  preregistrationSchemaVersion: preregistration.schemaVersion,
  protocol: preregistration.protocol,
  collectionContext: {
    buildMode: "development",
    serverInvocation: "pnpm run dev via Portless; Vite development server",
    recordedPostHoc: true,
    preregistrationDeviation:
      "Build mode was not specified in the frozen schedule. Treat this as development-mode evidence only; repeat with a production build before claiming a result against optimized React.",
  },
  environment: { ...environments[0], browser: "Chrome 154" },
  pageLoads: files.length,
  measuredSamples: files.reduce((total, file) => total + file.sampleCount, 0),
  files,
  excludedFiles,
};
await Deno.writeTextFile(
  `${directory}/browser-snake-frame-v5-manifest.json`,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote V5 manifest for ${files.length} page loads and ${manifest.measuredSamples} RAF callbacks.`,
);
