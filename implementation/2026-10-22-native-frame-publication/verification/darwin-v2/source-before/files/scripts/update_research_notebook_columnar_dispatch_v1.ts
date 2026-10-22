const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Columnar dispatch density and locality mechanism study",
  "",
  "V6 measured a dense update where every segment changes on every frame. This preregistered Deno mechanism sweep tests whether a retained VDOM column binding should scan all rows, dispatch an explicit dirty-row list, or scan 32- or 128-row buckets. It varies entity count (256, 1,024, 4,096), dirty fraction (1–100%), and clustered versus scattered rows. Five fresh Deno processes each run all 144 cells with 30 warmup and 80 measured batches per cell.",
  "",
  "The worklist is precomputed and reused; its selection or construction cost is excluded. Every measured update includes writing the selected x/y inputs and synchronously dispatching them through `MemoryVDOMHost`. A post-collection deterministic replay checks every warmup and measured batch against the archived runtime: all entity outputs, stable host identity, and exactly two host writes per dirty row. It passed 79,200 batches and 141.9 million entity state checks without changing timed measurements. These timings are a mechanism diagnostic only: they do not include browser DOM/CSS, React scheduling, layout, paint, or presentation. The archived source snapshot includes the transitive `compiled_bindings.ts` import as a separately hash-pinned supplement because it was omitted from the original source lock.",
].join("\n");
const code = "{\n" + await Deno.readTextFile("notebook_cells/columnar_dispatch_v1.ts") + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("columnar-dispatch-v1-markdown", {
  cell_type: "markdown", id: "columnar-dispatch-v1-markdown",
  metadata: { tags: ["columnar-dispatch-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("columnar-dispatch-v1-code", {
  cell_type: "code", execution_count: null, id: "columnar-dispatch-v1-code",
  metadata: { tags: ["columnar-dispatch-v1-code"] }, outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Added validated density/locality summaries and three responsive SVG plots.");
