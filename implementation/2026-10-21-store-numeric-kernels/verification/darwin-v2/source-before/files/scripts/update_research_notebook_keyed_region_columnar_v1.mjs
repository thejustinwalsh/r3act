import { readFile, writeFile } from "node:fs/promises";
const path = "research.ipynb";
const notebook = JSON.parse(await readFile(path, "utf8"));
const markdown = [
  "### Experiment AV — parallel-array buckets and the keyed VDOM hybrid",
  "",
  "This exploratory three-process Node mechanism study extends the indexed-flat-array comparison with a bucket candidate that stores keys and values in parallel JavaScript arrays. Each process ran 315 samples per arm over move-to-tail and full-scan traces at 1k, 10k, and 50k rows. The chart shows median-of-process-medians at 50k on a logarithmic millisecond scale. The scan reads ordered keys and values only; no props, graph dispatch, host mutation, heap, garbage collection, or hardware cache misses are measured.",
  "The existing object-backed buckets are the current sparse-edit candidate: they outperform the indexed array and parallel-array candidate on 50k head/middle moves. Full sequential scan is similar across layouts. Keep SoA for dense numeric trait/prop data, use object buckets for sparse ordered edits, and preserve the semantic VDOM plus generic reconciliation fallback. The browser implementation smoke checks identity and output parity but is excluded from timing claims.",
  "The integrated path remains incomplete for product use: V3 still enumerates input children for owner validation/planning, and the specialized VDOM delta route is guarded when compiled/direct bindings need subscription-index maintenance. The next gate is compiler-emitted sparse keyed operations consumed by owner and binding indexes without full sibling scans, tested alongside frame-rate prop updates. This experiment does not establish an end-to-end React win.",
  "Raw process records and the derived summary are under `results/keyed-region-columnar-layout-v1/`. Rebuild the summary with `node scripts/benchmark_keyed_region_columnar_v1.mjs` and `node scripts/summarize_keyed_region_columnar_v1.mjs`, then regenerate and execute this notebook cell.",
].join("\n");
const code = await readFile("notebook_cells/keyed_region_columnar_v1.ts", "utf8");
const upsert = (tag, cell) => {
  const index = notebook.cells.findIndex((item) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("keyed-region-columnar-v1-markdown", {
  cell_type: "markdown", id: "keyed-region-columnar-v1-markdown",
  metadata: { tags: ["keyed-region-columnar-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("keyed-region-columnar-v1-code", {
  cell_type: "code", execution_count: null, id: "keyed-region-columnar-v1-code",
  metadata: { tags: ["keyed-region-columnar-v1-code"] }, outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await writeFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Added keyed-region columnar layout analysis to research.ipynb");
