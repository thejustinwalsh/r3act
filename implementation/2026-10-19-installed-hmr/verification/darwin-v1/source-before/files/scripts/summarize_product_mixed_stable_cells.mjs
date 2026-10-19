import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsRoot = path.join(projectRoot, "results");
const rawDirectory = path.join(resultsRoot, "product-mixed-stable-cells-confirmation");
const preregistrationPath = path.join(rawDirectory, "preregistration.json");
const collectionManifestPath = path.join(rawDirectory, "manifest.json");
const finalResultsPath = path.join(rawDirectory, "FINALresults.json");
const postlockPath = path.join(rawDirectory, "postlock.json");
const summaryPath = path.join(rawDirectory, "summary.json");
const svgPath = path.join(rawDirectory, "summary.svg");
const expectedProtocolPath = "product-mixed-stable-cells-confirmation-protocol.md";
const protocolPath = path.join(projectRoot, expectedProtocolPath);
const sizes = [128, 512, 1024];
const pairsPerSize = 5;
const expectedRecordCount = sizes.length * pairsPerSize * 2;
const warmupFrames = 60;
const measuredFrames = 240;
const structuralEvery = 30;
const structuralEveryFrameCount = 8;
const rowsChangedPerStructuralFrame = 8;
const candidateBase = "implementation/2026-10-13-stable-numeric-cells";
const candidateStatusPath = `${candidateBase}/status.json`;
const candidateArchivePath = `${candidateBase}/source-and-evidence.tar.gz`;
const pilotDirectory = "results/product-mixed-stable-cells-pilot";
const timingConfigPath = "vite.product-mixed-stable-cells-timing.config.ts";
const basePreviewConfigPath = "vite.product-mixed-stable-cells.config.ts";
const collectorPath = "scripts/collect_product_mixed_stable_cells.mjs";
const analyzerPath = "scripts/summarize_product_mixed_stable_cells.mjs";
const verifierPath = "scripts/verify_product_mixed_stable_cells_evidence.mjs";
const scheduleSourcePath = "src/browser/product_mixed_schedule.ts";
const buildDirectory = "dist-product-mixed-stable-cells";
const expectedArchiveSha256 = "11b0c553b021e4ca96cdcc75f71babf3cdc9e7aaf19f49699c55a7b0ba7fc0d6";
const expectedChromiumDiagnosticPath = "results/numeric-cell-storage-candidate-v3/diagnostic.json";
const expectedChromiumDiagnosticScriptPath = "results/numeric-cell-storage-candidate-v3/inspect_numeric_cell_storage_candidate.mjs";
const expectedChromiumDiagnosticBundlePath = "results/numeric-cell-storage-candidate-v3/owner-state-world.iife.js";
const expectedChromiumDiagnosticEntryPath = "results/numeric-cell-storage-candidate-v3/owner-state-world-entry.ts";
const expectedPreparedExecutionPath = ".cache/prepared-numeric-cell-proof/prepared-numeric-cell-proof-1791881378607-99147-0a8e5495-0399-4259-9f59-de8510a932d5.json";
const expectedPreparedLifecyclePath = ".cache/prepared-numeric-cell-lifecycle-proof/prepared-lifecycle-proof-1791881378757-99146-981329ba-ef1c-4c36-b8ba-8ecf24672533.json";
const expectedStateLayoutStoragePath = ".cache/numeric-state-layout/execution-proof-1791881378758-99147.json";
const expectedChromiumInputs = [
  expectedChromiumDiagnosticEntryPath,
  "src/compiled_bindings.ts",
  "src/compiled_state_layout.ts",
  "src/jsx_binding_runtime.ts",
  "src/owner_state_world.ts",
  "src/world_dirty_journal.ts",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isFiniteNonnegative = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const closeEnough = (actual, expected) => actual === expected || (Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= 1e-9);
const sorted = (values) => [...values].sort((a, b) => a - b);
const sameJson = (left, right) => {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameJson(item, right[index]));
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return sameJson(leftKeys, rightKeys) && leftKeys.every((key) => sameJson(left[key], right[key]));
};
const quantile = (values, kind) => {
  if (!values.length) return null;
  const ordered = sorted(values);
  const index = kind === "median"
    ? Math.floor(ordered.length / 2)
    : Math.ceil(0.95 * ordered.length) - 1;
  return ordered[index] ?? null;
};
const geometricMean = (values) => {
  if (!values.length) return null;
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  if (values.some((value) => value === 0)) return 0;
  return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
};
const equalCoreSchedule = (left, right) => Boolean(left && right) &&
  left.sequence === right.sequence && left.arm === right.arm && left.size === right.size && left.pair === right.pair;
const expectedSchedule = () => sizes.flatMap((size) =>
  Array.from({ length: pairsPerSize }, (_, pair) => {
    const arms = pair % 2 ? ["native", "react"] : ["react", "native"];
    return arms.map((arm) => ({ size, pair, arm }));
  }).flat()
).map((entry, sequence) => ({ ...entry, sequence }));

const preregistrationErrors = [];
let preregistration = null;
let preregistrationSha256 = null;
try {
  const bytes = await readFile(preregistrationPath);
  preregistrationSha256 = sha256(bytes);
  preregistration = JSON.parse(bytes.toString("utf8"));
} catch (error) {
  preregistrationErrors.push(`Cannot read preregistration: ${String(error)}`);
}

const expectedPages = expectedSchedule();
const registeredSchedule = Array.isArray(preregistration?.schedule) ? preregistration.schedule : [];
if (!Array.isArray(preregistration?.schedule)) preregistrationErrors.push("Preregistration schedule is missing or not an array");
if (registeredSchedule.length !== expectedRecordCount) {
  preregistrationErrors.push(`Preregistration schedule has ${registeredSchedule.length} entries; expected ${expectedRecordCount}`);
}
for (let sequence = 0; sequence < expectedRecordCount; sequence++) {
  const registered = registeredSchedule[sequence];
  const expected = expectedPages[sequence];
  if (!equalCoreSchedule(registered, expected)) {
    preregistrationErrors.push(`Preregistration schedule mismatch at sequence ${sequence}`);
  }
}

const decision = preregistration?.decision ?? {};
const medianRatioMax = decision.medianRatioMax;
const medianSizesRequired = decision.medianSizesRequired;
const p95RatioMax = decision.p95RatioMax;
const minDenominatorTicks = decision.minDenominatorTicks;
const preregistrationClockFloorMs = preregistration?.clock?.minPositiveDeltaMs;
if (!(Number.isFinite(medianRatioMax) && medianRatioMax > 0)) preregistrationErrors.push("Invalid decision.medianRatioMax");
if (!(Number.isInteger(medianSizesRequired) && medianSizesRequired > 0 && medianSizesRequired <= sizes.length)) {
  preregistrationErrors.push("Invalid decision.medianSizesRequired");
}
if (!(Number.isFinite(p95RatioMax) && p95RatioMax > 0)) preregistrationErrors.push("Invalid decision.p95RatioMax");
if (!(Number.isFinite(minDenominatorTicks) && minDenominatorTicks > 0)) {
  preregistrationErrors.push("Invalid decision.minDenominatorTicks");
}
if (medianRatioMax !== 0.8 || medianSizesRequired !== 2 || p95RatioMax !== 1.1 || minDenominatorTicks !== 5 || decision.noPageExclusions !== true) preregistrationErrors.push("Frozen confirmation gates must be .80 at two sizes, 1.10 at every size, five clock ticks, and no page exclusions");
if (!(Number.isFinite(preregistrationClockFloorMs) && preregistrationClockFloorMs > 0)) {
  preregistrationErrors.push("Invalid clock.minPositiveDeltaMs; denominator resolution cannot be inferred");
}
if (preregistration?.clock?.readings !== 100000 || !Number.isSafeInteger(preregistration?.clock?.positiveObservations) || preregistration.clock.positiveObservations <= 0 || !Array.isArray(preregistration?.clock?.rafIntervalsMs) || preregistration.clock.rafIntervalsMs.length !== 48 || !preregistration.clock.rafIntervalsMs.every(isFiniteNonnegative) || preregistration.clock.crossOriginIsolated !== true || preregistration.clock.coop !== "same-origin" || preregistration.clock.coep !== "require-corp" || preregistration.clock.visibility !== "visible" || preregistration.clock.focused !== true || typeof preregistration.clock.userAgent !== "string" || !preregistration.clock.userAgent || typeof preregistration.clock.platform !== "string" || !Number.isSafeInteger(preregistration.clock.hardwareConcurrency) || !isFiniteNonnegative(preregistration.clock.timeOrigin)) preregistrationErrors.push("Clock calibration must record 100000 isolated visible focused readings and 48 RAF intervals with exact headers and browser metadata");
if (decision.denominatorRule !== "max(preregistration,reactPage,nativePage) * minDenominatorTicks") preregistrationErrors.push("Denominator rule must use the maximum preregistration and paired-page clock quantum");
if (preregistration?.timingEnvironment?.origin !== "https://compiled-stable-cells-timing.localhost:1355" || preregistration?.timingEnvironment?.coop !== "same-origin" || preregistration?.timingEnvironment?.coep !== "require-corp" || preregistration?.timingEnvironment?.crossOriginIsolated !== true || preregistration?.timingEnvironment?.calibrationPath !== "/__clock-calibration" || preregistration?.timingEnvironment?.configPath !== timingConfigPath || preregistration?.timingEnvironment?.baseConfigPath !== basePreviewConfigPath) preregistrationErrors.push("Frozen timing environment must use the isolated virtual-origin calibration route and exact headers");
if (preregistration?.browser?.headless !== false || preregistration?.browser?.gpu !== false ||
    preregistration?.browser?.viewport?.width !== 1200 || preregistration?.browser?.viewport?.height !== 900 ||
    preregistration?.browser?.freshContexts !== true || preregistration?.browser?.serial !== true) {
  preregistrationErrors.push("Prerecorded browser configuration differs from the frozen headed 1200x900 GPU-disabled setup");
}
const proof = preregistration?.proof;
if (proof?.compilerEmission?.native?.compiled !== true || proof.compilerEmission.native.bindings !== 3 || proof.compilerEmission.native.deltas !== true ||
    proof.compilerEmission.native.propOnly !== true || proof.compilerEmission.native.deltaFallback !== false) {
  preregistrationErrors.push("Native production compiler/binding proof is missing or does not match the frozen workload");
}
if (proof?.compilerEmission?.react?.compiled !== true || proof.compilerEmission.react.rowMemoCache !== true || proof.compilerEmission.react.boardMemoCache !== true) {
  preregistrationErrors.push("React production compiler proof is missing or does not match the frozen workload");
}
if (proof?.preparedNumericCellExecution?.status !== "PASS" ||
    proof?.preparedNumericCellLifecycle?.status !== "PASS" ||
    proof?.stateLayoutStorage?.status !== "PASS" ||
    proof?.chromiumStorageDiagnostic?.status !== "PASS") {
  preregistrationErrors.push("Stable numeric-cell execution, lifecycle, storage, and Chromium shape proof summaries are missing or not PASS");
}
const preflight = preregistration?.timingEnvironment?.assetPreflight ?? [];
if (preflight.length !== 5 || preflight.some((item) =>
  preregistration?.productionSha256?.[item.filename] !== item.sha256 ||
  item.coop !== "same-origin" || item.coep !== "require-corp")) {
  preregistrationErrors.push("Production asset preflight must cover five locked files with exact COOP/COEP headers");
}
if (typeof preregistration?.archiveSha256 !== "string" || !/^[0-9a-f]{64}$/i.test(preregistration.archiveSha256)) {
  preregistrationErrors.push("Preregistration archiveSha256 is missing or malformed");
}
if (preregistration?.workload?.warmup !== 60 || preregistration?.workload?.frames !== 240 ||
    preregistration?.workload?.topologyEvery !== 30 || preregistration?.workload?.removed !== 8 ||
    preregistration?.workload?.inserted !== 8 || preregistration?.workload?.rotation !== 13 ||
    preregistration?.workload?.measuredFrameNumbers?.[0] !== 61 ||
    preregistration?.workload?.measuredFrameNumbers?.[1] !== 300 ||
    preregistration?.workload?.structuralFrames !== 8 || preregistration?.workload?.exactScheduleLength !== 30) {
  preregistrationErrors.push("Frozen workload must match the 60 warmup / 240 measured frame schedule and eight structural edits");
}

