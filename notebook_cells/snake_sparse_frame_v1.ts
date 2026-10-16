const prereg = JSON.parse(
  await Deno.readTextFile("results/snake-sparse-frame-v1-preregistration.json"),
);
const manifest = JSON.parse(
  await Deno.readTextFile("results/snake-sparse-frame-v1-manifest.json"),
);
const lock = JSON.parse(
  await Deno.readTextFile("results/snake-sparse-frame-v1-source-lock.json"),
);
if (
  prereg.status !== "PREREGISTERED" || manifest.status !== "PASS" ||
  manifest.archivedPageLoads !== 288 || manifest.measuredFrames !== 17280 ||
  lock.status !== "FROZEN_BEFORE_COLLECTION_AFTER_AMENDMENT_1"
) throw new Error("Sparse per-frame study is incomplete");
const sha256 = async (bytes: Uint8Array) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((
    byte,
  ) => byte.toString(16).padStart(2, "0")).join("");
for (const file of lock.files) {
  if (await sha256(await Deno.readFile(file.snapshotPath)) !== file.sha256) {
    throw new Error(`Source snapshot mismatch: ${file.path}`);
  }
}
const records: any[] = [];
for (const file of manifest.records) {
  const bytes = await Deno.readFile(
    `results/snake-sparse-frame-v1-production/${file.filename}`,
  );
  if (await sha256(bytes) !== file.sha256) {
    throw new Error(`Raw page hash mismatch: ${file.filename}`);
  }
  const record = JSON.parse(new TextDecoder().decode(bytes));
  if (
    record.status !== "PASS" || record.samples.length !== 60 ||
    !record.allContractsPass
  ) throw new Error(`Page contract failure: ${file.filename}`);
  records.push(record);
}

const arms = [
  "react",
  "dense-vdom",
  "dirty-rows-vdom",
  "bucket-32-vdom",
  "bucket-128-vdom",
  "direct",
];
const armLabels: Record<string, string> = {
  react: "React + Compiler",
  "dense-vdom": "Dense VDOM",
  "dirty-rows-vdom": "Dirty rows",
  "bucket-32-vdom": "32-row buckets",
  "bucket-128-vdom": "128-row buckets",
  direct: "Direct DOM",
};
const colors: Record<string, string> = {
  react: "#ad3f36",
  "dense-vdom": "#d28b27",
  "dirty-rows-vdom": "#146b57",
  "bucket-32-vdom": "#315eb2",
  "bucket-128-vdom": "#8754a4",
  direct: "#58616b",
};
const sizes = [512, 4096],
  densities = [1, 10, 50, 100],
  localities = ["clustered", "scattered"];
const median = (values: number[]) => {
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
};
const quantile = (values: number[], p: number) => {
  const xs = [...values].sort((a, b) => a - b);
  return xs[Math.max(0, Math.ceil(p * xs.length) - 1)];
};
const summaries: any[] = [];
for (const record of records) {
  summaries.push({
    ...record,
    medianUpdateMs: median(
      record.samples.map((sample: any) => sample.updateCpuMs),
    ),
    p95UpdateMs: quantile(
      record.samples.map((sample: any) => sample.updateCpuMs),
      0.95,
    ),
    medianRafMs: median(record.samples.map((sample: any) => sample.intervalMs)),
    p95RafMs: quantile(
      record.samples.map((sample: any) => sample.intervalMs),
      0.95,
    ),
  });
}
const cellRecords = (
  size: number,
  dirtyPercent: number,
  locality: string,
  arm: string,
) =>
  summaries.filter((row) =>
    row.size === size && row.dirtyPercent === dirtyPercent &&
    row.locality === locality && row.arm === arm
  );
