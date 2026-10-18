import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const stageRoot = path.resolve(path.dirname(scriptPath), "..");
const projectRoot = path.resolve(stageRoot, "../../..");
const manifestPath = path.join(stageRoot, "compiler/oxc-spike/Cargo.toml");
const targetDir = path.join(stageRoot, "target");
const fixturePath = path.join(stageRoot, "compiler/fixtures/native-owner-cut-kernel.tsx");
const binaryPath = path.join(targetDir, "debug/ui-graph-compiler-spike");

const build = spawnSync("cargo", ["build", "--manifest-path", manifestPath], {
  cwd: projectRoot,
  encoding: "utf8",
  env: { ...process.env, CARGO_TARGET_DIR: targetDir },
});
assert.equal(build.status, 0, `staged compiler build failed:\n${build.stderr}`);

const source = await readFile(fixturePath, "utf8");
const request = {
  id: "owner-cut-kernel-proof",
  path: "native-owner-cut-kernel.tsx",
  source,
  helper_module: "native_runtime_api.ts",
  component_module: "native_runtime_api.ts",
};
const compile = spawnSync(binaryPath, ["--serve-native"], {
  input: `${JSON.stringify(request)}\n`,
  encoding: "utf8",
});
assert.equal(compile.status, 0, `staged compiler execution failed:\n${compile.stderr}`);
const response = JSON.parse(compile.stdout.trim().split("\n").at(-1));
assert.equal(response.error, null, JSON.stringify(response.error));
const emitted = response.plan?.component_module;
assert.equal(typeof emitted, "string");

const declarationStart = emitted.indexOf("const __nativeOwnerCutKernels = ");
assert.notEqual(declarationStart, -1, "compiler did not emit owner cut kernels");
const declarationEnd = emitted.indexOf("\n", declarationStart);
assert.ok(declarationEnd > declarationStart, "kernel table declaration did not terminate");
const declaration = emitted.slice(declarationStart, declarationEnd);
const kernels = vm.runInNewContext(`${declaration}; __nativeOwnerCutKernels`);
assert.equal(kernels.length, 2, "only primitive Row and SameShape should get kernels");
assert.notEqual(kernels[0].programId, kernels[1].programId, "same-shaped components must have isolated programs");
assert.equal(kernels[0].slotCount, 2);
assert.equal(kernels[0].sinkIds.length, 5);
assert.equal(typeof kernels[0].executeCut, "function");

const runRows = [
  { seenMask: 0, sinks: Array.from({ length: 5 }, () => ({ lastValue: null, forceWrite: false })) },
  { seenMask: 0, sinks: Array.from({ length: 5 }, () => ({ lastValue: null, forceWrite: false })) },
];
const rowInputs = new Float64Array([1, 2, 3, 4]);
const changedRows = new Uint32Array([0, 1, 0]);
const changedSlots = new Uint16Array([1, 0, 0]);
const stagedRows = new Uint32Array(16);
const stagedSinkIds = new Uint16Array(16);
const stagedValues = new Array(16);
let wholeCutCalls = 0;
const executeOnce = (...args) => {
  wholeCutCalls++;
  return kernels[0].executeCut(...args);
};
const stagedCount = executeOnce(
  changedRows,
  changedSlots,
  changedRows.length,
  rowInputs,
  runRows,
  stagedRows,
  stagedSinkIds,
  stagedValues,
);
assert.equal(wholeCutCalls, 1, "homogeneous multi-row cut calls one emitted kernel");
assert.deepEqual(
  Array.from({ length: stagedCount }, (_, index) => ({
    row: stagedRows[index],
    sink: stagedSinkIds[index],
    value: stagedValues[index],
  })),
  [
    { row: 0, sink: 0, value: 2 },
    { row: 0, sink: 1, value: 3 },
    { row: 1, sink: 1, value: 7 },
    { row: 1, sink: 2, value: "3px" },
    { row: 1, sink: 3, value: 3 },
    { row: 1, sink: 4, value: -3 },
    { row: 0, sink: 2, value: "1px" },
    { row: 0, sink: 3, value: 1 },
    { row: 0, sink: 4, value: -1 },
  ],
  "kernel must preserve interleaved row/slot first-touch order and deduplicate shared sinks",
);

const equalityState = {
  seenMask: 0,
  sinks: [
    { lastValue: 2, forceWrite: false },
    { lastValue: Number.NaN, forceWrite: false },
    { lastValue: "NaNpx", forceWrite: false },
    { lastValue: Number.NaN, forceWrite: false },
    { lastValue: Number.NaN, forceWrite: false },
  ],
};
const equalityValues = new Float64Array([Number.NaN, 0]);
const equalityRows = new Uint32Array([0]);
const equalitySlots = new Uint16Array([0]);
const equalityStagedRows = new Uint32Array(5);
const equalityStagedSinks = new Uint16Array(5);
const equalityStagedValues = new Array(5);
const equalityCount = kernels[0].executeCut(
  equalityRows,
  equalitySlots,
  1,
  equalityValues,
  [equalityState],
  equalityStagedRows,
  equalityStagedSinks,
  equalityStagedValues,
);
assert.equal(equalityCount, 0, "NaN equality suppresses unchanged primitive outputs");

equalityState.seenMask = 0;
equalityState.sinks[1].lastValue = 0;
equalityState.sinks[2].lastValue = "0px";
equalityState.sinks[3].lastValue = 0;
equalityState.sinks[4].lastValue = 0;
equalityValues[0] = 0;
const signedZeroCount = kernels[0].executeCut(
  equalityRows,
  equalitySlots,
  1,
  equalityValues,
  [equalityState],
  equalityStagedRows,
  equalityStagedSinks,
  equalityStagedValues,
);
assert.equal(signedZeroCount, 1, "positive and negative zero are distinct");
assert.equal(equalityStagedSinks[0], 4);
assert.ok(Object.is(equalityStagedValues[0], -0));

const vectorStart = emitted.indexOf('__nativeDefineComponent("native-owner-cut-kernel.tsx#component:Vector"');
assert.notEqual(vectorStart, -1);
const vectorRegistration = emitted.slice(vectorStart, emitted.indexOf(");", vectorStart) + 2);
assert.equal(vectorRegistration.includes("ownerUpdateProgram"), false, "vector/unknown Math sinks must not get the primitive kernel");
assert.match(vectorRegistration, /stateLayout/);
assert.match(emitted, /position=\{__nativeBindStatePropsAt\(/, "vector sink retains v2 binding fallback");
assert.match(emitted, /Math\.sin\(x\)/, "opaque global-call source remains authored fallback");
assert.match(emitted, /schemaVersion: 2, ownerProgramId:/, "old sink descriptors remain available");

console.log("PASS staged primitive whole-cut owner-kernel proof");
