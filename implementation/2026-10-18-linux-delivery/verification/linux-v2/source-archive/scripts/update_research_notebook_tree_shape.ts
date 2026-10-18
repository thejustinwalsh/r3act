const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AN — component topology at fixed DOM size",
  "",
  "This follow-up holds the 10,000-span host DOM, target leaf update, and timing protocol constant while changing only component topology: flat, 10 groups of 1,000 leaves, 100 groups of 100, or 1,000 groups of 10. Each group returns a Fragment, so it contributes no host DOM nodes. React uses keyed function components returning React Fragments; the runtime uses keyed registered components returning runtime Fragments.",
  "",
  "The [predeclared run schedule](./results/browser-component-state-tree-shape-schedule-v1.json) interleaves all four topologies over three rounds with fixed seeds. The validated production summary reports three page-load medians per topology; the SVG whiskers show each topology's min–max page median. Forty paired samples and 100 updates per pair are nested observations, not independent page replications. Every page passed full output parity, stable target identity, one leaf render per update, zero group renders per update, and one runtime partial commit per update. The study isolates this component-tree grouping in one leaf-local workload; it does not establish general React scaling behavior or identify every internal source of cost.",
  "",
].join("\n");
const summaryPath =
  "results/browser-component-state-tree-shape-summary-v1.json";
let code: string | null = null;
try {
  await Deno.stat(summaryPath);
  code = await Deno.readTextFile(
    "notebook_cells/browser_component_state_tree_shape.ts",
  );
} catch (error) {
  if (!(error instanceof Deno.errors.NotFound)) throw error;
}
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
notebook.cells = notebook.cells.filter((item: any) =>
  !item.metadata?.tags?.includes("component-state-tree-shape-ab-markdown") &&
  !item.metadata?.tags?.includes("component-state-tree-shape-ab-code")
);
replaceOrAppend("component-state-tree-shape-an-markdown", {
  cell_type: "markdown",
  id: "tree-shape-an-markdown",
  metadata: { tags: ["component-state-tree-shape-an-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
if (code !== null) {
  replaceOrAppend("component-state-tree-shape-an-code", {
    cell_type: "code",
    execution_count: null,
    id: "tree-shape-an-code",
    metadata: { tags: ["component-state-tree-shape-an-code"] },
    outputs: [],
    source: code.split("\n").map((line) => line + "\n"),
  });
} else {
  notebook.cells = notebook.cells.filter((item: any) =>
    !item.metadata?.tags?.includes("component-state-tree-shape-an-code")
  );
}
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log(
  code === null
    ? "Updated Experiment AN protocol; result SVG cell awaits validated browser data"
    : "Updated Experiment AN notebook cells idempotently",
);
