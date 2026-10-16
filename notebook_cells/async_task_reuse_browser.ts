const browserRetryRun = JSON.parse(
  await Deno.readTextFile(
    "results/async-task-reuse-browser-v1-2026-10-10.json",
  ),
);
const arms = ["react", "fullRestart", "reuseCompleted"] as const;
const browserQuantile = (values: number[], probability: number) => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * probability) - 1)];
};
const browserMedian = (values: number[]) => browserQuantile(values, 0.5);
if (
  browserRetryRun.schemaVersion !== "async-task-reuse-browser-v1" ||
  browserRetryRun.status !== "PASS" ||
  browserRetryRun.samples.length !== 40 ||
  !browserRetryRun.allContractsPass
) {
  throw new Error("Saved async retry browser study failed its contracts");
}
const browserRetrySummary = browserRetryRun.workIterations.map(
  (workIterations: number) => {
    const samples = browserRetryRun.samples.filter((sample: any) =>
      sample.workIterations === workIterations
    );
    if (samples.length !== 20) {
      throw new Error(`Expected 20 paired samples at work=${workIterations}`);
    }
    const values = Object.fromEntries(arms.map((arm) => {
      const times = samples.map((sample: any) => sample.updateToCommitMs[arm]);
      const medianMs = browserMedian(times);
      const p95Ms = browserQuantile(times, 0.95);
      if (
        Math.abs(
            medianMs - browserRetryRun.medianMs[String(workIterations)][arm],
          ) >
          1e-9 ||
        Math.abs(p95Ms - browserRetryRun.p95Ms[String(workIterations)][arm]) >
          1e-9
      ) {
        throw new Error(
          `Saved ${arm} summary drifted at work=${workIterations}`,
        );
      }
      return [arm, { medianMs, p95Ms }];
    })) as Record<string, { medianMs: number; p95Ms: number }>;
    const pairedDifferences = Object.fromEntries(
      (["fullRestart", "reuseCompleted"] as const).map((arm) => {
        const differences = samples.map((sample: any) =>
          sample.updateToCommitMs[arm] - sample.updateToCommitMs.react
        );
        return [arm, {
          medianMs: browserMedian(differences),
          fasterPairs: differences.filter((difference) => difference < 0)
            .length,
          tiedPairs: differences.filter((difference) => difference === 0)
            .length,
          slowerPairs: differences.filter((difference) => difference > 0)
            .length,
        }];
      }),
    );
    return {
      workIterations,
      pairCount: samples.length,
      values,
      pairedDifferences,
    };
  },
);
console.log(JSON.stringify(
  {
    schemaVersion: browserRetryRun.schemaVersion,
    status: browserRetryRun.status,
    collectedAt: browserRetryRun.collectedAt,
    browser: browserRetryRun.browser,
    sampleCount: browserRetryRun.samples.length,
    allContractsPass: browserRetryRun.allContractsPass,
    summary: browserRetrySummary,
    interpretation:
      "This single-session browser run found no update-to-commit speed advantage for graph retry or completed-result reuse. It verifies invalidation, output parity, pending UI retention, keyed identity, and independent catalog reuse; the deterministic catalog loop and one-device timing are narrow evidence.",
  },
  null,
  2,
));

const width = 920;
const height = 410;
const plotLeft = 110;
const plotRight = 890;
const panelTop = [82, 248];
const panelHeight = 126;
const maxMs = 16;
const plotHeight = 98;
const colors = {
  median: "#2866a5",
  p95: "#9db9d4",
};
const chart: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="retry-browser-title retry-browser-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="retry-browser-title">Browser retry update-to-commit latency</title>`,
  `<desc id="retry-browser-desc">Forty paired Chrome samples compare React, graph full restart, and graph reuse of a completed independent task, at zero and 250,000 catalog-loop iterations. Each arm is shown with median and p95 latency.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="22" y="28" font-size="17" font-weight="700">Async input retry: browser update-to-commit latency</text>`,
  `<text x="22" y="48" font-size="10" fill="#555">20 pairs per workload · Chrome 155 MacIntel · medians and p95 · lower is faster</text>`,
  `<rect x="648" y="37" width="11" height="11" fill="${colors.median}"/><text x="665" y="46" font-size="10">Median</text>`,
  `<rect x="720" y="37" width="11" height="11" fill="${colors.p95}"/><text x="737" y="46" font-size="10">p95</text>`,
];
for (const [panelIndex, entry] of browserRetrySummary.entries()) {
  const top = panelTop[panelIndex];
  const baseline = top + plotHeight;
  chart.push(
    `<text x="22" y="${
      top + 8
    }" font-size="12" font-weight="700">Catalog work: ${entry.workIterations.toLocaleString()} loop iterations</text>`,
  );
  for (let tick = 0; tick <= 4; tick++) {
    const ms = maxMs * tick / 4;
    const y = baseline - plotHeight * tick / 4;
    chart.push(
      `<path d="M${plotLeft} ${y}H${plotRight}" stroke="#e5e9ee" stroke-width="1"/>`,
      `<text x="${plotLeft - 9}" y="${
        y + 3
      }" text-anchor="end" font-size="9" fill="#555">${ms}</text>`,
    );
  }
  const groupStep = (plotRight - plotLeft) / arms.length;
  arms.forEach((arm, armIndex) => {
    const center = plotLeft + groupStep * (armIndex + 0.5);
    const values = entry.values[arm];
    const barWidth = 28;
    for (const [metricIndex, metric] of ["medianMs", "p95Ms"].entries()) {
      const value = values[metric];
      const barHeight = plotHeight * value / maxMs;
      const x = center + (metricIndex === 0 ? -barWidth - 2 : 2);
      chart.push(
        `<rect x="${x}" y="${
          baseline - barHeight
        }" width="${barWidth}" height="${barHeight}" rx="2" fill="${
          metricIndex === 0 ? colors.median : colors.p95
        }"/>`,
        `<text x="${x + barWidth / 2}" y="${
          baseline - barHeight - 3
        }" text-anchor="middle" font-size="8" fill="#333">${
          value.toFixed(1)
        }</text>`,
      );
    }
    const label = arm === "react"
      ? "React"
      : arm === "fullRestart"
      ? "Full restart"
      : "Reuse completed";
    chart.push(
      `<text x="${center}" y="${
        baseline + 15
      }" text-anchor="middle" font-size="9" fill="#333">${label}</text>`,
    );
  });
  chart.push(
    `<text x="${plotLeft}" y="${top + 24}" font-size="9" fill="#555">ms</text>`,
  );
}
chart.push(
  `<text x="22" y="${
    height - 9
  }" font-size="9" fill="#555">All behavior contracts passed. One browser/device, synthetic async resources, and a deterministic CPU-loop proxy; excludes layout, paint, and frame presentation.</text>`,
  `</svg>`,
);
Deno.jupyter.svg`${chart.join("")}`;
