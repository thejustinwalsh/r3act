type Arm = "react" | "runtime" | "direct";
type Sample = {
  intervalMs: number;
  updateCpuMs: number;
  commitMs: number | null;
};
type PageRecord = {
  schemaVersion: string;
  status: string;
  allContractsPass: boolean;
  trialId: string;
  pageLoadId: string;
  arm: Arm;
  segmentCount: number;
  warmupFrames: number;
  measuredFrames: number;
  completeCommitCoverage: boolean;
  reactVersion: string;
  runtimeStrategy: string;
  browser: {
    userAgent: string;
    visibilityState: string;
    devicePixelRatio: number;
    viewport: { width: number; height: number };
    hardwareConcurrency: number | null;
  };
  refreshRateEstimateHz: number;
  allOutputMatches: boolean;
  stableNodeCount: boolean;
  stableNodeIdentity: boolean;
  samples: Sample[];
};

const counts = [32, 128, 512, 1024];
const arms: Arm[] = ["react", "runtime", "direct"];
const raw: PageRecord[] = [];
const manifest = JSON.parse(
  await Deno.readTextFile("results/browser-snake-frame-v3-manifest.json"),
);
if (
  manifest.schemaVersion !== "snake-frame-browser-manifest-v1" ||
  manifest.status !== "PASS" || manifest.pageLoads !== 36 ||
  manifest.measuredSamples !== 10_800 || manifest.files.length !== 36
) throw new Error("Snake V3 manifest is missing or incomplete");
for (const file of manifest.files) {
  const bytes = await Deno.readFile(`results/${file.file}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (sha256 !== file.sha256) {
    throw new Error(`SHA-256 mismatch for ${file.file}`);
  }
  const record = JSON.parse(new TextDecoder().decode(bytes)) as PageRecord;
  if (
    record.pageLoadId !== file.pageLoadId || record.trialId !== file.trialId ||
    record.arm !== file.arm || record.segmentCount !== file.segmentCount ||
    record.measuredFrames !== file.sampleCount
  ) throw new Error(`Manifest metadata mismatch for ${file.file}`);
  raw.push(record);
}
raw.sort((a, b) =>
  a.segmentCount - b.segmentCount || a.arm.localeCompare(b.arm) ||
  a.trialId.localeCompare(b.trialId)
);

const percentile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.max(0, Math.ceil(p * ordered.length) - 1)];
};
const median = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
};

const valid = raw.length === counts.length * arms.length * 3 &&
  raw.every((record) =>
    record.schemaVersion === "snake-frame-browser-v3" &&
    record.status === "PASS" && record.allContractsPass &&
    counts.includes(record.segmentCount) && arms.includes(record.arm) &&
    record.warmupFrames === 90 && record.measuredFrames === 300 &&
    record.completeCommitCoverage &&
    record.samples.length === 300 &&
    record.browser.visibilityState === "visible" &&
    record.reactVersion === manifest.environment.reactVersion &&
    record.browser.userAgent === manifest.environment.browserUserAgent &&
    record.allOutputMatches && record.stableNodeCount &&
    record.stableNodeIdentity &&
    record.samples.every((sample) =>
      Number.isFinite(sample.intervalMs) && sample.intervalMs > 0 &&
      Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
      Number.isFinite(sample.commitMs) && (sample.commitMs ?? -1) >= 0
    )
  );
const uniqueIds =
  new Set(raw.map((record) => record.pageLoadId)).size === raw.length;
const groupRecords = (count: number, arm: Arm) =>
  raw.filter((record) => record.segmentCount === count && record.arm === arm);
const balanced = counts.every((count) =>
  arms.every((arm) => {
    const pages = groupRecords(count, arm);
    return pages.length === 3 &&
      new Set(pages.map((page) => page.trialId)).size === 3;
  })
);
if (!valid || !uniqueIds || !balanced) {
  throw new Error(
    `Snake frame records failed: valid=${valid}, uniqueIds=${uniqueIds}, balanced=${balanced}, records=${raw.length}`,
  );
}

type PageMetric = {
  median: number;
  p95: number;
  values: number[];
  budget60: number;
  budget120: number;
};
type Group = {
  count: number;
  arm: Arm;
  update: PageMetric[];
  commit: PageMetric[];
  raf: PageMetric[];
};
const groups: Group[] = [];
for (const count of counts) {
  for (const arm of arms) {
    const pages = groupRecords(count, arm);
    const metric = (
      project: (sample: Sample) => number | null,
    ): PageMetric[] =>
      pages.map((page) => {
        const values = page.samples.map(project).filter((
          value,
        ): value is number => value !== null);
        return {
          median: median(values),
          p95: percentile(values, 0.95),
          values,
          budget60: values.filter((value) => value > 1000 / 60).length /
            values.length,
          budget120: values.filter((value) => value > 1000 / 120).length /
            values.length,
        };
      });
    groups.push({
      count,
      arm,
      update: metric((sample) => sample.updateCpuMs),
      commit: metric((sample) => sample.commitMs),
      raf: metric((sample) => sample.intervalMs),
    });
  }
}
const group = (count: number, arm: Arm) =>
  groups.find((item) => item.count === count && item.arm === arm)!;
const aggregate = (metrics: PageMetric[], key: "median" | "p95") =>
  median(metrics.map((metric) => metric[key]));
const range = (metrics: PageMetric[], key: "median" | "p95") => {
  const values = metrics.map((metric) => metric[key]);
  return [Math.min(...values), Math.max(...values)] as const;
};

console.log(
  `SHA-256 validated ${raw.length} page loads × 300 measured RAFs = ${
    raw.length * 300
  } samples; 3 pages per arm and size.`,
);
console.log(
  `Environment: ${raw[0].browser.userAgent}; ${raw[0].browser.viewport.width}×${
    raw[0].browser.viewport.height
  }; DPR ${raw[0].browser.devicePixelRatio}; ${
    raw[0].browser.hardwareConcurrency
  } logical CPUs; React ${raw[0].reactVersion}.`,
);
console.log(
  "Summary = median of page medians and median of page p95 values; the page load is the replication unit.",
);
for (const count of counts) {
  for (const arm of arms) {
    const item = group(count, arm);
    console.log(
      `${count}\t${arm}\tupdate ${
        aggregate(item.update, "median").toFixed(3)
      }/${aggregate(item.update, "p95").toFixed(3)} ms\tcommit ${
        aggregate(item.commit, "median").toFixed(3)
      }/${aggregate(item.commit, "p95").toFixed(3)} ms\tRAF p95 ${
        aggregate(item.raf, "p95").toFixed(3)
      } ms`,
    );
  }
}

const color: Record<Arm, string> = {
  react: "#d04a3a",
  runtime: "#2563eb",
  direct: "#6b7280",
};
const width = 1040;
const height = 410;
const chartTop = 78;
const chartBottom = 324;
const chartHeight = chartBottom - chartTop;
const chartLeft = [92, 572];
const chartWidth = 390;
const yMax = 2;
const xPosition = (count: number, offset: number) =>
  offset +
  Math.log2(count / counts[0]) / Math.log2(counts.at(-1)! / counts[0]) *
    chartWidth;
const yPosition = (value: number) =>
  chartBottom - Math.min(value, yMax) / yMax * chartHeight;
const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="snake-title snake-desc" style="max-width:100%;height:auto;display:block;font-family:system-ui,sans-serif">`,
  `<title id="snake-title">Snake frame update timing by body size</title>`,
  `<desc id="snake-desc">Median of three page medians for update CPU and update-to-commit latency, with page-median ranges shown as vertical bars. Browser callback cadence was approximately 60 hertz.</desc>`,
  `<text x="${
    width / 2
  }" y="28" text-anchor="middle" fill="#111827" font-size="18" font-weight="650">32 to 1,024 retained segments · production build · 300 RAF samples per page</text>`,
];
const panels = [
  {
    x: chartLeft[0],
    title: "Update-path JavaScript CPU",
    key: "update" as const,
  },
  {
    x: chartLeft[1],
    title: "Update-to-commit latency",
    key: "commit" as const,
  },
];
for (const panel of panels) {
  svg.push(
    `<text x="${
      panel.x + chartWidth / 2
    }" y="58" text-anchor="middle" fill="#374151" font-size="15" font-weight="600">${panel.title} (ms)</text>`,
  );
  for (const tick of [0, 0.5, 1, 1.5, 2]) {
    const y = yPosition(tick);
    svg.push(
      `<line x1="${panel.x}" y1="${y}" x2="${
        panel.x + chartWidth
      }" y2="${y}" stroke="#e5e7eb"/><text x="${panel.x - 12}" y="${
        y + 4
      }" text-anchor="end" fill="#6b7280" font-size="11">${
        tick.toFixed(1)
      }</text>`,
    );
  }
  for (const count of counts) {
    const x = xPosition(count, panel.x);
    svg.push(
      `<line x1="${x}" y1="${chartTop}" x2="${x}" y2="${chartBottom}" stroke="#f3f4f6"/><text x="${x}" y="${
        chartBottom + 21
      }" text-anchor="middle" fill="#6b7280" font-size="11">${count}</text>`,
    );
  }
  svg.push(
    `<line x1="${panel.x}" y1="${chartBottom}" x2="${
      panel.x + chartWidth
    }" y2="${chartBottom}" stroke="#9ca3af"/><text x="${
      panel.x + chartWidth / 2
    }" y="${
      chartBottom + 42
    }" text-anchor="middle" fill="#6b7280" font-size="11">Visible segments (log₂ scale)</text>`,
  );
  for (const arm of arms) {
    const points = counts.map((count) => {
      const metrics = group(count, arm)[panel.key];
      return {
        x: xPosition(count, panel.x),
        y: yPosition(aggregate(metrics, "median")),
        low: yPosition(Math.min(...metrics.map((metric) => metric.median))),
        high: yPosition(Math.max(...metrics.map((metric) => metric.median))),
      };
    });
    svg.push(
      `<polyline points="${
        points.map((point) => `${point.x},${point.y}`).join(" ")
      }" fill="none" stroke="${color[arm]}" stroke-width="2.5"/>`,
    );
    for (const point of points) {
      svg.push(
        `<line x1="${point.x}" y1="${point.low}" x2="${point.x}" y2="${point.high}" stroke="${
          color[arm]
        }" stroke-width="1.5"/><circle cx="${point.x}" cy="${point.y}" r="4" fill="${
          color[arm]
        }"/>`,
      );
    }
  }
}
for (const [index, arm] of arms.entries()) {
  const x = 370 + index * 130;
  svg.push(
    `<line x1="${x}" y1="382" x2="${x + 24}" y2="382" stroke="${
      color[arm]
    }" stroke-width="3"/><text x="${
      x + 32
    }" y="386" fill="#374151" font-size="12">${
      arm === "react"
        ? "React + Compiler"
        : arm === "runtime"
        ? "Retained binding"
        : "Direct DOM"
    }</text>`,
  );
}
svg.push(
  `<text x="${
    width / 2
  }" y="405" text-anchor="middle" fill="#6b7280" font-size="10">Vertical bars show min–max across three page medians; values below 0.1 ms are near Chrome’s timer resolution.</text>`,
  "</svg>",
);
console.log("\nMarkdown table data (median page median / median page p95):");
console.log(
  "segments | arm | update CPU (ms) | update-to-commit (ms) | RAF interval p95 (ms) | commit CPU > 16.67 / 8.33 ms",
);
for (const count of counts) {
  for (const arm of arms) {
    const item = group(count, arm);
    const exceed = (metrics: PageMetric[], field: "budget60" | "budget120") =>
      `${(100 * median(metrics.map((metric) => metric[field]))).toFixed(1)}%`;
    console.log(
      `${count} | ${arm} | ${aggregate(item.update, "median").toFixed(3)} / ${
        aggregate(item.update, "p95").toFixed(3)
      } | ${aggregate(item.commit, "median").toFixed(3)} / ${
        aggregate(item.commit, "p95").toFixed(3)
      } | ${aggregate(item.raf, "p95").toFixed(3)} | ${
        exceed(item.commit, "budget60")
      } / ${exceed(item.commit, "budget120")}`,
    );
  }
  Deno.jupyter.svg`${svg.join("")}`;
}

console.log(
  "\nExploratory RAF callback tail check (page-level; 25 ms threshold):",
);
console.log(
  "segments | arm | median page p95 interval (ms) | pages with any >25 ms interval | intervals >25 ms / 900",
);
for (const count of counts) {
  for (const arm of arms) {
    const pages = groupRecords(count, arm);
    const pageP95 = pages.map((page) =>
      percentile(page.samples.map((sample) => sample.intervalMs), 0.95)
    );
    const pageTail = pages.map((page) =>
      page.samples.filter((sample) => sample.intervalMs > 25).length
    );
    const totalTail = pageTail.reduce((sum, value) => sum + value, 0);
    const pagesWithTail = pageTail.filter((value) => value > 0).length;
    console.log(
      `${count} | ${arm} | ${
        median(pageP95).toFixed(2)
      } | ${pagesWithTail}/3 | ${totalTail}/900`,
    );
  }
}
const allLongIntervals =
  raw.flatMap((page) => page.samples).filter((sample) => sample.intervalMs > 25)
    .length;
console.log(
  `Across ${
    raw.length * 300
  } measured callbacks, ${allLongIntervals} intervals exceeded 25 ms. This exploratory threshold is not a dropped-frame or presentation measurement.`,
);
