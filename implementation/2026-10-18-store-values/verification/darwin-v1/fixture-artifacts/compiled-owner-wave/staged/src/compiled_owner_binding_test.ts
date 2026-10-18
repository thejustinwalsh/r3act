import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import {
  type BoundValue,
  type NumericBindingProgramDescriptor,
  type NumericBindingProgramDescriptorV2,
  jsx,
} from "./jsx_binding_runtime.ts";
import { compiledStateLayoutSignature, normalizeCompiledStateLayout } from "./compiled_state_layout.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const program = (ownerProgramId: string, sourceSites: readonly string[]): NumericBindingProgramDescriptorV2 => ({
  schemaVersion: 2,
  ownerProgramId,
  sinkId: `${ownerProgramId}:sink`,
  sourceSites,
});

const metadataOf = (component: unknown): any =>
  Object.getOwnPropertySymbols(component as object).map((symbol) =>
    Object.getOwnPropertyDescriptor(component as object, symbol)?.value
  ).find((value) => value?.propOnlySites);

Deno.test("layout program IDs are normalized, frozen, signature-bearing and component-scoped", () => {
  const mutableSlots = [{ siteId: "panel#state:0", slot: 0 }];
  const input = { schemaVersion: 1 as const, programId: "panel", slots: mutableSlots };
  const normalized = normalizeCompiledStateLayout(input);
  assertEquals(normalized.programId, "panel");
  assertEquals(Object.isFrozen(normalized), true);
  assertEquals(Object.isFrozen(normalized.slots), true);
  assertEquals(Object.isFrozen(normalized.slots[0]), true);
  assertEquals(compiledStateLayoutSignature(normalized), compiledStateLayoutSignature(input));
  const legacy = normalizeCompiledStateLayout({ schemaVersion: 1, slots: mutableSlots });
  assertEquals(compiledStateLayoutSignature(legacy) === compiledStateLayoutSignature(normalized), false);
  const sameShapeOtherProgram = normalizeCompiledStateLayout({
    schemaVersion: 1,
    programId: "other-panel",
    slots: mutableSlots,
  });
  assertEquals(
    compiledStateLayoutSignature(normalized) ===
      compiledStateLayoutSignature(sameShapeOtherProgram),
    false,
  );
  const delimiterLeft = normalizeCompiledStateLayout({
    schemaVersion: 1,
    programId: "panel",
    slots: [
      { siteId: "a\u00001:b", slot: 0 },
      { siteId: "c", slot: 1 },
    ],
  });
  const delimiterRight = normalizeCompiledStateLayout({
    schemaVersion: 1,
    programId: "panel",
    slots: [
      { siteId: "a", slot: 0 },
      { siteId: "b\u00001:c", slot: 1 },
    ],
  });
  assertEquals(
    compiledStateLayoutSignature(delimiterLeft) ===
      compiledStateLayoutSignature(delimiterRight),
    false,
  );
  assertThrows(() => normalizeCompiledStateLayout({ schemaVersion: 1, programId: "", slots: [] }));
  assertThrows(() => defineComponent("other", () => null, {
    propOnlySites: ["panel#state:0"],
    stateLayout: input,
  }));
  const component = defineComponent("panel", () => null, {
    propOnlySites: ["panel#state:0"],
    stateLayout: input,
  });
  assertEquals(metadataOf(component).stateLayout.programId, "panel");
  mutableSlots[0].siteId = "mutated";
  assertEquals(metadataOf(component).stateLayout.slots[0].siteId, "panel#state:0");
});

