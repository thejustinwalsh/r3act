const bucketV1Manifest = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v1-manifest.json",
));
if (
  bucketV1Manifest.schemaVersion !== "keyed-region-buckets-v1-manifest" ||
  bucketV1Manifest.status !== "PASS" ||
  bucketV1Manifest.sampleCount !== 315 ||
  !bucketV1Manifest.allRunsPassedOrderAndIntegrityChecks
) throw new Error("Keyed-region buckets manifest contract failed");
for (const entry of bucketV1Manifest.entries) {
  const bytes = await Deno.readFile(entry.path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.length !== entry.bytes || sha256 !== entry.sha256) {
    throw new Error(`Keyed-region buckets input changed: ${entry.path}`);
  }
}
const bucketV1Data = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v1.json",
));
const bucketV1Prereq = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v1-preregistration.json",
));
if (
  bucketV1Data.samples.length !== bucketV1Manifest.sampleCount ||
  bucketV1Data.samples.some((sample: any) =>
    !Number.isFinite(sample.elapsedMs) || sample.elapsedMs < 0
  )
) throw new Error("Keyed-region buckets raw sample validation failed");
const bucketV1Arms = [
  { id: "flat-array", label: "Flat array", capacity: null, color: "#475569" },
  { id: "bucketed", label: "B 32", capacity: 32, color: "#2563eb" },
  { id: "bucketed", label: "B 64", capacity: 64, color: "#059669" },
  { id: "bucketed", label: "B 128", capacity: 128, color: "#d97706" },
  { id: "bucketed", label: "B 256", capacity: 256, color: "#9333ea" },
];
const bucketV1Quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const bucketV1Summary = (size: number, locality: string, arm: typeof bucketV1Arms[number]) => {
  const rows = bucketV1Data.samples.filter((sample: any) =>
    sample.size === size && sample.locality === locality &&
    sample.arm === arm.id && sample.bucketCapacity === arm.capacity
  );
  if (rows.length !== bucketV1Data.measuredSamples) {
    throw new Error(`Missing samples for ${size}/${locality}/${arm.label}`);
  }
  const p50s = rows.map((sample: any) => sample.elapsedMs);
  return {
    p50: bucketV1Quantile(p50s, 0.5),
    p95: bucketV1Quantile(p50s, 0.95),
    samples: rows,
  };
};
const bucketV1Table = [];
for (const size of bucketV1Data.sizes) {
  for (const locality of bucketV1Data.localities) {
    for (const arm of bucketV1Arms) {
      const summary = bucketV1Summary(size, locality, arm);
      const work = arm.id === "flat-array"
        ? {
          comparisonsPerMove: bucketV1Quantile(
            summary.samples.map((row: any) => row.comparisons / bucketV1Data.operationsPerSample), 0.5,
          ),
          rowShiftsPerMove: bucketV1Quantile(
            summary.samples.map((row: any) => row.rowShifts / bucketV1Data.operationsPerSample), 0.5,
          ),
        }
        : {
          bucketReadsPerMove: bucketV1Quantile(
            summary.samples.map((row: any) => row.bucketSlotReads / bucketV1Data.operationsPerSample), 0.5,
          ),
          bucketWritesPerMove: bucketV1Quantile(
            summary.samples.map((row: any) => row.bucketSlotWrites / bucketV1Data.operationsPerSample), 0.5,
          ),
          splits: bucketV1Quantile(summary.samples.map((row: any) => row.splits), 0.5),
          merges: bucketV1Quantile(summary.samples.map((row: any) => row.merges), 0.5),
        };
      bucketV1Table.push({
        size,
        locality,
        arm: arm.label,
        medianMs: Number(summary.p50.toFixed(4)),
        p95Ms: Number(summary.p95.toFixed(4)),
        ...work,
      });
    }
  }
}
console.log(JSON.stringify({
  question: bucketV1Prereq.question,
  claimBoundary: bucketV1Prereq.claimBoundary,
  environment: {
    deno: bucketV1Data.deno,
    platform: bucketV1Data.platform,
    collectedAt: bucketV1Data.collectedAt,
  },
  protocol: bucketV1Prereq.workload,
  summary: bucketV1Table,
}, null, 2));

const bucketV1Palette = Object.fromEntries(bucketV1Arms.map((arm) => [arm.label, arm.color]));
const bucketV1Plot = (locality: string) => {
  const width = 920;
  const height = 410;
  const left = 76;
  const right = 26;
  const top = 54;
  const bottom = 70;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const floor = 0.01;
  const ceiling = 30;
  const logMin = Math.log10(floor);
  const logMax = Math.log10(ceiling);
  const y = (value: number) => top + chartHeight -
    (Math.log10(Math.max(floor, value)) - logMin) / (logMax - logMin) * chartHeight;
  const sizes = bucketV1Data.sizes as number[];
  const groupWidth = chartWidth / sizes.length;
  const barWidth = Math.min(15, groupWidth / (bucketV1Arms.length * 1.7));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Keyed row move time for ${locality} locality, across list sizes and bucket capacities, on a logarithmic milliseconds axis" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Keyed row move duration · ${locality} locality</title>`,
    `<rect width="100%" height="100%" fill="white"/>`,
    `<text x="${left}" y="25" font-size="16" font-weight="700" fill="#1f2937">${locality[0].toUpperCase()}${locality.slice(1)} edits · median and p95 of seven samples · log scale</text>`,
  ];
  for (const tick of [0.01, 0.1, 1, 10, 30]) {
    const yy = y(tick);
    parts.push(`<line x1="${left}" x2="${width - right}" y1="${yy}" y2="${yy}" stroke="#e2e8f0"/>`);
    parts.push(`<text x="${left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#64748b">${tick} ms</text>`);
  }
  sizes.forEach((size, sizeIndex) => {
    const groupStart = left + groupWidth * sizeIndex;
    bucketV1Arms.forEach((arm, armIndex) => {
      const summary = bucketV1Summary(size, locality, arm);
      const x = groupStart + (groupWidth - bucketV1Arms.length * barWidth) / 2 + armIndex * barWidth;
      const p50Y = y(summary.p50);
      const p95Y = y(summary.p95);
      parts.push(`<rect x="${x}" y="${p50Y}" width="${barWidth - 2}" height="${top + chartHeight - p50Y}" fill="${arm.color}"><title>${size} rows · ${locality} · ${arm.label}: p50 ${summary.p50.toFixed(4)} ms, p95 ${summary.p95.toFixed(4)} ms</title></rect>`);
      const center = x + (barWidth - 2) / 2;
      parts.push(`<line x1="${center}" x2="${center}" y1="${p95Y}" y2="${p50Y}" stroke="#111827" stroke-width="1.5"/><line x1="${center - 3}" x2="${center + 3}" y1="${p95Y}" y2="${p95Y}" stroke="#111827"/>`);
    });
    parts.push(`<text x="${groupStart + groupWidth / 2}" y="${top + chartHeight + 20}" text-anchor="middle" font-size="12" fill="#475569">${size.toLocaleString()} rows</text>`);
  });
  const legendStart = left;
  bucketV1Arms.forEach((arm, index) => {
    const x = legendStart + index * 144;
    parts.push(`<rect x="${x}" y="${height - 25}" width="12" height="12" fill="${arm.color}"/><text x="${x + 18}" y="${height - 15}" font-size="11" fill="#334155">${arm.label}</text>`);
  });
  parts.push("</svg>");
  return Deno.jupyter.svg`${parts.join("")}`;
};
for (const locality of bucketV1Data.localities) {
  await Deno.jupyter.display(bucketV1Plot(locality));
}
