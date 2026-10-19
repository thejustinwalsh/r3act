const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AH — urgent input during a multi-root async transition",
  "",
  "React Compiler optimizes the React arm. React keeps the controlled input outside one Suspense boundary and starts the dashboard update in a transition. The runtime keeps the input in an independent native-event VDOM root while an OXC-emitted task DAG prepares scene and HUD roots for one coordinated commit. Each of 20 alternating-order pairs injects a programmatic input event on the next frame, before the synthetic profile/feed delays finish. The study checks old-view retention, urgent-value publication before data completion, both-root commit, keyed identity, task order, and output parity.",
  "",
  "All 20 pairs passed with React Compiler enabled. Median dispatch-to-visible urgent update was 2.1 ms for React and 0.4 ms for the graph runtime; p95 was 10.7 and 3.1 ms. Median transition completion was 215.9 and 213.7 ms; p95 was 289.9 and 273.6 ms. These are descriptive values from one Chrome 155 MacIntel session; the event is programmatic and synthetic timers dominate transition completion. This supports the independent urgent-root behavior contract, but does not prove frame responsiveness or show that a write targeting a pending transition root can be rebased. See the raw pair data in `results/urgent-multiroot-transition-browser-v2-2026-10-09.json`.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/urgent_transition_browser.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("urgent-transition-ah-markdown", {
  cell_type: "markdown",
  id: "urgent-transition-ah-markdown",
  metadata: { tags: ["urgent-transition-ah-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("urgent-transition-ah-code", {
  cell_type: "code",
  execution_count: null,
  id: "urgent-transition-ah-code",
  metadata: { tags: ["urgent-transition-ah-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log(
  "Updated Experiment AH urgent-transition notebook cells idempotently",
);
