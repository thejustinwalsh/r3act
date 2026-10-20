const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AG — prewarmed React Suspense versus the compiled async graph",
  "",
  "This browser behavior study drives equivalent version-1 to version-2 dashboard transitions. React 19 uses `startTransition`, one Suspense boundary, and profile/feed promises started together before the render suspends. The runtime uses the checked-in OXC task plan, a concurrency-two scheduler, prepared keyed VDOM, and one commit after the complete page model is ready. The pair order alternates. Each pair checks that the old content and both keyed nodes remain visible after a frame while work is pending, then checks final output parity and commit completion.",
  "",
  "The single saved Chrome 155 MacIntel run has 20 pairs. Median task-to-commit latency is 118.7 ms for React and 118.0 ms for the graph runtime; p95 is 180.5 and 179.2 ms. These values are close and dominated by synthetic timer waits, so they do not establish a speed advantage. This experiment verifies pending-state and identity behavior for one root and one boundary. It does not measure trusted-input latency, network I/O, layout, paint, hydration, progressive reveal, CPU work placement, or a second device. Raw samples are in `results/async-suspense-browser-v1-2026-10-09.json`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/async_suspense_browser.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-suspense-ag-markdown", {
  cell_type: "markdown",
  id: "async-suspense-ag-markdown",
  metadata: { tags: ["async-suspense-ag-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-suspense-ag-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-suspense-ag-code",
  metadata: { tags: ["async-suspense-ag-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log(
  "Updated Experiment AG async Suspense browser notebook cells idempotently",
);
