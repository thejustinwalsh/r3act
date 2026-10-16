/** Disposable Recording B count gate. Never imported by production source. */
export type CountUnit = "iteration" | "lookup" | "event" | "length" | "estimate" | "gauge";
export type CountValue = Readonly<{ value: number; unit: CountUnit; site: string }>;
export type CountReceipt = Readonly<{
  label: string;
  rootId: string;
  phase: "edit";
  completed: boolean;
  route: string | null;
  bails: readonly string[];
  errors: readonly string[];
  counts: Readonly<Record<string, CountValue>>;
  missing: Readonly<Record<string, Readonly<{ value: null; reason: string }>>>;
}>;

type MutableCount = { value: number; unit: CountUnit; site: string };
type Window = {
  root: object;
  rootId: string;
  label: string;
  counts: Map<string, MutableCount>;
  bails: string[];
  errors: string[];
  route: string | null;
  flushDepth: number;
  flushes: number;
};
const roots = new Map<object, string>();
let enabled = false;
let active: Window | null = null;

export const configureStructuralCountProbe = (value: boolean): void => {
  if (active) throw new Error("Cannot change structural probe mode in a count window");
  enabled = value;
};

export const registerStructuralRoot = (root: object, rootId: string): void => {
  if (active && root !== active.root) active.errors.push("another root created inside edit window");
  roots.set(root, rootId);
};
export const unregisterStructuralRoot = (root: object): void => {
  if (active?.root === root) active.errors.push("root disposed inside edit window");
  roots.delete(root);
};

export const beginStructuralCountWindow = (
  root: object,
  label: string,
): void => {
  if (!enabled) throw new Error("Structural count mode is disabled");
  if (active) throw new Error("A structural count window is already active");
  const rootId = roots.get(root);
  if (roots.size !== 1 || !rootId) {
    throw new Error("Structural count window requires exactly one registered root");
  }
  if (!label) throw new Error("Structural count window needs a label");
  active = { root, rootId, label, counts: new Map(), bails: [], errors: [], route: null,
    flushDepth: 0, flushes: 0 };
};

export const structuralCount = (
  name: string,
  unit: CountUnit,
  site: string,
  amount = 1,
): void => {
  const window = active;
  if (!window || !Number.isSafeInteger(amount) || amount < 0) return;
  const prior = window.counts.get(name);
  if (prior && (prior.unit !== unit || prior.site !== site)) {
    window.errors.push(`mixed authority: ${name}`);
    return;
  }
  if (prior) prior.value += amount;
  else window.counts.set(name, { value: amount, unit, site });
};

export const structuralRoute = (route: string): void => {
  if (!active) return;
  if (active.route !== null && active.route !== route) {
    active.errors.push(`multiple root routes: ${active.route}, ${route}`);
  }
  active.route = route;
};
export const structuralBail = (reason: string): void => { active?.bails.push(reason); };
export const structuralError = (reason: string): void => { active?.errors.push(reason); };

export const enterStructuralFlush = (root: object): void => {
  if (!active) return;
  if (root !== active.root) active.errors.push("another root flushed inside edit window");
  active.flushDepth++;
  active.flushes++;
  if (active.flushDepth !== 1) active.errors.push("reentrant root flush");
  structuralCount("root.flush.entries", "event", "component_state_runtime.ts:flush");
};
export const leaveStructuralFlush = (root: object): void => {
  if (!active) return;
  if (root !== active.root) active.errors.push("another root left edit window");
  active.flushDepth--;
  if (active.flushDepth < 0) active.errors.push("root flush depth underflow");
};

export const endStructuralCountWindow = (root: object): CountReceipt => {
  const window = active;
  if (!window || root !== window.root) throw new Error("Structural count window root mismatch");
  active = null;
  if (window.flushes !== 1) window.errors.push(`expected one flush, got ${window.flushes}`);
  if (window.flushDepth !== 0) window.errors.push("root flush remained active");
  if (roots.size !== 1 || roots.get(root) !== window.rootId) {
    window.errors.push("single bound root not retained through edit window");
  }
  if (!window.route) window.errors.push("missing exclusive root route");
  const counts: Record<string, CountValue> = {};
  for (const [name, value] of window.counts) counts[name] = Object.freeze({ ...value });
  return Object.freeze({
    label: window.label,
    rootId: window.rootId,
    phase: "edit",
    completed: window.errors.length === 0 && window.bails.length === 0,
    route: window.route,
    bails: Object.freeze([...window.bails]),
    errors: Object.freeze([...window.errors]),
    counts: Object.freeze(counts),
    missing: Object.freeze({
      "host.dispose.success": { value: null, reason: "DOM host has no dispose implementation" },
      "gc.deferred.work": { value: null, reason: "No synchronous iteration authority; requires separate GC evidence" },
      "user.effect.body.work": { value: null, reason: "User callback internals are outside runtime counter authority" },
      "bucket.native-splice.actual-shifts": { value: null, reason: "JS engine internal moves are not observable; estimate separately" },
      "host.layout-paint": { value: null, reason: "Synchronous count window does not measure presentation" },
    }),
  });
};
