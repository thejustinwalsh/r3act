import { AsyncResource } from "./async_resource_runtime.js";
import { executeAsyncTaskPlan, prepareAsyncTaskPlan, } from "./async_task_scheduler.js";
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
/**
 * Start a typed task graph and expose one stable AsyncResource per task.
 * Resources are allocated before the scheduler can invoke any task callback.
 */
export const createTaskExecution = (tasks, initialValues, options = {}) => {
    // Snapshot the plan and inputs before validation or task startup so caller
    // mutations cannot change edges or external values after this call returns.
    const taskIds = new Set();
    const taskSnapshot = Object.freeze(tasks.map((task) => {
        if (!task.id || taskIds.has(task.id)) {
            throw new Error(`Async task IDs must be unique and non-empty: ${task.id}`);
        }
        taskIds.add(task.id);
        return Object.freeze({
            id: task.id,
            dependsOn: Object.freeze([...task.dependsOn]),
            run: task.run,
        });
    }));
    const inputSnapshot = Object.freeze({ ...initialValues });
    const declaredExternalInputs = new Set();
    for (const task of taskSnapshot) {
        for (const dependency of task.dependsOn) {
            if (!taskIds.has(dependency))
                declaredExternalInputs.add(dependency);
        }
    }
    const inputIds = Object.keys(inputSnapshot);
    const extraInputs = inputIds.filter((id) => !declaredExternalInputs.has(id));
    const missingInputs = [...declaredExternalInputs].filter((id) => !Object.hasOwn(inputSnapshot, id));
    if (extraInputs.length || missingInputs.length) {
        throw new Error(`Initial task inputs must exactly match declared external inputs (missing: ${missingInputs.join(", ") || "none"}; extra: ${extraInputs.join(", ") || "none"})`);
    }
    const runtimeTasks = [];
    const started = [];
    for (const task of taskSnapshot) {
        runtimeTasks.push({
            id: task.id,
            dependsOn: task.dependsOn,
            run: (inputs, signal) => {
                started.push(task.id);
                return task.run(inputs, signal);
            },
        });
    }
    const frozenRuntimeTasks = Object.freeze(runtimeTasks);
    const prepared = prepareAsyncTaskPlan(frozenRuntimeTasks, inputSnapshot);
    const resources = new Map();
    const outputs = new Map();
    for (const task of taskSnapshot) {
        const output = deferred();
        outputs.set(task.id, output);
        resources.set(task.id, new AsyncResource(output.promise));
    }
    const reuseSnapshot = options.reuseCompleted
        ? {
            values: new Map(options.reuseCompleted.values),
            completed: Object.freeze([...options.reuseCompleted.completed]),
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
    const completion = executeAsyncTaskPlan(frozenRuntimeTasks, inputSnapshot, {
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
    }, prepared).then((result) => {
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
        resources.clear();
        outputs.clear();
        completedValues.clear();
        observerError = undefined;
        externalSignal?.removeEventListener("abort", onExternalAbort);
    };
    return {
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
//# sourceMappingURL=native_task_execution.js.map