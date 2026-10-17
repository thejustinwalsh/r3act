import { mountNative } from "./native_arm.tsx";
import { mountReact } from "./react_arm.tsx";

type Arm = ReturnType<typeof mountNative> | ReturnType<typeof mountReact>;
type Measurement = { warmupMs: number[]; measuredMs: number[]; medianMs: number; p95Ms: number };
type Result = { status: "PASS"; arm: "native" | "react"; rows: number; dirty: 2; operation: string;
  mountDurationMs: number; disposeDurationMs: number; timerResolutionMs: number | null;
  resetIncludedInTiming: false; measurements: Record<string, Measurement>; outputSha256: string;
  lifecycle: { mounts: number; cleanups: number; finalMounts: number; finalCleanups: number };
  disposal: { ownerCount: number | null; readerCount: number | null; remainingChildren: number };
  nativeScopedCandidateSamples: number };
const rowCount = 1024;
const canonical = Array.from({ length: rowCount }, (_, index) => `row-${index}`);
const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const median = (values: number[]) => { const s = sorted(values); return (s[3] + s[4]) / 2; };
const p95 = (values: number[]) => sorted(values)[Math.ceil(values.length * 0.95) - 1];
const digest = async (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const idsFrom = (host: HTMLElement) => [...host.querySelectorAll<HTMLLIElement>("li[data-id]")].map((node) => node.dataset.id!);
const nodesFrom = (host: HTMLElement) => new Map([...host.querySelectorAll<HTMLLIElement>("li[data-id]")].map((node) => [node.dataset.id!, node]));
const fail = (message: string): never => { throw new Error(message); };
const timerResolution = () => {
  let previous = performance.now();
  let minimum = Infinity;
  for (let index = 0; index < 2048; index++) {
    const next = performance.now();
    if (next > previous) minimum = Math.min(minimum, next - previous);
    previous = next;
  }
  return Number.isFinite(minimum) ? minimum : null;
};

async function run(armName: "native" | "react"): Promise<Result> {
  const timerResolutionMs = timerResolution();
  const host = document.createElement("section");
  host.dataset.arm = armName;
  document.body.append(host);
  const mounts = new Map<string, number>();
  const cleanups = new Map<string, number>();
  const life = {
    mount(id: string) { mounts.set(id, (mounts.get(id) ?? 0) + 1); },
    cleanup(id: string) { cleanups.set(id, (cleanups.get(id) ?? 0) + 1); },
  };
  let controller: Arm | null = null;
  let mountDurationMs = 0;
  const check = (expected: readonly string[], before?: Map<string, HTMLLIElement>, removed = false, selected = true) => {
    const nodes = nodesFrom(host);
    if (JSON.stringify(idsFrom(host)) !== JSON.stringify(expected)) fail(`${armName}: output order differs`);
    for (const id of expected) {
      const node = nodes.get(id)!;
      if (node.textContent !== id) fail(`${armName}: text differs for ${id}`);
      if (before?.has(id) && before.get(id) !== node) fail(`${armName}: retained identity changed for ${id}`);
    }
    const expectedSelection = String(selected);
    if (nodes.get("row-2")?.dataset.selected !== expectedSelection || nodes.get("row-0")?.dataset.selected !== expectedSelection)
      fail(`${armName}: retained local state changed`);
    if (removed && nodes.has("row-512")) fail(`${armName}: removed row remains`);
    return nodes;
  };
  const measure = (operation: "move" | "remove", invoke: () => unknown, expected: readonly string[], before: Map<string, HTMLLIElement>) => {
    const started = performance.now();
    const accepted = invoke();
    const elapsed = performance.now() - started;
    check(expected, before, operation === "remove");
    return { elapsed, accepted };
  };
  try {
    const mountStarted = performance.now();
    controller = armName === "native" ? mountNative(host, canonical, life) : mountReact(host, canonical, life);
    mountDurationMs = performance.now() - mountStarted;
    const nodes = check(canonical, undefined, false, false);
    for (const id of canonical) if (mounts.get(id) !== 1 || (cleanups.get(id) ?? 0) !== 0) fail(`${armName}: initial effect lifetime for ${id}`);
    controller.click("row-2");
    controller.click("row-0");
    check(canonical, nodes);
    const moveTailIds = [...canonical.slice(1), canonical[0]];
    const removeIds = canonical.filter((id) => id !== "row-512");
    const metrics: Record<string, Measurement> = {};
    let nativeScopedCandidateSamples = 0;
    for (const [name, runEdit, expected] of [
      ["move-row-0-to-tail", () => controller!.moveTail(), moveTailIds],
      ["remove-row-512", () => controller!.removeMiddle(), removeIds],
    ] as const) {
      const warmupMs: number[] = [];
      const measuredMs: number[] = [];
      for (let index = 0; index < 10; index++) {
        const before = nodesFrom(host);
        const lifecycleBefore = new Map(canonical.map((id) => [id, { mounts: mounts.get(id) ?? 0, cleanups: cleanups.get(id) ?? 0 }]));
        const scopeBefore = armName === "native" ? (controller as ReturnType<typeof mountNative>).scopeState() : null;
        const { elapsed: duration, accepted } = measure(name.startsWith("move") ? "move" : "remove", runEdit, expected, before);
        if (armName === "native") {
          const candidate = accepted as { rootId: string; baseVersion: number; targetVersion: number } | undefined;
          const scopeAfter = (controller as ReturnType<typeof mountNative>).scopeState();
          if (!candidate || candidate.rootId !== scopeBefore!.rootId || candidate.baseVersion !== scopeBefore!.publicationVersion ||
            candidate.targetVersion !== scopeBefore!.publicationVersion + 1 || scopeAfter.publicationVersion !== candidate.targetVersion)
            fail(`native ${name}: returned scoped candidate was not the accepted root publication`);
          nativeScopedCandidateSamples++;
        }
        for (const id of expected) {
          if (name.startsWith("remove") && id === "row-512") continue;
          const prior = lifecycleBefore.get(id)!;
          if ((mounts.get(id) ?? 0) !== prior.mounts || (cleanups.get(id) ?? 0) !== prior.cleanups)
            fail(`${armName}: retained effect lifetime changed for ${id}`);
        }
        if (name.startsWith("remove") && (cleanups.get("row-512") ?? 0) !== (lifecycleBefore.get("row-512")!.cleanups + 1))
          fail(`${armName}: removed-row cleanup cardinality`);
        if (index < 2) warmupMs.push(duration);
        else measuredMs.push(duration);
        if (name.startsWith("move")) {
          controller.moveHead();
          check(canonical, before);
        } else {
          const removed = before.get("row-512");
          if ((cleanups.get("row-512") ?? 0) !== (index + 1)) fail(`${armName}: removed-row cleanup count`);
          controller.restoreMiddle();
          const retainedBefore = new Map([...before].filter(([id]) => id !== "row-512"));
          const restored = check(canonical, retainedBefore);
          if (restored.get("row-512") === removed) fail(`${armName}: removed row identity was reused`);
          if ((mounts.get("row-512") ?? 0) !== index + 2) fail(`${armName}: restored-row mount count`);
        }
      }
      metrics[name] = { warmupMs, measuredMs, medianMs: median(measuredMs), p95Ms: p95(measuredMs) };
    }
    const output = [...host.querySelectorAll<HTMLLIElement>("li[data-id]")].map((node) => [node.dataset.id, node.dataset.selected, node.textContent]);
    const result: Result = { status: "PASS", arm: armName, rows: rowCount, dirty: 2,
      mountDurationMs, disposeDurationMs: 0, timerResolutionMs,
      operation: "one move of row-0 to tail and one removal of row-512; removal reset reinserts outside timing",
      resetIncludedInTiming: false, measurements: metrics, outputSha256: await digest(output),
      lifecycle: { mounts: [...mounts.values()].reduce((a, b) => a + b, 0), cleanups: [...cleanups.values()].reduce((a, b) => a + b, 0),
        finalMounts: mounts.get("row-512") ?? 0, finalCleanups: cleanups.get("row-512") ?? 0 },
      disposal: { ownerCount: null, readerCount: null, remainingChildren: -1 }, nativeScopedCandidateSamples };
    const disposeStarted = performance.now();
    const disposal = controller.dispose();
    result.disposeDurationMs = performance.now() - disposeStarted;
    result.disposal.ownerCount = disposal.ownerCount;
    result.disposal.readerCount = disposal.readerCount;
    result.disposal.remainingChildren = host.childNodes.length;
    if (host.childNodes.length !== 0) fail(`${armName}: disposal left host children`);
    for (const [id, count] of mounts) if ((cleanups.get(id) ?? 0) !== count) fail(`${armName}: lifecycle leak for ${id}`);
    if (armName === "native" && (disposal.ownerCount !== 0 || disposal.readerCount !== 0)) fail("native disposal retained owners/readers");
    return result;
  } finally {
    if (controller && host.childNodes.length) {
      try { controller.dispose(); } catch { /* the caller preserves the primary failure */ }
    }
    host.remove();
  }
}

declare global { interface Window { __structuralPair?: { run(arm: "native" | "react"): Promise<Result> } } }
window.__structuralPair = { run };
