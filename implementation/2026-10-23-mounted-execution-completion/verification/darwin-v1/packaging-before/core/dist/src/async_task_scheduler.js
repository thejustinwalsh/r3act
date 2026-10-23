/** Validate static task relations once, without invoking task callbacks. */
export const prepareAsyncTaskGraph = (taskSpecs) => {
    const taskById = new Map();
    const orderById = new Map();
    for (let index = 0; index < taskSpecs.length; index++) {
        const task = taskSpecs[index];
        if (!task.id || taskById.has(task.id)) {
            throw new Error(`Async task IDs must be unique and non-empty: ${task.id}`);
        }
        taskById.set(task.id, task);
        orderById.set(task.id, index);
    }
    const dependents = new Map();
    const unresolved = new Map();
    const externalInputs = new Map();
    for (const task of taskSpecs) {
        const seen = new Set();
        let taskPrerequisites = 0;
        for (const dependency of task.dependsOn) {
            if (seen.has(dependency)) {
                throw new Error(`Duplicate dependency ${dependency} in task ${task.id}`);
            }
            seen.add(dependency);
            if (!taskById.has(dependency)) {
                if (!externalInputs.has(dependency))
                    externalInputs.set(dependency, task.id);
                continue;
            }
            taskPrerequisites++;
            const children = dependents.get(dependency) ?? [];
            children.push(task.id);
            dependents.set(dependency, children);
        }
        unresolved.set(task.id, taskPrerequisites);
    }
    const validationCounts = new Map(unresolved);
    const validationReady = taskSpecs.filter((task) => validationCounts.get(task.id) === 0).map((task) => task.id);
    let validated = 0;
    for (let cursor = 0; cursor < validationReady.length; cursor++) {
        const taskId = validationReady[cursor];
        validated++;
        for (const child of dependents.get(taskId) ?? []) {
            const count = validationCounts.get(child) - 1;
            validationCounts.set(child, count);
            if (count === 0)
                validationReady.push(child);
        }
    }
    if (validated !== taskSpecs.length) {
        throw new Error("Async task plan contains a dependency cycle");
    }
    return {
        taskSpecs,
        taskById,
        orderById,
        dependents,
        unresolved,
        externalInputs,
    };
};
export const prepareAsyncTaskPlan = (taskSpecs, initialValues = {}, graph = prepareAsyncTaskGraph(taskSpecs)) => {
    if (graph.taskSpecs !== taskSpecs) {
        throw new Error("Prepared async task graph does not match task declarations");
    }
    for (const taskId of graph.taskById.keys()) {
        if (Object.hasOwn(initialValues, taskId)) {
            throw new Error(`Task ID collides with initial value: ${taskId}`);
        }
    }
    for (const [dependency, taskId] of graph.externalInputs) {
        if (!Object.hasOwn(initialValues, dependency)) {
            throw new Error(`Task ${taskId} depends on unknown value ${dependency}`);
        }
    }
    return { ...graph, initialValues };
};
/**
 * Execute a declared async task DAG with bounded concurrency.
 *
 * Independent tasks start together. A task starts as soon as its own task
 * dependencies settle, without waiting for unrelated branches. Results stay in
 * a candidate-local map; callers decide when to publish them to UI roots.
 * This overlaps async work on the event loop and does not parallelize CPU work.
 */
