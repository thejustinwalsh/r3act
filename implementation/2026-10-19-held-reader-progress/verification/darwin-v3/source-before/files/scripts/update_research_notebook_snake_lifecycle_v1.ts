const notebookPath = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(notebookPath));
const markdown = `### Lifecycle-inclusive browser study: Snake frame updates V1

The V6 per-frame experiment showed a repeated-update advantage but estimated mount amortization post hoc and did not measure teardown. This follow-up preregistered the lifecycle before collection: five randomized page blocks for each of 512 and 1,024 fixed segments, with React 19.3 + verified React Compiler, scalar-source retained VDOM, and OXC-plan columnar retained VDOM. Each fresh visible production page mounted the scene, ran 90 warmup RAF callbacks, measured 300 update callbacks, verified final coordinates and stable host identity, then unmounted/disposed and checked for retained subscriptions, bindings, or host nodes. The primary metric is mount + summed update JavaScript CPU + teardown; it excludes navigation, parse/compile, paint, GPU, and display wait.

All 30 scheduled records passed correctness; the source lock recorded 93 frozen source/build hashes and was verified before the original collection. A pre-collection amendment set final CSS position tolerance to 0.01 px after an excluded smoke run exposed Chrome's three-decimal serialization of inline fractional values. Smoke records are stored separately and do not enter the analysis. The raw manifest pins all 30 production records by SHA-256. A later cadence study changed the live Vite config and replaced the shared production build, and V1 did not archive a separate source snapshot. The notebook reports that drift and validates the immutable raw records, manifest, and schedule rather than claiming the old build is still present.

The preregistered product gate **passes** on this device: columnar VDOM's paired total-cycle ratio to React was 0.508× at 512 segments and 0.513× at 1,024, with all five pairs at each size below the 0.90 threshold. Its median per-update CPU was also lower in all five pairs at both sizes. Median cycle costs (React / scalar VDOM / columnar VDOM) were 219.1 / 123.3 / 102.5 ms at 512 and 333.4 / 206.2 / 171.9 ms at 1,024, for 300 updates plus mount/teardown. Columnar mounting remained slower than React (4.3 vs 2.6 ms at 512; 6.4 vs 3.7 ms at 1,024), but this cost did not erase the repeated-update savings in the preregistered 300-frame episode.

As an exploratory cadence check, each raw page also recorded full run wall time. Dividing that by 391 scheduled callback slots gives an approximate average of 16.78–16.86 ms per slot at 512 segments and 17.24–17.25 ms at 1,024 across the three arms. This average does not retain individual RAF intervals and is not a display-presentation measurement. It suggests that lower update CPU did not materially accelerate this animation loop; this study cannot establish a visible smoothness difference.

The performance.memory.usedJSHeapSize readings are an exploratory diagnostic, not an allocation or retention result. All 30 pages reported values, but 22/30 reported an exactly zero after-mount delta; 15/30 reported a lower heap after teardown than before mount, with signed teardown changes spanning about −17.5 to +17.5 MiB. Garbage collection and unrelated page heap dominate this signal. The SVG and page-level summary below expose the observations without treating them as bytes allocated. A future memory study needs a controlled heap-snapshot or allocation-instrumentation protocol with repeated lifecycle cycles and explicit GC handling.

This supports a narrow mechanism claim: retained prop bindings, especially the columnar compiled writer, reduce measured JavaScript cycle cost for a stable, fixed-topology per-frame workload against this React + Compiler baseline. It does not show smoother presentation, a general React speedup, dynamic-topology performance, a second-device replication, or lower maintenance cost. The next evidence gate is independent-device replication and a separate dynamic-structure/lifecycle workload; do not generalize this result beyond these tested arms, sizes, and device profile.`;
const code = await Deno.readTextFile("notebook_cells/snake_lifecycle_v1.ts");
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("snake-lifecycle-v1-markdown", {
  cell_type: "markdown",
  id: "snake-lifecycle-v1-markdown",
  metadata: { tags: ["snake-lifecycle-v1-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("snake-lifecycle-v1-code", {
  cell_type: "code",
  execution_count: null,
  id: "snake-lifecycle-v1-code",
  metadata: { tags: ["snake-lifecycle-v1-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(
  notebookPath,
  JSON.stringify(notebook, null, 1) + "\n",
);
console.log(
  "Updated the lifecycle-inclusive Snake notebook section idempotently.",
);
