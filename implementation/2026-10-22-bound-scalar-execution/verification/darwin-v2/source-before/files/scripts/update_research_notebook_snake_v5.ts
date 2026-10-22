const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "### Experiment AT — preregistered Snake V5: OXC bindings through the retained VDOM",
  "",
  "V5 closes the specific gap between the prior OXC repeated-host Snake arm and Experiment V's generic OXC-to-VDOM binding integration. It compares five per-frame paths on identical left/top props: React 19.3 + React Compiler with leaf external-store subscriptions; runtime-discovered bindings through the retained VDOM; OXC-emitted CSR bindings through the retained VDOM; OXC-generated repeated-host writers; and cached direct DOM writes.",
  "",
  "The frozen schedule has 32, 128, 512, and 1,024 segments, five page-load replications per cell, 90 warmup RAFs and 300 measured RAF callbacks per page: 100 pages and 30,000 measured callbacks. Arm position uses a five-cycle Latin rotation; size order rotates by replication. The page is the replication unit and RAFs are nested observations. The schedule, pre-data hostname amendment, and URLs are in `results/browser-snake-frame-v5-preregistration.json`; the [source lock](./results/browser-snake-frame-v5-source-lock.json) pins the measured paths and dependencies. All 100 scheduled pages passed and are SHA-256-pinned in `results/browser-snake-frame-v5-manifest.json`; the 60-frame smoke is excluded.",
  "",
  "The page measures mount-to-first-commit, update CPU, update-to-commit, RAF interval p95, and Chrome heap-used snapshots before mount, after mount, and after the measured frames when available. The heap values are noisy diagnostics, not allocation attribution. Setup-plus-update break-even counts pair mount and per-frame medians by size and replication. SVG charts report update-to-commit, mount cost, and RAF interval p95. The HTML record validator checks parity, stable host identity, React commit coverage, visibility, and all 300 samples before archiving.",
  "Results are faster on update-to-commit for the OXC-to-VDOM arm in this workload: its median/p95 is 0.1/0.2, 0.2/0.3, 0.5/0.6, and 0.8/1.0 ms at 32, 128, 512, and 1,024 segments; React + Compiler is 0.8/1.0, 1.9/2.2, 2.4/6.0, and 3.7/9.6 ms. The generated VDOM arm uses more synchronous update CPU at 512 and 1,024 segments, and the runtime-discovered VDOM path is slightly faster there (0.4 and 0.7 ms). RAF interval p95 stays around 16.8–17.5 ms across arms, so these data do not show a smoother presented frame.",
  "The original V5 collection used the Vite development server; build mode was omitted from that schedule. A separately frozen confirmatory schedule repeated the same matrix against the Vite production build. Its 100-page, 30,000-frame dataset and build-mode-paired analysis appear in the next notebook section.",
  "",
  "This remains a fixed-topology DOM workload. It excludes JavaScript parse/evaluation, compiler execution, layout, paint, GPU work, and physical presentation. It does not establish a general React speedup, visual smoothness, or framework maintainability. Results remain one-device mechanism evidence; second-device replication, structural churn, and user-facing tasks remain open.",
  "",
].join("\n");
const code = "{\n" +
  await Deno.readTextFile("notebook_cells/snake_frame_v5_browser.ts") + "\n}\n";
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("snake-frame-v5-browser-markdown", {
  cell_type: "markdown",
  id: "snake-frame-v5-browser-markdown",
  metadata: { tags: ["snake-frame-v5-browser-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("snake-frame-v5-browser-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-frame-v5-browser-code",
  metadata: { tags: ["snake-frame-v5-browser-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  "research.ipynb",
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Updated preregistered OXC-to-VDOM Snake V5 notebook cells idempotently",
);
