import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
const count = 1024;
const canonical = Array.from({ length: count }, (_, index) => `row-${index}`);
const selected = Array.from({ length: 64 }, (_, index) => `row-${index * 16}`);
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return (sorted[3] + sorted[4]) / 2; };
const minimumStep = () => {
  let last = performance.now();
  let minimum = Infinity;
  for (let index = 0; index < 2048; index++) { const next = performance.now(); if (next > last) minimum = Math.min(minimum, next - last); last = next; }
  return Number.isFinite(minimum) ? minimum : null;
};
const assert = (condition: unknown, message: string): asserts condition => { if (!condition) throw new Error(message); };
const sameLifetime = (left: { mounts: Record<string, number>; cleanups: Record<string, number> }, right: { mounts: Record<string, number>; cleanups: Record<string, number> }) =>
  canonical.every((id) => left.mounts[id] === right.mounts[id] && (left.cleanups[id] ?? 0) === (right.cleanups[id] ?? 0));
const nodes = (host: HTMLElement) => new Map([...host.querySelectorAll<HTMLLIElement>("li[data-id]")].map((node) => [node.dataset.id!, node]));
const sequence = (host: HTMLElement) => [...host.querySelectorAll<HTMLLIElement>("li[data-id]")].map((node) => node.dataset.id!);
const digest = async (items: readonly (readonly [string, string, string])[]) => {
  const bytes = new TextEncoder().encode(JSON.stringify(items));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
};

async function run(name: "native" | "react") {
  const timerResolutionMs = minimumStep();
  const host = document.createElement("section");
  host.dataset.arm = name;
  document.body.append(host);
  let controller: Arm | null = null;
  let disposed = false;
  let result;
  let failure: unknown;
  let disposeDurationMs: number | null = null;
  let disposal: { ownerCount: number | null; readerCount: number | null; remainingChildren?: number } | null = null;
  try {
    controller = name === "native" ? mountNative(host, canonical, selected) : mountReact(host, canonical, selected);
    const mountDurationMs = controller.mountDurationMs;
    const before = nodes(host);
    assert(before.size === count, `${name}: initial row count mismatch`);
    const initialLifecycle = controller.lifecycle();
    for (const id of canonical) {
      assert(before.get(id)?.textContent === id, `${name}: initial row text differs for ${id}`);
      assert(initialLifecycle.mounts[id] === 1 && (initialLifecycle.cleanups[id] ?? 0) === 0, `${name}: initial lifetime differs for ${id}`);
      const index = selected.indexOf(id);
      assert(before.get(id)?.dataset.value === String(index < 0 ? 0 : 1), `${name}: initial numeric output differs for ${id}`);
    }
    const orderTail = [...canonical.slice(1), canonical[0]];
    const warmups: number[] = [];
    const records: number[] = [];
    let nativeCandidates = 0;
    const candidateEvidence: Array<{ rootId: string; baseVersion: number; targetVersion: number; publishedVersion: number; status: "ACCEPTED" }> = [];
    for (let sample = 0; sample < 10; sample++) {
      const step = sample + 1;
      const scopeBefore = name === "native" ? (controller as ReturnType<typeof mountNative>).scopeState() : null;
      const started = performance.now();
      const candidate = controller.transact(step, true);
      const elapsed = performance.now() - started;
      if (sample < 2) warmups.push(elapsed);
      else records.push(elapsed);
      if (name === "native") {
        const accepted = candidate as { rootId: string; baseVersion: number; targetVersion: number };
        const scopeAfter = (controller as ReturnType<typeof mountNative>).scopeState();
        assert(accepted && accepted.rootId === scopeBefore!.rootId, "native accepted candidate root identity differs");
        assert(accepted.baseVersion === scopeBefore!.publicationVersion, "native candidate base did not match pre-interaction root revision");
        assert(accepted.targetVersion === accepted.baseVersion + 1 && scopeAfter.publicationVersion === accepted.targetVersion,
          "native candidate did not become the actual next root publication");
        candidateEvidence.push({ rootId: accepted.rootId, baseVersion: accepted.baseVersion, targetVersion: accepted.targetVersion,
          publishedVersion: scopeAfter.publicationVersion, status: "ACCEPTED" });
        nativeCandidates++;
      }
      assert(JSON.stringify(sequence(host)) === JSON.stringify(orderTail), `${name}: moved order mismatch`);
      const after = nodes(host);
      assert(after.size === count, `${name}: row count changed`);
      for (const id of canonical) {
        assert(after.get(id) === before.get(id), `${name}: keyed identity changed for ${id}`);
        assert(after.get(id)?.textContent === id, `${name}: text changed for ${id}`);
        const index = selected.indexOf(id);
        const expected = index < 0 ? 0 : step * 1000 + index + 2;
        assert(after.get(id)?.dataset.value === String(expected), `${name}: numeric output differs for ${id}`);
      }
      assert(sameLifetime(controller.lifecycle(), initialLifecycle), `${name}: move remounted or cleaned a retained row`);
      controller.transact(step, false);
      assert(JSON.stringify(sequence(host)) === JSON.stringify(canonical), `${name}: untimed order reset failed`);
      assert(sameLifetime(controller.lifecycle(), initialLifecycle), `${name}: untimed reset changed row lifetimes`);
    }
    const output = [...nodes(host).values()].map((node) => [node.dataset.id!, node.dataset.value!, node.textContent ?? ""] as const);
    const outputSha256 = await digest(output);
    const disposeStart = performance.now();
    disposed = true;
    disposal = controller.dispose();
    disposeDurationMs = performance.now() - disposeStart;
    disposal.remainingChildren = host.childNodes.length;
    host.remove();
    assert(disposal.remainingChildren === 0, `${name}: disposal left DOM children`);
    const finalLifecycle = controller.lifecycle();
    for (const id of canonical) assert(finalLifecycle.mounts[id] === 1 && finalLifecycle.cleanups[id] === 1, `${name}: effect lifetime did not balance for ${id}`);
    if (name === "native") {
      assert(disposal.ownerCount === 0, "native disposal retained component owners");
      assert(disposal.readerCount === 0, "native disposal retained collection readers");
    }
    result = { status: "PASS", arm: name, rows: count, selectedCells: selected.length, warmupInteractions: warmups, measuredInteractions: records,
      medianMs: median(records), p95MaximumMs: Math.max(...records), timerResolutionMs, mountDurationMs, disposeDurationMs,
      outputSha256, nativeCandidateCount: nativeCandidates, candidateEvidence, lifecycle: finalLifecycle,
      disposal: { ownerCount: disposal.ownerCount, readerCount: disposal.readerCount, remainingChildren: disposal.remainingChildren } };
  } catch (error) {
    failure = error;
  }
  const cleanupErrors: unknown[] = [];
  if (controller && !disposed) {
    disposed = true;
    try { controller.dispose(); } catch (error) { cleanupErrors.push(error); }
  }
  host.remove();
  if (failure && cleanupErrors.length) throw new AggregateError([failure, ...cleanupErrors], `${name} arm and cleanup failed`);
  if (failure) throw failure;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, `${name} cleanup failed`);
  return result;
}

declare global { interface Window { __jointPair?: { run(name: "native" | "react"): Promise<unknown> } } }
window.__jointPair = { run: async (name) => run(name) };
