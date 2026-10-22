import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Independent integrity and CPU-profile verifier. It reads the collected
// records and writes only verification.json, using exclusive-create semantics.
const root = process.cwd();
const outputDirectory = "results/product-mixed-state-lanes-cpu";
const resultDirectory = path.resolve(root, outputDirectory);
const resultPath = path.join(resultDirectory, "results.json");
const preregistrationPath = path.join(resultDirectory, "preregistration.json");
const postLockPath = path.join(resultDirectory, "source-build-post-lock.json");
const checkpointPath = "implementation/2026-10-13-numeric-state-lanes/status.json";
const archivePath = "implementation/2026-10-13-numeric-state-lanes/source-and-build.tar.gz";
const pilotManifestPath = "implementation/2026-10-13-numeric-state-lanes/verification/product-mixed-pilot/results.json";
const pilotDirectory = "implementation/2026-10-13-numeric-state-lanes/verification/product-mixed-pilot";
const verificationBase = "implementation/2026-10-13-numeric-state-lanes";
const stateLayoutProofPath = `${verificationBase}/verification/numeric-state-layout/execution-proof-1791874961364-68359.json`;
const laneCutProofPath = `${verificationBase}/verification/numeric-state-lane-cut/lane-cut-proof-1791874961243-68359.json`;
const laneLifecycleProofPath = `${verificationBase}/verification/numeric-state-lane-lifecycle/lane-lifecycle-proof-1791874962019-68380.json`;
const compilerProofPath = `${verificationBase}/verification/product-compiler-proof/native.js`;
const compiledStyleProofPath = `${verificationBase}/verification/compiled-style-proof.json`;
const baseConfigPath = "vite.product-mixed-state-lanes.config.ts";
const expectedArchiveSha256 = "83c99cd500cb9462094c637014f3e8adf3cf8bc0280e5d154442141408f192c3";
const expectedOrigin = "https://compiled-state-lanes-cpu.localhost:1355";
const expectedPages = [
  { sequence: 20, pair: 0, arm: "react", size: 1024, file: "20-react-1024.json" },
  { sequence: 21, pair: 0, arm: "native", size: 1024, file: "21-native-1024.json" },
];
const expectedCheckNames = ["identity", "lifecycle", "order", "output", "visible"];
const expectedPilot = [
  ["native", 128], ["react", 128], ["native", 512], ["react", 512],
  ["native", 1024], ["react", 1024],
];
const rows = [];
const failures = [];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = async (filename) =>
  JSON.parse(await readFile(path.resolve(root, filename), "utf8"));
const hashFile = async (filename) => sha256(await readFile(path.resolve(root, filename)));
const sorted = (values) => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sameMap = (left, right) => left && right &&
  same(sorted(Object.keys(left)), sorted(Object.keys(right))) &&
  Object.keys(left).every((key) => left[key] === right[key]);
const approx = (left, right) => Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-7;
function check(id, ok, detail, data = undefined) {
  const row = { id, status: ok ? "PASS" : "FAIL", detail };
  if (data !== undefined) row.data = data;
  rows.push(row);
  if (!ok) failures.push({ id, detail });
  return ok;
}
function compareNumber(actual, expected) {
  return approx(actual, expected);
}
function sameSummaryRows(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((row, index) => {
    const other = expected[index];
    return row.functionName === other.functionName && row.url === other.url &&
      row.lineNumber === other.lineNumber && row.columnNumber === other.columnNumber &&
      row.sampleCount === other.sampleCount && compareNumber(row.selfTimeMicros, other.selfTimeMicros) &&
      row.category === other.category && compareNumber(row.selfTimeMs, other.selfTimeMs) &&
      (row.selfTimePercent === null && other.selfTimePercent === null ||
        compareNumber(row.selfTimePercent, other.selfTimePercent));
  });
}

function classify(frame, productionByBasename) {
  const name = (frame.functionName || "(anonymous)").toLowerCase();
  let basename = "";
  try {
    basename = path.basename(new URL(frame.url || "about:blank").pathname);
  } catch {
    // Preserve synthetic, built-in, and unresolved frames as raw frames.
  }
  if (name === "(root)" || name === "root") return "root";
  if (name === "(idle)" || name === "idle") return "idle";
  if (name === "(program)" || name === "program") return "program";
  if (/garbage collector|\(gc\)|^gc$/.test(name)) return "gc";
  if (basename.startsWith("product-mixed-v2-") && basename.endsWith(".js")) return "harness bundle";
  if (basename.startsWith("native_product_mixed_arm-")) return "native arm bundle";
  if (basename.startsWith("product_mixed_react_arm-")) return "react arm bundle";
  if (productionByBasename.has(basename)) return "production document or style";
  return "other runtime";
}

