const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### V3 production browser follow-up — token-delta fallback versus React Compiler",
  "",
  "This five-page, visible production-browser follow-up tests whether the Deno MemoryVDOMHost delta-cache result survives real DOM commits against a React 19.3 baseline whose React Compiler lowering is explicitly verified in the build. Each fresh page measures 10,000 keyed stateful rows, with eight warmup pairs and 24 measured pairs. A pair replaces the final non-sentinel key and then rotates the same membership; the selected `row-0` remains present through every operation.",
  "",
  "The row-0 sentinel correction is recorded in a pre-collection amendment: the first smoke exposed that repeated full-list rotations move the sentinel to the tail, so replacing the literal final key would remove it on the next pair. No production data were collected under that invalid fixture. The cell verifies all 19 source inputs and four built assets, including React Compiler memo-cache evidence, and checks hashes and integrity for each page record. SVG charts show the median of page-level medians; the five pages, not 120 nested samples, are the replication units.",
  "",
  "The preregistered overall result is **FAIL**: edge fallback meets its 1.10× generic limit on 4/5 pages, and same-key rotation beats generic by the 0.50× limit on 5/5, but token-delta does not beat React Compiler by the 0.90× product threshold on any page. All pages pass output parity, host identity, and retained child-state checks. Timing ends at host commit and does not measure layout, paint, or frame presentation.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/component_state_owner_reuse_v3_browser.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("component-state-owner-reuse-v3-browser-markdown", {
  cell_type: "markdown",
  id: "component-state-owner-reuse-v3-browser-markdown",
  metadata: { tags: ["component-state-owner-reuse-v3-browser-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("component-state-owner-reuse-v3-browser-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-owner-reuse-v3-browser-code",
  metadata: { tags: ["component-state-owner-reuse-v3-browser-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Added the V3 browser comparison with input/hash gates and SVG summary.",
);
