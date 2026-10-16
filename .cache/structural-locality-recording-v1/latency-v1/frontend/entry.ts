import { mountNativeCollection, mountNativeGeneric } from "./native_controller.tsx";
import { mountReactArray } from "./react_controller.tsx";
import { initialModel, prepareTrial, applyExpectedEdit } from "../../model/model.mjs";
import { pageSchedule } from "../../model/schedule.mjs";
const fail = (message: string): never => { throw new Error(message); };
const describeThrown = (value: unknown) => {
  const kind = value === null ? "null" : typeof value;
  try {
    const parts = value instanceof AggregateError ? value.errors.map((part: unknown) => {
      try { return String(part); } catch { return "<unprintable nested error>"; }
    }) : [];
    return { kind, message: parts.length ? `${String(value)}; causes: ${parts.join("; ")}` : String(value) };
  }
  catch { return { kind, message: "<unprintable thrown value>" }; }
};
const same = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};
const nodes = (host: HTMLElement) => [...host.querySelectorAll<HTMLLIElement>("li[data-id]")];
const indexNodes = (host: HTMLElement) => new Map(nodes(host).map((node) => [node.dataset.id!, node]));
const countAt = (map: Map<string, number>, id: string) => map.get(id) ?? 0;
const digest = (rows: readonly { id: string; selected: string }[]) => {
  let hash = 2166136261;
  for (const row of rows) for (const character of `${row.id}:${row.selected};`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const output = (host: HTMLElement) => nodes(host).map((node) => ({
  id: node.dataset.id, selected: node.dataset.selected, text: node.textContent,
}));

function inverseOperations(trial: any) {
  if (!trial) return Object.freeze([]);
  const size = trial.size;
  const row = (index: number) => `row-${index}`;
  const insert = (key: string, beforeKey: string | null) =>
    Object.freeze({ type: "insert" as const, key, value: Object.freeze({ id: key }), beforeKey });
  const remove = (key: string) => Object.freeze({ type: "remove" as const, key });
  const move = (key: string, beforeKey: string | null) =>
    Object.freeze({ type: "move" as const, key, beforeKey });
  const kind = trial.kind;
  if (kind.startsWith("insert-")) return Object.freeze([remove(trial.addedIds[0])]);
  if (kind === "remove-head") return Object.freeze([insert(row(0), row(1))]);
  if (kind === "remove-middle") return Object.freeze([insert(row(Math.floor(size / 2)), row(Math.floor(size / 2) + 1))]);
  if (kind === "remove-tail") return Object.freeze([insert(row(size - 1), null)]);
  if (kind === "move-head") return Object.freeze([move(row(size - 1), null)]);
  if (["move-middle", "move-tail", "same-key-rotation"].includes(kind))
    return Object.freeze([move(row(0), row(1))]);
  if (kind === "edge-replacement") return Object.freeze([
    remove(trial.addedIds[0]), insert(row(size - 1), null),
  ]);
  if (kind === "odd-key-filter") return Object.freeze(Array.from({ length: size / 2 },
    (_, index) => insert(row(index * 2 + 1), index * 2 + 2 < size ? row(index * 2 + 2) : null)));
  return fail(`unknown inverse ${kind}`);
}

function inspect(host: HTMLElement, state: any, label: string, before: Map<string, HTMLLIElement> | null,
  lifecycle: any, mounts: Map<string, number>, cleanups: Map<string, number>,
  priorMounts: Map<string, number>, priorCleanups: Map<string, number>, ever: WeakSet<HTMLLIElement>,
  checkSelection: boolean) {
  const actual = output(host);
  same(actual.map((row) => row.id), state.rows.map((row: any) => row.id), `${label}/order`);
  if (checkSelection) same(actual, state.rows.map((row: any) => ({
    id: row.id, selected: String(row.selected), text: row.id,
  })), `${label}/output`);
  const after = indexNodes(host);
  if (before) {
    for (const id of lifecycle.retained) {
      if (after.get(id) !== before.get(id)) fail(`${label}/retained-node ${id}`);
      if (countAt(mounts, id) !== countAt(priorMounts, id) ||
          countAt(cleanups, id) !== countAt(priorCleanups, id)) fail(`${label}/retained-lifetime ${id}`);
    }
    for (const id of lifecycle.mounted) {
      const node = after.get(id);
      if (!node || ever.has(node)) fail(`${label}/new-node ${id}`);
      if (countAt(mounts, id) !== countAt(priorMounts, id) + 1) fail(`${label}/new-mount ${id}`);
    }
    for (const id of lifecycle.cleaned) {
      if (after.has(id) || countAt(cleanups, id) !== countAt(priorCleanups, id) + 1)
        fail(`${label}/cleanup ${id}`);
    }
  }
  for (const node of after.values()) ever.add(node);
  return { size: actual.length, digest: digest(actual.map((row) => ({
    id: row.id!, selected: row.selected!,
  }))), identity: before ? { retainedChecked: lifecycle.retained.length,
    newNotSeen: lifecycle.mounted.length, cleanedChecked: lifecycle.cleaned.length } : null,
    sentinelSelected: after.get("row-2")?.dataset.selected === "true" };
}

type Arm = "native" | "react" | "generic";

async function run(arm: Arm, size: number, pairIndex: number) {
  if (![128, 1024, 10000].includes(size) || !Number.isInteger(pairIndex) ||
      (arm === "generic" ? pairIndex !== 0 : pairIndex < 0 || pairIndex > 4) ||
      !["native", "react", "generic"].includes(arm))
    fail(`unsupported page coordinate ${arm}/${size}/${pairIndex}`);
  const scheduleStart = performance.now();
  const schedule = pageSchedule({ size, pairIndex, arm,
    pageKind: arm === "generic" ? "oracle" : "latency" });
  const scheduleConstructionMs = performance.now() - scheduleStart;
  const host = document.createElement("section");
  document.body.append(host);
  const mounts = new Map<string, number>();
  const cleanups = new Map<string, number>();
  const ever = new WeakSet<HTMLLIElement>();
  const life = { mounted(id: string) { mounts.set(id, countAt(mounts, id) + 1); },
    cleaned(id: string) { cleanups.set(id, countAt(cleanups, id) + 1); } };
  let controller: any = null;
  let state = initialModel(size);
  let previous: any = null;
  const edits: any[] = [];
  const trace: any[] = [];
  window.__structuralLatency!.trace = trace;
  window.__structuralLatency!.lastResult = null;
  let primaryThrew = false;
  let primaryError: unknown;
  const cleanupErrors: string[] = [];
  let final: any = null;
  let coldMountMs: number | null = null;
  let initialIdsConstructionMs: number | null = null;
  let teardownMs: number | null = null;
  try {
    const initialIdsStart = performance.now();
    const initialIds = state.rows.map((row) => row.id);
    initialIdsConstructionMs = performance.now() - initialIdsStart;
    const mountStart = performance.now();
    controller = arm === "native" ? mountNativeCollection(host, initialIds, life) :
      arm === "react" ? mountReactArray(host, initialIds, life) :
      mountNativeGeneric(host, initialIds, life);
    coldMountMs = performance.now() - mountStart;
    inspect(host, state, "mount", null, null, mounts, cleanups,
      new Map(), new Map(), ever, true);
    for (const trial of schedule.trials) {
      const resetStarted = performance.now();
      const resetOps = arm === "native" ? inverseOperations(previous) : null;
      const prepared = prepareTrial(state, trial);
      const beforeReset = indexNodes(host);
      const resetMounts = new Map(mounts), resetCleanups = new Map(cleanups);
      if (arm === "native") controller.reset(resetOps);
      else if (previous) controller.reset([...trial.canonicalIds]);
      const resetSummary = inspect(host, prepared.state, `${trial.id}/reset`, beforeReset,
        prepared.reset, mounts, cleanups, resetMounts, resetCleanups, ever, false);
      for (const action of [...prepared.resetSelectionChanges, ...prepared.preselectionChanges]) {
        const node = indexNodes(host).get(action.id);
        if (!node || node.dataset.selected !== String(action.fromSelected))
          fail(`${trial.id}/selection-before ${action.id}`);
        controller.click(action.id);
        if (node.dataset.selected !== String(action.toSelected))
          fail(`${trial.id}/selection-after ${action.id}`);
      }
      inspect(host, prepared.state, `${trial.id}/prepared`, null, null,
        mounts, cleanups, new Map(), new Map(), ever, true);
      const resetPhaseMs = performance.now() - resetStarted;
      const inputStart = performance.now();
      const nextIds = arm === "native" ? null : [...trial.nextIds];
      const inputConstructionMs = performance.now() - inputStart;
      const beforeEdit = indexNodes(host);
      const editMounts = new Map(mounts), editCleanups = new Map(cleanups);
      const edited = arm === "native" ? controller.edit(trial.nativeOperations) : controller.edit(nextIds);
      if (arm === "generic" ? edited.start !== null || edited.end !== null :
        !Number.isFinite(edited.start) || !Number.isFinite(edited.end) || edited.end < edited.start)
        fail(`${trial.id}/invalid timer result`);
      const expected = applyExpectedEdit(prepared, trial);
      const outputSummary = inspect(host, expected.state, `${trial.id}/edit`, beforeEdit,
        expected.lifecycle, mounts, cleanups, editMounts, editCleanups, ever, true);
      const item = { id: trial.id, kind: trial.kind, trialIndex: trial.trialIndex,
        sampleKind: trial.sampleKind, operationIndex: trial.operationIndex,
        changedKeys: trial.changedKeys, beforeSize: trial.beforeSize,
        afterSize: trial.afterSize, reset: resetSummary, output: outputSummary,
        selectionActions: { reset: prepared.resetSelectionChanges.length,
          preselection: prepared.preselectionChanges.length },
        lifecycle: { retained: expected.lifecycle.retained.length,
          mounted: expected.lifecycle.mounted.length, cleaned: expected.lifecycle.cleaned.length },
        intervalMs: arm === "generic" ? null : edited.end - edited.start,
        resetPhaseMs, inputConstructionMs,
        commit: arm === "native" ? { expectedVersion: edited.expectedVersion,
          appliedVersion: edited.appliedVersion, afterVersion: edited.afterVersion,
          flushed: edited.flushed, pendingChangeCount: edited.pendingChangeCount } : null };
      edits.push(item);
      trace.push({ id: trial.id, status: "PASS", digest: outputSummary.digest });
      state = expected.state;
      previous = trial;
    }
  } catch (error) {
    primaryThrew = true;
    primaryError = error;
    trace.push({ phase: "failed", error: describeThrown(error) });
  } finally {
    try {
      if (controller) {
        const teardownStarted = performance.now();
        final = controller.dispose();
        teardownMs = performance.now() - teardownStarted;
        trace.push({ phase: "disposed", final, remainingChildren: host.childNodes.length });
        if ((arm !== "react" && final.ownerCount !== 0) ||
            (arm === "native" && final.readerCount !== 0) || host.childNodes.length)
          cleanupErrors.push(`disposal resources ${JSON.stringify(final)}`);
        for (const [id, count] of mounts) if (countAt(cleanups, id) !== count)
          cleanupErrors.push(`lifetime ${id}: ${count}/${countAt(cleanups, id)}`);
      }
    } catch (error) { cleanupErrors.push(`dispose ${describeThrown(error).message}`); }
    host.remove();
  }
  const primary = primaryThrew ? describeThrown(primaryError) : null;
  const result = { schemaVersion: "structural-latency-page-v1", arm, size, pairIndex,
    scheduleId: schedule.id, scheduleLabel: schedule.scheduleLabel,
    edits, trace, final, scheduleConstructionMs, initialIdsConstructionMs,
    coldMountMs, teardownMs,
    error: primary?.message ?? null, errorKind: primary?.kind ?? null, cleanupErrors,
    status: primaryThrew || cleanupErrors.length ? "FAIL" : "PASS" };
  window.__structuralLatency!.lastResult = result;
  if (result.status !== "PASS") throw Error(`structural latency page failed: ${result.error}; ` +
    `cleanup: ${cleanupErrors.join("; ")}`);
  return result;
}

declare global { interface Window { __structuralLatency?: {
  run(arm: Arm, size: number, pairIndex: number): Promise<any>;
  trace: any[]; lastResult: any } } }
window.__structuralLatency = { run, trace: [], lastResult: null };
