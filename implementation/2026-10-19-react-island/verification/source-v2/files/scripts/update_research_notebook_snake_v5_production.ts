const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Snake V5 confirmatory production-build replication",
  "",
  "This frozen follow-up repeats the V5 5-arm × 4-size × 5-replication schedule against Vite's production build. It has distinct production-prefixed trial IDs and raw files under `results/v5-production/`; the development collection remains unchanged. The code below rechecks every raw-file SHA-256 digest and each page's production-mode tag before pairing medians by size and replication.",
  "",
  "The primary measure is synchronous update-to-commit time. RAF interval p95 is a cadence diagnostic, not a paint or presentation measurement. Both datasets use one Chrome/device profile, and results remain specific to this fixed-topology DOM animation.",
  "",
  "**Implementation diagnosis to test next (source audit, not a causal result):** the compiled VDOM arm currently creates two `ScalarSource` objects per segment and a fresh update tuple for every source on every measured frame. `VDOMSnapshotRoot.setSources` then creates a `Map` and `Set` for generic deduplication. The CSR graph identifies prop bindings, but this path does not use entity/trait columns or a batched column-to-writer dispatch. The next performance gate should test whether compiler-selected columnar updates remove that per-prop work while keeping JSX declarative and preserving the VDOM for structural changes.",
].join("\n");
const code = "{\n" +
  await Deno.readTextFile(
    "notebook_cells/snake_frame_v5_production_comparison.ts",
  ) + "\n}\n";
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("snake-frame-v5-production-markdown", {
  cell_type: "markdown",
  id: "snake-frame-v5-production-markdown",
  metadata: { tags: ["snake-frame-v5-production-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("snake-frame-v5-production-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-v5-production-code",
  metadata: { tags: ["snake-frame-v5-production-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Added production V5 verification, paired summaries, and SVG charts.");