Deno.test("v1 and v2 bindings retain compatibility and expose only valid owner metadata", () => {
  const layout = {
    schemaVersion: 1 as const,
    programId: "panel",
    slots: [
      { siteId: "panel#state:0", slot: 0 },
      { siteId: "panel#state:1", slot: 1 },
    ],
  };
  const sites = layout.slots.map(({ siteId }) => siteId);
  let multi!: BoundValue<number>;
  let unary!: BoundValue<number>;
  let legacy!: BoundValue<number>;
  const derive = (values: readonly number[]) => values[0] + values[1];
  const Panel = defineComponent("panel", () => {
    useStateAt(sites[0], 2);
    useStateAt(sites[1], 3);
    multi = bindStatePropsAt(sites, derive, program("panel", sites)) as BoundValue<number>;
    unary = bindStatePropAt(sites[0], (value) => value * 2, {
      schemaVersion: 2,
      ownerProgramId: "panel",
      sinkId: "panel:unary",
      sourceSites: [sites[0]],
    }) as BoundValue<number>;
    legacy = bindStatePropsAt([sites[0]], ([value]) => value, {
      schemaVersion: 1,
      sinkId: "legacy",
      sourceSites: [sites[0]],
    }) as BoundValue<number>;
    return jsx("output", { multi, unary, legacy });
  }, { propOnlySites: sites, stateLayout: layout });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(Panel, {}));
    assertEquals(multi.numericProgram?.schemaVersion, 2);
    assertEquals(multi.projectInputs, derive, "multi-source V2 exposes the authored projector directly");
    assertEquals(multi.numericOwner?.programId, "panel");
    assertEquals(multi.numericOwner?.layout.programId, "panel");
    assertEquals(multi.numericOwner?.sourceSlots, [0, 1]);
    assertEquals(Object.isFrozen(multi.numericOwner), true);
    assertEquals(Object.isFrozen(multi.numericOwner?.sourceSlots), true);
    assertEquals(unary.numericProgram?.schemaVersion, 2);
    assertEquals(unary.numericOwner?.sourceSlots, [0]);
    assertEquals(unary.projectInputs, undefined, "unary keeps its scalar projector without an array wrapper");
    assertEquals(unary.project(4), 8);
    assertEquals(legacy.numericProgram?.schemaVersion, 1);
    assertEquals(legacy.numericOwner, undefined, "legacy V1 programs do not gain owner authority");
    assertEquals(legacy.projectInputs, undefined);
  } finally {
    root.dispose();
  }
});

Deno.test("V2 owner mismatch keeps numeric binding but withholds owner association", () => {
  const site = "panel#state:0";
  let captured!: BoundValue<number>;
  const Panel = defineComponent("panel", () => {
    useStateAt(site, 7);
    captured = bindStatePropsAt([site], ([value]) => value, program("another-panel", [site])) as BoundValue<number>;
    return jsx("output", { value: captured });
  }, { propOnlySites: [site], stateLayout: {
    schemaVersion: 1,
    programId: "panel",
    slots: [{ siteId: site, slot: 0 }],
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(Panel, {}));
    assertEquals(captured.numericProgram?.schemaVersion, 2);
    assertEquals(captured.numericOwner, undefined);
    assertEquals(captured.projectInputs?.([11]), 11);
  } finally {
    root.dispose();
  }
});

Deno.test("multi-source V2 promotion projects actual strings and undefined without coercion", () => {
  const sites = ["panel#state:0", "panel#state:1"];
  let projected: unknown;
  let projectionTypes: string[] = [];
  const derive = (values: readonly number[]) => {
    projected = values[0] === undefined ? values[1] : `${values[0]}:${String(values[1])}`;
    projectionTypes = [typeof values[0], typeof values[1]];
    return projected;
  };
  const Panel = defineComponent("panel", () => {
    useStateAt(sites[0], "wide" as unknown as number);
    useStateAt(sites[1], undefined as unknown as number);
    const value = bindStatePropsAt(sites, derive, program("panel", sites));
    return jsx("output", { value });
  }, { propOnlySites: sites, stateLayout: {
    schemaVersion: 1,
    programId: "panel",
    slots: sites.map((siteId, slot) => ({ siteId, slot })),
  } });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  try {
    root.mount(jsx(Panel, {}));
    assertEquals(projected, "wide:undefined");
    assertEquals(projectionTypes, ["string", "undefined"]);
  } finally {
    root.dispose();
  }
});

Deno.test("invalid v2 descriptors reject empty owner IDs and duplicate dependencies", () => {
  const site = "panel#state:0";
  const Panel = (descriptor: NumericBindingProgramDescriptor) => defineComponent("panel", () => {
    useStateAt(site, 1);
    bindStatePropsAt(descriptor.sourceSites, ([value]) => value, descriptor);
    return jsx("output", {});
  }, { propOnlySites: [site], stateLayout: {
    schemaVersion: 1,
    programId: "panel",
    slots: [{ siteId: site, slot: 0 }],
  } });
  for (const descriptor of [
    { schemaVersion: 2 as const, ownerProgramId: "", sinkId: "sink", sourceSites: [site] },
    { schemaVersion: 2 as const, ownerProgramId: "panel", sinkId: "sink", sourceSites: [site, site] },
  ]) {
    const host = new MemoryVDOMHost();
    const root = new ComponentStateRoot(host, host.createContainer(), { scheduleCommit() {} });
    try {
      assertThrows(() => root.mount(jsx(Panel(descriptor), {})));
    } finally {
      root.dispose();
    }
  }
});
