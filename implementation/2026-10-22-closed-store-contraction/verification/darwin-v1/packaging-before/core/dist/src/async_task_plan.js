import { prepareAsyncTaskPlan, } from "./async_task_scheduler.js";
export function asyncTask(id, dependenciesOrRun, run) {
    if (typeof dependenciesOrRun === "function") {
        if (run !== undefined) {
            throw new TypeError("asyncTask received more than one callback");
        }
        return { id, dependsOn: [], run: dependenciesOrRun };
    }
    if (run === undefined) {
        throw new TypeError("asyncTask requires a callback");
    }
    return { id, dependsOn: dependenciesOrRun, run };
}
;
/**
 * Bind compiler-emitted dependency metadata to authored task implementations.
 * The plan controls the runtime edges; callbacks provide the task behavior.
 */
export const bindCompiledAsyncTasks = (plan, implementations) => {
    if (plan.schema_version !== 1) {
        throw new Error(`Unsupported async task plan schema: ${plan.schema_version}`);
    }
    const planIds = new Set(plan.tasks.map((task) => task.id));
    if (planIds.size !== plan.tasks.length || plan.tasks.some((task) => !task.id)) {
        throw new Error("Compiled async task IDs must be unique and non-empty");
    }
    const implementationIds = Object.keys(implementations);
    if (implementationIds.length !== planIds.size ||
        implementationIds.some((id) => !planIds.has(id))) {
        throw new Error("Async task implementations must exactly match the compiled plan");
    }
    const implementationsById = plan.tasks.map((task) => {
        const run = implementations[task.id];
        if (typeof run !== "function") {
            throw new Error(`Missing async task implementation: ${task.id}`);
        }
        const authoredDependencies = [...task.depends_on];
        return {
            id: task.id,
            dependsOn: task.depends_on.map((dependency) => dependency.startsWith("$") ? dependency.slice(1) : dependency),
            run: (inputs, signal) => {
                // The scheduler uses canonical external input IDs (without `$`) for
                // dependency resolution. Rebuild only this task's authored view so
                // `$query` remains readable while plain state-site and task IDs stay
                // unchanged, and undeclared values never become visible.
                const authoredInputs = new Map();
                for (const dependency of authoredDependencies) {
                    const canonical = dependency.startsWith("$")
                        ? dependency.slice(1)
                        : dependency;
                    if (inputs.has(canonical)) {
                        authoredInputs.set(dependency, inputs.get(canonical));
                    }
                }
                return run(authoredInputs, signal);
            },
        };
    });
    const expectedOrder = plan.task_order;
    if (expectedOrder.length !== implementationsById.length ||
        new Set(expectedOrder).size !== implementationsById.length ||
        expectedOrder.some((task) => !Number.isInteger(task) || task < 0 || task >= implementationsById.length)) {
        throw new Error("Compiled async task order is malformed");
    }
    const rank = new Uint32Array(implementationsById.length);
    expectedOrder.forEach((task, index) => rank[task] = index);
    const indexById = new Map(plan.tasks.map((task, index) => [task.id, index]));
    for (let task = 0; task < implementationsById.length; task++) {
        for (const dependencyId of implementationsById[task].dependsOn) {
            const dependency = indexById.get(dependencyId);
            // `$name` inputs and plain component state-site IDs are external
            // resources. Only a dependency that resolves to a declared task ID is
            // subject to task ordering.
            if (dependency !== undefined && rank[dependency] >= rank[task]) {
                throw new Error("Compiled async task order is not topological");
            }
        }
    }
    const tasks = expectedOrder.map((task) => implementationsById[task]);
    const inputIds = plan.tasks.flatMap((task) => task.depends_on.map((dependency) => dependency.startsWith("$") ? dependency.slice(1) : dependency).filter((dependency) => !planIds.has(dependency)));
    prepareAsyncTaskPlan(tasks, Object.fromEntries(inputIds.map((inputId) => [inputId, undefined])));
    return tasks;
};
//# sourceMappingURL=async_task_plan.js.map