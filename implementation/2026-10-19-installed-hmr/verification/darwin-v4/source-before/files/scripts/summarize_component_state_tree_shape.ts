const manifestPath =
  "results/browser-component-state-tree-shape-manifest-v1.json";
const schedulePath =
  "results/browser-component-state-tree-shape-schedule-v1.json";
const manifest = JSON.parse(await Deno.readTextFile(manifestPath));
const schedule = JSON.parse(await Deno.readTextFile(schedulePath));
const groups = [0, 10, 100, 1_000];
if (
  manifest.schemaVersion !== "component-state-tree-shape-browser-manifest-v1" ||
  manifest.status !== "COMPLETE" || !manifest.pageLoadsAreReplicationUnit ||
  manifest.records.length !== 12 ||
  groups.some((groupCount) =>
    manifest.records.filter((record: any) => record.groupCount === groupCount)
      .length !== 3
  )
) {
  throw new Error(
    "Expected three manifest-listed production page loads for each of four tree shapes",
  );
}
if (
  schedule.schemaVersion !== "component-state-tree-shape-browser-schedule-v1" ||
  schedule.status !== "PLANNED" ||
  schedule.runs.length !== manifest.records.length ||
  schedule.runs.some((run: any) =>
    !manifest.records.some((record: any) =>
      record.groupCount === run.groupCount && record.seed === run.seed
    )
  )
) {
  throw new Error(
    "Run manifest does not match the interleaved predeclared schedule",
  );
}

