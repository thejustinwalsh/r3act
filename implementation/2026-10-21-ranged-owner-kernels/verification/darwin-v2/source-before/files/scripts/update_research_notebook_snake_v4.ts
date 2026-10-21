const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment AS — OXC-generated per-frame bindings (Snake V4)",
  "",
  "V4 is a separate two-dimensional fixed-topology protocol. Every arm writes the same segment x/y coordinates through left/top styles so the current OXC repeated-host compiler can express the plan. The arms are React 19.3 with React Compiler and leaf external-store subscriptions; retained VDOM with two hand-authored bindings; an OXC-emitted repeated-host plan with two item-local CSR slots and generated style writers; and cached direct DOM.",
  "",
  "The frozen matrix has 32, 128, 512, and 1,024 segments, four arms, and four page-load replications per cell (64 pages). Each page has 90 warmup and 300 measured RAF callbacks. Arm and segment-count order rotate across replications. The page is the replication unit; frame observations are nested. Coordinate derivation happens once per segment inside the measured interval in every arm. The generated path updates x and y source slots and flushes once per RAF. The static generated plan is part of the bundle, but mount, compiler execution, bundle parse, and memory are not in the timing.",
  "",
  "The notebook validates all 64 SHA-256-pinned records, trial IDs, page-load IDs, visible state, output parity, stable node identity, and complete React commit timestamps before summarizing. It reports the median of page medians and the median of page p95 values; SVG error bars show the min/max of four page medians. All runs used Chrome 154 on one MacIntel device/profile. Layout, paint, GPU, and physical presentation are excluded. The V4 left/top output path is not pooled with V3 transform output.",
  "",
  "This tests a narrow compiler-emitted repeated-host binding plan, not general TSX compilation or a full retained-VDOM compiler pipeline. React performs component execution, store notification, reconciliation, and style commit; the generated plan executes direct host writers. Interpret differences as implementation-path evidence, not equal-work framework speedups.",
  "",
].join("\n");
const code = await Deno.readTextFile(
  "notebook_cells/snake_frame_v4_browser.ts",
);
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("snake-frame-v4-browser-markdown", {
  cell_type: "markdown",
  id: "snake-frame-v4-browser-markdown",
  metadata: { tags: ["snake-frame-v4-browser-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("snake-frame-v4-browser-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-v4-browser-code",
  metadata: { tags: ["snake-frame-v4-browser-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log("Updated OXC-generated Snake V4 notebook cells idempotently");