function aggregateProfile(profile, productionByBasename) {
  const nodes = Array.isArray(profile?.nodes) ? profile.nodes : [];
  const samples = Array.isArray(profile?.samples) ? profile.samples : [];
  const deltas = Array.isArray(profile?.timeDeltas) ? profile.timeDeltas : [];
  const nodeById = new Map();
  const duplicateIds = [];
  const invalidEdges = [];
  const multipleParents = [];
  const cycleEdges = [];
  const indegree = new Map();
  for (const node of nodes) {
    if (nodeById.has(node.id)) duplicateIds.push(node.id);
    nodeById.set(node.id, node);
    indegree.set(node.id, 0);
  }
  for (const node of nodes) {
    for (const child of node.children ?? []) {
      if (!nodeById.has(child)) {
        invalidEdges.push({ parent: node.id, child });
      } else {
        const parentCount = (indegree.get(child) ?? 0) + 1;
        indegree.set(child, parentCount);
        if (parentCount > 1) multipleParents.push({ child, parent: node.id, parentCount });
      }
    }
  }
  const graphRoots = nodes.filter((node) => indegree.get(node.id) === 0);
  const visited = new Set();
  const visiting = new Set();
  function walk(nodeId) {
    if (visiting.has(nodeId)) {
      cycleEdges.push(nodeId);
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    const node = nodeById.get(nodeId);
    for (const child of node?.children ?? []) if (nodeById.has(child)) walk(child);
    visiting.delete(nodeId);
    visited.add(nodeId);
  }
  for (const node of graphRoots) walk(node.id);
  const unreachableNodeIds = nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
  const unresolvedSamples = [];
  const missingSamples = [];
  const invalidDeltas = [];
  const totals = new Map();
  let weightedSelfMicros = 0;
  for (let index = 0; index < samples.length; index++) {
    const sampleId = samples[index];
    const node = nodeById.get(sampleId);
    const delta = deltas[index];
    if (!Number.isFinite(delta) || delta < 0) invalidDeltas.push({ index, delta });
    if (!node) {
      missingSamples.push({ index, sampleId });
      continue;
    }
    if (!Number.isFinite(delta) || delta < 0) continue;
    const frame = node.callFrame ?? {};
    const functionName = frame.functionName || "(anonymous)";
    const url = frame.url ?? "";
    const lineNumber = frame.lineNumber ?? -1;
    const columnNumber = frame.columnNumber ?? -1;
    const key = `${url}\u0000${functionName}\u0000${lineNumber}\u0000${columnNumber}`;
    const row = totals.get(key) ?? {
      functionName, url, lineNumber, columnNumber, sampleCount: 0, selfTimeMicros: 0,
    };
    row.sampleCount++;
    row.selfTimeMicros += delta;
    weightedSelfMicros += delta;
    totals.set(key, row);
    if (!url || lineNumber < 0 || columnNumber < 0 ||
      !productionByBasename.has(path.basename(safeUrlPath(url)))) {
      unresolvedSamples.push({ sampleId, functionName, url, lineNumber, columnNumber });
    }
  }
  const allRows = [...totals.values()].map((row) => ({
    ...row,
    category: classify(row, productionByBasename),
    selfTimeMs: row.selfTimeMicros / 1000,
    selfTimePercent: weightedSelfMicros === 0 ? null : row.selfTimeMicros * 100 / weightedSelfMicros,
  })).sort((left, right) => right.selfTimeMicros - left.selfTimeMicros);
  const categoryTotals = {};
  for (const row of allRows) {
    const current = categoryTotals[row.category] ?? { selfTimeMicros: 0, sampleCount: 0 };
    current.selfTimeMicros += row.selfTimeMicros;
    current.sampleCount += row.sampleCount;
    categoryTotals[row.category] = current;
  }
  for (const [category, value] of Object.entries(categoryTotals)) {
    value.selfTimeMs = value.selfTimeMicros / 1000;
    value.selfTimePercent = weightedSelfMicros === 0 ? null : value.selfTimeMicros * 100 / weightedSelfMicros;
  }
  return {
    nodeCount: nodes.length,
    sampleCount: samples.length,
    timeDeltaCount: deltas.length,
    duplicateIds,
    invalidEdges,
    graphRoots: graphRoots.map((node) => node.id),
    multipleParents,
    cycleEdges,
    unreachableNodeIds,
    missingSamples,
    invalidDeltas,
    unresolvedSamples,
    totalSelfTimeMicros: weightedSelfMicros,
    totalSelfTimeMs: weightedSelfMicros / 1000,
    topFrames: allRows.slice(0, 50),
    rankedSelfCostFrames: allRows,
    categoryTime: categoryTotals,
  };
}

function safeUrlPath(value) {
  try { return new URL(value).pathname; } catch { return ""; }
}

function profileCategorySummaryMatches(saved, independent) {
  if (!saved || typeof saved !== "object") return false;
  const actualKeys = Object.keys(saved).sort();
  const expectedKeys = Object.keys(independent).sort();
  return same(actualKeys, expectedKeys) && expectedKeys.every((key) => {
    const actual = saved[key];
    const expected = independent[key];
    return approx(actual.selfTimeMicros, expected.selfTimeMicros) &&
      approx(actual.selfTimeMs, expected.selfTimeMs) &&
      (actual.selfTimePercent === null && expected.selfTimePercent === null ||
        approx(actual.selfTimePercent, expected.selfTimePercent));
  });
}

let checkpoint, pilotManifest, preregistration, results, postLock;
try {
  checkpoint = await readJson(checkpointPath);
  pilotManifest = await readJson(pilotManifestPath);
  preregistration = await readJson(preregistrationPath);
  results = await readJson(path.relative(root, resultPath));
  postLock = await readJson(path.relative(root, postLockPath));
} catch (error) {
  console.error(`Cannot read finalized diagnostic inputs: ${error}`);
  process.exitCode = 2;
  process.exit();
}

const frozen = preregistration.frozenInputs ?? {};
const productionFiles = frozen.productionFiles ?? {};
const sourceBuildFiles = frozen.sourceBuildFiles ?? {};
const verificationEvidence = frozen.verificationEvidence ?? {};
const productionByBasename = new Map(Object.entries(productionFiles).map(([filename, hash]) => [
  path.basename(filename), { filename, hash },
]));
const proofExecutionPath = frozen.compilerProof?.executionProof?.path;
const proofExecutionHash = frozen.compilerProof?.executionProof?.sha256;

check("frozen-reference-paths", frozen.checkpoint?.path === checkpointPath &&
  frozen.correctnessPilotManifest?.path === pilotManifestPath &&
  frozen.sourceBuildArchive?.path === archivePath &&
  frozen.protocol?.path === "product-mixed-state-lanes-cpu-protocol.md" &&
  frozen.schedule?.path === "src/browser/product_mixed_schedule.ts" &&
  frozen.collector?.path === "scripts/profile_product_mixed_state_lanes_cpu.mjs" &&
  frozen.verifier?.path === "scripts/verify_product_mixed_state_lanes_cpu.mjs",
"Frozen preregistration references must point to the exact protocol, candidate, collector, verifier, schedule, and pilot inputs.", {
  checkpoint: frozen.checkpoint?.path, manifest: frozen.correctnessPilotManifest?.path,
  archive: frozen.sourceBuildArchive?.path, protocol: frozen.protocol?.path,
  schedule: frozen.schedule?.path, collector: frozen.collector?.path, verifier: frozen.verifier?.path,
});

check("checkpoint-qualification", checkpoint.status === "NUMERIC_STATE_LANES_CORRECTNESS_VERIFIED" &&
  checkpoint.runtimeTests === 629 && checkpoint.rustTests === 32 &&
  checkpoint.integrationCommands === 12 && checkpoint.candidateProductionPilotPages === 6 &&
  checkpoint.speedGate === "UNMEASURED_FOR_THIS_CANDIDATE",
"Frozen candidate qualification must match the protocol; it is eligibility evidence, not speed evidence.", {
  status: checkpoint.status, runtimeTests: checkpoint.runtimeTests, rustTests: checkpoint.rustTests,
  integrationCommands: checkpoint.integrationCommands, pilotPages: checkpoint.candidateProductionPilotPages,
  speedGate: checkpoint.speedGate,
});

let archiveHash = null;
try { archiveHash = await hashFile(archivePath); } catch { /* recorded below */ }
check("archive-lock", archiveHash === expectedArchiveSha256 &&
  checkpoint.archiveSha256 === expectedArchiveSha256,
"Candidate source/build archive must match the frozen SHA-256.", {
  expected: expectedArchiveSha256, actual: archiveHash, checkpoint: checkpoint.archiveSha256,
});
let archiveNames = [];
try {
  archiveNames = execFileSync("tar", ["-tzf", path.resolve(root, archivePath)], { encoding: "utf8" })
    .trim().split("\n").filter(Boolean).map((name) => name.replace(/\/$/, ""));
} catch (error) {
  check("archive-inventory", false, `Unable to inspect frozen archive inventory: ${error}`);
}
check("archive-inventory", archiveNames.length === 853 &&
  same(sorted(archiveNames), sorted(Object.keys(checkpoint.sourceAndBuildSha256 ?? {}))),
"Archive inventory must contain exactly the 853 locked source/build files.", {
  archiveEntryCount: archiveNames.length, lockCount: Object.keys(checkpoint.sourceAndBuildSha256 ?? {}).length,
});

const sourceLocksMatch = sameMap(sourceBuildFiles, checkpoint.sourceAndBuildSha256 ?? {}) &&
  Object.keys(sourceBuildFiles).length === 853;
let archiveMemberHashes = {};
let archiveMemberError = null;
try {
  archiveMemberHashes = JSON.parse(execFileSync("python3", ["-c", `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1],"r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Unreadable archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`, path.resolve(root, archivePath)], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024,
  }));
} catch (error) {
  archiveMemberError = String(error);
}
check("archive-member-content-hashes", archiveMemberError === null &&
  sameMap(archiveMemberHashes, sourceBuildFiles),
"Every archived source/build member must reproduce its registered content hash, not only its filename.", {
  memberCount: Object.keys(archiveMemberHashes).length,
  error: archiveMemberError,
  mismatches: Object.keys(sourceBuildFiles).filter((name) =>
    archiveMemberHashes[name] !== sourceBuildFiles[name]).slice(0, 30),
});
check("source-build-lock-inventory", sourceLocksMatch,
"Preregistration source/build inventory must exactly match all 853 frozen checkpoint entries.", {
  preregistrationCount: Object.keys(sourceBuildFiles).length,
  checkpointCount: Object.keys(checkpoint.sourceAndBuildSha256 ?? {}).length,
});
const sourceLockFailures = [];
for (const [filename, expected] of Object.entries(sourceBuildFiles)) {
  try {
    const actual = await hashFile(filename);
    if (actual !== expected) sourceLockFailures.push({ filename, expected, actual });
  } catch (error) { sourceLockFailures.push({ filename, expected, error: String(error) }); }
}
check("source-build-locks-current", sourceLockFailures.length === 0,
"Every frozen source/build file must still match its preregistered SHA-256.", sourceLockFailures.slice(0, 30));