export const executeAsyncTaskPlan = async (taskSpecs, initialValues = {}, options = {}, prepared, 
/** @internal Candidate-local live start ledger. */
startedSink) => {
    const maxConcurrency = options.maxConcurrency ?? Number.POSITIVE_INFINITY;
    if (!(maxConcurrency === Number.POSITIVE_INFINITY ||
        Number.isSafeInteger(maxConcurrency)) || maxConcurrency < 1) {
        throw new RangeError("maxConcurrency must be a positive integer or Infinity");
    }
    const preparedPlan = prepared ??
        prepareAsyncTaskPlan(taskSpecs, initialValues);
    if (preparedPlan.taskSpecs !== taskSpecs ||
        preparedPlan.initialValues !== initialValues) {
        throw new Error("Prepared async task plan does not match execution inputs");
    }
    const { taskById, orderById, dependents } = preparedPlan;
    const values = new Map(Object.entries(initialValues));
    const started = [];
    const completed = [];
    const reused = [];
    const reusedOutputs = [];
    const reuse = options.reuseCompleted;
    if (reuse) {
        const changedInputs = new Set(reuse.changedInputs);
        const invalidated = new Set();
        const invalidationQueue = [];
        for (const task of taskSpecs) {
            if (task.dependsOn.some((dependency) => changedInputs.has(dependency))) {
                invalidated.add(task.id);
                invalidationQueue.push(task.id);
            }
        }
        for (let cursor = 0; cursor < invalidationQueue.length; cursor++) {
            for (const child of dependents.get(invalidationQueue[cursor]) ?? []) {
                if (invalidated.has(child))
                    continue;
                invalidated.add(child);
                invalidationQueue.push(child);
            }
        }
        const seenCompleted = new Set();
        for (const taskId of reuse.completed) {
            if (seenCompleted.has(taskId)) {
                throw new Error(`Duplicate reusable task output: ${taskId}`);
            }
            seenCompleted.add(taskId);
            if (!taskById.has(taskId) || !reuse.values.has(taskId)) {
                throw new Error(`Missing reusable task output: ${taskId}`);
            }
            if (invalidated.has(taskId))
                continue;
            values.set(taskId, reuse.values.get(taskId));
            reused.push(taskId);
            completed.push(taskId);
            reusedOutputs.push({
                taskId,
                value: reuse.values.get(taskId),
                reused: true,
            });
        }
    }
    const reusable = new Set(reused);
    const unresolved = new Map();
    for (const task of taskSpecs) {
        let count = 0;
        for (const dependency of task.dependsOn) {
            if (!values.has(dependency))
                count++;
        }
        unresolved.set(task.id, count);
    }
    const ready = [];
    const readyBefore = (left, right) => orderById.get(left) < orderById.get(right);
    const enqueueReady = (taskId) => {
        let index = ready.length;
        ready.push(taskId);
        while (index > 0) {
            const parent = (index - 1) >>> 1;
            if (!readyBefore(taskId, ready[parent]))
                break;
            ready[index] = ready[parent];
            index = parent;
        }
        ready[index] = taskId;
    };
    const dequeueReady = () => {
        const first = ready[0];
        const last = ready.pop();
        if (ready.length === 0)
            return first;
        let index = 0;
        while (true) {
            const left = index * 2 + 1;
            if (left >= ready.length)
                break;
            const right = left + 1;
            const child = right < ready.length && readyBefore(ready[right], ready[left])
                ? right
                : left;
            if (!readyBefore(ready[child], last))
                break;
            ready[index] = ready[child];
            index = child;
        }
        ready[index] = last;
        return first;
    };
    for (const task of taskSpecs) {
        if (!reusable.has(task.id) && unresolved.get(task.id) === 0) {
            enqueueReady(task.id);
        }
    }
    const controller = new AbortController();
    let running = 0;
    let settled = reused.length;
    let hasFailure = false;
    let failure;
    let wake = () => { };
    const externalSignal = options.signal;
    const abort = () => {
        controller.abort(externalSignal?.reason);
        wake();
    };
    if (externalSignal?.aborted)
        abort();
    else
        externalSignal?.addEventListener("abort", abort, { once: true });
    const reportObserverError = (error, event) => {
        try {
            if (options.onObserverError) {
                const reported = options.onObserverError(error, event);
                if (reported &&
                    (typeof reported === "object" || typeof reported === "function")) {
                    void Promise.resolve(reported).catch(() => { });
                }
            }
            else
                console.error("Async task completion observer failed", error);
        }
        catch {
            // Observers and their error reporters cannot alter scheduler outcomes.
        }
    };
    const notifyTaskComplete = (event) => {
        if (controller.signal.aborted || !options.onTaskComplete)
            return;
        try {
            const result = options.onTaskComplete(event);
            // Completion observers are synchronous. Consume accidental async failures
            // so an async callback cannot create an unhandled rejection.
            if (result &&
                (typeof result === "object" || typeof result === "function") &&
                typeof result.then === "function") {
                void Promise.resolve(result).catch((error) => reportObserverError(error, event));
            }
        }
        catch (error) {
            reportObserverError(error, event);
        }
    };
    // Reused outputs are already present in the candidate value map. Publish
    // them once before any ready task (including a dependent) can start.
    for (const event of reusedOutputs) {
        if (controller.signal.aborted)
            break;
        notifyTaskComplete(event);
    }
    const launchReady = () => {
        while (!controller.signal.aborted && running < maxConcurrency && ready.length > 0) {
            // The compiler-provided task order is the deterministic tie-breaker for
            // equally ready work. Priorities can be added to the plan explicitly.
            const taskId = dequeueReady();
            const task = taskById.get(taskId);
            const taskInputs = new Map();
            for (const dependency of task.dependsOn) {
                taskInputs.set(dependency, values.get(dependency));
            }
            started.push(taskId);
            running++;
            let output;
            try {
                startedSink?.push(taskId);
                output = options.runTask
                    ? options.runTask(task, taskInputs, controller.signal)
                    : task.run(taskInputs, controller.signal);
            }
            catch (error) {
                running--;
                hasFailure = true;
                failure = error;
                controller.abort(error);
                wake();
                continue;
            }
            Promise.resolve(output).then((value) => {
                if (controller.signal.aborted)
                    return;
                values.set(taskId, value);
                completed.push(taskId);
                settled++;
                notifyTaskComplete({ taskId, value, reused: false });
                if (controller.signal.aborted)
                    return;
                for (const child of dependents.get(taskId) ?? []) {
                    const count = unresolved.get(child) - 1;
                    unresolved.set(child, count);
                    if (count === 0)
                        enqueueReady(child);
                }
            }, (error) => {
                if (!controller.signal.aborted) {
                    hasFailure = true;
                    failure = error;
                    controller.abort(error);
                }
            }).finally(() => {
                running--;
                wake();
            });
        }
    };
    try {
        while (settled < taskSpecs.length && !controller.signal.aborted) {
            const changed = new Promise((resolve) => wake = resolve);
            launchReady();
            if (hasFailure || controller.signal.aborted || settled === taskSpecs.length)
                break;
            if (running === 0) {
                throw new Error("Async task plan has no runnable task");
            }
            await changed;
        }
        if (hasFailure)
            throw failure;
        return {
            status: controller.signal.aborted ? "aborted" : "complete",
            values: new Map(values),
            started: [...started],
            completed: [...completed],
            reused: [...reused],
        };
    }
    finally {
        externalSignal?.removeEventListener("abort", abort);
    }
};
//# sourceMappingURL=async_task_scheduler.js.map