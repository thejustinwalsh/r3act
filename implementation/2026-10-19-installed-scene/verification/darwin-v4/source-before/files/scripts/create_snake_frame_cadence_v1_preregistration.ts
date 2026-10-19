const arms = ["react", "runtime-vdom", "columnar-vdom"] as const;
const sizes = [1024, 4096, 8192] as const;
const seed = 83_007_001;
const randomFor = (initial: number) => {
  let state = initial >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
};
const shuffle = <T>(items: T[], random: () => number) => {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
};
const cells = sizes.flatMap((segmentCount) =>
  arms.map((arm) => ({ segmentCount, arm }))
);
const random = randomFor(seed);
const schedule = Array.from({ length: 5 }, (_, block) =>
  shuffle(cells, random).map((cell, index) => ({
    replication: block + 1,
    slot: index + 1,
    ...cell,
    calibrationFrames: 120,
    warmupFrames: 60,
    measuredFrames: 240,
    seed: seed + block + 1,
  }))
).flat();

const preregistration = {
  schemaVersion: "snake-frame-cadence-preregistration-v1",
  createdAt: new Date().toISOString(),
  status: "FROZEN_BEFORE_IMPLEMENTATION",
  question: "At what per-frame scene size, if any, do lower declarative update CPU costs reduce missed requestAnimationFrame callback opportunities relative to the same page's idle RAF baseline?",
  design: {
    arms: {
      react: "React 19.3 + verified React Compiler, one React component and useSyncExternalStore snapshot per segment.",
      "runtime-vdom": "Retained VDOM with shared scalar frame source and mount-resolved bindings.",
      "columnar-vdom": "Retained VDOM with OXC-generated binding IDs and typed-array columns dispatched once per frame.",
    },
    sizes,
    pages: 45,
    replicationUnit: "Fresh visible production page; five randomized within-size blocks per arm.",
    cadenceCalibration: "Measure 120 RAF callback intervals before mounting the scene on each fresh page. Use the median positive interval as that page's baseline period.",
    workload: {
      calibrationFrames: 120,
      warmupFrames: 60,
      measuredFrames: 240,
      updateEveryMeasuredFrame: true,
      topology: "Fixed segment count; deterministic positions updated each frame.",
    },
    primaryMetric: "Missed callback opportunities per 240 measured callbacks: count each interval greater than 1.5 times that page's calibrated baseline period as a late callback and estimate missed slots as max(1, round(interval / baselinePeriod) - 1). Report both late-callback rate and estimated missed-slot count.",
    secondaryMetrics: [
      "Per-frame update CPU median, p95, and samples.",
      "Measured RAF callback interval median, p95, and samples.",
      "Baseline interval median and p95.",
      "Long-task entries overlapping measurement, when supported.",
      "Correctness, stable host identity, output parity, and teardown cleanup.",
    ],
    pairing: "Compare arms within replication and size. Pages are shuffled by the frozen schedule; callbacks are nested samples, not independent replications.",
    exclusions: [
      "No physical presentation timestamps or compositor/GPU completion claim.",
      "No claim about visual smoothness from RAF timing alone.",
      "No dynamic topology, input latency, network, parsing, or cold-start claims.",
      "One Chrome device/profile; cross-device replication remains separate.",
    ],
  },
  thresholds: {
    lateCallback: "RAF interval > 1.5x calibrated page baseline.",
    missedSlots: "max(1, round(interval / calibrated baseline) - 1) for each late interval.",
  },
  hypotheses: {
    correctness: "All scheduled pages pass output, identity, cleanup, visibility, and sample-count contracts.",
    updateCpu: "At 4,096 and 8,192 segments, columnar VDOM has lower paired update CPU median than React in at least 4/5 replications.",
    cadenceAdvantage: "At 8,192 segments, columnar VDOM has fewer estimated missed callback slots than React in at least 4/5 paired replications.",
  },
  decisionRules: {
    pass: "All correctness checks pass, the preregistered updateCpu and cadenceAdvantage hypotheses pass.",
    noHeadroom: "If both React and columnar VDOM have zero late callbacks in at least 4/5 pages at 8,192, report the cadence test as floor-limited and inconclusive, regardless of CPU results.",
    fail: "Report any correctness failure or failed latency/cadence hypothesis without excluding records or changing thresholds after collection.",
    interpretation: "This estimates missed RAF callback opportunities against an idle baseline on one device. It does not measure compositor presentation or prove visible smoothness.",
  },
  environment: {
    browser: "Production Chrome; record exact user agent, DPR, viewport, visibility, hardware concurrency, and build mode.",
    sourceLock: "Freeze harness sources, OXC plan, React Compiler evidence, package/Deno lockfiles, and production build assets before collecting the first scheduled page.",
  },
  schedule,
};
await Deno.mkdir("results/snake-frame-cadence-v1", { recursive: true });
await Deno.writeTextFile(
  "results/snake-frame-cadence-v1/preregistration.json",
  `${JSON.stringify(preregistration, null, 2)}\n`,
);
console.log(`Preregistered ${schedule.length} fresh production pages.`);
