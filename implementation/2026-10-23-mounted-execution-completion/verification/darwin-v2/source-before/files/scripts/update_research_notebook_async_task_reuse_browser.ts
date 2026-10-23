const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AK — browser retry with selective completed-task reuse",
  "",
  "This 40-pair Chrome study measures the retry interval from an urgent query update to fresh DOM commit. React 19 with React Compiler keeps the old result visible, starts a newer query through one Suspense transition, and reuses an application-cached catalog value. The compiled runtime uses the OXC-emitted task/input DAG, observes an ECS state-site write, aborts the stale search task, and performs one bounded retry. Its full-restart arm recomputes the independent catalog task; its selective arm reuses that completed output. Pair order alternates across three arms and two deterministic catalog workloads.",
  "",
  "All 40 samples pass output parity, old-content retention, keyed host identity, stale-result suppression, abort/restart, and task-count contracts. At zero catalog iterations, median update-to-commit is 7.9 ms for React, 8.4 ms for full restart, and 8.5 ms for reuse. At 250,000 integer-loop iterations, medians are 6.2, 7.7, and 8.6 ms. The paired median differences (graph minus React) are +0.6/+1.2 ms at zero work and +0.3/+1.1 ms at 250,000 iterations; reuse is faster in only 9/20 and 6/20 pairs respectively. The browser evidence therefore does not show a speed win for graph retry or completed-task reuse in this fixture, despite correctly avoiding one catalog recomputation.",
  "",
  "Interpret cautiously: one Chrome 155 MacIntel session, programmatic state changes, synthetic deferred searches, and a small deterministic CPU-loop proxy. The measurement stops at host commit and excludes layout, paint, and frame presentation. React caches its independent catalog value in application code; the runtime selects it from the compiled DAG. React keeps the stale request in flight but transitions only to the latest query, while the runtime aborts the stale task after state invalidation. This is a narrow retry/commit comparison, not a general Suspense or whole-application performance result. Raw samples: `results/async-task-reuse-browser-v1-2026-10-10.json`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/async_task_reuse_browser.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-task-reuse-browser-ak-markdown", {
  cell_type: "markdown",
  id: "async-task-reuse-browser-ak-markdown",
  metadata: { tags: ["async-task-reuse-browser-ak-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-task-reuse-browser-ak-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-task-reuse-browser-ak-code",
  metadata: { tags: ["async-task-reuse-browser-ak-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AK notebook cells idempotently");
