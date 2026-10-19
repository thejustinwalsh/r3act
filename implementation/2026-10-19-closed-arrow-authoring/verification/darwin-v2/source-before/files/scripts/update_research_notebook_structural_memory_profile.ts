const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Exploratory structural phase profile: Deno memory host",
  "",
  "This single-process diagnostic runs the AP v4 structural operations through `ComponentStateRoot` and `MemoryVDOMHost` with phase callbacks enabled. It separates owner rendering/expansion, VDOM normalization, host reconciliation, and index rebuilding. The bars show phase medians; `root.flush` is the complete measured flush, so the phase medians are not additive.",
  "",
  "The filter's host-reconcile phase is large because `MemoryVDOMHost` uses an array-backed child list with `indexOf` and `splice`. That host does not model browser DOM placement/removal costs, so this result cannot explain the Chrome AP v4 loss. This is mechanism-level diagnostic evidence only: one Deno process, no React arm, and no browser layout, paint, or presentation. The JSON record and exact rerun command are [here](./results/component-state-structural-memory-profile-v1.json) and `deno task structural:phase-profile`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/structural_memory_phase_profile.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("structural-memory-phase-profile-markdown", {
  cell_type: "markdown",
  id: "structural-memory-phase-profile-markdown",
  metadata: { tags: ["structural-memory-phase-profile-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("structural-memory-phase-profile-code", {
  cell_type: "code",
  execution_count: null,
  id: "structural-memory-phase-profile-code",
  metadata: { tags: ["structural-memory-phase-profile-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated structural memory phase profile notebook cells idempotently");
