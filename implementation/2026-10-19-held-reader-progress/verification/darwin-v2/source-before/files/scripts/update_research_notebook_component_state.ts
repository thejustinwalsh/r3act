const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AA — component-local state update vs React Compiler",
  "",
  "The production browser comparison mounts a flat keyed list, then toggles one leaf-local boolean through a programmatic click. React 19.3.0 runs with React Compiler enabled. The compiled arm uses OXC-generated owner/site state, graph-selected owner execution, and an indexed keyed-region commit. Each page validates every target update, final full-tree parity, keyed identity, one component render per update, and one runtime partial commit per update. Mount is separate; layout and paint are excluded.",
  "",
  "The chart summarizes page-load medians, with whiskers showing the min–max page median across replications. The 40 measured pairs and 100 updates per pair are nested observations, not independent replications. All runs use one Chrome 155 profile and one MacIntel device. The size-correlated React cost is a result for this flat sibling tree; its internal cause and generality remain open.",
  "",
].join("\n");
const code = await Deno.readTextFile("notebook_cells/browser_component_state_react.ts");
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("component-state-browser-aa-markdown", {
  cell_type: "markdown",
  metadata: { tags: ["component-state-browser-aa-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("component-state-browser-aa-code", {
  cell_type: "code",
  execution_count: null,
  metadata: { tags: ["component-state-browser-aa-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated the Experiment AA notebook cells idempotently");
