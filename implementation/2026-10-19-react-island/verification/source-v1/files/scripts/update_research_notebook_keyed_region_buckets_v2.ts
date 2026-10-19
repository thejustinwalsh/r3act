const path = "research.ipynb";
const notebook = JSON.parse(await Deno.readTextFile(path));
const markdown = [
  "### Experiment AU — bucketed regions versus an indexed flat array",
  "",
  "This preregistered follow-up strengthens Experiment AT's flat-array control by maintaining a `Map<key, index>`. After each ordered `splice`, it updates the position map for the affected suffix. It repeats the same seeded 64 move-before operations at head, middle, and tail positions in lists of 1,000, 10,000, and 50,000 rows, with 32/64/128/256-entry buckets, two warmups, and seven measured samples per condition.",
  "",
  "The timed measure includes array movement and position-index writes. The bucketed arm includes local bucket movement and offset writes. These counters are not identical machine operations, so keep them distinct. The harness verifies exact final order against the indexed-array reference and checks bucket integrity after each sample; the post-collection manifest hashes source, benchmark, preregistration, and records.",
  "",
  "This is still a collection data-structure study. A bucket win here is a reason to integrate one candidate into the actual compiled keyed-region runtime and test its complete owner/VDOM/DOM cost against React Compiler, not proof that integration will win. The seven-sample p95 equals the maximum observed value.",
].join("\n");
const code = "{\n" + await Deno.readTextFile("notebook_cells/keyed_region_buckets_v2.ts") + "\n}\n";
const upsert = (tag: string, cell: Record<string, unknown>) => {
  const index = notebook.cells.findIndex((item: any) => item.metadata?.tags?.includes(tag));
  if (index >= 0) notebook.cells[index] = cell;
  else notebook.cells.push(cell);
};
upsert("keyed-region-buckets-v2-markdown", {
  cell_type: "markdown", id: "keyed-region-buckets-v2-markdown",
  metadata: { tags: ["keyed-region-buckets-v2-markdown"] },
  source: markdown.split("\n").map((line) => line + "\n"),
});
upsert("keyed-region-buckets-v2-code", {
  cell_type: "code", execution_count: null, id: "keyed-region-buckets-v2-code",
  metadata: { tags: ["keyed-region-buckets-v2-code"] }, outputs: [],
  source: code.split("\n").map((line) => line + "\n"),
});
await Deno.writeTextFile(path, JSON.stringify(notebook, null, 1) + "\n");
console.log("Added Experiment AU to research.ipynb idempotently");
