const directory = "results";
const counts = [32, 128, 512, 1024];
const arms = ["react", "runtime", "generated", "direct"];
const candidates: string[] = [];
for await (const entry of Deno.readDir(directory)) {
  if (
    entry.isFile &&
    /^browser-snake-frame-v4-\d+-(react|runtime|generated|direct)-[0-9a-f-]+\.json$/i
      .test(entry.name)
  ) candidates.push(entry.name);
}
candidates.sort();

const names: string[] = [];
const excludedInteractiveFiles: string[] = [];
const environments: Array<Record<string, unknown>> = [];
for (const name of candidates) {
  const record = JSON.parse(await Deno.readTextFile(`${directory}/${name}`));
  const expected =
    /^s(32|128|512|1024)-rep([1-4])-(react|runtime|generated|direct)$/
      .exec(record.trialId);
  if (
    expected && Number(expected[1]) === record.segmentCount &&
    expected[3] === record.arm
  ) names.push(name);
  else excludedInteractiveFiles.push(name);
}
if (names.length !== 64) {
  throw new Error(
    `Expected 64 preregistered V4 records, found ${names.length}`,
  );
}

const files = [];
for (const name of names) {
  const bytes = await Deno.readFile(`${directory}/${name}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.schemaVersion !== "snake-frame-browser-v4" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.measuredFrames !== 300 || record.samples.length !== 300 ||
    record.warmupFrames !== 90 || !record.completeCommitCoverage ||
    record.browser?.visibilityState !== "visible"
  ) throw new Error(`Record failed manifest contract: ${name}`);
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
    refreshRateEstimateHz: record.refreshRateEstimateHz,
  });
}
if (new Set(files.map((file) => file.trialId)).size !== 64) {
  throw new Error("V4 trial IDs are not unique");
}
if (
  new Set(environments.map((environment) => JSON.stringify(environment)))
    .size !== 1
) throw new Error("V4 page environments are not consistent");
for (const count of counts) {
  for (const arm of arms) {
    if (
      files.filter((file) => file.segmentCount === count && file.arm === arm)
        .length !== 4
    ) throw new Error(`V4 replication count failed: ${count}/${arm}`);
  }
}

const manifest = {
  schemaVersion: "snake-frame-browser-v4-manifest-v1",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  protocol: {
    studyVersion: "snake-frame-browser-v4",
    arms,
    segmentCounts: counts,
    pageLoadsPerArmAndSize: 4,
    warmupFrames: 90,
    measuredFramesPerPage: 300,
    replicationUnit: "isolated visible browser page load",
    armOrders: [
      ["react", "generated", "runtime", "direct"],
      ["runtime", "direct", "react", "generated"],
      ["direct", "runtime", "generated", "react"],
      ["generated", "react", "direct", "runtime"],
    ],
    sizeOrders: [
      [32, 128, 512, 1024],
      [512, 1024, 32, 128],
      [1024, 512, 128, 32],
      [128, 32, 1024, 512],
    ],
    sourcePlan: "OXC repeated-host plan with two item-local CSR source slots",
  },
  environment: {
    ...environments[0],
    browser: "Chrome 154",
  },
  pageLoads: files.length,
  measuredSamples: files.reduce((total, file) => total + file.sampleCount, 0),
  files,
  excludedInteractiveFiles,
};
await Deno.writeTextFile(
  `${directory}/browser-snake-frame-v4-manifest.json`,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote V4 manifest for ${files.length} page loads and ${manifest.measuredSamples} samples.`,
);
