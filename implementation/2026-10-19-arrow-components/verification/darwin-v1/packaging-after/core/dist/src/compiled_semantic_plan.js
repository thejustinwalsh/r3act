const currentPlans = new Map();
const revisionListeners = new Set();
const notifyRevisionListeners = (change) => {
    const errors = [];
    for (const listener of [...revisionListeners]) {
        try {
            listener(change);
        }
        catch (error) {
            errors.push(error);
        }
    }
    if (errors.length === 1)
        throw errors[0];
    if (errors.length > 1)
        throw new AggregateError(errors, "Compiled semantic revision listeners failed");
};
const planIdentity = Symbol("compiled-semantic-plan-identity");
const snapshotPlan = (plan) => Object.freeze({
    schema_version: 1,
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
        coverage: "proven-sinks-only",
        source_to_sinks: Object.freeze(Object.fromEntries(Object.entries(plan.graph.source_to_sinks).map(([source, sinks]) => [source, Object.freeze([...sinks])]))),
        execution_order: Object.freeze([...plan.graph.execution_order]),
    }),
});
/** Register inspection metadata; callers must never treat this public value as purity proof. */
export function registerCompiledSemanticPlan(input) {
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
    if (previous?.module_revision === input.module_revision)
        return previous;
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
export function inspectCompiledSemanticPlan(sourceFile) {
    return currentPlans.get(sourceFile);
}
export function compiledSemanticRevision(sourceFile) {
    return currentPlans.get(sourceFile)?.module_revision;
}
/** Capture the registered plan identity before preparing work from its module. */
export function captureCompiledSemanticRevision(sourceFile, expectedRevision) {
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
export function isCompiledSemanticRevisionCurrent(token) {
    return currentPlans.get(token.sourceFile) === token[planIdentity];
}
/** Revoke work compiled before a module edit, prior to conservative full reload. */
export function invalidateCompiledSemanticPlan(sourceFile, expectedRevision) {
    const previous = currentPlans.get(sourceFile);
    if (!previous ||
        (expectedRevision !== undefined && previous.module_revision !== expectedRevision))
        return false;
    currentPlans.delete(sourceFile);
    const change = Object.freeze({
        sourceFile,
        previousRevision: previous.module_revision,
        nextRevision: null,
    });
    notifyRevisionListeners(change);
    return true;
}
export function subscribeCompiledSemanticRevision(listener) {
    revisionListeners.add(listener);
    return () => revisionListeners.delete(listener);
}
//# sourceMappingURL=compiled_semantic_plan.js.map