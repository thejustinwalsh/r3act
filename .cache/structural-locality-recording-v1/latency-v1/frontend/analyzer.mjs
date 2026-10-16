import { OPERATION_KINDS, SIZES, PAIR_INDEXES, armOrder, pageSchedule } from "../../model/schedule.mjs";

const assert = (ok, message) => { if (!ok) throw Error(message); };
const finiteNonnegative = (value) => Number.isFinite(value) && value >= 0;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2;
};
const p95 = (values) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1];
const geomean = (values) => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);

export function analyzePage(result, quantumMs) {
  assert(SIZES.includes(result?.size) && PAIR_INDEXES.includes(result.pairIndex), "invalid size/pair");
  assert(["native", "react", "generic"].includes(result.arm), "invalid arm");
  assert(result.arm !== "generic" || result.pairIndex === 0, "generic oracle pair must be zero");
  assert(result.schemaVersion === "structural-latency-page-v1" && result.status === "PASS" &&
    result.error === null && Array.isArray(result.cleanupErrors) && result.cleanupErrors.length === 0,
    "failed page/schema");
  const timed = result.arm !== "generic";
  assert(timed ? Number.isFinite(quantumMs) && quantumMs > 0 : quantumMs === null,
    "timer quantum missing or unexpected");
  const schedule = pageSchedule({ size: result.size, pairIndex: result.pairIndex,
    arm: result.arm, pageKind: timed ? "latency" : "oracle" });
  assert(result.scheduleId === schedule.id && result.scheduleLabel === schedule.scheduleLabel,
    "schedule drift");
  assert(Array.isArray(result.edits) && result.edits.length === 120 &&
    Array.isArray(result.trace) && result.trace.length === 121,
    "incomplete 120-edit page");
  const expectedFinal = result.arm === "native" ? { ownerCount: 0, readerCount: 0 } :
    result.arm === "generic" ? { ownerCount: 0, readerCount: null } :
    { ownerCount: null, readerCount: null };
  assert(result.final?.ownerCount === expectedFinal.ownerCount &&
    result.final?.readerCount === expectedFinal.readerCount &&
    result.trace[120]?.phase === "disposed" && result.trace[120].remainingChildren === 0 &&
    JSON.stringify(result.trace[120].final) === JSON.stringify(result.final), "disposal drift");
  for (const name of ["scheduleConstructionMs", "initialIdsConstructionMs", "coldMountMs", "teardownMs"])
    assert(finiteNonnegative(result[name]), `missing separate ${name}`);
  const seen = new Set();
  const samples = Object.fromEntries(OPERATION_KINDS.map((kind) => [kind, []]));
  const digests = [];
  for (let index = 0; index < 120; index++) {
    const trial = schedule.trials[index], edit = result.edits[index], trace = result.trace[index];
    assert(edit?.id === trial.id && trace?.id === trial.id && trace.status === "PASS" &&
      !seen.has(trial.id), `edit/trace order or duplicate at ${index}`);
    seen.add(trial.id);
    assert(edit.kind === trial.kind && edit.trialIndex === trial.trialIndex &&
      edit.operationIndex === trial.operationIndex && edit.sampleKind === trial.sampleKind &&
      edit.changedKeys === trial.changedKeys && edit.beforeSize === trial.beforeSize &&
      edit.afterSize === trial.afterSize, `trial identity drift at ${index}`);
    assert(edit.reset?.size === trial.beforeSize && edit.output?.size === trial.afterSize &&
      /^[0-9a-f]{8}$/.test(edit.reset.digest) && /^[0-9a-f]{8}$/.test(edit.output.digest) &&
      trace.digest === edit.output.digest && edit.output.sentinelSelected === true,
      `output drift at ${index}`);
    assert(edit.output.identity?.retainedChecked === trial.beforeSize - trial.removedIds.length &&
      edit.output.identity.newNotSeen === trial.addedIds.length &&
      edit.output.identity.cleanedChecked === trial.removedIds.length &&
      edit.lifecycle?.retained === edit.output.identity.retainedChecked &&
      edit.lifecycle.mounted === trial.addedIds.length &&
      edit.lifecycle.cleaned === trial.removedIds.length, `identity/lifecycle drift at ${index}`);
    assert(Number.isSafeInteger(edit.selectionActions?.reset) &&
      Number.isSafeInteger(edit.selectionActions?.preselection) &&
      finiteNonnegative(edit.resetPhaseMs) && finiteNonnegative(edit.inputConstructionMs),
      `reset/input evidence at ${index}`);
    if (result.arm === "native") assert(Number.isSafeInteger(edit.commit?.expectedVersion) &&
      edit.commit.expectedVersion >= 0 && Number.isSafeInteger(edit.commit.appliedVersion) &&
      Number.isSafeInteger(edit.commit.afterVersion) &&
      edit.commit.expectedVersion + 1 === edit.commit.appliedVersion &&
      edit.commit.afterVersion === edit.commit.appliedVersion &&
      edit.commit.flushed === true && edit.commit.pendingChangeCount === 0,
      `native commit drift at ${index}`);
    else assert(edit.commit === null, `non-native commit invented at ${index}`);
    if (timed) {
      assert(finiteNonnegative(edit.intervalMs), `invalid interval at ${index}`);
      if (trial.sampleKind === "measured") samples[trial.kind].push(edit.intervalMs);
    } else assert(edit.intervalMs === null, `generic oracle has interval at ${index}`);
    digests.push(edit.output.digest);
  }
  const cells = {};
  if (timed) for (const kind of OPERATION_KINDS) {
    const values = samples[kind];
    assert(values.length === 8, `eight measured samples required ${kind}`);
    const m = median(values), high = p95(values);
    cells[kind] = { medianMs: m, p95Ms: high, measured: 8,
      leftCensored: m <= 2 * quantumMs, p95DescriptiveOnly: true };
  }
  return { status: "PASS", arm: result.arm, size: result.size, pairIndex: result.pairIndex,
    quantumMs, cells, digests, scheduleId: schedule.id,
    censoredKinds: timed ? OPERATION_KINDS.filter((kind) => cells[kind].leftCensored) : [],
    screenStatus: timed && OPERATION_KINDS.some((kind) => cells[kind].leftCensored)
      ? "UNRESOLVED_TIMER_FLOOR" : timed ? "TIMING_RESOLVED" : "UNTIMED_ORACLE",
    timings: timed ? "PUBLIC_API_INTERVAL" : "ABSENT" };
}

