import {
  snakeFrameV5ArmOrders,
  snakeFrameV5Arms,
  snakeFrameV5Counts,
  snakeFrameV5Pages,
  snakeFrameV5SizeOrders,
} from "../src/browser/snake_frame_v5_schedule.ts";

const counts = [...snakeFrameV5Counts];
const arms = [...snakeFrameV5Arms];
const armOrders = snakeFrameV5ArmOrders;
const sizeOrders = snakeFrameV5SizeOrders;
const frozenAt = new Date().toISOString();
const baseUrl =
  "https://snake-frame-v5-research.localhost:1355/snake-frame-benchmark.html";
const pages = snakeFrameV5Pages().map((page) => {
  const query = new URLSearchParams({
    protocol: "v5",
    arm: page.arm,
    segments: String(page.segmentCount),
    frames: "300",
    trial: page.trialId,
    autoplay: "1",
    sequence: String(page.sequence - 1),
  });
  return { ...page, url: `${baseUrl}?${query}` };
});
const schedule = {
  schemaVersion: "snake-frame-browser-v5-preregistration-v1",
  status: "PREREGISTERED",
  frozenAt,
  preDataAmendments: [{
    id: "V5-AMD-1",
    amendedAt: frozenAt,
    change: "Collection URLs now use snake-frame-v5-research.localhost.",
    reason:
      "The original Portless route is owned by an already-running process with archive middleware that rejects V5 records; use an isolated named route without replacing that process.",
    designEffect: "Hostname only; arms, order, workload, and analysis are unchanged.",
    dataCollectedBeforeAmendment: false,
  }],
  protocol: {
    question:
      "Does routing an OXC-emitted Snake binding graph through the retained VDOM preserve the per-frame update advantage after VDOM mount and update costs are measured?",
    arms,
    segmentCounts: counts,
    pageLoadsPerCell: 5,
    totalPageLoads: pages.length,
    warmupFrames: 90,
    measuredFramesPerPage: 300,
    replicationUnit: "isolated visible browser page load",
    orderStrategy:
      "five-cycle Latin rotation for arm position; rotated size order by replication",
    armOrders,
    sizeOrders,
    styles:
      "all arms write segment left/top; food transform is written once per RAF",
    commonWork:
      "segment coordinates are derived once per entity inside each measured RAF callback before arm dispatch",
    armsDescription: {
      react:
        "React 19.3.0 + React Compiler; per-segment useSyncExternalStore snapshots",
      runtime:
        "retained VDOM; runtime-discovered scalar-to-left/top bindings through one progress source",
      "generated-vdom":
        "retained VDOM; OXC-emitted CSR binding IDs and compiled source slots, updated as one batch",
      generated:
        "OXC-emitted repeated-host plan and generated static left/top writers",
      direct: "cached host elements with direct left/top style writes",
    },
    primaryMetric:
      "update-to-commit milliseconds; React layout-effect timestamp, synchronous return for other arms",
    secondaryMetrics: [
      "per-page mount-to-first-commit milliseconds",
      "update-path CPU milliseconds",
      "per-page RAF interval p95 milliseconds",
      "median per-page setup-plus-N-updates break-even estimate",
      "Chrome heap used before mount, after mount, and after measured updates when available",
    ],
    exclusions: [
      "compiler execution",
      "JavaScript bundle parse and evaluation",
      "layout, paint, GPU, and physical presentation",
      "allocation byte counts and precise per-component retained heap attribution",
    ],
    analysis:
      "page loads are independent replication units; RAF callbacks are nested samples; report median of page medians and median of page p95 values; publish all passing raw pages; do not exclude outliers post hoc",
    environmentTarget:
      "Chrome 154, visible 1280x720 DPR 2, same MacIntel profile/device as V4; record actual environment in every page",
  },
  pages,
};
if (pages.length !== 100) throw new Error("V5 schedule must contain 100 pages");
for (const count of counts) {
  for (const arm of arms) {
    if (
      pages.filter((page) => page.segmentCount === count && page.arm === arm)
        .length !== 5
    ) {
      throw new Error(`V5 matrix is unbalanced at ${count}/${arm}`);
    }
  }
}
await Deno.writeTextFile(
  "results/browser-snake-frame-v5-preregistration.json",
  `${JSON.stringify(schedule, null, 2)}\n`,
);
console.log(
  `Wrote frozen V5 schedule: ${pages.length} pages, ${
    pages.length * 300
  } measured RAF callbacks.`,
);
