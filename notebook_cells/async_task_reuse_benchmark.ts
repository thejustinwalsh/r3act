import { runAsyncTaskReuseBenchmark } from "./src/async_task_reuse_benchmark.ts";

const asyncTaskReuseCostRun = await runAsyncTaskReuseBenchmark();
if (asyncTaskReuseCostRun.status !== "PASS") {
  throw new Error("Async task reuse cost benchmark failed correctness checks");
}
await Deno.writeTextFile(
  "results/async-task-reuse-cost-v1.json",
  JSON.stringify(asyncTaskReuseCostRun, null, 2) + String.fromCharCode(10),
);
console.log(JSON.stringify(
  {
    schemaVersion: asyncTaskReuseCostRun.schemaVersion,
    status: asyncTaskReuseCostRun.status,
    repetitions: asyncTaskReuseCostRun.repetitions,
    cases: asyncTaskReuseCostRun.cases.map((entry) => ({
      totalTasks: entry.totalTasks,
      changedPercent: entry.changedPercent,
      workIterations: entry.workIterations,
      fullRestartMedianMs: entry.fullRestart.medianMs,
      reuseMedianMs: entry.reuseCompleted.medianMs,
      fullStarted: entry.fullRestart.medianStarted,
      reuseStarted: entry.reuseCompleted.medianStarted,
      reused: entry.reuseCompleted.medianReused,
      savedPercent: entry.medianTimeSavedPercent,
      correctnessPass: entry.correctnessPass,
    })),
  },
  null,
  2,
));

const chartWidth = 1040;
const panelHeight = 270;
const gap = 24;
const chartHeight = panelHeight * 2 + gap + 52;
const rows: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-labelledby="reuse-title reuse-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  '<title id="reuse-title">Async task restart cost with completed-task reuse</title>',
  '<desc id="reuse-desc">SVG grouped bars compare full restart and completed-task reuse medians for different task counts and changed-input descendant fractions.</desc>',
  '<rect width="100%" height="100%" fill="white"/>',
  '<text x="24" y="28" font-size="18" font-weight="700">Retry cost: full restart vs completed-task reuse</text>',
  '<text x="24" y="48" font-size="11" fill="#555">Deno scheduler-only · median per retry · 31 paired repetitions · two task-work levels</text>',
];
const colors = { full: "#7b8794", reuse: "#2878b5" };
for (const [panel, iterations] of [0, 2_000].entries()) {
  const selected = asyncTaskReuseCostRun.cases.filter((entry) =>
    entry.workIterations === iterations
  );
  const top = 70 + panel * (panelHeight + gap);
  const plotLeft = 78;
  const plotRight = chartWidth - 28;
  const plotTop = top + 36;
  const plotBottom = top + panelHeight - 45;
  const maxMs = Math.max(...selected.flatMap((entry) => [
        entry.fullRestart.medianMs,
        entry.reuseCompleted.medianMs,
      ]
      )) * 1.15 || 1;
  rows.push(
    `<text x="24" y="${
      top + 15
    }" font-size="13" font-weight="700">Work per task: ${iterations.toLocaleString()} deterministic integer iterations</text>`,
  );
  rows.push(
    `<path d="M${plotLeft} ${plotTop}V${plotBottom}H${plotRight}" fill="none" stroke="#555" stroke-width="1"/>`,
  );
  for (let tick = 0; tick <= 4; tick++) {
    const y = plotBottom - (plotBottom - plotTop) * tick / 4;
    const ms = maxMs * tick / 4;
    rows.push(
      `<path d="M${plotLeft} ${y}H${plotRight}" stroke="#e4e7eb" stroke-width="1"/>`,
    );
    rows.push(
      `<text x="${plotLeft - 8}" y="${
        y + 4
      }" text-anchor="end" font-size="9" fill="#555">${ms.toFixed(3)}</text>`,
    );
  }
  const step = (plotRight - plotLeft) / selected.length;
  selected.forEach((entry, index) => {
    const center = plotLeft + step * (index + 0.5);
    const barWidth = Math.min(24, step * 0.24);
    const fullHeight = (plotBottom - plotTop) * entry.fullRestart.medianMs /
      maxMs;
    const reuseHeight = (plotBottom - plotTop) * entry.reuseCompleted.medianMs /
      maxMs;
    rows.push(
      `<rect x="${center - barWidth - 2}" y="${
        plotBottom - fullHeight
      }" width="${barWidth}" height="${fullHeight}" fill="${colors.full}"/>`,
    );
    rows.push(
      `<rect x="${center + 2}" y="${
        plotBottom - reuseHeight
      }" width="${barWidth}" height="${reuseHeight}" fill="${colors.reuse}"/>`,
    );
    rows.push(
      `<text x="${center}" y="${
        plotBottom + 14
      }" text-anchor="middle" font-size="9" fill="#333">N${entry.totalTasks} · ${entry.changedPercent}%</text>`,
    );
  });
  rows.push(
    `<text x="${plotLeft}" y="${
      plotTop - 6
    }" font-size="9" fill="#555">Median retry time (ms)</text>`,
  );
}
rows.push(
  '<rect x="690" y="42" width="12" height="12" fill="#7b8794"/><text x="707" y="52" font-size="10">Full restart</text><rect x="800" y="42" width="12" height="12" fill="#2878b5"/><text x="817" y="52" font-size="10">Reuse completed</text>',
);
rows.push(
  `<text x="24" y="${
    chartHeight - 10
  }" font-size="10" fill="#555">This microbenchmark excludes plan preparation, VDOM/DOM commit, React, and frame presentation. Values are machine- and runtime-specific.</text>`,
);
rows.push("</svg>");
Deno.jupyter.svg`${rows.join("")}`;
