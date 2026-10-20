const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AM — frame cadence and Long Animation Frame attribution",
  "",
  "This follow-up repeats the isolated 10,000-row cadence protocol while observing Chrome's `long-animation-frame` PerformanceObserver entries. LoAF entries represent UI-thread work sequences longer than 50 ms and expose script attribution plus rendering-phase timestamps where available. The observer starts after the idle baseline; captured entries are associated with measured update windows by timestamp overlap. That association is approximate: one long entry can overlap more than one measured window, and the API's duration excludes display presentation.",
  "",
  "The browser harness asserts connected-arm isolation and output parity as in Experiment AL. The observer runs only in this attribution arm, so its timing results are reported separately from the uninstrumented cadence runs. Missing script attribution does not prove there was no JavaScript: browser privacy rules and opaque scripts can hide it. A LoAF with no scripts can also point toward rendering or other main-thread work. The SVG charts show how often measured windows overlap LoAF entries and the p95 duration of associated entries; the accompanying JSON summary lists script attribution. One device and one page load remain exploratory evidence.",
  "",
  "Raw attribution records: `results/keyed-region-frame-pacing-attribution-v1-*.json`. The cell recomputes all per-arm summaries from these records and emits SVG-only charts. References: [W3C Long Animation Frames specification](https://www.w3.org/TR/long-animation-frames/) and [Chrome's Long Animation Frames guide](https://developer.chrome.com/docs/web-platform/long-animation-frames).",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/keyed_region_frame_attribution.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("keyed-region-frame-attribution-am-markdown", {
  cell_type: "markdown",
  id: "keyed-region-frame-attribution-am-markdown",
  metadata: { tags: ["keyed-region-frame-attribution-am-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("keyed-region-frame-attribution-am-code", {
  cell_type: "code",
  execution_count: null,
  id: "keyed-region-frame-attribution-am-code",
  metadata: { tags: ["keyed-region-frame-attribution-am-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AM notebook cells idempotently");
