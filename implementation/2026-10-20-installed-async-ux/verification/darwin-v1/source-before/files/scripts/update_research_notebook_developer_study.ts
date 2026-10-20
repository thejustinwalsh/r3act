const notebookPath = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(notebookPath));
const statusMarkdown = `## Feature authoring and comprehension — pre-data pilot

The runtime's simpler-to-extend claim has **no participant evidence yet**. This bounded within-participant pilot compares conditional state/lifecycle and shared-source derived-region tasks against React 19.3 + React Compiler. It measures correctness, time to a correct solution, comprehension, and traceability. It does not test extending host adapters or compiler plans, and it does not use line count as a simplicity score.

The eight-slot design balances system and task order. The exact packet, draft rubric, raw-data schema, and Deno analysis are linked in [the protocol](./developer-study-protocol.md). The protocol and rubric remain unpiloted pre-data drafts; the lock below is only for reproducible fixture feasibility, not scored collection. Do not infer maintainability from fixture parity, the warm-up, bundle size, or update timings.`;
const statusCell = notebook.cells.find((cell: any) =>
  cell.id === "developer-study-preregistration"
);
if (!statusCell || statusCell.cell_type !== "markdown") {
  throw new Error("Notebook is missing the developer-study status cell");
}
statusCell.source = statusMarkdown.split("\n").map((line) => `${line}\n`);

const code = await Deno.readTextFile(
  "notebook_cells/developer_study_status.ts",
);
const codeCell = {
  cell_type: "code",
  execution_count: null,
  id: "developer-study-status-code",
  metadata: { tags: ["developer-study-status"] },
  outputs: [],
  source: code.split("\n").map((line) => `${line}\n`),
};
const index = notebook.cells.findIndex((cell: any) =>
  cell.id === codeCell.id
);
if (index >= 0) notebook.cells[index] = codeCell;
else notebook.cells.splice(notebook.cells.indexOf(statusCell) + 1, 0, codeCell);

await Deno.writeTextFile(
  notebookPath,
  `${JSON.stringify(notebook, null, 1)}\n`,
);
console.log("Updated the notebook's feature-authoring study status and analysis cell.");
