const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Structural profile V8 — where does keyed update work go?",
  "",
  "This is an exploratory five-page diagnostic collected after the stateful keyed-index comparison. The pages use five seeds but the same Chrome 154 profile and physical device, so they describe within-profile repeatability rather than independent replication. The study is not preregistered, and instrumented development-server timings are not a production or React-comparable latency estimate. Each page uses the same 10,000-row fixture, with 8 warmups and 24 measured pairs per operation. The original post-collection manifest preserves collection-time source hashes; a separate source-drift audit records which bytes remain available now.",
  "",
  "The analysis verifies all five raw profile hashes and the immutable historical manifest. In the latest audit, 8 of 15 original inputs still match: five runtime/fixture inputs changed after collection, and the notebook analysis cell plus its updater have since been revised. An exact historical copy of jsx_binding_runtime.ts survives in other study snapshots, while exact copies of the other four changed runtime/fixture files were not found in this workspace. The saved records still reproduce the descriptive counter and timing summaries, but those four missing implementation files prevent exact reconstruction of the measured runtime. Filter direction is identified from created/retired owner counters rather than assuming sample parity. Each page contributes its own median; the summary takes the median and range across page-level medians without pooling samples. The SVG shows three measured runtime phases; total time also includes owner book-keeping, effects, scheduler/dispatch work, host calls, and time outside the root flush. Overlapping phase scopes are diagnostic signals, not causal shares.",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/component_state_structural_profile_v8.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("component-state-structural-profile-v8-markdown", {
  cell_type: "markdown",
  id: "component-state-structural-profile-v8-markdown",
  metadata: { tags: ["component-state-structural-profile-v8-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("component-state-structural-profile-v8-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-structural-profile-v8-code",
  metadata: { tags: ["component-state-structural-profile-v8-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Added five-page structural phase V8 diagnostic and SVG chart to notebook");
