/** Public native author API; `jsx` uses the classic variadic factory ABI. */
import {
  bindStatePropAt,
  bindStatePropsAt,
  type ComponentInvalidationPlan,
  ComponentStateRoot,
  type ComponentStateRootOptions,
  defineComponent,
  renderCollectionAt,
  Suspense,
  useAt,
  useEffectAt,
  useFrameAt,
  useFrameLoopAt,
  type NativeFrameLoopBoundaryOptions,
  useStateAt,
  useStoreAt,
} from "./component_state_runtime.ts";
import {
  type ComponentType,
  Fragment,
  jsx,
  type RuntimeNode,
} from "./jsx_binding_runtime.ts";
import { DOMVDOMHost, type VDOMHost } from "./vdom_snapshot_runtime.ts";
import { type StoreSource } from "./async_store_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type AsyncResource } from "./async_resource_runtime.ts";
import { asyncTask as authoredAsyncTask, type CompilerTaskMetadata } from "./async_task_plan.ts";
import { type AsyncTaskSpec } from "./async_task_scheduler.ts";

export {
  bindStatePropAt,
  bindStatePropsAt,
  defineComponent,
  Fragment,
  jsx,
  renderCollectionAt,
  Suspense,
  useAt,
  useEffectAt,
  useFrameAt,
  useStateAt,
  useStoreAt,
};
export { OwnerStateWorld };
export type { StateCellHandle } from "./owner_state_world.ts";
export { NativeRootWorkQueue } from "./native_root_work_queue.ts";
export type {
  NativeRootWorkHandle,
  NativeStoreDependencyLease,
} from "./native_root_work_queue.ts";
export { createNativeFrameLoop } from "./native_frame_loop.ts";
export type {
  NativeFrameTime, NativeFrameResult, NativeFrameLoopOptions, NativeFrameLoop,
} from "./native_frame_loop.ts";
export type {
  NativeFrameClock, NativeFrameCallback, NativeFrameCallbackOptions,
} from "./native_frame_program.ts";
import type {
  NativeFrameClock, NativeFrameCallback, NativeFrameCallbackOptions,
} from "./native_frame_program.ts";

export type FrameLoopProps = NativeFrameLoopBoundaryOptions & {
  readonly children?: RuntimeNode;
};

