const arms = ["react", "runtime-vdom", "columnar-vdom"] as const;
const sizes = [1024, 8192] as const;
const seed = 83_008_001;
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
  schemaVersion: "snake-frame-phase-preregistration-v1",
  createdAt: new Date().toISOString(),
  status: "FROZEN_BEFORE_IMPLEMENTATION",
  question: "For a large repeated-host frame workload, does Long Animation Frames attribution show that the long-frame time is dominated by script execution or by the rendering phase, and does that attribution differ between React Compiler and compiled columnar VDOM?",
  design: {
    arms: {
      react: "React 19.3 + verified React Compiler, one React component and useSyncExternalStore snapshot per segment.",
      "runtime-vdom": "Retained VDOM with shared scalar frame source and mount-resolved bindings.",
      "columnar-vdom": "Retained VDOM with OXC-generated binding IDs and typed-array columns dispatched once per frame.",
    },
    sizes,
    pages: schedule.length,
    replicationUnit: "Fresh visible production page; five randomized within-size blocks per arm.",
    calibration: "Measure 120 idle RAF intervals before mounting; report median positive interval per page.",
    workload: {
      warmupFrames: 60,
      measuredFrames: 240,
      updateEveryMeasuredFrame: true,
      topology: "Fixed segment count; deterministic positions updated each frame.",
    },
    instrumentation: [
      "Feature-detect PerformanceObserver support for long-animation-frame before any run; unsupported pages fail rather than silently fall back.",
      "Collect entries overlapping the measured 240-update window using takeRecords before observer disconnect.",
      "For each entry, preserve duration, blockingDuration, renderStart, styleAndLayoutStart, and all available script attribution fields including duration, sourceURL, sourceFunctionName, and forcedStyleAndLayoutDuration.",
      "Retain RAF intervals and per-update JavaScript CPU from the cadence harness for alignment.",
    ],
    primaryMetric: "At 8,192 segments, page-level median share of Long Animation Frame entry duration attributed to script timing versus time from styleAndLayoutStart to entry endTime, reported only for observed LoAF entries; paired page blocks are the replication unit.",
    secondaryMetrics: [
      "LoAF count, total duration, duration median/p95, and blockingDuration per page.",
      "Script duration and forcedStyleAndLayoutDuration by source URL/function when present.",
      "Measured update CPU and RAF interval median/p95 from the matching page.",
      "At 1,024 segments, count of LoAF entries as a negative-load control.",
      "Output parity, stable host identity, visibility, and teardown cleanup.",
    ],
    interpretationLimits: [
      "LoAF entries include only animation frames longer than 50 ms; they cannot explain sub-50 ms stalls.",
      "The API's render and style/layout timestamps are coarse main-thread attribution, not compositor, paint completion, GPU, or display-presentation timestamps.",
      "Script attribution is diagnostic and must not be treated as an independent sample; pages are the replication unit.",
      "One Chrome device/profile; no cross-device or perceived-smoothness claim.",
    ],
  },
  decisionRules: {
    correctness: "All 30 pages pass output, identity, cleanup, visibility, sample-count, and API-support checks.",
    report: "Report paired page-level distributions and raw LoAF records. Do not infer causality from correlation or call an unobserved LoAF interval zero render cost.",
    fail: "Any API-support or correctness failure invalidates that scheduled page; preserve it and report the incomplete block without replacement unless a separate amendment is frozen before collection resumes.",
  },
  environment: {
    browser: "Production Chrome; record exact user agent, DPR, viewport, visibility, hardware concurrency, and build mode.",
    sourceLock: "Freeze study source, generated OXC plan, React Compiler evidence, package/Deno lockfiles, and production build assets before collection.",
  },
  schedule,
};
await Deno.mkdir("results/snake-frame-phase-v1", { recursive: true });
await Deno.writeTextFile(
  "results/snake-frame-phase-v1/preregistration.json",
  `${JSON.stringify(preregistration, null, 2)}\n`,
);
console.log(`Preregistered ${schedule.length} production pages.`);
