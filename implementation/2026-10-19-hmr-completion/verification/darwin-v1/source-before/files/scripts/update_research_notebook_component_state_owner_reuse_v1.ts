const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Compiler-marked keyed-owner reuse: five-page browser study",
  "",
  "This pre-registered study tests one narrow high-frequency structural update: rotating a homogeneous 10,000-row keyed list while retaining the same component-state root and VDOM. The generic and treatment arms differ only in compiler-marked keyed-owner reuse. React 19.3 with React Compiler is a contextual reference, not the causal comparison. Edge replacement and filter shrink/restore exercise fallback behavior.",
  "",
  "Five fresh visible production-page loads are the replication units. Each page contributes 24 paired measured updates per operation after eight warmups; the six arm orders are balanced four times. Filter shrink and restore are reported separately. The analysis keeps pages separate, verifies the frozen source lock and raw-record hashes, checks output/identity/state parity, and applies the gates from the frozen amendment. Timing measures update-to-host-commit and excludes layout, paint, and presentation. The separately collected diagnostic pass is used only to verify the mechanism; its timings do not enter the latency analysis.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/component_state_owner_reuse_v1.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("component-state-owner-reuse-v1-markdown", {
  cell_type: "markdown",
  id: "component-state-owner-reuse-v1-markdown",
  metadata: { tags: ["component-state-owner-reuse-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("component-state-owner-reuse-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-owner-reuse-v1-code",
  metadata: { tags: ["component-state-owner-reuse-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Added owner-reuse V1 protocol, integrity checks, page-level analysis, gates, and SVG figures.");
