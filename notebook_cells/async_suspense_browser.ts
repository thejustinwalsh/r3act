const suspenseBrowserRun = JSON.parse(
  await Deno.readTextFile("results/async-suspense-browser-v1-2026-10-09.json"),
);
if (
  suspenseBrowserRun.schemaVersion !== "async-suspense-browser-v1" ||
  suspenseBrowserRun.status !== "PASS" ||
  suspenseBrowserRun.samples.length !== 20 ||
  !suspenseBrowserRun.allPendingUiRetained ||
  !suspenseBrowserRun.allKeysRetained ||
  !suspenseBrowserRun.allOutputsEqual
) {
  throw new Error("Async Suspense browser run failed its saved contracts");
}
const suspenseQuantile = (values: number[], p: number) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
for (const arm of ["react", "runtime"] as const) {
  const times = suspenseBrowserRun.samples.map((sample: any) =>
    sample.milliseconds[arm]
  );
  if (
    suspenseQuantile(times, 0.5) !== suspenseBrowserRun.medianMs[arm] ||
    suspenseQuantile(times, 0.95) !== suspenseBrowserRun.p95Ms[arm]
  ) {
    throw new Error(`Saved ${arm} summary does not match its raw samples`);
  }
}
for (const sample of suspenseBrowserRun.samples) {
  if (
    sample.timerDelayMs.profile !== 54 + (sample.pair % 3) * 2 ||
    sample.timerDelayMs.feed !== 82 + (sample.pair % 4) * 2
  ) {
    throw new Error(`Saved timer schedule drifted in pair ${sample.pair}`);
  }
}
const suspenseMedianDelta = suspenseBrowserRun.medianMs.react -
  suspenseBrowserRun.medianMs.runtime;
console.log(JSON.stringify(
  {
    schemaVersion: suspenseBrowserRun.schemaVersion,
    status: suspenseBrowserRun.status,
    sampleCount: suspenseBrowserRun.samples.length,
    compilerOrder: suspenseBrowserRun.compilerOrder,
    medianMs: suspenseBrowserRun.medianMs,
    p95Ms: suspenseBrowserRun.p95Ms,
    medianDeltaMsReactMinusRuntime: suspenseMedianDelta,
    contracts: {
      oldUiRetainedDuringPending: suspenseBrowserRun.allPendingUiRetained,
      keyedNodesRetained: suspenseBrowserRun.allKeysRetained,
      equivalentFinalOutput: suspenseBrowserRun.allOutputsEqual,
    },
    interpretation:
      "No meaningful speed conclusion: async timer waits dominate task-to-commit latency and this is one browser/device run.",
  },
  null,
  2,
));

const suspenseSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="300" viewBox="0 0 760 300" role="img" aria-labelledby="suspense-title suspense-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="suspense-title">Async task-to-commit latency: React Suspense and compiled graph runtime</title>`,
  `<desc id="suspense-desc">Median and p95 milliseconds for 20 paired browser transitions. Values are close because deterministic asynchronous timer waits dominate.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="24" y="28" font-size="16" font-weight="700">20 paired transitions · task-to-commit latency</text>`,
  `<text x="24" y="48" font-size="10" fill="#555">One Chrome 155 MacIntel session · synthetic profile/feed delays · not frame time</text>`,
  `<line x1="90" y1="230" x2="690" y2="230" stroke="#64748b"/>`,
  `<text x="26" y="122" font-size="11">Median</text><text x="26" y="188" font-size="11">p95</text>`,
  `<rect x="170" y="96" width="356" height="30" rx="4" fill="#4f76c8"/><text x="534" y="116" font-size="11">React ${
    suspenseBrowserRun.medianMs.react.toFixed(1)
  } ms</text>`,
  `<rect x="170" y="130" width="354" height="22" rx="4" fill="#57a887"/><text x="534" y="146" font-size="11">Graph ${
    suspenseBrowserRun.medianMs.runtime.toFixed(1)
  } ms</text>`,
  `<rect x="170" y="164" width="542" height="24" rx="4" fill="#4f76c8"/><text x="170" y="207" font-size="11">React ${
    suspenseBrowserRun.p95Ms.react.toFixed(1)
  } ms</text>`,
  `<rect x="170" y="194" width="538" height="24" rx="4" fill="#57a887"/><text x="170" y="245" font-size="11">Graph ${
    suspenseBrowserRun.p95Ms.runtime.toFixed(1)
  } ms</text>`,
  `<text x="24" y="276" font-size="10" fill="#555">Both paths retained old content and keyed nodes while pending and produced equivalent final output.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${suspenseSvg.join("")}`;
