{
  const cadenceV1Base = "results/snake-frame-cadence-v1";
  const cadenceV1Prereq = JSON.parse(
    await Deno.readTextFile(`${cadenceV1Base}/preregistration.json`),
  );
  const cadenceV1Lock = JSON.parse(
    await Deno.readTextFile(`${cadenceV1Base}/source-lock.json`),
  );
  const cadenceV1Manifest = JSON.parse(
    await Deno.readTextFile(`${cadenceV1Base}/manifest.json`),
  );
  const cadenceV1Summary = JSON.parse(
    await Deno.readTextFile(`${cadenceV1Base}/summary.json`),
  );
  const cadenceV1Hash = async (bytes: Uint8Array) => {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  };
  if (
    cadenceV1Prereq.schedule.length !== 45 ||
    cadenceV1Lock.status !== "FROZEN_BEFORE_COLLECTION" ||
    cadenceV1Manifest.status !== "PASS" ||
    cadenceV1Manifest.recordCount !== 45 ||
    cadenceV1Summary.recordCount !== 45
  ) throw new Error("Cadence V1 study metadata or collection is incomplete");
  const cadenceV1DriftLedger = JSON.parse(
    await Deno.readTextFile("results/post-collection-source-drift.json"),
  );
  if (cadenceV1DriftLedger.schemaVersion !== "post-collection-source-drift-v1") {
    throw new Error("Cadence V1 post-collection drift ledger is invalid");
  }
  const cadenceV1DriftByPath = new Map(
    cadenceV1DriftLedger.entries
      .filter((entry: any) => entry.appliesTo.includes("snake-frame-cadence-v1"))
      .map((entry: any) => [entry.path, entry]),
  );
  let cadenceV1PostCollectionViteDrift = false;
  let cadenceV1PostCollectionGameAssetDrift = false;
  for (const entry of [...cadenceV1Lock.sourceFiles, ...cadenceV1Lock.productionAssets]) {
    let currentPath = entry.path;
    let bytes: Uint8Array;
    try {
      bytes = await Deno.readFile(currentPath);
    } catch (error) {
      const drift: any = cadenceV1DriftByPath.get(entry.path);
      if (typeof drift?.currentPath !== "string") throw error;
      currentPath = drift.currentPath;
      bytes = await Deno.readFile(currentPath);
    }
    const matches = bytes.length === entry.bytes &&
      await cadenceV1Hash(bytes) === entry.sha256;
    if (!matches && entry.path === "vite.config.ts") {
      const currentConfig = new TextDecoder().decode(bytes);
      if (!currentConfig.includes("/__benchmark/save-snake-phase-v1")) {
        throw new Error("Cadence Vite source drift is not the recorded later phase-study instrumentation");
      }
      cadenceV1PostCollectionViteDrift = true;
      continue;
    }
    if (!matches && cadenceV1DriftByPath.has(entry.path)) {
      const drift: any = cadenceV1DriftByPath.get(entry.path);
      const currentSha256 = await cadenceV1Hash(bytes);
      if (
        drift.frozenBytes !== entry.bytes || drift.frozenSha256 !== entry.sha256 ||
        drift.currentBytes !== bytes.length || drift.currentSha256 !== currentSha256 ||
        (drift.currentPath !== undefined && drift.currentPath !== currentPath)
      ) throw new Error(`Cadence drift-ledger mismatch: ${entry.path}`);
      cadenceV1PostCollectionGameAssetDrift = true;
      continue;
    }
    if (!matches) {
      throw new Error(`Cadence source lock mismatch: ${entry.path}`);
    }
  }
  if (cadenceV1PostCollectionViteDrift) {
    console.warn("Cadence V1 Vite source hash differs because the later phase-attribution harness was added after collection; locked production assets and raw records are still hash-verified.");
  }
  if (cadenceV1PostCollectionGameAssetDrift) {
    console.warn("Cadence V1 locked Snake game bundle was replaced by a content-hashed post-collection rebuild; its old and current hashes are recorded in results/post-collection-source-drift.json. The cadence harness and raw records remain hash-verified.");
  }
  const cadenceV1Observed = new Set<string>();
  const cadenceV1Records: any[] = [];
  for (const entry of cadenceV1Manifest.records) {
    const bytes = await Deno.readFile(entry.path);
    if (bytes.length !== entry.bytes || await cadenceV1Hash(bytes) !== entry.sha256) {
      throw new Error(`Cadence raw record hash mismatch: ${entry.path}`);
    }
    const record = JSON.parse(new TextDecoder().decode(bytes));
    if (
      record.status !== "PASS" || !record.allContractsPass ||
      record.collection !== "scheduled" ||
      record.measuredRafMs.samples.length !== 240 ||
      record.updateCpuMs.samples.length !== 240
    ) throw new Error(`Cadence page contract failed: ${record.trialId}`);
    cadenceV1Observed.add(
      `${record.replication}/${record.segmentCount}/${record.arm}`,
    );
    cadenceV1Records.push(record);
  }
  const cadenceV1Expected = new Set(
    cadenceV1Prereq.schedule.map((page: any) =>
      `${page.replication}/${page.segmentCount}/${page.arm}`
    ),
  );
  if (
    cadenceV1Observed.size !== cadenceV1Expected.size ||
    [...cadenceV1Expected].some((key) => !cadenceV1Observed.has(key))
  ) throw new Error("Cadence collection differs from frozen schedule");
  console.log("Snake frame cadence V1 — preregistered page medians");
  console.table(cadenceV1Summary.comparisons.flatMap((row: any) =>
    ["react", "runtime-vdom", "columnar-vdom"].map((arm) => ({
      segments: row.segmentCount,
      arm,
      updateCpuMs: row.arms[arm].updateCpuMedianMs.toFixed(2),
      RAFMedianMs: row.arms[arm].rafIntervalMedianMs.toFixed(2),
      RAFp95Ms: row.arms[arm].rafIntervalP95Ms.toFixed(2),
      lateRate: (row.arms[arm].lateCallbackRate * 100).toFixed(1) + "%",
      missedSlots: row.arms[arm].estimatedMissedSlots,
    }))
  ));
  console.log("Preregistered decision", {
    status: cadenceV1Summary.status,
    correctnessPass: cadenceV1Summary.correctnessPass,
    updateCpuPass: cadenceV1Summary.updateCpuPass,
    cadenceAdvantagePass: cadenceV1Summary.cadenceAdvantagePass,
    cadenceWinsAt8192: cadenceV1Summary.cadenceWinsAt8192,
    zeroHeadroom: cadenceV1Summary.zeroHeadroom,
  });

  const cadenceV1Arms = ["react", "runtime-vdom", "columnar-vdom"];
  const cadenceV1Colors: Record<string, string> = {
    react: "#bf5b34",
    "runtime-vdom": "#286f86",
    "columnar-vdom": "#168267",
  };
  const cadenceV1Sizes = [1024, 4096, 8192];
  const cadenceV1Width = 1060;
  const cadenceV1Height = 440;
  const cadenceV1Left = 74;
  const cadenceV1Right = 24;
  const cadenceV1Top = 52;
  const cadenceV1Bottom = 60;
  const cadenceV1PlotHeight = cadenceV1Height - cadenceV1Top - cadenceV1Bottom;
  const cadenceV1Legend = cadenceV1Arms.map((arm, index) => {
    const x = cadenceV1Left + index * 190;
    return `<rect x="${x}" y="20" width="12" height="12" rx="2" fill="${cadenceV1Colors[arm]}"/><text x="${x + 18}" y="30" font-size="11" fill="#34404a">${arm}</text>`;
  }).join("");
  const cadenceV1Charts = [
    {
      title: "Median update CPU by scene size",
      key: "updateCpuMedianMs",
      max: Math.max(...cadenceV1Summary.comparisons.flatMap((row: any) =>
        cadenceV1Arms.map((arm) => row.arms[arm].updateCpuMedianMs)
      )) * 1.15,
      unit: "ms per update",
    },
    {
      title: "Estimated missed callback slots by scene size",
      key: "estimatedMissedSlots",
      max: Math.max(...cadenceV1Summary.comparisons.flatMap((row: any) =>
        cadenceV1Arms.map((arm) => row.arms[arm].estimatedMissedSlots)
      )) * 1.15 || 1,
      unit: "slots per 240 measured callbacks",
    },
    {
      title: "Late callback rate by scene size",
      key: "lateCallbackRate",
      max: 1,
      unit: "share of callbacks over 1.5× idle baseline",
    },
  ];
  for (const chart of cadenceV1Charts) {
    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = chart.max * index / 4;
      const y = cadenceV1Top + cadenceV1PlotHeight * (1 - value / chart.max);
      return `<line x1="${cadenceV1Left}" x2="${cadenceV1Width - cadenceV1Right}" y1="${y}" y2="${y}" stroke="#e5e7eb"/><text x="${cadenceV1Left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#56616d">${chart.key === "lateCallbackRate" ? (value * 100).toFixed(0) + "%" : value.toFixed(0)}</text>`;
    }).join("");
    const groupWidth = (cadenceV1Width - cadenceV1Left - cadenceV1Right) / cadenceV1Sizes.length;
    const bars = cadenceV1Summary.comparisons.flatMap((row: any, sizeIndex: number) =>
      cadenceV1Arms.map((arm, armIndex) => {
        const value = row.arms[arm][chart.key];
        const height = value / chart.max * cadenceV1PlotHeight;
        const x = cadenceV1Left + sizeIndex * groupWidth + 38 + armIndex * 77;
        const y = cadenceV1Top + cadenceV1PlotHeight - height;
        const label = chart.key === "lateCallbackRate"
          ? (value * 100).toFixed(0) + "%"
          : value.toFixed(1);
        return `<rect x="${x}" y="${y}" width="48" height="${height}" rx="3" fill="${cadenceV1Colors[arm]}"/><text x="${x + 24}" y="${y - 6}" text-anchor="middle" font-size="9" fill="#27313a">${label}</text>`;
      })
    ).join("");
    const labels = cadenceV1Sizes.map((size, index) =>
      `<text x="${cadenceV1Left + index * groupWidth + groupWidth / 2}" y="${cadenceV1Height - 25}" text-anchor="middle" font-size="11" fill="#34404a">${size} segments</text>`
    ).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${cadenceV1Height}" viewBox="0 0 ${cadenceV1Width} ${cadenceV1Height}" role="img" aria-label="${chart.title}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${chart.title}</title><rect width="100%" height="100%" fill="white"/>${cadenceV1Legend}<text x="${cadenceV1Width / 2}" y="44" text-anchor="middle" font-size="11" fill="#56616d">${chart.unit} · median of five page-level medians</text>${grid}${bars}${labels}<line x1="${cadenceV1Left}" x2="${cadenceV1Left}" y1="${cadenceV1Top}" y2="${cadenceV1Height - cadenceV1Bottom}" stroke="#94a3b8"/><line x1="${cadenceV1Left}" x2="${cadenceV1Width - cadenceV1Right}" y1="${cadenceV1Height - cadenceV1Bottom}" y2="${cadenceV1Height - cadenceV1Bottom}" stroke="#94a3b8"/></svg>`;
    await Deno.jupyter.display(Deno.jupyter.svg`${svg}`);
  }
}
