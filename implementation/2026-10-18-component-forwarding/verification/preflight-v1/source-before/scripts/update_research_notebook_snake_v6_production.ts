const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Snake V6 production columnar binding experiment",
  "",
  "V6 isolates a specific design question from the production V5 integration study: can compiled bindings read position data directly from reusable numeric trait columns and dispatch to retained host writers without per-frame source tuples, maps, or sets? Five arms (React + Compiler, runtime-discovered VDOM, generated scalar-source VDOM, generated columnar VDOM, and cached direct DOM) consume the same preallocated x/y columns. The 75-page schedule covers 128, 512, and 1,024 segments with five paired page-load replications per arm and size.",
  "",
  "The frozen React arm uses per-segment useSyncExternalStore snapshots and batches notifications with unstable_batchedUpdates; timed RAF updates do not call flushSync, and a useLayoutEffect marker records commit completion. The cell below revalidates the frozen source lock and every raw record hash, then checks schedule balance and output/host-identity contracts before it summarizes page medians. The page load is the replication unit; its 300 animation frames are nested samples. The primary measure remains update-to-commit time, while CPU, mount, and RAF interval p95 provide different cost and cadence views. It also reports a post-hoc mount-amortization estimate from paired page medians; this is descriptive, excludes compilation, page load, teardown, and presentation, and is especially coarse near the browser's 0.1 ms timing floor. These are fixed-topology DOM results from one visible browser/device environment; RAF cadence is not pixel-presentation latency.",
].join("\n");
const code = "{\n" + await Deno.readTextFile("notebook_cells/snake_frame_v6_production_comparison.ts") + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("snake-frame-v6-production-markdown", {
  cell_type: "markdown", id: "snake-frame-v6-production-markdown",
  metadata: { tags: ["snake-frame-v6-production-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("snake-frame-v6-production-code", {
  cell_type: "code", execution_count: null, id: "snake-frame-v6-production-code",
  metadata: { tags: ["snake-frame-v6-production-code"] }, outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Added V6 production validation, paired page summaries, mount-amortization analysis, and SVG charts.");
