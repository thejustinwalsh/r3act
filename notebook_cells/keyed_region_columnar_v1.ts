const columnarReplications = await Promise.all([1, 2, 3].map(async (replication) =>
  JSON.parse(await Deno.readTextFile(
    `results/keyed-region-columnar-layout-v1/replication-${replication}.json`,
  ))
));
const columnarSummary = JSON.parse(await Deno.readTextFile(
  "results/keyed-region-columnar-layout-v1/summary.json",
));
const columnarArms = [
  { id: "array-map", label: "Indexed array", color: "#475569" },
  { id: "object-buckets", label: "Object buckets", color: "#059669" },
  { id: "columnar-buckets", label: "Parallel arrays", color: "#d97706" },
];
if (
  columnarReplications.length !== 3 ||
  columnarReplications.some((run: any) =>
    run.schemaVersion !== "keyed-region-columnar-layout-v1" ||
    run.status !== "PASS" || run.measuredOperationsPerArm !== 315
  ) || columnarSummary.status !== "EXPLORATORY_PASS"
) throw new Error("Columnar keyed-region replication contract failed");
const columnarPlot = () => {
  const width = 980, height = 440, left = 90, right = 28, top = 56, bottom = 82;
  const scenarios = ["head-to-tail", "middle-to-tail", "full-sequential-scan"];
  const labels = ["Head move", "Middle move", "Full scan"];
  const floor = 0.0001, ceiling = 2;
  const y = (value: number) => top + (height - top - bottom) *
    (Math.log10(ceiling) - Math.log10(Math.max(floor, value))) /
    (Math.log10(ceiling) - Math.log10(floor));
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="50,000-row keyed-region layout times on logarithmic scale"><title>50,000-row keyed region layout · median time</title><rect width="100%" height="100%" fill="white"/>`,
    `<text x="${left}" y="25" font-size="16" font-weight="700" fill="#1f2937">50,000 rows · median time · log milliseconds</text>`,
  ];
  for (const tick of [0.0001, 0.001, 0.01, 0.1, 1]) {
    const yy = y(tick);
    parts.push(`<line x1="${left}" x2="${width - right}" y1="${yy}" y2="${yy}" stroke="#e2e8f0"/><text x="${left - 12}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#64748b">${tick} ms</text>`);
  }
  const groupWidth = (width - left - right) / scenarios.length;
  const barWidth = 34;
  scenarios.forEach((scenario, scenarioIndex) => {
    const cell = columnarSummary.cells.find((entry: any) =>
      entry.size === 50000 && entry.scenario === scenario
    );
    if (!cell) throw new Error(`Missing 50k scenario: ${scenario}`);
    const start = left + groupWidth * scenarioIndex;
    columnarArms.forEach((arm, armIndex) => {
      const value = cell.arms[arm.id].medianOfProcessMediansMs;
      const x = start + groupWidth / 2 - 1.5 * barWidth + armIndex * barWidth;
      const yy = y(value);
      parts.push(`<rect x="${x}" y="${yy}" width="${barWidth - 4}" height="${top + (height - top - bottom) - yy}" fill="${arm.color}"><title>${labels[scenarioIndex]} · ${arm.label}: ${value.toFixed(4)} ms</title></rect>`);
    });
    parts.push(`<text x="${start + groupWidth / 2}" y="${height - bottom + 22}" text-anchor="middle" font-size="12" fill="#475569">${labels[scenarioIndex]}</text>`);
  });
  columnarArms.forEach((arm, index) => {
    const x = left + index * 205;
    parts.push(`<rect x="${x}" y="${height - 25}" width="12" height="12" fill="${arm.color}"/><text x="${x + 18}" y="${height - 15}" font-size="11" fill="#334155">${arm.label}</text>`);
  });
  parts.push("</svg>");
  return Deno.jupyter.svg`${parts.join("")}`;
};
console.log(JSON.stringify({
  replications: columnarSummary.replications,
  aggregation: columnarSummary.aggregation,
  size: 50000,
  mediansMs: columnarSummary.cells.filter((entry: any) => entry.size === 50000)
    .map((entry: any) => ({
      scenario: entry.scenario,
      ...Object.fromEntries(columnarArms.map((arm) => [
        arm.id,
        entry.arms[arm.id].medianOfProcessMediansMs,
      ])),
    })),
  limitations: columnarSummary.limitations,
}, null, 2));
await Deno.jupyter.display(columnarPlot());
