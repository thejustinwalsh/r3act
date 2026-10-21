const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Browser sparse per-frame updates: React vs row and bucket dispatch",
  "",
  "This production-build follow-up takes the Deno dirty-column mechanism into the browser and compares it with React 19.3 + React Compiler and direct DOM writes. Six arms update the same stable entity nodes at 512 and 4,096 rows, with 1%, 10%, 50%, or 100% dirty rows and clustered or seeded-scattered locality. Three isolated page loads per cell collect 30 warmup and 60 measured requestAnimationFrame callbacks.",
  "",
  "The timer includes worklist construction, deterministic x/y value calculation, VDOM dispatch and host writes, or the React external-store updates and synchronous commit. React uses one `useSyncExternalStore` subscription per entity and notifies only dirty rows. The dense VDOM scans all bound rows; dirty-row dispatch visits the freshly filled dirty list; bucket arms build and scan unique 32- or 128-row buckets. The replication unit is a page load; callbacks are nested measurements.",
  "",
  "Before charting, this cell checks the preregistration, source snapshot hashes, all 288 raw-record hashes, exact arm/workload balance, production build mode, visible-page state, output parity, and stable node identity. It reports the median of page-level medians and page-level p95 values. The RAF interval chart is a cadence proxy only; it does not observe paint or physical presentation. This workload isolates per-frame declarative prop changes, not a complete game or general React application.",
].join("\n");
const source = await Deno.readTextFile(
  "notebook_cells/snake_sparse_frame_v1.ts",
);
const markdownCell = {
  cell_type: "markdown",
  id: "snake-sparse-frame-v1-markdown",
  metadata: { tags: ["snake-sparse-frame-v1-markdown"] },
  source: markdown.split("\n").map((line) => `${line}\n`),
};
const codeCell = {
  cell_type: "code",
  execution_count: null,
  id: "snake-sparse-frame-v1-code",
  metadata: { tags: ["snake-sparse-frame-v1-code"] },
  outputs: [],
  source: source.split("\n").map((line) => `${line}\n`),
};
const insertAfterTag = (tag: string, cells: unknown[]) => {
  const index = notebook.cells.findIndex((cell: any) =>
    cell.metadata?.tags?.includes(tag)
  );
  if (index < 0) notebook.cells.push(...cells);
  else notebook.cells.splice(index + 1, 0, ...cells);
};
const oldMarkdown = notebook.cells.findIndex((cell: any) =>
  cell.metadata?.tags?.includes("snake-sparse-frame-v1-markdown")
);
if (oldMarkdown >= 0) notebook.cells.splice(oldMarkdown, 2);
insertAfterTag("columnar-dispatch-v1-code", [markdownCell, codeCell]);
await Deno.writeTextFile(
  "research.ipynb",
  `${JSON.stringify(notebook, null, 1)}\n`,
);
console.log(
  "Inserted the browser sparse-frame study after the Deno dispatch mechanism study.",
);
