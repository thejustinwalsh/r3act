import { mountNativeCount, NativeGenericMount } from "./native_controller.tsx";
import { ReactArrayBoard } from "../../../structural-locality-protocol-v1/eligibility/react_array.tsx";
import { NativeGenericBoard } from "../../../structural-locality-protocol-v1/eligibility/native_generic.tsx";
import { initialModel, prepareTrial, applyExpectedEdit } from "../../model/model.mjs";
import { pageSchedule } from "../../model/schedule.mjs";
import { REQUIRED_COUNT_SITES } from "./receipt-analyzer.mjs";

const retainedFixtureRegistry = { ReactArrayBoard, NativeGenericBoard, NativeGenericMount };
Object.assign(globalThis, { __structuralFixtureRegistry: retainedFixtureRegistry });
const fail = (message: string): never => { throw new Error(message); };
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
  priorMounts: Map<string, number>, priorCleanups: Map<string, number>, ever: Set<HTMLLIElement>,
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

function statsDelta(before: any, after: any) {
  const cumulative = ["entryInspections", "anchorInspections", "listenerNotifications", "listenerErrors"];
  return { deltas: Object.fromEntries(cumulative.map((key) => [key, after[key] - before[key]])),
    gauges: { before: { readerCount: before.readerCount, retainedBatches: before.retainedBatches },
      after: { readerCount: after.readerCount, retainedBatches: after.retainedBatches } } };
}

