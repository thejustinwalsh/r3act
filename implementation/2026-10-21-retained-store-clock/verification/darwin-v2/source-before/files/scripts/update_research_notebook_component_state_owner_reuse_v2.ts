const notebook = JSON.parse(await Deno.readTextFile("research.ipynb"));
const markdown = [
  "## Experiment AS — Preregistered keyed-region version-token follow-up",
  "",
  "V2 follows the V1 result in §8.12. It tests whether an opaque compiler/runtime-owned region version can remove V1's per-row eligibility scan while retaining the general keyed VDOM and owner-state model. React 19.3 + React Compiler is contextual; generic owner expansion is the runtime control. The token is preserved only for key-preserving rotation and changed for membership edits.",
  "",
  "The frozen protocol uses 10,000 keyed stateful rows, five fresh visible production pages (seeds 83005101–83005105), eight warmups, 24 paired samples per operation, all 24 four-arm orders once per operation/page, and a 12/12 filter shrink/restore split. Timing stops at host commit. A separate diagnostic page validates mechanism and is excluded from latency estimates. Amendments 01–05 record archive, observability, treatment activation, stale cached child output, and permutation-validator repairs; the hypotheses, workload, thresholds, and exclusions remain unchanged.",
  "",
  "The two rotation gates pass on 5/5 pages: median paired V2/generic is 0.450× and V2/React is 0.687×. The token mechanism records 240,000 cached outputs reused and zero eligibility visits across 24 diagnostic rotation samples. Membership changes mismatch early and fall back without a per-row eligibility scan. However, edge replacement is 1.143× generic at the median of page-level paired ratios, above the 1.10 fallback ceiling; filter shrink is 1.081× and restore 1.021×. Therefore the overall preregistered pass fails. The result supports a stable-key rotation specialization in the shared VDOM runtime, not replacing the general structural path or claiming a broad runtime win.",
  "",
  "The first corrected diagnostic caught stale cached output after a keyed child changed its own state. The runtime now refreshes the token directory on direct child-owner commits, and the deterministic state/effect suite passes. The immutable V2 source snapshot and raw hashes are checked below. Browser measurements are one Chrome 154 MacIntel profile, update-to-host-commit only; no layout, paint, or frame-presentation claim follows.",
].join("\n");
const code = "{\n" + await Deno.readTextFile(
  "notebook_cells/component_state_owner_reuse_v2.ts",
) + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) =>
    item.metadata?.tags?.includes(tag)
  );
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("component-state-owner-reuse-v2-markdown", {
  cell_type: "markdown",
  id: "component-state-owner-reuse-v2-markdown",
  metadata: { tags: ["component-state-owner-reuse-v2-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("component-state-owner-reuse-v2-code", {
  cell_type: "code",
  execution_count: null,
  id: "component-state-owner-reuse-v2-code",
  metadata: { tags: ["component-state-owner-reuse-v2-code"] },
  outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile("research.ipynb", JSON.stringify(notebook, null, 1) + "\n");
console.log("Added V2 raw-hash/source snapshot verification, preregistered gate analysis, and SVG charts.");
