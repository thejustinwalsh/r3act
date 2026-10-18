import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx",
	"module_revision": "native-v1-8f07d1717755ccf0",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:List",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846",
		"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
		"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695",
		"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
		"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#effect:0",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846"],
			"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695"]
		},
		"execution_order": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846", "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx", "native-v1-8f07d1717755ccf0");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createKeyedCollection, createStore, NativeRootWorkQueue, renderCollectionAt, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
	sinkId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
	sinkId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846"],
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
	programId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695"],
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
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health", Health, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
		"host": {
			"child": "resource-value",
			"key": "health",
			"props": [["data-health", "ready"]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-8f07d1717755ccf0",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
		"schemaVersion": 1
	},
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "health",
			"props": [["data-health", {
				"kind": "literal",
				"value": "ready"
			}]],
			"tag": "div"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0"
		}],
		"moduleRevision": "native-v1-8f07d1717755ccf0",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint", Joint, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
		"host": {
			"children": [{
				"host": {
					"children": [{
						"expression": {
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
						},
						"kind": "text"
					}],
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
					}], ["style", {
						"entries": [["opacity", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "/",
							"right": {
								"kind": "literal",
								"value": 10
							}
						}]],
						"kind": "style"
					}]],
					"tag": "output"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"index": 1,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "camera",
					"props": [["data-camera", {
						"index": 1,
						"kind": "input"
					}]],
					"tag": "span"
				},
				"kind": "host"
			}],
			"key": "joint-tree",
			"props": [],
			"tag": "div"
		},
		"inputs": [{
			"storeProp": "position",
			"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0"
		}, {
			"storeProp": "camera",
			"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1"
		}],
		"moduleRevision": "native-v1-8f07d1717755ccf0",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:List", List, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position", Position, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
		"host": {
			"children": [{
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "position",
					"props": [["data-position", {
						"index": 0,
						"kind": "input"
					}], ["style", {
						"entries": [["transform", {
							"expressions": [{
								"index": 0,
								"kind": "input"
							}],
							"kind": "template",
							"parts": ["translateX(", "px)"]
						}]],
						"kind": "style"
					}]],
					"tag": "div"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": 2
							}
						},
						"kind": "text"
					}],
					"key": "outline",
					"props": [["data-outline", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": 2
						}
					}]],
					"tag": "span"
				},
				"kind": "host"
			}],
			"key": "position-tree",
			"props": [],
			"tag": "div"
		},
		"moduleRevision": "native-v1-8f07d1717755ccf0",
		"resourceProp": "position",
		"resourceUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
		"schemaVersion": 3
	},
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
		"host": {
			"children": [{
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "position",
					"props": [["data-position", {
						"index": 0,
						"kind": "input"
					}], ["style", {
						"entries": [["transform", {
							"expressions": [{
								"index": 0,
								"kind": "input"
							}],
							"kind": "template",
							"parts": ["translateX(", "px)"]
						}]],
						"kind": "style"
					}]],
					"tag": "div"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": 2
							}
						},
						"kind": "text"
					}],
					"key": "outline",
					"props": [["data-outline", {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": 2
						}
					}]],
					"tag": "span"
				},
				"kind": "host"
			}],
			"key": "position-tree",
			"props": [],
			"tag": "div"
		},
		"inputs": [{
			"storeProp": "position",
			"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0"
		}],
		"moduleRevision": "native-v1-8f07d1717755ccf0",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row", Row, {
	propOnlySites: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"],
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
		moduleRevision: "native-v1-8f07d1717755ccf0",
		slots: [{
			siteId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World", World, {
	propOnlySites: ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
		moduleRevision: "native-v1-8f07d1717755ccf0",
		slots: [{
			siteId: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0",
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
	const value = __nativeUseAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "health",
		"data-health": "ready"
	}, value);
}
function Position(props) {
	const x = __nativeUseAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0", props.position);
	return /* @__PURE__ */ __nativeJsx.jsx("div", { key: "position-tree" }, /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "position",
		"data-position": x,
		style: { transform: `translateX(${x}px)` }
	}, x), /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "outline",
		"data-outline": x * 2
	}, x * 2));
}
function Joint(props) {
	const x = __nativeUseAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0", props.position);
	const y = __nativeUseAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1", props.camera);
	return /* @__PURE__ */ __nativeJsx.jsx("div", { key: "joint-tree" }, /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "joint",
		"data-joint": x + y,
		style: { opacity: (x + y) / 10 }
	}, x + y), /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "camera",
		"data-camera": y
	}, y));
}
function World() {
	const [value, setter] = __nativeUseStateAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0", 0);
	__nativeUseEffectAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#effect:0", () => {
		setWorld = setter;
		return () => {
			setWorld = null;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "world",
		"data-world": __nativeBindStatePropAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0", (value) => value, __nativeNumericPrograms[0])
	});
}
function Row(props) {
	const [local, setLocal] = __nativeUseStateAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		key: props.id,
		"data-id": props.id,
		"data-local": __nativeBindStatePropAt("implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0", (local) => local, __nativeNumericPrograms[1]),
		onClick: () => setLocal((previous) => previous + 1)
	}, props.id);
}
function List() {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, renderCollectionAt("store-subtrees-benchmark-rows", rows, (row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
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
		__nativeBoundarySite: "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { resource: health.promise })), /* @__PURE__ */ __nativeJsx.jsx(Position, { position }), /* @__PURE__ */ __nativeJsx.jsx(Joint, {
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
				id: "store-subtrees-benchmark-once",
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
	"module_revision": "native-v1-8f07d1717755ccf0",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx",
		"module_revision": "native-v1-8f07d1717755ccf0",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:List",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
			"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695",
			"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
			"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#effect:0",
				"owner_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846"],
				"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695"]
			},
			"execution_order": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846", "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695"]
		}
	},
	"source_file": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot, createKeyedCollection, createStore, NativeRootWorkQueue,\n  renderCollectionAt, Suspense, use, useEffect, useState,\n  type StateCellHandle,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World\", sinkId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row\", sinkId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health\",\"host\":{\"child\":\"resource-value\",\"key\":\"health\",\"props\":[[\"data-health\",\"ready\"]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-8f07d1717755ccf0\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0\",\"schemaVersion\":1}, closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"div\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0\"}],\"moduleRevision\":\"native-v1-8f07d1717755ccf0\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint\", Joint, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}},\"kind\":\"text\"}],\"key\":\"joint\",\"props\":[[\"data-joint\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}],[\"style\",{\"entries\":[[\"opacity\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}}]],\"kind\":\"style\"}]],\"tag\":\"output\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"index\":1,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"camera\",\"props\":[[\"data-camera\",{\"index\":1,\"kind\":\"input\"}]],\"tag\":\"span\"},\"kind\":\"host\"}],\"key\":\"joint-tree\",\"props\":[],\"tag\":\"div\"},\"inputs\":[{\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0\"},{\"storeProp\":\"camera\",\"storeUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1\"}],\"moduleRevision\":\"native-v1-8f07d1717755ccf0\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:List\", List, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position\", Position, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"position\",\"props\":[[\"data-position\",{\"index\":0,\"kind\":\"input\"}],[\"style\",{\"entries\":[[\"transform\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"translateX(\",\"px)\"]}]],\"kind\":\"style\"}]],\"tag\":\"div\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}},\"kind\":\"text\"}],\"key\":\"outline\",\"props\":[[\"data-outline\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}}]],\"tag\":\"span\"},\"kind\":\"host\"}],\"key\":\"position-tree\",\"props\":[],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-8f07d1717755ccf0\",\"resourceProp\":\"position\",\"resourceUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0\",\"schemaVersion\":3}, closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"position\",\"props\":[[\"data-position\",{\"index\":0,\"kind\":\"input\"}],[\"style\",{\"entries\":[[\"transform\",{\"expressions\":[{\"index\":0,\"kind\":\"input\"}],\"kind\":\"template\",\"parts\":[\"translateX(\",\"px)\"]}]],\"kind\":\"style\"}]],\"tag\":\"div\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}},\"kind\":\"text\"}],\"key\":\"outline\",\"props\":[[\"data-outline\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":2.0}}]],\"tag\":\"span\"},\"kind\":\"host\"}],\"key\":\"position-tree\",\"props\":[],\"tag\":\"div\"},\"inputs\":[{\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0\"}],\"moduleRevision\":\"native-v1-8f07d1717755ccf0\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row\", Row, { propOnlySites: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0\"], stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row\", moduleRevision: \"native-v1-8f07d1717755ccf0\", slots: [{ siteId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World\", World, { propOnlySites: [\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World\", moduleRevision: \"native-v1-8f07d1717755ccf0\", slots: [{ siteId: \"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\n\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nfunction deferred(): Deferred {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>((done) => { resolve = done; });\n  return { promise, resolve };\n}\nconst health = deferred();\nconst position = createStore(1);\nconst camera = createStore(2);\nconst ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);\nconst rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);\nlet setWorld: ((value: number) => boolean) | null = null;\n\nfunction Health(props: { resource: Promise<string> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0\", props.resource);\n  return <div key=\"health\" data-health=\"ready\">{value}</div>;\n}\nfunction Position(props: { position: typeof position }) {\n  const x = __nativeUseAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0\", props.position);\n  return <div key=\"position-tree\"><div key=\"position\" data-position={x} style={{ transform: `translateX(${x}px)` }}>{x}</div><span key=\"outline\" data-outline={x * 2}>{x * 2}</span></div>;\n}\nfunction Joint(props: { position: typeof position; camera: typeof camera }) {\n  const x = __nativeUseAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0\", props.position);\n  const y = __nativeUseAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1\", props.camera);\n  return <div key=\"joint-tree\"><output key=\"joint\" data-joint={x + y} style={{ opacity: (x + y) / 10 }}>{x + y}</output><span key=\"camera\" data-camera={y}>{y}</span></div>;\n}\nfunction World() {\n  const [value, setter] = __nativeUseStateAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0\", 0);\n  __nativeUseEffectAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#effect:0\", () => { setWorld = setter; return () => { setWorld = null; }; });\n  return <output key=\"world\" data-world={__nativeBindStatePropAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0\", (value) => (value), __nativeNumericPrograms[0])} />;\n}\nfunction Row(props: { id: string }) {\n  const [local, setLocal] = __nativeUseStateAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0\", 0);\n  return <li key={props.id} data-id={props.id} data-local={__nativeBindStatePropAt(\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0\", (local) => (local), __nativeNumericPrograms[1])}\n    onClick={() => setLocal((previous) => previous + 1)}>{props.id}</li>;\n}\nfunction List() {\n  return <ul>{renderCollectionAt(\"store-subtrees-benchmark-rows\", rows, (row) => <Row key={row.id} id={row.id} />)}</ul>;\n}\nfunction App() {\n  return <main>\n    <Suspense fallback={<div key=\"health\" data-health=\"fallback\">health waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#boundary:0\">\n      <Health resource={health.promise} />\n    </Suspense>\n    <Position position={position} />\n    <Joint position={position} camera={camera} />\n    <World />\n    <List />\n  </main>;\n}\n\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const queue = new NativeRootWorkQueue();\n  const started = performance.now();\n  root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  const dirty: StateCellHandle[] = [];\n  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));\n  return {\n    mountDurationMs,\n    transact() {\n      position.dispatch(7);\n      if (!setWorld || !setWorld(5)) throw new Error(\"World setter rejected measured action\");\n      const worldHandle = dirty.find((handle) => handle.site.endsWith(\"#component:World#state:0\"));\n      if (!worldHandle) throw new Error(\"World cell handle was not observed\");\n      unsubscribe();\n      if (!rows.apply(rows.version, [{ type: \"move\", key: \"row-0\", beforeKey: null }]).ok) {\n        throw new Error(\"keyed move rejected\");\n      }\n      const work = queue.enqueueTransaction({ id: \"store-subtrees-benchmark-once\", roots: [{\n        root, cells: [worldHandle], collections: [rows], stores: [position],\n      }] });\n      if (work.status !== \"committed\") throw new Error(`joint transaction ${work.status}`);\n    },\n    settleHealth() { health.resolve(\"health ready\"); },\n    dispose() {\n      unsubscribe();\n      queue.dispose(); root.dispose();\n      return { ...root.diagnostics(), position: position.diagnostics(), camera: camera.diagnostics(),\n        collection: rows.stats() };\n    },\n  };\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:App",
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
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
				"host": {
					"child": "resource-value",
					"key": "health",
					"props": [["data-health", "ready"]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0",
				"schemaVersion": 1
			},
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "health",
					"props": [["data-health", {
						"kind": "literal",
						"value": "ready"
					}]],
					"tag": "div"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Health#store:0"
				}],
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Joint",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0",
				"source_expression": "props.position"
			}, {
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1",
				"source_expression": "props.camera"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint",
				"host": {
					"children": [{
						"host": {
							"children": [{
								"expression": {
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
								},
								"kind": "text"
							}],
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
							}], ["style", {
								"entries": [["opacity", {
									"kind": "binary",
									"left": {
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
									},
									"operator": "/",
									"right": {
										"kind": "literal",
										"value": 10
									}
								}]],
								"kind": "style"
							}]],
							"tag": "output"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"index": 1,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "camera",
							"props": [["data-camera", {
								"index": 1,
								"kind": "input"
							}]],
							"tag": "span"
						},
						"kind": "host"
					}],
					"key": "joint-tree",
					"props": [],
					"tag": "div"
				},
				"inputs": [{
					"storeProp": "position",
					"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:0"
				}, {
					"storeProp": "camera",
					"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Joint#store:1"
				}],
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "List",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:List",
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
			"name": "Position",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
				"source_expression": "props.position"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
				"host": {
					"children": [{
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "position",
							"props": [["data-position", {
								"index": 0,
								"kind": "input"
							}], ["style", {
								"entries": [["transform", {
									"expressions": [{
										"index": 0,
										"kind": "input"
									}],
									"kind": "template",
									"parts": ["translateX(", "px)"]
								}]],
								"kind": "style"
							}]],
							"tag": "div"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"kind": "binary",
									"left": {
										"index": 0,
										"kind": "input"
									},
									"operator": "*",
									"right": {
										"kind": "literal",
										"value": 2
									}
								},
								"kind": "text"
							}],
							"key": "outline",
							"props": [["data-outline", {
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": 2
								}
							}]],
							"tag": "span"
						},
						"kind": "host"
					}],
					"key": "position-tree",
					"props": [],
					"tag": "div"
				},
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"resourceProp": "position",
				"resourceUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0",
				"schemaVersion": 3
			},
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position",
				"host": {
					"children": [{
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "position",
							"props": [["data-position", {
								"index": 0,
								"kind": "input"
							}], ["style", {
								"entries": [["transform", {
									"expressions": [{
										"index": 0,
										"kind": "input"
									}],
									"kind": "template",
									"parts": ["translateX(", "px)"]
								}]],
								"kind": "style"
							}]],
							"tag": "div"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"kind": "binary",
									"left": {
										"index": 0,
										"kind": "input"
									},
									"operator": "*",
									"right": {
										"kind": "literal",
										"value": 2
									}
								},
								"kind": "text"
							}],
							"key": "outline",
							"props": [["data-outline", {
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": 2
								}
							}]],
							"tag": "span"
						},
						"kind": "host"
					}],
					"key": "position-tree",
					"props": [],
					"tag": "div"
				},
				"inputs": [{
					"storeProp": "position",
					"storeUseSiteId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Position#store:0"
				}],
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
			"prop_only_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row",
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"slots": [{
					"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1846",
				"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "World",
			"component_site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
			"prop_only_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World",
				"moduleRevision": "native-v1-8f07d1717755ccf0",
				"slots": [{
					"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#numeric-sink:1695",
				"source_sites": ["implementation/2026-10-18-store-subtrees/benchmark/native_arm.tsx#component:World#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
