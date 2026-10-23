const notebookPath = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(notebookPath));
const markdown = `### Long Animation Frames phase attribution: Snake V1

This preregistered 30-page follow-up pairs React 19.3 + verified React Compiler, scalar retained VDOM, and OXC-plan columnar retained VDOM at 1,024 and 8,192 fixed segments. Each fresh visible production page calibrates 120 idle RAF intervals, warms up for 60 callbacks, and measures 240 updates. The Long Animation Frames API is feature-detected before collection; an unsupported page fails rather than silently switching instrumentation.

The API reports only frames longer than 50 ms. The analysis preserves total LoAF duration, script attribution, blocking duration, renderStart, styleAndLayoutStart, and the remaining interval from styleAndLayoutStart to the entry end. Script duration and this remainder are separate coarse observables, not exclusive pieces of frame time. A missing LoAF entry does not mean the browser did no style, layout, or paint work; none of these values measure compositor completion or display presentation.

The cell verifies the frozen schedule and source/build lock, every raw hash, API support, output parity, stable host identity, and teardown. It presents page-level summaries with SVGs and no causal or smoothness claim. Smoke records are isolated from the scheduled collection.`;
const code = await Deno.readTextFile(
  "notebook_cells/snake_frame_phase_v1.ts",
);
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("snake-frame-phase-v1-markdown", {
  cell_type: "markdown",
  id: "snake-frame-phase-v1-markdown",
  metadata: { tags: ["snake-frame-phase-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("snake-frame-phase-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-phase-v1-code",
  metadata: { tags: ["snake-frame-phase-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  notebookPath,
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Updated the phase-attribution V1 notebook section idempotently.");
