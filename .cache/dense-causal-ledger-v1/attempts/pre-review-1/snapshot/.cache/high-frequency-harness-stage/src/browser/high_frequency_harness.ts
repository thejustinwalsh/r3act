import type {
  DirtyPlacement,
  DirtyShape,
  HighFrequencyController,
  HighFrequencyDiagnostics,
  HighFrequencyFactory,
  ProgramMix,
} from "./high_frequency_contract";
import { highFrequencyState, selectDirtyIds } from "./high_frequency_contract";
import "./high_frequency.css";

const allowedSizes = new Set([128, 512, 1024, 4096, 10000]);
const params = new URLSearchParams(location.search);
const arm = params.get("arm") ?? "native";
const size = Number(params.get("rows") ?? 128);
const rawDirty = params.get("dirty") ?? "all";
const rawPlacement = params.get("placement") ?? "contiguous";
const rawPrograms = params.get("programs") ?? "homogeneous";
const isDirtyShape = (value: string): value is DirtyShape =>
  value === "one" || value === "bucket32" || value === "all";
const isDirtyPlacement = (value: string): value is DirtyPlacement =>
  value === "contiguous" || value === "scattered";
const isProgramMix = (value: string): value is ProgramMix =>
  value === "homogeneous" || value === "heterogeneous";
const dirty: DirtyShape = isDirtyShape(rawDirty) ? rawDirty : "all";
const placement: DirtyPlacement = isDirtyPlacement(rawPlacement) ? rawPlacement : "contiguous";
const programs: ProgramMix = isProgramMix(rawPrograms) ? rawPrograms : "homogeneous";
const configurationError = arm !== "native" && arm !== "react"
  ? "Unknown arm"
  : !allowedSizes.has(size)
  ? "Unsupported row count"
  : !isDirtyShape(rawDirty)
  ? "Unknown dirty shape"
  : !isDirtyPlacement(rawPlacement)
  ? "Unknown dirty placement"
  : !isProgramMix(rawPrograms)
  ? "Unknown program mix"
  : null;

const ledgerMode = params.get("ledger") ?? "off";
if (!["off", "on", "count", "allocation"].includes(ledgerMode)) throw new Error("Invalid dense ledger mode");
const ledgerEvents: Array<{frame:number; label:string; atMs:number}> = [];
const ledgerCounts: Record<string, number> = {};
let ledgerFrame = 0;
const denseLedger = {
  mode: ledgerMode,
  mark(label: string) { if (ledgerMode === "on") ledgerEvents.push({frame:ledgerFrame,label,atMs:performance.now()}); },
  count(label: string, amount = 1) { if (ledgerMode === "count") ledgerCounts[label] = (ledgerCounts[label] ?? 0) + amount; },
};
(globalThis as typeof globalThis & {__denseLedger?: typeof denseLedger}).__denseLedger = denseLedger;
const status = document.querySelector<HTMLElement>("#status")!;
const app = document.querySelector<HTMLElement>("#app")!;
const output = document.querySelector<HTMLElement>("#result")!;
const checks = {
  output: true,
  order: true,
  identity: true,
  lifecycle: true,
  deadSetters: true,
  visible: true,
};
const errors: string[] = [];
const ids = Array.from({ length: size }, (_, id) => id);
const lastFrameById = new Map(ids.map((id) => [id, 0]));
const rows = () => Array.from(app.querySelectorAll<HTMLElement>("i.row"));
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
let hiddenSeen = document.visibilityState !== "visible";
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") hiddenSeen = true;
});

const recordFailure = (message: string, field: keyof typeof checks) => {
  checks[field] = false;
  errors.push(message);
};
const check = (condition: unknown, message: string, field: keyof typeof checks) => {
  if (!condition) recordFailure(message, field);
};

