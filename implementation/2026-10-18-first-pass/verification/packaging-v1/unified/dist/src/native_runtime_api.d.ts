/** Public native author API; `jsx` uses the classic variadic factory ABI. */
import { bindStatePropAt, bindStatePropsAt, type ComponentInvalidationPlan, ComponentStateRoot, type ComponentStateRootOptions, defineComponent, renderCollectionAt, Suspense, useAt, useEffectAt, useStateAt, useStoreAt } from "./component_state_runtime.ts";
import { type ComponentType, Fragment, jsx, type RuntimeNode } from "./jsx_binding_runtime.ts";
import { type VDOMHost } from "./vdom_snapshot_runtime.ts";
import { type StoreSource } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type AsyncResource } from "./async_resource_runtime.ts";
import { asyncTask as authoredAsyncTask } from "./async_task_plan.ts";
export { bindStatePropAt, bindStatePropsAt, defineComponent, Fragment, jsx, renderCollectionAt, Suspense, useAt, useEffectAt, useStateAt, useStoreAt, };
export { OwnerStateWorld };
export type { StateCellHandle } from "./owner_state_world.ts";
export { NativeRootWorkQueue } from "./native_root_work_queue.ts";
export type { NativeRootWorkHandle, NativeStoreDependencyLease, } from "./native_root_work_queue.ts";
export { createTaskExecution } from "./native_task_execution.ts";
export { NativeTaskTransitionQueue } from "./native_task_transition.ts";
export type { NativeTaskTransitionHandle, NativeTaskTransitionOptions, } from "./native_task_transition.ts";
export type { NativeTaskExecution, NativeTaskExecutionOptions, NativeTaskExecutionSnapshot, } from "./native_task_execution.ts";
export type { NativeRootWork, NativeRetainedRootWork, NativeCollectionRootWork, NativeTransactionRootWork } from "./native_root_work_queue.ts";
export type { NativeRootCandidate } from "./component_state_runtime.ts";
export type { NativeSuspenseProps } from "./component_state_runtime.ts";
export { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.ts";
export type { AsyncResourceStatus } from "./async_resource_runtime.ts";
export { createKeyedCollection } from "./keyed_collection.ts";
export type { KeyedCollection, KeyedCollectionOperation, } from "./keyed_collection.ts";
export { createAsyncStore as createStore, createStoreSelector, storeDependencies, } from "./async_store_runtime.ts";
export type { StoreSource } from "./async_store_runtime.ts";
export type { AsyncTaskIds, AsyncTaskOutput, AuthoredAsyncTask, } from "./async_task_plan.ts";
export type { ComponentInvalidationPlan, ComponentStateRootOptions };
/** Native inferred task declarations require Rust lowering; explicit edges also work. */
export declare const asyncTask: typeof authoredAsyncTask;
/** Authored hook spelling. Native modules must compile this call before execution. */
export declare const useState: <T>(_initial: T | (() => T)) => readonly [T, (action: T | ((previous: T) => T)) => boolean];
/**
 * Compiler-owned read. Stores return their value unchanged; resources and
 * Promises unwrap and suspend. Store-held Promises require a second `use`.
 */
export declare function use<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T>;
export declare function use<T>(source: StoreSource<T>): T;
/** Temporary migration alias; new native components use `use(store)`. */
export declare const useStore: <T>(_source: StoreSource<T>) => T;
/** Activation lifecycle hook; dependency arrays are intentionally unsupported. */
export declare const useEffect: (_setup: () => void | (() => void)) => void;
export type NativeRootOptions = ComponentStateRootOptions & {
    readonly invalidationPlan?: ComponentInvalidationPlan;
};
export declare const createNativeRoot: <H, Parent = H>(host: VDOMHost<H, Parent>, container: Parent, options?: NativeRootOptions) => ComponentStateRoot<H, Parent>;
export declare const createDOMRoot: <Parent extends Node>(container: Parent, options?: NativeRootOptions) => ComponentStateRoot<Node, Parent>;
export declare const createWorld: () => OwnerStateWorld;
export type { VDOMHost } from "./vdom_snapshot_runtime.ts";
export type { ComponentType, RuntimeNode };
export type { NumericBindingProgramDescriptor } from "./jsx_binding_runtime.ts";
export type { CompiledOwnerUpdateProgram } from "./compiled_state_layout.ts";
export { compiledSemanticRevision, inspectCompiledSemanticPlan, registerCompiledSemanticPlan, invalidateCompiledSemanticPlan, subscribeCompiledSemanticRevision, } from "./compiled_semantic_plan.ts";
export type { CompiledSemanticPlan, CompiledSemanticRevisionChange, } from "./compiled_semantic_plan.ts";
//# sourceMappingURL=native_runtime_api.d.ts.map