const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AO — browser multi-owner updates with one commit",
  "",
  "This production-browser study updates 1, 4, 16, 64, or 256 independent boolean leaf owners in one batch across a fixed 10,000-row keyed DOM. React 19.3 with React Compiler uses one `useSyncExternalStore` subscription per row; the compiled runtime uses OXC-emitted owner/site dependencies and a validated multi-keyed-region commit. Each page performs eight warmup and 40 measured pairs with randomized arm and target order.",
  "",
  "Three fresh page loads passed final and per-batch output parity, stable host-node identity, exact dirty-row render counts in both arms, one runtime partial-commit batch per event, and the expected number of committed regions. The chart plots the median across page-load medians; whiskers show the three page-median range. Forty pairs per page are nested measurements, not 120 independent replications.",
  "",
  "This demonstrates the prototype's multi-owner commit path for independent stable keyed leaves. It does not establish a general React speed ratio: the React baseline's per-row external-store subscription pattern is workload-specific, all page loads share one Chrome 155 profile/device, and the runtime's smallest timings approach browser timer resolution. The test excludes structural changes, lifecycle churn, layout, paint, and frame presentation. Raw records and validated aggregate: [run 1](./results/browser-multi-owner-batch-v1-82005002.json), [run 2](./results/browser-multi-owner-batch-v1-82005003.json), [run 3](./results/browser-multi-owner-batch-v1-82005004.json), [summary](./results/browser-multi-owner-batch-summary-v1.json).",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/browser_multi_owner_batch.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("multi-owner-ao-markdown", {
  cell_type: "markdown",
  id: "multi-owner-ao-markdown",
  metadata: { tags: ["multi-owner-ao-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("multi-owner-ao-code", {
  cell_type: "code",
  execution_count: null,
  id: "multi-owner-ao-code",
  metadata: { tags: ["multi-owner-ao-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AO notebook cells idempotently");