console.log(
  "Browser sparse per-frame results; median of three page-level medians, milliseconds. Each page contains 60 measured RAF updates; pages are replication units.",
);
console.log(
  "size | dirty% | locality | React | dense | rows | bucket32 | bucket128 | DOM",
);
for (const size of sizes) {
  for (const density of densities) {
    for (const locality of localities) {
      const values = arms.map((arm) => {
        const matches = cellRecords(size, density, locality, arm);
        if (matches.length !== 3) {
          throw new Error(
            `Expected three page replications for ${size}/${density}/${locality}/${arm}`,
          );
        }
        return median(matches.map((item) => item.medianUpdateMs));
      });
      console.log(
        `${size} | ${density} | ${locality} | ${
          values.map((value) => value.toFixed(3)).join(" | ")
        }`,
      );
    }
  }
}
console.log(
  "Per-page nearest-rank p95 update-plus-commit milliseconds; each cell is the median of three page-level p95s.",
);
console.log(
  "size | dirty% | locality | React | dense | rows | bucket32 | bucket128 | DOM",
);
for (const size of sizes) {
  for (const density of densities) {
    for (const locality of localities) {
      const values = arms.map((arm) => {
        const matches = cellRecords(size, density, locality, arm);
        if (matches.length !== 3) {
          throw new Error(
            `Expected three page replications for ${size}/${density}/${locality}/${arm}`,
          );
        }
        return median(matches.map((item) => item.p95UpdateMs));
      });
      console.log(
        `${size} | ${density} | ${locality} | ${
          values.map((value) => value.toFixed(3)).join(" | ")
        }`,
      );
    }
  }
}
console.log(
  "Median paired update-time ratio to React by candidate across every workload cell and replication; <1 is faster.",
);
for (const arm of arms.slice(1)) {
  const ratios: number[] = [];
  let wins = 0;
  for (const size of sizes) {
    for (const density of densities) {
      for (const locality of localities) {
        for (let replication = 1; replication <= 3; replication++) {
          const candidate = summaries.find((row) =>
            row.size === size && row.dirtyPercent === density &&
            row.locality === locality && row.arm === arm &&
            row.replication === replication
          );
          const baseline = summaries.find((row) =>
            row.size === size && row.dirtyPercent === density &&
            row.locality === locality && row.arm === "react" &&
            row.replication === replication
          );
          if (!candidate || !baseline) {
            throw new Error("Missing paired browser page");
          }
          const ratio = candidate.medianUpdateMs / baseline.medianUpdateMs;
          ratios.push(ratio);
          if (ratio < 1) wins++;
        }
      }
    }
  }
  console.log(
    `${armLabels[arm]} | ${
      median(ratios).toFixed(3)
    }× | ${wins}/${ratios.length} paired pages faster`,
  );
}
console.log(
  "Descriptive timing-floor sensitivity: recorded update-plus-commit samples at or below 0.1 ms by arm. These values are reported, not excluded.",
);
for (const arm of arms) {
  const values = records.filter((row) => row.arm === arm).flatMap((row) =>
    row.samples.map((sample: any) => sample.updateCpuMs)
  );
  console.log(
    `${armLabels[arm]} | ${values.filter((value) => value <= 0).length} at 0 ms | ${values.filter((value) => value <= 0.1).length} at or below 0.1 ms | ${values.length} samples`,
  );
}
console.log(
  "Exploratory above-floor slice: 4,096 entities and 10–100% dirty rows, retaining paired pages only when both page medians exceed 0.1 ms. This post-collection sensitivity check is not the preregistered primary summary.",
);
for (const arm of arms.slice(1)) {
  const ratios: number[] = [];
  let wins = 0;
  for (const row of summaries) {
    if (row.arm !== arm || row.size !== 4096 || row.dirtyPercent < 10) continue;
    const baseline = summaries.find((item) =>
      item.arm === "react" && item.size === row.size &&
      item.dirtyPercent === row.dirtyPercent && item.locality === row.locality &&
      item.replication === row.replication
    );
    if (!baseline || row.medianUpdateMs <= 0.1 || baseline.medianUpdateMs <= 0.1) {
      continue;
    }
    ratios.push(row.medianUpdateMs / baseline.medianUpdateMs);
    if (row.medianUpdateMs < baseline.medianUpdateMs) wins++;
  }
  console.log(
    `${armLabels[arm]} | n=${ratios.length} | ${median(ratios).toFixed(3)}× median paired ratio | ${wins}/${ratios.length} lower`,
  );
}

