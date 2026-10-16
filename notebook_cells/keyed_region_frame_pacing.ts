const frameArms = ["react", "handwritten", "compiled"] as const;
const frameLabels: Record<(typeof frameArms)[number], string> = {
  react: "React + Compiler",
  handwritten: "Whole-tree VDOM",
  compiled: "OXC region DAG",
};
const frameFiles: string[] = [];
for await (const entry of Deno.readDir("results")) {
  if (
    entry.isFile && entry.name.startsWith("keyed-region-frame-pacing-") &&
    entry.name.endsWith(".json")
  ) {
    frameFiles.push(entry.name);
  }
}
frameFiles.sort();
const allFrameRuns = await Promise.all(
  frameFiles.map(async (file) => ({
    ...JSON.parse(await Deno.readTextFile(`results/${file}`)),
    file,
  })),
);
const isolatedFrameRuns = allFrameRuns.filter((run) =>
  run.schemaVersion === "keyed-region-frame-pacing-isolated-v1"
);
const frameRuns = isolatedFrameRuns.filter((run) =>
  Number.isInteger(run.isolationChecksPassed)
);
if (frameRuns.length === 0) {
  throw new Error("No isolated keyed-region frame pacing records found");
}
for (const run of frameRuns) {
  if (
    run.schemaVersion !== "keyed-region-frame-pacing-isolated-v1" ||
    run.status !== "PASS" || run.samples.length !== 24 || !run.allOutputsEqual
  ) {
    throw new Error(`Invalid frame pacing record: ${run.pageLoadId}`);
  }
  if (
    run.isolationChecksPassed !== run.timedPairs * frameArms.length ||
    run.samples.some((sample: any) =>
      frameArms.some((arm) =>
        sample.isolationChecks?.[arm]?.length !== 1 ||
        sample.isolationChecks[arm][0] !== arm
      )
    )
  ) {
    throw new Error(`Frame isolation contract failed: ${run.pageLoadId}`);
  }
  if (
    run.samples.some((sample: any) =>
      !sample.sameOutput || sample.transitionsCompared !== 8
    )
  ) {
    throw new Error(`Frame output contract failed: ${run.pageLoadId}`);
  }
}
const frameQuantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const frameMetrics = frameRuns.map((run, runIndex) => {
  const arms = Object.fromEntries(frameArms.map((arm) => {
    const updateMs = run.samples.flatMap((sample: any) =>
      sample.arms[arm].updateMs
    );
    const rAFIntervalMs = run.samples.flatMap((sample: any) =>
      sample.arms[arm].rAFIntervalMs
    );
    const pairedMedianDelta = run.samples.map((sample: any) =>
      frameQuantile(sample.arms[arm].rAFIntervalMs, 0.5) -
      frameQuantile(sample.arms.react.rAFIntervalMs, 0.5)
    );
    return [arm, {
      updateP50Ms: frameQuantile(updateMs, 0.5),
      updateP95Ms: frameQuantile(updateMs, 0.95),
      rAFP50Ms: frameQuantile(rAFIntervalMs, 0.5),
      rAFP95Ms: frameQuantile(rAFIntervalMs, 0.95),
      pairedMedianDeltaMs: frameQuantile(pairedMedianDelta, 0.5),
      pairedWinCount: run.samples.filter((sample: any) =>
        frameQuantile(sample.arms[arm].rAFIntervalMs, 0.5) <
          frameQuantile(sample.arms.react.rAFIntervalMs, 0.5)
      ).length,
      aboveBaselineCount: rAFIntervalMs.filter((value: number) =>
        value > run.idleFrameBaseline.medianMs * 1.5
      ).length,
      intervalCount: rAFIntervalMs.length,
    }];
  })) as Record<(typeof frameArms)[number], Record<string, number>>;
  return {
    run: runIndex + 1,
    file: run.file,
    pageLoadId: run.pageLoadId,
    visibility: run.browser.visibilityState,
    idleMedianMs: run.idleFrameBaseline.medianMs,
    idleP95Ms: run.idleFrameBaseline.p95Ms,
    idleMaxMs: run.idleFrameBaseline.maxMs,
    arms,
  };
});
console.log(
  JSON.stringify(
    {
      protocol: "isolated; 24 paired samples × 8 transitions × 3 arms",
      isolatedRuns: frameRuns.length,
      preAssertionOrSimultaneousRunsExcluded: allFrameRuns.length -
        frameRuns.length,
      isolatedRunsWithoutStoredChecksExcluded: isolatedFrameRuns.length -
        frameRuns.length,
      frameMetrics,
    },
    null,
    2,
  ),
);

