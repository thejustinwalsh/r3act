const bucketV2Manifest = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v2-manifest.json",
));
if (
  bucketV2Manifest.schemaVersion !== "keyed-region-buckets-v2-manifest" ||
  bucketV2Manifest.status !== "PASS" || bucketV2Manifest.sampleCount !== 315 ||
  !bucketV2Manifest.allRunsPassedOrderAndIntegrityChecks
) throw new Error("Keyed-region buckets V2 manifest contract failed");
for (const entry of bucketV2Manifest.entries) {
  const bytes = await Deno.readFile(entry.path);
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.length !== entry.bytes || sha256 !== entry.sha256) {
    throw new Error(`Keyed-region buckets V2 input changed: ${entry.path}`);
  }
}
const bucketV2Data = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v2.json",
));
const bucketV2Prereq = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-buckets-v2-preregistration.json",
));
if (
  bucketV2Data.samples.length !== 315 ||
  bucketV2Data.samples.some((sample: any) =>
    !Number.isFinite(sample.elapsedMs) || sample.elapsedMs < 0
  )
) throw new Error("Keyed-region buckets V2 samples are invalid");
const bucketV2Arms = [
  { id: "indexed-array", label: "Indexed array", capacity: null, color: "#475569" },
  { id: "bucketed", label: "B32", capacity: 32, color: "#2563eb" },
  { id: "bucketed", label: "B64", capacity: 64, color: "#059669" },
  { id: "bucketed", label: "B128", capacity: 128, color: "#d97706" },
  { id: "bucketed", label: "B256", capacity: 256, color: "#9333ea" },
];
const bucketV2Quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
};
const bucketV2Summary = (size: number, locality: string, arm: typeof bucketV2Arms[number]) => {
  const samples = bucketV2Data.samples.filter((sample: any) =>
    sample.size === size && sample.locality === locality && sample.arm === arm.id &&
    sample.bucketCapacity === arm.capacity
  );
  if (samples.length !== bucketV2Data.measuredSamples) {
    throw new Error(`Missing V2 samples for ${size}/${locality}/${arm.label}`);
  }
  return {
    samples,
    p50: bucketV2Quantile(samples.map((sample: any) => sample.elapsedMs), 0.5),
    p95: bucketV2Quantile(samples.map((sample: any) => sample.elapsedMs), 0.95),
  };
};
const bucketV2Table = [];
for (const size of bucketV2Data.sizes) {
  for (const locality of bucketV2Data.localities) {
    for (const arm of bucketV2Arms) {
      const summary = bucketV2Summary(size, locality, arm);
      const work = arm.id === "indexed-array"
        ? {
          indexWritesPerMove: bucketV2Quantile(
            summary.samples.map((sample: any) => sample.indexWrites / bucketV2Data.operationsPerSample), 0.5,
          ),
          rowShiftsPerMove: bucketV2Quantile(
            summary.samples.map((sample: any) => sample.rowShifts / bucketV2Data.operationsPerSample), 0.5,
          ),
        }
        : {
          bucketReadsPerMove: bucketV2Quantile(
            summary.samples.map((sample: any) => sample.bucketSlotReads / bucketV2Data.operationsPerSample), 0.5,
          ),
          bucketWritesPerMove: bucketV2Quantile(
            summary.samples.map((sample: any) => sample.bucketSlotWrites / bucketV2Data.operationsPerSample), 0.5,
          ),
          splits: bucketV2Quantile(summary.samples.map((sample: any) => sample.splits), 0.5),
          merges: bucketV2Quantile(summary.samples.map((sample: any) => sample.merges), 0.5),
        };
      bucketV2Table.push({
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
  question: bucketV2Prereq.question,
  claimBoundary: bucketV2Prereq.claimBoundary,
  environment: { deno: bucketV2Data.deno, platform: bucketV2Data.platform, collectedAt: bucketV2Data.collectedAt },
  protocol: bucketV2Prereq.workload,
  p95Note: "Nearest-rank p95 over seven samples is the maximum, not a stable tail estimate.",
  summary: bucketV2Table,
}, null, 2));

const bucketV2Plot = (locality: string) => {
  const width = 920, height = 410, left = 76, right = 26, top = 54, bottom = 70;
  const chartHeight = height - top - bottom, chartWidth = width - left - right;
  const floor = 0.01, ceiling = 200;
  const logMin = Math.log10(floor), logMax = Math.log10(ceiling);
  const y = (value: number) => top + chartHeight -
    (Math.log10(Math.max(floor, value)) - logMin) / (logMax - logMin) * chartHeight;
  const sizes = bucketV2Data.sizes as number[];
  const groupWidth = chartWidth / sizes.length;
  const barWidth = Math.min(15, groupWidth / (bucketV2Arms.length * 1.7));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Indexed-array and bucketed ordered move time for ${locality} locality; logarithmic milliseconds scale"><title>Indexed array versus keyed buckets · ${locality} edits</title><rect width="100%" height="100%" fill="white"/>`,
    `<text x="${left}" y="25" font-size="16" font-weight="700" fill="#1f2937">${locality[0].toUpperCase()}${locality.slice(1)} edits · median and p95 · log scale</text>`,
  ];
  for (const tick of [0.01, 0.1, 1, 10, 100, 200]) {
    const yy = y(tick);
    parts.push(`<line x1="${left}" x2="${width - right}" y1="${yy}" y2="${yy}" stroke="#e2e8f0"/><text x="${left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#64748b">${tick} ms</text>`);
  }
  sizes.forEach((size, sizeIndex) => {
    const groupStart = left + groupWidth * sizeIndex;
    bucketV2Arms.forEach((arm, armIndex) => {
      const summary = bucketV2Summary(size, locality, arm);
      const x = groupStart + (groupWidth - bucketV2Arms.length * barWidth) / 2 + armIndex * barWidth;
      const p50Y = y(summary.p50), p95Y = y(summary.p95), center = x + (barWidth - 2) / 2;
      parts.push(`<rect x="${x}" y="${p50Y}" width="${barWidth - 2}" height="${top + chartHeight - p50Y}" fill="${arm.color}"><title>${size} rows · ${locality} · ${arm.label}: p50 ${summary.p50.toFixed(4)} ms; p95 ${summary.p95.toFixed(4)} ms</title></rect><line x1="${center}" x2="${center}" y1="${p95Y}" y2="${p50Y}" stroke="#111827" stroke-width="1.5"/><line x1="${center - 3}" x2="${center + 3}" y1="${p95Y}" y2="${p95Y}" stroke="#111827"/>`);
    });
    parts.push(`<text x="${groupStart + groupWidth / 2}" y="${top + chartHeight + 20}" text-anchor="middle" font-size="12" fill="#475569">${size.toLocaleString()} rows</text>`);
  });
  bucketV2Arms.forEach((arm, index) => {
    const x = left + index * 144;
    parts.push(`<rect x="${x}" y="${height - 25}" width="12" height="12" fill="${arm.color}"/><text x="${x + 18}" y="${height - 15}" font-size="11" fill="#334155">${arm.label}</text>`);
  });
  parts.push("</svg>");
  return Deno.jupyter.svg`${parts.join("")}`;
};
for (const locality of bucketV2Data.localities) await Deno.jupyter.display(bucketV2Plot(locality));
