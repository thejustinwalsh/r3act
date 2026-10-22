const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const tag = "async-store-action-log-prototype";
const markdown = [
  "### Async store action-log runtime prototype",
  "",
  "The runtime now has a host-independent action-log store based on the local userland implementation and the React fork's `use-store-queue` branch. Every root render can pin one projected store snapshot so all read sites see the same value; a version check rejects stale work before any host root is patched. Selector history advances only after host commit. Promise values remain ordinary store values.",
  "",
  "`AsyncVDOMTransitionRuntime` accepts explicit store transition IDs and declared store read sets, provides each root's pinned snapshots to candidate tree construction, and validates the complete read set before host commit. This is per-root consistency: roots may show different committed versions during a transition. A stale candidate is currently rejected; automatic rebuild/retry is still open.",
  "",
  "This is an implementation milestone, not a result. No test suite, type check, or browser run has been performed for the new snapshot path. The next gate is to port the userland and React-fork cases for urgent rebasing, action order, stale snapshot rejection/retry, roots joining pending work, promise-valued state, selector previous-value chains, supersession, and late completion. See [the implementation protocol](./async-store-transition-protocol.md) and [source](./src/async_store_runtime.ts).",
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
console.log("Updated the notebook with the async store prototype status.");
