const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AE — async preparation connected to retained VDOM roots",
  "",
  "This fixture runs an async dependency plan against two mounted `VDOMSnapshotRoot` instances. Independent profile and scene-data tasks start together; the header derivation runs as soon as its profile input is ready. Candidate JSX results are normalized and duplicate-key checked before either host root is touched. The old keyed nodes remain mounted while work is pending, then both prepared roots commit synchronously with keyed host identity preserved.",
  "",
  "This establishes a concrete in-memory path from task readiness to VDOM host operations. It is still a contract fixture, not a browser performance comparison. The prototype waits for the full task plan, has no nested reveal boundaries or urgent-update rebase policy, and does not connect OXC-emitted dependency plans to this API. The next measurement must include browser DOM work and an equivalent optimized React interaction.",
  "",
].join("\n");
const code = await Deno.readTextFile("notebook_cells/async_vdom_transition.ts");
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("async-vdom-ae-markdown", {
  cell_type: "markdown",
  id: "async-vdom-ae-markdown",
  metadata: { tags: ["async-vdom-ae-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("async-vdom-ae-code", {
  cell_type: "code",
  execution_count: null,
  id: "async-vdom-ae-code",
  metadata: { tags: ["async-vdom-ae-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated Experiment AE async-VDOM notebook cells idempotently");
