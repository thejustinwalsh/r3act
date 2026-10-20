/** Independently recompute V3 latency and memory evidence from frozen raw files. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const latencyOnly = process.argv.includes("--latency-only");
const root = process.cwd();
const preregPath = "results/product-mixed-identity-v3-preregistration.json";
const manifestPath = "results/product-mixed-identity-v3-manifest.json";
const rawDir = "results/product-mixed-identity-v3";
const summaryPath = "results/product-mixed-identity-v3-summary.json";
const memoryDir = "results/product-mixed-identity-v3-memory";
const sizes = [128, 512, 1024];
const pairsPerSize = 5;
const warmup = 60;
const frames = 240;
const structuralFrames = [90, 120, 150, 180, 210, 240, 270, 300];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = async (filename) => JSON.parse(await readFile(filename, "utf8"));
const sorted = (values) => [...values].sort((a, b) => a - b);
const median = (values) => sorted(values)[Math.floor(values.length / 2)];
const p95 = (values) => sorted(values)[Math.ceil(values.length * 0.95) - 1];
const geomean = (values) => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const close = (actual, expected, label) => assert.ok(
  actual === expected || (Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9),
  `${label}: ${actual} != ${expected}`,
);
const equalSchedule = (actual, expected) => assert.deepEqual(actual, expected);
const expectedSchedule = sizes.flatMap((size) => Array.from({ length: pairsPerSize }, (_, pair) =>
  (pair % 2 ? ["native", "react"] : ["react", "native"]).map((arm) => ({ size, pair, arm }))
).flat()).map((item, sequence) => ({ ...item, sequence }));

const preregBytes = await readFile(preregPath);
const preregHash = sha(preregBytes);
const prereg = JSON.parse(preregBytes);
const manifest = await json(manifestPath);
const summary = await json(summaryPath);
assert.equal(prereg.study, "compiled-product-mixed-identity-v3");
assert.deepEqual(prereg.schedule, expectedSchedule, "Frozen schedule must be 30 pages, five pairs at each size, with alternating order");
assert.equal(prereg.workload.warmup, warmup);
assert.equal(prereg.workload.frames, frames);
assert.equal(prereg.workload.topologyEvery, 30);
assert.equal(prereg.workload.removed, 8);
assert.equal(prereg.workload.inserted, 8);
assert.equal(prereg.workload.rotation, 13);
assert.equal(prereg.decision.medianRatioMax, 0.80);
assert.equal(prereg.decision.medianSizesRequired, 2);
assert.equal(prereg.decision.p95RatioMax, 1.10);
assert.equal(prereg.decision.minDenominatorTicks, 5);
assert.equal(prereg.clock.readings, 100000);
assert.ok(Number.isFinite(prereg.clock.minPositiveDeltaMs) && prereg.clock.minPositiveDeltaMs > 0);
assert.deepEqual(manifest.postCollectionChangedFiles, []);
assert.equal(manifest.status, "COLLECTION_COMPLETE");
assert.equal(manifest.preregistrationSha256, preregHash);
assert.equal(manifest.archiveSha256, prereg.archiveSha256);

// Lock every preregistered source/build file and ensure the lock enumerates the archive itself.
const statusPath = "implementation/2026-10-12-state-change-identity/status.json";
const status = await json(statusPath);
assert.equal(path.join(path.dirname(statusPath), status.archive), prereg.archive);
assert.equal(status.archiveSha256, prereg.archiveSha256);
assert.equal(sha(await readFile(prereg.archive)), prereg.archiveSha256, "Source/build archive hash mismatch");
assert.deepEqual(prereg.sourceAndBuildSha256, status.sourceAndBuildSha256);
assert.ok(Object.keys(prereg.sourceAndBuildSha256).length > 0);
const archiveMembers = JSON.parse(execFileSync("python3", ["-c", `import hashlib,json,sys,tarfile
members={}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    for member in archive:
        stream=archive.extractfile(member)
        if stream is None: raise RuntimeError("Cannot read archive member: "+member.name)
        digest=hashlib.sha256()
        while True:
            chunk=stream.read(1024*1024)
            if not chunk: break
            digest.update(chunk)
        stream.close()
        members[member.name]=digest.hexdigest()
print(json.dumps(members,sort_keys=True))`, prereg.archive], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
assert.deepEqual(Object.keys(archiveMembers).sort(), Object.keys(prereg.sourceAndBuildSha256).sort(), "Source/build lock must enumerate actual archive members");
for (const [filename, expectedHash] of Object.entries(prereg.sourceAndBuildSha256)) {
  assert.equal(archiveMembers[filename], expectedHash, `Archive member mismatch: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(prereg.productionSha256)) {
  assert.equal(prereg.sourceAndBuildSha256[filename], expectedHash, `Production asset absent from source/build lock: ${filename}`);
  assert.equal(sha(await readFile(filename)), expectedHash, `Local production asset mismatch: ${filename}`);
}
for (const [filename, expectedHash] of Object.entries(prereg.buildProofSha256)) {
  assert.equal(sha(await readFile(filename)), expectedHash, `Build proof hash mismatch: ${filename}`);
}
assert.equal(sha(await readFile("product-mixed-identity-v3-protocol.md")), prereg.protocolSha256, "Protocol hash mismatch");
assert.equal(sha(await readFile("scripts/collect_product_mixed_identity_v3.mjs")), prereg.collectorSha256, "Frozen collector hash mismatch");
assert.equal(sha(await readFile(prereg.analyzer.path)), prereg.analyzer.sha256, "Frozen analyzer hash mismatch");

const files = await readdir(rawDir);
const sequenceFiles = files.sort();
assert.deepEqual(sequenceFiles, expectedSchedule.map(({ sequence }) => `sequence-${String(sequence).padStart(2, "0")}.json`));
const manifestBySequence = new Map();
for (const entry of manifest.files) {
  assert.ok(Number.isInteger(entry.sequence));
  assert.ok(!manifestBySequence.has(entry.sequence), `Repeated manifest sequence ${entry.sequence}`);
  manifestBySequence.set(entry.sequence, entry);
}
assert.equal(manifestBySequence.size, expectedSchedule.length);

const rows = [];
for (const scheduled of expectedSchedule) {
  const filename = `${rawDir}/sequence-${String(scheduled.sequence).padStart(2, "0")}.json`;
  const bytes = await readFile(filename);
  const record = JSON.parse(bytes);
  const manifestEntry = manifestBySequence.get(scheduled.sequence);
  assert.ok(manifestEntry, `Missing manifest sequence ${scheduled.sequence}`);
  assert.equal(manifestEntry.file, filename);
  assert.equal(manifestEntry.sha256, sha(bytes), `Raw hash mismatch: ${filename}`);
  equalSchedule(record.schedule, scheduled);
  assert.equal(record.preregistrationSha256, preregHash);
  assert.equal(record.archiveSha256, prereg.archiveSha256);
  assert.equal(record.protocolSha256, prereg.protocolSha256);
  assert.deepEqual(record.browserErrors, []);
  assert.deepEqual(record.endVisibility, { state: "visible", focused: true });
  assert.equal(record.error, undefined, `Collector error in ${filename}`);
  const r = record.result;
  assert.ok(r && typeof r === "object", `Missing result in ${filename}`);
  equalSchedule({ size: r.size, pair: r.pair, arm: r.arm, sequence: r.sequence }, scheduled);
  assert.equal(r.status, "PASS");
  assert.equal(r.production, true);
  assert.equal(r.mode, "confirm");
  assert.equal(r.warmup, warmup);
  assert.equal(r.frames, frames);
  assert.equal(r.samples.length, frames);
  assert.ok(Object.values(r.checks).every((value) => value === true));
  assert.deepEqual(r.samples.filter((sample) => sample.structural).map((sample) => sample.frame), structuralFrames);
  for (let i = 0; i < frames; i++) {
    const sample = r.samples[i];
    assert.equal(sample.frame, warmup + i + 1, `Frame sequence mismatch in ${filename}`);
    assert.equal(sample.structural, structuralFrames.includes(sample.frame), `Structural flag mismatch in ${filename}`);
    assert.ok(Number.isFinite(sample.commitMs) && sample.commitMs >= 0, `Invalid commitMs in ${filename}`);
    assert.ok(Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0, `Invalid intervalMs in ${filename}`);
  }
  const expectedMounts = scheduled.size + 8 * 8;
  const expectedCleanups = 8 * 8;
  assert.equal(r.active.writers, scheduled.size);
  assert.equal(r.active.mounts, expectedMounts);
  assert.equal(r.active.cleanups, expectedCleanups);
  assert.equal(r.after.writers, 0);
  assert.equal(r.after.mounts, expectedMounts);
  assert.equal(r.after.cleanups, expectedMounts);
  if (scheduled.arm === "native") {
    assert.equal(r.after.extra.root.ownerCount, 0);
    assert.equal(r.after.extra.root.disposed, true);
    assert.equal(r.after.extra.collection.readerCount, 0);
    assert.equal(r.after.extra.collection.retainedBatches, 0);
  }
  const all = r.samples.map((sample) => sample.commitMs);
  const ordinary = r.samples.filter((sample) => !sample.structural).map((sample) => sample.commitMs);
  const structural = r.samples.filter((sample) => sample.structural).map((sample) => sample.commitMs);
  rows.push({ ...scheduled, median: median(all), p95: p95(all), ordinaryMedian: median(ordinary), ordinaryP95: p95(ordinary), structuralMedian: median(structural), structuralP95: p95(structural),
    intervalMedian: median(r.samples.map((sample) => sample.intervalMs)), intervalP95: p95(r.samples.map((sample) => sample.intervalMs)), mount: r.mountMs, dispose: r.disposeMs,
    lifecycle: r.mountMs + all.reduce((sum, value) => sum + value, 0) + r.disposeMs });
}

// Recompute page summaries, paired ratios, clock-floor treatment and the decision gates.
const recomputedSizes = [];
for (const size of sizes) {
  const paired = Array.from({ length: pairsPerSize }, (_, pair) => ({
    native: rows.find((row) => row.size === size && row.pair === pair && row.arm === "native"),
    react: rows.find((row) => row.size === size && row.pair === pair && row.arm === "react"),
  }));
  const threshold = prereg.clock.minPositiveDeltaMs * prereg.decision.minDenominatorTicks;
  const medianValues = paired.map(({ native, react }) => react.median <= threshold ? null : native.median / react.median);
  const p95Values = paired.map(({ native, react }) => react.p95 <= threshold ? null : native.p95 / react.p95);
  const resolvedMedian = medianValues.filter(Number.isFinite);
  const resolvedP95 = p95Values.filter(Number.isFinite);
  const descriptiveMedian = paired.map(({ native, react }) => native.median / react.median);
  const descriptiveP95 = paired.map(({ native, react }) => native.p95 / react.p95);
  const gm = resolvedMedian.length === pairsPerSize ? geomean(resolvedMedian) : null;
  const p95Median = resolvedP95.length === pairsPerSize ? median(resolvedP95) : null;
  const expected = {
    native: {
      all: median(paired.map((pair) => pair.native.median)),
      ordinary: median(paired.map((pair) => pair.native.ordinaryMedian)),
      p95: median(paired.map((pair) => pair.native.p95)),
      ordinaryP95: median(paired.map((pair) => pair.native.ordinaryP95)),
      structuralMedian: median(paired.map((pair) => pair.native.structuralMedian)),
      intervalP95: median(paired.map((pair) => pair.native.intervalP95)),
      structuralP95: median(paired.map((pair) => pair.native.structuralP95)),
      interval: median(paired.map((pair) => pair.native.intervalMedian)),
      mount: median(paired.map((pair) => pair.native.mount)),
      dispose: median(paired.map((pair) => pair.native.dispose)),
      lifecycle: median(paired.map((pair) => pair.native.lifecycle)),
    },
    react: {
      all: median(paired.map((pair) => pair.react.median)),
      ordinary: median(paired.map((pair) => pair.react.ordinaryMedian)),
      p95: median(paired.map((pair) => pair.react.p95)),
      ordinaryP95: median(paired.map((pair) => pair.react.ordinaryP95)),
      structuralMedian: median(paired.map((pair) => pair.react.structuralMedian)),
      intervalP95: median(paired.map((pair) => pair.react.intervalP95)),
      structuralP95: median(paired.map((pair) => pair.react.structuralP95)),
      interval: median(paired.map((pair) => pair.react.intervalMedian)),
      mount: median(paired.map((pair) => pair.react.mount)),
      dispose: median(paired.map((pair) => pair.react.dispose)),
      lifecycle: median(paired.map((pair) => pair.react.lifecycle)),
    },
    gm, p95Median, medianDescriptiveGeomean: geomean(descriptiveMedian), p95DescriptiveMedian: median(descriptiveP95),
    medianPairsResolved: resolvedMedian.length, p95PairsResolved: resolvedP95.length,
  };
  recomputedSizes.push({ size, expected, medianPass: gm === null ? null : gm <= prereg.decision.medianRatioMax,
    p95Pass: p95Median === null ? null : p95Median <= prereg.decision.p95RatioMax });
  const reported = summary.sizes.find((item) => item.size === size);
  assert.ok(reported, `Summary missing size ${size}`);
  for (const arm of ["native", "react"]) {
    close(reported.arms[arm].pageMedianOfPageMediansMs.all, expected[arm].all, `${size}/${arm} median`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.ordinary, expected[arm].ordinary, `${size}/${arm} ordinary median`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.all, expected[arm].p95, `${size}/${arm} all p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.ordinary, expected[arm].ordinaryP95, `${size}/${arm} ordinary p95`);
    close(reported.arms[arm].pageMedianOfPageMediansMs.structural, expected[arm].structuralMedian, `${size}/${arm} structural median`);
    close(reported.arms[arm].pageMedianIntervalP95Ms, expected[arm].intervalP95, `${size}/${arm} RAF p95`);
    close(reported.arms[arm].pageMedianOfPageP95sMs.structural, expected[arm].structuralP95, `${size}/${arm} structural p95`);
    close(reported.arms[arm].pageMedianIntervalMs, expected[arm].interval, `${size}/${arm} interval median`);
    close(reported.arms[arm].pageMedianMountMs, expected[arm].mount, `${size}/${arm} mount median`);
    close(reported.arms[arm].pageMedianDisposeMs, expected[arm].dispose, `${size}/${arm} dispose median`);
    close(reported.arms[arm].pageMedianLifecycleCpuMs, expected[arm].lifecycle, `${size}/${arm} lifecycle total`);
    assert.equal(reported.arms[arm].validPages, pairsPerSize);
  }
  close(reported.decision.descriptiveMedianGeometricMeanRatio, expected.medianDescriptiveGeomean, `${size} descriptive geomean`);
  close(reported.decision.descriptiveMedianPairedP95Ratio, expected.p95DescriptiveMedian, `${size} descriptive p95 ratio`);
  assert.equal(reported.decision.medianPairsResolved, expected.medianPairsResolved);
  assert.equal(reported.decision.p95PairsResolved, expected.p95PairsResolved);
  assert.equal(reported.decision.pairedMedianGeometricMeanRatio, expected.gm);
  assert.equal(reported.decision.medianPairedP95Ratio, expected.p95Median);
  assert.equal(reported.decision.medianRatioStatus, expected.gm === null ? "UNRESOLVED" : "RESOLVED");
  assert.equal(reported.decision.p95RatioStatus, expected.p95Median === null ? "UNRESOLVED" : "RESOLVED");
  assert.equal(reported.decision.medianRatioPass, recomputedSizes.at(-1).medianPass);
  assert.equal(reported.decision.p95RatioPass, recomputedSizes.at(-1).p95Pass);
}
const passSizes = recomputedSizes.filter((item) => item.medianPass === true).map((item) => item.size);
const failSizes = recomputedSizes.filter((item) => item.medianPass === false).map((item) => item.size);
const unresolvedSizes = recomputedSizes.filter((item) => item.medianPass === null).map((item) => item.size);
const medianPossiblePasses = passSizes.length + unresolvedSizes.length;
const medianGate = passSizes.length >= prereg.decision.medianSizesRequired ? "PASS" : medianPossiblePasses < prereg.decision.medianSizesRequired ? "FAIL" : "UNRESOLVED";
const p95FailSizes = recomputedSizes.filter((item) => item.p95Pass === false).map((item) => item.size);
const p95UnresolvedSizes = recomputedSizes.filter((item) => item.p95Pass === null).map((item) => item.size);
const p95Gate = p95FailSizes.length ? "FAIL" : p95UnresolvedSizes.length ? "UNRESOLVED" : "PASS";
const gate = medianGate === "FAIL" || p95Gate === "FAIL" ? "FAIL" : medianGate === "UNRESOLVED" || p95Gate === "UNRESOLVED" ? "UNRESOLVED" : "PASS";
assert.equal(summary.gate, gate, "Reported gate differs from raw-evidence recomputation");
assert.equal(summary.decision.medianGate, medianGate);
assert.deepEqual(summary.decision.medianPassingSizes, passSizes);
assert.deepEqual(summary.decision.medianFailingSizes, failSizes);
assert.deepEqual(summary.decision.medianUnresolvedSizes, unresolvedSizes);
assert.equal(summary.decision.p95Gate, p95Gate);
assert.deepEqual(summary.decision.p95FailingSizes, p95FailSizes);
assert.deepEqual(summary.decision.p95UnresolvedSizes, p95UnresolvedSizes);
assert.equal(summary.counts.scheduled, expectedSchedule.length);
assert.equal(summary.counts.loaded, expectedSchedule.length);
assert.equal(summary.counts.valid, expectedSchedule.length);
assert.equal(summary.counts.invalid, 0);
assert.deepEqual(summary.validation.invalidPages, []);
assert.deepEqual(summary.validation.preregistrationErrors, []);
assert.deepEqual(summary.validation.archiveContentErrors, []);
assert.deepEqual(summary.validation.directoryErrors, []);

let memoryResult = "skipped by --latency-only";
let memoryFiles = [];
try { memoryFiles = await readdir(memoryDir); } catch {}
const hasMemoryResults = memoryFiles.includes("results.json") || memoryFiles.includes("preregistration.json");
if (hasMemoryResults || !latencyOnly) {
  const memoryManifest = await json(`${memoryDir}/results.json`);
  const memoryPrereg = await json(`${memoryDir}/preregistration.json`);
  assert.equal(memoryManifest.status, "PASS");
  assert.equal(memoryManifest.records.length, 6);
  assert.equal(memoryPrereg.profilerSha256, sha(await readFile("scripts/profile_product_mixed_identity_v3_memory.mjs")));
  assert.equal(memoryPrereg.frozenLatencyStudy.preregistrationSha256, preregHash);
  assert.equal(memoryPrereg.frozenLatencyStudy.manifestSha256, sha(await readFile(manifestPath)));
  assert.equal(memoryPrereg.frozenLatencyStudy.archiveSha256, prereg.archiveSha256);
  assert.equal(memoryPrereg.frozenLatencyStudy.protocolSha256, prereg.protocolSha256);
  assert.deepEqual(memoryPrereg.frozenLatencyStudy.productionSha256, prereg.productionSha256);
  assert.deepEqual(memoryPrereg.frozenSchedule.sequences.map((item) => item.sequence), [0, 1, 10, 11, 20, 21]);
  const seen = new Set();
  for (const entry of memoryManifest.records) {
    assert.equal(entry.status, "PASS");
    assert.ok(!seen.has(entry.sequence), `Repeated memory profile sequence ${entry.sequence}`);
    seen.add(entry.sequence);
    const profile = await json(`${memoryDir}/${entry.file}`);
    assert.equal(profile.status, "PASS");
    assert.equal(profile.runId, memoryPrereg.runId);
    assert.deepEqual(profile.pageErrors, []);
    for (const resource of profile.loadedBuildResources) {
      const name = Object.keys(prereg.productionSha256).find(filename => path.basename(filename) === resource.filename);
      assert.ok(name, `Unregistered loaded memory resource: ${resource.filename}`);
      assert.equal(resource.status, 200);
      assert.equal(resource.sha256, prereg.productionSha256[name]);
    }
    assert.equal(profile.sequence, entry.sequence);
    assert.equal(profile.pair, entry.pair);
    assert.equal(profile.arm, entry.arm);
    assert.equal(profile.size, entry.size);
    assert.equal(profile.harnessResult.status, "PASS");
    assert.equal(profile.harnessResult.sequence, entry.sequence);
    assert.equal(profile.harnessResult.pair, entry.pair);
    assert.equal(profile.harnessResult.arm, entry.arm);
    assert.equal(profile.harnessResult.size, entry.size);
    assert.equal(profile.harnessResult.samples.length, frames);
    assert.ok(Object.values(profile.harnessResult.checks).every((value) => value === true));
    assert.ok(profile.cdp.currentSamplingProfile.head);
    assert.ok(profile.cdp.stoppedSamplingProfile.head);
    const sumTree = (node) => (node.selfSize ?? 0) + (node.children ?? []).reduce((sum, child) => sum + sumTree(child), 0);
    const allocationBytes = sumTree(profile.cdp.stoppedSamplingProfile.head);
    const sampledBytes = (profile.cdp.stoppedSamplingProfile.samples ?? []).reduce((sum, sample) => sum + (sample.size ?? 0), 0);
    // The protocol specifies two sampled representations, not exact equality.
    // Keep both totals; neither is an exact byte counter.
    assert.ok(Number.isFinite(allocationBytes) && allocationBytes >= 0);
    assert.ok(Number.isFinite(sampledBytes) && sampledBytes >= 0);
    console.log(`MEMORY ${entry.arm}/${entry.size}: tree=${allocationBytes} bytes; flatSamples=${sampledBytes} bytes; postGC=${profile.heapUsageAfterForcedGC.usedSize} bytes`);
    assert.ok(profile.heapUsageAfterHarnessTeardown?.usedSize >= 0);
    assert.ok(profile.heapUsageAfterForcedGC?.usedSize >= 0);

  }
  assert.equal(seen.size, 6);
  const preregSequences = memoryPrereg.frozenSchedule.sequences.map((item) => item.sequence);
  assert.deepEqual([...seen].sort((a, b) => a - b), [...preregSequences].sort((a, b) => a - b));
  memoryResult = "PASS (6 profiles)";
}

console.log(`PASS independent V3 verification: ${expectedSchedule.length} raw pages, recalculated metrics and ${gate} gate; memory ${memoryResult}.`);
