const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AQ — minimum production bundle size",
  "",
  "Matched minimal counter fixtures mount one button and update its text from native click state. Both are built as single ES2022 production bundles with Vite 8.3.1 and Oxc minification; gzip uses level 9. The prototype fixture bundles ComponentStateRoot, DOMVDOMHost, and the owner/state-site runtime. The React fixture bundles React 19.3 and React DOM 19.3.",
  "",
  "The runtime fixture is 33,528 bytes raw / 8,892 bytes gzip; React is 297,192 bytes raw / 75,584 bytes gzip. This indicates a much smaller payload for this minimal app, but the prototype implements far fewer features. It is not an equal-capability or representative-app size comparison. Reproduce with pnpm run bundle:size; source fixtures are in src/size-fixtures/ and the raw result is results/runtime-size-v1.json.",
  "",
].join("\n");
const code = await Deno.readTextFile("notebook_cells/runtime_bundle_size.ts");
const replaceOrAppend = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
replaceOrAppend("runtime-bundle-size-markdown", {
  cell_type: "markdown",
  id: "runtime-bundle-size-markdown",
  metadata: { tags: ["runtime-bundle-size-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
replaceOrAppend("runtime-bundle-size-code", {
  cell_type: "code",
  execution_count: null,
  id: "runtime-bundle-size-code",
  metadata: { tags: ["runtime-bundle-size-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Updated runtime bundle-size notebook cells idempotently");
