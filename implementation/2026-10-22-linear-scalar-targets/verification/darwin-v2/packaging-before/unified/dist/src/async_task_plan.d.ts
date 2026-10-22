import { type AsyncTaskSpec } from "./async_task_scheduler.ts";
export type AsyncTaskRun<Output = unknown> = (values: ReadonlyMap<string, unknown>, signal: AbortSignal) => Output | PromiseLike<Output>;
/** A task declaration that retains its authored ID and result type. */
export type AuthoredAsyncTask<Id extends string = string, Output = unknown, Dependencies extends readonly string[] = readonly string[]> = Readonly<{
    id: Id;
    dependsOn: Dependencies;
    run: AsyncTaskRun<Output>;
}>;
export type AsyncTaskIds<Tasks extends readonly AuthoredAsyncTask[]> = Tasks[number]["id"];
export type AsyncTaskOutput<Tasks extends readonly AuthoredAsyncTask[], Id extends AsyncTaskIds<Tasks>> = Awaited<Extract<Tasks[number], {
    id: Id;
}> extends AuthoredAsyncTask<string, infer Output, readonly string[]> ? Output : never>;
/**
 * Authoring helper for task prerequisites. Prefix an external input ID with $
 * (for example, "$query") to declare a live input read instead of a task edge.
 * OXC infers task and external-input edges from literal `values.get("key")`
 * reads in the task callback. The two-argument form is intended for plans
 * passed through the compiler and compiled-plan binder.
 */
export declare function asyncTask<const Id extends string, Output>(id: Id, run: AsyncTaskRun<Output>): AuthoredAsyncTask<Id, Output, readonly []>;
export declare function asyncTask<const Id extends string, const Dependencies extends readonly string[], Output>(id: Id, dependencies: Dependencies, run: AsyncTaskRun<Output>): AuthoredAsyncTask<Id, Output, Dependencies>;
export type CompiledAsyncTaskPlan = Readonly<{
    schema_version: 1;
    source_file: string;
    tasks: readonly Readonly<{
        id: string;
        site_id: string;
        depends_on: readonly string[];
    }>[];
    task_order: readonly number[];
}>;
/**
 * Bind compiler-emitted dependency metadata to authored task implementations.
 * The plan controls the runtime edges; callbacks provide the task behavior.
 */
export declare const bindCompiledAsyncTasks: (plan: CompiledAsyncTaskPlan, implementations: Readonly<Record<string, AsyncTaskSpec["run"]>>) => AsyncTaskSpec[];
//# sourceMappingURL=async_task_plan.d.ts.map