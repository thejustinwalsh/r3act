const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AP — keyed structural updates with stateful children",
  "",
  "This production-browser study changes a 10,000-row keyed list by rotating the first row to the end, replacing the tail with a fresh key, or alternating between all rows and half the rows. Each row owns local state. React 19.3 with React Compiler is compared with the OXC-generated owner/state-site runtime. The runtime renders the changed parent, expands only its keyed component subtree, reuses unchanged child component outputs, and commits the stable keyed host root through the retained VDOM. The v2 protocol is the historical baseline; v3 uses an LIS move plan, while v4 replaces LIS with a linear last-placed-index plan.",
  "",
  "Three fresh page loads each ran eight warmup and 24 measured pairs. Every sample passed output parity, keyed host identity, and retained/reset child-state checks. The SVG reports the median of page medians and the range across page loads; the label reports the median of page p95 values. The v4 pages share one Chrome 154 profile and MacIntel device, so the page is the replication unit and the 24 pairs are nested observations.",
  "",
  "Across the three v4 pages, median-of-page-medians (React/runtime) is 9.7/14.0 ms for rotate, 9.5/13.6 ms for edge replacement, and 13.2/32.0 ms for filter/restore. Median page p95 is 11.9/18.9, 10.4/15.5, and 19.5/52.9 ms. The linear planner improves the runtime's v3 median on each operation (15.4→14.0, 15.0→13.6, and 36.5→32.0 ms) while still losing to React on all medians and p95s. This is a descriptive algorithm follow-up, not a paired causal estimate; page loads share one Chrome 154 profile and are the replication unit. The v2 pages used Chrome 155. These synchronous host-commit measurements exclude layout, paint, display presentation, and repeated allocation/lifecycle churn. They test this implementation on this fixture, not general React performance. Raw records: [83001024](./results/browser-component-state-structural-v4-83001024.json), [83001025](./results/browser-component-state-structural-v4-83001025.json), and [83001026](./results/browser-component-state-structural-v4-83001026.json); [validated summary](./results/browser-component-state-structural-summary-v4.json).",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/browser_component_state_structural.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("component-state-ap-markdown", {
  cell_type: "markdown",
  id: "component-state-ap-markdown",
  metadata: { tags: ["component-state-ap-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("component-state-ap-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-ap-code",
  metadata: { tags: ["component-state-ap-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AP notebook cells idempotently");
