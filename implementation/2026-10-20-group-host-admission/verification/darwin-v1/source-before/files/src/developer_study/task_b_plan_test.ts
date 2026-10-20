import { keyedFilterRegionsPlan } from "./generated_task_b_regions.ts";

Deno.test("Task B dependency graph keeps query regions independent and rows shared", () => {
  const graph = keyedFilterRegionsPlan.dependency_graph;
  const slot = Object.fromEntries(graph.source_paths.map((path, index) => [path, index]));
  if (slot.queryA === undefined || slot.queryB === undefined || slot.rows === undefined) {
    throw new Error(`Missing Task B dependency source: ${JSON.stringify(graph.source_paths)}`);
  }
  const regionsFor = (sourceSlot: number) => graph.region_ids.slice(
    graph.source_region_offsets[sourceSlot],
    graph.source_region_offsets[sourceSlot + 1],
  );
  const same = (actual: readonly number[], expected: readonly number[]) =>
    JSON.stringify(actual) === JSON.stringify(expected);
  if (!same(regionsFor(slot.queryA), [0])) {
    throw new Error(`queryA should invalidate groups only, got ${regionsFor(slot.queryA)}`);
  }
  if (!same(regionsFor(slot.queryB), [1])) {
    throw new Error(`queryB should invalidate scores only, got ${regionsFor(slot.queryB)}`);
  }
  if (!same(regionsFor(slot.rows), [0, 1])) {
    throw new Error(`rows should invalidate both regions, got ${regionsFor(slot.rows)}`);
  }
});
