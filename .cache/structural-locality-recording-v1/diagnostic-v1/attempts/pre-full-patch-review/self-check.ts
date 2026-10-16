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
