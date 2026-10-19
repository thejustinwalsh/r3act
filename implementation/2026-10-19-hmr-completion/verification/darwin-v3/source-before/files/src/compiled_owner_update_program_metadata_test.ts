import {
  defineComponent,
  type CompiledOwnerUpdateProgram,
  type CompiledStateLayout,
} from "./component_state_runtime.ts";
import {
  associateCompiledOwnerUpdateProgram,
  compiledOwnerUpdateProgramFor,
  normalizeCompiledStateLayout,
} from "./compiled_state_layout.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(run: () => unknown, message: string): void {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const makeLayout = (programId = "Row") => ({
  schemaVersion: 1 as const,
  programId,
  slots: [{ siteId: "Row#state:0", slot: 0 }],
});

const makeManySlotLayout = (count: number) => ({
  schemaVersion: 1 as const,
  programId: "Row",
  slots: Array.from({ length: count }, (_, slot) => ({
    siteId: `Row#state:${slot}`,
    slot,
  })),
});

const makeProgram = (
  programId = "Row",
  sinkIds: readonly string[] = ["style:left"],
): CompiledOwnerUpdateProgram => ({
  schemaVersion: 2,
  programId,
  slotCount: 1,
  sinkIds,
  executeCut: () => 0,
});

Deno.test("compiled owner program is snapshotted and shared by layout identity", () => {
  const layout = makeLayout();
  const sinks = ["style:left"];
  const input = makeProgram("Row", sinks);
  const component = defineComponent("Row", () => null, {
    propOnlySites: ["Row#state:0"],
    stateLayout: layout,
    ownerUpdateProgram: input,
  });
  const normalized = normalizeCompiledStateLayout(layout);
  const associated = compiledOwnerUpdateProgramFor(normalized);
  assert(associated !== undefined, "program is available on normalized layout");
  assert(
    compiledOwnerUpdateProgramFor(layout) === associated,
    "raw and normalized layouts share one association",
  );
  assert(Object.isFrozen(associated), "program descriptor is frozen");
  assert(Object.isFrozen(associated.sinkIds), "sink IDs are frozen");
  assert(
    associateCompiledOwnerUpdateProgram(normalized, input) === associated,
    "same association is idempotent",
  );
  sinks[0] = "mutated";
  assert(associated.sinkIds[0] === "style:left", "sink IDs were copied");
  assert(component !== null, "component registration completed");
});

Deno.test("compiled owner association rejects conflicting replacement", () => {
  const layout = normalizeCompiledStateLayout(makeLayout());
  const first = associateCompiledOwnerUpdateProgram(layout, makeProgram());
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(layout, {
      ...makeProgram(),
      executeCut: () => 0,
    }),
    "a distinct function cannot replace the cached program",
  );
  assert(
    compiledOwnerUpdateProgramFor(layout) === first,
    "failed replacement preserves the original association",
  );
});

Deno.test("compiled owner association rejects malformed identity and shape", () => {
  const validLayout = makeLayout();
  assertThrows(
    () => defineComponent("Other", () => null, {
      propOnlySites: ["Row#state:0"],
      stateLayout: validLayout,
      ownerUpdateProgram: makeProgram(),
    }),
    "component and program IDs must match",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      slotCount: 2,
    }),
    "slot count must match the layout",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      schemaVersion: 3,
    } as unknown as CompiledOwnerUpdateProgram),
    "unsupported program versions are rejected",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      schemaVersion: 1,
    } as unknown as CompiledOwnerUpdateProgram),
    "the earlier seven-argument owner program version is rejected",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      sinkIds: ["same", "same"],
    }),
    "duplicate sink IDs are rejected",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      sinkIds: [],
    }),
    "empty sink lists are rejected",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      sinkIds: Array.from({ length: 31 }, (_, index) => `sink:${index}`),
    }),
    "sink capacity is bounded",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeManySlotLayout(31), {
      ...makeProgram(),
      slotCount: 31,
    }),
    "slot capacity is bounded",
  );
  assertThrows(
    () => associateCompiledOwnerUpdateProgram(makeLayout(), {
      ...makeProgram(),
      executeCut: null,
    } as unknown as CompiledOwnerUpdateProgram),
    "non-function kernels are rejected",
  );
});

Deno.test("owner program requires matching state layout program ID", () => {
  const layout: CompiledStateLayout = {
    schemaVersion: 1,
    slots: [{ siteId: "Row#state:0", slot: 0 }],
  };
  assertThrows(
    () => defineComponent("Row", () => null, {
      propOnlySites: ["Row#state:0"],
      stateLayout: layout,
      ownerUpdateProgram: makeProgram(),
    }),
    "owner program requires a layout program ID",
  );
});
