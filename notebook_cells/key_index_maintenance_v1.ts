const keyIndexManifest = JSON.parse(
  await Deno.readTextFile(
    "results/browser-key-index-maintenance-v1-manifest.json",
  ),
);
if (
  keyIndexManifest.schemaVersion !== "key-index-maintenance-v1-manifest" ||
  keyIndexManifest.status !== "PASS" || keyIndexManifest.acceptedPages !== 5
) {
  throw new Error("Key-index maintenance raw manifest is invalid");
}
for (
  const input of keyIndexManifest.inputs as Array<{
    path: string;
    sha256: string;
  }>
) {
  const bytes = await Deno.readFile(input.path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (actual !== input.sha256) {
    throw new Error(`SHA-256 mismatch for key-index input ${input.path}`);
  }
}
const keyIndexPreregistration = JSON.parse(
  await Deno.readTextFile(
    "results/key-index-maintenance-v1-preregistration.json",
  ),
);
const keyIndexSeeds = keyIndexPreregistration.design.seeds as number[];
const keyIndexRecords = await Promise.all(
  keyIndexSeeds.map(async (seed) =>
    JSON.parse(
      await Deno.readTextFile(
        `results/browser-key-index-maintenance-v1-${seed}.json`,
      ),
    )
  ),
);
const keyIndexArms = ["react", "rebuild", "delta"] as const;
const keyIndexOperations = ["rotate", "replace-edge", "filter"] as const;
if (
  keyIndexPreregistration.schemaVersion !==
    "key-index-maintenance-preregistration-v1" ||
  keyIndexPreregistration.status !== "FROZEN_BEFORE_COLLECTION" ||
  keyIndexPreregistration.design.pageReplications !== keyIndexSeeds.length ||
  keyIndexRecords.length !== 5 ||
  keyIndexRecords.some((record: any, index: number) =>
    record.schemaVersion !== "key-index-maintenance-browser-v1" ||
    record.status !== "PASS" || record.seed !== keyIndexSeeds[index] ||
    record.count !== 10_000 || record.warmupPairs !== 8 ||
    record.measuredPairs !== 24 ||
    record.browser.visibilityState !== "visible" ||
    record.scenarios.length !== keyIndexOperations.length ||
    !record.scenarios.every((scenario: any, scenarioIndex: number) =>
      scenario.operation === keyIndexOperations[scenarioIndex] &&
      scenario.outputParity && scenario.stableIdentity &&
      scenario.teardownEmpty && scenario.samples.length === 24 &&
      scenario.samples.every((sample: any, sampleIndex: number) =>
        sample.pair === sampleIndex && sample.outputParity &&
        keyIndexArms.every((arm) => sample.identity[arm] === true)
      ) && (scenario.operation !== "filter" ||
        scenario.samples.filter((sample: any) => sample.direction === "shrink")
                .length === 12 &&
          scenario.samples.filter((sample: any) =>
              sample.direction === "restore"
            )
              .length === 12)
    )
  )
) {
  throw new Error(
    "Key-index maintenance preregistration or page contracts failed",
  );
}
const keyIndexMedian = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[center]
    : (sorted[center - 1] + sorted[center]) / 2;
};
const keyIndexPercentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
type KeyIndexGroup = "rotate" | "replace-edge" | "shrink" | "restore";
const keyIndexGroups: KeyIndexGroup[] = [
  "rotate",
  "replace-edge",
  "shrink",
  "restore",
];
const keyIndexPageSummaries = keyIndexRecords.flatMap((record: any) =>
  keyIndexGroups.map((group) => {
    const scenario = record.scenarios.find((item: any) =>
      item.operation ===
        (group === "shrink" || group === "restore" ? "filter" : group)
    );
    const samples = group === "shrink" || group === "restore"
      ? scenario.samples.filter((sample: any) => sample.direction === group)
      : scenario.samples;
    const armMedianMs = Object.fromEntries(keyIndexArms.map((arm) => [
      arm,
      keyIndexMedian(samples.map((sample: any) => sample.milliseconds[arm])),
    ]));
    const pairedDifferences = samples.map((sample: any) =>
      sample.milliseconds.rebuild - sample.milliseconds.delta
    );
    const pairedRatios = samples.map((sample: any) =>
      sample.milliseconds.rebuild / sample.milliseconds.delta
    );
    const lifecycleOverheadMs =
      (scenario.mountMs.delta + scenario.teardownMs.delta) -
      (scenario.mountMs.rebuild + scenario.teardownMs.rebuild);
    const lifecycleAdjustedSavingsMs = scenario.mountMs.rebuild +
      scenario.teardownMs.rebuild +
      scenario.samples.reduce(
        (sum: number, sample: any) => sum + sample.milliseconds.rebuild,
        0,
      ) -
      (scenario.mountMs.delta + scenario.teardownMs.delta +
        scenario.samples.reduce(
          (sum: number, sample: any) => sum + sample.milliseconds.delta,
          0,
        ));
    return {
      seed: record.seed,
      page: String(record.seed).slice(-1),
      group,
      n: samples.length,
      armMedianMs,
      pairedDifferenceMedianMs: keyIndexMedian(pairedDifferences),
      pairedRatioMedian: keyIndexMedian(pairedRatios),
      rebuildP95Ms: keyIndexPercentile(
        samples.map((sample: any) => sample.milliseconds.rebuild),
        0.95,
      ),
      deltaP95Ms: keyIndexPercentile(
        samples.map((sample: any) => sample.milliseconds.delta),
        0.95,
      ),
      mountPlusTeardown: {
        rebuildMs: scenario.mountMs.rebuild + scenario.teardownMs.rebuild,
        deltaMs: scenario.mountMs.delta + scenario.teardownMs.delta,
      },
      lifecycleOverheadMs,
      lifecycleAdjustedSavingsMs,
    };
  })
);
const keyIndexGroupSummary = keyIndexGroups.map((group) => {
  const pages = keyIndexPageSummaries.filter((page) => page.group === group);
  const med = (pick: (page: any) => number) => keyIndexMedian(pages.map(pick));
  const improvedPages = pages.filter((page) =>
    page.pairedDifferenceMedianMs > 0
  ).length;
  return {
    group,
    pages: pages.length,
    updatesPerPage: pages[0].n,
    reactMedianOfPageMediansMs: med((page) => page.armMedianMs.react),
    rebuildMedianOfPageMediansMs: med((page) => page.armMedianMs.rebuild),
    deltaMedianOfPageMediansMs: med((page) => page.armMedianMs.delta),
    pairedDifferenceMedianOfPageMediansMs: med((page) =>
      page.pairedDifferenceMedianMs
    ),
    pairedRatioMedianOfPageMedians: med((page) => page.pairedRatioMedian),
    pagesDeltaFaster: improvedPages,
    lifecycleOverheadMedianMs: med((page) => page.lifecycleOverheadMs),
    lifecycleAdjustedSavingsMedianMs: med((page) =>
      page.lifecycleAdjustedSavingsMs
    ),
  };
});
console.table(keyIndexGroupSummary);
console.table(keyIndexPageSummaries.map((page) => ({
  seed: page.seed,
  operation: page.group,
  n: page.n,
  reactMedianMs: page.armMedianMs.react,
  rebuildMedianMs: page.armMedianMs.rebuild,
  deltaMedianMs: page.armMedianMs.delta,
  pairedRebuildMinusDeltaMs: page.pairedDifferenceMedianMs,
  pairedRebuildOverDelta: page.pairedRatioMedian,
  rebuildP95Ms: page.rebuildP95Ms,
  deltaP95Ms: page.deltaP95Ms,
  lifecycleOverheadMs: page.lifecycleOverheadMs,
  lifecycleAdjustedSavingsMs: page.lifecycleAdjustedSavingsMs,
})));

