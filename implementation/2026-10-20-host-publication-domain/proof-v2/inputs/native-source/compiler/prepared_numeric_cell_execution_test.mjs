import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
import { VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/prepared-numeric-cell-proof");
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const resultPath = path.join(cacheDirectory, `prepared-numeric-cell-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `failure-${attemptId}.json`);
const fixtureUrl = pathToFileURL(
  path.join(projectRoot, "compiler/numeric_state_layout_execution_test.mjs"),
).href;

const originalCapture = PendingStateChanges.prototype.capture;
const originalSetColumnCells = VDOMSnapshotRoot.prototype.setColumnCells;
const originalExecuteSourceProgram = VDOMSnapshotRoot.prototype.executeSourceProgram;
const originalPrepareNumericCellProgram = VDOMSnapshotRoot.prototype.prepareNumericCellProgram;
const originalIsPreparedNumericCellProgramCurrent = VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent;
const originalExecutePreparedNumericCells = VDOMSnapshotRoot.prototype.executePreparedNumericCells;
const originalLog = console.log;
let nonemptyCaptureCalls = 0;
let legacyColumnCellCalls = 0;
let legacySourceProgramCalls = 0;
let preparedTokens = [];
let preparedCurrentCalls = 0;
let preparedCalls = [];
let fixtureProof;

PendingStateChanges.prototype.capture = function (...args) {
  if (this.size > 0) nonemptyCaptureCalls++;
  return originalCapture.apply(this, args);
};
VDOMSnapshotRoot.prototype.setColumnCells = function (...args) {
  legacyColumnCellCalls++;
  return originalSetColumnCells.apply(this, args);
};
VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
  legacySourceProgramCalls++;
  return originalExecuteSourceProgram.apply(this, args);
};
VDOMSnapshotRoot.prototype.prepareNumericCellProgram = function (...args) {
  const token = originalPrepareNumericCellProgram.apply(this, args);
  if (token !== null) preparedTokens.push(token);
  return token;
};
VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent = function (token) {
  preparedCurrentCalls++;
  return originalIsPreparedNumericCellProgramCurrent.call(this, token);
};
VDOMSnapshotRoot.prototype.executePreparedNumericCells = function (tokens, values, count) {
  preparedCalls.push({
    count,
    tokensLength: tokens.length,
    valuesLength: values.length,
    allTokensCurrent: Array.from({ length: count }, (_, index) =>
      originalIsPreparedNumericCellProgramCurrent.call(this, tokens[index])
    ).every(Boolean),
  });
  return originalExecutePreparedNumericCells.call(this, tokens, values, count);
};
console.log = (...args) => {
  if (args[0] === "Numeric state layout execution PASS:" && typeof args[1] === "string") {
    fixtureProof = JSON.parse(args[1]);
  }
  return originalLog.apply(console, args);
};

try {
  assert.equal(typeof originalPrepareNumericCellProgram, "function", "prepared numeric program API exists");
  assert.equal(typeof originalIsPreparedNumericCellProgramCurrent, "function", "prepared token validator API exists");
  assert.equal(typeof originalExecutePreparedNumericCells, "function", "prepared numeric cut API exists");
  await mkdir(cacheDirectory, { recursive: true });
  await import(`${fixtureUrl}?prepared-numeric-cell=${attemptId}`);
  assert.ok(fixtureProof, "the authored TSX storage/layout proof completed successfully");
  assert.equal(fixtureProof.status, "PASS");
  assert.deepEqual(preparedCalls.map(({ count }) => count), [1, 6], "sparse and dense updates use prepared numeric execution");
  assert.deepEqual(preparedCalls.map(({ tokensLength, valuesLength }) => ({ tokensLength, valuesLength })), [
    { tokensLength: 1, valuesLength: 1 },
    { tokensLength: 6, valuesLength: 6 },
  ], "prepared cut receives parallel token/value buffers for the active cells");
  assert.ok(preparedCalls.every((call) => call.allTokensCurrent), "each executed token is current at the cut boundary");
  assert.ok(preparedTokens.length >= 6, "fixture prepared tokens for the sparse and dense cell sets");
  assert.ok(preparedCurrentCalls > 0, "Root checks prepared token currency");
  assert.equal(legacyColumnCellCalls, 0, "prepared eligible cells do not use the legacy column/row cut");
  assert.equal(legacySourceProgramCalls, 0, "fully unary fixture does not take the scalar source-program route");
  assert.equal(nonemptyCaptureCalls, 0, "prepared eligible cuts do not use generic StateChange snapshots");
  for (const key of [
    "ordinaryAuthoredTSX",
    "stableAddressesThroughMove",
    "removedOwnerAndDeadSetter",
    "discardedCandidateColumnIsolation",
  ]) assert.equal(fixtureProof.assertions[key], true, `inherited fixture assertion ${key} passed`);

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
    authoredSource: fixtureProof.authoredSource,
    emittedModule: fixtureProof.emittedModule,
    storageProof: path.relative(projectRoot, storageProofPath),
    preparedNumericCellCut: {
      executeCalls: preparedCalls,
      preparedTokenCount: preparedTokens.length,
      isCurrentCalls: preparedCurrentCalls,
      nonemptyPendingStateCaptureCalls: nonemptyCaptureCalls,
      legacySetColumnCellsCalls: legacyColumnCellCalls,
      legacyExecuteSourceProgramCalls: legacySourceProgramCalls,
    },
    inheritedAssertions: fixtureProof.assertions,
    boundary: "Prepared numeric cell execution correctness proof for the ordinary authored unary fixture; no latency claim.",
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  originalLog("Prepared numeric cell execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    status: "FAIL",
    runtime: process.version,
    authoredSource: fixtureProof?.authoredSource ?? null,
    preparedNumericCellCut: {
      executeCalls: preparedCalls,
      preparedTokenCount: preparedTokens.length,
      isCurrentCalls: preparedCurrentCalls,
      nonemptyPendingStateCaptureCalls: nonemptyCaptureCalls,
      legacySetColumnCellsCalls: legacyColumnCellCalls,
      legacyExecuteSourceProgramCalls: legacySourceProgramCalls,
    },
    fixtureProof,
    error: String(error?.stack ?? error),
  }, null, 2)}\n`, { flag: "wx" }).catch(() => {});
  throw error;
} finally {
  PendingStateChanges.prototype.capture = originalCapture;
  VDOMSnapshotRoot.prototype.setColumnCells = originalSetColumnCells;
  VDOMSnapshotRoot.prototype.executeSourceProgram = originalExecuteSourceProgram;
  VDOMSnapshotRoot.prototype.prepareNumericCellProgram = originalPrepareNumericCellProgram;
  VDOMSnapshotRoot.prototype.isPreparedNumericCellProgramCurrent = originalIsPreparedNumericCellProgramCurrent;
  VDOMSnapshotRoot.prototype.executePreparedNumericCells = originalExecutePreparedNumericCells;
  console.log = originalLog;
}
