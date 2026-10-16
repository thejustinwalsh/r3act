const prereg = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-preregistration.json",
));
const manifest = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-manifest.json",
));
const lock = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-source-lock.json",
));
const snapshot = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-source-snapshot-manifest.json",
));
const replay = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-replay-verification.json",
));
if (
  prereg.status !== "PREREGISTERED" || prereg.cases.length !== 720 ||
  manifest.status !== "PASS" || manifest.caseCount !== 720 ||
  manifest.replicationCount !== 5 || manifest.measuredUpdates !== 57600 ||
  manifest.warmupUpdates !== 21600 || lock.status !== "FROZEN_BEFORE_COLLECTION" ||
  snapshot.status !== "PASS" || snapshot.files.length !== lock.files.length ||
  replay.status !== "PASS" || replay.caseCount !== 720 ||
  replay.batchCount !== 79200 || replay.entityChecks !== 141926400 ||
  !replay.allOutputAndIdentityChecksPass
) throw new Error("Columnar dispatch study registration or manifest is incomplete");
const sha256 = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
for (const entry of lock.files) {
  const bytes = await Deno.readFile(`${snapshot.snapshotRoot}/${entry.path}`);
  if (bytes.byteLength !== entry.bytes || await sha256(bytes) !== entry.sha256) {
    throw new Error(`Archived source hash mismatch: ${entry.path}`);
  }
}
for (const dependency of snapshot.supplementalDependencies ?? []) {
  const bytes = await Deno.readFile(`${snapshot.snapshotRoot}/${dependency.snapshotPath}`);
  if (bytes.byteLength !== dependency.bytes || await sha256(bytes) !== dependency.sha256) {
    throw new Error(`Supplemental dependency hash mismatch: ${dependency.sourcePath}`);
  }
}
const records: any[] = [];
for (const entry of manifest.files) {
  const bytes = await Deno.readFile(`results/${entry.path}`);
  if (await sha256(bytes) !== entry.sha256) throw new Error(`Raw replication hash mismatch: ${entry.path}`);
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (record.status !== "PASS" || !record.allContractsPass || record.cases.length !== 144) {
    throw new Error(`Replication record contract failed: ${entry.path}`);
  }
  records.push(record);
}
const cells = records.flatMap((record) => record.cases);
const strategies = ["dense-scan", "dirty-rows", "bucket-32", "bucket-128"];
const sizes = [256, 1024, 4096];
const densities = [1, 5, 10, 25, 50, 100];
const localities = ["clustered", "scattered"];
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summaries: any[] = [];
for (const size of sizes) for (const dirtyPercent of densities) for (const locality of localities) {
  const row: any = { size, dirtyPercent, locality };
  for (const strategy of strategies) {
    const matches = cells.filter((cell: any) =>
      cell.size === size && cell.dirtyPercent === dirtyPercent &&
      cell.locality === locality && cell.strategy === strategy
    );
    if (matches.length !== 5) throw new Error(`Missing replication pair: ${size}/${dirtyPercent}/${locality}/${strategy}`);
    row[strategy] = median(matches.map((cell: any) => cell.medianMs * 1000));
    row[`${strategy}P95`] = median(matches.map((cell: any) => cell.p95Ms * 1000));
    row[`${strategy}Mount`] = median(matches.map((cell: any) => cell.mountMs));
  }
  summaries.push(row);
}
console.log("Deno MemoryVDOM mechanism study; median per-update elapsed microseconds across five fresh processes");
console.log("size | dirty% | locality | dense scan | dirty rows | bucket 32 | bucket 128");
for (const row of summaries) {
  console.log(`${row.size} | ${row.dirtyPercent} | ${row.locality} | ${row["dense-scan"].toFixed(2)} | ${row["dirty-rows"].toFixed(2)} | ${row["bucket-32"].toFixed(2)} | ${row["bucket-128"].toFixed(2)}`);
}
console.log("Paired dispatch ratios vs dense scan (lower is faster), pooled across sizes/densities/localities");
for (const strategy of strategies.slice(1)) {
  const ratios: number[] = [];
  let wins = 0;
  for (let replication = 1; replication <= 5; replication++) {
    for (const size of sizes) for (const dirtyPercent of densities) for (const locality of localities) {
      const candidate = cells.find((cell: any) => cell.replication === replication && cell.size === size && cell.dirtyPercent === dirtyPercent && cell.locality === locality && cell.strategy === strategy);
      const baseline = cells.find((cell: any) => cell.replication === replication && cell.size === size && cell.dirtyPercent === dirtyPercent && cell.locality === locality && cell.strategy === "dense-scan");
      const ratio = candidate.medianMs / baseline.medianMs;
      ratios.push(ratio);
      if (ratio < 1) wins++;
    }
  }
  console.log(`${strategy} | median ratio ${median(ratios).toFixed(3)}× | ${wins}/${ratios.length} paired cases faster`);
}
console.log("Per-size/locality dirty-row crossover by dirty percentage (paired median ratio vs dense scan)");
for (const size of sizes) for (const locality of localities) {
  const values = densities.map((dirtyPercent) => {
    const ratios = [];
    for (let replication = 1; replication <= 5; replication++) {
      const candidate = cells.find((cell: any) => cell.replication === replication && cell.size === size && cell.dirtyPercent === dirtyPercent && cell.locality === locality && cell.strategy === "dirty-rows");
      const baseline = cells.find((cell: any) => cell.replication === replication && cell.size === size && cell.dirtyPercent === dirtyPercent && cell.locality === locality && cell.strategy === "dense-scan");
      ratios.push(candidate.medianMs / baseline.medianMs);
    }
    return `${dirtyPercent}%=${median(ratios).toFixed(2)}×`;
  });
  console.log(`${size} | ${locality} | ${values.join(" ")}`);
}

