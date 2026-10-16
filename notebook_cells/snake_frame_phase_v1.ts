{
  const phaseBase = "results/snake-frame-phase-v1";
  const phasePrereq = JSON.parse(
    await Deno.readTextFile(`${phaseBase}/preregistration.json`),
  );
  const phaseLock = JSON.parse(
    await Deno.readTextFile(`${phaseBase}/source-lock.json`),
  );
  const phaseManifest = JSON.parse(
    await Deno.readTextFile(`${phaseBase}/manifest.json`),
  );
  const phaseSummary = JSON.parse(
    await Deno.readTextFile(`${phaseBase}/summary.json`),
  );
  const phaseHash = async (bytes: Uint8Array) => {
    const owned = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const digest = await crypto.subtle.digest("SHA-256", owned);
    return [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  };
  if (
    phasePrereq.schedule.length !== 30 ||
    phaseLock.status !== "FROZEN_BEFORE_COLLECTION" ||
    phaseManifest.status !== "PASS" ||
    phaseManifest.recordCount !== 30 ||
    phaseSummary.recordCount !== 30 ||
    !phaseSummary.allContractsPass ||
    !phaseSummary.apiSupportedOnAllPages
  ) throw new Error("Phase V1 preregistration or collection metadata is incomplete");
  const phaseDriftLedger = JSON.parse(
    await Deno.readTextFile("results/post-collection-source-drift.json"),
  );
  if (phaseDriftLedger.schemaVersion !== "post-collection-source-drift-v1") {
    throw new Error("Phase V1 post-collection drift ledger is invalid");
  }
  const phaseDriftByPath = new Map(
    phaseDriftLedger.entries
      .filter((entry: any) => entry.appliesTo.includes("snake-frame-phase-v1"))
      .map((entry: any) => [entry.path, entry]),
  );
  const phaseObservedDrift: string[] = [];
  for (const entry of [...phaseLock.sourceFiles, ...phaseLock.productionAssets]) {
    let currentPath = entry.path;
    let bytes: Uint8Array;
    try {
      bytes = await Deno.readFile(currentPath);
    } catch (error) {
      const drift: any = phaseDriftByPath.get(entry.path);
      if (typeof drift?.currentPath !== "string") throw error;
      currentPath = drift.currentPath;
      bytes = await Deno.readFile(currentPath);
    }
    const currentSha256 = await phaseHash(bytes);
    if (bytes.length !== entry.bytes || currentSha256 !== entry.sha256) {
      const drift: any = phaseDriftByPath.get(entry.path);
      if (
        !drift || drift.frozenBytes !== entry.bytes ||
        drift.frozenSha256 !== entry.sha256 || drift.currentBytes !== bytes.length ||
        drift.currentSha256 !== currentSha256 ||
        (drift.currentPath !== undefined && drift.currentPath !== currentPath)
      ) throw new Error(`Phase V1 source-lock mismatch: ${entry.path}`);
      phaseObservedDrift.push(`${entry.path} → ${currentPath}: ${drift.reason}`);
    }
  }
  if (phaseObservedDrift.length) {
    console.warn("Recorded post-collection source drift; frozen source hashes and production assets remain unchanged:", phaseObservedDrift);
  }
  const phaseObserved = new Set<string>();
  for (const entry of phaseManifest.records) {
    const bytes = await Deno.readFile(entry.path);
    if (bytes.length !== entry.bytes || await phaseHash(bytes) !== entry.sha256) {
      throw new Error(`Phase V1 raw hash mismatch: ${entry.path}`);
    }
    const record = JSON.parse(new TextDecoder().decode(bytes));
    if (
      record.status !== "PASS" || !record.allContractsPass ||
      record.longAnimationFrameSupport?.supported !== true ||
      record.measuredFrames !== 240 ||
      record.longAnimationFrames.count !==
        record.longAnimationFrames.entries.length
    ) throw new Error(`Phase V1 page contract failed: ${record.trialId}`);
    phaseObserved.add(record.trialId);
  }
  const phaseExpected = new Set<string>(phasePrereq.schedule.map((page: any) =>
    `phase-v1-s${page.segmentCount}-r${page.replication}-${page.arm}`
  ));
  if (
    phaseObserved.size !== phaseExpected.size ||
    [...phaseExpected].some((key) => !phaseObserved.has(key))
  ) throw new Error("Phase V1 raw collection differs from the frozen schedule");
  console.log("Snake frame phase attribution V1 — page medians");
  console.table(phaseSummary.comparisons.flatMap((row: any) =>
    ["react", "runtime-vdom", "columnar-vdom"].map((arm) => ({
      segments: row.segmentCount,
      arm,
      loafPages: row.arms[arm].pagesWithLoaf,
      loafCount: row.arms[arm].pageMedian.loafCount,
      totalLoafMs: row.arms[arm].pageMedian.totalLoafDurationMs.toFixed(1),
      attributedScriptMs: row.arms[arm].pageMedian.totalScriptAttributedDurationMs?.toFixed(1) ?? "—",
      postStyleStartMs: row.arms[arm].pageMedian.totalPostStyleAndLayoutStartMs?.toFixed(1) ?? "—",
      updateCpuMs: row.arms[arm].pageMedian.updateCpuMedianMs.toFixed(2),
      RAFp95Ms: row.arms[arm].pageMedian.rafP95Ms.toFixed(1),
    }))
  ));
  console.log(phaseSummary.interpretation);

  const phaseArms = ["react", "runtime-vdom", "columnar-vdom"];
  const phaseColors: Record<string, string> = {
    react: "#bf5b34",
    "runtime-vdom": "#286f86",
    "columnar-vdom": "#168267",
  };
  const phaseSizes = [1024, 8192];
  const phaseWidth = 1060;
  const phaseHeight = 440;
  const phaseLeft = 86;
  const phaseRight = 24;
  const phaseTop = 52;
  const phaseBottom = 60;
  const phasePlotHeight = phaseHeight - phaseTop - phaseBottom;
  const phaseLegend = phaseArms.map((arm, index) => {
    const x = phaseLeft + index * 190;
    return `<rect x="${x}" y="20" width="12" height="12" rx="2" fill="${phaseColors[arm]}"/><text x="${x + 18}" y="30" font-size="11" fill="#34404a">${arm}</text>`;
  }).join("");
  const phaseCharts = [
    {
      title: "Observed Long Animation Frames per page",
      key: "loafCount",
      value: (stats: any) => stats.pageMedian.loafCount,
      unit: "entries over 240 measured updates · entries exceed 50 ms",
    },
    {
      title: "Attributed script duration on pages with LoAF entries",
      key: "totalScriptAttributedDurationMs",
      value: (stats: any) => stats.pageMedian.totalScriptAttributedDurationMs,
      unit: "ms per page · median among pages with observed entries",
    },
    {
      title: "Time from style/layout start to LoAF entry end",
      key: "totalPostStyleAndLayoutStartMs",
      value: (stats: any) => stats.pageMedian.totalPostStyleAndLayoutStartMs,
      unit: "ms per page · coarse remainder, not paint/presentation time",
    },
  ];
  for (const chart of phaseCharts) {
    const values = phaseSummary.comparisons.flatMap((row: any) =>
      phaseArms.map((arm) => chart.value(row.arms[arm])).filter((value: any) => value !== null)
    );
    const max = Math.max(1, ...values) * 1.15;
    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = max * index / 4;
      const y = phaseTop + phasePlotHeight * (1 - value / max);
      return `<line x1="${phaseLeft}" x2="${phaseWidth - phaseRight}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${phaseLeft - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#56616d">${value.toFixed(0)}</text>`;
    }).join("");
    const groupWidth = (phaseWidth - phaseLeft - phaseRight) / phaseSizes.length;
    const bars = phaseSummary.comparisons.flatMap((row: any, sizeIndex: number) =>
      phaseArms.map((arm, armIndex) => {
        const value = chart.value(row.arms[arm]);
        if (value === null) return "";
        const height = value / max * phasePlotHeight;
        const x = phaseLeft + sizeIndex * groupWidth + 34 + armIndex * 78;
        const y = phaseTop + phasePlotHeight - height;
        return `<rect x="${x}" y="${y}" width="48" height="${height}" rx="3" fill="${phaseColors[arm]}"/><text x="${x + 24}" y="${y - 6}" text-anchor="middle" font-size="9" fill="#27313a">${value.toFixed(1)}</text>`;
      })
    ).join("");
    const labels = phaseSizes.map((size, index) =>
      `<text x="${phaseLeft + index * groupWidth + groupWidth / 2}" y="${phaseHeight - 25}" text-anchor="middle" font-size="11" fill="#34404a">${size} segments</text>`
    ).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${phaseHeight}" viewBox="0 0 ${phaseWidth} ${phaseHeight}" role="img" aria-label="${chart.title}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${chart.title}</title><rect width="100%" height="100%" fill="white"/>${phaseLegend}<text x="${phaseWidth / 2}" y="44" text-anchor="middle" font-size="11" fill="#56616d">${chart.unit} · page-level median</text>${grid}${bars}${labels}<line x1="${phaseLeft}" x2="${phaseLeft}" y1="${phaseTop}" y2="${phaseHeight - phaseBottom}" stroke="#94a3b8"/><line x1="${phaseLeft}" x2="${phaseWidth - phaseRight}" y1="${phaseHeight - phaseBottom}" y2="${phaseHeight - phaseBottom}" stroke="#94a3b8"/></svg>`;
    await Deno.jupyter.display(Deno.jupyter.svg`${svg}`);
  }
}
