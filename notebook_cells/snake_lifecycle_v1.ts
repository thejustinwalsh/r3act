{
  const lifecycleV1Base = "results/snake-frame-lifecycle-v1";
  const lifecycleV1Prereq = JSON.parse(
    await Deno.readTextFile(`${lifecycleV1Base}/preregistration.json`),
  );
  const lifecycleV1Manifest = JSON.parse(
    await Deno.readTextFile(`${lifecycleV1Base}/manifest.json`),
  );
  const lifecycleV1Lock = JSON.parse(
    await Deno.readTextFile(`${lifecycleV1Base}/source-lock.json`),
  );
  if (
    lifecycleV1Manifest.status !== "PASS" ||
    lifecycleV1Manifest.recordCount !== lifecycleV1Prereq.schedule.length ||
    lifecycleV1Lock.status !== "FROZEN_BEFORE_COLLECTION"
  ) {
    throw new Error(
      "Lifecycle v1 manifest, schedule, or source lock is incomplete",
    );
  }
  const lifecycleV1Hash = async (bytes: Uint8Array) => {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  };
  const lifecycleV1CurrentDrift: string[] = [];
  for (const file of lifecycleV1Lock.files) {
    try {
      const bytes = await Deno.readFile(file.path);
      if (
        bytes.byteLength !== file.bytes ||
        await lifecycleV1Hash(bytes) !== file.sha256
      ) lifecycleV1CurrentDrift.push(file.path);
    } catch {
      lifecycleV1CurrentDrift.push(file.path);
    }
  }
  console.log(
    `Lifecycle V1 source lock records ${lifecycleV1Lock.files.length} pre-collection hashes; ${lifecycleV1CurrentDrift.length} live paths have changed or are unavailable after the later cadence build. The V1 production source bundle was not archived as a separate snapshot, so this cell verifies the frozen manifest and raw-page hashes rather than claiming a current-tree source match.`,
  );
  const lifecycleV1Expected = new Set(
    lifecycleV1Prereq.schedule.map((page: any) =>
      `${page.replication}/${page.segmentCount}/${page.arm}`
    ),
  );
  const lifecycleV1Records = [];
  for (const file of lifecycleV1Manifest.records) {
    const bytes = await Deno.readFile(file.path);
    if (
      bytes.byteLength !== file.bytes ||
      await lifecycleV1Hash(bytes) !== file.sha256
    ) throw new Error(`Lifecycle raw record hash mismatch: ${file.path}`);
    const record = JSON.parse(new TextDecoder().decode(bytes));
    if (
      record.status !== "PASS" || !record.allContractsPass ||
      record.collection !== "scheduled" || record.measuredFrames !== 300
    ) throw new Error(`Lifecycle correctness failure: ${record.trialId}`);
    lifecycleV1Records.push(record);
  }
  if (lifecycleV1Records.length !== 30) {
    throw new Error(
      `Expected 30 scheduled records, got ${lifecycleV1Records.length}`,
    );
  }
  const lifecycleV1Observed = new Set(
    lifecycleV1Records.map((record: any) =>
      `${record.replication}/${record.segmentCount}/${record.arm}`
    ),
  );
  if (
    lifecycleV1Observed.size !== lifecycleV1Expected.size ||
    [...lifecycleV1Expected].some((key) => !lifecycleV1Observed.has(key))
  ) {
    throw new Error(
      "Lifecycle page matrix differs from its preregistered schedule",
    );
  }
  const lifecycleV1Median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const lifecycleV1Arms = ["react", "runtime-vdom", "columnar-vdom"];
  const lifecycleV1Sizes = [512, 1024];
  const lifecycleV1Summary = lifecycleV1Sizes.map((size) => {
    const armRows = Object.fromEntries(lifecycleV1Arms.map((arm) => {
      const pages = lifecycleV1Records.filter((record) =>
        record.segmentCount === size && record.arm === arm
      );
      return [arm, {
        cycleMs: lifecycleV1Median(
          pages.map((page) => page.primaryCycleCostMs),
        ),
        mountMs: lifecycleV1Median(pages.map((page) => page.mountMs)),
        updateMedianMs: lifecycleV1Median(
          pages.map((page) => page.updateCpuMs.median),
        ),
        updateP95Ms: lifecycleV1Median(
          pages.map((page) => page.updateCpuMs.p95),
        ),
        teardownMs: lifecycleV1Median(pages.map((page) => page.teardownMs)),
        estimatedMsPerRafSlot: lifecycleV1Median(
          pages.map((page) =>
            page.fullRafElapsedMs /
            (page.warmupFrames + page.measuredFrames + 1)
          ),
        ),
      }];
    }));
    const pairs = [1, 2, 3, 4, 5].map((replication) => {
      const find = (arm: string) =>
        lifecycleV1Records.find((record) =>
          record.segmentCount === size && record.replication === replication &&
          record.arm === arm
        );
      const react = find("react")!;
      const columnar = find("columnar-vdom")!;
      return {
        replication,
        cycleRatio: columnar.primaryCycleCostMs / react.primaryCycleCostMs,
        updateRatio: columnar.updateCpuMs.median / react.updateCpuMs.median,
      };
    });
    return { size, arms: armRows, pairs };
  });
  console.log(
    "Lifecycle v1 — medians across five paired production pages; milliseconds",
  );
  console.table(lifecycleV1Summary.map((row) => ({
    segments: row.size,
    reactCycle: row.arms.react.cycleMs.toFixed(1),
    runtimeCycle: row.arms["runtime-vdom"].cycleMs.toFixed(1),
    columnarCycle: row.arms["columnar-vdom"].cycleMs.toFixed(1),
    columnarReactRatio: lifecycleV1Median(
      row.pairs.map((pair) => pair.cycleRatio),
    ).toFixed(3),
  })));
  const lifecycleV1Width = 980;
  const lifecycleV1Height = 400;
  const lifecycleV1Left = 70;
  const lifecycleV1Right = 25;
  const lifecycleV1Top = 52;
  const lifecycleV1Bottom = 62;
  const lifecycleV1ChartHeight = lifecycleV1Height - lifecycleV1Top -
    lifecycleV1Bottom;
  const lifecycleV1Colors: Record<string, string> = {
    react: "#bf5b34",
    "runtime-vdom": "#286f86",
    "columnar-vdom": "#168267",
  };
  const lifecycleV1Max = Math.max(
    ...lifecycleV1Summary.flatMap((row) =>
      lifecycleV1Arms.map((arm) => row.arms[arm].cycleMs)
    ),
  ) * 1.15;
  const lifecycleV1Y = (value: number) =>
    lifecycleV1Top + lifecycleV1ChartHeight * (1 - value / lifecycleV1Max);
  const lifecycleV1Bars: string[] = [];
  const lifecycleV1GroupWidth =
    (lifecycleV1Width - lifecycleV1Left - lifecycleV1Right) / 2;
  const lifecycleV1BarWidth = 46;
  for (const [sizeIndex, row] of lifecycleV1Summary.entries()) {
    for (const [armIndex, arm] of lifecycleV1Arms.entries()) {
      const x = lifecycleV1Left + sizeIndex * lifecycleV1GroupWidth + 70 +
        armIndex * 68;
      const y = lifecycleV1Y(row.arms[arm].cycleMs);
      lifecycleV1Bars.push(
        `<rect x="${x}" y="${y}" width="${lifecycleV1BarWidth}" height="${
          lifecycleV1Top + lifecycleV1ChartHeight - y
        }" rx="3" fill="${lifecycleV1Colors[arm]}"/><text x="${
          x + lifecycleV1BarWidth / 2
        }" y="${y - 7}" text-anchor="middle" font-size="10" fill="#27313a">${
          row.arms[arm].cycleMs.toFixed(0)
        }</text>`,
      );
    }
  }
  const lifecycleV1Grid = Array.from({ length: 5 }, (_, index) => {
    const value = lifecycleV1Max * index / 4;
    const y = lifecycleV1Y(value);
    return `<line x1="${lifecycleV1Left}" x2="${
      lifecycleV1Width - lifecycleV1Right
    }" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${
      lifecycleV1Left - 10
    }" y="${y + 4}" text-anchor="end" font-size="10" fill="#56616d">${
      value.toFixed(0)
    }</text>`;
  }).join("");
  const lifecycleV1Legend = lifecycleV1Arms.map((arm, index) => {
    const x = lifecycleV1Left + index * 190;
    return `<rect x="${x}" y="20" width="12" height="12" rx="2" fill="${
      lifecycleV1Colors[arm]
    }"/><text x="${x + 18}" y="30" font-size="11" fill="#34404a">${arm}</text>`;
  }).join("");
  const lifecycleV1Labels = lifecycleV1Summary.map((row, index) =>
    `<text x="${
      lifecycleV1Left + index * lifecycleV1GroupWidth +
      lifecycleV1GroupWidth / 2
    }" y="${
      lifecycleV1Height - 31
    }" text-anchor="middle" font-size="12" fill="#34404a">${row.size} segments</text>`
  ).join("");
  await Deno.jupyter.display(
    Deno.jupyter
      .svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${lifecycleV1Height}" viewBox="0 0 ${lifecycleV1Width} ${lifecycleV1Height}" role="img" aria-label="Median lifecycle cost by arm and segment count" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Median lifecycle cost by arm and segment count</title><rect width="100%" height="100%" fill="white"/>${lifecycleV1Legend}${lifecycleV1Grid}<line x1="${lifecycleV1Left}" x2="${lifecycleV1Left}" y1="${lifecycleV1Top}" y2="${
      lifecycleV1Top + lifecycleV1ChartHeight
    }" stroke="#94a3b8"/><line x1="${lifecycleV1Left}" x2="${
      lifecycleV1Width - lifecycleV1Right
    }" y1="${lifecycleV1Top + lifecycleV1ChartHeight}" y2="${
      lifecycleV1Top + lifecycleV1ChartHeight
    }" stroke="#94a3b8"/>${
      lifecycleV1Bars.join("")
    }${lifecycleV1Labels}<text x="18" y="${
      lifecycleV1Height / 2
    }" transform="rotate(-90 18 ${
      lifecycleV1Height / 2
    })" text-anchor="middle" font-size="11" fill="#56616d">Mount + 300 update CPU + teardown (ms)</text></svg>`,
  );
  const lifecycleV1RatioWidth = 980;
  const lifecycleV1RatioHeight = 360;
  const lifecycleV1RatioLeft = 74;
  const lifecycleV1RatioTop = 42;
  const lifecycleV1RatioBottom = 54;
  const lifecycleV1RatioPlotHeight = lifecycleV1RatioHeight -
    lifecycleV1RatioTop - lifecycleV1RatioBottom;
  const lifecycleV1RatioY = (value: number) =>
    lifecycleV1RatioTop + lifecycleV1RatioPlotHeight * (1 - value / 1.2);
  const lifecycleV1RatioGroups = lifecycleV1Summary.map((row, sizeIndex) => {
    const points = row.pairs.map((pair, index) => {
      const x = lifecycleV1RatioLeft + sizeIndex * 410 + 55 + index * 57;
      const y = lifecycleV1RatioY(pair.cycleRatio);
      return `<circle cx="${x}" cy="${y}" r="5" fill="${
        lifecycleV1Colors["columnar-vdom"]
      }"/><text x="${x}" y="${
        y - 10
      }" text-anchor="middle" font-size="9" fill="#34404a">${
        pair.cycleRatio.toFixed(2)
      }</text>`;
    }).join("");
    const groupX = lifecycleV1RatioLeft + sizeIndex * 410 + 55;
    return `${points}<text x="${groupX + 114}" y="${
      lifecycleV1RatioHeight - 20
    }" text-anchor="middle" font-size="11" fill="#34404a">${row.size} segments · replications 1–5</text>`;
  }).join("");
  const lifecycleV1RatioGateY = lifecycleV1RatioY(0.9);
  const lifecycleV1RatioSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${lifecycleV1RatioHeight}" viewBox="0 0 ${lifecycleV1RatioWidth} ${lifecycleV1RatioHeight}" role="img" aria-label="Paired columnar VDOM to React lifecycle cost ratios" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Paired columnar VDOM to React lifecycle cost ratios</title><rect width="100%" height="100%" fill="white"/><line x1="${lifecycleV1RatioLeft}" x2="${
      lifecycleV1RatioWidth - 22
    }" y1="${lifecycleV1RatioGateY}" y2="${lifecycleV1RatioGateY}" stroke="#d1495b" stroke-dasharray="6 5"/><text x="${
      lifecycleV1RatioWidth - 24
    }" y="${
      lifecycleV1RatioGateY - 7
    }" text-anchor="end" font-size="10" fill="#b42335">pre-registered 0.90 gate</text>${lifecycleV1RatioGroups}<text x="18" y="${
      lifecycleV1RatioHeight / 2
    }" transform="rotate(-90 18 ${
      lifecycleV1RatioHeight / 2
    })" text-anchor="middle" font-size="11" fill="#56616d">Columnar VDOM / React total cycle cost (×)</text></svg>`;
  await Deno.jupyter.display(Deno.jupyter.svg`${lifecycleV1RatioSvg}`);
  console.log(
    "Exploratory RAF cadence — median full-run wall time per scheduled callback slot; not individual interval percentiles or physical presentation",
  );
  console.table(
    lifecycleV1Summary.flatMap((row) =>
      lifecycleV1Arms.map((arm) => ({
        segments: row.size,
        arm,
        estimatedMsPerRafSlot: row.arms[arm].estimatedMsPerRafSlot.toFixed(2),
      }))
    ),
  );
  const cadenceWidth = 980;
  const cadenceHeight = 350;
  const cadenceLeft = 84;
  const cadenceTop = 50;
  const cadenceBottom = 56;
  const cadencePlotHeight = cadenceHeight - cadenceTop - cadenceBottom;
  const cadenceMin = 15;
  const cadenceMax = 19;
  const cadenceY = (value: number) =>
    cadenceTop +
    cadencePlotHeight * (1 - (value - cadenceMin) / (cadenceMax - cadenceMin));
  const cadenceGrid = Array.from({ length: 5 }, (_, index) => {
    const value = cadenceMin + index;
    const y = cadenceY(value);
    return `<line x1="${cadenceLeft}" x2="${
      cadenceWidth - 28
    }" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${cadenceLeft - 10}" y="${
      y + 4
    }" text-anchor="end" font-size="10" fill="#56616d">${value}</text>`;
  }).join("");
  const cadenceDots = lifecycleV1Summary.flatMap((row, sizeIndex) =>
    lifecycleV1Arms.map((arm, armIndex) => {
      const x = cadenceLeft + sizeIndex * 430 + 92 + armIndex * 84;
      const value = row.arms[arm].estimatedMsPerRafSlot;
      const y = cadenceY(value);
      return `<circle cx="${x}" cy="${y}" r="6" fill="${
        lifecycleV1Colors[arm]
      }"/><text x="${x}" y="${
        y - 10
      }" text-anchor="middle" font-size="10" fill="#34404a">${
        value.toFixed(2)
      }</text>`;
    })
  ).join("");
  const cadenceLabels = lifecycleV1Summary.map((row, index) =>
    `<text x="${cadenceLeft + index * 430 + 176}" y="${
      cadenceHeight - 20
    }" text-anchor="middle" font-size="11" fill="#34404a">${row.size} segments</text>`
  ).join("");
  const cadenceSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${cadenceHeight}" viewBox="0 0 ${cadenceWidth} ${cadenceHeight}" role="img" aria-label="Exploratory average animation callback slot duration by runtime and segment count" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Exploratory RAF callback cadence</title><rect width="100%" height="100%" fill="white"/>${cadenceGrid}${cadenceDots}${cadenceLabels}<text x="18" y="${
      cadenceHeight / 2
    }" transform="rotate(-90 18 ${
      cadenceHeight / 2
    })" text-anchor="middle" font-size="11" fill="#56616d">Full-run wall time / scheduled callback slots (ms)</text><text x="${
      cadenceWidth / 2
    }" y="22" text-anchor="middle" font-size="11" fill="#56616d">Exploratory average; per-frame intervals and display presentation were not recorded</text></svg>`;
  await Deno.jupyter.display(Deno.jupyter.svg`${cadenceSvg}`);

  const lifecycleV1HeapRows = lifecycleV1Records.map((record: any) => ({
    size: record.segmentCount,
    arm: record.arm,
    replication: record.replication,
    mountDeltaMiB: (record.heapUsedAfterMountBytes -
      record.heapUsedBeforeMountBytes) / (1024 * 1024),
    teardownDeltaMiB: (record.heapUsedAfterTeardownBytes -
      record.heapUsedBeforeMountBytes) / (1024 * 1024),
  }));
  const lifecycleV1HeapSummary = lifecycleV1Sizes.flatMap((size) =>
    lifecycleV1Arms.map((arm) => {
      const rows = lifecycleV1HeapRows.filter((row: any) =>
        row.size === size && row.arm === arm
      );
      const mountDeltas = rows.map((row: any) => row.mountDeltaMiB);
      const teardownDeltas = rows.map((row: any) => row.teardownDeltaMiB);
      return {
        size,
        arm,
        pages: rows.length,
        zeroMountDeltas: mountDeltas.filter((value: number) => value === 0)
          .length,
        mountDeltaRangeMiB: [
          Math.min(...mountDeltas),
          Math.max(...mountDeltas),
        ],
        teardownDeltaRangeMiB: [
          Math.min(...teardownDeltas),
          Math.max(...teardownDeltas),
        ],
        negativeTeardownDeltas: teardownDeltas.filter((value: number) =>
          value < 0
        ).length,
      };
    })
  );
  console.log(
    "Exploratory browser heap readings — signed change from before mount (MiB); not allocation counts",
  );
  console.table(lifecycleV1HeapSummary);
  const lifecycleV1HeapWidth = 980;
  const lifecycleV1HeapHeight = 430;
  const lifecycleV1HeapLeft = 92;
  const lifecycleV1HeapRight = 24;
  const lifecycleV1HeapTop = 44;
  const lifecycleV1HeapBottom = 62;
  const lifecycleV1HeapPlotHeight = lifecycleV1HeapHeight -
    lifecycleV1HeapTop - lifecycleV1HeapBottom;
  const lifecycleV1HeapMin = -20;
  const lifecycleV1HeapMax = 20;
  const lifecycleV1HeapY = (value: number) =>
    lifecycleV1HeapTop + lifecycleV1HeapPlotHeight *
      (1 - (value - lifecycleV1HeapMin) /
          (lifecycleV1HeapMax - lifecycleV1HeapMin));
  const lifecycleV1HeapTicks = [-20, -10, 0, 10, 20].map((value) => {
    const y = lifecycleV1HeapY(value);
    return `<line x1="${lifecycleV1HeapLeft}" x2="${
      lifecycleV1HeapWidth - lifecycleV1HeapRight
    }" y1="${y}" y2="${y}" stroke="${value === 0 ? "#718096" : "#e5e7eb"}" ${
      value === 0 ? 'stroke-dasharray="5 4"' : ""
    }/><text x="${lifecycleV1HeapLeft - 10}" y="${
      y + 4
    }" text-anchor="end" font-size="10" fill="#56616d">${value}</text>`;
  }).join("");
  const lifecycleV1HeapGroupWidth =
    (lifecycleV1HeapWidth - lifecycleV1HeapLeft - lifecycleV1HeapRight) / 6;
  const lifecycleV1HeapDots = lifecycleV1HeapRows.map((row: any) => {
    const sizeIndex = lifecycleV1Sizes.indexOf(row.size);
    const armIndex = lifecycleV1Arms.indexOf(row.arm);
    const category = sizeIndex * lifecycleV1Arms.length + armIndex;
    const jitter = (row.replication - 3) * 6;
    const x = lifecycleV1HeapLeft + category * lifecycleV1HeapGroupWidth +
      lifecycleV1HeapGroupWidth / 2 + jitter;
    const y = lifecycleV1HeapY(row.teardownDeltaMiB);
    return `<circle cx="${x}" cy="${y}" r="5" fill="${
      lifecycleV1Colors[row.arm]
    }" opacity="0.82"><title>${row.size} segments · ${row.arm} · page ${row.replication}: ${
      row.teardownDeltaMiB.toFixed(2)
    } MiB</title></circle>`;
  }).join("");
  const lifecycleV1HeapLabels = lifecycleV1Sizes.flatMap((size, sizeIndex) =>
    lifecycleV1Arms.map((arm, armIndex) => {
      const category = sizeIndex * lifecycleV1Arms.length + armIndex;
      const x = lifecycleV1HeapLeft + category * lifecycleV1HeapGroupWidth +
        lifecycleV1HeapGroupWidth / 2;
      const y = lifecycleV1HeapHeight - 33;
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" fill="#34404a">${size}</text><text x="${x}" y="${
        y + 13
      }" text-anchor="middle" font-size="8" fill="#56616d">${
        arm === "runtime-vdom"
          ? "runtime"
          : arm === "columnar-vdom"
          ? "columnar"
          : "React"
      }</text>`;
    })
  ).join("");
  const lifecycleV1HeapSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${lifecycleV1HeapHeight}" viewBox="0 0 ${lifecycleV1HeapWidth} ${lifecycleV1HeapHeight}" role="img" aria-label="Per-page browser heap change after teardown relative to before mount" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Exploratory used JavaScript heap after teardown</title><rect width="100%" height="100%" fill="white"/><text x="${
      lifecycleV1HeapWidth / 2
    }" y="20" text-anchor="middle" font-size="11" fill="#56616d">Five pages per arm and size · points are signed change from before mount</text>${lifecycleV1HeapTicks}${lifecycleV1HeapDots}${lifecycleV1HeapLabels}<text x="18" y="${
      lifecycleV1HeapHeight / 2
    }" transform="rotate(-90 18 ${
      lifecycleV1HeapHeight / 2
    })" text-anchor="middle" font-size="11" fill="#56616d">After teardown − before mount (MiB)</text></svg>`;
  await Deno.jupyter.display(Deno.jupyter.svg`${lifecycleV1HeapSvg}`);
  const lifecycleV1ZeroMountCount =
    lifecycleV1HeapRows.filter((row: any) => row.mountDeltaMiB === 0).length;
  const lifecycleV1NegativeTeardownCount = lifecycleV1HeapRows.filter(
    (row: any) => row.teardownDeltaMiB < 0,
  ).length;
  console.log(
    `Heap diagnostic: ${lifecycleV1ZeroMountCount}/${lifecycleV1HeapRows.length} pages reported exactly zero after-mount delta; ${lifecycleV1NegativeTeardownCount}/${lifecycleV1HeapRows.length} reported lower heap after teardown than before mount. This API is affected by garbage collection and unrelated page heap, so these values do not identify allocated bytes or retained objects.`,
  );
}
