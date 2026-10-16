import type {
  DirtyPlacement,
  DirtyShape,
  HighFrequencyController,
  HighFrequencyFactory,
  ProgramMix,
} from "./high_frequency_contract";
import { highFrequencyState } from "./high_frequency_contract";
import "./high_frequency.css";

const allowedSizes = new Set([128, 512, 1024, 4096, 10000]);
const params = new URLSearchParams(location.search);
const arm = params.get("arm") ?? "native";
const size = Number(params.get("rows") ?? 128);
const dirty = params.get("dirty") ?? "all";
const placement = params.get("placement") ?? "contiguous";
const programs = params.get("programs") ?? "homogeneous";
if (arm !== "native" && arm !== "react") throw new Error("Unknown arm");
if (!allowedSizes.has(size)) throw new Error("Unsupported row count");
if (dirty !== "one" && dirty !== "bucket32" && dirty !== "all") throw new Error("Unknown dirty shape");
if (placement !== "contiguous" && placement !== "scattered") throw new Error("Unknown dirty placement");
if (programs !== "homogeneous" && programs !== "heterogeneous") throw new Error("Unknown program mix");

const status = document.querySelector<HTMLElement>("#status")!;
const app = document.querySelector<HTMLElement>("#app")!;
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
const check = (condition: unknown, message: string, field: keyof typeof checks) => {
  if (condition) return;
  checks[field] = false;
  errors.push(message);
};

const selectDirtyIds = (frame: number): number[] => {
  const count = dirty === "one" ? 1 : dirty === "bucket32" ? Math.min(32, size) : size;
  const selected: number[] = [];
  if (placement === "contiguous") {
    const first = count === size ? 0 : (frame * 17) % (size - count + 1);
    for (let offset = 0; offset < count; offset++) selected.push(first + offset);
  } else {
    const first = (frame * 137) % size;
    for (let offset = 0; offset < count; offset++) selected.push((first + offset * 997) % size);
  }
  return selected;
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

async function run() {
  const factory: HighFrequencyFactory = arm === "native"
    ? (await import("./native_high_frequency_arm.tsx")).createHighFrequencyNative
    : (await import("./react_high_frequency_arm.tsx")).createHighFrequencyReact;
  const mountStarted = performance.now();
  const controller: HighFrequencyController = factory(app, ids, programs as ProgramMix);
  const mountMs = performance.now() - mountStarted;
  const initialRows = rows();
  const identity = new Map(initialRows.map((node) => [Number(node.dataset.rowId), node]));
  check(initialRows.length === size, "Initial row count mismatch", "output");
  check(identity.size === size, "Initial IDs are not unique", "order");
  inspect(0, identity);

  const warmupFrames = 60;
  const measuredFrames = 240;
  const warmupSamples: Array<{ frame: number; commitMs: number; intervalMs: number }> = [];
  const samples: Array<{ frame: number; dirtyCount: number; commitMs: number; intervalMs: number }> = [];
  let previousFrameAt = await nextFrame();
  for (let frame = 1; frame <= warmupFrames + measuredFrames; frame++) {
    const now = await nextFrame();
    const intervalMs = now - previousFrameAt;
    previousFrameAt = now;
    const dirtyIds = selectDirtyIds(frame);
    const commitStarted = performance.now();
    controller.step(frame, dirtyIds);
    const commitMs = performance.now() - commitStarted;
    for (const id of dirtyIds) lastFrameById.set(id, frame);
    if (frame <= warmupFrames) {
      warmupSamples.push({ frame, commitMs, intervalMs });
    } else {
      samples.push({ frame, dirtyCount: dirtyIds.length, commitMs, intervalMs });
    }
    inspect(frame, identity);
    const d = controller.diagnostics();
    check(d.mounts === size && d.cleanups === 0 && d.writers === size,
      `Frame ${frame}: active lifecycle mismatch`, "lifecycle");
    if (errors.length) break;
  }

  const beforeDispose = controller.diagnostics();
  const disposeStarted = performance.now();
  controller.dispose();
  const disposeMs = performance.now() - disposeStarted;
  const afterDispose = controller.diagnostics();
  check(beforeDispose.mounts === size && beforeDispose.cleanups === 0,
    "Pre-disposal lifecycle mismatch", "lifecycle");
  check(afterDispose.mounts === size && afterDispose.cleanups === size && afterDispose.writers === 0,
    "Disposal did not release every row writer", "lifecycle");
  check(rows().length === 0, "Host retained rows after disposal", "lifecycle");
  try {
    controller.probeDeadSetters(1_000_000);
    check(rows().length === 0, "A dead setter repopulated the host", "deadSetters");
    check(controller.diagnostics().writers === 0, "A dead setter was re-registered", "deadSetters");
  } catch (error) {
    check(false, `Dead setter probe threw: ${String(error)}`, "deadSetters");
  }
  check(document.visibilityState === "visible", "Page became hidden during measurement", "visible");

  const result = {
    schemaVersion: "current-product-high-frequency-v1",
    status: Object.values(checks).every(Boolean) && errors.length === 0 && samples.length === measuredFrames
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
    mountMs,
    warmupSamples,
    samples,
    disposeMs,
    active: beforeDispose,
    afterDispose: controller.diagnostics(),
    deadSetterProbeCount: size,
    summary: {
      warmup: summarize(warmupSamples.map((sample) => sample.commitMs)),
      measured: summarize(samples.map((sample) => sample.commitMs)),
      measuredP95: summarize(samples.map((sample) => sample.commitMs))?.p95Ms ?? null,
    },
    timingContract: "dirtyIds are selected once by this shared harness before the commit timer; selection runs identically for both arms and is excluded. step includes per-ID setter dispatch and synchronous host commit. DOM inspection and correctness checks run after the timer.",
  };
  (window as typeof window & { __highFrequencyResult?: unknown }).__highFrequencyResult = result;
  status.textContent = `${arm} · ${size} rows · ${dirty}/${placement} · ${result.status}`;
  document.querySelector<HTMLElement>("#result")!.textContent = JSON.stringify(result, null, 2);
}

run().catch((error) => {
  status.textContent = String(error);
  document.querySelector<HTMLElement>("#result")!.textContent = JSON.stringify({
    schemaVersion: "current-product-high-frequency-v1",
    status: "ERROR",
    errors: [String(error)],
    arm,
    rows: size,
    dirty,
    placement,
    programs,
  }, null, 2);
});
