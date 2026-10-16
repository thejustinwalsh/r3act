{
  const control = JSON.parse(await Deno.readTextFile(".cache/dense-causal-control-v1/gates/recording-1024/analysis-1024.json"));
  if (control.schemaVersion !== "dense-causal-control-analysis-v1" || control.rows !== 1024 || control.arm !== "native" || control.status !== "DIAGNOSTIC" || control.decisionGrade !== false || control.blocks?.length !== 6 || control.nextSizeGate !== "STOP_10000_UNRESOLVED") throw new Error("Targeted control analysis contract changed");
  const points = control.blocks.flatMap((block: any) => [
    { block: block.block, kind: "off − original", value: block.differences.off_minus_original.median, color: "#2563eb", dy: -9 },
    { block: block.block, kind: "on − off", value: block.differences.on_minus_off.median, color: "#d97706", dy: 9 },
  ]);
  if (points.length !== 12 || points.some((point: any) => !Number.isFinite(point.value))) throw new Error("Missing six block-level page-median controls");
  const width = 860, height = 430, left = 172, right = 45, top = 118, bottom = 94;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const low = Math.floor((Math.min(0, ...points.map((point: any) => point.value)) - 0.025) / 0.05) * 0.05;
  const high = Math.ceil((Math.max(0, ...points.map((point: any) => point.value)) + 0.025) / 0.05) * 0.05;
  const x = (value: number) => left + (value - low) / (high - low) * plotWidth;
  const y = (block: number) => top + (block - 0.5) * plotHeight / 6;
  const ticks = Array.from({ length: Math.round((high - low) / 0.05) + 1 }, (_, index) => +(low + index * 0.05).toFixed(2));
  const tickMarks = ticks.map((tick: number) => `<line x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${height - bottom}" stroke="${tick === 0 ? "#334155" : "#e2e8f0"}" stroke-width="${tick === 0 ? 2 : 1}"/><text x="${x(tick)}" y="${height - bottom + 24}" text-anchor="middle" font-size="12" fill="#475569">${tick.toFixed(2)}</text>`).join("");
  const rows = Array.from({ length: 6 }, (_, index) => `<text x="${left - 16}" y="${y(index + 1) + 5}" text-anchor="end" font-size="13" fill="#334155">Block ${index + 1}</text><line x1="${left}" y1="${y(index + 1)}" x2="${width - right}" y2="${y(index + 1)}" stroke="#f1f5f9"/>`).join("");
  const marks = points.map((point: any) => `<circle cx="${x(point.value)}" cy="${y(point.block) + point.dy}" r="6" fill="${point.color}" stroke="white" stroke-width="1.5"><title>Block ${point.block}: ${point.kind} ${point.value.toFixed(4)} ms</title></circle>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="dense-control-title dense-control-desc" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title id="dense-control-title">Six-block native control: differences of page medians</title><desc id="dense-control-desc">For each of six counterbalanced 1024-row blocks, blue shows diagnostic-off minus original page median and amber shows diagnostic-on minus off page median. A vertical zero line marks no difference. These descriptive points are not confidence intervals or causal overhead corrections.</desc><rect width="${width}" height="${height}" rx="12" fill="white" stroke="#cbd5e1"/><text x="28" y="38" font-size="20" font-weight="700" fill="#0f172a">Native 1,024 · six fresh-page blocks</text><text x="28" y="65" font-size="13" fill="#475569">Difference of page medians · descriptive controls, not overhead bounds</text><circle cx="40" cy="91" r="6" fill="#2563eb"/><text x="54" y="96" font-size="13" fill="#334155">off − original</text><circle cx="228" cy="91" r="6" fill="#d97706"/><text x="242" y="96" font-size="13" fill="#334155">on − off</text>${rows}${tickMarks}${marks}<text x="${left + plotWidth / 2}" y="${height - 35}" text-anchor="middle" font-size="13" fill="#334155">Page-median difference (ms)</text><text x="${left + plotWidth / 2}" y="${height - 12}" text-anchor="middle" font-size="11" fill="#64748b">One point per block per control; 18 pages total · stability screen FAIL · no 10,000 continuation</text></svg>`;
  if (Deno.args.includes("--svg-stdout")) console.log(svg);
  else Deno.jupyter.svg`${svg}`;
}

