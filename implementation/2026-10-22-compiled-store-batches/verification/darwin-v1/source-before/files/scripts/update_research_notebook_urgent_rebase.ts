const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AI — urgent same-root update during async work",
  "",
  "A pending task plan keeps the current VDOM visible. `watchStateWorld` listens to owner/site writes. The urgent input update commits immediately through `commitUrgent`, advancing that root's committed version and consuming changed site IDs captured by the watcher. If the urgent write is independent of the pending tasks, the runtime builds the candidate from live application state, rebases its root version and snapshot, and commits the latest input together with the async result. If the compiled task plan includes the changed input, the watcher aborts that plan so it cannot publish stale output.",
  "",
  'The three branches are deterministic in-memory contracts, not browser benchmarks or React timing comparisons. Rebase requires the build callback to read current state at candidate construction time. A plan may opt into bounded restart: after an observed input invalidation, refreshInputs supplies current values and the runtime starts a new candidate from the urgent root version. Completed task outputs outside the changed-input descendant closure are reused; affected tasks rerun. OXC infers task and external-input edges from literal values.get("key") reads; keys matching task IDs become DAG edges and unmatched keys become input edges. Dynamic keys fail compilation. Preserving independent in-flight tasks and owner-scoped state snapshots remain open.',
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/async_vdom_urgent_rebase.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-vdom-urgent-rebase-markdown", {
  cell_type: "markdown",
  id: "async-vdom-urgent-rebase-markdown",
  metadata: { tags: ["async-vdom-urgent-rebase-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-vdom-urgent-rebase-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-vdom-urgent-rebase-code",
  metadata: { tags: ["async-vdom-urgent-rebase-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
const reuseMarkdown = [
  "### Experiment AJ — selective task reuse after async input invalidation",
  "",
  "This microbenchmark compares the retry itself after an input changes. Each attempt first completes a query-dependent chain and independent leaf tasks while an unrelated async gate keeps the candidate pending. The changed query then aborts the attempt. The timed retry compares full recomputation with reuse of completed values outside the changed-input descendant closure.",
  "",
  "The matrix varies graph size, the proportion of work downstream of the changed query, and deterministic CPU work per task. Strategy order alternates across paired repetitions. Every run verifies the changed chain and independent outputs. The archived JSON contains raw trial timings and task counts. This is a scheduler microbenchmark on one Deno process: it excludes plan preparation, host commit, React, browser presentation, and workers; results are diagnostic and not a user-visible speed claim.",
  "",
].join("\n");
const reuseCode = await Deno.readTextFile(
  "notebook_cells/async_task_reuse_benchmark.ts",
);
replaceOrAppend("async-task-reuse-cost-markdown", {
  cell_type: "markdown",
  id: "async-task-reuse-cost-markdown",
  metadata: { tags: ["async-task-reuse-cost-markdown"] },
  source: reuseMarkdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-task-reuse-cost-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-task-reuse-cost-code",
  metadata: { tags: ["async-task-reuse-cost-code"] },
  outputs: [],
  source: reuseCode.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AI notebook cells idempotently");
