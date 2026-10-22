const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AC — executable async task-plan readiness",
  "",
  "This cell runs the pure-JavaScript `executeAsyncTaskPlan` fixture with deferred promises. It proves that independent profile/feed tasks start together, the profile-dependent header begins as soon as the profile is ready, and the page model waits only for its declared profile and feed inputs. The diagram is an event-order view with no time axis.",
  "",
  "The scheduler uses a bounded min-heap ready queue, supports abort signals, and keeps outputs candidate-local. Experiment AD now connects this executor to versioned root candidates and a coordinated multi-root commit. This cell remains an executor-level event-order fixture: it measures no duration, implements no progressive reveal policy, and does not parallelize CPU work.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/async_task_scheduler.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-task-scheduler-ac-markdown", {
  cell_type: "markdown",
  id: "async-scheduler-ac-markdown",
  metadata: { tags: ["async-task-scheduler-ac-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-task-scheduler-ac-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-scheduler-ac-code",
  metadata: { tags: ["async-task-scheduler-ac-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log(
  "Updated Experiment AC async-scheduler notebook cells idempotently",
);
