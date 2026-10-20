import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

// Exercise the existing real Rust/OXC-authored TSX fixture with an optional
// host capability. The application source and its sparse/dense/fallback oracle
// remain unchanged; only the rendering host supplies a prepared writer.
const output = ".cache/prepared-style-writer-milestone";
await mkdir(output, { recursive: true });
const originalFactory = Object.getOwnPropertyDescriptor(
  MemoryVDOMHost.prototype, "prepareStyleProp",
);
const trace = { factories: 0, writes: 0, fields: {} };
MemoryVDOMHost.prototype.prepareStyleProp = function (node, name) {
  trace.factories++;
  trace.fields[name] = (trace.fields[name] ?? 0) + 1;
  return (next, previous) => {
    trace.writes++;
    this.setStyleProp(node, name, next, previous);
  };
};

try {
  await import("./native_numeric_cell_cut_execution_test.mjs");
  await import("./native_direct_writers_execution_test.mjs");
  assert.ok(trace.factories > 0, "Compiled TSX must activate prepared writers");
  assert.ok(trace.writes > trace.factories,
    "Retained prepared writers must be reused for multiple updates");
  assert.ok(trace.fields.left > 0 && trace.fields.top > 0,
    "Actual compiled style fields must select the public capability");
  const bytes = await readFile(".cache/native-cell-cut-milestone/execution-proof.json");
  const proof = JSON.parse(bytes);
  assert.equal(proof.status, "PASS");
  assert.equal(proof.captureCallsForEligibleCuts, 0);
  assert.deepEqual(proof.numericFrames.map(frame => frame.density), [1, 4, 32]);
  const result = {
    schemaVersion: 1, status: "PASS", runtime: process.version, trace,
    compilerFixture: "compiler/native_numeric_cell_cut_execution_test.mjs",
    lifecycleFixture: "compiler/native_direct_writers_execution_test.mjs",
    compilerProofSha256: createHash("sha256").update(bytes).digest("hex"),
    numericFrames: proof.numericFrames,
    limits: "Public host capability over real compiled TSX; memory host correctness and reuse, not DOM timing or a speed claim",
  };
  await writeFile(`${output}/compiled-style-proof.json`, JSON.stringify(result, null, 2) + "\n");
  console.log(`PASS compiled prepared style writers: ${trace.factories} activations, ${trace.writes} writes`);
} finally {
  if (originalFactory) {
    Object.defineProperty(MemoryVDOMHost.prototype, "prepareStyleProp", originalFactory);
  } else {
    delete MemoryVDOMHost.prototype.prepareStyleProp;
  }
}
