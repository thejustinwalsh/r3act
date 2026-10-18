/** Public native author API; `jsx` uses the classic variadic factory ABI. */
import { bindStatePropAt, bindStatePropsAt, ComponentStateRoot, defineComponent, renderCollectionAt, Suspense, useAt, useEffectAt, useStateAt, useStoreAt, } from "./component_state_runtime.js";
import { Fragment, jsx, } from "./jsx_binding_runtime.js";
import { DOMVDOMHost } from "./vdom_snapshot_runtime.js";
import { OwnerStateWorld } from "./owner_state_world.js";
import { asyncTask as authoredAsyncTask } from "./async_task_plan.js";
export { bindStatePropAt, bindStatePropsAt, defineComponent, Fragment, jsx, renderCollectionAt, Suspense, useAt, useEffectAt, useStateAt, useStoreAt, };
export { OwnerStateWorld };
export { NativeRootWorkQueue } from "./native_root_work_queue.js";
export { createTaskExecution } from "./native_task_execution.js";
export { NativeTaskTransitionQueue } from "./native_task_transition.js";
export { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.js";
export { createKeyedCollection } from "./keyed_collection.js";
export { createAsyncStore as createStore, createStoreSelector, storeDependencies, } from "./async_store_runtime.js";
const compileRequired = (name) => {
    throw new Error(`${name} is a native compiled hook; import it through the native JSX compiler so it can be lowered to an explicit owner/site call`);
};
/** Native inferred task declarations require Rust lowering; explicit edges also work. */
export const asyncTask = ((id, dependenciesOrRun, run) => {
    if (typeof dependenciesOrRun === "function") {
        return compileRequired("asyncTask");
    }
    if (!run)
        throw new TypeError("asyncTask requires a callback");
    return authoredAsyncTask(id, dependenciesOrRun, run);
});
/** Authored hook spelling. Native modules must compile this call before execution. */
export const useState = (_initial) => compileRequired("useState");
export function use(_source) {
    return compileRequired("use");
}
/** Temporary migration alias; new native components use `use(store)`. */
export const useStore = (_source) => compileRequired("useStore");
/** Activation lifecycle hook; dependency arrays are intentionally unsupported. */
export const useEffect = (_setup) => compileRequired("useEffect");
export const createNativeRoot = (host, container, options = {}) => new ComponentStateRoot(host, container, options);
export const createDOMRoot = (container, options = {}) => new ComponentStateRoot(new DOMVDOMHost(), container, options);
export const createWorld = () => new OwnerStateWorld();
export { stabilizeHostTuple } from "./closed_host_value.js";
export { compiledSemanticRevision, inspectCompiledSemanticPlan, registerCompiledSemanticPlan, invalidateCompiledSemanticPlan, subscribeCompiledSemanticRevision, } from "./compiled_semantic_plan.js";
//# sourceMappingURL=native_runtime_api.js.map