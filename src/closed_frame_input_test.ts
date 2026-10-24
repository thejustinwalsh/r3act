import {
  closedStoreHostInputs,
  closedStoreHostValueCount,
  normalizeClosedStoreHostProgram,
} from "./closed_store_host_program.ts";

const raw = () => ({
  schemaVersion: 6, componentProgramId: "frame:motion", moduleRevision: "revision",
  retainedChildProp: "children",
  inputs: [{ storeUseSiteId: "frame:0", storeProp: "$frameClock",
    sourceKind: "frameClock", paths: [["elapsed"], ["delta"]] }],
  host: { tag: "group", key: "motion", child: null,
    props: [["rotation-y", { kind: "input", index: 0 }]] },
});

Deno.test("frame varying props and local state share one ordered input space", () => {
  const source = { ...raw(), schemaVersion: 8,
    stateSites: ["state:offset"], effectSites: [], propInputs: ["speed"],
    host: { tag: "group", key: "motion", child: null,
      props: [["rotation-y", { kind: "binary", operator: "+",
        left: { kind: "input", index: 2 }, right: { kind: "input", index: 3 } }]] },
  };
  const program = normalizeClosedStoreHostProgram(source);
  assert(program?.schemaVersion === 8);
  assert(closedStoreHostValueCount(program!) === 4);
  source.propInputs[0] = "changed";
  assert(program?.schemaVersion === 8 && program.propInputs[0] === "speed");
  assert(normalizeClosedStoreHostProgram({ ...source, stateSites: [],
    propInputs: ["speed", "speed"] }) === null);
  assert(normalizeClosedStoreHostProgram({ ...source, propInputs: [] }) === null);
  for (const name of ["key", "ref", "children", "__proto__", "prototype", "constructor"]) {
    assert(normalizeClosedStoreHostProgram({ ...source, propInputs: [name] }) === null);
  }
  const noState = normalizeClosedStoreHostProgram({ ...source, stateSites: [],
    host: raw().host });
  assert(noState?.schemaVersion === 8 && closedStoreHostValueCount(noState) === 3);
});
const assert = (condition: unknown) => {
  if (!condition) throw new Error("Frame input normalization failed");
};

Deno.test("frame provenance survives normalization without changing ordinary prop reads", () => {
  const source = raw();
  const program = normalizeClosedStoreHostProgram(source);
  assert(program);
  const input = closedStoreHostInputs(program!)[0];
  assert(input.sourceKind === "frameClock" && Object.isFrozen(input));
  source.inputs[0].paths[0][0] = "changed";
  assert(input.paths?.[0][0] === "elapsed");
  const ordinary = raw();
  delete (ordinary.inputs[0] as { sourceKind?: string }).sourceKind;
  const ordinaryProgram = normalizeClosedStoreHostProgram(ordinary);
  assert(ordinaryProgram && closedStoreHostInputs(ordinaryProgram)[0].sourceKind === undefined);
});

Deno.test("frame source discrimination rejects invalid origins and projection paths", () => {
  for (const patch of [
    { sourceKind: "unknown" }, { storeProp: "authoredClock" },
    { paths: [[]] }, { paths: [["elapsed", "value"]] },
    { paths: [["unknown"]] },
  ]) {
    const source = raw();
    Object.assign(source.inputs[0], patch);
    assert(normalizeClosedStoreHostProgram(source) === null);
  }
  const source = raw();
  Object.defineProperty(source.inputs[0], "sourceKind", { get() {
    throw new Error("Metadata accessor must not execute");
  } });
  assert(normalizeClosedStoreHostProgram(source) === null);
});