let collectionManifest = null;
let collectionManifestSha256 = null;
try {
  const bytes = await readFile(collectionManifestPath);
  collectionManifestSha256 = sha256(bytes);
  collectionManifest = JSON.parse(bytes.toString("utf8"));
} catch (error) {
  preregistrationErrors.push(`Cannot read collection manifest: ${String(error)}`);
}
let finalResults = null;
try {
  finalResults = JSON.parse(await readFile(finalResultsPath, "utf8"));
} catch (error) {
  preregistrationErrors.push(`Cannot read finalized collection results: ${String(error)}`);
}
let postlock = null;
try {
  postlock = JSON.parse(await readFile(postlockPath, "utf8"));
} catch (error) {
  preregistrationErrors.push(`Cannot read post-collection lock: ${String(error)}`);
}
if (collectionManifest) {
  if (collectionManifest.status !== "COLLECTION_COMPLETE") preregistrationErrors.push("Collection manifest is not COLLECTION_COMPLETE");
  if (!Array.isArray(collectionManifest.postCollectionChangedFiles) || collectionManifest.postCollectionChangedFiles.length !== 0) preregistrationErrors.push("Collection manifest reports post-collection changed files or omits that lock field");
  if (collectionManifest.preregistrationSha256 !== preregistrationSha256) preregistrationErrors.push("Collection manifest preregistration hash mismatch");
  if (collectionManifest.archiveSha256 !== preregistration?.archiveSha256) preregistrationErrors.push("Collection manifest archive hash differs from preregistration");
  if (collectionManifest.runId !== preregistration?.runId) preregistrationErrors.push("Collection manifest runId differs from preregistration");
  if (!Array.isArray(collectionManifest.failedOrIncomplete) || collectionManifest.failedOrIncomplete.length !== 0) preregistrationErrors.push("Collection manifest records failed/incomplete pages or omits the field");
  if (!Array.isArray(collectionManifest.files) || collectionManifest.files.length !== expectedRecordCount) {
    preregistrationErrors.push(`Collection manifest has ${collectionManifest.files?.length ?? "missing"} raw-file hashes; expected ${expectedRecordCount}`);
  }
}
if (finalResults?.status !== "PASS" || finalResults?.study !== preregistration?.study ||
    finalResults?.runId !== preregistration?.runId || finalResults?.records?.length !== expectedRecordCount ||
    finalResults?.postlock?.status !== "PASS" || finalResults?.postlock?.mismatches?.length !== 0) {
  preregistrationErrors.push("Final results must confirm all scheduled records and a clean post-collection lock");
}
const archiveRelativePath = preregistration?.archive;
const protocolRelativePath = preregistration?.protocol;
const archivePath = typeof archiveRelativePath === "string" ? path.resolve(projectRoot, archiveRelativePath) : null;
const registeredProtocolPath = typeof protocolRelativePath === "string" ? path.resolve(projectRoot, protocolRelativePath) : null;
if (!archivePath || !archivePath.startsWith(`${projectRoot}${path.sep}`)) preregistrationErrors.push("Prerecorded archive path is missing or outside project root");
if (!registeredProtocolPath || !registeredProtocolPath.startsWith(`${projectRoot}${path.sep}`)) preregistrationErrors.push("Prerecorded protocol path is missing or outside project root");
let archiveSha256 = null;
let protocolSha256 = null;
try {
  if (archivePath) archiveSha256 = sha256(await readFile(archivePath));
} catch (error) {
  preregistrationErrors.push(`Cannot read frozen source/build archive: ${String(error)}`);
}
try {
  if (registeredProtocolPath) protocolSha256 = sha256(await readFile(registeredProtocolPath));
} catch (error) {
  preregistrationErrors.push(`Cannot read frozen protocol: ${String(error)}`);
}
if (archiveSha256 !== preregistration?.archiveSha256) preregistrationErrors.push("Frozen archive actual SHA-256 differs from preregistration");
if (protocolSha256 !== preregistration?.protocolSha256) preregistrationErrors.push("Frozen protocol actual SHA-256 differs from preregistration");
if (registeredProtocolPath !== protocolPath) preregistrationErrors.push("Prerecorded protocol path differs from expected protocol path");

