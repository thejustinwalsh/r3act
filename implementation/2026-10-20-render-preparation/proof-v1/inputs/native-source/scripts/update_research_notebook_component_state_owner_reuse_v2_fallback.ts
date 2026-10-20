const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment AS diagnostic — State-owner fallback phase profile",
  "",
  "This post-collection, exploratory Deno mechanism profile investigates the V2 edge-replacement guardrail miss. It compares generic owner expansion, V1 checked reuse, and V2 token fallback on 10,000 keyed stateful rows using the MemoryVDOMHost. Five fresh Deno processes each run eight warmups and 12 balanced paired edge replacements per arm; each process is a replication unit. The profile callbacks add overhead. These timings are not browser latency and are excluded from all React/runtime claims.",
  "",
  "The code-level hypothesis is that token mismatch exits before the eligibility scan but then performs generic expansion and rebuilds the versioned keyed-output directory. This cell verifies hashes for all five raw process records and reads locked runtime inputs from the verified V2 source snapshot when live files have changed. It checks output parity, keyed host identity, child-state retention, and renders SVG phase medians. It can support or weaken a mechanism hypothesis; it cannot establish a causal browser bottleneck.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/component_state_owner_reuse_v2_fallback.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("component-state-owner-reuse-v2-fallback-markdown", {
  cell_type: "markdown",
  id: "component-state-owner-reuse-v2-fallback-markdown",
  metadata: { tags: ["component-state-owner-reuse-v2-fallback-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("component-state-owner-reuse-v2-fallback-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-owner-reuse-v2-fallback-code",
  metadata: { tags: ["component-state-owner-reuse-v2-fallback-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Added the hashed V2 fallback-phase diagnostic and its SVG summary chart.",
);
