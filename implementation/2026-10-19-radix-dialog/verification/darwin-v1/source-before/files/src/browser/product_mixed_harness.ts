/// <reference types="vite/client" />
import type { ProductMixedController, ProductMixedEdit } from "./product_mixed_contract.ts";
import { productMixedState } from "./product_mixed_contract.ts";
import { productMixedFrames, productMixedWarmup, productMixedTopologyEvery, productMixedSchedule } from "./product_mixed_schedule.ts";
import "./product_mixed.css";

const params = new URLSearchParams(location.search);
const confirm = params.get("mode") === "confirm";
if (confirm && !import.meta.env.PROD) throw new Error("Confirmation requires the locked production build");
const sequence = Number(params.get("sequence") ?? -1);
const scheduled = confirm ? productMixedSchedule[sequence] : undefined;
if (confirm && !scheduled) throw new Error("Invalid frozen sequence");
const arm = scheduled?.arm ?? params.get("arm") ?? "native";
if (arm !== "native" && arm !== "react") throw new Error("Unknown arm");
const size = scheduled?.size ?? Number(params.get("size") ?? 128);
if (![128, 512, 1024].includes(size)) throw new Error("Unknown size");
const warmup = confirm ? productMixedWarmup : 5;
const frames = confirm ? productMixedFrames : 60;
const app = document.querySelector<HTMLElement>("#app")!;
const status = document.querySelector<HTMLElement>("#status")!;
const errors: string[] = [];
const checks = { output: true, identity: true, lifecycle: true, visible: true, order: true };
const samples: { frame: number; structural: boolean; commitMs: number; intervalMs: number }[] = [];
let ids = Array.from({ length: size }, (_, i) => i);
let nextId = size;
let controller: ProductMixedController | undefined;
let disposed = false;
let hidden = document.visibilityState !== "visible";
let result: unknown;
document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") hidden = true; });
const nextFrame = () => new Promise<number>(resolve => requestAnimationFrame(resolve));
const fail = (message: string) => { errors.push(message); };
const nodes = () => Array.from(app.querySelectorAll<HTMLElement>("i.entity"));
const inspect = (frame: number, before?: Map<number, HTMLElement>) => {
  const current = nodes();
  if (current.length !== size) { checks.output = false; fail(`Node count at ${frame}`); }
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    const node = current[index];
    const expected = productMixedState(id, frame);
    if (!node || Number(node.dataset.id) !== id) { checks.order = false; fail(`Order at ${frame}:${id}`); continue; }
    if (node.style.left !== `${expected.x}px` || node.style.top !== `${expected.y}px` || node.style.transform !== `rotate(${expected.rotation}deg)`) {
      checks.output = false; fail(`Props at ${frame}:${id}`);
    }
    if (before?.has(id) && before.get(id) !== node) { checks.identity = false; fail(`Identity at ${frame}:${id}`); }
  }
};
const dispose = () => { if (disposed) return; disposed = true; controller?.dispose(); };
window.addEventListener("pagehide", dispose, { once: true });
const summarize = (values: readonly number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a,b) => a-b);
  return { medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1] };
};

async function run() {
  const factory = arm === "native"
    ? (await import("./native_product_mixed_arm.tsx")).createProductMixedNative
    : (await import("./product_mixed_react_arm.tsx")).createProductMixedReact;
  const startMount = performance.now();
  controller = factory(app, ids);
  const mountMs = performance.now() - startMount;
  inspect(0);
  let previousTime = await nextFrame();
  let structuralCount = 0;
  for (let frame = 1; frame <= warmup + frames; frame++) {
    const now = await nextFrame();
    const intervalMs = now - previousTime;
    previousTime = now;
    const structural = frame > warmup && (frame - warmup) % productMixedTopologyEvery === 0;
    let edit: ProductMixedEdit | undefined;
    let before: Map<number, HTMLElement> | undefined;
    if (structural) {
      before = new Map(nodes().map(node => [Number(node.dataset.id), node]));
      const removed = ids.slice(0, 8);
      const inserted = Array.from({ length: 8 }, () => nextId++);
      const combined = [...ids.slice(8), ...inserted];
      const offset = Math.min(13, combined.length - 1);
      ids = [...combined.slice(offset), ...combined.slice(0, offset)];
      edit = { removed, inserted, ids };
      structuralCount++;
    }
    const started = performance.now();
    controller.step(frame, edit);
    const commitMs = performance.now() - started;
    if (frame > warmup) samples.push({ frame, structural, commitMs, intervalMs });
    inspect(frame, before);
    const d = controller.diagnostics();
    if (d.writers !== size || d.mounts !== size + structuralCount * 8 || d.cleanups !== structuralCount * 8) {
      checks.lifecycle = false; fail(`Lifetime at ${frame}`);
    }
    if (errors.length) break;
  }
  const active = controller.diagnostics();
  const startDispose = performance.now();
  dispose();
  const disposeMs = performance.now() - startDispose;
  const after = controller.diagnostics();
  if (after.writers !== 0 || after.mounts !== after.cleanups || nodes().length !== 0) { checks.lifecycle = false; fail("Teardown"); }
  checks.visible = !hidden;
  result = {
    schemaVersion: 2, study: "compiled-product-mixed-v2", mode: confirm ? "confirm" : "pilot", arm, size, sequence,
    pair: scheduled?.pair ?? null, production: import.meta.env.PROD, userAgent: navigator.userAgent,
    timeOrigin: performance.timeOrigin, collectedAt: new Date().toISOString(), warmup, frames,
    status: errors.length === 0 && !hidden && samples.length === frames ? "PASS" : "FAIL",
    checks, errors, mountMs, disposeMs, active, after, samples,
    summary: { all: summarize(samples.map(s => s.commitMs)), ordinary: summarize(samples.filter(s => !s.structural).map(s => s.commitMs)), structural: summarize(samples.filter(s => s.structural).map(s => s.commitMs)), interval: summarize(samples.map(s => s.intervalMs)) },
  };
  status.textContent = `${arm} · ${size} rows · ${(result as {status:string}).status}`;
  document.querySelector("#result")!.textContent = JSON.stringify({ ...result as object, samples: `${samples.length} retained frame records` }, null, 2);
}
Object.defineProperty(window, "__productMixed", { configurable: true, value: { result: () => result, dispose } });
run().catch(error => {
  dispose();
  result = { status: "ERROR", arm, size, errors: [String(error)], samples, production: import.meta.env.PROD };
  status.textContent = String(error);
});
