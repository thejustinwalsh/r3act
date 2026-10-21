const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment AI — keyed index optimization in a stateful structural workload",
  "",
  "The preceding key-index mechanism study showed that delta maintenance reduced index visits. This preregistered follow-up asks whether that win survives when the same compiled component-state runtime updates a 10,000-row list whose rows each own local state. The causal comparison is between two runtime arms that differ only in key-index maintenance: subtree rebuild versus delta maintenance. React + Compiler is included as a contextual same-page reference, not as the causal control.",
  "",
  "Five fresh visible production-build pages each ran eight warmups followed by 24 measured pairs for rotation, edge replacement, and half-list filtering. AMD-1 fixed a pilot-discovered protocol bug before scheduled collection: warmups now precede the separately shuffled measured phase, whose six arm orders occur four times each. Filter direction is recorded per pair, with 12 shrink and 12 restore samples. All five pages passed ordered-output parity, stable keyed host identity, removal/reinsertion identity, local-state retention, and empty teardown checks. The page is the replication unit; paired updates are repeated measures.",
  "",
  "The cell below validates the amended preregistration, immutable collection-time manifest, five raw-record hashes, exact pair IDs, arm-order balance, and direction counts before calculating page-level medians and SVG figures. It reports historical source drift separately: six source inputs changed after collection, with an exact old `jsx_binding_runtime.ts` copy recoverable from another study snapshot; exact copies of the other five changed files were not found in the workspace. The saved records still support reproducible descriptive summaries, but the measured implementation cannot be reconstructed completely. Positive paired differences (rebuild minus delta) favor delta. Lifecycle totals combine one mount and teardown observation with 24 updates and are descriptive, not a stable break-even estimate. The page records and manifest live under `results/component-state-structural-index-v1/`; the out-of-schedule archive smoke is isolated under `results/component-state-structural-index-v1-pilot/`.",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/component_state_index_v1.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("component-state-index-v1-markdown", {
  cell_type: "markdown",
  id: "component-state-index-v1-markdown",
  metadata: { tags: ["component-state-index-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("component-state-index-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-index-v1-code",
  metadata: { tags: ["component-state-index-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Added stateful key-index comparison and SVG analyses to notebook");
