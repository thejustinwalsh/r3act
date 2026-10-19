const preregistrationPath =
  "results/key-index-maintenance-v1-preregistration.json";
const preregistration = JSON.parse(
  await Deno.readTextFile(preregistrationPath),
);
if (
  preregistration.schemaVersion !==
    "key-index-maintenance-preregistration-v1" ||
  preregistration.status !== "FROZEN_BEFORE_COLLECTION"
) {
  throw new Error("Key-index maintenance preregistration is invalid");
}
const seeds = preregistration.design.seeds as number[];
if (seeds.length !== preregistration.design.pageReplications) {
  throw new Error("Preregistered page count does not match seed schedule");
}
const paths = [
  preregistrationPath,
  ...seeds.map((seed) =>
    `results/browser-key-index-maintenance-v1-${seed}.json`
  ),
];
const sha256 = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const inputs: Array<{ path: string; sha256: string }> = [];
const browserProfiles: unknown[] = [];
for (const path of paths) {
  const text = await Deno.readTextFile(path);
  const record = path === preregistrationPath
    ? preregistration
    : JSON.parse(text);
  if (path !== preregistrationPath) {
    const seed = Number(path.match(/-(\d+)\.json$/)?.[1]);
    if (
      record.schemaVersion !== "key-index-maintenance-browser-v1" ||
      record.status !== "PASS" || record.seed !== seed ||
      record.count !== preregistration.design.count ||
      record.warmupPairs !== preregistration.design.warmupPairsPerOperation ||
      record.measuredPairs !==
        preregistration.design.measuredPairsPerOperation ||
      record.browser.visibilityState !== "visible"
    ) {
      throw new Error(`Invalid accepted page record: ${path}`);
    }
    const profile = {
      userAgent: record.browser.userAgent,
      platform: record.browser.platform,
      hardwareConcurrency: record.browser.hardwareConcurrency,
      devicePixelRatio: record.browser.devicePixelRatio,
      viewport: record.browser.viewport,
      visibilityState: record.browser.visibilityState,
    };
    if (
      !browserProfiles.some((item) =>
        JSON.stringify(item) === JSON.stringify(profile)
      )
    ) {
      browserProfiles.push(profile);
    }
  }
  inputs.push({ path, sha256: await sha256(path) });
}
const manifest = {
  schemaVersion: "key-index-maintenance-v1-manifest",
  status: "PASS",
  generatedAt: new Date().toISOString(),
  preregistrationPath,
  expectedSeeds: seeds,
  acceptedPages: seeds.length,
  replicationUnit: "fresh browser page",
  browserProfiles,
  inputs,
};
const outputPath = "results/browser-key-index-maintenance-v1-manifest.json";
await Deno.writeTextFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outputPath} with ${inputs.length} SHA-256-pinned inputs`);
