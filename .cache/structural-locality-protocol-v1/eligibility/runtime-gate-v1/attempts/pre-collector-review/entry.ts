import { mountNative } from "./native_controller.tsx";
import { mountReact } from "./react_controller.tsx";
import type { Life } from "../native_collection.tsx";

type Arm = "collection" | "generic" | "react";
type Result = { arm: Arm; checkpoints: unknown[]; final: unknown; status: "PASS" };
const fail = (message: string): never => { throw new Error(message); };
const equal = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    fail(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};
const initial = Array.from({ length: 128 }, (_, index) => `row-${index}`);
const trace: unknown[] = [];
const ordered = (host: HTMLElement) => [...host.querySelectorAll<HTMLLIElement>("li[data-id]")];
const signature = (host: HTMLElement) => ordered(host).map((row) => ({
  id: row.dataset.id, selected: row.dataset.selected, text: row.textContent,
}));

async function runArm(arm: Arm): Promise<Result> {
  const host = document.createElement("section");
  host.dataset.arm = arm;
  document.body.append(host);
  const mounts = new Map<string, number>();
  const cleanups = new Map<string, number>();
  const life: Life = {
    mounted(id) { mounts.set(id, (mounts.get(id) ?? 0) + 1); },
    cleaned(id) { cleanups.set(id, (cleanups.get(id) ?? 0) + 1); },
  };
  const counters: Readonly<Record<string, number>>[] = [];
  const controller = arm === "react"
    ? mountReact(host, initial, life)
    : mountNative(arm, host, initial, life, (values) => counters.push(values));
  let ids = [...initial];
  const selected = new Set<string>();
  const checkpoints: unknown[] = [];
  const inspect = (label: string, before?: Map<string, HTMLLIElement>, removed: string[] = [], added: string[] = []) => {
    const nodes = ordered(host);
    equal(nodes.map((node) => node.dataset.id), ids, `${arm}/${label}/order`);
    equal(signature(host), ids.map((id) => ({ id, selected: String(selected.has(id)), text: id })),
      `${arm}/${label}/output`);
    for (const id of ids) {
      if ((mounts.get(id) ?? 0) !== 1 || (cleanups.get(id) ?? 0) !== 0)
        fail(`${arm}/${label}/retained effect lifetime ${id}`);
    }
    if (before) {
      for (const node of nodes) {
        const id = node.dataset.id!;
        if (before.has(id) && before.get(id) !== node) fail(`${arm}/${label}/retained identity ${id}`);
        if (added.includes(id) && before.has(id)) fail(`${arm}/${label}/new node reused ${id}`);
      }
      for (const id of removed) {
        if ((cleanups.get(id) ?? 0) !== 1) fail(`${arm}/${label}/cleanup ${id}`);
      }
      for (const id of added) {
        if ((mounts.get(id) ?? 0) !== 1) fail(`${arm}/${label}/mount ${id}`);
      }
    }
    const checkpoint = { arm, label, signature: signature(host), mounts: Object.fromEntries(mounts),
      cleanups: Object.fromEntries(cleanups), counters: counters.at(-1) ?? null };
    checkpoints.push(checkpoint);
    trace.push(checkpoint);
  };
  try {
    inspect("mounted");
    for (const id of ["row-2", "row-0"]) {
      controller.click(id);
      selected.add(id);
    }
    inspect("selected");
    const edits = [
      { kind: "move" as const, removed: [], added: [] },
      { kind: "insert" as const, removed: [], added: ["fresh-head"] },
      { kind: "remove" as const, removed: ["fresh-head"], added: [] },
      { kind: "edge" as const, removed: ["row-127"], added: ["edge-new"] },
    ];
    // Build each next state from the live model; descriptors remain fixed.
    for (const edit of edits) {
      const before = new Map(ordered(host).map((node) => [node.dataset.id!, node]));
      const next = edit.kind === "move" ? [...ids.slice(1), ids[0]]
        : edit.kind === "insert" ? ["fresh-head", ...ids]
        : edit.kind === "remove" ? ids.filter((id) => id !== "fresh-head")
        : ["edge-new", ...ids.filter((id) => id !== "row-127")];
      const priorCounters = counters.length;
      const collectionStats = controller.edit(edit, next);
      ids = next;
      if (edit.kind === "remove") selected.delete("fresh-head");
      if (edit.kind === "edge") selected.delete("row-127");
      inspect(edit.kind, before, edit.removed, edit.added);
      if (arm === "collection") {
        if (counters.length !== priorCounters + 1) fail(`${edit.kind}: expected one profile event`);
        const profile = counters.at(-1)!;
        const expectedOps = edit.kind === "edge" ? 2 : 1;
        if (profile["collection.delta-operations"] !== expectedOps)
          fail(`${edit.kind}: delta path count ${profile["collection.delta-operations"]}`);
        if ((profile["collection.delta.render-fallback"] ?? 0) !== 0 ||
          (profile["collection.delta.stale-candidate"] ?? 0) !== 0 ||
          (profile["collection.delta.reader-expired"] ?? 0) !== 0)
          fail(`${edit.kind}: collection fallback ${JSON.stringify(profile)}`);
        const pathCheckpoint = { arm, label: `${edit.kind}-path`, profile, collectionStats };
        checkpoints.push(pathCheckpoint);
        trace.push(pathCheckpoint);
      }
    }
  } finally {
    const final = controller.dispose();
    if (host.childNodes.length !== 0) fail(`${arm}: nonempty disposed root`);
    if ((arm !== "react" && final.ownerCount !== 0) ||
      (arm === "collection" && final.readerCount !== 0) || final.setterRegistered)
      fail(`${arm}: disposal resources ${JSON.stringify(final)}`);
    for (const [id, count] of mounts) {
      if (cleanups.get(id) !== count) fail(`${arm}: lifecycle mismatch ${id}`);
    }
    host.remove();
  }
  return { arm, checkpoints, final: { mounts: Object.fromEntries(mounts),
    cleanups: Object.fromEntries(cleanups) }, status: "PASS" };
}

declare global { interface Window { __structuralRuntimeGate?: { run(): Promise<Result[]>; trace: unknown[] } } }
window.__structuralRuntimeGate = {
  trace,
  async run() {
    const results = [];
    for (const arm of ["collection", "generic", "react"] as const) results.push(await runArm(arm));
    const outputs = results.map((item) => item.checkpoints
      .filter((step: any) => ["mounted", "selected", "move", "insert", "remove", "edge"].includes(step.label))
      .map((step: any) => step.signature));
    equal(outputs[0], outputs[1], "native collection/generic output parity");
    equal(outputs[0], outputs[2], "native collection/React output parity");
    return results;
  },
};
