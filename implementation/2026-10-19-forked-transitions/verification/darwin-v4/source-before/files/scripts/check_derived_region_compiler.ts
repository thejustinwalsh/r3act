const cwd = Deno.cwd();
const tempDir = await Deno.makeTempDir({ dir: `${cwd}/.cache`, prefix: "derived-region-check-" });
try {
  const compile = await new Deno.Command("cargo", {
    args: [
      "run", "--quiet", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
      "compiler/fixtures/keyed_filter_region.tsx", "--derived-keyed-region",
      "--out", `${tempDir}/plan.json`, "--emit", `${tempDir}/plan.ts`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!compile.success) throw new Error(`OXC failed to compile the keyed-region fixture:\n${new TextDecoder().decode(compile.stderr)}`);

  const plan = JSON.parse(await Deno.readTextFile(`${tempDir}/plan.json`));
  if (plan.schema_version !== 1 || plan.collection_source !== "rows" || plan.collection_binding !== "visible" ||
    plan.predicate_sources?.join(",") !== "query" || plan.item_parameter !== "row" || plan.item_key_path !== "row.id" ||
    plan.root_tag !== "ul" || plan.item_tag !== "li" || plan.region_id !== 0) {
    throw new Error("OXC emitted unexpected keyed-region metadata");
  }
  const graph = plan.dependency_graph;
  if (graph?.source_count !== 2 || graph.source_paths?.join(",") !== "query,rows" ||
    graph.source_region_offsets?.join(",") !== "0,1,2" || graph.region_ids?.join(",") !== "0,0") {
    throw new Error("OXC did not emit the expected source-to-keyed-region CSR graph");
  }
  const checkedIn = await Deno.readTextFile("src/browser/generated_keyed_filter_region.ts");
  const emitted = await Deno.readTextFile(`${tempDir}/plan.ts`);
  if (checkedIn !== emitted) throw new Error("Checked-in keyed-region module is stale; run deno task compiler:region");

  const multiCompile = await new Deno.Command("cargo", {
    args: [
      "run", "--quiet", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--",
      "compiler/fixtures/keyed_filter_regions.tsx", "--derived-keyed-regions",
      "--out", `${tempDir}/regions.json`, "--emit", `${tempDir}/regions.ts`,
    ],
    cwd,
    env: { CARGO_HOME: `${cwd}/.cache/cargo` },
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!multiCompile.success) throw new Error(`OXC failed to compile the multi-region fixture:\n${new TextDecoder().decode(multiCompile.stderr)}`);
  const multiPlan = JSON.parse(await Deno.readTextFile(`${tempDir}/regions.json`));
  const multiGraph = multiPlan.dependency_graph;
  if (multiPlan.schema_version !== 2 || multiPlan.regions?.length !== 2 ||
    multiPlan.regions[0]?.root_tag !== "section" || multiPlan.regions[0]?.item_key_path !== "row.id" ||
    multiPlan.regions[1]?.root_tag !== "section" || multiPlan.regions[1]?.item_key_path !== "row.id") {
    throw new Error("OXC did not emit both keyed section regions with stable row keys");
  }
  if (multiGraph?.source_count !== 3 || multiGraph.source_paths?.join(",") !== "queryA,queryB,rows" ||
    multiGraph.source_region_offsets?.join(",") !== "0,1,2,4" || multiGraph.region_ids?.join(",") !== "0,1,0,1") {
    throw new Error("OXC did not emit the expected sparse query edges and shared rows fan-out");
  }
  const checkedInRegions = await Deno.readTextFile("src/browser/generated_keyed_filter_regions.ts");
  const emittedRegions = await Deno.readTextFile(`${tempDir}/regions.ts`);
  if (checkedInRegions !== emittedRegions) throw new Error("Checked-in multi-region module is stale; run deno task compiler:region");
} finally {
  await Deno.remove(tempDir, { recursive: true });
}
console.log("OXC emitted keyed-region and multi-region dependency plans matching their checked-in generated modules.");
