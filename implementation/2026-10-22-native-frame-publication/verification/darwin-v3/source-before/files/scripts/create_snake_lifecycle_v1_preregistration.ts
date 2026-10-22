const conditions = [
  { arm: "react", segmentCount: 512 },
  { arm: "runtime-vdom", segmentCount: 512 },
  { arm: "columnar-vdom", segmentCount: 512 },
  { arm: "react", segmentCount: 1024 },
  { arm: "runtime-vdom", segmentCount: 1024 },
  { arm: "columnar-vdom", segmentCount: 1024 },
] as const;
const randomFor = (seed: number) => {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};
const shuffle = <T>(items: T[], random: () => number) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};
const schedule = [];
const random = randomFor(83_006_001);
for (let replication = 1; replication <= 5; replication++) {
  for (const [slot, condition] of shuffle(conditions, random).entries()) {
    schedule.push({
      replication,
      slot: slot + 1,
      arm: condition.arm,
      segmentCount: condition.segmentCount,
      warmupFrames: 90,
      measuredFrames: 300,
      seed: 83_006_000 + replication,
    });
  }
}
const preregistration = {
  schemaVersion: "snake-frame-lifecycle-preregistration-v1",
  createdAt: "2026-10-11",
  status: "AMENDED_BEFORE_COLLECTION",
  amendments: [
    {
      date: "2026-10-11",
      reason:
        "Production Chrome serializes inline fractional CSS positions to three decimal places; an exact floating-point equality check rejected correct output by under 0.001 CSS pixels during the excluded smoke run.",
      change:
        "Final x/y output parity is accepted within 0.01 CSS pixels. No latency threshold, page count, arm, or workload changed.",
      smokeDataExcluded: true,
    },
  ],
  question:
    "Do retained-VDOM per-frame paths keep their measured update advantage after including mount and teardown JavaScript cost for one fixed-topology animated scene?",
  relationship: {
    priorStudy: "Snake V6 production study",
    followUpReason:
      "V6 measured mount and update cost, but excluded teardown, page load, and compilation from its post-hoc mount-amortization estimate.",
    scope:
      "This study adds teardown and an observed 300-frame lifecycle workload. It does not estimate network/parse/compile cost or dynamic topology.",
  },
  design: {
    arms: {
      react:
        "React 19.3 + build-verified React Compiler; ReactBoard with per-segment useSyncExternalStore snapshots over the same x/y columns.",
      "runtime-vdom":
        "Retained VDOM with a shared frame source, reading the precomputed Float64Array x/y columns through mount-resolved bindings.",
      "columnar-vdom":
        "Retained VDOM with OXC-generated binding IDs resolved to contiguous Float64Array x/y columns at mount; one column batch per frame.",
    },
    sizes: [512, 1024],
    replicationUnit:
      "One fresh visible production browser page; five paired page blocks per size.",
    pages: 30,
    scheduleSeed: 83_006_001,
    warmupFrames: 90,
    measuredFrames: 300,
    lifecycle: [
      "allocate model, sources/store, bindings, and host tree",
      "mount the scene",
      "run 90 warmup RAF frames",
      "run and record 300 measured RAF updates",
      "verify final output and stable host identity",
      "dispose/unmount, clear harness references, and assert empty host container and zero subscriber registrations",
    ],
    primaryMetric:
      "measured JavaScript cycle cost = mountMs + sum(updateCpuMs for the 300 measured frames) + teardownMs; RAF wait time is excluded.",
    secondaryMetrics: [
      "mountMs",
      "teardownMs",
      "per-frame updateCpuMs median and p95",
      "update-to-commit median and p95",
      "full RAF elapsed time including warmup and display waits",
      "heap usage before mount, after mount, after updates, and after teardown when browser memory API is available",
    ],
    pairing:
      "Within each replication block, compare React and each VDOM arm at matching segment counts. Pages are randomized from the saved schedule; frames are nested samples.",
    exclusions: [
      "navigation, network, JavaScript parse/evaluation, and OXC compilation cost from the primary cycle metric",
      "layout, paint, GPU work, and physical presentation",
      "dynamic segment growth/removal during the measured run",
      "cross-device generalization",
    ],
  },
  correctness: [
    "all 300 measured RAF updates complete",
    "final segment and food positions match the deterministic model within 0.01 CSS pixels",
    "host count and node identities remain stable during the update window",
    "React external-store listener registrations are zero after root unmount",
    "VDOM binding registrations and retained host nodes are zero after dispose",
    "all three arms have an empty host container after teardown",
    "page is visible and uses the verified production build",
  ],
  hypotheses: {
    lifecycleAdvantage:
      "Columnar VDOM primary cycle cost is <=0.90x React on at least four of five paired page blocks at both 512 and 1,024 segments.",
    updateCostPreserved:
      "Columnar VDOM updateCpuMs median is no greater than React on at least four of five pages at both sizes.",
    correctness:
      "Every accepted page passes all lifecycle and output contracts.",
  },
  decisionRules: {
    pass:
      "All correctness pages pass, lifecycleAdvantage passes at both sizes, and updateCostPreserved passes at both sizes.",
    fail:
      "Any correctness failure or any missed latency threshold is reported; do not exclude pages or revise thresholds after collection.",
    interpretation:
      "A pass establishes only a same-device, fixed-topology JavaScript-cycle-cost advantage for these arms and sizes. It does not establish a full cold-start win, smoothness, dynamic-topology performance, or a general React speedup.",
  },
  environment: {
    targetBrowser:
      "Chrome production build; record exact UA, browser version, platform, hardware concurrency, DPR, viewport, and visibility on every page.",
    device:
      "Reuse the V6 device/profile for this lifecycle follow-up; an independent physical device remains a separate confirmatory gate.",
    sourceLock:
      "Freeze the dedicated harness, Vite config, OXC-generated plan, package/Deno lockfiles, and built assets before collecting the first page.",
  },
  schedule,
};
await Deno.mkdir("results/snake-frame-lifecycle-v1", { recursive: true });
await Deno.writeTextFile(
  "results/snake-frame-lifecycle-v1/preregistration.json",
  JSON.stringify(preregistration, null, 2) + "\n",
);
console.log(JSON.stringify(
  {
    status: preregistration.status,
    pages: schedule.length,
    replicationsPerCell: 5,
    sizes: preregistration.design.sizes,
    arms: Object.keys(preregistration.design.arms),
  },
  null,
  2,
));
