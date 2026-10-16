const urgentTransitionRun = JSON.parse(
  await Deno.readTextFile(
    "results/urgent-multiroot-transition-browser-v2-2026-10-09.json",
  ),
);
const urgentQuantile = (values: number[], p: number) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
if (
  urgentTransitionRun.schemaVersion !==
    "urgent-multiroot-transition-browser-v2" ||
  urgentTransitionRun.status !== "PASS" ||
  urgentTransitionRun.reactCompilerEnabled !== true ||
  urgentTransitionRun.samples.length !== 20 ||
  !urgentTransitionRun.allContractsPass
) {
  throw new Error(
    "Urgent multi-root transition study failed its saved contract",
  );
}
for (const sample of urgentTransitionRun.samples) {
  if (
    sample.timerDelayMs.profile !== 74 + (sample.pair % 3) * 2 ||
    sample.timerDelayMs.feed !== 112 + (sample.pair % 4) * 2 ||
    sample.runtimeTaskOrder.join(",") !==
      "profile,feed,header,page-model" ||
    !Object.values(sample.contracts).every(Boolean)
  ) {
    throw new Error(`Saved urgent transition pair ${sample.pair} drifted`);
  }
}
for (const arm of ["react", "runtime"] as const) {
  const urgentTimes = urgentTransitionRun.samples.map((sample: any) =>
    sample.urgentLatencyMs[arm]
  );
  const transitionTimes = urgentTransitionRun.samples.map((sample: any) =>
    sample.transitionLatencyMs[arm]
  );
  if (
    urgentQuantile(urgentTimes, 0.5) !==
      urgentTransitionRun.medianUrgentLatencyMs[arm] ||
    urgentQuantile(urgentTimes, 0.95) !==
      urgentTransitionRun.p95UrgentLatencyMs[arm] ||
    urgentQuantile(transitionTimes, 0.5) !==
      urgentTransitionRun.medianTransitionLatencyMs[arm] ||
    urgentQuantile(transitionTimes, 0.95) !==
      urgentTransitionRun.p95TransitionLatencyMs[arm]
  ) {
    throw new Error(`Saved ${arm} summary does not match its raw samples`);
  }
}
console.log(JSON.stringify(
  {
    schemaVersion: urgentTransitionRun.schemaVersion,
    status: urgentTransitionRun.status,
    pairCount: urgentTransitionRun.pairCount,
    compilerOrder: urgentTransitionRun.compilerOrder,
    medianUrgentLatencyMs: urgentTransitionRun.medianUrgentLatencyMs,
    p95UrgentLatencyMs: urgentTransitionRun.p95UrgentLatencyMs,
    medianTransitionLatencyMs: urgentTransitionRun.medianTransitionLatencyMs,
    p95TransitionLatencyMs: urgentTransitionRun.p95TransitionLatencyMs,
    allContractsPass: urgentTransitionRun.allContractsPass,
    interpretation:
      "Urgent updates committed before async completion while transition roots kept their old UI. This verifies behavior for an independent urgent root, not rebasing an urgent write into the pending roots. Timing is descriptive and not a speed claim.",
  },
  null,
  2,
));

const urgentSvg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="330" viewBox="0 0 820 330" role="img" aria-labelledby="urgent-title urgent-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="urgent-title">Urgent input and transition completion medians</title>`,
  `<desc id="urgent-desc">Twenty paired browser transitions compare urgent input event completion and async transition completion for React and the compiled graph runtime. Both passed visible-state, multi-root commit, identity, and parity contracts.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="24" y="28" font-size="16" font-weight="700">Urgent input while a two-root transition is pending</text>`,
  `<text x="24" y="48" font-size="10" fill="#555">20 paired samples · Chrome 155 MacIntel · synthetic timers · medians only</text>`,
  `<text x="24" y="92" font-size="12" font-weight="700">Urgent input (ms)</text>`,
  `<rect x="190" y="72" width="${
    Math.max(3, urgentTransitionRun.medianUrgentLatencyMs.react * 18)
  }" height="20" rx="4" fill="#4f76c8"/><text x="${
    200 + urgentTransitionRun.medianUrgentLatencyMs.react * 18
  }" y="87" font-size="11">React ${
    urgentTransitionRun.medianUrgentLatencyMs.react.toFixed(1)
  }</text>`,
  `<rect x="190" y="98" width="${
    Math.max(3, urgentTransitionRun.medianUrgentLatencyMs.runtime * 18)
  }" height="20" rx="4" fill="#57a887"/><text x="${
    200 + urgentTransitionRun.medianUrgentLatencyMs.runtime * 18
  }" y="113" font-size="11">Graph ${
    urgentTransitionRun.medianUrgentLatencyMs.runtime.toFixed(1)
  }</text>`,
  `<text x="24" y="169" font-size="12" font-weight="700">Async transition (ms)</text>`,
  `<rect x="190" y="149" width="${urgentTransitionRun.medianTransitionLatencyMs.react}" height="20" rx="4" fill="#4f76c8"/><text x="${
    200 + urgentTransitionRun.medianTransitionLatencyMs.react
  }" y="164" font-size="11">React ${
    urgentTransitionRun.medianTransitionLatencyMs.react.toFixed(1)
  }</text>`,
  `<rect x="190" y="175" width="${urgentTransitionRun.medianTransitionLatencyMs.runtime}" height="20" rx="4" fill="#57a887"/><text x="${
    200 + urgentTransitionRun.medianTransitionLatencyMs.runtime
  }" y="190" font-size="11">Graph ${
    urgentTransitionRun.medianTransitionLatencyMs.runtime.toFixed(1)
  }</text>`,
  `<text x="24" y="238" font-size="11">All pairs: pending UI retained · urgent value visible before data · both roots committed · keys retained · output parity</text>`,
  `<text x="24" y="260" font-size="10" fill="#555">One browser/device run does not establish a performance advantage. Graph urgent state was isolated from its async root batch.</text>`,
  `</svg>`,
];
Deno.jupyter.svg`${urgentSvg.join("")}`;
