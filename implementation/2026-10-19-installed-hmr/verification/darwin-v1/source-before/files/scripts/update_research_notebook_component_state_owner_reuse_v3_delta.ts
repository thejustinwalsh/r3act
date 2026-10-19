const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Exploratory V3 diagnostic — staged token-cache delta maintenance",
  "",
  "This preregistered mechanism diagnostic tests whether a one-row keyed membership change can update the token cache by deltas, while preserving the fast path on the immediately following same-key rotation. It compares generic expansion, token fallback with full cache construction, and staged token-delta maintenance on 10,000 stateful rows in a `MemoryVDOMHost`. Five fresh Deno processes are the replication units; each contains 8 warmup pairs and 12 measured edge-then-rotation pairs per arm.",
  "",
  "The cell verifies the pre-collection source lock (using a verified V2 source snapshot for the shared VDOM dependency that has since changed), the post-collection hashes for all raw records, parity, host identity, retained child state, and per-sample cache counters. SVG shows phase medians across process-level medians. These results are mechanism evidence only: they include runtime profile callbacks, omit React and browser DOM/layout/paint, and cannot change the V2 browser study's preregistered FAIL.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/component_state_owner_reuse_v3_delta.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("component-state-owner-reuse-v3-delta-markdown", {
  cell_type: "markdown",
  id: "component-state-owner-reuse-v3-delta-markdown",
  metadata: { tags: ["component-state-owner-reuse-v3-delta-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("component-state-owner-reuse-v3-delta-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-owner-reuse-v3-delta-code",
  metadata: { tags: ["component-state-owner-reuse-v3-delta-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Added the V3 token-delta diagnostic with hash checks and SVG chart.",
);
