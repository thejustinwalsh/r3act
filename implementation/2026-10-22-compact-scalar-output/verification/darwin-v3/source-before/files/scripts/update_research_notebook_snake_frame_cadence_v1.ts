const notebookPath = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(notebookPath));
const markdown = `### Per-frame callback cadence follow-up: Snake V1

This preregistered study extends the lifecycle-inclusive Snake benchmark to 1,024, 4,096, and 8,192 fixed segments. Each of 45 fresh production pages first calibrates 120 idle RAF intervals, mounts its scene, warms up for 60 callbacks, and records 240 per-frame update CPU samples and RAF intervals. A callback is flagged late when its interval exceeds 1.5× that page's calibrated median interval; estimated missed slots are reported separately. Five randomized blocks pair React 19.3 + verified React Compiler with scalar retained VDOM and OXC-plan columnar retained VDOM.

The figures report page-level medians. Callback samples are nested within pages, not independent replications. The late-callback threshold is a cadence proxy; it does not observe compositor presentation timestamps or prove perceived smoothness. Layout and paint occur naturally in this DOM workload, but are not separately attributed. An 8,192-segment smoke run showed why both measures matter: update CPU can be several milliseconds lower while RAF callbacks still arrive multiple refresh periods apart.

The cell independently verifies the 45-page schedule, frozen workload sources and production bundle hashes, the raw manifest hashes, output and cleanup contracts, and the preregistered decision. The Vite config was extended after this collection to add the separate phase-attribution harness, so that one tooling source hash is reported as post-collection drift; its original production assets and records remain hash-verified. Interpret a floor-limited result or a failed hypothesis as recorded; do not promote the update CPU advantage into a smoothness claim.`;
const code = await Deno.readTextFile(
  "notebook_cells/snake_frame_cadence_v1.ts",
);
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("snake-frame-cadence-v1-markdown", {
  cell_type: "markdown",
  id: "snake-frame-cadence-v1-markdown",
  metadata: { tags: ["snake-frame-cadence-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("snake-frame-cadence-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-cadence-v1-code",
  metadata: { tags: ["snake-frame-cadence-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  notebookPath,
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Updated the cadence V1 notebook section idempotently.");
