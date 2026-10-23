const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AD — async DAG preparation and atomic UI publication",
  "",
  "This deterministic integration fixture connects `executeAsyncTaskPlan` to `TransitionCoordinator`. Independent profile and feed tasks start together; a header derivation starts as soon as its profile dependency resolves. The committed scene and HUD snapshots remain visible while work is pending. Once the full task plan is ready, candidate snapshots are staged and both versioned roots commit in one synchronous batch.",
  "",
  "The event trace establishes scheduling and publication order, not speed. It does not yet implement progressive Suspense reveal boundaries, urgent-update rebasing, worker CPU execution, a React comparison, or browser frame timing. The next integration question is whether selective reveal can be added without weakening root consistency or complicating cancellation and lifecycle rules.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/async_transition_runtime.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-transition-ad-markdown", {
  cell_type: "markdown",
  id: "async-transition-ad-markdown",
  metadata: { tags: ["async-transition-ad-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-transition-ad-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-transition-ad-code",
  metadata: { tags: ["async-transition-ad-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log(
  "Updated Experiment AD async-transition notebook cells idempotently",
);
