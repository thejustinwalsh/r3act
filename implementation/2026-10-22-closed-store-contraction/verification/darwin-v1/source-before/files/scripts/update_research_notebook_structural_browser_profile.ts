const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment AP diagnostic — browser structural phase profile",
  "",
  "This exploratory Chrome 154 study profiles the checked-in 10,000-row structural harness on one visible in-app browser page and one MacIntel device. The v8 diagnostic records 24 paired updates each for rotate, edge replacement, and half-list filtering after prototyping delta-based key-index maintenance. It preserves phase calls and owner/index/host work counts. A separate uninstrumented page checks output parity, keyed host identity, and local-state retention. Neither one-page run is a confirmatory latency collection.",
  "",
  "Path markers show one dirty owner/change and no full-reconcile fallback on all 72 updates. The baseline v7 counts traversed 20,004 old plus 20,004 new key-index nodes for a one-move rotation. With delta-based index maintenance, v8 visits zero index nodes for rotation, two old plus two new nodes for edge replacement, 10,000 detached nodes for shrink, and 10,000 attached nodes for restore. Filter shrink and restore must be analyzed separately: the 24 updates contain 11 shrinks and 13 restores in this run, so a pooled median would describe the majority direction rather than a typical single direction. Owner traversal remains broad: 10,000 visits for rotation and restore, and 5,000 for shrink.",
  "",
  "The phase chart separates filter shrink from restore and shows overlapping diagnostic scopes; do not add these bars. The second SVG shows owner visits and key-index detach/attach visits, while the table preserves host calls. The separate uninstrumented page (seed `83001054`) passed parity, identity, and retained-state checks. Its filter direction is reconstructed from the recorded seed and the harness's deterministic shuffled schedule; that reconstruction is validated against the v8 diagnostic page's owner-created/retired counters. The 13 shrink samples have React/runtime medians 19.2/24.7 ms, median paired difference (React − runtime) −3.5 ms, and median paired ratio 0.846. The 11 restore samples have medians 38.6/38.6 ms, paired difference +3.3 ms, and ratio 1.089. These are descriptive within one uninstrumented page; they suggest the pooled 28/37 ms medians hid direction-dependent behavior, but do not replace the 216-pair AP v4 comparison or establish a general speedup. The [v7 baseline counters](./results/browser-component-state-structural-profile-v7-83001052.json), [v8 delta-index counters](./results/browser-component-state-structural-profile-v8-83001053.json), and [uninstrumented page](./results/browser-component-state-structural-v4-83001054.json) contain raw evidence. Regenerate this SVG-only analysis with `deno task component-state:structural-phase-notebook`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/structural_browser_phase_profile.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("structural-browser-phase-profile-markdown", {
  cell_type: "markdown",
  id: "structural-browser-phase-profile-markdown",
  metadata: { tags: ["structural-browser-phase-profile-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("structural-browser-phase-profile-code", {
  cell_type: "code",
  execution_count: null,
  id: "structural-browser-phase-profile-code",
  metadata: { tags: ["structural-browser-phase-profile-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Updated browser structural phase profile notebook cells idempotently",
);