/** Own the native root's RAF driver for this mounted boundary's lifetime. */
export const FrameLoop = defineComponent<FrameLoopProps>("r3act:FrameLoop", (props) => {
  useFrameLoopAt("r3act:FrameLoop:driver", props);
  return props.children ?? null;
});
export { createTaskExecution } from "./native_task_execution.ts";
export { NativeTaskTransitionQueue } from "./native_task_transition.ts";
export type {
  NativeTaskTransitionHandle,
  NativeTaskTransitionOptions,
} from "./native_task_transition.ts";
export type {
  NativeTaskExecution,
  NativeTaskExecutionOptions,
  NativeTaskExecutionSnapshot,
} from "./native_task_execution.ts";
export type {
  NativeRootWork,
  NativeStoreRootWork,
  NativeTransactionRootWork,
} from "./native_root_work_queue.ts";
export type { NativeRootCandidate } from "./component_state_runtime.ts";
export type { NativeSuspenseProps } from "./component_state_runtime.ts";
export { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.ts";
export type { AsyncResourceStatus } from "./async_resource_runtime.ts";
export {
  AsyncTaskDemandScope, defineProviderDemand, definePureDerivedDemand,
} from "./async_task_demand.ts";
export type { DemandCapture, DemandDefinition, DemandLease } from "./async_task_demand.ts";
export { createKeyedCollection } from "./keyed_collection.ts";
export type {
  KeyedCollection,
  KeyedCollectionOperation,
} from "./keyed_collection.ts";
export {
  createAsyncStore as createStore,
  createStoreSelector,
  storeRecord,
  storeDependencies,
} from "./async_store_runtime.ts";
export type { StoreSource } from "./async_store_runtime.ts";
export type {
  AsyncTaskIds,
  AsyncTaskOutput,
  AuthoredAsyncTask,
} from "./async_task_plan.ts";
export type { ComponentInvalidationPlan, ComponentStateRootOptions };

const compileRequired = (name: string): never => {
  throw new Error(
    `${name} is a native compiled hook; import it through the native JSX compiler so it can be lowered to an explicit owner/site call`,
  );
};

/** Native inferred task declarations require Rust lowering; explicit edges also work. */
export const asyncTask: typeof authoredAsyncTask = ((
  id: string,
  dependenciesOrRun: readonly string[] | AsyncTaskSpec["run"],
  run?: AsyncTaskSpec["run"],
  compilerMetadata?: CompilerTaskMetadata,
) => {
  if (typeof dependenciesOrRun === "function") {
    return compileRequired("asyncTask");
  }
  if (!run) throw new TypeError("asyncTask requires a callback");
  return compilerMetadata
    ? authoredAsyncTask(id, dependenciesOrRun, run, compilerMetadata)
    : authoredAsyncTask(id, dependenciesOrRun, run);
}) as typeof authoredAsyncTask;

/** Authored hook spelling. Native modules must compile this call before execution. */
export const useState = <T>(
  _initial: T | (() => T),
): readonly [T, (action: T | ((previous: T) => T)) => boolean] =>
  compileRequired("useState");

/** Read the compiled frame clock, or register ordered mount-owned tick logic. */
export function useFrame(): NativeFrameClock;
export function useFrame(callback: NativeFrameCallback,
  dependencies: readonly unknown[], options?: NativeFrameCallbackOptions): void;
export function useFrame(_callback?: NativeFrameCallback,
  _dependencies?: readonly unknown[], _options?: NativeFrameCallbackOptions,
): NativeFrameClock | void {
  return compileRequired("useFrame");
}

/**
 * Compiler-owned read. Stores return their value unchanged; resources and
 * Promises unwrap and suspend. Store-held Promises require a second `use`.
 */
export function use<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T>;
export function use<T>(source: StoreSource<T>): T;
export function use(
  _source: StoreSource<unknown> | AsyncResource<unknown> | PromiseLike<unknown>,
): unknown {
  return compileRequired("use");
}

/** Temporary migration alias; new native components use `use(store)`. */
export const useStore = <T>(_source: StoreSource<T>): T =>
  compileRequired("useStore");

/** Activation lifecycle hook; dependency arrays are intentionally unsupported. */
export const useEffect = (
  _setup: () => void | (() => void),
): void => compileRequired("useEffect");

export type NativeRootOptions = ComponentStateRootOptions & {
  readonly invalidationPlan?: ComponentInvalidationPlan;
};

export const createNativeRoot = <H, Parent = H>(
  host: VDOMHost<H, Parent>,
  container: Parent,
  options: NativeRootOptions = {},
) => new ComponentStateRoot(host, container, options);

export const createDOMRoot = <Parent extends Node>(
  container: Parent,
  options: NativeRootOptions = {},
) =>
  new ComponentStateRoot<Node, Parent>(new DOMVDOMHost(), container, options);

export const createWorld = () => new OwnerStateWorld();

export type { VDOMHost } from "./vdom_snapshot_runtime.ts";
export type {
  HostCopyComparisonScalar,
  HostCopyValueCapture,
  HostPropertyCapability,
  HostResourceDescription,
  HostResourceOwnership,
  HostValuePolicy,
} from "./host_property_contract.ts";
export type { ComponentType, RuntimeNode };
export type { ClosedResourceHostProgram } from "./closed_resource_host_program.ts";
export { stabilizeHostTuple } from "./closed_host_value.ts";
export type { NumericBindingProgramDescriptor } from "./jsx_binding_runtime.ts";
export type { CompiledOwnerUpdateProgram } from "./compiled_state_layout.ts";
export {
  compiledSemanticRevision,
  inspectCompiledSemanticPlan,
  registerCompiledSemanticPlan,
  invalidateCompiledSemanticPlan,
  subscribeCompiledSemanticRevision,
} from "./compiled_semantic_plan.ts";
export type {
  CompiledSemanticPlan,
  CompiledSemanticRevisionChange,
} from "./compiled_semantic_plan.ts";