const checkpointVerification = checkpoint.verificationSha256 ?? {};
check("verification-evidence-lock-inventory", sameMap(verificationEvidence, checkpointVerification),
"Preregistration verification evidence must exactly match all frozen checkpoint verification hashes.", {
  preregistrationCount: Object.keys(verificationEvidence).length,
  checkpointCount: Object.keys(checkpointVerification).length,
});
const verificationLockFailures = [];
for (const [relative, expected] of Object.entries(verificationEvidence)) {
  const filename = path.join(verificationBase, relative);
  try {
    const actual = await hashFile(filename);
    if (actual !== expected) verificationLockFailures.push({ filename, expected, actual });
  } catch (error) { verificationLockFailures.push({ filename, expected, error: String(error) }); }
}
check("verification-evidence-current", verificationLockFailures.length === 0,
"Every frozen checkpoint verification artifact must retain its locked bytes.", verificationLockFailures.slice(0, 30));

const expectedProduction = Object.fromEntries(Object.entries(sourceBuildFiles).filter(([filename]) =>
  filename.startsWith("dist-product-mixed-state-lanes/")));
check("production-file-locks", Object.keys(expectedProduction).length === 5 &&
  sameMap(productionFiles, expectedProduction),
"All five frozen production assets must be present in the source/build lock and match the production subset.", {
  productionFiles,
});

const expectedPilotRecords = expectedPilot.map(([arm, size]) => ({ arm, size, status: "PASS" }));
check("correctness-pilot-manifest", pilotManifest.status === "PASS" &&
  /Correctness pilot only/.test(pilotManifest.scope ?? "") && same(pilotManifest.records, expectedPilotRecords),
"The frozen pilot must contain exactly six PASS correctness-only records.", {
  status: pilotManifest.status, records: pilotManifest.records,
});
const preregPilotRecords = frozen.validatedPilotRecords ?? [];
const pilotLockFailures = [];
for (const [arm, size] of expectedPilot) {
  const filename = `${pilotDirectory}/${arm}-${size}.json`;
  const locked = preregPilotRecords.find((row) => row.arm === arm && row.size === size);
  try {
    const page = await readJson(filename);
    const actualHash = await hashFile(filename);
    const valid = page.schemaVersion === 2 && page.study === "compiled-product-mixed-v2" &&
      page.mode === "pilot" && page.production === true && page.arm === arm && page.size === size &&
      page.status === "PASS" && page.warmup === 5 && page.frames === 60 &&
      page.samples?.length === 60 && Object.keys(page.checks ?? {}).length === 5 &&
      Object.values(page.checks ?? {}).every(Boolean) && same(page.errors, []) &&
      same(page.browserErrors, []) && page.active?.writers === size && page.after?.writers === 0 &&
      page.active?.cleanups < page.after?.cleanups && locked?.pageSha256 === actualHash;
    if (!valid) pilotLockFailures.push({ arm, size, actualHash, lockedHash: locked?.pageSha256 ?? null });
  } catch (error) { pilotLockFailures.push({ arm, size, error: String(error) }); }
}
check("correctness-pilot-page-locks", preregPilotRecords.length === 6 &&
  pilotLockFailures.length === 0,
"All six pilot records must match content checks and their preregistered raw-page hashes.", pilotLockFailures);

