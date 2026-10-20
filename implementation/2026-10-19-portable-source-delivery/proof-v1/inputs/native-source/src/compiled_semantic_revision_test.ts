import {
  captureCompiledSemanticRevision,
  compiledSemanticRevision,
  invalidateCompiledSemanticPlan,
  isCompiledSemanticRevisionCurrent,
  registerCompiledSemanticPlan,
  subscribeCompiledSemanticRevision,
  type CompiledSemanticPlan,
  type CompiledSemanticRevisionChange,
} from "./compiled_semantic_plan.ts";

const sourceFile = "revision-contract/native-module.tsx";
const plan = (moduleRevision: string): CompiledSemanticPlan => ({
  schema_version: 1,
  source_file: sourceFile,
  module_revision: moduleRevision,
  owners: [],
  sources: [],
  sinks: [],
  operations: [],
  graph: {
    coverage: "proven-sinks-only",
    source_to_sinks: {},
    execution_order: [],
  },
});
const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

Deno.test("compiled revision tokens revoke pending work across replacement and HMR invalidation", () => {
  const changes: CompiledSemanticRevisionChange[] = [];
  const unsubscribe = subscribeCompiledSemanticRevision((change) => {
    if (change.sourceFile === sourceFile) changes.push(change);
  });
  try {
    registerCompiledSemanticPlan(plan("revision-a"));
    const first = captureCompiledSemanticRevision(sourceFile, "revision-a");
    if (!first) throw new Error("missing first revision token");
    equal(isCompiledSemanticRevisionCurrent(first), true, "first token initially current");
    equal(captureCompiledSemanticRevision(sourceFile, "revision-b"), undefined, "mismatched revision rejected");

    registerCompiledSemanticPlan(plan("revision-b"));
    const second = captureCompiledSemanticRevision(sourceFile, "revision-b");
    if (!second) throw new Error("missing second revision token");
    equal(isCompiledSemanticRevisionCurrent(first), false, "replacement revoked first token");
    equal(isCompiledSemanticRevisionCurrent(second), true, "replacement token current");
    equal(invalidateCompiledSemanticPlan(sourceFile, "revision-a"), false, "old dispose cannot revoke new plan");
    equal(invalidateCompiledSemanticPlan(sourceFile, "revision-b"), true, "current HMR revision revoked");
    equal(compiledSemanticRevision(sourceFile), undefined, "invalidated plan unavailable");
    equal(isCompiledSemanticRevisionCurrent(second), false, "second token revoked");

    registerCompiledSemanticPlan(plan("revision-b"));
    equal(isCompiledSemanticRevisionCurrent(second), false, "same revision registration cannot revive stale work");
    equal(changes.length, 2, "replacement and invalidation each notify");
    equal(changes[0]?.previousRevision, "revision-a", "replacement previous revision");
    equal(changes[0]?.nextRevision, "revision-b", "replacement next revision");
    equal(changes[1]?.previousRevision, "revision-b", "invalidation previous revision");
    equal(changes[1]?.nextRevision, null, "invalidation has no next revision");
  } finally {
    unsubscribe();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});

Deno.test("one failing revision listener cannot hide invalidation from another root", () => {
  const firstError = new Error("listener failed");
  let observed = false;
  registerCompiledSemanticPlan(plan("listener-a"));
  const stopFailing = subscribeCompiledSemanticRevision((change) => {
    if (change.sourceFile === sourceFile) throw firstError;
  });
  const stopObserving = subscribeCompiledSemanticRevision((change) => {
    if (change.sourceFile === sourceFile) observed = true;
  });
  try {
    let caught: unknown;
    try { invalidateCompiledSemanticPlan(sourceFile, "listener-a"); } catch (error) {
      caught = error;
    }
    equal(caught, firstError, "listener error preserved");
    equal(observed, true, "later listener received invalidation");
    equal(compiledSemanticRevision(sourceFile), undefined, "plan retired despite listener error");
  } finally {
    stopFailing();
    stopObserving();
    invalidateCompiledSemanticPlan(sourceFile);
  }
});
