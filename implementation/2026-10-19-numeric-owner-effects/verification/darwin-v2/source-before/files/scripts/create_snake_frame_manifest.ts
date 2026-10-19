const directory = "results";
const candidates: string[] = [];
for await (const entry of Deno.readDir(directory)) {
  if (
    entry.isFile &&
    /^browser-snake-frame-v3-\d+-(react|runtime|direct)-[0-9a-f-]+\.json$/i
      .test(entry.name)
  ) candidates.push(entry.name);
}
candidates.sort();
const names: string[] = [];
const excludedFiles: string[] = [];
for (const name of candidates) {
  const record = JSON.parse(
    await Deno.readTextFile(`${directory}/${name}`),
  );
  if (
    /^s(?:32|128|512|1024)-rep[1-3]-(?:react|runtime|direct)$/.test(
      record.trialId,
    )
  ) names.push(name);
  else excludedFiles.push(name);
}
if (names.length !== 36) {
  throw new Error(
    `Expected 36 preregistered V3 records, found ${names.length}`,
  );
}

const files = [];
for (const name of names) {
  const bytes = await Deno.readFile(`${directory}/${name}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.schemaVersion !== "snake-frame-browser-v3" ||
    record.status !== "PASS" || !record.allContractsPass ||
    record.measuredFrames !== 300 || record.samples.length !== 300 ||
    !record.completeCommitCoverage
  ) throw new Error(`Record failed manifest contract: ${name}`);
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
const trialIds = new Set(files.map((file) => file.trialId));
if (trialIds.size !== 36) throw new Error("V3 trial IDs are not unique");
for (const count of [32, 128, 512, 1024]) {
  for (const arm of ["react", "runtime", "direct"]) {
    if (
      files.filter((file) => file.segmentCount === count && file.arm === arm)
        .length !== 3
    ) throw new Error(`V3 replication count failed: ${count}/${arm}`);
  }
}

const manifest = {
  schemaVersion: "snake-frame-browser-manifest-v1",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  protocol: {
    studyVersion: "snake-frame-browser-v3",
    arms: ["react", "runtime", "direct"],
    segmentCounts: [32, 128, 512, 1024],
    pageLoadsPerArmAndSize: 3,
    warmupFrames: 90,
    measuredFramesPerPage: 300,
    replicationUnit: "isolated visible browser page load",
  },
  environment: {
    browser: "Chrome 154",
    browserUserAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    devicePixelRatio: 2,
    hardwareConcurrency: 10,
    reactVersion: "19.3.0",
  },
  pageLoads: files.length,
  measuredSamples: files.reduce((total, file) => total + file.sampleCount, 0),
  files,
  excludedInteractiveFiles: excludedFiles,
};
await Deno.writeTextFile(
  `${directory}/browser-snake-frame-v3-manifest.json`,
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Wrote V3 manifest for ${files.length} page loads and ${manifest.measuredSamples} samples.`,
);