async function run(mode: "count" | "off") {
  const schedule = pageSchedule({ size: 128, pairIndex: 0, arm: "native",
    pageKind: "count" });
  const host = document.createElement("section");
  document.body.append(host);
  const mounts = new Map<string, number>();
  const cleanups = new Map<string, number>();
  const profile: Readonly<Record<string, number>>[] = [];
  const ever = new Set<HTMLLIElement>();
  const life = { mounted(id: string) { mounts.set(id, countAt(mounts, id) + 1); },
    cleaned(id: string) { cleanups.set(id, countAt(cleanups, id) + 1); } };
  let controller: ReturnType<typeof mountNativeCount> | null = null;
  let state = initialModel(128);
  let previous: any = null;
  const edits: any[] = [];
  const trace: any[] = [];
  window.__structuralRecording!.trace = trace;
  window.__structuralRecording!.lastResult = null;
  let primaryError: unknown = null;
  const cleanupErrors: string[] = [];
  let final: any = null;
  try {
    controller = mountNativeCount(host, state.rows.map((row) => row.id), life,
      mode === "count", (values) => profile.push(values));
    inspect(host, state, "mount", null, null, mounts, cleanups,
      new Map(), new Map(), ever, true);
    for (const trial of schedule.trials) {
      const resetOps = inverseOperations(previous);
      const prepared = prepareTrial(state, trial);
      const beforeReset = indexNodes(host);
      const resetMounts = new Map(mounts), resetCleanups = new Map(cleanups);
      controller.reset(resetOps);
      const resetSummary = inspect(host, prepared.state, `${trial.id}/reset`, beforeReset, prepared.reset,
        mounts, cleanups, resetMounts, resetCleanups, ever, false);
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
      const beforeEdit = indexNodes(host);
      const editMounts = new Map(mounts), editCleanups = new Map(cleanups);
      const beforeProfile = profile.length;
      const edited = controller.edit(trial.id, trial.nativeOperations);
      const expected = applyExpectedEdit(prepared, trial);
      const outputSummary = inspect(host, expected.state, `${trial.id}/edit`, beforeEdit,
        expected.lifecycle, mounts, cleanups, editMounts, editCleanups, ever, true);
      if (profile.length !== beforeProfile + 1) fail(`${trial.id}/profile count`);
      const path = profile.at(-1)!;
      if (path["collection.delta-operations"] !== trial.nativeOperations.length ||
          (path["collection.delta.render-fallback"] ?? 0) !== 0 ||
          (path["collection.delta.stale-candidate"] ?? 0) !== 0 ||
          (path["collection.delta.reader-expired"] ?? 0) !== 0)
        fail(`${trial.id}/unexpected delta path ${JSON.stringify(path)}`);
      if (mode === "count") {
        const receipt: any = edited.receipt;
        if (!receipt || receipt.label !== trial.id || !receipt.completed ||
            receipt.phase !== "edit" ||
            receipt.coverageId !== "recording-b-probe-coverage-v1" ||
            receipt.bails.length || receipt.errors.length ||
            receipt.route !== "collection-delta" || typeof receipt.counts !== "object" ||
            typeof receipt.missing !== "object")
          fail(`${trial.id}/probe receipt ${JSON.stringify(receipt)}`);
        for (const [name, expectedSite] of Object.entries(REQUIRED_COUNT_SITES)) {
          const count = receipt.counts[name];
          if (!count || count.value <= 0 || count.unit !== expectedSite.unit ||
              count.site !== expectedSite.site)
            fail(`${trial.id}/required count site ${name}: ${JSON.stringify(count)}`);
        }
      } else if (edited.receipt !== null) fail(`${trial.id}/probe active in off mode`);
      const item = { id: trial.id, kind: trial.kind, trialIndex: trial.trialIndex,
        sampleKind: trial.sampleKind, operationIndex: trial.operationIndex,
        changedKeys: trial.changedKeys, beforeSize: trial.beforeSize,
        afterSize: trial.afterSize, reset: resetSummary, output: outputSummary,
        selectionActions: { reset: prepared.resetSelectionChanges.length,
          preselection: prepared.preselectionChanges.length },
        lifecycle: { retained: expected.lifecycle.retained.length,
          mounted: expected.lifecycle.mounted.length, cleaned: expected.lifecycle.cleaned.length },
        collection: statsDelta(edited.statsBefore, edited.statsAfter),
        bucketStats: { before: null, after: null,
          reason: "Retained VDOM bucket stats have no public accessor; use separated count probes" },
        bucketProfileGauge: typeof path["vdom.keyed-region-delta.bucket-count"] === "number"
          ? path["vdom.keyed-region-delta.bucket-count"] : null,
        path: { deltaOperations: path["collection.delta-operations"],
          renderFallback: path["collection.delta.render-fallback"] ?? 0 },
        receipt: edited.receipt };
      edits.push(item);
      trace.push({ id: trial.id, status: "PASS", digest: outputSummary.digest,
        route: mode === "count" ? (edited.receipt as any)?.route : null });
      state = expected.state;
      previous = trial;
    }
  } catch (error) { primaryError = error; trace.push({ phase: "failed", error: String(error) }); }
  finally {
    try {
      if (controller) {
        final = controller.dispose();
        trace.push({ phase: "disposed", final, remainingChildren: host.childNodes.length });
        if (final.ownerCount !== 0 || final.readerCount !== 0 || host.childNodes.length)
          cleanupErrors.push(`disposal resources ${JSON.stringify(final)}`);
        for (const [id, count] of mounts) if (countAt(cleanups, id) !== count)
          cleanupErrors.push(`lifetime ${id}: ${count}/${countAt(cleanups, id)}`);
      }
    } catch (error) { cleanupErrors.push(`dispose ${String(error)}`); }
    host.remove();
  }
  const result = { schemaVersion: "structural-count-page-v1", mode, size: 128,
    scheduleId: schedule.id, edits, trace, final,
    error: primaryError ? String(primaryError) : null, cleanupErrors,
    status: primaryError || cleanupErrors.length ? "FAIL" : "PASS" };
  window.__structuralRecording!.lastResult = result;
  if (result.status !== "PASS") throw new Error(`structural recording failed: ${result.error}; ` +
    `cleanup: ${cleanupErrors.join("; ")}`);
  return result;
}

declare global { interface Window { __structuralRecording?: {
  run(mode: "count" | "off"): Promise<any>; trace: any[]; lastResult: any } } }
window.__structuralRecording = { run, trace: [], lastResult: null };