const archiveContentErrors = [];
const frozenSourceHashes = preregistration?.sourceAndBuildSha256;
const frozenProductionHashes = preregistration?.productionSha256;
const frozenInputLocks = preregistration?.inputLocks ?? {};
if (postlock) {
  if (postlock.status !== "PASS" || postlock.study !== preregistration?.study || postlock.runId !== preregistration?.runId || !Array.isArray(postlock.records) || postlock.mismatches?.length !== 0) {
    preregistrationErrors.push("Post-collection lock is missing, failed, or identifies a different run");
  }
  const postlockPaths = (postlock.records ?? []).map((item) => item.filename).sort();
  if (!sameJson(postlockPaths, Object.keys(frozenInputLocks).sort())) preregistrationErrors.push("Post-collection lock does not enumerate every preregistered input exactly once");
  for (const item of postlock.records ?? []) {
    if (item.expected !== frozenInputLocks[item.filename] || item.observed !== item.expected || item.matches !== true) preregistrationErrors.push(`Post-collection lock mismatch record: ${item.filename}`);
    try {
      if (sha256(await readFile(path.resolve(projectRoot, item.filename))) !== item.expected) preregistrationErrors.push(`Frozen input changed after collection: ${item.filename}`);
    } catch (error) {
      preregistrationErrors.push(`Cannot re-read post-collection input ${item.filename}: ${String(error)}`);
    }
  }
}
if (!frozenSourceHashes || typeof frozenSourceHashes !== "object" || Array.isArray(frozenSourceHashes)) {
  archiveContentErrors.push("Prerecorded sourceAndBuildSha256 map is missing");
}
if (!frozenProductionHashes || typeof frozenProductionHashes !== "object" || Array.isArray(frozenProductionHashes)) {
  archiveContentErrors.push("Prerecorded productionSha256 map is missing");
}
if (Object.keys(frozenProductionHashes ?? {}).length !== 5) archiveContentErrors.push("Production build lock must contain exactly five files");
if (Object.keys(frozenSourceHashes ?? {}).length !== 878) archiveContentErrors.push("Frozen candidate inventory must contain all 878 source/build entries");
if (Object.keys(preregistration?.buildProofSha256 ?? {}).length !== 111) archiveContentErrors.push("Frozen candidate verification inventory must contain all 111 verification entries");
if (Object.keys(frozenSourceHashes ?? {}).some((filename) => Object.hasOwn(preregistration?.buildProofSha256 ?? {}, filename))) {
  archiveContentErrors.push("Source/build and verification archive inventories overlap; the expected union is 989 distinct members");
}
const proofInputs = preregistration?.proof ?? {};
const pilotPageHashes = proofInputs.pilotPageHashes ?? {};
const compilerProofFiles = proofInputs.compilerEmission?.files ?? {};
const requiredInputLocks = [
  candidateArchivePath, candidateStatusPath,
  ...Object.keys(frozenSourceHashes ?? {}),
  ...Object.keys(preregistration?.buildProofSha256 ?? {}),
  proofInputs.pilotManifestPath,
  ...Object.keys(pilotPageHashes),
  ...Object.keys(compilerProofFiles),
  ...expectedChromiumInputs,
  expectedChromiumDiagnosticPath,
  expectedChromiumDiagnosticScriptPath,
  expectedChromiumDiagnosticBundlePath,
  expectedProtocolPath, timingConfigPath, basePreviewConfigPath, collectorPath, analyzerPath, verifierPath, scheduleSourcePath,
].filter((value) => typeof value === "string");
const candidate = preregistration?.candidate ?? {};
if (candidate.status !== "UNIT_AUTHORED_COMPILER_AND_CHROMIUM_SHAPE_VERIFIED" ||
    candidate.archivePath !== candidateArchivePath || candidate.archiveSha256 !== expectedArchiveSha256 ||
    candidate.runtimeTests !== 653 || candidate.rustTests !== 32 || candidate.candidateProductionPilotPages !== 0) {
  archiveContentErrors.push("Candidate preregistration summary differs from the frozen stable-cell checkpoint");
}
if (preregistration?.scheduleSource?.path !== scheduleSourcePath ||
    preregistration?.scheduleSource?.sha256 !== frozenInputLocks[scheduleSourcePath]) {
  archiveContentErrors.push("Schedule source path/hash differs from the frozen input lock");
}
if (preregistration?.timingEnvironment?.configPath !== timingConfigPath ||
    preregistration?.timingEnvironment?.configSha256 !== frozenInputLocks[timingConfigPath] ||
    preregistration?.timingEnvironment?.baseConfigPath !== basePreviewConfigPath ||
    preregistration?.timingEnvironment?.baseConfigSha256 !== frozenInputLocks[basePreviewConfigPath] ||
    preregistration?.collectorSha256 !== frozenInputLocks[collectorPath] ||
    preregistration?.analyzer?.path !== analyzerPath || preregistration?.analyzer?.sha256 !== frozenInputLocks[analyzerPath] ||
    preregistration?.verifier?.path !== verifierPath || preregistration?.verifier?.sha256 !== frozenInputLocks[verifierPath]) {
  archiveContentErrors.push("Collector, analyzer, verifier, and timing configuration metadata differ from their frozen input locks");
}
if (!sameJson(Object.keys(frozenInputLocks).sort(), [...new Set(requiredInputLocks)].sort())) {
  archiveContentErrors.push("Frozen input lock set does not exactly cover candidate, proof, pilot, protocol, config, scripts, and schedule files");
}
for (const [filename, expectedHash] of Object.entries(frozenInputLocks)) {
  try {
    if (sha256(await readFile(path.resolve(projectRoot, filename))) !== expectedHash) archiveContentErrors.push(`Frozen input lock mismatch: ${filename}`);
  } catch (error) {
    archiveContentErrors.push(`Cannot read frozen input ${filename}: ${String(error)}`);
  }
}
try {
  const candidateStatus = JSON.parse(await readFile(path.resolve(projectRoot, candidateStatusPath), "utf8"));
  if (candidateStatus.status !== "UNIT_AUTHORED_COMPILER_AND_CHROMIUM_SHAPE_VERIFIED" || candidateStatus.runtimeTests !== 653 || candidateStatus.rustTests !== 32 || candidateStatus.candidateProductionPilotPages !== 0 || candidateStatus.speedGate !== "UNMEASURED_FOR_THIS_CANDIDATE" || candidateStatus.allocationGate !== "UNMEASURED_FOR_THIS_CANDIDATE" || candidateStatus.qualifiedEngineDiagnostic !== expectedChromiumDiagnosticPath || candidateStatus.archiveSha256 !== expectedArchiveSha256) archiveContentErrors.push("Candidate checkpoint status or qualification counts differ from the reviewed stable-cell archive");
  if (preregistration?.archive !== candidateArchivePath || preregistration?.archiveSha256 !== expectedArchiveSha256 || candidateStatus.archiveSha256 !== preregistration?.archiveSha256) archiveContentErrors.push("Prerecording does not identify the exact reviewed source-and-evidence archive");
  if (!sameJson(frozenSourceHashes, candidateStatus.sourceAndBuildSha256)) archiveContentErrors.push("Prerecorded source/build file map differs from the candidate checkpoint status");
  const expectedVerificationLocks = candidateStatus.verificationSha256 ?? {};
  if (!sameJson(preregistration?.buildProofSha256, expectedVerificationLocks)) archiveContentErrors.push("Prerecorded verification inventory differs from all 111 frozen checkpoint verification artifacts");
  const proof = preregistration?.proof ?? {};
  const execution = proof.preparedNumericCellExecution ?? {};
  const lifecycle = proof.preparedNumericCellLifecycle ?? {};
  const executionArtifact = JSON.parse(await readFile(path.resolve(projectRoot, execution.path), "utf8"));
  const executionHash = sha256(await readFile(path.resolve(projectRoot, execution.path)));
  const lifecycleArtifact = JSON.parse(await readFile(path.resolve(projectRoot, lifecycle.path), "utf8"));
  const lifecycleHash = sha256(await readFile(path.resolve(projectRoot, lifecycle.path)));
  const expectedSparseDenseCalls = [
    { count: 1, tokensLength: 1, valuesLength: 1, allTokensCurrent: true },
    { count: 6, tokensLength: 6, valuesLength: 6, allTokensCurrent: true },
  ];
  const preparedExecutionValid = executionArtifact.status === "PASS" &&
    sameJson(executionArtifact.preparedNumericCellCut?.executeCalls, expectedSparseDenseCalls) &&
    executionArtifact.preparedNumericCellCut?.preparedTokenCount === 6 &&
    executionArtifact.preparedNumericCellCut?.nonemptyPendingStateCaptureCalls === 0 &&
    executionArtifact.preparedNumericCellCut?.legacySetColumnCellsCalls === 0 &&
    executionArtifact.preparedNumericCellCut?.legacyExecuteSourceProgramCalls === 0 &&
    executionArtifact.inheritedAssertions?.ordinaryAuthoredTSX === true &&
    sameJson(executionArtifact.inheritedAssertions?.compilerLayoutSlots?.map(({ slot }) => slot), [0, 1, 2]) &&
    sameJson(executionArtifact.inheritedAssertions?.sparseValues, [13, 0, 0]) &&
    sameJson(executionArtifact.inheritedAssertions?.denseValues, [21, 22, 23, 31, 32, 33]) &&
    executionArtifact.inheritedAssertions?.stableAddressesThroughMove === true &&
    executionArtifact.inheritedAssertions?.removedOwnerAndDeadSetter === true &&
    sameJson(executionArtifact.inheritedAssertions?.rowReuse, { row: 1, oldGeneration: 1, newGeneration: 2 }) &&
    executionArtifact.inheritedAssertions?.discardedCandidateColumnIsolation === true &&
    executionArtifact.inheritedAssertions?.candidateValidAfterPrivateRenderWrite === false &&
    sameJson(execution.inheritedAssertions, executionArtifact.inheritedAssertions);
  const storagePath = executionArtifact.storageProof;
  const storageArtifact = JSON.parse(await readFile(path.resolve(projectRoot, storagePath), "utf8"));
  const storageHash = sha256(await readFile(path.resolve(projectRoot, storagePath)));
  const lifecycleValid = lifecycleArtifact.status === "PASS" &&
    sameJson(lifecycleArtifact.numericLaneReentry?.capturedWrites, [
      { count: 1, tokensLength: 1, valuesLength: 1, allTokensCurrent: true },
      { count: 1, tokensLength: 1, valuesLength: 1, allTokensCurrent: true },
    ]) && lifecycleArtifact.numericLaneReentry?.outerWriteValue === "5px" &&
    lifecycleArtifact.numericLaneReentry?.reentrantPendingValue === 9 &&
    lifecycleArtifact.numericLaneReentry?.nextWriteValue === "9px" &&
    lifecycleArtifact.numericLaneReentry?.snapshotsDuringSupportedLaneCuts === 0 &&
    sameJson(lifecycleArtifact.promotion?.outputs, ["widepx", "undefinedpx", "7px", "8px"]) &&
    lifecycleArtifact.promotion?.initialStateActivations === 1 &&
    lifecycleArtifact.promotion?.stickyWorldLaneOff === true &&
    lifecycleArtifact.promotion?.scalarSourceProgramFallback === true &&
    lifecycleArtifact.lifecycle?.refBeforeEffect === true &&
    lifecycleArtifact.lifecycle?.effectObservesCommittedValues === true &&
    lifecycleArtifact.lifecycle?.deadSetterRejectedOnDispose === true &&
    lifecycleArtifact.lifecycle?.hostWriteFailureCleanup === true &&
    lifecycleArtifact.hostFailure?.terminalFlushThrows === true &&
    lifecycleArtifact.hostFailure?.priorOutputRetained === true &&
    lifecycleArtifact.hostFailure?.cleanupCompleted === true;
  if (execution.path !== expectedPreparedExecutionPath ||
      execution.sha256 !== executionHash || execution.sha256 !== candidateStatus.verificationSha256?.[execution.path] ||
      execution.status !== "PASS" || execution.preparedTokenCount !== 6 ||
      execution.nonemptyPendingStateCaptureCalls !== 0 || execution.legacySetColumnCellsCalls !== 0 ||
      execution.legacyExecuteSourceProgramCalls !== 0 || !sameJson(execution.executeCalls, expectedSparseDenseCalls) ||
      !preparedExecutionValid) {
    archiveContentErrors.push("Stable numeric-cell sparse/dense execution proof is missing, invalid, or not frozen");
  }
  if (lifecycle.path !== expectedPreparedLifecyclePath ||
      lifecycle.sha256 !== lifecycleHash || lifecycle.sha256 !== candidateStatus.verificationSha256?.[lifecycle.path] ||
      lifecycle.status !== "PASS" || !lifecycleValid ||
      !sameJson(lifecycle.numericLaneReentry, lifecycleArtifact.numericLaneReentry) ||
      !sameJson(lifecycle.promotion, lifecycleArtifact.promotion) ||
      !sameJson(lifecycle.lifecycle, lifecycleArtifact.lifecycle) ||
      !sameJson(lifecycle.hostFailure, lifecycleArtifact.hostFailure)) {
    archiveContentErrors.push("Stable numeric-cell lifecycle/reentry/fallback proof is missing, invalid, or not frozen");
  }
  const expectedStoragePath = expectedStateLayoutStoragePath;
  if (storagePath !== expectedStoragePath || storageArtifact.status !== "PASS" ||
      storageArtifact.authoredSource !== executionArtifact.authoredSource ||
      storageArtifact.emittedModule !== executionArtifact.emittedModule ||
      storageHash !== candidateStatus.verificationSha256?.[storagePath] ||
      storageArtifact.assertions?.ordinaryAuthoredTSX !== true ||
      !sameJson(storageArtifact.assertions?.sparseValues, [13, 0, 0]) ||
      !sameJson(storageArtifact.assertions?.denseValues, [21, 22, 23, 31, 32, 33]) ||
      storageArtifact.assertions?.stableAddressesThroughMove !== true ||
      storageArtifact.assertions?.removedOwnerAndDeadSetter !== true ||
      storageArtifact.assertions?.discardedCandidateColumnIsolation !== true ||
      !sameJson(storageArtifact.assertions, executionArtifact.inheritedAssertions)) {
    archiveContentErrors.push("Inherited authored TSX storage/layout proof is missing, invalid, or not frozen");
  }
  const chromiumSummary = proof.chromiumStorageDiagnostic ?? {};
  const diagnosticBytes = await readFile(path.resolve(projectRoot, expectedChromiumDiagnosticPath));
  const diagnosticHash = sha256(diagnosticBytes);
  const diagnostic = JSON.parse(diagnosticBytes.toString("utf8"));
  const diagnosticScriptBytes = await readFile(path.resolve(projectRoot, expectedChromiumDiagnosticScriptPath));
  const diagnosticBundleBytes = await readFile(path.resolve(projectRoot, expectedChromiumDiagnosticBundlePath));
  const diagnosticEntryBytes = await readFile(path.resolve(projectRoot, expectedChromiumDiagnosticEntryPath));
  const sourceBytes = await readFile(path.resolve(projectRoot, "src/owner_state_world.ts"));
  const expectedBundledInputSet = [...expectedChromiumInputs].sort();
  const snapshots = diagnostic.snapshots ?? {};
  const liveSnapshotNames = [
    "directInitial", "preparedPublished", "directAfterReentryDispatch", "preparedAfterReentryDispatch",
  ];
  const promotedSnapshotNames = ["directAfterPromotion", "preparedAfterPromotion"];
  const boxedNumericSnapshotNames = ["directAfterReturnToNumeric", "preparedAfterReturnToNumeric"];
  const stablePrototype = (snapshot) => snapshot?.fastProperties === true &&
    snapshot.ownValueDescriptor === null &&
    typeof snapshot.logicalValueUndefined === "boolean" &&
    typeof snapshot.boxedValueUndefined === "boolean" &&
    typeof snapshot.lanePresent === "boolean" &&
    typeof snapshot.laneIsNullish === "boolean" &&
    snapshot.boxedValuePresent === true &&
    sameJson(snapshot.prototypeValueDescriptor, {
      configurable: true,
      enumerable: true,
      writable: null,
      valueType: null,
      getterName: "getLaneBackedValue",
      setterName: "setLaneBackedValue",
    });
  const liveLaneSnapshot = (name, generation = 1) => {
    const snapshot = snapshots[name];
    return stablePrototype(snapshot) && snapshot.boxedValuePresent === true &&
      snapshot.boxedValueUndefined === true && snapshot.lanePresent === true &&
      snapshot.laneIsNullish === false && snapshot.lane?.row === 0 &&
      snapshot.lane?.generation === generation && snapshot.lane?.site === "value" &&
      typeof snapshot.logicalValue === "number";
  };
  const promotedSnapshot = (name, value) => {
    const snapshot = snapshots[name];
    return stablePrototype(snapshot) && snapshot.logicalValue === value &&
      snapshot.logicalValueUndefined === false && snapshot.boxedValueUndefined === false &&
      snapshot.boxedValuePresent === true && snapshot.boxedValue === value &&
      snapshot.lanePresent === false && snapshot.laneIsNullish === true && snapshot.lane === null;
  };
  const boxedNumericSnapshot = (name, value) => {
    const snapshot = snapshots[name];
    return stablePrototype(snapshot) && snapshot.logicalValue === value &&
      snapshot.logicalValueUndefined === false && snapshot.boxedValueUndefined === false &&
      snapshot.boxedValuePresent === true && snapshot.boxedValue === value &&
      snapshot.lanePresent === false && snapshot.laneIsNullish === true && snapshot.lane === null;
  };
  const diagnosticSemantics = diagnostic.semantics ?? {};
  const actualChromiumInputHashes = {};
  for (const filename of expectedChromiumInputs) {
    actualChromiumInputHashes[filename] = sha256(
      filename === expectedChromiumDiagnosticEntryPath
        ? diagnosticEntryBytes
        : filename === "src/owner_state_world.ts"
        ? sourceBytes
        : await readFile(path.resolve(projectRoot, filename)),
    );
  }
  const diagnosticValid = diagnostic.schemaVersion === 1 && diagnostic.status === "PASS" &&
    diagnostic.attempt === "v3" && diagnostic.sourcePath === "src/owner_state_world.ts" &&
    diagnostic.bundlePath === expectedChromiumDiagnosticBundlePath &&
    diagnostic.bundleCommand === "deno bundle --config=deno.browser.json --platform=browser --format=iife" &&
    diagnostic.bundleResult?.code === 0 && diagnostic.bundleResult?.signal === null &&
    diagnostic.sourceSha256BeforeBundle === sha256(sourceBytes) &&
    diagnostic.sourceSha256AfterBundle === sha256(sourceBytes) &&
    diagnostic.sourceSha256BeforeBundle === candidateStatus.sourceAndBuildSha256?.["src/owner_state_world.ts"] &&
    diagnostic.sourceSha256AfterBundle === diagnostic.sourceSha256BeforeBundle &&
    diagnostic.bundleSha256 === sha256(diagnosticBundleBytes) &&
    diagnostic.environment?.scriptPath === "scripts/inspect_numeric_cell_storage_candidate.mjs" &&
    diagnostic.environment?.scriptSha256 === sha256(diagnosticScriptBytes) &&
    diagnostic.browserOptions?.headless === true && diagnostic.browserOptions?.gpu === false &&
    sameJson(diagnostic.browserOptions?.browserArgs, ["--js-flags=--allow-natives-syntax"]) &&
    sameJson(Object.keys(diagnostic.bundledInputHashes ?? {}).sort(), expectedBundledInputSet) &&
    sameJson(diagnostic.bundledInputHashes, actualChromiumInputHashes) &&
    diagnostic.browserVersion?.product === "Chrome/153.0.8010.12" &&
    diagnostic.browserVersion?.jsVersion === "15.3.76.4" &&
    liveSnapshotNames.every(liveLaneSnapshot) &&
    promotedSnapshot("directAfterPromotion", "wide") &&
    promotedSnapshot("preparedAfterPromotion", "prepared-wide") &&
    boxedNumericSnapshot("directAfterReturnToNumeric", 7) &&
    boxedNumericSnapshot("preparedAfterReturnToNumeric", 14) &&
    stablePrototype(snapshots.directAfterDestroy) &&
    snapshots.directAfterDestroy.logicalValueUndefined === true &&
    snapshots.directAfterDestroy.boxedValuePresent === true &&
    snapshots.directAfterDestroy.boxedValueUndefined === true &&
    snapshots.directAfterDestroy.lanePresent === false &&
    snapshots.directAfterDestroy.laneIsNullish === true &&
    liveLaneSnapshot("directAfterOwnerReuse", 2) &&
    snapshots.directAfterOwnerReuse.lane?.generation === 2 &&
    diagnosticSemantics.initial?.directValueAfterActivation === 1 &&
    diagnosticSemantics.initial?.directLaneActiveAfterActivation === true &&
    diagnosticSemantics.initial?.preparedValueBeforePublish === 12 &&
    diagnosticSemantics.initial?.preparedValueAfterPublish === 12 &&
    diagnosticSemantics.initial?.preparedLaneActiveAfterPublish === true &&
    diagnosticSemantics.afterReentryDispatch?.directValue === 3 &&
    diagnosticSemantics.afterReentryDispatch?.preparedValue === 15 &&
    diagnosticSemantics.afterReentryDispatch?.directLaneActive === true &&
    diagnosticSemantics.afterReentryDispatch?.preparedLaneActive === true &&
    diagnosticSemantics.afterReentryDispatch?.directReentered === true &&
    diagnosticSemantics.afterReentryDispatch?.preparedReentered === true &&
    diagnosticSemantics.afterPromotion?.directValue === "wide" &&
    diagnosticSemantics.afterPromotion?.preparedValue === "prepared-wide" &&
    diagnosticSemantics.afterPromotion?.directLaneActive === false &&
    diagnosticSemantics.afterPromotion?.preparedLaneActive === false &&
    diagnosticSemantics.afterReturnToNumeric?.directValue === 7 &&
    diagnosticSemantics.afterReturnToNumeric?.preparedValue === 14 &&
    diagnosticSemantics.afterReturnToNumeric?.directLaneActive === false &&
    diagnosticSemantics.afterReturnToNumeric?.preparedLaneActive === false &&
    diagnosticSemantics.preparationCancellation?.acceptedBeforeDiscard === true &&
    diagnosticSemantics.preparationCancellation?.acceptedAfterDiscard === false &&
    diagnosticSemantics.preparationCancellation?.ownerVisibleAfterDiscard === false &&
    diagnosticSemantics.preparationCancellation?.retainedPreparedValue === 14 &&
    diagnosticSemantics.destroyAndReuse?.destroyed === true &&
    diagnosticSemantics.destroyAndReuse?.deadSetterError === "Error: Owner 1 is not alive" &&
    diagnosticSemantics.destroyAndReuse?.reusedOwner === 2 &&
    diagnosticSemantics.destroyAndReuse?.reusedValue === 9 &&
    diagnosticSemantics.destroyAndReuse?.laneActive === true;
  if (chromiumSummary.path !== expectedChromiumDiagnosticPath ||
      chromiumSummary.sha256 !== diagnosticHash ||
      chromiumSummary.sha256 !== candidateStatus.verificationSha256?.[expectedChromiumDiagnosticPath] ||
      chromiumSummary.status !== "PASS" || chromiumSummary.attempt !== "v3" ||
      chromiumSummary.sourcePath !== diagnostic.sourcePath ||
      chromiumSummary.sourceSha256 !== diagnostic.sourceSha256BeforeBundle ||
      chromiumSummary.bundlePath !== expectedChromiumDiagnosticBundlePath ||
      chromiumSummary.bundleSha256 !== diagnostic.bundleSha256 ||
      !sameJson(chromiumSummary.bundledInputHashes, actualChromiumInputHashes) ||
      !sameJson(chromiumSummary.browserVersion, diagnostic.browserVersion) ||
      !sameJson(chromiumSummary.snapshots, diagnostic.snapshots) ||
      !sameJson(chromiumSummary.semantics, diagnostic.semantics) ||
      !diagnosticValid ||
      !sameJson(Object.keys(diagnostic.bundledInputHashes ?? {}).sort(), expectedBundledInputSet)) {
    archiveContentErrors.push("Qualified Chromium v3 stable-cell representation diagnostic, source snapshot, bundle, or bundled inputs are missing, invalid, or not frozen");
  }
  const preparedExecutionSummary = proof.preparedNumericCellExecution ?? {};
  const preparedLifecycleSummary = proof.preparedNumericCellLifecycle ?? {};
  const storageSummary = proof.stateLayoutStorage ?? {};
  if (preparedExecutionSummary.path !== expectedPreparedExecutionPath ||
      preparedExecutionSummary.sha256 !== executionHash || preparedExecutionSummary.status !== "PASS" ||
      preparedExecutionSummary.preparedTokenCount !== 6 ||
      !sameJson(preparedExecutionSummary.executeCalls, expectedSparseDenseCalls) ||
      preparedExecutionSummary.nonemptyPendingStateCaptureCalls !== 0 ||
      preparedExecutionSummary.legacySetColumnCellsCalls !== 0 ||
      preparedExecutionSummary.legacyExecuteSourceProgramCalls !== 0 ||
      preparedLifecycleSummary.path !== expectedPreparedLifecyclePath ||
      preparedLifecycleSummary.sha256 !== lifecycleHash || preparedLifecycleSummary.status !== "PASS" ||
      storageSummary.path !== expectedStateLayoutStoragePath ||
      storageSummary.sha256 !== storageHash || storageSummary.status !== "PASS" ||
      !sameJson(storageSummary.assertions, storageArtifact.assertions) ||
      !sameJson(preparedExecutionSummary.executeCalls, executionArtifact.preparedNumericCellCut?.executeCalls) ||
      !sameJson(preparedExecutionSummary.inheritedAssertions, executionArtifact.inheritedAssertions) ||
      !sameJson(preparedLifecycleSummary.numericLaneReentry, lifecycleArtifact.numericLaneReentry) ||
      !sameJson(preparedLifecycleSummary.promotion, lifecycleArtifact.promotion) ||
      !sameJson(preparedLifecycleSummary.lifecycle, lifecycleArtifact.lifecycle) ||
      !sameJson(preparedLifecycleSummary.hostFailure, lifecycleArtifact.hostFailure)) {
    archiveContentErrors.push("Stable-cell authored execution, lifecycle, or storage proof summaries do not identify the qualified artifacts");
  }
  const compilerPaths = [
    ".cache/product-mixed-v2/compiler-proof/native.js",
    ".cache/product-mixed-v2/compiler-proof/react.js",
    ".cache/product-mixed-v2/compiler-proof/native.json",
    ".cache/product-mixed-v2/compiler-proof/react.json",
  ];
  const compilerArtifacts = {};
  for (const filename of compilerPaths) {
    const bytes = await readFile(path.resolve(projectRoot, filename));
    if (sha256(bytes) !== compilerProofFiles[filename] || frozenInputLocks[filename] !== compilerProofFiles[filename]) {
      archiveContentErrors.push(`Compiler artifact lock mismatch: ${filename}`);
    }
    if (filename.endsWith(".json")) compilerArtifacts[filename] = JSON.parse(bytes.toString("utf8"));
  }
  const nativeJs = await readFile(path.resolve(projectRoot, compilerPaths[0]), "utf8");
  const componentBoundary = nativeJs.search(/\n\s*"component_module":/);
  const nativeExecutable = componentBoundary > 0 ? nativeJs.slice(0, componentBoundary) : "";
  const nativeDescriptors = (nativeExecutable.match(/sinkId:\s*"src\/browser\/native_product_mixed_arm\.tsx#numeric-sink:/g) ?? []).length;
  const nativeBindings = (nativeExecutable.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length;
  const native = compilerArtifacts[compilerPaths[2]];
  const react = compilerArtifacts[compilerPaths[3]];
  const expectedCompilerNative = { arm: "native", compiled: true, bindings: 3, deltas: true, propOnly: true, deltaFallback: false };
  const expectedCompilerReact = { arm: "react", compiled: true, rowMemoCache: true, boardMemoCache: true };
  if (!sameJson(native, expectedCompilerNative) || !sameJson(react, expectedCompilerReact) ||
      !sameJson(proof.compilerEmission?.native, native) || !sameJson(proof.compilerEmission?.react, react) ||
      proof.compilerEmission?.numericProgramDescriptors !== 3 || proof.compilerEmission?.numericProgramBindings !== 3 ||
      nativeDescriptors !== 3 || nativeBindings !== 3 || !sameJson(Object.keys(compilerProofFiles).sort(), compilerPaths.slice().sort())) {
    archiveContentErrors.push("Native/React compiler evidence does not match the three unary numeric bindings and memoized React baseline");
  }
  const pilotManifestPath = proof.pilotManifestPath;
  const pilotManifest = JSON.parse(await readFile(path.resolve(projectRoot, pilotManifestPath), "utf8"));
  const expectedPilotRows = [128, 512, 1024].flatMap((size) => [
    { arm: "native", size, status: "PASS" },
    { arm: "react", size, status: "PASS" },
  ]);
  if (pilotManifest.status !== "PASS" || !/Correctness pilot only/.test(pilotManifest.scope ?? "") ||
      !sameJson(pilotManifest.records, expectedPilotRows) ||
      !sameJson(pilotManifest.nativeProof, expectedCompilerNative) ||
      !sameJson(pilotManifest.reactProof, expectedCompilerReact) ||
      proof.pilotManifestPath !== `${pilotDirectory}/results.json` ||
      proof.pilotManifestSha256 !== frozenInputLocks[pilotManifestPath]) {
    archiveContentErrors.push("Separate six-page production pilot is missing, invalid, or differs from compiler proof");
  }
  if (Object.keys(pilotPageHashes).length !== 6) archiveContentErrors.push("Pilot page hash inventory must contain exactly six pages");
  for (const [filename, expectedHash] of Object.entries(pilotPageHashes)) {
    try {
      const pilotPage = JSON.parse(await readFile(path.resolve(projectRoot, filename), "utf8"));
      if (sha256(await readFile(path.resolve(projectRoot, filename))) !== expectedHash || frozenInputLocks[filename] !== expectedHash ||
          pilotPage.study !== "compiled-product-mixed-v2" || pilotPage.mode !== "pilot" || pilotPage.production !== true ||
          pilotPage.status !== "PASS" || pilotPage.warmup !== 5 || pilotPage.frames !== 60 ||
          pilotPage.samples?.length !== 60 || Object.keys(pilotPage.checks ?? {}).length !== 5 ||
          !Object.values(pilotPage.checks ?? {}).every(Boolean) || !sameJson(pilotPage.errors, []) ||
          !sameJson(pilotPage.browserErrors, []) || pilotPage.active?.writers !== pilotPage.size || pilotPage.after?.writers !== 0) {
        archiveContentErrors.push(`Pilot page content/hash invalid: ${filename}`);
      }
    } catch (error) {
      archiveContentErrors.push(`Cannot validate pilot page ${filename}: ${String(error)}`);
    }
  }
  if (preregistration?.archive !== candidateArchivePath || preregistration?.archiveSha256 !== expectedArchiveSha256 || candidateStatus.archiveSha256 !== preregistration?.archiveSha256) archiveContentErrors.push("Prerecording does not identify the exact reviewed source-and-evidence archive");
} catch (error) {
  archiveContentErrors.push(`Cannot validate frozen candidate and stable numeric-cell proof inputs: ${String(error)}`);
}

if (frozenProductionHashes && frozenSourceHashes && typeof frozenProductionHashes === "object" && typeof frozenSourceHashes === "object") {
  for (const [productionPath, productionHash] of Object.entries(frozenProductionHashes)) {
    if (frozenSourceHashes[productionPath] !== productionHash) {
      archiveContentErrors.push(`Production hash is missing from or differs in frozen source/build map: ${productionPath}`);
    }
  }
}
if (archivePath && frozenSourceHashes && typeof frozenSourceHashes === "object" && !Array.isArray(frozenSourceHashes)) {
  try {
    const archiveMemberHashesJson = execFileSync("python3", ["-c", `import hashlib, json, sys, tarfile
members = {}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream = archive.extractfile(member)
        if stream is None:
            raise RuntimeError("Cannot read archive member: " + member.name)
        digest = hashlib.sha256()
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
        stream.close()
        members[member.name] = digest.hexdigest()
print(json.dumps(members, sort_keys=True))`, archivePath], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
    const archiveMemberHashes = JSON.parse(archiveMemberHashesJson);
    const expectedArchiveMembers = {
      ...frozenSourceHashes,
      ...(preregistration?.buildProofSha256 ?? {}),
    };
    const mappedMembers = Object.keys(expectedArchiveMembers).sort();
    const actualMembers = Object.keys(archiveMemberHashes).sort();
    if (actualMembers.length !== mappedMembers.length || actualMembers.some((member, index) => member !== mappedMembers[index])) {
      archiveContentErrors.push("Frozen source/build and verification maps do not enumerate exactly the archive members");
    }
    for (const [memberPath, expectedHash] of Object.entries(expectedArchiveMembers)) {
      if (archiveMemberHashes[memberPath] === undefined) {
        archiveContentErrors.push(`Cannot read frozen archive member ${memberPath}: member is missing`);
      } else if (archiveMemberHashes[memberPath] !== expectedHash) {
        archiveContentErrors.push(`Frozen archive member hash mismatch: ${memberPath}`);
      }
    }
  } catch (error) {
    archiveContentErrors.push(`Cannot enumerate/hash frozen archive members: ${String(error)}`);
  }
}

const expectedIdentityBySequence = new Map(expectedPages.map((entry) => [entry.sequence, entry]));
const manifestEntriesBySequence = new Map();
for (const entry of Array.isArray(collectionManifest?.files) ? collectionManifest.files : []) {
  if (!Number.isInteger(entry?.sequence)) {
    preregistrationErrors.push("Collection manifest contains an entry without an integer sequence");
    continue;
  }
  if (manifestEntriesBySequence.has(entry.sequence)) preregistrationErrors.push(`Collection manifest repeats sequence ${entry.sequence}`);
  manifestEntriesBySequence.set(entry.sequence, entry);
}
for (let sequence = 0; sequence < expectedRecordCount; sequence++) {
  if (!manifestEntriesBySequence.has(sequence)) preregistrationErrors.push(`Collection manifest is missing sequence ${sequence}`);
  else if (!expectedIdentityBySequence.has(sequence)) preregistrationErrors.push(`Collection manifest contains unexpected sequence ${sequence}`);
}
const pages = [];
for (let sequence = 0; sequence < expectedRecordCount; sequence++) {
  const filename = `sequence-${String(sequence).padStart(2, "0")}.json`;
  const recordPath = path.join(rawDirectory, filename);
  const validationErrors = [];
  let rawText = null;
  let wrapper = null;
  let result = null;
  let rawSha256 = null;
  try {
    rawText = await readFile(recordPath, "utf8");
    rawSha256 = sha256(rawText);
    wrapper = JSON.parse(rawText);
    result = wrapper?.result ?? null;
  } catch (error) {
    validationErrors.push(`Cannot read/parse ${filename}: ${String(error)}`);
  }

  const scheduled = expectedIdentityBySequence.get(sequence);
  if (!wrapper) {
    pages.push({ sequence, filename, sha256: rawSha256, schedule: scheduled, valid: false, validationErrors, result: null, metrics: null });
    continue;
  }
  const manifestEntry = manifestEntriesBySequence.get(sequence);
  if (!manifestEntry) validationErrors.push("Raw record is absent from collection manifest");
  else {
    if (manifestEntry.file !== `results/product-mixed-stable-cells-confirmation/${filename}`) validationErrors.push("Collection manifest raw-file path differs from expected filename");
    if (manifestEntry.sha256 !== rawSha256) validationErrors.push("Raw record SHA-256 differs from collection manifest");
  }
  if (wrapper.schemaVersion !== 1 || wrapper.study !== "compiled-product-mixed-stable-cells-confirmation") validationErrors.push("Raw wrapper study or schema version is invalid");
  if (!Number.isFinite(Date.parse(wrapper.startedAt)) || !Number.isFinite(Date.parse(wrapper.finishedAt)) || Date.parse(wrapper.finishedAt) < Date.parse(wrapper.startedAt)) validationErrors.push("Raw wrapper timestamps are missing or out of order");
  if (wrapper.preregistrationSha256 !== preregistrationSha256) validationErrors.push("Raw wrapper preregistration hash differs from frozen preregistration");
  if (wrapper.archiveSha256 !== preregistration?.archiveSha256) validationErrors.push("Raw wrapper archive hash differs from frozen archive");
  if (wrapper.protocolSha256 !== preregistration?.protocolSha256) validationErrors.push("Raw wrapper protocol hash differs from frozen protocol");
  if (wrapper.error !== undefined && wrapper.error !== null && wrapper.error !== "") {
    validationErrors.push(`Collector error: ${String(wrapper.error)}`);
  }
  if (wrapper.status !== "PASS") validationErrors.push(`Page wrapper status is ${String(wrapper.status)}`);
  if (wrapper.failure !== undefined && wrapper.failure !== null) validationErrors.push(`Page wrapper retained failure: ${String(wrapper.failure)}`);
  if (wrapper.endVisibility?.state !== "visible" || wrapper.endVisibility?.focused !== true) validationErrors.push("Collection did not end with a visible, focused page");
  if (wrapper.navigationHeaders?.coop !== "same-origin" || wrapper.navigationHeaders?.coep !== "require-corp") validationErrors.push("Page navigation did not receive frozen COOP/COEP headers");
  if (wrapper.crossOriginIsolated !== true) validationErrors.push("Page wrapper did not report crossOriginIsolated true");
  const postDisposeClock = wrapper.postDisposeClock;
  if (!postDisposeClock || !isFiniteNonnegative(postDisposeClock.minPositiveDeltaMs) || postDisposeClock.minPositiveDeltaMs <= 0 || !Number.isSafeInteger(postDisposeClock.positiveObservations) || postDisposeClock.positiveObservations <= 0 || postDisposeClock.readings !== 100000 || !Array.isArray(postDisposeClock.rafIntervalsMs) || postDisposeClock.rafIntervalsMs.length !== 48 || !postDisposeClock.rafIntervalsMs.every(isFiniteNonnegative) || postDisposeClock.crossOriginIsolated !== true || postDisposeClock.visibility !== "visible" || postDisposeClock.focused !== true || postDisposeClock.coop !== "same-origin" || postDisposeClock.coep !== "require-corp" || typeof postDisposeClock.userAgent !== "string" || !postDisposeClock.userAgent || !isFiniteNonnegative(postDisposeClock.timeOrigin)) validationErrors.push("Post-disposal virtual-origin clock or isolation record is invalid");
  if (!result || typeof result !== "object") {
    validationErrors.push("Raw page result is missing (loading error or incomplete page)");
  }
  if (!equalCoreSchedule(wrapper.schedule, scheduled)) validationErrors.push("Raw wrapper schedule identity differs from preregistration");
  if (result && !equalCoreSchedule(result, scheduled)) validationErrors.push("Raw result identity differs from preregistration");

  if (result) {
    if (result.schemaVersion !== 2) validationErrors.push("Unexpected result schemaVersion");
    if (result.mode !== "confirm") validationErrors.push("Page was not collected in confirm mode");
    if (result.production !== true) validationErrors.push("Page was not a production build");
    if (result.status !== "PASS") validationErrors.push(`Page status is ${String(result.status)}`);
    if (result.warmup !== warmupFrames) validationErrors.push(`Expected ${warmupFrames} warmup frames`);
    if (result.frames !== measuredFrames) validationErrors.push(`Expected ${measuredFrames} measured frames`);
    if (!Array.isArray(result.errors) || result.errors.length !== 0) {
      validationErrors.push(`Page errors are present or missing: ${JSON.stringify(result.errors)}`);
    }
    const requiredChecks = ["output", "identity", "lifecycle", "visible", "order"];
    if (!result.checks || typeof result.checks !== "object") validationErrors.push("Correctness checks are missing");
    else {
      if (!sameJson(Object.keys(result.checks).sort(), requiredChecks.slice().sort())) validationErrors.push("Correctness check inventory differs from the five frozen checks");
      for (const check of requiredChecks) {
        if (result.checks[check] !== true) validationErrors.push(`Correctness check ${check} did not pass`);
      }
      for (const [name, value] of Object.entries(result.checks)) {
        if (value !== true) validationErrors.push(`Correctness check ${name} is not true`);
      }
    }
    if (!Array.isArray(wrapper.browserErrors) || wrapper.browserErrors.length !== 0) {
      validationErrors.push(`Browser errors are present or missing: ${JSON.stringify(wrapper.browserErrors)}`);
    }
    if (Array.isArray(wrapper.browserErrors) && wrapper.browserErrors.length) {
      validationErrors.push(`Browser errors: ${wrapper.browserErrors.map(String).join("; ")}`);
    }
    if (result.browser?.visibilityState !== undefined && result.browser.visibilityState !== "visible") {
      validationErrors.push("Browser visibilityState is not visible");
    }
    if (!Array.isArray(result.samples) || result.samples.length !== measuredFrames) {
      validationErrors.push(`Expected ${measuredFrames} samples; got ${result.samples?.length ?? "missing"}`);
    } else {
      const structuralFrames = [];
      for (let index = 0; index < measuredFrames; index++) {
        const sample = result.samples[index];
        const expectedFrame = warmupFrames + index + 1;
        const shouldBeStructural = expectedFrame > warmupFrames &&
          (expectedFrame - warmupFrames) % structuralEvery === 0;
        if (!sample || sample.frame !== expectedFrame) validationErrors.push(`Sample ${index} frame is not ${expectedFrame}`);
        if (sample?.structural !== shouldBeStructural) validationErrors.push(`Sample ${expectedFrame} structural flag is incorrect`);
        if (sample?.structural) structuralFrames.push(sample.frame);
        if (!isFiniteNonnegative(sample?.commitMs)) validationErrors.push(`Sample ${expectedFrame} commitMs is invalid`);
        if (!isFiniteNonnegative(sample?.intervalMs)) validationErrors.push(`Sample ${expectedFrame} intervalMs is invalid`);
      }
      const expectedStructuralFrames = Array.from(
        { length: structuralEveryFrameCount },
        (_, index) => warmupFrames + structuralEvery * (index + 1),
      );
      if (JSON.stringify(structuralFrames) !== JSON.stringify(expectedStructuralFrames)) {
        validationErrors.push(`Structural frames mismatch: ${JSON.stringify(structuralFrames)}`);
      }
    }
    if (!isFiniteNonnegative(result.mountMs)) validationErrors.push("mountMs is invalid");
    if (!isFiniteNonnegative(result.disposeMs)) validationErrors.push("disposeMs is invalid");

    const expectedMounts = scheduled.size + structuralEveryFrameCount * rowsChangedPerStructuralFrame;
    const expectedCleanups = structuralEveryFrameCount * rowsChangedPerStructuralFrame;
    if (result.active?.writers !== scheduled.size) validationErrors.push("Active writer count does not equal row count");
    if (result.active?.mounts !== expectedMounts) validationErrors.push(`Active mount count is not ${expectedMounts}`);
    if (result.active?.cleanups !== expectedCleanups) validationErrors.push(`Active cleanup count is not ${expectedCleanups}`);
    if (result.after?.writers !== 0) validationErrors.push("Writers remain after disposal");
    if (result.after?.mounts !== result.after?.cleanups) validationErrors.push("Mount/cleanup counts do not balance after disposal");
    if (result.after?.mounts !== expectedMounts || result.after?.cleanups !== expectedMounts) {
      validationErrors.push(`Disposed lifecycle totals do not equal ${expectedMounts}`);
    }
    if (scheduled.arm === "native") {
      const nativeAfter = result.after?.extra;
      if (nativeAfter?.root?.ownerCount !== 0) validationErrors.push("Native owner count remains after disposal");
      if (nativeAfter?.root?.disposed !== true) validationErrors.push("Native root did not report disposed");
      if (nativeAfter?.collection?.readerCount !== 0) validationErrors.push("Native collection reader remains after disposal");
      if (nativeAfter?.collection?.retainedBatches !== 0) validationErrors.push("Native collection batches remain after disposal");
    }
    const loadedResources = wrapper.loadedBuildResources ?? [];
    const loadedNames = new Set();
    for (const resource of loadedResources) {
      const expectedHash = frozenProductionHashes?.[resource.filename];
      if (!expectedHash || resource.status !== 200 || resource.sha256 !== expectedHash ||
          resource.coop !== "same-origin" || resource.coep !== "require-corp" ||
          !resource.url?.startsWith(`${preregistration?.timingEnvironment?.origin}/`)) {
        validationErrors.push(`Loaded production resource is not matched to a locked asset: ${resource.filename}`);
      }
      loadedNames.add(path.basename(resource.filename ?? ""));
    }
    const productionNames = Object.keys(frozenProductionHashes ?? {}).map((filename) => path.basename(filename));
    const htmlName = productionNames.find((name) => name === "product-mixed-v2.html");
    const cssName = productionNames.find((name) => name.endsWith(".css"));
    const commonJsName = productionNames.find((name) => name.startsWith("product-mixed-v2-") && name.endsWith(".js"));
    const selectedArmPattern = scheduled.arm === "native" ? /^native_product_mixed_arm-/ : /^product_mixed_react_arm-/;
    const oppositeArmPattern = scheduled.arm === "native" ? /^product_mixed_react_arm-/ : /^native_product_mixed_arm-/;
    if (!htmlName || !cssName || !commonJsName || !loadedNames.has(htmlName) || !loadedNames.has(cssName) ||
        !loadedNames.has(commonJsName) || ![...loadedNames].some((name) => selectedArmPattern.test(name)) ||
        [...loadedNames].some((name) => oppositeArmPattern.test(name))) {
      validationErrors.push("Loaded page assets omit common/selected-arm resources or include the opposite arm");
    }
  }

  const samples = Array.isArray(result?.samples) ? result.samples : [];
  const completeSamples = samples.length === measuredFrames && samples.every((sample) =>
    isFiniteNonnegative(sample?.commitMs) && isFiniteNonnegative(sample?.intervalMs)
  );
  const commitValues = completeSamples ? samples.map((sample) => sample.commitMs) : [];
  const ordinaryValues = completeSamples ? samples.filter((sample) => !sample.structural).map((sample) => sample.commitMs) : [];
  const structuralValues = completeSamples ? samples.filter((sample) => sample.structural).map((sample) => sample.commitMs) : [];
  const intervalValues = completeSamples ? samples.map((sample) => sample.intervalMs) : [];
    const metrics = result && completeSamples && isFiniteNonnegative(result.mountMs) && isFiniteNonnegative(result.disposeMs)
    ? {
      commits: {
        all: { medianMs: quantile(commitValues, "median"), p95Ms: quantile(commitValues, "p95"), count: commitValues.length },
        ordinary: { medianMs: quantile(ordinaryValues, "median"), p95Ms: quantile(ordinaryValues, "p95"), count: ordinaryValues.length },
        structural: { medianMs: quantile(structuralValues, "median"), p95Ms: quantile(structuralValues, "p95"), count: structuralValues.length },
      },
      interval: { medianMs: quantile(intervalValues, "median"), p95Ms: quantile(intervalValues, "p95"), count: intervalValues.length },
      mountMs: result.mountMs,
      measuredStepsCpuMs: commitValues.reduce((sum, value) => sum + value, 0),
      measuredStepsFrames: commitValues.length,
      warmupStepsCpuMs: null,
      disposeMs: result.disposeMs,
      measuredLifecycleCpuMs: result.mountMs + commitValues.reduce((sum, value) => sum + value, 0) + result.disposeMs,
      lifecycleCpuFormula: "mountMs + sum(recorded 240 measured commitMs) + disposeMs; warmup-step CPU is not serialized; RAF intervals are separate",
    }
    : null;
  if (metrics) {
    for (const field of ["all", "ordinary", "structural", "interval"]) {
      const actual = result.summary?.[field];
      const expected = field === "interval" ? metrics.interval : metrics.commits[field];
      if (!closeEnough(actual?.medianMs, expected.medianMs) || !closeEnough(actual?.p95Ms, expected.p95Ms)) validationErrors.push(`Harness summary ${field} median/p95 differs from raw samples`);
    }
  }
  pages.push({
    sequence,
    filename,
    sha256: rawSha256,
    schedule: wrapper.schedule ?? scheduled,
    resultIdentity: result ? { arm: result.arm, size: result.size, pair: result.pair, sequence: result.sequence } : null,
    resultStatus: result?.status ?? null,
    valid: validationErrors.length === 0,
    validationErrors,
    collectorError: wrapper.error ?? null,
    browserErrors: wrapper.browserErrors ?? null,
    transport: wrapper.transport ?? null,
    clockMinPositiveDeltaMs: postDisposeClock?.minPositiveDeltaMs ?? null,
    metrics,
  });
}

const directoryErrors = [];
try {
  const names = await readdir(rawDirectory);
  const allowedJson = new Set(["preregistration.json", "manifest.json", "postlock.json", "FINALresults.json", "summary.json", "verification.json"]);
  const unexpectedJson = names.filter((name) => name.endsWith(".json") && !/^sequence-\d{2}\.json$/.test(name) && !allowedJson.has(name));
  const sequenceFiles = names.filter((name) => /^sequence-\d{2}\.json$/.test(name));
  if (sequenceFiles.length !== expectedRecordCount) {
    directoryErrors.push(`Raw directory contains ${sequenceFiles.length} sequence records; expected ${expectedRecordCount}`);
  }
  if (unexpectedJson.length) directoryErrors.push(`Unexpected JSON records in raw directory: ${unexpectedJson.join(", ")}`);
} catch (error) {
  directoryErrors.push(`Cannot list raw directory: ${String(error)}`);
}

const recordsByIdentity = new Map();
for (const page of pages) {
  if (!page.schedule) continue;
  const key = `${page.schedule.size}/${page.schedule.pair}/${page.schedule.arm}`;
  recordsByIdentity.set(key, page);
}

const ratio = (numerator, denominator, resolution) => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return { status: "UNRESOLVED", descriptiveRatio: null, decisionRatio: null, reason: "zero or invalid React denominator" };
  }
  if (!Number.isFinite(resolution) || denominator < resolution) {
    return {
      status: "UNRESOLVED",
      descriptiveRatio: null,
      decisionRatio: null,
      reason: `React denominator ${denominator}ms is below pair-specific ${minDenominatorTicks}-tick floor ${resolution}ms`,
    };
  }
  const descriptiveRatio = numerator / denominator;
  return { status: "RESOLVED", descriptiveRatio, decisionRatio: descriptiveRatio, reason: null };
};

const sizeMetrics = sizes.map((size) => {
  const sizePages = pages.filter((page) => page.schedule?.size === size);
  const arms = {};
  for (const arm of ["native", "react"]) {
    const armPages = sizePages.filter((page) => page.schedule?.arm === arm && page.valid && page.metrics);
    const fields = ["all", "ordinary", "structural"];
    arms[arm] = {
      validPages: armPages.length,
      expectedPages: pairsPerSize,
      pageMedianOfPageMediansMs: Object.fromEntries(fields.map((field) => [
        field,
        quantile(armPages.map((page) => page.metrics.commits[field].medianMs), "median"),
      ])),
      pageMedianOfPageP95sMs: Object.fromEntries(fields.map((field) => [
        field,
        quantile(armPages.map((page) => page.metrics.commits[field].p95Ms), "median"),
      ])),
      pageMedianIntervalMs: quantile(armPages.map((page) => page.metrics.interval.medianMs), "median"),
      pageMedianIntervalP95Ms: quantile(armPages.map((page) => page.metrics.interval.p95Ms), "median"),
      pageMedianMountMs: quantile(armPages.map((page) => page.metrics.mountMs), "median"),
      pageMedianDisposeMs: quantile(armPages.map((page) => page.metrics.disposeMs), "median"),
      pageMedianMeasuredStepsCpuMs: quantile(armPages.map((page) => page.metrics.measuredStepsCpuMs), "median"),
      pageMedianLifecycleCpuMs: quantile(armPages.map((page) => page.metrics.measuredLifecycleCpuMs), "median"),
    };
  }

  const paired = Array.from({ length: pairsPerSize }, (_, pair) => {
    const native = recordsByIdentity.get(`${size}/${pair}/native`);
    const react = recordsByIdentity.get(`${size}/${pair}/react`);
    const validPair = native?.valid && react?.valid && native.metrics && react.metrics;
    if (!validPair) {
      return { pair, valid: false, medianRatio: null, p95Ratio: null, reason: "One or both scheduled pages are invalid or missing" };
    }
    const clockFloor = Math.max(preregistrationClockFloorMs, native.clockMinPositiveDeltaMs, react.clockMinPositiveDeltaMs);
    const denominatorResolutionMs = clockFloor * minDenominatorTicks;
    const medianRatio = ratio(native.metrics.commits.all.medianMs, react.metrics.commits.all.medianMs, denominatorResolutionMs);
    const p95Ratio = ratio(native.metrics.commits.all.p95Ms, react.metrics.commits.all.p95Ms, denominatorResolutionMs);
    return {
      pair,
      valid: true,
      nativeSequence: native.sequence,
      reactSequence: react.sequence,
      clockFloorMs: clockFloor,
      denominatorResolutionMs,
      medianRatio,
      p95Ratio,
    };
  });
  const resolvedMedianRatios = paired.map((item) => item.medianRatio?.decisionRatio).filter(Number.isFinite);
  const descriptiveMedianRatios = paired.map((item) => item.medianRatio?.descriptiveRatio).filter(Number.isFinite);
  const resolvedP95Ratios = paired.map((item) => item.p95Ratio?.decisionRatio).filter(Number.isFinite);
  const descriptiveP95Ratios = paired.map((item) => item.p95Ratio?.descriptiveRatio).filter(Number.isFinite);
  const medianGeomean = resolvedMedianRatios.length === pairsPerSize ? geometricMean(resolvedMedianRatios) : null;
  const p95MedianRatio = resolvedP95Ratios.length === pairsPerSize ? quantile(resolvedP95Ratios, "median") : null;
  const medianDescriptiveGeomean = descriptiveMedianRatios.length === pairsPerSize ? geometricMean(descriptiveMedianRatios) : null;
  const p95DescriptiveMedian = descriptiveP95Ratios.length === pairsPerSize ? quantile(descriptiveP95Ratios, "median") : null;
  return {
    size,
    arms,
    paired,
    decision: {
      pairedMedianGeometricMeanRatio: medianGeomean,
      descriptiveMedianGeometricMeanRatio: medianDescriptiveGeomean,
      medianRatioStatus: medianGeomean === null ? "UNRESOLVED" : "RESOLVED",
      medianRatioPass: medianGeomean === null ? null : medianGeomean <= medianRatioMax,
      medianPairsResolved: resolvedMedianRatios.length,
      medianPairsExpected: pairsPerSize,
      medianPairedP95Ratio: p95MedianRatio,
      descriptiveMedianPairedP95Ratio: p95DescriptiveMedian,
      p95RatioStatus: p95MedianRatio === null ? "UNRESOLVED" : "RESOLVED",
      p95RatioPass: p95MedianRatio === null ? null : p95MedianRatio <= p95RatioMax,
      p95PairsResolved: resolvedP95Ratios.length,
      p95PairsExpected: pairsPerSize,
    },
  };
});

const validPages = pages.filter((page) => page.valid);
const invalidPages = pages.filter((page) => !page.valid);
const medianPassingSizes = sizeMetrics.filter((size) => size.decision.medianRatioPass === true).map((size) => size.size);
const medianFailingSizes = sizeMetrics.filter((size) => size.decision.medianRatioPass === false).map((size) => size.size);
const medianUnresolvedSizes = sizeMetrics.filter((size) => size.decision.medianRatioPass === null).map((size) => size.size);
const medianPossiblePassing = medianPassingSizes.length + medianUnresolvedSizes.length;
const medianGate = medianPassingSizes.length >= medianSizesRequired
  ? "PASS"
  : medianPossiblePassing < medianSizesRequired
    ? "FAIL"
    : "UNRESOLVED";
const p95FailingSizes = sizeMetrics.filter((size) => size.decision.p95RatioPass === false).map((size) => size.size);
const p95UnresolvedSizes = sizeMetrics.filter((size) => size.decision.p95RatioPass === null).map((size) => size.size);
const p95Gate = p95FailingSizes.length
  ? "FAIL"
  : p95UnresolvedSizes.length
    ? "UNRESOLVED"
    : "PASS";
const gate = preregistrationErrors.length || directoryErrors.length || invalidPages.length
  || archiveContentErrors.length
  ? "INVALID"
  : medianGate === "FAIL" || p95Gate === "FAIL"
    ? "FAIL"
    : medianGate === "UNRESOLVED" || p95Gate === "UNRESOLVED"
      ? "UNRESOLVED"
      : "PASS";

const summary = {
  schemaVersion: "product-mixed-stable-cells-confirmation-analysis-v1",
  study: "compiled-product-mixed-stable-cells-confirmation",
  gate,
  generatedAt: new Date().toISOString(),
  preregistration: {
    path: "results/product-mixed-stable-cells-confirmation/preregistration.json",
    sha256: preregistrationSha256,
    archiveSha256: preregistration?.archiveSha256 ?? null,
    protocolSha256: preregistration?.protocolSha256 ?? null,
    actualArchiveSha256: archiveSha256,
    actualProtocolSha256: protocolSha256,
    collectionManifestPath: "results/product-mixed-stable-cells-confirmation/manifest.json",
    collectionManifestSha256,
    postCollectionChangedFiles: collectionManifest?.postCollectionChangedFiles ?? null,
    decision: {
      medianRatioMax,
      medianSizesRequired,
      p95RatioMax,
      preregistrationClockMinPositiveDeltaMs: preregistrationClockFloorMs ?? null,
      minDenominatorTicks,
      denominatorRule: decision.denominatorRule ?? null,
    },
  },
  counts: {
    scheduled: expectedRecordCount,
    loaded: pages.filter((page) => page.sha256 !== null).length,
    valid: validPages.length,
    invalid: invalidPages.length,
    missingOrUnreadable: pages.filter((page) => page.sha256 === null).length,
  },
  validation: {
    preregistrationErrors,
    archiveContentErrors,
    directoryErrors,
    invalidPages: invalidPages.map((page) => ({ sequence: page.sequence, filename: page.filename, validationErrors: page.validationErrors })),
    policy: "All 30 preregistered pages are retained; any missing, failed, mis-scheduled, or invalid page makes the overall gate INVALID.",
  },
  decision: {
    medianGate,
    medianPassingSizes,
    medianFailingSizes,
    medianUnresolvedSizes,
    requiredPassingSizes: medianSizesRequired,
    p95Gate,
    p95FailingSizes,
    p95UnresolvedSizes,
    requiredP95RatioAtEverySize: p95RatioMax,
    overallGate: gate,
  },
  sizes: sizeMetrics,
  pages,
  limitations: [
    "The page load is the replication unit; frame samples are nested measurements.",
    "Lifecycle CPU is mount plus the 240 recorded measured-frame commits plus disposal. The harness does not serialize warmup step CPU, so it is not included.",
    "RAF intervals are summarized separately and are not assigned to the update whose structural flag follows them.",
    "DOM correctness checks occur outside each commit timer and may affect subsequent frames.",
    "Measured commit time includes synchronous component rendering and stable numeric-cell update work; browser layout, paint, and GPU work are excluded.",
    "Allocation diagnostics were not collected for this candidate.",
    "This is a fresh product-mixed stable numeric-cell confirmation under the archived candidate; it does not establish a historical causal comparison or general framework performance.",
    "A zero or clock-coarse React denominator is UNRESOLVED for threshold decisions. A positive raw ratio may be retained as descriptive only.",
  ],
};

const svgNumber = (value) => Number(value.toFixed(3));
const svgChart = () => {
  const width = 1020;
  const height = 520;
  const largestResolvedRatio = Math.max(0, ...sizeMetrics.flatMap((sizeMetric) => [
    sizeMetric.decision.pairedMedianGeometricMeanRatio,
    sizeMetric.decision.medianPairedP95Ratio,
  ].filter(Number.isFinite)));
  const niceStep = (value) => {
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const scaled = value / magnitude;
    const unit = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
    return unit * magnitude;
  };
  const tickStep = niceStep(Math.max(0.5, largestResolvedRatio * 1.15 / 4));
  const chartMax = Math.max(1.5, Math.ceil((largestResolvedRatio * 1.15) / tickStep) * tickStep);
  const tickCount = Math.round(chartMax / tickStep);
  const panels = [
    { x: 70, title: "Paired geometric mean of page median ratios", key: "pairedMedianGeometricMeanRatio", limit: medianRatioMax },
    { x: 545, title: "Median paired page p95 ratio", key: "medianPairedP95Ratio", limit: p95RatioMax },
  ];
  const panelWidth = 420;
  const plotTop = 82;
  const plotHeight = 330;
  const elements = [];
  for (const panel of panels) {
    elements.push(`<text x="${panel.x}" y="36" class="panel-title">${panel.title}</text>`);
    for (let tickIndex = 0; tickIndex <= tickCount; tickIndex++) {
      const value = tickIndex * tickStep;
      const y = plotTop + plotHeight - (value / chartMax) * plotHeight;
      elements.push(`<line x1="${panel.x}" x2="${panel.x + panelWidth}" y1="${y}" y2="${y}" class="grid"/>`);
      elements.push(`<text x="${panel.x - 10}" y="${y + 4}" text-anchor="end" class="tick">${value.toFixed(1)}</text>`);
    }
    const limitY = plotTop + plotHeight - (panel.limit / chartMax) * plotHeight;
    elements.push(`<line x1="${panel.x}" x2="${panel.x + panelWidth}" y1="${limitY}" y2="${limitY}" class="threshold"/>`);
    elements.push(`<text x="${panel.x + panelWidth - 2}" y="${limitY - 6}" text-anchor="end" class="threshold-label">limit ${panel.limit}</text>`);
    sizeMetrics.forEach((sizeMetric, index) => {
      const value = sizeMetric.decision[panel.key];
      const center = panel.x + 75 + index * 130;
      if (Number.isFinite(value)) {
        const barHeight = (value / chartMax) * plotHeight;
        elements.push(`<rect x="${center - 24}" y="${plotTop + plotHeight - barHeight}" width="48" height="${barHeight}" class="bar ${value <= panel.limit ? "pass" : "fail"}"/>`);
        elements.push(`<text x="${center}" y="${plotTop + plotHeight - barHeight - 8}" text-anchor="middle" class="value">${svgNumber(value)}</text>`);
      } else {
        elements.push(`<rect x="${center - 24}" y="${plotTop + plotHeight - 18}" width="48" height="18" class="unresolved"/>`);
        elements.push(`<text x="${center}" y="${plotTop + plotHeight - 26}" text-anchor="middle" class="value">unresolved</text>`);
      }
      elements.push(`<text x="${center}" y="${plotTop + plotHeight + 26}" text-anchor="middle" class="tick">${sizeMetric.size} rows</text>`);
    });
  }
  const clockTick = Number.isFinite(preregistrationClockFloorMs) ? preregistrationClockFloorMs.toFixed(6) : "unknown";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">Product mixed stable-cell confirmation ratios</title><desc id="desc">Native over React ratios by row count; lower is faster. Axis expands to show every resolved ratio. Denominators below the conservative pair-specific clock floor are marked unresolved.</desc>
<style>
text{font-family:system-ui,-apple-system,sans-serif;fill:#182230}.panel-title{font-size:15px;font-weight:650}.tick{font-size:12px;fill:#5b6675}.value{font-size:12px;font-weight:600}.grid{stroke:#d8dee7;stroke-width:1}.threshold{stroke:#b42318;stroke-width:2;stroke-dasharray:6 4}.threshold-label{font-size:11px;fill:#b42318}.bar{rx:4}.pass{fill:#238636}.fail{fill:#d04437}.unresolved{fill:#aab4c0;rx:4}
</style>
<rect width="100%" height="100%" fill="#fff"/><text x="35" y="482" class="tick">Gate: ${gate} · ratio = native/React (lower is faster)</text><text x="35" y="502" class="tick">Pair floor = ${minDenominatorTicks} × max(prereg clock ${clockTick} ms, both page clocks); unresolved pairs receive no ratio.</text>
${elements.join("\n")}
</svg>\n`;
};

await mkdir(resultsRoot, { recursive: true });
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(svgPath, svgChart());
console.log(`Product mixed stable-cell confirmation analysis ${gate}: ${validPages.length}/${expectedRecordCount} valid pages; wrote ${path.relative(projectRoot, summaryPath)} and ${path.relative(projectRoot, svgPath)}`);