const keyIndexColors = ["#2563eb", "#d97706", "#0f766e", "#9333ea", "#dc2626"];
const keyIndexDifferenceWidth = 960;
const keyIndexDifferenceHeight = 500;
const keyIndexDiffMin = -1;
const keyIndexDiffMax = 4;
const keyIndexDiffLeft = 190;
const keyIndexDiffRight = 40;
const keyIndexDiffPlotWidth = keyIndexDifferenceWidth - keyIndexDiffLeft -
  keyIndexDiffRight;
const keyIndexDiffX = (value: number) =>
  keyIndexDiffLeft +
  (value - keyIndexDiffMin) / (keyIndexDiffMax - keyIndexDiffMin) *
    keyIndexDiffPlotWidth;
const keyIndexDiffSvg: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${keyIndexDifferenceHeight}" viewBox="0 0 ${keyIndexDifferenceWidth} ${keyIndexDifferenceHeight}" role="img" aria-labelledby="key-index-diff-title key-index-diff-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="key-index-diff-title">Key-index strategy paired update differences</title>`,
  `<desc id="key-index-diff-desc">Each point is one fresh page's median paired update difference, keyed-subtree rescan minus delta maintenance. Positive values mean delta was faster. Five page replications are shown for rotation, edge replacement, filter shrink, and filter restore.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="25" font-size="16" font-weight="700">Paired update time · keyed-subtree rescan − delta maintenance</text>`,
  `<text x="18" y="46" fill="#555" font-size="10">Positive values favor delta; page load is the replication unit. React is contextual. N=5 pages on one device.</text>`,
];
for (let tick = keyIndexDiffMin; tick <= keyIndexDiffMax; tick++) {
  const x = keyIndexDiffX(tick);
  keyIndexDiffSvg.push(
    `<line x1="${x}" x2="${x}" y1="72" y2="440" stroke="${
      tick === 0 ? "#111827" : "#e5e7eb"
    }" stroke-width="${
      tick === 0 ? 2 : 1
    }"/><text x="${x}" y="463" text-anchor="middle" fill="#59636e" font-size="10">${tick}</text>`,
  );
}
keyIndexGroups.forEach((group, groupIndex) => {
  const centerY = 110 + groupIndex * 82;
  keyIndexDiffSvg.push(
    `<text x="${keyIndexDiffLeft - 12}" y="${
      centerY + 4
    }" text-anchor="end" fill="#17202a" font-size="11" font-weight="700">${group}</text>`,
  );
  const pages = keyIndexPageSummaries.filter((page) => page.group === group);
  pages.forEach((page, pageIndex) => {
    const x = keyIndexDiffX(page.pairedDifferenceMedianMs);
    const y = centerY + (pageIndex - 2) * 10;
    keyIndexDiffSvg.push(
      `<circle cx="${x}" cy="${y}" r="4.5" fill="${
        keyIndexColors[pageIndex]
      }"/><text x="${x + 8}" y="${
        y + 3
      }" fill="#374151" font-size="8">${page.page}</text>`,
    );
  });
});
keyIndexDiffSvg.push(
  `<text x="${
    keyIndexDiffLeft + keyIndexDiffPlotWidth / 2
  }" y="487" text-anchor="middle" fill="#59636e" font-size="10">Median paired difference per page · milliseconds</text></svg>`,
);
Deno.jupyter.svg`${keyIndexDiffSvg.join("")}`;

