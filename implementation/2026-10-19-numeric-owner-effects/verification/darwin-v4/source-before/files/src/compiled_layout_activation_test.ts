import {
  ComponentStateRoot,
  defineComponent,
  type CompiledStateLayout,
  useStateAt,
} from "./component_state_runtime.ts";
import { OwnerStateWorld, type OwnerId, type OwnerPreparation } from "./owner_state_world.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(message);
};
const assertEquals = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};

type CapturedUse = {
  readonly route: "world" | "preparation";
  readonly owner: OwnerId;
  readonly site: string;
  readonly layout: CompiledStateLayout | undefined;
};

class LayoutCapturingWorld extends OwnerStateWorld {
  readonly captured: CapturedUse[] = [];

  override useState<T>(
    owner: OwnerId,
    site: string,
    initial: T | (() => T),
    layout?: CompiledStateLayout,
  ) {
    this.captured.push({ route: "world", owner, site, layout });
    return super.useState(owner, site, initial, layout);
  }

  override beginPreparation(): OwnerPreparation {
    const preparation = super.beginPreparation();
    const useState = preparation.useState.bind(preparation);
    preparation.useState = <T>(
      owner: OwnerId,
      site: string,
      initial: T | (() => T),
      layout?: CompiledStateLayout,
    ) => {
      this.captured.push({ route: "preparation", owner, site, layout });
      return useState(owner, site, initial, layout);
    };
    return preparation;
  }
}

Deno.test("defineComponent layout reaches committed and prepared useState activation", () => {
  const sourceLayout: CompiledStateLayout = {
    schemaVersion: 1,
    slots: [
      { siteId: "fixture.layout.conditional", slot: 0 },
      { siteId: "fixture.layout.trailing", slot: 1 },
    ],
  };
  let setTrailing: ((value: number) => boolean) | undefined;
  const Panel = defineComponent<{ includeConditional: boolean }>(
    "fixture.layout.panel",
    ({ includeConditional }) => {
      if (includeConditional) {
        useStateAt("fixture.layout.conditional", 1);
      }
      const [trailing, set] = useStateAt("fixture.layout.trailing", 7);
      setTrailing = set;
      return jsx("output", { "data-value": trailing }, String(trailing));
    },
    { propOnlySites: sourceLayout.slots.map((entry) => entry.siteId), stateLayout: sourceLayout },
  );
  const world = new LayoutCapturingWorld();
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { world });
  try {
    root.mount(jsx(Panel, { includeConditional: true }));
    const initialCalls = [...world.captured];
    assertEquals(
      initialCalls.map(({ site, layout }) => [site, layout?.slots.map((slot) => slot.slot)]),
      [
        ["fixture.layout.conditional", [0, 1]],
        ["fixture.layout.trailing", [0, 1]],
      ],
      "initial component activation must forward the validated layout with authored hook order",
    );
    assert(Object.isFrozen(initialCalls[0].layout), "defineComponent must preserve frozen layout metadata");
    assert(Object.isFrozen(initialCalls[0].layout?.slots), "layout slots must remain frozen");

    root.update(jsx(Panel, { includeConditional: false }));
    root.update(jsx(Panel, { includeConditional: true }));
    const conditionalActivations = world.captured.slice(initialCalls.length);
    assert(
      conditionalActivations.length >= 2,
      "both conditional and unconditional hook renders should execute",
    );
    assert(
      conditionalActivations.every((entry) =>
        entry.layout?.slots.map((slot) => slot.slot).join(",") === "0,1"
      ),
      "conditional hook activation must retain the same authored layout slots",
    );

    assert(setTrailing, "component state setter was not captured");
    setTrailing(8);
    root.flush();
    const preparedCalls = world.captured.filter((entry) => entry.route === "preparation");
    assert(
      preparedCalls.some((entry) => entry.site === "fixture.layout.trailing"),
      "prepared owner render did not invoke useState through OwnerPreparation",
    );
    assert(
      preparedCalls.every((entry) => entry.layout?.slots.map((slot) => slot.slot).join(",") === "0,1"),
      "prepared useState calls must receive the complete component layout",
    );
  } finally {
    root.dispose();
  }
});

Deno.test("component activation without layout keeps the optional World argument absent", () => {
  let setValue: ((value: number) => boolean) | undefined;
  const Plain = defineComponent("fixture.layout.plain", () => {
    const [value, set] = useStateAt("fixture.layout.plain.value", 3);
    setValue = set;
    return jsx("output", { "data-value": value }, String(value));
  });
  const world = new LayoutCapturingWorld();
  const host = new MemoryVDOMHost();
  const root = new ComponentStateRoot(host, host.createContainer(), { world });
  try {
    root.mount(jsx(Plain, {}));
    assertEquals(
      world.captured.map(({ site, layout }) => [site, layout]),
      [["fixture.layout.plain.value", undefined]],
      "legacy components must continue using the general state path",
    );
    assert(setValue, "legacy component setter was not captured");
    setValue(4);
    root.flush();
    assert(
      world.captured.some((entry) => entry.route === "preparation" && entry.layout === undefined),
      "prepared render without metadata must preserve the undefined layout argument",
    );
  } finally {
    root.dispose();
  }
});
