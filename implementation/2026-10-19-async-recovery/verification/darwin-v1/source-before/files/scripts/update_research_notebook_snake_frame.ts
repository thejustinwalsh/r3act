const notebookPath = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(notebookPath));
notebook.cells = notebook.cells.filter((cell: any) =>
  !cell.metadata?.tags?.includes("next-study-raf-bound-props")
);
const markdown = [
  "### Experiment AR — per-frame declarative prop updates in Snake",
  "",
  "This is a production-build browser comparison of three isolated update paths for a fixed Snake-like trail UI. The simulation advances discretely; every `requestAnimationFrame` recomputes and writes every visible segment transform while topology stays fixed. React 19.3.0 runs with React Compiler and leaf `useSyncExternalStore` subscriptions. A single null-rendering marker component with one layout effect timestamps each commit; no per-segment layout effects are used for measurement. The retained path mounts a JSX helper tree once and uses scalar-source bindings to write each style prop without component execution or VDOM diffing. The direct-DOM arm caches its host nodes and writes the same props as a lower bound.",
  "",
  "The study covers 32, 128, 512, and 1,024 segments. For every size and arm, three isolated page loads each collect 90 warmup and 300 measured frames. Arm order rotates across page-load replicates. The replication unit is the page load; the 300 frames are nested observations. The local archive accepts only visible runs with exact sample counts, final transform parity, stable segment and food node identity, and complete per-frame commit timestamps. `results/browser-snake-frame-v3-manifest.json` pins the exact 36 records with SHA-256 hashes; the notebook validates each hash before analysis. V2 files remain archived as a pilot but are excluded because their per-segment commit effects instrumented the React path.",
  "",
  "The page-level summary reports the median of the three page medians and the median of the three page p95 values. Update CPU measures the state-to-write call path; update-to-commit starts before per-segment derivation and ends at the root marker layout effect or after the retained/direct synchronous write returns. RAF interval is reported separately and is not a presentation measurement. An exploratory post-hoc check counts callback intervals above 25 ms, but this is neither a dropped-frame measurement nor a presentation measurement. The three arms were run in Chrome 154 on one MacIntel device/profile at 1280×720, DPR 2, with an estimated 60 Hz callback cadence. Timer values below 0.1 ms are near this browser's timing resolution. No paint, GPU, physical presentation, high-refresh display, or second-device result is included.",
  "",
  "This measures a retained binding kernel, not an OXC-generated per-frame update plan. The result can answer whether this runtime primitive reduces update-to-commit latency against a React Compiler baseline; it cannot yet establish that the full compiled architecture is faster or simpler. The direct-DOM path is an implementation lower bound, not an authoring API.",
  "",
].join("\n");
const code = await Deno.readTextFile("notebook_cells/snake_frame_browser.ts");
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("snake-frame-browser-markdown", {
  cell_type: "markdown",
  id: "snake-frame-browser-markdown",
  metadata: { tags: ["snake-frame-browser-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("snake-frame-browser-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-browser-code",
  metadata: { tags: ["snake-frame-browser-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  notebookPath,
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Updated Snake frame-study notebook cells idempotently");
