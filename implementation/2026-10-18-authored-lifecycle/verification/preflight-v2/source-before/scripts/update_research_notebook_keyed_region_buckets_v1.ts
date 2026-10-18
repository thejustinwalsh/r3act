const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AT — keyed region buckets for localized ordered edits",
  "",
  "This preregistered Deno mechanism study asks whether an ordered keyed region can bound the work for moving one row as the region grows. It compares `KeyedRegionBuckets` with a flat `Array` using `findIndex` plus `splice`, for 64 keyed moves at the head, middle, or tail of lists containing 1,000, 10,000, or 50,000 rows. Bucket capacities are 32, 64, 128, and 256. Each cell has two warmup samples and seven measured samples; arm order is shuffled from a fixed seed.",
  "",
  "The harness asserts exact final key/value order against the array reference and checks bucket links, occupancy, and the key index after each run. The notebook verifies hashes for the preregistration, source, benchmark code, and raw result file before deriving medians, p95s, and work counters. All figures are SVG.",
  "",
  "This is data-structure mechanism evidence only. The flat array does not maintain a separate key-to-index table, and the benchmark excludes JSX normalization, component scheduling, graph propagation, VDOM/DOM updates, browser layout, and frame timing. A fast result here establishes a promising local edit primitive, not a faster UI runtime. The next gate is to wire the data structure into the actual keyed-region update path and measure the complete update against optimized React.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/keyed_region_buckets_v1.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("keyed-region-buckets-v1-markdown", {
  cell_type: "markdown",
  id: "keyed-region-buckets-v1-markdown",
  metadata: { tags: ["keyed-region-buckets-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("keyed-region-buckets-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "keyed-region-buckets-v1-code",
  metadata: { tags: ["keyed-region-buckets-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Added Experiment AT to research.ipynb idempotently");
