import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const stageRoot = path.resolve(path.dirname(scriptPath), "..");
const projectRoot = path.resolve(stageRoot, "../..");
const manifestPath = path.join(stageRoot, "compiler/oxc-spike/Cargo.toml");
const targetDir = path.join(stageRoot, "target");
const fixturePath = path.join(stageRoot, "compiler/fixtures/native-owner-cut-kernel.tsx");
const binaryPath = path.join(targetDir, "debug/ui-graph-compiler-spike");

const build = spawnSync("cargo", ["build", "--locked", "--manifest-path", manifestPath], {
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
  component_module: source,
};
const compile = spawnSync(binaryPath, ["--serve-native"], {
  input: `${JSON.stringify(request)}\n`,
  encoding: "utf8",
});
assert.equal(compile.status, 0, `staged compiler execution failed:\n${compile.stderr}`);
const response = JSON.parse(compile.stdout.trim().split("\n").at(-1));
assert.ok(response.error == null, JSON.stringify(response.error));
const emitted = response.plan?.component_module;
assert.equal(typeof emitted, "string");

function extractKernelDeclaration(source, name) {
  const prefix = `const ${name} =`;
  const start = source.indexOf(prefix);
  assert.notEqual(start, -1, "compiler did not emit owner cut kernels");
  let cursor = start + prefix.length;
  while (/\s/.test(source[cursor] ?? "")) cursor++;
  assert.equal(source[cursor], "[");

  const delimiters = ["]"];
  const templates = [];
  let mode = "code";
  for (let index = cursor + 1; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];
    if (mode === "single" || mode === "double") {
      if (char === "\\") index++;
      else if ((mode === "single" && char === "'") || (mode === "double" && char === '"')) mode = "code";
      continue;
    }
    if (mode === "line-comment") {
      if (char === "\n") mode = "code";
      continue;
    }
    if (mode === "block-comment") {
      if (char === "*" && next === "/") { index++; mode = "code"; }
      continue;
    }
    if (mode === "template") {
      if (char === "\\") index++;
      else if (char === "`") { templates.pop(); mode = "code"; }
      else if (char === "$" && next === "{") {
        templates.at(-1).inExpression = true;
        templates.at(-1).braceDepth = 0;
        index++;
        mode = "code";
      }
      continue;
    }

    const template = templates.at(-1);
    if (template?.inExpression) {
      if (char === "{") { template.braceDepth++; continue; }
      if (char === "}") {
        if (template.braceDepth === 0) {
          template.inExpression = false;
          mode = "template";
        } else template.braceDepth--;
        continue;
      }
    }
    if (char === "'") { mode = "single"; continue; }
    if (char === '"') { mode = "double"; continue; }
    if (char === "`") { templates.push({ inExpression: false, braceDepth: 0 }); mode = "template"; continue; }
    if (char === "/" && next === "/") { index++; mode = "line-comment"; continue; }
    if (char === "/" && next === "*") { index++; mode = "block-comment"; continue; }
    if (char === "[" || char === "{" || char === "(") {
      delimiters.push(char === "[" ? "]" : char === "{" ? "}" : ")");
      continue;
    }
    if (char === "]" || char === "}" || char === ")") {
      assert.equal(delimiters.pop(), char, "balanced generated kernel declaration");
      if (delimiters.length === 0) {
        let end = index + 1;
        while (/\s/.test(source[end] ?? "")) end++;
        assert.equal(source[end], ";", "kernel declaration terminates with semicolon");
        return source.slice(start, end + 1);
      }
    }
  }
  assert.fail("unterminated kernel declaration");
}

const declaration = extractKernelDeclaration(emitted, "__nativeOwnerCutKernels");
const kernels = vm.runInNewContext(`${declaration}; __nativeOwnerCutKernels`);
assert.equal(kernels.length, 2, "only primitive Row and SameShape should get kernels");
assert.notEqual(kernels[0].programId, kernels[1].programId, "same-shaped components must have isolated programs");
assert.equal(kernels[0].sinkIds.length, 7);
assert.equal(typeof kernels[0].executeCut, "function");

const runRows = [
  { seenMask: 0, inputValues: [1, 2], sinks: Array.from({ length: 7 }, () => ({ lastValue: null, forceWrite: false })) },
  { seenMask: 0, inputValues: [3, 4], sinks: Array.from({ length: 7 }, () => ({ lastValue: null, forceWrite: false })) },
];
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
    { row: 1, sink: 5, value: "positive" },
    { row: 1, sink: 6, value: "line\n3px" },
    { row: 0, sink: 2, value: "1px" },
    { row: 0, sink: 3, value: 1 },
    { row: 0, sink: 4, value: -1 },
    { row: 0, sink: 5, value: "positive" },
    { row: 0, sink: 6, value: "line\n1px" },
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
    { lastValue: "nonpositive", forceWrite: false },
    { lastValue: "line\nNaNpx", forceWrite: true },
  ],
};
equalityState.inputValues = new Float64Array([Number.NaN, 0]);
const equalityRows = new Uint32Array([0]);
const equalitySlots = new Uint16Array([0]);
const equalityStagedRows = new Uint32Array(5);
const equalityStagedSinks = new Uint16Array(5);
const equalityStagedValues = new Array(5);
const equalityCount = kernels[0].executeCut(
  equalityRows,
  equalitySlots,
  1,
  [equalityState],
  equalityStagedRows,
  equalityStagedSinks,
  equalityStagedValues,
);
assert.equal(equalityCount, 0, "NaN and equal forced primitive outputs are suppressed");

equalityState.seenMask = 0;
equalityState.sinks[1].lastValue = 0;
equalityState.sinks[2].lastValue = "0px";
equalityState.sinks[3].lastValue = 0;
equalityState.sinks[4].lastValue = 0;
equalityState.sinks[5].lastValue = "nonpositive";
equalityState.sinks[6].lastValue = "line\n0px";
equalityState.inputValues[0] = 0;
const signedZeroCount = kernels[0].executeCut(
  equalityRows,
  equalitySlots,
  1,
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

for (const component of ["Member", "Call", "ShadowedUndefined", "Mutation", "Vector", "Opaque", "MixedCoverage"]) {
  const marker = `__nativeDefineComponent("native-owner-cut-kernel.tsx#component:${component}"`;
  const start = emitted.indexOf(marker);
  assert.notEqual(start, -1, `${component} registration emitted`);
  const end = emitted.indexOf(");", start) + 2;
  assert.ok(end > start);
  assert.equal(emitted.slice(start, end).includes("ownerUpdateProgram"), false, `${component} must use fallback`);
}

console.log("PASS staged primitive whole-cut owner-kernel proof");