const plot = (
  size: number,
  metric: "medianUpdateMs" | "p95UpdateMs" | "p95RafMs",
) => {
  const width = 1100,
    height = 470,
    left = 76,
    right = 22,
    top = 76,
    bottom = 58;
  const plotW = width - left - right, plotH = height - top - bottom;
  const group = summaries.filter((row) => row.size === size);
  const max = Math.max(...group.map((row) => row[metric])) * 1.12;
  const x = (index: number) => left + plotW * index / (densities.length - 1);
  const y = (value: number) => top + plotH - plotH * value / max;
  const grid = Array.from({ length: 5 }, (_, i) => {
    const value = max * i / 4;
    return `<line x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${
      y(value)
    }" stroke="#e3e7eb"/><text x="${left - 10}" y="${
      y(value) + 4
    }" text-anchor="end" fill="#606a73" font-size="11">${
      value.toFixed(2)
    }</text>`;
  }).join("");
  const lines = localities.flatMap((locality) =>
    arms.map((arm) => {
      const values = densities.map((density) => {
        const entries = cellRecords(size, density, locality, arm);
        return median(entries.map((entry) => entry[metric]));
      });
      const points = values.map((value, index) => `${x(index)},${y(value)}`)
        .join(" ");
      const dash = locality === "scattered" ? ' stroke-dasharray="6 4"' : "";
      const dots = values.map((value, index) =>
        `<circle cx="${x(index)}" cy="${
          y(value)
        }" r="3.2" fill="white" stroke="${colors[arm]}" stroke-width="2"/>`
      ).join("");
      return `<polyline points="${points}" fill="none" stroke="${
        colors[arm]
      }" stroke-width="2.5"${dash}/>${dots}`;
    })
  ).join("");
  const labels = densities.map((value, index) =>
    `<text x="${x(index)}" y="${
      height - 29
    }" text-anchor="middle" fill="#47515a" font-size="12">${value}%</text>`
  ).join("");
  const legend = arms.map((arm, index) =>
    `<line x1="${left + (index % 3) * 300}" x2="${
      left + 24 + (index % 3) * 300
    }" y1="${20 + Math.floor(index / 3) * 22}" y2="${
      20 + Math.floor(index / 3) * 22
    }" stroke="${colors[arm]}" stroke-width="3"/><text x="${
      left + 31 + (index % 3) * 300
    }" y="${24 + Math.floor(index / 3) * 22}" fill="#303943" font-size="11">${
      armLabels[arm]
    }</text>`
  ).join("");
  const localityLegend = `<line x1="${left + 900}" x2="${
    left + 922
  }" y1="22" y2="22" stroke="#58616b" stroke-width="2.5"/><text x="${
    left + 928
  }" y="26" fill="#303943" font-size="10">clustered</text><line x1="${
    left + 900
  }" x2="${
    left + 922
  }" y1="44" y2="44" stroke="#58616b" stroke-width="2.5" stroke-dasharray="6 4"/><text x="${
    left + 928
  }" y="48" fill="#303943" font-size="10">scattered</text>`;
  const axisLabel = metric === "medianUpdateMs"
    ? "Median per-frame update plus commit (ms)"
    : metric === "p95UpdateMs"
    ? "Per-page update plus commit p95 (ms)"
    : "Per-page RAF interval p95 (ms)";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${size} entities ${axisLabel}" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>${size} entities: ${axisLabel}</title><rect width="100%" height="100%" fill="white"/>${legend}${localityLegend}${grid}<line x1="${left}" x2="${left}" y1="${top}" y2="${
      top + plotH
    }" stroke="#9aa4ae"/><line x1="${left}" x2="${width - right}" y1="${
      top + plotH
    }" y2="${top + plotH}" stroke="#9aa4ae"/>${labels}${lines}<text x="${
      width / 2
    }" y="${
      height - 5
    }" text-anchor="middle" fill="#58616b" font-size="11">Changed rows (%); dashed lines mean scattered rows</text><text x="18" y="${
      height / 2
    }" transform="rotate(-90 18 ${
      height / 2
    })" text-anchor="middle" fill="#58616b" font-size="11">${axisLabel}</text></svg>`;
  return Deno.jupyter.svg`${svg}`;
};
for (const size of sizes) {
  await Deno.jupyter.display(plot(size, "medianUpdateMs"));
  await Deno.jupyter.display(plot(size, "p95UpdateMs"));
  await Deno.jupyter.display(plot(size, "p95RafMs"));
}
