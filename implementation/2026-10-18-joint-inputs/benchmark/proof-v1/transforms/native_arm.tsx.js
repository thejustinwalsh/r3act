import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx",
	"module_revision": "native-v1-a5e49f70ef1b87a3",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444",
		"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
		"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293",
		"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
		"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#effect:0",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444"],
			"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293"]
		},
		"execution_order": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444", "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx", "native-v1-a5e49f70ef1b87a3");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createKeyedCollection, createStore, NativeRootWorkQueue, renderCollectionAt, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
	sinkId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
	sinkId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}, {
	schemaVersion: 2,
	programId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}];
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health", Health, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
		"host": {
			"child": "resource-value",
			"key": "health",
			"props": [["data-health", "ready"]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-a5e49f70ef1b87a3",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
		"schemaVersion": 1
	}
});
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint", Joint, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
		"host": {
			"child": null,
			"key": "joint",
			"props": [["data-joint", {
				"kind": "binary",
				"left": {
					"index": 0,
					"kind": "input"
				},
				"operator": "+",
				"right": {
					"index": 1,
					"kind": "input"
				}
			}]],
			"tag": "output"
		},
		"inputs": [{
			"storeProp": "position",
			"storeUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0"
		}, {
			"storeProp": "camera",
			"storeUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1"
		}],
		"moduleRevision": "native-v1-a5e49f70ef1b87a3",
		"schemaVersion": 2
	}
});
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:List", List, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row", Row, {
	propOnlySites: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
		moduleRevision: "native-v1-a5e49f70ef1b87a3",
		slots: [{
			siteId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World", World, {
	propOnlySites: ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
		moduleRevision: "native-v1-a5e49f70ef1b87a3",
		slots: [{
			siteId: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[1]
});
function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
const health = deferred();
const position = createStore(1);
const camera = createStore(2);
const ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);
const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
let setWorld = null;
function Health(props) {
	const value = __nativeUseAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "health",
		"data-health": "ready"
	}, value);
}
function Joint(props) {
	const x = __nativeUseAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0", props.position);
	const y = __nativeUseAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1", props.camera);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "joint",
		"data-joint": x + y
	});
}
function World() {
	const [value, setter] = __nativeUseStateAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0", 0);
	__nativeUseEffectAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#effect:0", () => {
		setWorld = setter;
		return () => {
			setWorld = null;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "world",
		"data-world": __nativeBindStatePropAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0", (value) => value, __nativeNumericPrograms[0])
	});
}
function Row(props) {
	const [local, setLocal] = __nativeUseStateAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: props.id,
		"data-id": props.id,
		"data-local": __nativeBindStatePropAt("implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0", (local) => local, __nativeNumericPrograms[1]),
		onClick: () => setLocal((previous) => previous + 1)
	}, props.id);
}
function List() {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, renderCollectionAt("joint-benchmark-rows", rows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		id: row.id
	})));
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "health",
			"data-health": "fallback"
		}, "health waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { resource: health.promise })), /* @__PURE__ */ __nativeJsx.jsx(Joint, {
		position,
		camera
	}), /* @__PURE__ */ __nativeJsx.jsx(World, null), /* @__PURE__ */ __nativeJsx.jsx(List, null));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const queue = new NativeRootWorkQueue();
	const started = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	const mountDurationMs = performance.now() - started;
	const dirty = [];
	const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
	return {
		mountDurationMs,
		transact() {
			position.dispatch(7);
			if (!setWorld || !setWorld(5)) throw new Error("World setter rejected measured action");
			const worldHandle = dirty.find((handle) => handle.site.endsWith("#component:World#state:0"));
			if (!worldHandle) throw new Error("World cell handle was not observed");
			unsubscribe();
			if (!rows.apply(rows.version, [{
				type: "move",
				key: "row-0",
				beforeKey: null
			}]).ok) {
				throw new Error("keyed move rejected");
			}
			const work = queue.enqueueTransaction({
				id: "joint-benchmark-once",
				roots: [{
					root,
					cells: [worldHandle],
					collections: [rows],
					stores: [position]
				}]
			});
			if (work.status !== "committed") throw new Error(`joint transaction ${work.status}`);
		},
		settleHealth() {
			health.resolve("health ready");
		},
		dispose() {
			unsubscribe();
			queue.dispose();
			root.dispose();
			return {
				...root.diagnostics(),
				position: position.diagnostics(),
				camera: camera.diagnostics(),
				collection: rows.stats()
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-a5e49f70ef1b87a3",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx",
		"module_revision": "native-v1-a5e49f70ef1b87a3",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:List",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
			"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293",
			"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
			"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#effect:0",
				"owner_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444"],
				"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293"]
			},
			"execution_order": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444", "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293"]
		}
	},
	"source_file": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot, createKeyedCollection, createStore, NativeRootWorkQueue,\n  renderCollectionAt, Suspense, use, useEffect, useState,\n  type StateCellHandle,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World\", sinkId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row\", sinkId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health\",\"host\":{\"child\":\"resource-value\",\"key\":\"health\",\"props\":[[\"data-health\",\"ready\"]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-a5e49f70ef1b87a3\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0\",\"schemaVersion\":1} });\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint\", Joint, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint\",\"host\":{\"child\":null,\"key\":\"joint\",\"props\":[[\"data-joint\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0\"},{\"storeProp\":\"camera\",\"storeUseSiteId\":\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1\"}],\"moduleRevision\":\"native-v1-a5e49f70ef1b87a3\",\"schemaVersion\":2} });\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:List\", List, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row\", Row, { propOnlySites: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0\"], stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row\", moduleRevision: \"native-v1-a5e49f70ef1b87a3\", slots: [{ siteId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World\", World, { propOnlySites: [\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World\", moduleRevision: \"native-v1-a5e49f70ef1b87a3\", slots: [{ siteId: \"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\n\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\nconst health = deferred();\nconst position = createStore(1);\nconst camera = createStore(2);\nconst ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);\nconst rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);\nlet setWorld: ((value: number) => boolean) | null = null;\n\nfunction Health(props: { resource: Promise<string> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0\", props.resource);\n  return <div key=\"health\" data-health=\"ready\">{value}</div>;\n}\nfunction Joint(props: { position: typeof position; camera: typeof camera }) {\n  const x = __nativeUseAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0\", props.position);\n  const y = __nativeUseAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1\", props.camera);\n  return <output key=\"joint\" data-joint={x + y} />;\n}\nfunction World() {\n  const [value, setter] = __nativeUseStateAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0\", 0);\n  __nativeUseEffectAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#effect:0\", () => { setWorld = setter; return () => { setWorld = null; }; });\n  return <output key=\"world\" data-world={__nativeBindStatePropAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0\", (value) => (value), __nativeNumericPrograms[0])} />;\n}\nfunction Row(props: { id: string }) {\n  const [local, setLocal] = __nativeUseStateAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0\", 0);\n  return <li key={props.id} data-id={props.id} data-local={__nativeBindStatePropAt(\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0\", (local) => (local), __nativeNumericPrograms[1])}\n    onClick={() => setLocal((previous) => previous + 1)}>{props.id}</li>;\n}\nfunction List() {\n  return <ul>{renderCollectionAt(\"joint-benchmark-rows\", rows, (row) => <Row key={row.id} id={row.id} />)}</ul>;\n}\nfunction App() {\n  return <main>\n    <Suspense fallback={<div key=\"health\" data-health=\"fallback\">health waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#boundary:0\">\n      <Health resource={health.promise} />\n    </Suspense>\n    <Joint position={position} camera={camera} />\n    <World />\n    <List />\n  </main>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const queue = new NativeRootWorkQueue();\n  const started = performance.now();\n  root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  const dirty: StateCellHandle[] = [];\n  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));\n  return {\n    mountDurationMs,\n    transact() {\n      position.dispatch(7);\n      if (!setWorld || !setWorld(5)) throw new Error(\"World setter rejected measured action\");\n      const worldHandle = dirty.find((handle) => handle.site.endsWith(\"#component:World#state:0\"));\n      if (!worldHandle) throw new Error(\"World cell handle was not observed\");\n      unsubscribe();\n      if (!rows.apply(rows.version, [{ type: \"move\", key: \"row-0\", beforeKey: null }]).ok) {\n        throw new Error(\"keyed move rejected\");\n      }\n      const work = queue.enqueueTransaction({ id: \"joint-benchmark-once\", roots: [{\n        root, cells: [worldHandle], collections: [rows], stores: [position],\n      }] });\n      if (work.status !== \"committed\") throw new Error(`joint transaction ${work.status}`);\n    },\n    settleHealth() { health.resolve(\"health ready\"); },\n    dispose() {\n      unsubscribe();\n      queue.dispose(); root.dispose();\n      return { ...root.diagnostics(), position: position.diagnostics(), camera: camera.diagnostics(),\n        collection: rows.stats() };\n    },\n  };\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Health",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health",
				"host": {
					"child": "resource-value",
					"key": "health",
					"props": [["data-health", "ready"]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-a5e49f70ef1b87a3",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Health#store:0",
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Joint",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0",
				"source_expression": "props.position"
			}, {
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1",
				"source_expression": "props.camera"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint",
				"host": {
					"child": null,
					"key": "joint",
					"props": [["data-joint", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"index": 1,
							"kind": "input"
						}
					}]],
					"tag": "output"
				},
				"inputs": [{
					"storeProp": "position",
					"storeUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:0"
				}, {
					"storeProp": "camera",
					"storeUseSiteId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Joint#store:1"
				}],
				"moduleRevision": "native-v1-a5e49f70ef1b87a3",
				"schemaVersion": 2
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "List",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:List",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
			"prop_only_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row",
				"moduleRevision": "native-v1-a5e49f70ef1b87a3",
				"slots": [{
					"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1444",
				"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "World",
			"component_site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
			"prop_only_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World",
				"moduleRevision": "native-v1-a5e49f70ef1b87a3",
				"slots": [{
					"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#numeric-sink:1293",
				"source_sites": ["implementation/2026-10-18-joint-inputs/benchmark/native_arm.tsx#component:World#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