const colors: Record<string, string> = {
  "dense-scan": "#a04b3a", "dirty-rows": "#176b58",
  "bucket-32": "#3159b5", "bucket-128": "#935eaa",
};
const plot = (size: number) => {
  const width = 1000, height = 430, left = 82, right = 24, top = 70, bottom = 64;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const selected = summaries.filter((row) => row.size === size);
  const maximum = Math.max(...selected.flatMap((row) => strategies.map((strategy) => row[strategy]))) * 1.12;
  const x = (index: number) => left + chartWidth * index / (densities.length - 1);
  const y = (value: number) => top + chartHeight - chartHeight * value / maximum;
  const grid = Array.from({ length: 5 }, (_, index) => {
    const value = maximum * index / 4;
    return `<line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" stroke="#e2e8f0"/><text x="${left-10}" y="${y(value)+4}" text-anchor="end" fill="#58616b" font-size="11">${value.toFixed(1)}</text>`;
  }).join("");
  const lines = localities.flatMap((locality) => strategies.map((strategy) => {
    const values = densities.map((density) => selected.find((row) => row.dirtyPercent === density && row.locality === locality)[strategy]);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    const dash = locality === "scattered" ? " stroke-dasharray=\"6 4\"" : "";
    const dots = values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="3" fill="white" stroke="${colors[strategy]}" stroke-width="2"/>`).join("");
    return `<polyline points="${points}" fill="none" stroke="${colors[strategy]}" stroke-width="2.5"${dash}/>${dots}`;
  })).join("");
  const labels = densities.map((density, index) => `<text x="${x(index)}" y="${height-31}" text-anchor="middle" fill="#46515c" font-size="12">${density}%</text>`).join("");
  const legend = strategies.map((strategy, index) => `<line x1="${left+index*213}" x2="${left+25+index*213}" y1="24" y2="24" stroke="${colors[strategy]}" stroke-width="3"/><text x="${left+32+index*213}" y="28" fill="#303944" font-size="11">${strategy}</text>`).join("");
  const localityLegend = `<line x1="${left}" x2="${left+26}" y1="47" y2="47" stroke="#56616b" stroke-width="2.5"/><text x="${left+32}" y="51" fill="#303944" font-size="11">clustered</text><line x1="${left+120}" x2="${left+146}" y1="47" y2="47" stroke="#56616b" stroke-width="2.5" stroke-dasharray="6 4"/><text x="${left+152}" y="51" fill="#303944" font-size="11">scattered</text>`;
  return Deno.jupyter.svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${size} entity dirty dispatch cost by dirty density" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${size} entity dirty dispatch cost by dirty density</title><rect width="100%" height="100%" fill="white"/>${legend}${localityLegend}${grid}<line x1="${left}" x2="${left}" y1="${top}" y2="${top+chartHeight}" stroke="#94a3b8"/><line x1="${left}" x2="${width-right}" y1="${top+chartHeight}" y2="${top+chartHeight}" stroke="#94a3b8"/>${labels}${lines}<text x="${width/2}" y="${height-6}" text-anchor="middle" fill="#58616b" font-size="11">Dirty entities (%)</text><text x="18" y="${height/2}" transform="rotate(-90 18 ${height/2})" text-anchor="middle" fill="#58616b" font-size="11">Median update elapsed (µs)</text></svg>`;
};
for (const size of sizes) await Deno.jupyter.display(plot(size));