const expectedProof = {
  correctnessPilot: {
    native: pilotManifest.nativeProof,
    react: pilotManifest.reactProof,
  },
};
const proofFailures = [];
try {
  const executionProof = await readJson(proofExecutionPath);
  if (executionProof.status !== "PASS" || proofExecutionHash !== checkpointVerification["verification/execution-proof.json"] ||
    executionProof.captureCallsForEligibleCuts !== 0 ||
    !same(frozen.compilerProof?.executionProof?.evidence, executionProof)) {
    proofFailures.push({ executionProofPath, expectedHash: proofExecutionHash });
  }
} catch (error) { proofFailures.push({ executionProofPath, error: String(error) }); }
const compilerFiles = frozen.compilerProof?.files ?? {};
for (const [filename, lock] of Object.entries(compilerFiles)) {
  try {
    if (await hashFile(filename) !== lock.sha256 || checkpointVerification[path.relative(verificationBase, filename)] !== lock.sha256) {
      proofFailures.push({ filename, lock: lock.sha256, checkpointLock: checkpointVerification[path.relative(verificationBase, filename)] });
    }
  } catch (error) { proofFailures.push({ filename, error: String(error) }); }
}
const expectedCompilerFiles = [
  `${verificationBase}/verification/product-compiler-proof/native.js`,
  `${verificationBase}/verification/product-compiler-proof/react.js`,
  `${verificationBase}/verification/product-compiler-proof/native.json`,
  `${verificationBase}/verification/product-compiler-proof/react.json`,
];
const compiledStylePath = `${verificationBase}/verification/compiled-style-proof.json`;
try {
  const compilerProofText = await readFile(path.resolve(root, expectedCompilerFiles[0]), "utf8");
  const boundary = compilerProofText.search(/\n\s*"component_module":/);
  const executable = boundary > 0 ? compilerProofText.slice(0, boundary) : "";
  const numericDescriptors = (executable.match(/sinkId:\s*"src\/browser\/native_product_mixed_arm\.tsx#numeric-sink:/g) ?? []).length;
  const numericBindings = (executable.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length;
  const layoutSlots = [...executable.matchAll(/siteId:\s*"(src\/browser\/native_product_mixed_arm\.tsx#component:ProductMixedRow#state:\d+)",\s*slot:\s*(\d+)/g)].map((match) => ({ siteId: match[1], slot: Number(match[2]) }));
  const expectedLayoutSlots = [0, 1, 2].map((slot) => ({ siteId: `src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:${slot}`, slot }));
  if (numericDescriptors !== 3 || numericBindings !== 3 || !same(layoutSlots, expectedLayoutSlots)) {
    proofFailures.push({ filename: expectedCompilerFiles[0], numericDescriptors, numericBindings, layoutSlots });
  }
  const compiledStyle = await readJson(compiledStylePath);
  if (compiledStyle.status !== "PASS" || compiledStyle.trace?.factories !== 73 || compiledStyle.trace?.writes !== 80 ||
    !same(compiledStyle.trace?.fields, { left: 35, top: 35, transform: 3 })) {
    proofFailures.push({ filename: compiledStylePath, status: compiledStyle.status, trace: compiledStyle.trace });
  }
  if (checkpointVerification[path.relative(verificationBase, compiledStylePath)] !== await hashFile(compiledStylePath)) {
    proofFailures.push({ filename: compiledStylePath, reason: "compiled style proof differs from checkpoint lock" });
  }
} catch (error) { proofFailures.push({ filename: compiledStylePath, error: String(error) }); }
const laneProofs = frozen.compilerProof?.numericStateLaneProofs ?? {};
const laneProofRequirements = {
  stateLayout: {
    path: stateLayoutProofPath,
    valid(proof) {
      const slots = [0, 1, 2].map((slot) => ({
        siteId: `.cache/numeric-state-layout/authored-layout-1791874961364-68359.tsx#component:Row#state:${slot}`,
        slot,
      }));
      return proof.status === "PASS" && proof.assertions?.ordinaryAuthoredTSX === true &&
        same(proof.assertions?.compilerLayoutSlots, slots) &&
        same(proof.assertions?.sparseValues, [13, 0, 0]) &&
        same(proof.assertions?.denseValues, [21, 22, 23, 31, 32, 33]) &&
        proof.assertions?.stableAddressesThroughMove === true &&
        proof.assertions?.removedOwnerAndDeadSetter === true &&
        same(proof.assertions?.rowReuse, { row: 1, oldGeneration: 1, newGeneration: 2 }) &&
        proof.assertions?.discardedCandidateColumnIsolation === true &&
        proof.assertions?.candidateValidAfterPrivateRenderWrite === false;
    },
  },
  laneCut: {
    path: laneCutProofPath,
    valid(proof) {
      const calls = proof.laneCut?.setColumnCellsCalls ?? [];
      return proof.status === "PASS" && same(calls, [1, 6].map((count) => ({
        count, columnsLength: count, rowsLength: count, valuesLength: count,
      }))) &&
        proof.laneCut?.nonemptyPendingStateCaptureCalls === 0 &&
        proof.laneCut?.executeSourceProgramCalls === 0 &&
        proof.laneCut?.sparseCount === 1 && proof.laneCut?.denseCount === 6;
    },
  },
  laneLifecycle: {
    path: laneLifecycleProofPath,
    valid(proof) {
      return proof.status === "PASS" && proof.numericLaneReentry?.snapshotsDuringSupportedLaneCuts === 0 &&
        same(proof.numericLaneReentry?.capturedWrites, [1, 1].map((count) => ({
          count, columnsLength: count, rowsLength: count, valuesLength: count,
        }))) && proof.numericLaneReentry?.outerWriteValue === "5px" &&
        proof.numericLaneReentry?.reentrantPendingValue === 9 && proof.numericLaneReentry?.nextWriteValue === "9px" &&
        same(proof.promotion?.outputs, ["widepx", "undefinedpx", "7px", "8px"]) &&
        proof.promotion?.initialStateActivations === 1 && proof.promotion?.stickyWorldLaneOff === true &&
        proof.promotion?.scalarSourceProgramFallback === true &&
        proof.lifecycle?.refBeforeEffect === true && proof.lifecycle?.effectObservesCommittedValues === true &&
        proof.lifecycle?.deadSetterRejectedOnDispose === true && proof.lifecycle?.hostWriteFailureCleanup === true &&
        proof.lifecycle?.rendersAtPromotionEnd === 4 &&
        proof.hostFailure?.terminalFlushThrows === true && proof.hostFailure?.priorOutputRetained === true &&
        proof.hostFailure?.cleanupCompleted === true;
    },
  },
};
for (const [name, requirement] of Object.entries(laneProofRequirements)) {
  const frozenProof = laneProofs[name];
  try {
    const actual = await readJson(requirement.path);
    const actualHash = await hashFile(requirement.path);
    if (frozenProof?.path !== requirement.path || frozenProof?.sha256 !== actualHash ||
      frozenProof?.sha256 !== checkpointVerification[path.relative(verificationBase, requirement.path)] ||
      !same(frozenProof?.proof, actual) || !requirement.valid(actual)) {
      proofFailures.push({ name, path: requirement.path, frozenHash: frozenProof?.sha256, actualHash });
    }
  } catch (error) { proofFailures.push({ name, path: requirement.path, error: String(error) }); }
}
check("compiler-proofs", same(frozen.compilerProof?.correctnessPilot, expectedProof.correctnessPilot) &&
  same(Object.keys(compilerFiles).sort(), expectedCompilerFiles.sort()) &&
  Object.keys(compilerFiles).length === 4 && proofFailures.length === 0,
"Pilot, numeric execution, compiler emission/layout, compiled style, and lane lifecycle/cut proofs must match frozen evidence.", proofFailures);

const pageSchedule = frozen.schedule?.pages ?? [];
const expectedSchedule = expectedPages.map(({ sequence, pair, arm, size }) => ({ sequence, pair, arm, size }));
const actualSchedule = pageSchedule.map(({ sequence, pair, arm, size }) => ({ sequence, pair, arm, size }));
check("frozen-schedule", frozen.schedule?.path === "src/browser/product_mixed_schedule.ts" &&
  frozen.schedule?.sha256 === sourceBuildFiles["src/browser/product_mixed_schedule.ts"] &&
  same(actualSchedule, expectedSchedule),
"The frozen schedule must select sequence 20 React and sequence 21 native, pair 0, size 1,024.", actualSchedule);

const origin = preregistration.browser?.origin;
const browser = preregistration.browser ?? {};
check("browser-profiler-configuration", preregistration.status === "FROZEN_BEFORE_CPU_PROFILE" &&
  preregistration.study === "compiled-product-mixed-state-lanes-cpu-diagnostic" &&
  Boolean(preregistration.runId) && origin === expectedOrigin && browser.headless === false &&
  browser.gpu === false && browser.viewport?.width === 1200 && browser.viewport?.height === 900 &&
  browser.freshContext === true && browser.foregroundPage === true && browser.serial === true &&
  browser.profilerSamplingIntervalMicros === 1000 && browser.profilerStartsOnAboutBlankBeforeNavigation === true &&
  preregistration.workload?.size === 1024 && same(preregistration.workload?.sequences, [20, 21]) &&
  preregistration.workload?.warmupFrames === 60 && preregistration.workload?.measuredFrames === 240,
"Preregistration must lock the headed, GPU-disabled, serial two-page CPU-profile protocol.", {
  status: preregistration.status, study: preregistration.study, runId: preregistration.runId,
  browser, workload: preregistration.workload,
});

const preflightRows = frozen.servedBytesPreflight ?? [];
const preflightFailures = [];
for (const [filename, expected] of Object.entries(productionFiles)) {
  const basename = path.basename(filename);
  const rowsForFile = preflightRows.filter((row) => row.filename === basename);
  if (rowsForFile.length !== 1 || rowsForFile[0].status !== 200 ||
    rowsForFile[0].sha256 !== expected || !rowsForFile[0].url?.startsWith(`${expectedOrigin}/`)) {
    preflightFailures.push({ filename, expected, rows: rowsForFile });
  }
}
check("served-byte-preflight", preflightRows.length === 5 && preflightFailures.length === 0,
"Preflight must fetch each of five production files once from the locked origin and match frozen bytes.", preflightFailures);

const expectedLocks = {
  [archivePath]: expectedArchiveSha256,
  [checkpointPath]: frozen.checkpoint?.sha256,
  [pilotManifestPath]: frozen.correctnessPilotManifest?.sha256,
  [frozen.protocol?.path]: frozen.protocol?.sha256,
  [frozen.schedule?.path]: frozen.schedule?.sha256,
  [frozen.collector?.path]: frozen.collector?.sha256,
  [frozen.verifier?.path]: frozen.verifier?.sha256,
  ...Object.fromEntries(Object.entries(verificationEvidence).map(([relative, hash]) => [path.join(verificationBase, relative), hash])),
  ...sourceBuildFiles,
  ...Object.fromEntries(preregPilotRecords.map((record) => [
    `${pilotDirectory}/${record.arm}-${record.size}.json`, record.pageSha256,
  ])),
};
delete expectedLocks.undefined;
const preLockFailures = [];
for (const [filename, expected] of Object.entries(expectedLocks)) {
  try {
    const actual = await hashFile(filename);
    if (!expected || actual !== expected) preLockFailures.push({ filename, expected: expected ?? null, actual });
  } catch (error) { preLockFailures.push({ filename, expected, error: String(error) }); }
}
check("complete-frozen-input-locks", preLockFailures.length === 0 &&
  Object.keys(sourceBuildFiles).length === 853,
"Checkpoint, archive, protocol, schedule, collector/verifier, source/build, pilot, and proof locks must all match current bytes.", {
  lockCount: Object.keys(expectedLocks).length, failures: preLockFailures.slice(0, 30),
});
check("serialized-input-locks", sameMap(frozen.inputLocks, expectedLocks),
"The frozen preregistration must serialize the complete input lock map used for the post-collection lock.", {
  serializedCount: Object.keys(frozen.inputLocks ?? {}).length,
  expectedCount: Object.keys(expectedLocks).length,
  missing: Object.keys(expectedLocks).filter((filename) => frozen.inputLocks?.[filename] !== expectedLocks[filename]).slice(0, 30),
  unexpected: Object.keys(frozen.inputLocks ?? {}).filter((filename) => !(filename in expectedLocks)).slice(0, 30),
});

const postExpected = postLock.expected ?? {};
const postObserved = postLock.observed ?? {};
const postLockMatches = postLock.status === "PASS" && Array.isArray(postLock.mismatches) &&
  postLock.mismatches.length === 0 && sameMap(postExpected, expectedLocks) &&
  sameMap(postObserved, expectedLocks);
check("post-collection-lock", postLockMatches,
"Post-collection lock must match the complete preregistered input inventory with no mismatches.", {
  status: postLock.status, mismatchCount: postLock.mismatches?.length,
  expectedCount: Object.keys(postExpected).length, verifierCount: Object.keys(expectedLocks).length,
});

check("result-manifest", results.schemaVersion === 1 &&
  results.study === "compiled-product-mixed-state-lanes-cpu-diagnostic" &&
  results.runId === preregistration.runId && results.status === "PASS" &&
  results.records?.length === expectedPages.length &&
  results.sourceBuildPostLock === "source-build-post-lock.json" &&
  results.correctnessPilotReference?.manifest === pilotManifestPath &&
  results.correctnessPilotReference?.manifestSha256 === frozen.correctnessPilotManifest?.sha256 &&
  results.correctnessPilotReference?.status === "PASS" &&
  results.correctnessPilotReference?.pageCountValidated === 6,
"Final manifest must be PASS, share the preregistered run ID, preserve the two records, and reference the frozen pilot and post-lock.", {
  status: results.status, runId: results.runId, records: results.records,
});

const rankedSelfCostFrames = {};
const profileSummaries = {};
for (const expected of expectedPages) {
  const record = results.records?.find((row) => row.sequence === expected.sequence);
  const pagePath = path.join(outputDirectory, expected.file);
  let page;
  try {
    page = await readJson(pagePath);
  } catch (error) {
    check(`page-record-${expected.sequence}`, false, `Cannot read raw record: ${error}`);
    continue;
  }
  const pageChecks = [];
  const schedulePage = pageSchedule.find((item) => item.sequence === expected.sequence);
  const pageIdentityOK = page.schemaVersion === 1 &&
    page.study === preregistration.study && page.runId === preregistration.runId &&
    page.sequence === expected.sequence && page.pair === expected.pair &&
    page.arm === expected.arm && page.size === expected.size &&
    page.origin === expectedOrigin && record?.file === expected.file &&
    record?.pair === expected.pair && record?.arm === expected.arm &&
    record?.size === expected.size && record?.status === page.status &&
    schedulePage?.sequence === expected.sequence && schedulePage?.pair === expected.pair &&
    schedulePage?.arm === expected.arm && schedulePage?.size === expected.size &&
    page.url === `${expectedOrigin}/product-mixed-v2.html?mode=confirm&sequence=${expected.sequence}` &&
    Number.isFinite(Date.parse(preregistration.createdAt)) &&
    Number.isFinite(Date.parse(page.startedAt)) && Number.isFinite(Date.parse(page.finishedAt)) &&
    Date.parse(page.startedAt) >= Date.parse(preregistration.createdAt) &&
    Date.parse(page.finishedAt) >= Date.parse(page.startedAt);
  pageChecks.push(check(`page-identity-${expected.arm}`, pageIdentityOK,
    "Raw page must match the frozen sequence, pair, arm, size, origin, URL, run ID, and results record.", {
      sequence: page.sequence, pair: page.pair, arm: page.arm, size: page.size,
      runId: page.runId, status: page.status, file: record?.file,
    }));
  pageChecks.push(check(`page-errors-${expected.arm}`, page.status === "PASS" && same(page.pageErrors, []),
    "The page must PASS with no uncaught browser errors.", page.pageErrors));

  const harness = page.harness ?? {};
  const rawResult = page.result ?? {};
  const checks = harness.checks ?? {};
  const sampleRows = harness.samples ?? [];
  const rawResultSamples = rawResult.samples ?? [];
  const rawResultChecks = rawResult.checks ?? {};
  const frames = sampleRows.map((sample) => sample.frame);
  const structuralFrames = sampleRows.filter((sample) => sample.structural).map((sample) => sample.frame);
  const expectedStructuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
  const harnessSamplesOK = sampleRows.length === 240 &&
    same(frames, Array.from({ length: 240 }, (_, index) => index + 61)) &&
    sampleRows.every((sample) => typeof sample.structural === "boolean" &&
      Number.isFinite(sample.commitMs) && sample.commitMs >= 0 &&
      Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0) &&
    same(structuralFrames, expectedStructuralFrames);
  const harnessCheckNames = Object.keys(checks).sort();
  const harnessOK = harness.status === "PASS" && harness.sampleCount === 240 &&
    harness.frames === 240 && harness.warmup === 60 && harness.structuralFrameCount === 8 &&
    same(harnessCheckNames, expectedCheckNames) && Object.values(checks).every((value) => value === true) &&
    harnessSamplesOK && rawResult.status === "PASS" && rawResult.mode === "confirm" &&
    rawResult.production === true && rawResult.sequence === expected.sequence &&
    rawResult.pair === expected.pair && rawResult.arm === expected.arm &&
    rawResult.size === expected.size && rawResult.warmup === 60 && rawResult.frames === 240 &&
    same(rawResultChecks, checks) && same(rawResultSamples, sampleRows) &&
    same(rawResult.errors ?? [], []) && same(rawResult.browserErrors ?? [], []);
  pageChecks.push(check(`harness-correctness-${expected.arm}`, harnessOK,
    "Harness must pass all five correctness checks with 60 warmup, frames 61–300, exactly eight expected structural frames, and finite sample timings.", {
      status: harness.status, warmup: harness.warmup, frames: harness.frames,
      sampleCount: harness.sampleCount, checkNames: harnessCheckNames, checks,
      structuralFrames, harnessSamplesOK, rawResultStatus: rawResult.status,
      rawResultMode: rawResult.mode, rawResultSamples: rawResultSamples.length,
      rawResultErrors: rawResult.errors ?? null, rawResultBrowserErrors: rawResult.browserErrors ?? null,
    }));
  const active = rawResult.active ?? {};
  const after = rawResult.after ?? {};
  const lifecycleOK = harness.mounts === expected.size + 64 &&
    harness.cleanups === 64 && active.mounts === harness.mounts &&
    active.cleanups === harness.cleanups && active.writers === expected.size &&
    same(harness.active, active) && same(harness.after, after) &&
    same(harness.postTeardown, after) &&
    after.mounts === harness.mounts && after.cleanups === harness.mounts && after.writers === 0 &&
    Number.isFinite(active.renders) && Number.isFinite(after.renders);
  let nativeLifecycleOK = true;
  if (expected.arm === "native") {
    const live = after.extra;
    const current = active.extra;
    const aRoot = current?.root ?? {};
    const zRoot = live?.root ?? {};
    const aCollection = current?.collection ?? {};
    const zCollection = live?.collection ?? {};
    nativeLifecycleOK = current?.collectionSize === expected.size &&
      Number.isSafeInteger(current?.collectionVersion) && current.collectionVersion > 0 &&
      current?.registeredSetters === expected.size &&
      Number.isSafeInteger(aRoot.version) && aRoot.version > 0 &&
      Number.isFinite(aRoot.sourceValueSyncVisits) && aRoot.sourceValueSyncVisits >= 0 &&
      aRoot.ownerCount === expected.size + 1 && aRoot.pendingChangeCount === 0 &&
      aRoot.disposed === false && zRoot.ownerCount === 0 && zRoot.pendingChangeCount === 0 &&
      zRoot.disposed === true && zRoot.version === aRoot.version &&
      zRoot.sourceValueSyncVisits === aRoot.sourceValueSyncVisits &&
      Number.isFinite(aCollection.entryInspections) && aCollection.entryInspections >= 0 &&
      aCollection.anchorInspections === 0 && aCollection.retainedBatches === 0 &&
      aCollection.readerCount === 1 && zCollection.readerCount === 0 &&
      zCollection.entryInspections === aCollection.entryInspections &&
      zCollection.anchorInspections === aCollection.anchorInspections &&
      aCollection.listenerNotifications === expectedStructuralFrames.length &&
      zCollection.listenerNotifications === aCollection.listenerNotifications &&
      aCollection.listenerErrors === 0 && zCollection.listenerErrors === 0 &&
      current?.collectionVersion === expectedStructuralFrames.length &&
      live?.collectionSize === 0 && live.collectionVersion === null &&
      aCollection.retainedBatches === 0 && zCollection.retainedBatches === 0 &&
      live.registeredSetters === 0;
  }
  pageChecks.push(check(`lifecycle-${expected.arm}`, lifecycleOK && nativeLifecycleOK,
    "Mounted and post-teardown lifecycle fields must balance; native owner/store/collection/setter retention must be released.", {
      active, mounts: harness.mounts, cleanups: harness.cleanups, activeWriters: expected.size,
      postTeardown: after, nativeLifecycleOK,
    }));

  const loaded = page.loadedBuildResources ?? [];
  const requiredHtml = "product-mixed-v2.html";
  const requiredCss = Object.keys(productionFiles).map((filename) => path.basename(filename)).find((name) => name.endsWith(".css"));
  const requiredCommonJs = Object.keys(productionFiles).map((filename) => path.basename(filename)).find((name) => name.startsWith("product-mixed-v2-") && name.endsWith(".js"));
  const requiredArmJs = Object.keys(productionFiles).map((filename) => path.basename(filename)).find((name) =>
    expected.arm === "native" ? name.startsWith("native_product_mixed_arm-") : name.startsWith("product_mixed_react_arm-"));
  const wrongArmPrefix = expected.arm === "native" ? "product_mixed_react_arm-" : "native_product_mixed_arm-";
  const loadedFailures = [];
  for (const resource of loaded) {
    const locked = productionByBasename.get(resource.filename);
    if (!locked || resource.status !== 200 || resource.sha256 !== locked.hash ||
      !resource.url?.startsWith(`${expectedOrigin}/`)) {
      loadedFailures.push({ resource, expectedHash: locked?.hash ?? null });
    }
  }
  const loadedNames = loaded.map((resource) => resource.filename);
  const loadedOK = loaded.length >= 4 && [requiredHtml, requiredCss, requiredCommonJs, requiredArmJs]
    .every((name) => name && loadedNames.includes(name)) &&
    !loadedNames.some((name) => name.startsWith(wrongArmPrefix)) && loadedFailures.length === 0;
  pageChecks.push(check(`loaded-assets-${expected.arm}`, loadedOK,
    "Every loaded production response must match frozen bytes and include common plus the selected arm, excluding the other arm.", {
      requiredHtml, requiredCss, requiredCommonJs, requiredArmJs, loadedNames, loadedFailures,
    }));

  const independent = aggregateProfile(page.profile, productionByBasename);
  profileSummaries[expected.arm] = {
    nodeCount: independent.nodeCount,
    sampleCount: independent.sampleCount,
    timeDeltaCount: independent.timeDeltaCount,
    totalSelfTimeMicros: independent.totalSelfTimeMicros,
    totalSelfTimeMs: independent.totalSelfTimeMs,
    categoryTime: independent.categoryTime,
  };
  rankedSelfCostFrames[expected.arm] = independent.rankedSelfCostFrames.slice(0, 50);
  const graphOK = independent.nodeCount > 0 && independent.sampleCount > 0 &&
    independent.sampleCount === independent.timeDeltaCount &&
    independent.duplicateIds.length === 0 && independent.invalidEdges.length === 0 &&
    independent.graphRoots.length === 1 && independent.multipleParents.length === 0 &&
    independent.cycleEdges.length === 0 && independent.unreachableNodeIds.length === 0 &&
    independent.missingSamples.length === 0 && independent.invalidDeltas.length === 0 &&
    Number.isFinite(page.profile?.startTime) && Number.isFinite(page.profile?.endTime) &&
    page.profile.endTime >= page.profile.startTime;
  pageChecks.push(check(`raw-profile-graph-${expected.arm}`, graphOK,
    "Raw CDP nodes must form a resolvable child graph; every sample ID must resolve and have one finite nonnegative timeDelta.", {
      nodeCount: independent.nodeCount, sampleCount: independent.sampleCount,
      timeDeltaCount: independent.timeDeltaCount, duplicateIdCount: independent.duplicateIds.length,
      graphRoots: independent.graphRoots, multipleParentCount: independent.multipleParents.length,
      cycleCount: independent.cycleEdges.length, unreachableNodeCount: independent.unreachableNodeIds.length,
      invalidEdgeCount: independent.invalidEdges.length, missingSamples: independent.missingSamples.slice(0, 10),
      invalidDeltas: independent.invalidDeltas.slice(0, 10), startTime: page.profile?.startTime,
      endTime: page.profile?.endTime,
    }));
  const summary = page.summary ?? {};
  const savedTotalOK = summary.sampleCount === independent.sampleCount &&
    approx(summary.totalSelfTimeMicros, independent.totalSelfTimeMicros) &&
    approx(summary.totalSelfTimeMs, independent.totalSelfTimeMs) &&
    sameSummaryRows(summary.topFrames, independent.topFrames) &&
    profileCategorySummaryMatches(summary.categoryTime, independent.categoryTime);
  pageChecks.push(check(`independent-profile-aggregation-${expected.arm}`, savedTotalOK,
    "Saved frame ranks and category totals must match an independent timeDelta-weighted aggregation of raw sample node IDs.", {
      sampleCount: independent.sampleCount, savedSampleCount: summary.sampleCount,
      independentSelfTimeMicros: independent.totalSelfTimeMicros,
      savedSelfTimeMicros: summary.totalSelfTimeMicros,
      topFrameCount: independent.topFrames.length,
      independentCategories: independent.categoryTime,
      savedCategories: summary.categoryTime,
    }));
  check(`profile-category-method-${expected.arm}`, summary.categoryMethod ===
    "URL/function-name heuristics only; bundled arm chunks combine authored app and runtime code, so labels do not establish causality.",
  "Category labels must retain the non-causal heuristic limitation.");

  const excerptResults = [];
  const excerptKeys = new Set();
  for (const excerpt of page.topFrameSourceExcerpts ?? []) {
    const basename = path.basename(excerpt.productionFile ?? "");
    const locked = productionByBasename.get(basename);
    const frame = independent.topFrames.find((row) => row.functionName === excerpt.functionName &&
      row.url === excerpt.url && row.lineNumber === excerpt.lineNumber && row.columnNumber === excerpt.columnNumber);
    let valid = !!locked && !!frame && excerpt.productionFile === locked.filename &&
      excerpt.productionSha256 === locked.hash && Number.isSafeInteger(excerpt.lineNumber) &&
      Number.isSafeInteger(excerpt.columnNumber) && excerpt.lineNumber >= 0 && excerpt.columnNumber >= 0;
    let computedOffset = null;
    let expectedText = null;
    let fileText = "";
    if (valid) {
      fileText = await readFile(path.resolve(root, locked.filename), "utf8");
      const sourceLines = fileText.split("\n");
      const lineIsInRange = excerpt.lineNumber < sourceLines.length;
      const columnIsInRange = lineIsInRange && excerpt.columnNumber <= sourceLines[excerpt.lineNumber].length;
      valid = lineIsInRange && columnIsInRange;
      if (valid) {
      const lineStart = sourceLines.slice(0, excerpt.lineNumber)
        .reduce((sum, line) => sum + line.length + 1, 0);
      computedOffset = lineStart + excerpt.columnNumber;
      const start = Math.max(0, computedOffset - 150);
      const end = Math.min(fileText.length, computedOffset + 150);
      expectedText = fileText.slice(start, end);
      valid = excerpt.offsetUnit === "UTF-16 code units" && excerpt.sampleOffset === computedOffset &&
        excerpt.excerptStartOffset === start && excerpt.excerptEndOffset === end &&
        excerpt.minifiedCodeExcerpt === expectedText &&
        approx(excerpt.sampledSelfTimeMs, frame.selfTimeMs);
      excerptKeys.add(`${excerpt.url}\u0000${excerpt.functionName}\u0000${excerpt.lineNumber}\u0000${excerpt.columnNumber}`);
      }
    }
    excerptResults.push({ functionName: excerpt.functionName, productionFile: locked?.filename ?? excerpt.productionFile,
      computedOffset, suppliedOffset: excerpt.sampleOffset, exactBytes: valid });
  }
  const unresolvedHasNoExcerpt = independent.unresolvedSamples.every((frame) =>
    !excerptKeys.has(`${frame.url}\u0000${frame.functionName || "(anonymous)"}\u0000${frame.lineNumber}\u0000${frame.columnNumber}`));
  check(`source-excerpts-${expected.arm}`, excerptResults.length > 0 &&
    excerptResults.every((row) => row.exactBytes) && unresolvedHasNoExcerpt,
  "Every emitted excerpt must reproduce exact locked production text and offsets; built-in/unresolved frames remain unlocated in raw evidence.", {
    excerptCount: excerptResults.length, invalid: excerptResults.filter((row) => !row.exactBytes).slice(0, 10),
    unresolvedSampleCount: independent.unresolvedSamples.length,
    unresolvedExamples: independent.unresolvedSamples.slice(0, 10), unresolvedHasNoExcerpt,
  });
}

check("selected-page-statuses", results.status === "PASS" &&
  results.records?.length === 2 && results.records.every((row) => row.status === "PASS"),
"Both preregistered pages must remain present and PASS; failed records are preserved and invalidate verification.",
results.records?.map(({ sequence, arm, status }) => ({ sequence, arm, status })));

await mkdir(resultDirectory, { recursive: true });
const verification = {
  schemaVersion: 1,
  study: "compiled-product-mixed-state-lanes-cpu-independent-verification",
  checkedAt: new Date().toISOString(),
  inputResults: path.relative(root, resultPath),
  runId: preregistration.runId,
  status: failures.length === 0 ? "PASS" : "FAIL",
  summary: {
    checkCount: rows.length,
    passed: rows.filter((row) => row.status === "PASS").length,
    failed: failures.length,
    weightedProfileSelfTime: profileSummaries,
    rankedIndependentlyComputedSelfCostFrames: rankedSelfCostFrames,
  },
  checks: rows,
  failures,
  interpretation: "Integrity and independent sampled-self-time recomputation only. Profiles include module import, mount, warmup, measured work, harness inspection, disposal, idle, and GC. Weighted self time is not exact instruction time or timed-step cost; categories are URL/name hints and do not establish causality. No latency verdict or phase-count attribution is derived.",
};
const verificationPath = path.join(resultDirectory, "verification.json");
await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({
  status: verification.status,
  runId: verification.runId,
  checks: verification.summary.checkCount,
  passed: verification.summary.passed,
  failed: verification.summary.failed,
  verificationPath: path.relative(root, verificationPath),
  failures,
}, null, 2));
if (verification.status !== "PASS") process.exitCode = 1;