const inspect = (frame: number, identity: ReadonlyMap<number, HTMLElement>) => {
  const current = rows();
  check(current.length === size, `Frame ${frame}: expected ${size} rows, got ${current.length}`, "output");
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    const node = current[index];
    if (!node) continue;
    check(Number(node.dataset.rowId) === id, `Frame ${frame}: row order mismatch at ${index}`, "order");
    check(identity.get(id) === node, `Frame ${frame}: row ${id} lost identity`, "identity");
    const expected = highFrequencyState(id, lastFrameById.get(id) ?? 0);
    check(
      node.style.left === `${expected.x}px` &&
        node.style.top === `${expected.y}px` &&
        node.style.transform === `rotate(${expected.rotation}deg)`,
      `Frame ${frame}: row ${id} output mismatch`,
      "output",
    );
  }
};

const summarize = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  return {
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
  };
};

function publish(result: Record<string, unknown>) {
  (window as typeof window & { __highFrequencyResult?: unknown }).__highFrequencyResult = result;
  try {
    status.textContent = `${arm} · ${size} rows · ${dirty}/${placement} · ${String(result.status)}`;
    output.textContent = JSON.stringify(result, null, 2);
  } catch {
    // The structured window result remains available if the display nodes fail.
  }
}

async function run() {
  let controller: HighFrequencyController | null = null;
  let active: HighFrequencyDiagnostics | null = null;
  let afterDispose: HighFrequencyDiagnostics | null = null;
  let mountAndFrameZeroInitializationMs: number | null = null;
  let disposeMs: number | null = null;
  let deadSetterProbeCount = 0;
  let deadSetterThrows = 0;
  let fatal = false;
  const warmupFrames = 60;
  const measuredFrames = 240;
  const warmupSamples: Array<{ frame: number; commitMs: number; intervalMs: number }> = [];
  const samples: Array<{ frame: number; dirtyCount: number; commitMs: number; intervalMs: number }> = [];
  let identity = new Map<number, HTMLElement>();

  try {
    if (configurationError) throw new Error(configurationError);
    const factory: HighFrequencyFactory = arm === "native"
      ? (await import("./native_high_frequency_arm.tsx")).createHighFrequencyNative
      : (await import("./react_high_frequency_arm.tsx")).createHighFrequencyReact;
    const mountStarted = performance.now();
    controller = factory(app, ids, programs);
    controller.mount();
    mountAndFrameZeroInitializationMs = performance.now() - mountStarted;

    const initialRows = rows();
    identity = new Map(initialRows.map((node) => [Number(node.dataset.rowId), node]));
    check(initialRows.length === size, "Initial row count mismatch", "output");
    check(identity.size === size, "Initial IDs are not unique", "order");
    if (initialRows.length !== size || identity.size !== size) {
      throw new Error("Initial DOM row count or ID uniqueness failed; benchmark stopped");
    }
    inspect(0, identity);
    if (errors.length) throw new Error("Initial DOM output failed; benchmark stopped");

    let previousFrameAt = await nextFrame();
    for (let frame = 1; frame <= warmupFrames + measuredFrames; frame++) {
      const now = ledgerMode === "allocation" && frame > warmupFrames ? previousFrameAt : await nextFrame();
      const intervalMs = now - previousFrameAt;
      previousFrameAt = now;
      const dirtyIds = ledgerMode === "allocation" && frame > warmupFrames ? ids : selectDirtyIds(size, dirty, placement, frame);
      ledgerFrame = frame;
      const commitStarted = performance.now();
      denseLedger.mark("commit.start");
      controller.step(frame, dirtyIds);
      denseLedger.mark("commit.end");
      const commitMs = performance.now() - commitStarted;
      for (const id of dirtyIds) lastFrameById.set(id, frame);
      if (frame <= warmupFrames) {
        warmupSamples.push({ frame, commitMs, intervalMs });
      } else {
        samples.push({ frame, dirtyCount: dirtyIds.length, commitMs, intervalMs });
      }
      if (ledgerMode !== "allocation" || frame <= warmupFrames) {
        inspect(frame, identity);
        const d = controller.diagnostics();
        check(d.mounts === size && d.cleanups === 0 && d.writers === size,
          `Frame ${frame}: active lifecycle mismatch`, "lifecycle");
        if (errors.length) break;
      }
      if (ledgerMode === "allocation" && (frame === warmupFrames || frame === warmupFrames + measuredFrames)) {
        const gate = globalThis as typeof globalThis & {__denseLedgerGate?: string | null; __denseLedgerRelease?: (() => void) | null};
        gate.__denseLedgerGate = frame === warmupFrames ? "warmup-complete" : "updates-complete";
        await new Promise<void>(resolve => { gate.__denseLedgerRelease = resolve; });
        gate.__denseLedgerGate = null; gate.__denseLedgerRelease = null;
        if (frame === warmupFrames + measuredFrames) inspect(frame, identity);
      }
    }
  } catch (error) {
    fatal = true;
    recordFailure(String(error), "output");
  } finally {
    if (controller) {
      try {
        active = controller.diagnostics();
      } catch (error) {
        recordFailure(`Could not inspect active lifecycle: ${String(error)}`, "lifecycle");
      }
      const disposeStarted = performance.now();
      try {
        controller.dispose();
      } catch (error) {
        recordFailure(`Disposal failed: ${String(error)}`, "lifecycle");
      }
      disposeMs = performance.now() - disposeStarted;
      try {
        afterDispose = controller.diagnostics();
        check(afterDispose.mounts === size && afterDispose.cleanups === size && afterDispose.writers === 0,
          "Disposal did not release every row writer", "lifecycle");
      } catch (error) {
        recordFailure(`Could not inspect disposed lifecycle: ${String(error)}`, "lifecycle");
      }
      try {
        check(rows().length === 0, "Host retained rows after disposal", "lifecycle");
      } catch (error) {
        recordFailure(`Could not inspect host after disposal: ${String(error)}`, "lifecycle");
      }
      try {
        deadSetterProbeCount = active?.writers ?? size;
        deadSetterThrows = controller.probeDeadSetters(1_000_000);
        check(rows().length === 0, "A dead setter repopulated the host", "deadSetters");
        check(controller.diagnostics().writers === 0, "A dead setter was re-registered", "deadSetters");
      } catch (error) {
        recordFailure(`Dead setter probe failed: ${String(error)}`, "deadSetters");
      }
    }
    check(!hiddenSeen, "Page was hidden during the run", "visible");
  }

  const result = {
    schemaVersion: "current-product-high-frequency-v1",
    status: fatal ? "ERROR" : Object.values(checks).every(Boolean) && errors.length === 0 && samples.length === measuredFrames
      ? "PASS"
      : "FAIL",
    arm,
    rows: size,
    dirty,
    placement,
    programs,
    production: import.meta.env.PROD,
    userAgent: navigator.userAgent,
    warmupFrames,
    measuredFrames,
    checks,
    errors,
    mountAndFrameZeroInitializationMs,
    warmupSamples,
    samples,
    disposeMs,
    active,
    afterDispose,
    deadSetterProbeCount,
    deadSetterThrows,
    summary: {
      warmup: summarize(warmupSamples.map((sample) => sample.commitMs)),
      measured: summarize(samples.map((sample) => sample.commitMs)),
      measuredP95: summarize(samples.map((sample) => sample.commitMs))?.p95Ms ?? null,
    },
    ledger: {mode:ledgerMode,events:ledgerEvents,counts:ledgerCounts},
    timingContract: "dirtyIds are selected once by this shared harness before the commit timer; selection runs identically for both arms and is excluded. step includes per-ID setter dispatch and synchronous host commit. DOM inspection and correctness checks run after the timer. mountAndFrameZeroInitializationMs includes arm creation, mount, and initial frame-zero state commit.",
  };
  publish(result);
}

void run();
