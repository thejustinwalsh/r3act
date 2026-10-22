import { DerivedRegionDispatcher } from "./derived_region_runtime.ts";
import { keyedFilterRegionsPlan } from "./browser/generated_keyed_filter_regions.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot, type MemoryNode } from "./vdom_snapshot_runtime.ts";

const assertEquals = (actual: unknown, expected: unknown) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
};
const assertThrows = (run: () => unknown, expectedName: "Error" | "RangeError", message?: string) => {
  try {
    run();
  } catch (error) {
    if (!(error instanceof Error) || error.name !== expectedName || (message !== undefined && error.message !== message)) throw error;
    return;
  }
  throw new Error(`Expected ${expectedName} to be thrown`);
};

Deno.test("shared-source fan-out deduplicates overlapping regions within a batch", () => {
  const dispatcher = new DerivedRegionDispatcher(keyedFilterRegionsPlan.dependency_graph);
  dispatcher.invalidateSourceSlot(0);
  dispatcher.invalidateSourceSlot(2);
  const ran: number[] = [];
  assertEquals(dispatcher.flush((region) => ran.push(region)), 2);
  assertEquals(ran, [0, 1]);
  assertEquals(dispatcher.flush((region) => ran.push(region)), 0);
});

Deno.test("generated query edges are local and rows fans out to both regions", () => {
  const expected: Record<"queryA" | "queryB" | "rows", number[]> = {
    queryA: [0],
    queryB: [1],
    rows: [0, 1],
  };
  for (const source of ["queryA", "queryB", "rows"] as const) {
    const dispatcher = new DerivedRegionDispatcher(keyedFilterRegionsPlan.dependency_graph);
    const sourceSlot = keyedFilterRegionsPlan.dependency_graph.source_paths.indexOf(source);
    dispatcher.invalidateSourceSlot(sourceSlot);
    const ran: number[] = [];
    dispatcher.flush((region) => ran.push(region));
    assertEquals(ran, expected[source]);
  }
});

Deno.test("multiple graph regions retain first invalidation order", () => {
  const dispatcher = new DerivedRegionDispatcher({
    source_count: 2,
    source_paths: ["a", "b"],
    source_region_offsets: [0, 2, 4],
    region_ids: [2, 0, 1, 2],
  });
  dispatcher.invalidateSourceSlot(0);
  dispatcher.invalidateSourceSlot(1);
  const ran: number[] = [];
  assertEquals(dispatcher.flush((region) => ran.push(region)), 3);
  assertEquals(ran, [2, 0, 1]);
});

Deno.test("malformed region graphs and invalid source slots fail at the boundary", () => {
  assertThrows(() => new DerivedRegionDispatcher({
    source_count: 1,
    source_paths: ["query"],
    source_region_offsets: [0, 2],
    region_ids: [0],
  }), "Error", "Malformed derived-region CSR graph");
  const dispatcher = new DerivedRegionDispatcher({
    source_count: 1,
    source_paths: ["query"],
    source_region_offsets: [0, 0],
    region_ids: [],
  });
  assertThrows(() => dispatcher.invalidateSourceSlot(1), "RangeError");
});

Deno.test("compiled query and shared-row updates match a full VDOM derivation", () => {
  type Row = { id: number; label: string; group: number; score: number };
  let rows: Row[] = Array.from({ length: 100 }, (_, id) => ({
    id,
    label: `row ${id}`,
    group: id % 10,
    score: id % 101,
  }));
  const queries = { queryA: "0", queryB: "80" };
  const select = (region: 0 | 1, query: string) => {
    const value = Number(query);
    return rows.filter((row) => region === 0 ? row.group === value : row.score >= value);
  };
  const regionTree = (region: 0 | 1, query: string) => jsx(
    "ul",
    { className: "keyed-list" },
    select(region, query).map((row) => jsx("li", { key: row.id, "data-id": row.id }, `${row.label}:${row.group}:${row.score}`)),
  );
  const fullTree = () => jsx(
    "main",
    { className: "keyed-regions" },
    jsx("section", { "data-region": "groups" }, regionTree(0, queries.queryA)),
    jsx("section", { "data-region": "scores" }, regionTree(1, queries.queryB)),
  );
  const makeRuntime = () => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container);
    return { host, container, root };
  };
  const full = makeRuntime();
  const compiled = makeRuntime();
  const compiledMain = compiled.host.createElement("main");
  compiled.host.setProp(compiledMain, "className", "keyed-regions");
  compiled.host.place(compiled.container, compiledMain, null);
  const sections = ["groups", "scores"].map((name) => {
    const section = compiled.host.createElement("section");
    compiled.host.setProp(section, "data-region", name);
    compiled.host.place(compiledMain, section, null);
    return section;
  });
  const compiledRoots = sections.map((section) => new VDOMSnapshotRoot(compiled.host, section));
  const syncFull = () => full.root.commit(fullTree());
  const syncCompiledRegion = (region: number) => {
    compiledRoots[region].commit(regionTree(region as 0 | 1, region === 0 ? queries.queryA : queries.queryB));
  };
  const dispatcher = new DerivedRegionDispatcher(keyedFilterRegionsPlan.dependency_graph);
  const syncCompiledSources = (sourceNames: readonly ("queryA" | "queryB" | "rows")[]) => {
    for (const source of sourceNames) {
      const slot = keyedFilterRegionsPlan.dependency_graph.source_paths.indexOf(source);
      dispatcher.invalidateSourceSlot(slot);
    }
    dispatcher.flush(syncCompiledRegion);
  };
  const canonical = (node: MemoryNode): unknown => node.kind === "text"
    ? { text: node.text }
    : { tag: node.tag, props: node.props, children: node.children.map(canonical) };
  const assertParity = () => assertEquals(canonical(compiled.container), canonical(full.container));

  syncFull();
  syncCompiledSources(["queryA", "queryB"]);
  assertParity();

  const untouchedScoresSection = sections[1];
  const untouchedScoresList = sections[1].children[0];
  queries.queryA = "7";
  syncFull();
  syncCompiledSources(["queryA"]);
  assertParity();
  if (compiledMain.children[1] !== untouchedScoresSection || sections[1].children[0] !== untouchedScoresList) {
    throw new Error("Updating queryA touched the independent scores region");
  }

  const untouchedGroupsList = sections[0].children[0];
  queries.queryB = "25";
  syncFull();
  syncCompiledSources(["queryB"]);
  assertParity();
  if (sections[0].children[0] !== untouchedGroupsList) throw new Error("Updating queryB touched the independent groups region");

  rows = rows.map((row) => row.id === 7 ? { ...row, group: 2, score: 99 } : row);
  syncFull();
  syncCompiledSources(["rows"]);
  assertParity();
});