export function analyzePair(nativePage, reactPage, nativeQuantum, reactQuantum) {
  const native = analyzePage(nativePage, nativeQuantum);
  const react = analyzePage(reactPage, reactQuantum);
  assert(native.arm === "native" && react.arm === "react" && native.size === react.size &&
    native.pairIndex === react.pairIndex, "pair coordinates drift");
  assert(native.digests.every((digest, index) => digest === react.digests[index]),
    "native/React output parity drift");
  const cells = {};
  for (const kind of OPERATION_KINDS) {
    const a = native.cells[kind], b = react.cells[kind];
    const censored = a.leftCensored || b.leftCensored;
    cells[kind] = { censored, medianRatio: censored ? null : a.medianMs / b.medianMs,
      p95Ratio: censored ? null : a.p95Ms / b.p95Ms };
  }
  return { status: "PASS", size: native.size, pairIndex: native.pairIndex,
    order: armOrder(SIZES.indexOf(native.size), native.pairIndex), cells };
}

export function analyzeMatrix(pairs) {
  assert(Array.isArray(pairs) && pairs.length === 15, "all 15 pairs required");
  const indexed = new Map();
  for (const pair of pairs) {
    assert(SIZES.includes(pair.size) && PAIR_INDEXES.includes(pair.pairIndex) &&
      pair.status === "PASS", "bad pair");
    const key = `${pair.size}:${pair.pairIndex}`;
    assert(!indexed.has(key), `duplicate pair ${key}`);
    assert(JSON.stringify(pair.order) === JSON.stringify(armOrder(SIZES.indexOf(pair.size), pair.pairIndex)),
      `pair order drift ${key}`);
    indexed.set(key, pair);
  }
  const cells = {};
  let allParity = true, unresolved = false;
  for (const size of SIZES) for (const kind of OPERATION_KINDS) {
    const entries = PAIR_INDEXES.map((pairIndex) => indexed.get(`${size}:${pairIndex}`)?.cells?.[kind]);
    assert(entries.every(Boolean), `missing cell ${size}/${kind}`);
    const censored = entries.some((entry) => entry.censored);
    if (censored) { unresolved = true; cells[`${size}:${kind}`] = { status: "UNRESOLVED_TIMER_FLOOR" }; continue; }
    assert(entries.every((entry) => Number.isFinite(entry.medianRatio) && entry.medianRatio > 0 &&
      Number.isFinite(entry.p95Ratio) && entry.p95Ratio > 0), `invalid ratio ${size}/${kind}`);
    const medianGM = geomean(entries.map((entry) => entry.medianRatio));
    const p95GM = geomean(entries.map((entry) => entry.p95Ratio));
    const parity = medianGM <= 1 && p95GM <= 1;
    allParity &&= parity;
    cells[`${size}:${kind}`] = { status: parity ? "PARITY" : "FAIL", medianGM,
      p95GM, pairedPages: 5, p95DescriptiveOnly: true };
  }
  const strong = {};
  for (const size of [1024, 10000]) {
    const entries = OPERATION_KINDS.flatMap((kind) => PAIR_INDEXES.map((pairIndex) =>
      indexed.get(`${size}:${pairIndex}`)?.cells?.[kind]));
    strong[size] = !unresolved && allParity &&
      geomean(entries.map((entry) => entry.medianRatio)) <= .8 &&
      geomean(entries.map((entry) => entry.p95Ratio)) <= .8;
  }
  return { status: unresolved ? "UNRESOLVED" : allParity ? "PARITY" : "FAIL",
    parity: !unresolved && allParity, strongWinOptional: strong[1024] && strong[10000],
    cells, pairedPages: 30, p95Qualification: "DESCRIPTIVE_ONLY" };
}
