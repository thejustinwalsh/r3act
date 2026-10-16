const attributionFiles: string[] = [];
for await (const entry of Deno.readDir("results")) {
  if (
    entry.isFile &&
    entry.name.startsWith("keyed-region-frame-pacing-attribution-v1-") &&
    entry.name.endsWith(".json")
  ) attributionFiles.push(entry.name);
}
attributionFiles.sort();
const attributionRuns = await Promise.all(
  attributionFiles.map(async (file) => ({
    ...JSON.parse(await Deno.readTextFile(`results/${file}`)),
    file,
  })),
);
if (attributionRuns.length === 0) {
  throw new Error("No Long Animation Frame attribution records found");
}
const attributionArms = ["react", "handwritten", "compiled"] as const;
const attributionLabels: Record<(typeof attributionArms)[number], string> = {
  react: "React + Compiler",
  handwritten: "Whole-tree VDOM",
  compiled: "OXC region DAG",
};
const attributionQuantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length
    ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)]
    : null;
};
const attributionMetrics = attributionRuns.map((run, runIndex) => {
  if (
    run.schemaVersion !== "keyed-region-frame-pacing-attribution-v1" ||
    run.status !== "PASS" || run.timedPairs !== 24 ||
    run.transitionsPerArmPerPair !== 8 || !run.allOutputsEqual ||
    !run.longAnimationFrameCapture?.supported ||
    !Array.isArray(run.longAnimationFrameCapture.matchedFrames)
  ) throw new Error(`Invalid LoAF attribution record: ${run.pageLoadId}`);
  if (
    run.isolationChecksPassed !== run.timedPairs * attributionArms.length ||
    run.samples.some((sample: any) =>
      !sample.sameOutput || sample.transitionsCompared !== 8 ||
      attributionArms.some((arm) =>
        sample.isolationChecks?.[arm]?.length !== 1 ||
        sample.isolationChecks[arm][0] !== arm
      )
    )
  ) throw new Error(`Parity/isolation contract failed: ${run.pageLoadId}`);

  const frames = run.longAnimationFrameCapture.matchedFrames;
  const arms = Object.fromEntries(attributionArms.map((arm) => {
    const matchedFrames = frames.filter((frame: any) =>
      frame.matches.some((match: any) => match.arm === arm)
    );
    const windowsWithLoAF = new Set(
      matchedFrames.flatMap((frame: any) =>
        frame.matches.filter((match: any) => match.arm === arm).map((
          match: any,
        ) => `${match.pair}:${match.transition}`)
      ),
    ).size;
    const scriptTotals = new Map<string, {
      key: string;
      sourceURL: string;
      sourceFunctionName: string;
      invoker: string;
      duration: number;
    }>();
    for (const frame of matchedFrames) {
      for (const script of frame.scripts ?? []) {
        const key = `${script.sourceURL}#${
          script.sourceFunctionName || script.invoker
        }`;
        const prior = scriptTotals.get(key);
        scriptTotals.set(key, {
          key,
          sourceURL: script.sourceURL,
          sourceFunctionName: script.sourceFunctionName,
          invoker: script.invoker,
          duration: (prior?.duration ?? 0) + script.duration,
        });
      }
    }
    return [arm, {
      measuredWindows: run.timedPairs * run.transitionsPerArmPerPair,
      windowsWithLoAF,
      uniqueFrames: matchedFrames.length,
      durationMedianMs: attributionQuantile(
        matchedFrames.map((frame: any) => frame.duration),
        0.5,
      ),
      durationP95Ms: attributionQuantile(
        matchedFrames.map((frame: any) => frame.duration),
        0.95,
      ),
      durationMaxMs: matchedFrames.length
        ? Math.max(...matchedFrames.map((frame: any) => frame.duration))
        : null,
      blockingDurationP95Ms: attributionQuantile(
        matchedFrames.map((frame: any) => frame.blockingDuration),
        0.95,
      ),
      topScripts: [...scriptTotals.values()].sort((a, b) =>
        b.duration - a.duration
      )
        .slice(0, 8),
    }];
  })) as Record<(typeof attributionArms)[number], Record<string, any>>;
  return {
    run: runIndex + 1,
    file: run.file,
    pageLoadId: run.pageLoadId,
    observerSupported: run.longAnimationFrameCapture.supported,
    observerEntries: run.longAnimationFrameCapture.matchedFrames.length,
    idleMedianMs: run.idleFrameBaseline.medianMs,
    arms,
  };
});
console.log(
  JSON.stringify(
    {
      protocol: "isolated; 24 pairs × 8 transitions × 3 arms; LoAF observer",
      attributionMetrics,
    },
    null,
    2,
  ),
);

const makeAttributionSvg = (metric: "windowsWithLoAF" | "durationP95Ms") => {
  const width = 1040;
  const height = 430;
  const left = 80;
  const right = 28;
  const top = 64;
  const bottom = 92;
  const plotHeight = height - top - bottom;
  const groups = attributionMetrics.flatMap((run) =>
    attributionArms.map((arm) => ({
      label: `R${run.run} ${attributionLabels[arm]}`,
      value: run.arms[arm][metric] ?? 0,
    }))
  );
  const maxValue = Math.max(1, ...groups.map((group) => group.value));
  const axisMax = metric === "windowsWithLoAF"
    ? Math.ceil(maxValue / 20) * 20
    : Math.ceil(maxValue / 100) * 100;
  const plotWidth = width - left - right;
  const groupWidth = plotWidth / groups.length;
  const y = (value: number) => top + plotHeight - value / axisMax * plotHeight;
  const title = metric === "windowsWithLoAF"
    ? "Measured update windows overlapping a long animation frame"
    : "p95 Long Animation Frame duration";
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="430" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
    `<rect width="${width}" height="${height}" fill="#fff"/>`,
    `<text x="${left}" y="30" font-size="18" font-weight="700" fill="#202124">${title}</text>`,
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
  groups.forEach((group, index) => {
    const center = left + groupWidth * (index + 0.5);
    const barY = y(group.value);
    const barWidth = Math.min(46, groupWidth * 0.42);
    parts.push(
      `<rect x="${
        center - barWidth / 2
      }" y="${barY}" width="${barWidth}" height="${
        top + plotHeight - barY
      }" fill="#4b82b8"><title>${group.label}: ${group.value}</title></rect>`,
    );
    parts.push(
      `<text transform="translate(${center + 2},${
        top + plotHeight + 14
      }) rotate(48)" font-size="10" fill="#4b5563">${group.label}</text>`,
    );
  });
  parts.push("</svg>");
  return parts.join("");
};
const asAttributionGroup = (svg: string, transform = "") =>
  svg.replace(
    /^<svg[^>]*>/,
    `<g${transform ? ` transform="${transform}"` : ""}>`,
  )
    .replace(/<\/svg>$/, "</g>");
const combinedAttributionSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="860" viewBox="0 0 1040 860" role="img" aria-label="Long Animation Frame overlap and p95 duration by arm" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">${
    asAttributionGroup(makeAttributionSvg("windowsWithLoAF"))
  }${
    asAttributionGroup(makeAttributionSvg("durationP95Ms"), "translate(0 430)")
  }</svg>`;
Deno.jupyter.svg`${combinedAttributionSvg}`;
