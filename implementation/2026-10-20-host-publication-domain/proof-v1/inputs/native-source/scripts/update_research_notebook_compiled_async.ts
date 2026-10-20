const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AF — OXC-emitted task DAG through the async VDOM runtime",
  "",
  "OXC reads literal `asyncTask(id, dependsOn, callback)` declarations from the TSX fixture and emits stable IDs, dependency edges, source spans, and a topological order. The fixture deliberately declares `page-model` before its prerequisites; the emitted plan starts `profile` and `feed`, then `header`, then `page-model`. `bindCompiledAsyncTasks` joins that plan to the authored callbacks, and the runtime publishes the resulting dashboard through a retained VDOM root.",
  "",
  "The compiler rejects cycles, unknown task IDs, and non-literal dependency arrays. This establishes a real compiler-to-scheduler-to-VDOM path for declared task dependencies. It does not infer arbitrary async reads, compile callback bodies, implement progressive reveal, compare React, or measure browser timing. The next test is an equivalent browser interaction with a compiler-emitted plan, a pending resource, and a matching React Suspense behavior contract.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/compiled_async_task_plan.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("compiled-async-af-markdown", {
  cell_type: "markdown",
  id: "compiled-async-af-markdown",
  metadata: { tags: ["compiled-async-af-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("compiled-async-af-code", {
  cell_type: "code",
  execution_count: null,
  id: "compiled-async-af-code",
  metadata: { tags: ["compiled-async-af-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AF compiled-async notebook cells idempotently");