const files = await Promise.all(manifest.records.map(async (item: any) => {
  if (
    !/^results\/browser-component-state-tree-shape-v1-(0|10|100|1000)-\d+\.json$/
      .test(item.file)
  ) {
    throw new Error(`Unexpected raw file path: ${item.file}`);
  }
  return {
    name: item.file.replace(/^results\//, ""),
    record: JSON.parse(await Deno.readTextFile(item.file)),
  };
}));
const first = files[0].record;
const seenSeeds = new Set<string>();
for (const { name, record } of files) {
  const item = manifest.records.find((entry: any) =>
    entry.file === `results/${name}`
  );
  const seedKey = `${record.groupCount}:${record.seed}`;
  if (seenSeeds.has(seedKey)) {
    throw new Error(`Duplicate topology/seed replication: ${seedKey}`);
  }
  seenSeeds.add(seedKey);
  if (
    record.schemaVersion !== "component-state-tree-shape-browser-v1" ||
    record.status !== "PASS" ||
    record.count !== 10_000 || !groups.includes(record.groupCount) ||
    record.seed !== item?.seed ||
    record.warmupPairs !== 8 || record.measuredPairs !== 40 ||
    record.updatesPerSample !== 100 ||
    record.samples?.length !== 40 || !record.finalOutputParity ||
    !record.stableTargetIdentity ||
    !record.partialCommitContract || record.partialCommitsPerUpdate !== 1 ||
    record.rendersPerUpdate?.react !== 1 ||
    record.rendersPerUpdate?.runtime !== 1 ||
    record.groupRendersPerUpdate?.react !== 0 ||
    record.groupRendersPerUpdate?.runtime !== 0 ||
    JSON.stringify(record.browser) !== JSON.stringify(manifest.browser) ||
    record.browser?.userAgent !== first.browser.userAgent ||
    record.browser?.platform !== first.browser.platform ||
    !["react", "runtime"].every((arm) =>
      Number.isFinite(record.medianMs?.[arm]) &&
      Number.isFinite(record.p95Ms?.[arm])
    )
  ) {
    throw new Error(`Invalid, incompatible, or failed browser record: ${name}`);
  }
}

const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = ordered.length >>> 1;
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
};
const scenarioRows = groups.map((groupCount) => {
  const runs = files.filter(({ record }) => record.groupCount === groupCount);
  const medianMs = {
    react: median(runs.map(({ record }) => record.medianMs.react)),
    runtime: median(runs.map(({ record }) => record.medianMs.runtime)),
  };
  const pageMedians = (arm: "react" | "runtime") =>
    runs.map(({ record }) => record.medianMs[arm]);
  const wins = runs.flatMap(({ record }) =>
    record.samples.map((sample: any) => ({
      react: sample.milliseconds.react,
      runtime: sample.milliseconds.runtime,
    }))
  );
  return {
    groupCount,
    groupSize: groupCount === 0 ? null : 10_000 / groupCount,
    label: groupCount === 0
      ? "Flat"
      : `${groupCount.toLocaleString()} × ${
        (10_000 / groupCount).toLocaleString()
      }`,
    pageLoadReplications: runs.length,
    medianMs,
    pageMedianRangeMs: {
      react: [
        Math.min(...pageMedians("react")),
        Math.max(...pageMedians("react")),
      ],
      runtime: [
        Math.min(...pageMedians("runtime")),
        Math.max(...pageMedians("runtime")),
      ],
    },
    medianPageP95Ms: {
      react: median(runs.map(({ record }) => record.p95Ms.react)),
      runtime: median(runs.map(({ record }) => record.p95Ms.runtime)),
    },
    medianPageMountMs: {
      react: median(runs.map(({ record }) => record.mountMs.react)),
      runtime: median(runs.map(({ record }) => record.mountMs.runtime)),
    },
    medianPerPageSpeedup: median(
      runs.map(({ record }) => record.medianMs.react / record.medianMs.runtime),
    ),
    pairedSampleWins: {
      runtime: wins.filter((sample: any) =>
        sample.runtime < sample.react
      ).length,
      react: wins.filter((sample: any) => sample.react < sample.runtime).length,
      ties:
        wins.filter((sample: any) => sample.react === sample.runtime).length,
      total: wins.length,
    },
    runs: runs.map(({ name, record }) => ({
      file: `results/${name}`,
      seed: record.seed,
      collectedAt: record.collectedAt,
      medianMs: record.medianMs,
      p95Ms: record.p95Ms,
      mountMs: record.mountMs,
    })),
    contractsPass: runs.every(({ record }) =>
      record.status === "PASS" && record.finalOutputParity &&
      record.stableTargetIdentity && record.partialCommitContract &&
      record.rendersPerUpdate.react === 1 &&
      record.rendersPerUpdate.runtime === 1 &&
      record.groupRendersPerUpdate.react === 0 &&
      record.groupRendersPerUpdate.runtime === 0
    ),
  };
});
const summary = {
  schemaVersion: "component-state-tree-shape-browser-summary-v1",
  status: "PASS",
  benchmark:
    "one leaf-local boolean state update in a 10,000-span DOM tree with four component/Fiber topologies",
  primaryUnit:
    "median milliseconds per update, summarized within page load then across three page-load medians per topology",
  browser: first.browser,
  manifestFile: manifestPath,
  scheduleFile: schedulePath,
  deployment: manifest.deployment,
  pageLoadsAreReplicationUnit: true,
  independentBrowserProfiles: manifest.profileReplications,
  scenarios: scenarioRows,
  methodology: {
    warmupPairs: 8,
    measuredPairsPerPage: 40,
    updatesPerPairArm: 100,
    armOrder:
      "seeded randomized within page load; each arm receives the same programmatic HTMLElement.click() event shape",
    controlledStructure:
      "All arms render the same flat 10,000-span DOM. Keyed component groups returning Fragments change component/Fiber topology only; groups are 0, 10, 100, or 1,000.",
    react:
      "React 19.3.0 production build with React Compiler enabled; local useState at the target leaf.",
    runtime:
      "OXC-generated owner/site state, graph-selected leaf owner, indexed partial VDOM commit; group components return Fragments.",
    timing:
      "Programmatic event dispatch through committed DOM text/attribute; mount timed separately; layout and paint excluded.",
    correctness:
      "Every update checks target output; each page checks full parity, stable target identity, one leaf render per update, zero group renders per update, and one runtime partial commit per update.",
  },
  limitation:
    "Three page loads per topology share one Chrome profile and device. The comparison tests only one selected-leaf local boolean update, programmatic clicks, and a flat 10,000-span DOM with Fragment-only groups. It excludes structural updates, multiple dirty owners, trusted input, layout/paint, and independent profile/device replication. A topology effect is specific to this fixture and does not identify every source of React update cost.",
  rawFiles: files.map(({ name }) => `results/${name}`),
};
await Deno.writeTextFile(
  "results/browser-component-state-tree-shape-summary-v1.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    scenarioRows.map((
      {
        groupCount,
        label,
        medianMs,
        pageMedianRangeMs,
        medianPageP95Ms,
        medianPerPageSpeedup,
        pairedSampleWins,
      },
    ) => ({
      groupCount,
      label,
      medianMs,
      pageMedianRangeMs,
      medianPageP95Ms,
      medianPerPageSpeedup,
      pairedSampleWins,
    })),
    null,
    2,
  ),
);
console.log("Saved results/browser-component-state-tree-shape-summary-v1.json");