const makeFrameSvg = (metric: "update" | "raf") => {
  const width = 1040;
  const height = 430;
  const left = 72;
  const right = 26;
  const top = 62;
  const bottom = 92;
  const plotHeight = height - top - bottom;
  const groups = frameMetrics.flatMap((run) =>
    frameArms.map((arm) => ({
      run: run.run,
      arm,
      label: `R${run.run} ${frameLabels[arm]}`,
      p50: run.arms[arm][metric === "update" ? "updateP50Ms" : "rAFP50Ms"],
      p95: run.arms[arm][metric === "update" ? "updateP95Ms" : "rAFP95Ms"],
    }))
  );
  const maxValue = Math.max(...groups.map((group) => group.p95));
  const axisMax = Math.ceil(maxValue / (maxValue > 100 ? 100 : 10)) *
    (maxValue > 100 ? 100 : 10);
  const plotWidth = width - left - right;
  const groupWidth = plotWidth / groups.length;
  const y = (value: number) => top + plotHeight - value / axisMax * plotHeight;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="430" viewBox="0 0 ${width} ${height}" role="img" aria-label="${
      metric === "update"
        ? "Synchronous update time"
        : "RequestAnimationFrame callback interval"
    } p50 and p95 by arm and run" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#fff"/>`,
    `<text x="${left}" y="30" font-size="18" font-weight="700" fill="#202124">${
      metric === "update"
        ? "Synchronous update duration"
        : "rAF callback interval"
    } · p50 and p95 (ms)</text>`,
  ];
  for (let tick = 0; tick <= 5; tick++) {
    const value = axisMax * tick / 5;
    const yy = y(value);
    parts.push(
      `<line x1="${left}" y1="${yy}" x2="${
        width - right
      }" y2="${yy}" stroke="#e5e7eb"/>`,
    );
    parts.push(
      `<text x="${left - 10}" y="${
        yy + 4
      }" text-anchor="end" font-size="11" fill="#5f6368">${
        value.toFixed(0)
      }</text>`,
    );
  }
  const barWidth = Math.min(24, groupWidth * 0.22);
  groups.forEach((group, index) => {
    const center = left + groupWidth * (index + 0.5);
    const p50Y = y(group.p50);
    const p95Y = y(group.p95);
    parts.push(
      `<rect x="${
        center - barWidth - 2
      }" y="${p50Y}" width="${barWidth}" height="${
        top + plotHeight - p50Y
      }" fill="#4b82b8"><title>${group.label} p50: ${
        group.p50.toFixed(1)
      } ms</title></rect>`,
    );
    parts.push(
      `<rect x="${center + 2}" y="${p95Y}" width="${barWidth}" height="${
        top + plotHeight - p95Y
      }" fill="#f4a340"><title>${group.label} p95: ${
        group.p95.toFixed(1)
      } ms</title></rect>`,
    );
    parts.push(
      `<text transform="translate(${center + 3},${
        top + plotHeight + 14
      }) rotate(48)" font-size="10" fill="#4b5563">${group.label}</text>`,
    );
  });
  parts.push(
    `<rect x="${width - 210}" y="${
      height - 26
    }" width="12" height="12" fill="#4b82b8"/><text x="${width - 192}" y="${
      height - 16
    }" font-size="11" fill="#374151">p50</text><rect x="${width - 145}" y="${
      height - 26
    }" width="12" height="12" fill="#f4a340"/><text x="${width - 127}" y="${
      height - 16
    }" font-size="11" fill="#374151">p95</text>`,
  );
  parts.push("</svg>");
  return parts.join("");
};
const asFrameGroup = (svg: string, transform = "") =>
  svg.replace(
    /^<svg[^>]*>/,
    `<g${transform ? ` transform="${transform}"` : ""}>`,
  )
    .replace(/<\/svg>$/, "</g>");
const combinedFrameSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="860" viewBox="0 0 1040 860" role="img" aria-label="Synchronous update and requestAnimationFrame interval p50 and p95 by arm and run" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">${
    asFrameGroup(makeFrameSvg("update"))
  }${asFrameGroup(makeFrameSvg("raf"), "translate(0 430)")}</svg>`;
Deno.jupyter.svg`${combinedFrameSvg}`;
