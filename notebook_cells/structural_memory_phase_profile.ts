const memoryPhaseRecord = JSON.parse(
  await Deno.readTextFile(
    "results/component-state-structural-memory-profile-v1.json",
  ),
);
if (
  memoryPhaseRecord.schemaVersion !==
    "component-state-structural-memory-profile-v1" ||
  memoryPhaseRecord.status !== "EXPLORATORY" ||
  memoryPhaseRecord.scenarios.length !== 3
) {
  throw new Error("Structural memory-host phase profile is invalid");
}

const memoryPhaseNames = [
  "owner.render-and-key",
  "owner.expand-and-cache",
  "vdom.normalize",
  "vdom.reconcile-host",
  "vdom.index-snapshot",
  "root.flush",
] as const;
const memoryPhaseLabels: Record<(typeof memoryPhaseNames)[number], string> = {
  "owner.render-and-key": "owner render/key",
  "owner.expand-and-cache": "owner expand/cache",
  "vdom.normalize": "VDOM normalize",
  "vdom.reconcile-host": "VDOM host reconcile",
  "vdom.index-snapshot": "VDOM index/snapshot",
  "root.flush": "root.flush total",
};
const memoryPhaseColors: Record<(typeof memoryPhaseNames)[number], string> = {
  "owner.render-and-key": "#4e79a7",
  "owner.expand-and-cache": "#f28e2b",
  "vdom.normalize": "#e15759",
  "vdom.reconcile-host": "#76b7b2",
  "vdom.index-snapshot": "#59a14f",
  "root.flush": "#7f6aad",
};
const memoryPhaseMax = 55;
const memoryPhaseWidth = 960;
const memoryPhaseHeight = 520;
const memoryPhaseLeft = 205;
const memoryPhaseRight = 52;
const memoryPhaseTop = 44;
const memoryPhaseRowHeight = 21;
const memoryPhaseGroupGap = 20;
const memoryPhasePlotWidth = memoryPhaseWidth - memoryPhaseLeft -
  memoryPhaseRight;
const memoryPhaseScale = memoryPhasePlotWidth / memoryPhaseMax;
const memoryPhaseRows: string[] = [];
const memoryPhaseGrid: string[] = [];
const memoryPhaseLegend: string[] = [];

for (let tick = 0; tick <= memoryPhaseMax; tick += 10) {
  const x = memoryPhaseLeft + tick * memoryPhaseScale;
  memoryPhaseGrid.push(
    `<line x1="${x}" x2="${x}" y1="${memoryPhaseTop - 8}" y2="${
      memoryPhaseHeight - 36
    }" stroke="#e5e7eb"/><text x="${x}" y="${
      memoryPhaseHeight - 15
    }" text-anchor="middle" fill="#59636e" font-size="11">${tick}</text>`,
  );
}

let memoryPhaseY = memoryPhaseTop;
for (const scenario of memoryPhaseRecord.scenarios) {
  memoryPhaseRows.push(
    `<text x="${memoryPhaseLeft - 12}" y="${
      memoryPhaseY - 4
    }" text-anchor="end" fill="#111827" font-size="13" font-weight="650">${scenario.operation}</text>`,
  );
  memoryPhaseY += 7;
  for (const phase of memoryPhaseNames) {
    const value = scenario.phaseMedianMs[phase];
    const barWidth = Math.max(0, value * memoryPhaseScale);
    memoryPhaseRows.push(
      `<text x="${memoryPhaseLeft - 10}" y="${
        memoryPhaseY + 11
      }" text-anchor="end" fill="#48515b" font-size="10">${
        memoryPhaseLabels[phase]
      }</text><rect x="${memoryPhaseLeft}" y="${memoryPhaseY}" width="${barWidth}" height="14" rx="3" fill="${
        memoryPhaseColors[phase]
      }"/><text x="${memoryPhaseLeft + barWidth + 5}" y="${
        memoryPhaseY + 11
      }" fill="#303840" font-size="10">${value.toFixed(2)}</text>`,
    );
    memoryPhaseY += memoryPhaseRowHeight;
  }
  memoryPhaseY += memoryPhaseGroupGap;
}

for (let index = 0; index < memoryPhaseNames.length; index++) {
  const phase = memoryPhaseNames[index];
  const x = memoryPhaseLeft + (index % 3) * 246;
  const y = 17 + Math.floor(index / 3) * 17;
  memoryPhaseLegend.push(
    `<rect x="${x}" y="${y - 9}" width="9" height="9" rx="2" fill="${
      memoryPhaseColors[phase]
    }"/><text x="${x + 14}" y="${y}" fill="#48515b" font-size="10">${
      memoryPhaseLabels[phase]
    }</text>`,
  );
}

console.table(memoryPhaseRecord.scenarios.map((scenario: any) => ({
  operation: scenario.operation,
  rootFlushMs: scenario.phaseMedianMs["root.flush"],
  ownerExpansionMs: scenario.phaseMedianMs["owner.expand-and-cache"],
  hostReconcileMs: scenario.phaseMedianMs["vdom.reconcile-host"],
  writes: scenario.hostWrites,
  placements: scenario.hostPlacements,
  removals: scenario.hostRemovals,
})));
Deno.jupyter
  .svg`<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${memoryPhaseHeight}" viewBox="0 0 ${memoryPhaseWidth} ${memoryPhaseHeight}" role="img" aria-label="Exploratory Deno memory host structural phase profile" style="max-width:100%;height:auto;font-family:system-ui,sans-serif"><title>Exploratory Deno MemoryVDOMHost structural phase profile</title><rect width="100%" height="100%" fill="white"/>${
  memoryPhaseLegend.join("")
}${memoryPhaseGrid.join("")}${memoryPhaseRows.join("")}<text x="${
  memoryPhaseLeft + memoryPhasePlotWidth / 2
}" y="${
  memoryPhaseHeight - 2
}" text-anchor="middle" fill="#59636e" font-size="11">Median phase time (ms; phase medians are not additive)</text></svg>`;
