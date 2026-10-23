import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsRoot = path.join(projectRoot, "results");
const rawDirectory = path.join(resultsRoot, "product-mixed-prepared-style-confirmation");
const preregistrationPath = path.join(rawDirectory, "preregistration.json");
const collectionManifestPath = path.join(rawDirectory, "manifest.json");
const summaryPath = path.join(rawDirectory, "summary-v2.json");
const svgPath = path.join(rawDirectory, "summary-v2.svg");
const protocolPath = path.join(projectRoot, "product-mixed-prepared-style-confirmation-protocol.md");
const sizes = [128, 512, 1024];
const pairsPerSize = 5;
const expectedRecordCount = sizes.length * pairsPerSize * 2;
const warmupFrames = 60;
const measuredFrames = 240;
const structuralEvery = 30;
const structuralEveryFrameCount = 8;
const rowsChangedPerStructuralFrame = 8;
const candidateStatusPath = "implementation/2026-10-13-prepared-style-writers/status.json";
const candidateArchivePath = "implementation/2026-10-13-prepared-style-writers/source-and-build.tar.gz";
const executionProofPath = "implementation/2026-10-13-prepared-style-writers/verification/execution-proof.json";
const compilerProofPath = "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/native.js";
const compilerProofPaths = [
  compilerProofPath,
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/react.js",
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/native.json",
  "implementation/2026-10-13-prepared-style-writers/verification/product-compiler-proof/react.json",
];
const compiledStyleProofPath = "implementation/2026-10-13-prepared-style-writers/verification/compiled-style-proof.json";
const pilotDirectory = "implementation/2026-10-13-prepared-style-writers/verification/product-mixed-pilot";
const timingConfigPath = "vite.product-mixed-prepared-style-timing.config.ts";
const basePreviewConfigPath = "vite.product-mixed-prepared-style.config.ts";
const collectorPath = "scripts/collect_product_mixed_prepared_style.mjs";
const analyzerPath = "scripts/summarize_product_mixed_prepared_style.mjs";
const verifierPath = "scripts/verify_product_mixed_prepared_style_evidence.mjs";
const scheduleSourcePath = "src/browser/product_mixed_schedule.ts";
const expectedArchiveSha256 = "093f7058977c0a1290ddcc3f27b7ee5cbda022e9e43a161be1b24b950c3c419b";

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
if (preregistration?.timingEnvironment?.origin !== "https://compiled-prepared-style-timing.localhost:1355" || preregistration?.timingEnvironment?.coop !== "same-origin" || preregistration?.timingEnvironment?.coep !== "require-corp" || preregistration?.timingEnvironment?.crossOriginIsolated !== true || preregistration?.timingEnvironment?.calibrationPath !== "/__clock-calibration" || preregistration?.timingEnvironment?.configPath !== "vite.product-mixed-prepared-style-timing.config.ts" || preregistration?.timingEnvironment?.baseConfigPath !== "vite.product-mixed-prepared-style.config.ts") preregistrationErrors.push("Frozen timing environment must use the isolated virtual-origin calibration route and exact headers");
if (preregistration?.browser?.headless !== false || preregistration?.browser?.gpu !== false ||
    preregistration?.browser?.viewport?.width !== 1200 || preregistration?.browser?.viewport?.height !== 900) {
  preregistrationErrors.push("Prerecorded browser configuration differs from the frozen headed 1200x900 GPU-disabled setup");
}
const proof = preregistration?.proof;
if (proof?.native?.compiled !== true || proof.native.bindings !== 3 || proof.native.deltas !== true ||
    proof.native.propOnly !== true || proof.native.deltaFallback !== false) {
  preregistrationErrors.push("Native production compiler/binding proof is missing or does not match the frozen workload");
}
if (proof?.react?.compiled !== true || proof.react.rowMemoCache !== true || proof.react.boardMemoCache !== true) {
  preregistrationErrors.push("React production compiler proof is missing or does not match the frozen workload");
}
if (typeof preregistration?.archiveSha256 !== "string" || !/^[0-9a-f]{64}$/i.test(preregistration.archiveSha256)) {
  preregistrationErrors.push("Preregistration archiveSha256 is missing or malformed");
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
if (!frozenSourceHashes || typeof frozenSourceHashes !== "object" || Array.isArray(frozenSourceHashes)) {
  archiveContentErrors.push("Prerecorded sourceAndBuildSha256 map is missing");
}
if (!frozenProductionHashes || typeof frozenProductionHashes !== "object" || Array.isArray(frozenProductionHashes)) {
  archiveContentErrors.push("Prerecorded productionSha256 map is missing");
}
if (Object.keys(frozenSourceHashes ?? {}).length !== 830) archiveContentErrors.push("Frozen candidate inventory must contain all 830 source/build entries");
if (Object.keys(preregistration?.buildProofSha256 ?? {}).length !== 33) archiveContentErrors.push("Frozen candidate verification inventory must contain all 33 proof entries");
const requiredInputLocks = [
  candidateArchivePath, candidateStatusPath,
  ...Object.keys(frozenSourceHashes ?? {}),
  ...Object.keys(preregistration?.buildProofSha256 ?? {}),
  path.relative(projectRoot, protocolPath), timingConfigPath, basePreviewConfigPath, collectorPath, analyzerPath, verifierPath, scheduleSourcePath,
];
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
  if (candidateStatus.status !== "PREPARED_STYLE_WRITERS_CORRECTNESS_VERIFIED" || candidateStatus.runtimeTests !== 593 || candidateStatus.rustTests !== 29 || candidateStatus.integrationCommands !== 12 || candidateStatus.candidateProductionPilotPages !== 6 || candidateStatus.archiveSha256 !== expectedArchiveSha256) archiveContentErrors.push("Candidate checkpoint status or qualification counts differ from the reviewed prepared-style archive");
  if (preregistration?.archive !== candidateArchivePath || preregistration?.archiveSha256 !== expectedArchiveSha256 || candidateStatus.archiveSha256 !== preregistration?.archiveSha256) archiveContentErrors.push("Prerecording does not identify the exact reviewed source/build archive");
  if (!sameJson(frozenSourceHashes, candidateStatus.sourceAndBuildSha256)) archiveContentErrors.push("Prerecorded source/build file map differs from the candidate checkpoint status");

  const executionProof = JSON.parse(await readFile(path.resolve(projectRoot, executionProofPath), "utf8"));
  const executionProofHash = sha256(await readFile(path.resolve(projectRoot, executionProofPath)));
  const compilerProof = await readFile(path.resolve(projectRoot, compilerProofPath), "utf8");
  const compilerProofHash = sha256(Buffer.from(compilerProof));
  const reactCompilerProof = JSON.parse(await readFile(path.resolve(projectRoot, compilerProofPaths[3]), "utf8"));
  const compiledStyleProof = JSON.parse(await readFile(path.resolve(projectRoot, compiledStyleProofPath), "utf8"));
  const compiledStyleProofHash = sha256(await readFile(path.resolve(projectRoot, compiledStyleProofPath)));
  const proof = preregistration?.proof ?? {};
  const executionRows = executionProof.numericFrames ?? [];
  const expectedExecutionRows = [
    { density: 1, batches: 1, sourceUpdates: 2, projections: 5 },
    { density: 4, batches: 1, sourceUpdates: 8, projections: 20 },
    { density: 32, batches: 1, sourceUpdates: 64, projections: 160 },
  ];
  const executionProofValid = executionProof.status === "PASS" && executionProof.captureCallsForEligibleCuts === 0 && executionProof.captureNativeCalls === 5 && sameJson(executionRows.map((frame) => ({ density: frame.density, batches: frame.counters?.["numeric.program-batches"], sourceUpdates: frame.counters?.["numeric.program-source-updates"], projections: frame.counters?.["numeric.program-projections"] })), expectedExecutionRows);
  const compilerBoundary = compilerProof.search(/\n\s*"component_module":/);
  const compilerExecutable = compilerBoundary > 0 ? compilerProof.slice(0, compilerBoundary) : "";
  const compilerDescriptorCount = (compilerExecutable.match(/schemaVersion:\s*1/g) ?? []).length;
  const compilerBindingCount = (compilerExecutable.match(/__nativeBindStatePropAt\([\s\S]*?__nativeNumericPrograms\[\d+\]\)/g) ?? []).length;
  const compiledStyleValid = compiledStyleProof.status === "PASS" && compiledStyleProof.trace?.factories === 73 && compiledStyleProof.trace?.writes === 80 && sameJson(compiledStyleProof.trace?.fields, { left: 35, top: 35, transform: 3 });
  const compilerFilesMatch = sameJson(Object.keys(proof.compilerEmission?.files ?? {}).sort(), compilerProofPaths.slice().sort()) && compilerProofPaths.every((filename) => proof.compilerEmission?.files?.[filename] === frozenInputLocks[filename]);
  if (!executionProofValid || executionProofHash !== candidateStatus.verificationSha256?.["verification/execution-proof.json"] || proof.executionProof?.path !== executionProofPath || proof.executionProof?.sha256 !== executionProofHash || proof.executionProof?.captureCallsForEligibleCuts !== 0 || !sameJson(proof.executionProof?.numericFrames, expectedExecutionRows)) archiveContentErrors.push("Native snapshot-free execution proof is missing, invalid, or not frozen");
  if (compilerProofHash !== candidateStatus.verificationSha256?.["verification/product-compiler-proof/native.js"] || compilerDescriptorCount !== 3 || compilerBindingCount !== 3 || proof.compilerEmission?.numericProgramDescriptors !== 3 || proof.compilerEmission?.numericProgramBindings !== 3 || proof.compilerEmission?.files?.[compilerProofPath] !== compilerProofHash || !compilerFilesMatch || reactCompilerProof.arm !== "react" || reactCompilerProof.rowMemoCache !== true || reactCompilerProof.boardMemoCache !== true || proof.compilerEmission?.reactCompiler?.arm !== "react" || proof.compilerEmission?.reactCompiler?.rowMemoCache !== true || proof.compilerEmission?.reactCompiler?.boardMemoCache !== true) archiveContentErrors.push("Native compiler emission or React compiler baseline proof is missing, invalid, or not frozen");
  if (!compiledStyleValid || compiledStyleProofHash !== candidateStatus.verificationSha256?.["verification/compiled-style-proof.json"] || proof.compiledStyleProof?.path !== compiledStyleProofPath || proof.compiledStyleProof?.sha256 !== compiledStyleProofHash || proof.compiledStyleProof?.activations !== 73 || proof.compiledStyleProof?.writes !== 80 || !sameJson(proof.compiledStyleProof?.fields, { left: 35, top: 35, transform: 3 })) archiveContentErrors.push("Prepared-style compiled writer proof is missing, invalid, or not frozen");
  if (proof.pilotManifestPath !== `${pilotDirectory}/results.json` || !proof.pilotManifestSha256 || proof.native?.bindings !== 3 || proof.react?.rowMemoCache !== true || proof.react?.boardMemoCache !== true) archiveContentErrors.push("Frozen candidate production pilot/compiler proof metadata is incomplete");
} catch (error) {
  archiveContentErrors.push(`Cannot validate frozen candidate and prepared-style proof inputs: ${String(error)}`);
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
    const mappedMembers = Object.keys(frozenSourceHashes).sort();
    const actualMembers = Object.keys(archiveMemberHashes).sort();
    if (actualMembers.length !== mappedMembers.length || actualMembers.some((member, index) => member !== mappedMembers[index])) {
      archiveContentErrors.push("Frozen source/build hash map does not enumerate exactly the archive members");
    }
    for (const [memberPath, expectedHash] of Object.entries(frozenSourceHashes)) {
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
    if (manifestEntry.file !== `results/product-mixed-prepared-style-confirmation/${filename}`) validationErrors.push("Collection manifest raw-file path differs from expected filename");
    if (manifestEntry.sha256 !== rawSha256) validationErrors.push("Raw record SHA-256 differs from collection manifest");
  }
  if (wrapper.schemaVersion !== 1 || wrapper.study !== "compiled-product-mixed-prepared-style-confirmation") validationErrors.push("Raw wrapper study or schema version is invalid");
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
  const allowedJson = new Set(["preregistration.json", "manifest.json", "postlock.json", "FINALresults.json", "summary-v2.json"]);
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
  schemaVersion: "product-mixed-prepared-style-confirmation-analysis-v1",
  study: "compiled-product-mixed-prepared-style-confirmation",
  gate,
  generatedAt: new Date().toISOString(),
  preregistration: {
    path: "results/product-mixed-prepared-style-confirmation/preregistration.json",
    sha256: preregistrationSha256,
    archiveSha256: preregistration?.archiveSha256 ?? null,
    protocolSha256: preregistration?.protocolSha256 ?? null,
    actualArchiveSha256: archiveSha256,
    actualProtocolSha256: protocolSha256,
    collectionManifestPath: "results/product-mixed-prepared-style-confirmation/manifest.json",
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
    "This is a fresh product-mixed prepared-style confirmation under the archived candidate; it does not establish a historical causal comparison or general framework performance.",
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
<title id="title">Product mixed prepared-style confirmation ratios</title><desc id="desc">Native over React ratios by row count; lower is faster. Axis expands to show every resolved ratio. Denominators below the conservative pair-specific clock floor are marked unresolved.</desc>
<style>
text{font-family:system-ui,-apple-system,sans-serif;fill:#182230}.panel-title{font-size:15px;font-weight:650}.tick{font-size:12px;fill:#5b6675}.value{font-size:12px;font-weight:600}.grid{stroke:#d8dee7;stroke-width:1}.threshold{stroke:#b42318;stroke-width:2;stroke-dasharray:6 4}.threshold-label{font-size:11px;fill:#b42318}.bar{rx:4}.pass{fill:#238636}.fail{fill:#d04437}.unresolved{fill:#aab4c0;rx:4}
</style>
<rect width="100%" height="100%" fill="#fff"/><text x="35" y="482" class="tick">Gate: ${gate} · ratio = native/React (lower is faster)</text><text x="35" y="502" class="tick">Pair floor = ${minDenominatorTicks} × max(prereg clock ${clockTick} ms, both page clocks); unresolved pairs receive no ratio.</text>
${elements.join("\n")}
</svg>\n`;
};

await mkdir(resultsRoot, { recursive: true });
summary.analysisRepair = { originalAnalyzer: analyzerPath, originalAnalyzerSha256: sha256(await readFile(path.join(projectRoot, analyzerPath))), reason: "Normalize protocol inventory entry to the project-relative path used by the frozen collector; no raw record or threshold change", originalSummarySha256: sha256(await readFile(path.join(rawDirectory, "summary.json"))) };
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(svgPath, svgChart());
console.log(`Product mixed prepared-style confirmation analysis ${gate}: ${validPages.length}/${expectedRecordCount} valid pages; wrote ${path.relative(projectRoot, summaryPath)} and ${path.relative(projectRoot, svgPath)}`);
