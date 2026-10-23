import { AsyncResource } from "./async_resource_runtime.js";
import { runDemandUnshared, } from "./async_task_demand.js";
import { isCompiledSemanticRevisionCurrent, subscribeCompiledSemanticRevision } from "./compiled_semantic_plan.js";
import { executeAsyncTaskPlan, prepareAsyncTaskGraph, prepareAsyncTaskPlan, } from "./async_task_scheduler.js";
const taskExecutionDefinition = Symbol("native.task-execution.definition");
/** A prepared compiler task remains valid only for its registered module plan. */
export const isPreparedNativeTaskDefinitionCurrent = (definition) => definition.tasks.every((task) => !task.compiled ||
    isCompiledSemanticRevisionCurrent(task.compiled.revisionToken));
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
};
const freezeList = (values) => Object.freeze([...values]);
const automaticCaptures = (task, inputs) => {
    let shareable = true;
    const captures = task.dependsOn.map((identity) => {
        const value = inputs.get(identity);
        const opaque = (value !== null && typeof value === "object") ||
            typeof value === "function" || typeof value === "symbol";
        if (opaque)
            shareable = false;
        const version = opaque ? "opaque" :
            typeof value === "number" && Object.is(value, -0)
                ? "number:-0" : `${typeof value}:${String(value)}`;
        return Object.freeze({ identity, version, value });
    });
    return Object.freeze({ captures: Object.freeze(captures), shareable });
};
/** Snapshot and validate task relations once for all input generations. */
export const prepareNativeTaskDefinition = (tasks) => {
    const taskSnapshot = Object.freeze(tasks.map((task) => Object.freeze({
        id: task.id,
        dependsOn: Object.freeze([...task.dependsOn]),
        run: task.run,
        ...(task.compiled ? { compiled: Object.freeze({ ...task.compiled,
                hardPrerequisites: Object.freeze([...task.compiled.hardPrerequisites]),
                controlInputs: Object.freeze([...task.compiled.controlInputs]),
            }) } : {}),
    })));
    const definition = Object.freeze({
        tasks: taskSnapshot,
        graph: prepareAsyncTaskGraph(taskSnapshot),
    });
    if (!isPreparedNativeTaskDefinitionCurrent(definition))
        throw new Error("Compiled task module revision is stale");
    return definition;
};
/** Start one input cut with stable task resources and candidate-owned results. */
export const createTaskExecutionFromDefinition = (definition, initialValues, options = {}) => {
    const { tasks: taskSnapshot, graph } = definition;
    if (!isPreparedNativeTaskDefinitionCurrent(definition))
        throw new Error("Compiled task module revision is stale");
    const compiledReuse = !!options.reuseCompleted &&
        taskSnapshot.some((task) => task.compiled);
    if (compiledReuse && options.reuseFrom?.[taskExecutionDefinition] !== definition)
        throw new Error("Compiled task output reuse requires prior code provenance");
    const demandBindings = options.demands ? new Map([...options.demands].map(([id, binding]) => [id, "definition" in binding
            ? Object.freeze({ definition: binding.definition, captures: binding.captures })
            : binding])) : undefined;
    const inputSnapshot = Object.freeze({ ...initialValues });
    const declaredExternalInputs = graph.externalInputs;
    const inputIds = Object.keys(inputSnapshot);
    const extraInputs = inputIds.filter((id) => !declaredExternalInputs.has(id));
    const missingInputs = [...declaredExternalInputs.keys()].filter((id) => !Object.hasOwn(inputSnapshot, id));
    if (extraInputs.length || missingInputs.length) {
        throw new Error(`Initial task inputs must exactly match declared external inputs (missing: ${missingInputs.join(", ") || "none"}; extra: ${extraInputs.join(", ") || "none"})`);
    }
    const started = [];
    const prepared = prepareAsyncTaskPlan(taskSnapshot, inputSnapshot, graph);
    const resources = new Map();
    const outputs = new Map();
    for (const task of taskSnapshot) {
        const output = deferred();
        outputs.set(task.id, output);
        resources.set(task.id, new AsyncResource(output.promise));
    }
    const priorSnapshot = compiledReuse ? options.reuseFrom.snapshot() : undefined;
    const reuseSnapshot = options.reuseCompleted
        ? {
            values: new Map(priorSnapshot?.completedValues ?? options.reuseCompleted.values),
            completed: Object.freeze([...(priorSnapshot?.completed ??
                    options.reuseCompleted.completed)]),
            changedInputs: Object.freeze([...options.reuseCompleted.changedInputs]),
        }
        : undefined;
    const controller = new AbortController();
    const externalSignal = options.signal;
    let status = "pending";
    let error;
    let isDisposed = false;
    let observerError = options.onObserverError;
    const completedValues = new Map();
    const completed = [];
    const reused = [];
    const demandOwners = new Map();
    const demandLeases = [];
    let unsubscribeRevision;
    const releaseDemands = () => {
        for (const lease of demandLeases.splice(0))
            lease.release();
    };
    const rejectOutstanding = (reason) => {
        for (const [id, output] of outputs) {
            if (resources.get(id)?.status.status === "pending")
                output.reject(reason);
        }
    };
    const cancel = (reason = new Error("Native task execution cancelled")) => {
        if (status !== "pending")
            return;
        status = "aborted";
        error = reason;
        controller.abort(reason);
        unsubscribeRevision?.();
        unsubscribeRevision = undefined;
        releaseDemands();
        rejectOutstanding(reason);
    };
    function onExternalAbort() {
        cancel(externalSignal?.reason);
    }
    if (externalSignal?.aborted)
        cancel(externalSignal.reason);
    else {
        externalSignal?.addEventListener("abort", onExternalAbort, {
            once: true,
        });
    }
    if (status === "pending" && taskSnapshot.some((task) => task.compiled)) {
        const sources = new Set(taskSnapshot.flatMap((task) => task.compiled ? [task.compiled.sourceFile] : []));
        unsubscribeRevision = subscribeCompiledSemanticRevision((change) => {
            if (sources.has(change.sourceFile) &&
                !isPreparedNativeTaskDefinitionCurrent(definition))
                cancel(new Error("Compiled task module revision is stale"));
        });
    }
    const completion = executeAsyncTaskPlan(taskSnapshot, inputSnapshot, {
        maxConcurrency: options.maxConcurrency,
        signal: controller.signal,
        reuseCompleted: reuseSnapshot,
        ...(observerError
            ? {
                onObserverError: (observerFailure) => {
                    try {
                        observerError?.(observerFailure);
                    }
                    catch {
                        // The scheduler also isolates its reporter; retain that guarantee at
                        // this adapter boundary if a caller replaces it during disposal.
                    }
                },
            }
            : {}),
        onTaskComplete: ({ taskId, value, reused: wasReused }) => {
            if (status !== "pending" || controller.signal.aborted)
                return;
            if (!isPreparedNativeTaskDefinitionCurrent(definition)) {
                cancel(new Error("Compiled task module revision is stale"));
                return;
            }
            const output = outputs.get(taskId);
            if (!output || resources.get(taskId)?.status.status !== "pending") {
                return;
            }
            completedValues.set(taskId, value);
            completed.push(taskId);
            if (wasReused)
                reused.push(taskId);
            output.resolve(value);
        },
        runTask: (task, inputs, signal) => {
            if (!isPreparedNativeTaskDefinitionCurrent(definition))
                throw new Error("Compiled task module revision is stale");
            const binding = demandBindings?.get(task.id);
            if (!binding)
                return task.run(inputs, signal);
            const definition = "definition" in binding ? binding.definition : binding;
            const automatic = "definition" in binding ? null : automaticCaptures(task, inputs);
            const captures = "definition" in binding
                ? binding.captures(inputs) : automatic.captures;
            if (automatic && !automatic.shareable)
                return runDemandUnshared(definition, captures, signal);
            let owner = demandOwners.get(task.id);
            if (!owner)
                demandOwners.set(task.id, owner = {});
            const lease = options.demandScope?.acquire(definition, owner, captures);
            if (!lease)
                return runDemandUnshared(definition, captures, signal);
            demandLeases.push(lease);
            return lease.result;
        },
    }, prepared, started).then((result) => {
        if (!isDisposed) {
            if (status === "pending")
                status = result.status;
            completed.length = 0;
            completed.push(...result.completed);
            reused.length = 0;
            reused.push(...result.reused);
            for (const [id, value] of result.values) {
                if (resources.get(id)?.status.status === "fulfilled") {
                    completedValues.set(id, value);
                }
            }
            if (result.status === "aborted") {
                const reason = controller.signal.reason ??
                    new Error("Native task execution aborted");
                error ??= reason;
                rejectOutstanding(reason);
            }
        }
        return result;
    }, (failure) => {
        if (!isDisposed) {
            status = "failed";
            error = failure;
            rejectOutstanding(failure);
        }
        throw failure;
    }).finally(() => {
        unsubscribeRevision?.();
        unsubscribeRevision = undefined;
        releaseDemands();
        externalSignal?.removeEventListener("abort", onExternalAbort);
    });
    // Keep a rejection handled even if a consumer only observes individual
    // resources. The returned completion promise still rejects for the caller.
    void completion.catch(() => { });
    const snapshot = () => Object.freeze({
        status,
        started: freezeList(started),
        completed: freezeList(completed),
        reused: freezeList(reused),
        completedValues: new Map(completedValues),
        ...(error !== undefined ? { error } : {}),
    });
    const dispose = () => {
        if (isDisposed)
            return;
        if (status === "pending") {
            cancel(new Error("Native task execution disposed"));
        }
        isDisposed = true;
        unsubscribeRevision?.();
        unsubscribeRevision = undefined;
        releaseDemands();
        resources.clear();
        outputs.clear();
        completedValues.clear();
        observerError = undefined;
        externalSignal?.removeEventListener("abort", onExternalAbort);
    };
    return {
        [taskExecutionDefinition]: definition,
        resource(id) {
            const resource = resources.get(id);
            if (!resource) {
                throw new Error(isDisposed
                    ? "Native task execution has been disposed"
                    : `Unknown task resource: ${String(id)}`);
            }
            return resource;
        },
        completion,
        snapshot,
        cancel,
        dispose,
    };
};
/** Allocate one execution from externally authored task declarations. */
export const createTaskExecution = (tasks, initialValues, options = {}) => createTaskExecutionFromDefinition(prepareNativeTaskDefinition(tasks), initialValues, options);
//# sourceMappingURL=native_task_execution.js.map