const base = "results/snake-frame-cadence-v1";
const prereg = JSON.parse(
  await Deno.readTextFile(`${base}/preregistration.json`),
);
const lock = JSON.parse(await Deno.readTextFile(`${base}/source-lock.json`));
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
if (
  prereg.status !== "FROZEN_BEFORE_IMPLEMENTATION" ||
  prereg.schedule.length !== 45 ||
  lock.status !== "FROZEN_BEFORE_COLLECTION" ||
  lock.preregistration !== `${base}/preregistration.json`
) throw new Error("Cadence preregistration/source lock metadata failed");
for (const entry of [...lock.sourceFiles, ...lock.productionAssets]) {
  const bytes = await Deno.readFile(entry.path);
  if (bytes.byteLength !== entry.bytes || await hash(bytes) !== entry.sha256) {
    throw new Error(`Cadence source lock mismatch: ${entry.path}`);
  }
}
const scheduleModule = await Deno.readTextFile(
  "src/browser/snake_frame_cadence_v1_schedule.ts",
);
if (!scheduleModule.includes(JSON.stringify(prereg.schedule, null, 2))) {
  throw new Error("Browser schedule differs from frozen preregistration");
}
const mainBundle = lock.productionAssets.find((entry: any) =>
  entry.path.includes("snakeFrameCadenceV1Benchmark") && entry.path.endsWith(".js")
);
if (!mainBundle) throw new Error("Cadence production JS bundle missing");
const bundle = await Deno.readTextFile(mainBundle.path);
if (!bundle.includes("memo_cache_sentinel")) {
  throw new Error("React Compiler marker missing from production study bundle");
}
console.log(JSON.stringify({
  status: "PASS",
  preregisteredPages: prereg.schedule.length,
  frozenSourceInputs: lock.sourceFiles.length,
  frozenProductionAssets: lock.productionAssets.length,
  reactCompilerMarker: true,
}, null, 2));
