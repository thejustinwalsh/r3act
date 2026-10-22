const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment KI — key-index maintenance mechanism study",
  "",
  "This preregistered browser study compares the prior keyed-subtree reindex algorithm with delta key-index maintenance inside the same VDOM reconciler. React + Compiler is a contextual reference; the causal contrast is subtree rescan versus delta maintenance. Five fresh visible Chrome pages on one MacIntel device were scheduled before collection. Each page measures 24 paired updates after eight warmups for rotation, edge replacement, and a bidirectional half-filter with 12 explicitly labeled shrink and 12 restore updates. The page is the replication unit.",
  "All five page records passed output parity, retained host identity, reinsertion identity, sample-count, and teardown-empty checks. Median-of-page-medians for rebuild / delta update time was 7.9 / 5.95 ms on rotation and 7.85 / 6.05 ms on edge replacement; delta was faster on all five pages for both. For shrink the values were 8.85 / 7.8 ms, with delta faster on four of five pages. For restore they were 12.55 / 11.25 ms, with delta faster on all five. These are same-device, five-page results for a keyed leaf-host mechanism benchmark, not a full component-state runtime claim.",
  "Mount and teardown are reported separately per page. A derived mount + 24 measured updates + teardown total favored delta on four of five filter pages, but one page had a 134.5 ms delta mount and a −97.5 ms lifecycle-adjusted saving. That unexcluded variation makes the lifecycle result unstable; each mount and teardown arm has only one timing observation per page. The study excludes component-local state, layout, paint, and display presentation, and it does not generalize beyond this Chrome/device profile.",
  "The [frozen preregistration](./results/key-index-maintenance-v1-preregistration.json), [SHA-256 manifest](./results/browser-key-index-maintenance-v1-manifest.json), and five raw page records define the accepted collection. Rebuild the manifest and notebook cell with `deno task key-index-maintenance:v1:manifest` and `deno task key-index-maintenance:v1:notebook`, then execute the full notebook with `UV_CACHE_DIR=/private/tmp/uv-react-research-cache UV_OFFLINE=1 deno task notebook`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/key_index_maintenance_v1.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("key-index-maintenance-v1-markdown", {
  cell_type: "markdown",
  id: "key-index-maintenance-v1-markdown",
  metadata: { tags: ["key-index-maintenance-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("key-index-maintenance-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "key-index-maintenance-v1-code",
  metadata: { tags: ["key-index-maintenance-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Updated key-index maintenance notebook cells idempotently");
