const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const tag = "async-transition-stress-target-v1";
const markdown = [
  "### Async transition stress target",
  "",
  "The target interaction is optimistic input plus timer-backed transitions overlapping on one root and across forked roots. One startup placeholder is allowed; after first reveal, pending work keeps the mounted UI and uses local pending status. The fixture includes timer rollback, out-of-order results, fork-only transitions, and a 520 ms auto-trigger loop.",
  "",
  "The current browser page exercises overlapping action-log store updates and per-root snapshots through retained VDOM commits. It is a target fixture, not measured evidence, and it does not yet exercise concurrent async task candidates or a Suspense implementation. The current coordinator supersedes candidates that overlap on one root; this is a product gap to solve. See [the stress protocol](./async-transition-stress-v1-protocol.md), [fixture page](./async-transition-stress-v1.html), and [source](./src/browser/async_transition_stress_v1.tsx).",
].join("\n");
const cell = {
  cell_type: "markdown",
  id: tag,
  metadata: { tags: [tag] },
  source: markdown.split("\n").map((line) => line + "\n"),
};
const index = notebook.cells.findIndex((item: any) =>
  item.metadata?.tags?.includes(tag)
);
if (index >= 0) notebook.cells[index] = cell;
else notebook.cells.push(cell);
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Added the async transition stress target to the research notebook.");
