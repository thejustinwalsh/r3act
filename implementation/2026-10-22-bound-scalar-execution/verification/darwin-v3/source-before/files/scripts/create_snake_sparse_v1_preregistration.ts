import { sparseV1Pages } from "../src/browser/snake_sparse_v1_schedule.ts";

const host = "https://snake-sparse-frame-v1.localhost:1355";
const pages = sparseV1Pages().map((page) => ({
  ...page,
  url: `${host}/snake-sparse-frame-benchmark.html?protocol=sparse-v1&collection=production&arm=${page.arm}&size=${page.size}&density=${page.dirtyPercent}&locality=${page.locality}&replication=${page.replication}&trial=${page.trialId}&autoplay=1&archive=1&sequence=${page.sequence}`,
}));
const design = {
  schemaVersion: "snake-sparse-frame-browser-v1-preregistration",
  status: "PREREGISTERED",
  frozenAt: new Date().toISOString(),
  purpose: "Measure a declarative per-frame UI workload when only a fraction of entity props changes, including the cost of constructing dirty-row and bucket worklists.",
  relation: "Browser follow-up to columnar-dispatch-v1; compare mechanism results against React 19.3 + React Compiler using stable per-entity subscriptions.",
  totalPageLoads: pages.length,
  sizes: [512, 4096],
  dirtyPercentages: [1, 10, 50, 100],
  localities: ["clustered", "scattered"],
  arms: ["react", "dense-vdom", "dirty-rows-vdom", "bucket-32-vdom", "bucket-128-vdom", "direct"],
  replicationsPerCell: 3,
  warmupFrames: 30,
  measuredFrames: 60,
  replicationUnit: "isolated visible browser page load; RAF samples are nested within a page",
  buildMode: "Vite production",
  protocols: {
    react: "React 19.3 + React Compiler, per-entity useSyncExternalStore with scalar point snapshots; only dirty rows notify subscribers; flushSync commits each RAF update",
    dense: "OXC compiled binding IDs over retained JSX/VDOM; x/y numeric columns; scans all bound rows and skips unchanged values",
    dirtyRows: "same retained JSX, columns, compiler IDs, and host; reusable dirty row buffer built inside the timed frame callback",
    bucket32: "same retained JSX and columns; construct a deduplicated 32-row bucket list in the timed callback, then scan those rows",
    bucket128: "same retained JSX and columns; construct a deduplicated 128-row bucket list in the timed callback, then scan those rows",
    direct: "cached DOM nodes and dirty-row left/top writes; worklist construction remains timed",
  },
  workload: "At each RAF, update deterministic x/y values for a clustered prefix or a seeded scattered permutation. Non-dirty rows retain their prior values. Each dirty entity gets two style-property updates. VDOM strategies share the same numeric columns and compiled binding IDs. The frame timer includes worklist construction, value computation, dispatch, host writes, and React synchronous commit.",
  primaryMetric: "Per-page median and nearest-rank p95 updateCpuMs; the page is the replication unit. Report each page's RAF interval p95 separately as a frame-cadence proxy.",
  secondaryMetrics: ["mount time", "median paired ratio to React within each replication/workload", "direction counts", "dirty rows and unique buckets per frame"],
  contracts: [
    "each page records exactly 30 warmup and 60 measured RAF updates",
    "all DOM nodes retain identity and count across the run",
    "final DOM left/top values match the deterministic per-entity expected arrays",
    "React's final commit marker covers the last measured update",
    "only visible production-build pages enter the archive",
    "all six arms appear exactly once per size/density/locality/replication cell",
  ],
  exclusions: ["initial bundle parse/evaluation", "layout, paint, GPU work, and physical display presentation", "dynamic node creation/removal"],
  limitations: [
    "The browser workload is particle-like rather than a faithful game simulation; it isolates frequently changing declarative entity props.",
    "Final output parity is checked after the measured run; Deno mechanism replay validates every scheduled update in its own protocol.",
    "React uses a strong per-entity external-store baseline and explicit synchronous commits; results do not compare every possible React state architecture.",
  ],
  pages,
};
await Deno.writeTextFile("results/snake-sparse-frame-v1-preregistration.json", `${JSON.stringify(design, null, 2)}\n`);
console.log(`Preregistered ${pages.length} production browser pages.`);