const keyIndexLifecycleWidth = 960;
const keyIndexLifecycleHeight = 410;
const keyIndexLifeMin = -120;
const keyIndexLifeMax = 280;
const keyIndexLifeLeft = 210;
const keyIndexLifeRight = 42;
const keyIndexLifePlotWidth = keyIndexLifecycleWidth - keyIndexLifeLeft -
  keyIndexLifeRight;
const keyIndexLifeX = (value: number) =>
  keyIndexLifeLeft +
  (value - keyIndexLifeMin) / (keyIndexLifeMax - keyIndexLifeMin) *
    keyIndexLifePlotWidth;
const keyIndexLifeSvg: string[] = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${keyIndexLifecycleHeight}" viewBox="0 0 ${keyIndexLifecycleWidth} ${keyIndexLifecycleHeight}" role="img" aria-labelledby="key-index-life-title key-index-life-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="key-index-life-title">Mount and teardown adjusted comparison</title>`,
  `<desc id="key-index-life-desc">Each point is a page-level difference between the rebuild and delta arms after adding measured mount, 24 measured updates, and teardown for the operation. Positive values mean the complete measured episode took less time with delta maintenance.</desc>`,
  `<rect width="100%" height="100%" fill="white"/>`,
  `<text x="18" y="25" font-size="16" font-weight="700">Lifecycle-adjusted savings over 24 measured updates</text>`,
  `<text x="18" y="46" fill="#555" font-size="10">Rebuild total − delta total, including measured mount + updates + teardown. Positive values favor delta.</text>`,
];
for (let tick = keyIndexLifeMin; tick <= keyIndexLifeMax; tick += 50) {
  const x = keyIndexLifeX(tick);
  keyIndexLifeSvg.push(
    `<line x1="${x}" x2="${x}" y1="70" y2="352" stroke="${
      tick === 0 ? "#111827" : "#e5e7eb"
    }" stroke-width="${
      tick === 0 ? 2 : 1
    }"/><text x="${x}" y="377" text-anchor="middle" fill="#59636e" font-size="9">${tick}</text>`,
  );
}
(["rotate", "replace-edge", "filter"] as const).forEach(
  (operation, rowIndex) => {
    const centerY = 105 + rowIndex * 85;
    keyIndexLifeSvg.push(
      `<text x="${keyIndexLifeLeft - 12}" y="${
        centerY + 4
      }" text-anchor="end" fill="#17202a" font-size="11" font-weight="700">${operation}</text>`,
    );
    keyIndexRecords.forEach((record: any, pageIndex: number) => {
      const scenario = record.scenarios.find((item: any) =>
        item.operation === operation
      );
      const rebuildTotal = scenario.mountMs.rebuild +
        scenario.teardownMs.rebuild + scenario.samples.reduce(
          (sum: number, sample: any) => sum + sample.milliseconds.rebuild,
          0,
        );
      const deltaTotal = scenario.mountMs.delta + scenario.teardownMs.delta +
        scenario.samples.reduce(
          (sum: number, sample: any) => sum + sample.milliseconds.delta,
          0,
        );
      const x = keyIndexLifeX(rebuildTotal - deltaTotal);
      const y = centerY + (pageIndex - 2) * 9;
      keyIndexLifeSvg.push(
        `<circle cx="${x}" cy="${y}" r="4.5" fill="${
          keyIndexColors[pageIndex]
        }"/><text x="${x + 8}" y="${y + 3}" fill="#374151" font-size="8">${
          String(record.seed).slice(-1)
        }</text>`,
      );
    });
  },
);
keyIndexLifeSvg.push(
  `<text x="${
    keyIndexLifeLeft + keyIndexLifePlotWidth / 2
  }" y="401" text-anchor="middle" fill="#59636e" font-size="10">Millisecond savings across mount + 24 measured updates + teardown</text></svg>`,
);
Deno.jupyter.svg`${keyIndexLifeSvg.join("")}`;
