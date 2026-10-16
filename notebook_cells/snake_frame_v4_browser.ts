type Arm = "react" | "runtime" | "generated" | "direct";
type Sample = {
  intervalMs: number;
  updateCpuMs: number;
  commitMs: number | null;
};
type Page = {
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
  browser: {
    userAgent: string;
    visibilityState: string;
    devicePixelRatio: number;
    viewport: { width: number; height: number };
    hardwareConcurrency: number | null;
  };
  allOutputMatches: boolean;
  stableNodeCount: boolean;
  stableNodeIdentity: boolean;
  samples: Sample[];
};
const counts = [32, 128, 512, 1024];
const arms: Arm[] = ["react", "runtime", "generated", "direct"];
const manifest = JSON.parse(
  await Deno.readTextFile("results/browser-snake-frame-v4-manifest.json"),
);
if (
  manifest.schemaVersion !== "snake-frame-browser-v4-manifest-v1" ||
  manifest.status !== "PASS" || manifest.pageLoads !== 64 ||
  manifest.measuredSamples !== 19200 || manifest.files.length !== 64
) {
  throw new Error("Snake V4 manifest is missing or incomplete");
}
const pages: Page[] = [];
for (const entry of manifest.files) {
  const bytes = await Deno.readFile("results/" + entry.file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (hash !== entry.sha256) {
    throw new Error("SHA-256 mismatch for " + entry.file);
  }
  const page = JSON.parse(new TextDecoder().decode(bytes)) as Page;
  if (
    page.pageLoadId !== entry.pageLoadId || page.trialId !== entry.trialId ||
    page.arm !== entry.arm || page.segmentCount !== entry.segmentCount ||
    page.measuredFrames !== entry.sampleCount
  ) throw new Error("Manifest metadata mismatch for " + entry.file);
  pages.push(page);
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
const cellPages = (count: number, arm: Arm) =>
  pages.filter((page) => page.segmentCount === count && page.arm === arm);
const valid = pages.length === 64 &&
  pages.every((page) =>
    page.schemaVersion === "snake-frame-browser-v4" && page.status === "PASS" &&
    page.allContractsPass && page.warmupFrames === 90 &&
    page.measuredFrames === 300 &&
    page.completeCommitCoverage && page.samples.length === 300 &&
    page.browser.visibilityState === "visible" &&
    page.reactVersion === manifest.environment.reactVersion &&
    page.browser.userAgent === manifest.environment.userAgent &&
    page.allOutputMatches && page.stableNodeCount && page.stableNodeIdentity &&
    page.samples.every((sample) =>
      Number.isFinite(sample.intervalMs) && sample.intervalMs > 0 &&
      Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
      Number.isFinite(sample.commitMs) && (sample.commitMs ?? -1) >= 0
    )
  );
const unique = new Set(pages.map((page) => page.pageLoadId)).size === 64;
const balanced = counts.every((count) =>
  arms.every((arm) => cellPages(count, arm).length === 4)
);
if (!valid || !unique || !balanced) {
  throw new Error("Snake V4 record contract failed");
}

type Metric = { median: number; p95: number; pageMedians: number[] };
const metric = (
  count: number,
  arm: Arm,
  project: (sample: Sample) => number,
): Metric => {
  const selected = cellPages(count, arm);
  const pageMedians = selected.map((page) => median(page.samples.map(project)));
  const pageP95s = selected.map((page) =>
    percentile(page.samples.map(project), 0.95)
  );
  return { median: median(pageMedians), p95: median(pageP95s), pageMedians };
};
const updates = new Map<string, Metric>();
const commits = new Map<string, Metric>();
const intervals = new Map<string, Metric>();
for (const count of counts) {
  for (const arm of arms) {
    const key = count + "/" + arm;
    updates.set(key, metric(count, arm, (sample) => sample.updateCpuMs));
    commits.set(key, metric(count, arm, (sample) => sample.commitMs!));
    intervals.set(key, metric(count, arm, (sample) => sample.intervalMs));
  }
}
console.log(
  "SHA-256 validated " + pages.length + " page loads × 300 RAFs = " +
    (pages.length * 300) + " samples; four replications per arm and size.",
);
console.log(
  "Environment: " + manifest.environment.userAgent + "; " +
    manifest.environment.viewport.width + "×" +
    manifest.environment.viewport.height +
    "; DPR " + manifest.environment.devicePixelRatio + "; React " +
    manifest.environment.reactVersion + ".",
);
console.log(
  "segments | arm | update CPU median/p95 ms | update-to-commit median/p95 ms | RAF interval p95 ms",
);
for (const count of counts) {
  for (const arm of arms) {
    const key = count + "/" + arm;
    const update = updates.get(key)!;
    const commit = commits.get(key)!;
    const rafPages = cellPages(count, arm).map((page) =>
      percentile(page.samples.map((sample) => sample.intervalMs), 0.95)
    );
    console.log(
      count + " | " + arm + " | " + update.median.toFixed(3) + "/" +
        update.p95.toFixed(3) + " | " + commit.median.toFixed(3) + "/" +
        commit.p95.toFixed(3) + " | " + median(rafPages).toFixed(3),
    );
  }
}

const width = 1040, height = 430, left = 84, right = 28, top = 58, bottom = 62;
const chartHeight = height - top - bottom, chartWidth = width - left - right;
const max = Math.max(
  ...[...commits.values()].flatMap((value) => value.pageMedians),
);
const yMax = Math.max(1, Math.ceil(max * 1.2));
const xAt = (index: number) => left + chartWidth * index / (counts.length - 1);
const yAt = (value: number) => top + chartHeight * (1 - value / yMax);
const colors: Record<Arm, string> = {
  react: "#d97706",
  runtime: "#2563eb",
  generated: "#059669",
  direct: "#6b7280",
};
const svg: string[] = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="' + height +
  '" viewBox="0 0 ' + width + " " + height +
  '" role="img" aria-labelledby="snake-v4-title snake-v4-desc" style="max-width:100%;height:auto;font-family:system-ui,sans-serif">',
  '<title id="snake-v4-title">V4 OXC-generated per-frame binding comparison</title>',
  '<desc id="snake-v4-desc">Median update-to-commit time by segment count for four arms, with min-max page medians across four replications.</desc>',
  '<text x="' + width / 2 +
  '" y="28" text-anchor="middle" fill="#111827" font-size="18" font-weight="650">OXC-generated Snake updates · update-to-commit</text>',
];
for (let tick = 0; tick <= 5; tick++) {
  const value = yMax * tick / 5, y = yAt(value);
  svg.push(
    '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) +
      '" y2="' + y + '" stroke="#e5e7eb"/><text x="' + (left - 12) + '" y="' +
      (y + 4) + '" text-anchor="end" fill="#6b7280" font-size="11">' +
      value.toFixed(1) + "</text>",
  );
}
svg.push(
  '<text x="20" y="' + (top + chartHeight / 2) +
    '" text-anchor="middle" transform="rotate(-90 20 ' +
    (top + chartHeight / 2) +
    ')" fill="#4b5563" font-size="12">Milliseconds</text>',
);
for (let i = 0; i < counts.length; i++) {
  svg.push(
    '<text x="' + xAt(i) + '" y="' + (height - 34) +
      '" text-anchor="middle" fill="#4b5563" font-size="12">' + counts[i] +
      "</text>",
  );
}
for (const arm of arms) {
  const points = counts.map((count, index) => {
    const values = commits.get(count + "/" + arm)!.pageMedians;
    return {
      x: xAt(index),
      y: yAt(median(values)),
      low: yAt(Math.min(...values)),
      high: yAt(Math.max(...values)),
    };
  });
  svg.push(
    '<polyline points="' + points.map((point) =>
      point.x + "," + point.y
    ).join(" ") +
      '" fill="none" stroke="' + colors[arm] + '" stroke-width="2.5"/>',
  );
  for (const point of points) {
    svg.push(
      '<line x1="' + point.x + '" y1="' + point.low +
        '" x2="' + point.x + '" y2="' + point.high + '" stroke="' +
        colors[arm] +
        '" stroke-width="1.5"/><circle cx="' + point.x + '" cy="' + point.y +
        '" r="4" fill="' + colors[arm] + '"/>',
    );
  }
}
for (let i = 0; i < arms.length; i++) {
  const arm = arms[i], x = 250 + i * 165;
  const label = arm === "react"
    ? "React + Compiler"
    : arm === "runtime"
    ? "Retained VDOM"
    : arm === "generated"
    ? "OXC generated"
    : "Direct DOM";
  svg.push(
    '<line x1="' + x + '" y1="405" x2="' + (x + 22) + '" y2="405" stroke="' +
      colors[arm] + '" stroke-width="3"/><text x="' + (x + 30) +
      '" y="409" fill="#374151" font-size="12">' + label + "</text>",
  );
}
svg.push(
  '<text x="' + width / 2 +
    '" y="426" text-anchor="middle" fill="#6b7280" font-size="10">Error bars show min–max page medians; setup excluded; one Chrome 154 device.</text></svg>',
);
Deno.jupyter.svg`${svg.join("")}`;
