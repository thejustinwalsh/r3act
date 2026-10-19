/** Read-only compiler proof and capability hints for one native module revision. */
export type CompiledSemanticPlan = Readonly<{
  schema_version: 1;
  source_file: string;
  module_revision: string;
  owners: readonly Readonly<{ site_id: string; repeated_scope: "runtime-keyed-owner" }>[];
  sources: readonly Readonly<{
    site_id: string;
    owner_site_id: string;
    kind: "state" | "use-input";
    provenance: "tracked" | "opaque";
  }>[];
  sinks: readonly Readonly<{
    site_id: string;
    owner_site_id: string;
    source_sites: readonly string[];
    provenance: "closed" | "opaque";
    equality: "object-is" | "adapter-declared";
    host_value: "scalar" | "adapter-declared";
    retention: "value" | "adapter-declared";
    execution: "compiled-binding" | "generic";
  }>[];
  operations: readonly Readonly<{
    site_id: string;
    owner_site_id: string | null;
    kind: "use-store-or-resource" | "collection" | "activation-effect" | "async-task";
    provenance: "opaque";
    source_sites: readonly string[];
  }>[];
  graph: Readonly<{
    coverage: "proven-sinks-only";
    source_to_sinks: Readonly<Record<string, readonly string[]>>;
    execution_order: readonly string[];
  }>;
}>;

export type CompiledSemanticRevisionChange = Readonly<{
  sourceFile: string;
  previousRevision: string;
  nextRevision: string | null;
}>;

const currentPlans = new Map<string, CompiledSemanticPlan>();
const revisionListeners = new Set<(change: CompiledSemanticRevisionChange) => void>();
const notifyRevisionListeners = (change: CompiledSemanticRevisionChange) => {
  const errors: unknown[] = [];
  for (const listener of [...revisionListeners]) {
    try {
      listener(change);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, "Compiled semantic revision listeners failed");
};
const planIdentity = Symbol("compiled-semantic-plan-identity");

export type CompiledSemanticRevisionToken = Readonly<{
  sourceFile: string;
  moduleRevision: string;
  [planIdentity]: CompiledSemanticPlan;
}>;

const snapshotPlan = (plan: CompiledSemanticPlan): CompiledSemanticPlan => Object.freeze({
  schema_version: 1 as const,
  source_file: plan.source_file,
  module_revision: plan.module_revision,
  owners: Object.freeze(plan.owners.map((owner) => Object.freeze({ ...owner }))),
  sources: Object.freeze(plan.sources.map((source) => Object.freeze({ ...source }))),
  sinks: Object.freeze(plan.sinks.map((sink) => Object.freeze({
    ...sink,
    source_sites: Object.freeze([...sink.source_sites]),
  }))),
  operations: Object.freeze(plan.operations.map((operation) => Object.freeze({
    ...operation,
    source_sites: Object.freeze([...operation.source_sites]),
  }))),
  graph: Object.freeze({
    coverage: "proven-sinks-only" as const,
    source_to_sinks: Object.freeze(Object.fromEntries(
      Object.entries(plan.graph.source_to_sinks).map(([source, sinks]) => [source, Object.freeze([...sinks])]),
    )),
    execution_order: Object.freeze([...plan.graph.execution_order]),
  }),
});

/** Register inspection metadata; callers must never treat this public value as purity proof. */
export function registerCompiledSemanticPlan(input: CompiledSemanticPlan): CompiledSemanticPlan {
  if (!input || input.schema_version !== 1 || !input.source_file ||
    !input.module_revision || !Array.isArray(input.owners) ||
    !Array.isArray(input.sources) || !Array.isArray(input.sinks) ||
    !Array.isArray(input.operations) || !input.graph ||
    !Array.isArray(input.graph.execution_order) ||
    input.graph.coverage !== "proven-sinks-only" ||
    !input.graph.source_to_sinks || typeof input.graph.source_to_sinks !== "object") {
    throw new TypeError("Invalid compiled semantic plan");
  }
  const previous = currentPlans.get(input.source_file);
  if (previous?.module_revision === input.module_revision) return previous;
  const plan = snapshotPlan(input);
  currentPlans.set(plan.source_file, plan);
  if (previous) {
    const change = Object.freeze({
      sourceFile: plan.source_file,
      previousRevision: previous.module_revision,
      nextRevision: plan.module_revision,
    });
    notifyRevisionListeners(change);
  }
  return plan;
}

/** Inspect compiler evidence without granting purity to extension metadata. */
export function inspectCompiledSemanticPlan(sourceFile: string): CompiledSemanticPlan | undefined {
  return currentPlans.get(sourceFile);
}

export function compiledSemanticRevision(sourceFile: string): string | undefined {
  return currentPlans.get(sourceFile)?.module_revision;
}

/** Capture the registered plan identity before preparing work from its module. */
export function captureCompiledSemanticRevision(
  sourceFile: string,
  expectedRevision?: string,
): CompiledSemanticRevisionToken | undefined {
  const plan = currentPlans.get(sourceFile);
  if (!plan || (expectedRevision !== undefined && plan.module_revision !== expectedRevision)) {
    return undefined;
  }
  return Object.freeze({
    sourceFile,
    moduleRevision: plan.module_revision,
    [planIdentity]: plan,
  });
}

/** A retired plan stays stale even if the same revision string registers again. */
export function isCompiledSemanticRevisionCurrent(
  token: CompiledSemanticRevisionToken,
): boolean {
  return currentPlans.get(token.sourceFile) === token[planIdentity];
}

/** Revoke work compiled before a module edit, prior to conservative full reload. */
export function invalidateCompiledSemanticPlan(
  sourceFile: string,
  expectedRevision?: string,
): boolean {
  const previous = currentPlans.get(sourceFile);
  if (!previous ||
    (expectedRevision !== undefined && previous.module_revision !== expectedRevision)) return false;
  currentPlans.delete(sourceFile);
  const change = Object.freeze({
    sourceFile,
    previousRevision: previous.module_revision,
    nextRevision: null,
  });
  notifyRevisionListeners(change);
  return true;
}

export function subscribeCompiledSemanticRevision(
  listener: (change: CompiledSemanticRevisionChange) => void,
): () => void {
  revisionListeners.add(listener);
  return () => revisionListeners.delete(listener);
}
