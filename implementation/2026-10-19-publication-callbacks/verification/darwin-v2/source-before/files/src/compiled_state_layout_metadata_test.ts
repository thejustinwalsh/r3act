import { assertEquals, assertThrows } from "jsr:@std/assert";
import {
  type CompiledStateLayout,
  defineComponent,
} from "./component_state_runtime.ts";

Deno.test("compiled layout metadata is defensively copied and deeply frozen", () => {
  const slots = [{ siteId: "component#state:2", slot: 0 }, {
    siteId: "component#state:10",
    slot: 1,
  }];
  const render = defineComponent("component", () => null, {
    propOnlySites: slots.map((slot) => slot.siteId),
    stateLayout: { schemaVersion: 1, slots },
  });
  const metadata = Object.getOwnPropertySymbols(render).map((symbol) =>
    Object.getOwnPropertyDescriptor(render, symbol)?.value
  ).find((value) => value?.stateLayout)?.stateLayout;
  assertEquals(metadata.slots, slots);
  slots[0].siteId = "mutated";
  assertEquals(metadata.slots[0].siteId, "component#state:2");
  assertEquals(Object.isFrozen(metadata), true);
  assertEquals(Object.isFrozen(metadata.slots), true);
  assertEquals(Object.isFrozen(metadata.slots[0]), true);
});

Deno.test("compiled layout rejects invalid schema, addresses, duplicates and unproved sites", () => {
  for (
    const layout of [
      { schemaVersion: 2, slots: [] },
      { schemaVersion: 1, slots: null },
      { schemaVersion: 1, slots: [{ siteId: "a", slot: 1 }] },
      {
        schemaVersion: 1,
        slots: [{ siteId: "a", slot: 0 }, { siteId: "a", slot: 1 }],
      },
      { schemaVersion: 1, slots: [{ siteId: "unknown", slot: 0 }] },
    ]
  ) {
    assertThrows(() =>
      defineComponent("component", () => null, {
        propOnlySites: ["a"],
        stateLayout: layout as unknown as CompiledStateLayout,
      })
    );
  }
});

Deno.test("components without compiler layout retain their previous metadata shape", () => {
  const render = defineComponent("component", () => null, {
    propOnlySites: ["a"],
  });
  const metadata = Object.getOwnPropertySymbols(render).map((symbol) =>
    Object.getOwnPropertyDescriptor(render, symbol)?.value
  ).find((value) => value?.propOnlySites);
  assertEquals(Object.hasOwn(metadata, "stateLayout"), false);
});
