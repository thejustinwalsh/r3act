import { mixedRealtimePages } from "../src/browser/mixed_realtime_schedule.ts";

const files = [
  "mixed-realtime-study.md",
  "mixed-realtime-benchmark.html",
  "src/browser/mixed_realtime_benchmark.tsx",
  "src/browser/mixed_realtime_benchmark.css",
  "src/browser/mixed_realtime_schedule.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "scripts/freeze_mixed_realtime_v1.ts",
];
const pages = mixedRealtimePages();
if (pages.length !== 30) throw new Error(`Expected 30 pages, found ${pages.length}`);
for (const size of [128, 512, 1024]) for (const arm of ["react", "runtime"]) {
  if (pages.filter((page) => page.entityCount === size && page.arm === arm).length !== 5) {
    throw new Error(`Schedule is unbalanced for ${size}/${arm}`);
  }
}
const lockedFiles = [];
for (const path of files) {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  lockedFiles.push({ path, bytes: bytes.byteLength, sha256 });
}
const preregistration = {
  schemaVersion: "mixed-realtime-preregistration-v1",
  status: "PREREGISTERED",
  protocol: "mixed-realtime-v1",
  frozenAt: new Date().toISOString(),
  browser: "Chrome 155, visible foreground tab, single MacIntel browser profile",
  buildMode: "production",
  replicationUnit: "page load",
  pageLoads: pages.length,
  warmupFrames: 60,
  measuredFrames: 240,
  topologyEveryMeasuredFrames: 30,
  structuralEventsPerPage: 8,
  structuralOperationsPerEvent: { remove: 8, insert: 8, rotateRetainedKeys: true },
  sizes: [128, 512, 1024],
  arms: ["react", "runtime"],
  decisionRule: {
    correctnessRequired: ["output parity", "stable retained DOM identity", "complete commit coverage"],
    geometricMeanPairedMedianRatioAtMost: 0.8,
    sizesMustMeetMedianThreshold: 2,
    p95RatioMaximumPerSize: 1.1,
    rafIntervalIsNotPresentationEvidence: true,
  },
  schedule: pages,
  sourceLock: lockedFiles,
};
await Deno.writeTextFile(
  "results/mixed-realtime-v1-preregistration.json",
  JSON.stringify(preregistration, null, 2) + "\n",
);
console.log(`Frozen ${pages.length} page loads across ${lockedFiles.length} source files.`);
