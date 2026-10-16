import {
  beginStructuralCountWindow,
  configureStructuralCountProbe,
  endStructuralCountWindow,
  enterStructuralFlush,
  leaveStructuralFlush,
  registerStructuralRoot,
  structuralBail,
  structuralCount,
  structuralError,
  structuralRoute,
  unregisterStructuralRoot,
} from "./snapshot/src/structural_count_probe.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("one edit window preserves units and explicit missing values", () => {
  const root = {};
  configureStructuralCountProbe(true);
  registerStructuralRoot(root, "fixture-root");
  beginStructuralCountWindow(root, "insert-head-128");
  structuralCount("owner.lineage.parent-steps", "iteration", "site", 3);
  structuralCount("host.place.attempts", "event", "host", 1);
  structuralCount("vdom.array-length", "length", "array", 128);
  structuralCount("bucket.shift-estimate", "estimate", "splice", 7);
  enterStructuralFlush(root);
  structuralRoute("collection-delta");
  leaveStructuralFlush(root);
  const receipt = endStructuralCountWindow(root);
  assert(receipt.completed && receipt.rootId === "fixture-root", "completed/root");
  assert(receipt.counts["owner.lineage.parent-steps"]?.value === 3, "iteration");
  assert(receipt.counts["vdom.array-length"]?.unit === "length", "length authority");
  assert(receipt.counts["bucket.shift-estimate"]?.unit === "estimate", "estimate authority");
  assert(receipt.missing["gc.deferred.work"]?.value === null, "missing null");
  unregisterStructuralRoot(root);
  configureStructuralCountProbe(false);
});

Deno.test("extra root, reentrancy, bail, error and incomplete window fail", () => {
  const root = {};
  const other = {};
  configureStructuralCountProbe(true);
  registerStructuralRoot(root, "fixture-root");
  beginStructuralCountWindow(root, "remove-head-128");
  registerStructuralRoot(other, "other-root");
  unregisterStructuralRoot(other);
  enterStructuralFlush(root);
  enterStructuralFlush(root);
  structuralRoute("full-reconcile");
  structuralBail("delta-declined");
  structuralError("synthetic failure");
  leaveStructuralFlush(root);
  leaveStructuralFlush(root);
  const receipt = endStructuralCountWindow(root);
  assert(!receipt.completed, "incomplete receipt rejected");
  assert(receipt.errors.some((item) => item.includes("another root created")), "extra root");
  assert(receipt.errors.some((item) => item.includes("reentrant")), "reentrancy");
  assert(receipt.bails.includes("delta-declined"), "bail retained");
  unregisterStructuralRoot(root);
  configureStructuralCountProbe(false);
});

Deno.test("mixed authority and invalid amounts invalidate without throwing", () => {
  const root = {};
  configureStructuralCountProbe(true);
  registerStructuralRoot(root, "fixture-root");
  beginStructuralCountWindow(root, "invalid-count");
  structuralCount("probe.count", "iteration", "site", Number.MAX_SAFE_INTEGER);
  structuralCount("probe.count", "iteration", "site", 1);
  structuralCount("probe.count", "event", "site", 1);
  structuralCount("probe.negative", "iteration", "site", -1);
  structuralCount("probe.fractional", "iteration", "site", 1.5);
  structuralCount("probe.nan", "iteration", "site", Number.NaN);
  enterStructuralFlush(root);
  structuralRoute("collection-delta");
  leaveStructuralFlush(root);
  const receipt = endStructuralCountWindow(root);
  assert(!receipt.completed && receipt.errors.length >= 5, "invalid receipt");
  assert(receipt.counts["probe.count"]?.value === Number.MAX_SAFE_INTEGER,
    "overflow did not corrupt prior count");
  assert(receipt.counts["probe.negative"] === undefined, "negative not counted");
  unregisterStructuralRoot(root);
  configureStructuralCountProbe(false);
});

Deno.test("disabled gate and disposal clear root registration", () => {
  const root = {};
  configureStructuralCountProbe(false);
  registerStructuralRoot(root, "fixture-root");
  structuralCount("inactive", "event", "site");
  let refused = false;
  try { beginStructuralCountWindow(root, "disabled"); }
  catch { refused = true; }
  assert(refused, "disabled begin refused");
  configureStructuralCountProbe(true);
  beginStructuralCountWindow(root, "dispose-inside-window");
  enterStructuralFlush(root);
  structuralRoute("collection-delta");
  leaveStructuralFlush(root);
  unregisterStructuralRoot(root);
  const receipt = endStructuralCountWindow(root);
  assert(!receipt.completed && receipt.errors.some((item) => item.includes("disposed")),
    "disposed root invalidated");
  configureStructuralCountProbe(false);
});
