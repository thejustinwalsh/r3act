import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
import { VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/numeric-state-lane-cut");
const attemptId = `${Date.now()}-${process.pid}`;
const resultPath = path.join(cacheDirectory, `lane-cut-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `failure-${attemptId}.json`);
const fixtureUrl = pathToFileURL(
  path.join(projectRoot, "compiler/numeric_state_layout_execution_test.mjs"),
).href;

const originalCapture = PendingStateChanges.prototype.capture;
const originalSetColumnCells = VDOMSnapshotRoot.prototype.setColumnCells;
const originalExecuteSourceProgram = VDOMSnapshotRoot.prototype.executeSourceProgram;
const originalLog = console.log;
let nonemptyCaptureCalls = 0;
let laneCalls = [];
let programCalls = 0;
let fixtureProof;

PendingStateChanges.prototype.capture = function (...args) {
  if (this.size > 0) nonemptyCaptureCalls++;
  return originalCapture.apply(this, args);
};
VDOMSnapshotRoot.prototype.setColumnCells = function (columns, rows, values, count) {
  laneCalls.push({ count, columnsLength: columns.length, rowsLength: rows.length, valuesLength: values.length });
  return originalSetColumnCells.call(this, columns, rows, values, count);
};
VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
  programCalls++;
  return originalExecuteSourceProgram.apply(this, args);
};
console.log = (...args) => {
  if (args[0] === "Numeric state layout execution PASS:" && typeof args[1] === "string") {
    fixtureProof = JSON.parse(args[1]);
  }
  return originalLog.apply(console, args);
};

try {
  await mkdir(cacheDirectory, { recursive: true });
  await import(`${fixtureUrl}?lane-cut=${attemptId}`);
  assert.ok(fixtureProof, "the authored TSX storage/layout proof completed successfully");
  assert.equal(fixtureProof.status, "PASS");
  assert.deepEqual(laneCalls.map(({ count }) => count), [1, 6], "sparse and dense updates use the lane cut");
  assert.deepEqual(laneCalls.map(({ columnsLength, rowsLength, valuesLength }) => ({ columnsLength, rowsLength, valuesLength })), [
    { columnsLength: 1, rowsLength: 1, valuesLength: 1 },
    { columnsLength: 6, rowsLength: 6, valuesLength: 6 },
  ], "lane cut uses reusable parallel buffers sized for the active cell set");
  assert.equal(nonemptyCaptureCalls, 0, "eligible numeric cuts do not use generic StateChange snapshots");
  assert.equal(programCalls, 0, "fully unary fixture does not take the scalar source-program route");
  for (const key of [
    "ordinaryAuthoredTSX",
    "stableAddressesThroughMove",
    "removedOwnerAndDeadSetter",
    "discardedCandidateColumnIsolation",
  ]) assert.equal(fixtureProof.assertions[key], true, `underlying fixture assertion ${key} passed`);

  const authoredAttempt = /authored-layout-(\d+-\d+)\.tsx/.exec(fixtureProof.authoredSource);
  assert.ok(authoredAttempt, "fixture proof identifies its unique source attempt");
  const storageProofPath = path.join(
    projectRoot,
    ".cache/numeric-state-layout",
    `execution-proof-${authoredAttempt[1]}.json`,
  );
  const storageProof = JSON.parse(await readFile(storageProofPath, "utf8"));
  assert.equal(storageProof.status, "PASS", "full storage/layout fixture output is preserved");

  const proof = {
    status: "PASS",
    runtime: process.version,
    storageProof: path.relative(projectRoot, storageProofPath),
    laneCut: {
      setColumnCellsCalls: laneCalls,
      nonemptyPendingStateCaptureCalls: nonemptyCaptureCalls,
      executeSourceProgramCalls: programCalls,
      sparseCount: laneCalls[0].count,
      denseCount: laneCalls[1].count,
    },
    inheritedAssertions: fixtureProof.assertions,
    boundary: "Integrated authored numeric state lane-cut proof for the unary fixture; no latency claim.",
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  originalLog("Numeric state lane-cut execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    status: "FAIL",
    runtime: process.version,
    nonemptyPendingStateCaptureCalls: nonemptyCaptureCalls,
    setColumnCellsCalls: laneCalls,
    executeSourceProgramCalls: programCalls,
    fixtureProof,
    error: String(error?.stack ?? error),
  }, null, 2)}\n`, { flag: "wx" }).catch(() => {});
  throw error;
} finally {
  PendingStateChanges.prototype.capture = originalCapture;
  VDOMSnapshotRoot.prototype.setColumnCells = originalSetColumnCells;
  VDOMSnapshotRoot.prototype.executeSourceProgram = originalExecuteSourceProgram;
  console.log = originalLog;
}
