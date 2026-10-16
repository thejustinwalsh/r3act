const schedule = JSON.parse(
  await Deno.readTextFile("results/browser-snake-frame-v5-preregistration.json"),
);
if (
  schedule.schemaVersion !== "snake-frame-browser-v5-preregistration-v1" ||
  schedule.status !== "PREREGISTERED" || schedule.pages.length !== 100
) throw new Error("V5 preregistration is missing or malformed");

let manifest: any = null;
try {
  manifest = JSON.parse(
    await Deno.readTextFile("results/browser-snake-frame-v5-manifest.json"),
  );
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
}

if (!manifest) {
  console.log(
    "V5 is preregistered: 100 visible page loads × 300 measured RAF callbacks = 30,000 observations. Browser collection has not produced a manifest yet.",
  );
  Deno.jupyter.svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="170" viewBox="0 0 900 170" role="img" aria-labelledby="v5-pending-title" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title id="v5-pending-title">Snake V5 collection pending</title><rect x="1" y="1" width="898" height="168" rx="8" fill="#f8fafc" stroke="#cbd5e1"/><text x="450" y="66" text-anchor="middle" fill="#0f172a" font-size="20" font-weight="650">Snake V5 · preregistered integration comparison</text><text x="450" y="102" text-anchor="middle" fill="#475569" font-size="14">100 page loads · 5 arms · 4 sizes · 5 replications · data pending</text></svg>`;
} else {
  if (
    manifest.schemaVersion !== "snake-frame-browser-v5-manifest-v1" ||
    manifest.status !== "PASS" || manifest.pageLoads !== 100 ||
    manifest.measuredSamples !== 30000 || manifest.files.length !== 100 ||
    manifest.preregistrationSchemaVersion !== schedule.schemaVersion
  ) throw new Error("Snake V5 manifest is missing or incomplete");

  const pages: any[] = [];
  for (const entry of manifest.files) {
    const bytes = await Deno.readFile("results/" + entry.file);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
    if (hash !== entry.sha256) throw new Error("SHA-256 mismatch: " + entry.file);
    const page = JSON.parse(new TextDecoder().decode(bytes));
    const expected = schedule.pages.find((item: any) => item.trialId === page.trialId);
    if (
      !expected || page.pageLoadId !== entry.pageLoadId ||
      page.trialId !== entry.trialId || page.arm !== expected.arm ||
      page.segmentCount !== expected.segmentCount ||
      page.measuredFrames !== 300 || page.mountMs !== entry.mountMs ||
      page.schemaVersion !== "snake-frame-browser-v5" ||
      page.status !== "PASS" || !page.allContractsPass ||
      page.browser.visibilityState !== "visible" ||
      !page.allOutputMatches || !page.stableNodeCount ||
      !page.stableNodeIdentity || !page.completeCommitCoverage ||
      page.samples.length !== 300 || !Number.isFinite(page.mountMs) ||
      !page.samples.every((sample: any) =>
        Number.isFinite(sample.intervalMs) && sample.intervalMs > 0 &&
        Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
        Number.isFinite(sample.commitMs) && sample.commitMs >= 0
      )
    ) throw new Error("V5 page contract failed: " + entry.file);
    pages.push({ ...page, replication: expected.replication });
  }
  const uniqueIds = new Set(pages.map((page) => page.pageLoadId)).size === 100;
  const uniqueTrials = new Set(pages.map((page) => page.trialId)).size === 100;
  const balanced = schedule.protocol.segmentCounts.every((count: number) =>
    schedule.protocol.arms.every((arm: string) =>
      pages.filter((page) => page.segmentCount === count && page.arm === arm).length === 5
    )
  );
  if (!uniqueIds || !uniqueTrials || !balanced) {
    throw new Error("V5 page-load identity or balance contract failed");
  }

  const percentile = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  };
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  const counts: number[] = schedule.protocol.segmentCounts;
  const arms: string[] = schedule.protocol.arms;
  const rows = new Map<string, any>();
  for (const count of counts) {
    for (const arm of arms) {
      const selected = pages.filter((page) =>
        page.segmentCount === count && page.arm === arm
      );
      const pageMedians = selected.map((page) =>
        median(page.samples.map((sample: any) => sample.commitMs))
      );
      const pageP95s = selected.map((page) =>
        percentile(page.samples.map((sample: any) => sample.commitMs), 0.95)
      );
      const pageRafP95s = selected.map((page) =>
        percentile(page.samples.map((sample: any) => sample.intervalMs), 0.95)
      );
      const pageCpuMedians = selected.map((page) =>
        median(page.samples.map((sample: any) => sample.updateCpuMs))
      );
      const mountValues = selected.map((page) => page.mountMs);
      const heapMountDeltas = selected.flatMap((page) =>
        Number.isFinite(page.heapUsedBeforeMountBytes) &&
          Number.isFinite(page.heapUsedAfterMountBytes)
          ? [page.heapUsedAfterMountBytes - page.heapUsedBeforeMountBytes]
          : []
      );
      const heapFrameDeltas = selected.flatMap((page) =>
        Number.isFinite(page.heapUsedAfterMountBytes) &&
          Number.isFinite(page.heapUsedAfterMeasuredFramesBytes)
          ? [page.heapUsedAfterMeasuredFramesBytes - page.heapUsedAfterMountBytes]
          : []
      );
      rows.set(`${count}/${arm}`, {
        pageMedians,
        medianCommit: median(pageMedians),
        medianP95: median(pageP95s),
        pageRafP95s,
        medianRafP95: median(pageRafP95s),
        medianCpu: median(pageCpuMedians),
        mountValues,
        medianMount: median(mountValues),
        medianHeapMountDelta: heapMountDeltas.length
          ? median(heapMountDeltas)
          : null,
        medianHeapFrameDelta: heapFrameDeltas.length
          ? median(heapFrameDeltas)
          : null,
      });
    }
  }

  console.log(
    `SHA-256 validated ${pages.length} page loads × 300 measured RAFs = ${pages.length * 300} samples; page load is the replication unit.`,
  );
  console.log(
    `Environment: ${manifest.environment.userAgent}; ${manifest.environment.viewport.width}×${manifest.environment.viewport.height}; DPR ${manifest.environment.devicePixelRatio}; React ${manifest.environment.reactVersion}.`,
  );
  console.log(
    `Collection mode: Vite ${manifest.collectionContext.buildMode} server; post-hoc note: ${manifest.collectionContext.preregistrationDeviation}`,
  );
  console.log(
    "segments | arm | mount median ms | update CPU median ms | update-to-commit median/p95 ms | heap delta mount/updates bytes (diagnostic)",
  );
  for (const count of counts) {
    for (const arm of arms) {
      const row = rows.get(`${count}/${arm}`)!;
      console.log(
        `${count} | ${arm} | ${row.medianMount.toFixed(3)} | ${row.medianCpu.toFixed(3)} | ${row.medianCommit.toFixed(3)}/${row.medianP95.toFixed(3)} | ${row.medianHeapMountDelta?.toFixed(0) ?? "n/a"}/${row.medianHeapFrameDelta?.toFixed(0) ?? "n/a"}`,
      );
    }
  }

  console.log("segments | arm | RAF interval p95 median across pages ms");
  for (const count of counts) {
    for (const arm of arms) {
      const row = rows.get(`${count}/${arm}`)!;
      console.log(
        `${count} | ${arm} | ${row.medianRafP95.toFixed(2)} (page range ${Math.min(...row.pageRafP95s).toFixed(2)}–${Math.max(...row.pageRafP95s).toFixed(2)})`,
      );
    }
  }

  console.log("Break-even updates versus React, paired by size and replication:");
  for (const count of counts) {
    for (const arm of arms.filter((candidate) => candidate !== "react")) {
      const pairedFrames: number[] = [];
      for (let replication = 1; replication <= 5; replication++) {
        const reactPage = pages.find((page) =>
          page.segmentCount === count && page.arm === "react" &&
          page.replication === replication
        );
        const armPage = pages.find((page) =>
          page.segmentCount === count && page.arm === arm &&
          page.replication === replication
        );
        const reactCommit = median(reactPage.samples.map((sample: any) => sample.commitMs));
        const armCommit = median(armPage.samples.map((sample: any) => sample.commitMs));
        const frameSaving = reactCommit - armCommit;
        if (frameSaving > 0) {
          pairedFrames.push(
            Math.max(0, armPage.mountMs - reactPage.mountMs) / frameSaving,
          );
        }
      }
      console.log(
        `${count} | ${arm} | ${pairedFrames.length ? median(pairedFrames).toFixed(1) : "no frame saving in paired pages"}`,
      );
    }
  }

  const colors: Record<string, string> = {
    react: "#d97706",
    runtime: "#2563eb",
    "generated-vdom": "#7c3aed",
    generated: "#059669",
    direct: "#6b7280",
  };
  const labels: Record<string, string> = {
    react: "React + Compiler",
    runtime: "Retained VDOM",
    "generated-vdom": "OXC CSR through VDOM",
    generated: "OXC repeated host",
    direct: "Direct DOM",
  };
  const valuesFor = (row: any, metric: "commit" | "mount" | "raf") =>
    metric === "commit"
      ? row.pageMedians
      : metric === "mount"
      ? row.mountValues
      : row.pageRafP95s;
  const chart = (title: string, metric: "commit" | "mount" | "raf") => {
    const width = 1080, height = 450, left = 86, right = 34, top = 55, bottom = 82;
    const chartHeight = height - top - bottom, chartWidth = width - left - right;
    const all = counts.flatMap((count) => arms.flatMap((arm) => {
      const row = rows.get(`${count}/${arm}`)!;
      return valuesFor(row, metric);
    }));
    const yMax = Math.max(0.1, Math.ceil(Math.max(...all) * 1.15 * 10) / 10);
    const xAt = (index: number) => left + chartWidth * index / (counts.length - 1);
    const yAt = (value: number) => top + chartHeight * (1 - value / yMax);
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif">`,
      `<title>${title}</title>`,
      `<text x="${width / 2}" y="28" text-anchor="middle" fill="#111827" font-size="18" font-weight="650">${title}</text>`,
    ];
    for (let tick = 0; tick <= 5; tick++) {
      const value = yMax * tick / 5, y = yAt(value);
      parts.push(
        `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e5e7eb"/><text x="${left - 12}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="11">${value.toFixed(1)}</text>`,
      );
    }
    parts.push(
      `<text x="20" y="${top + chartHeight / 2}" text-anchor="middle" transform="rotate(-90 20 ${top + chartHeight / 2})" fill="#4b5563" font-size="12">Milliseconds</text>`,
    );
    counts.forEach((count, index) => parts.push(
      `<text x="${xAt(index)}" y="${height - 43}" text-anchor="middle" fill="#4b5563" font-size="12">${count}</text>`,
    ));
    for (const arm of arms) {
      const points = counts.map((count, index) => {
        const row = rows.get(`${count}/${arm}`)!;
        const values = valuesFor(row, metric);
        return {
          x: xAt(index), y: yAt(median(values)),
          low: yAt(Math.min(...values)), high: yAt(Math.max(...values)),
        };
      });
      parts.push(
        `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(" ")}" fill="none" stroke="${colors[arm]}" stroke-width="2.5"/>`,
      );
      for (const point of points) parts.push(
        `<line x1="${point.x}" y1="${point.low}" x2="${point.x}" y2="${point.high}" stroke="${colors[arm]}" stroke-width="1.5"/><circle cx="${point.x}" cy="${point.y}" r="4" fill="${colors[arm]}"/>`,
      );
    }
    const legendWidth = chartWidth / arms.length;
    arms.forEach((arm, index) => {
      const x = left + legendWidth * index + 2;
      parts.push(
        `<line x1="${x}" y1="${height - 22}" x2="${x + 18}" y2="${height - 22}" stroke="${colors[arm]}" stroke-width="3"/><text x="${x + 25}" y="${height - 18}" fill="#374151" font-size="10">${labels[arm]}</text>`,
      );
    });
    parts.push(
      `<text x="${width / 2}" y="${height - 3}" text-anchor="middle" fill="#6b7280" font-size="9">Points show medians across five page-level summaries; whiskers show min–max across page replications.</text></svg>`,
    );
    return parts.join("");
  };
  await Deno.jupyter.display(
    Deno.jupyter.svg`${chart("Snake V5 · update-to-commit per frame", "commit")}`,
  );
  await Deno.jupyter.display(
    Deno.jupyter.svg`${chart("Snake V5 · mount-to-first-commit cost", "mount")}`,
  );
  await Deno.jupyter.display(
    Deno.jupyter.svg`${chart("Snake V5 · RAF interval p95", "raf")}`,
  );
}
