const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AL — frame-cadence follow-up for keyed region updates",
  "",
  "This follow-up adds a rendering-opportunity measure to the existing 10,000-row, two-region comparison. React 19.3 with React Compiler uses memoized region components; the handwritten VDOM rebuilds both regions; the OXC region graph derives and commits only the region reached by the changed query. Each of 24 timed pairs presents the same eight alternating query changes to all three arms, with one synchronous update between animation-frame callbacks. Six warmup pairs precede measurement, and all intermediate DOM digests must match. The isolated protocol connects only the active arm's keyed lists to the document; equal-size empty placeholders preserve the three panel layouts while removing inactive lists from layout and paint.",
  "",
  "The study measures both synchronous update duration and the interval from the rAF callback before an update to the next callback. It samples 120 idle intervals first, flags update intervals above 1.5× the idle median, and estimates missed opportunities from the ratio to that median. The harness now asserts and records which arm is connected before every sequence. This is an rAF cadence proxy: it includes browser rendering work that delays the next callback, but it does not confirm that a frame was presented by the compositor or display. Earlier simultaneous-panel records and the first isolated record, which predates the stored assertion, remain in the archive but are excluded from the verified-isolation chart. Results remain descriptive for this fixture and browser/device.",
  "",
  "Raw isolated browser runs are stored under `results/keyed-region-frame-pacing-isolated-v1-*.json`. The SVGs below compare p50 and p95 update duration and rAF interval for isolated runs that include all per-sequence connection assertions. The tails remain unexplained; a single profile cannot attribute them to the environment, framework, garbage collection, or measurement work. This is an initial responsiveness probe, not a general React performance claim.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/keyed_region_frame_pacing.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("keyed-region-frame-pacing-al-markdown", {
  cell_type: "markdown",
  id: "keyed-region-frame-pacing-al-markdown",
  metadata: { tags: ["keyed-region-frame-pacing-al-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("keyed-region-frame-pacing-al-code", {
  cell_type: "code",
  execution_count: null,
  id: "keyed-region-frame-pacing-al-code",
  metadata: { tags: ["keyed-region-frame-pacing-al-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AL notebook cells idempotently");
