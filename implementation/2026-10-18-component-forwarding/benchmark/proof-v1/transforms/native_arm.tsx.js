import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx",
	"module_revision": "native-v1-e55bd8cf2adf0ff4",
	"owners": [
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#state:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550",
		"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
		"source_sites": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#effect:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550"] },
		"execution_order": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx", "native-v1-e55bd8cf2adf0ff4");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, createStore, storeRecord, Suspense } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
	sinkId: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
	slotCount: 1,
	sinkIds: ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550"],
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
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card", Card, {
	propOnlySites: [],
	closedComponentForwardProgram: {
		"childComponentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
		"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card",
		"key": null,
		"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
		"props": [
			["sourceA", {
				"kind": "prop",
				"name": "first"
			}],
			["live", {
				"kind": "prop",
				"name": "position"
			}],
			["sourceB", {
				"kind": "prop",
				"name": "second"
			}],
			["note", {
				"kind": "literal",
				"value": "ready"
			}]
		],
		"schemaVersion": 1,
		"childComponent": Panel
	}
});
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback", Fallback, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health", Health, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
		"host": {
			"child": "resource-value",
			"key": "health",
			"props": [["data-health", "ready"]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
		"resourceProp": "resource",
		"resourceUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
		"schemaVersion": 1
	},
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
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
			"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0"
		}],
		"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
		"schemaVersion": 4
	}
});
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint", Joint, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
		"host": {
			"children": [{
				"host": {
					"children": [{
						"expression": {
							"kind": "binary",
							"left": {
								"kind": "binary",
								"left": {
									"index": 2,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 0,
									"kind": "input"
								}
							},
							"operator": "+",
							"right": {
								"index": 3,
								"kind": "input"
							}
						},
						"kind": "text"
					}],
					"key": "label",
					"props": [["data-label", {
						"kind": "literal",
						"value": "sum"
					}]],
					"tag": "output"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"kind": "binary",
							"left": {
								"index": 1,
								"kind": "input"
							},
							"operator": "+",
							"right": {
								"index": 4,
								"kind": "input"
							}
						},
						"kind": "text"
					}],
					"key": "model",
					"props": [["data-model", {
						"kind": "literal",
						"value": "sum"
					}]],
					"tag": "span"
				},
				"kind": "host"
			}],
			"key": "joint",
			"props": [
				["data-joint", {
					"kind": "literal",
					"value": "ready"
				}],
				["data-value", {
					"kind": "binary",
					"left": {
						"kind": "binary",
						"left": {
							"index": 2,
							"kind": "input"
						},
						"operator": "+",
						"right": {
							"index": 0,
							"kind": "input"
						}
					},
					"operator": "+",
					"right": {
						"index": 3,
						"kind": "input"
					}
				}],
				["style", {
					"entries": [["transform", {
						"expressions": [{
							"kind": "binary",
							"left": {
								"kind": "binary",
								"left": {
									"index": 2,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 0,
									"kind": "input"
								}
							},
							"operator": "+",
							"right": {
								"index": 3,
								"kind": "input"
							}
						}],
						"kind": "template",
						"parts": ["translateX(", "px)"]
					}], ["opacity", {
						"kind": "binary",
						"left": {
							"kind": "binary",
							"left": {
								"kind": "binary",
								"left": {
									"index": 2,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 0,
									"kind": "input"
								}
							},
							"operator": "+",
							"right": {
								"index": 3,
								"kind": "input"
							}
						},
						"operator": "/",
						"right": {
							"kind": "literal",
							"value": 20
						}
					}]],
					"kind": "style"
				}]
			],
			"tag": "div"
		},
		"inputs": [
			{
				"paths": [["offset", "x"], ["offset", "y"]],
				"storeProp": "first",
				"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0"
			},
			{
				"paths": [["position", "x"]],
				"storeProp": "position",
				"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1"
			},
			{
				"paths": [["offset", "x"], ["offset", "y"]],
				"storeProp": "second",
				"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2"
			}
		],
		"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel", Panel, {
	propOnlySites: [],
	closedComponentForwardProgram: {
		"childComponentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
		"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
		"key": "joint-leaf",
		"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
		"props": [
			["first", {
				"kind": "prop",
				"name": "sourceA"
			}],
			["position", {
				"kind": "prop",
				"name": "live"
			}],
			["second", {
				"kind": "prop",
				"name": "sourceB"
			}]
		],
		"schemaVersion": 1,
		"childComponent": Joint
	}
});
__nativeDefineComponent("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row", Row, {
	propOnlySites: ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
		moduleRevision: "native-v1-e55bd8cf2adf0ff4",
		slots: [{
			siteId: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
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
const first = deferred(), second = deferred(), health = deferred();
const fallbackLife = {
	mounts: 0,
	cleanups: 0
};
const payload = (x, y) => storeRecord({ offset: storeRecord({
	x,
	y
}) });
const positionState = (x) => storeRecord({ position: storeRecord({ x }) });
const position = createStore(positionState(1));
const resourceFirst = new AsyncResource(first.promise), resourceSecond = new AsyncResource(second.promise);
function Health(props) {
	const value = __nativeUseAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "health",
		"data-health": "ready"
	}, value);
}
function Fallback() {
	const [, setValue] = __nativeUseStateAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#state:0", 1);
	__nativeUseEffectAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#effect:0", () => {
		void setValue;
		fallbackLife.mounts++;
		return () => {
			fallbackLife.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "joint",
		"data-joint": "fallback"
	}, "joint waiting");
}
function Joint(props) {
	const a = __nativeUseAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0", props.first);
	const x = __nativeUseAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1", props.position);
	const b = __nativeUseAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2", props.second);
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "joint",
		"data-joint": "ready",
		"data-value": x.position.x + a.offset.x + b.offset.x,
		style: {
			transform: `translateX(${x.position.x + a.offset.x + b.offset.x}px)`,
			opacity: (x.position.x + a.offset.x + b.offset.x) / 20
		}
	}, /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "label",
		"data-label": "sum"
	}, x.position.x + a.offset.x + b.offset.x), /* @__PURE__ */ __nativeJsx.jsx("span", {
		key: "model",
		"data-model": "sum"
	}, a.offset.y + b.offset.y));
}
function Panel(props) {
	return /* @__PURE__ */ __nativeJsx.jsx(Joint, {
		key: "joint-leaf",
		first: props.sourceA,
		position: props.live,
		second: props.sourceB
	});
}
function Card({ first, position, second }) {
	return /* @__PURE__ */ __nativeJsx.jsx(Panel, {
		sourceA: first,
		live: position,
		sourceB: second,
		note: "ready"
	});
}
function Row() {
	const [value, setValue] = __nativeUseStateAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0", 0);
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		key: "row",
		"data-row": "local",
		"data-local": __nativeBindStatePropAt("implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0", (value) => value, __nativeNumericPrograms[0]),
		onClick: () => setValue((previous) => previous + 1)
	}, "row");
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("main", null, /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("div", {
			key: "health",
			"data-health": "fallback"
		}, "health waiting"),
		__nativeBoundarySite: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Health, { resource: health.promise })), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx(Fallback, null),
		__nativeBoundarySite: "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#boundary:1"
	}, /* @__PURE__ */ __nativeJsx.jsx(Card, {
		first: resourceFirst,
		position,
		second: resourceSecond
	})), /* @__PURE__ */ __nativeJsx.jsx(Row, null));
}
export function mountNative(host) {
	const root = createDOMRoot(host);
	const started = performance.now();
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	const mountDurationMs = performance.now() - started;
	return {
		mountDurationMs,
		diagnostics() {
			return root.diagnostics();
		},
		settleSecond() {
			second.resolve(payload(2, 20));
		},
		settleFirst() {
			first.resolve(payload(3, 30));
		},
		updatePosition() {
			position.dispatch(positionState(7));
		},
		settleHealth() {
			health.resolve("health ready");
		},
		fallbackLife() {
			return { ...fallbackLife };
		},
		dispose() {
			root.dispose();
			return {
				...root.diagnostics(),
				fallbackLife: { ...fallbackLife },
				store: position.diagnostics()
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-e55bd8cf2adf0ff4",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx",
		"module_revision": "native-v1-e55bd8cf2adf0ff4",
		"owners": [
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#state:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550",
			"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
			"source_sites": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#effect:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2",
				"owner_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550"] },
			"execution_order": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550"]
		}
	},
	"source_file": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, createStore, storeRecord, Suspense, use, useEffect, useState } from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row\", sinkId: \"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"../../../src/native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row\", slotCount: 1, sinkIds: [\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card\", Card, { propOnlySites: [], closedComponentForwardProgram: {\"childComponentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel\",\"componentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card\",\"key\":null,\"moduleRevision\":\"native-v1-e55bd8cf2adf0ff4\",\"props\":[[\"sourceA\",{\"kind\":\"prop\",\"name\":\"first\"}],[\"live\",{\"kind\":\"prop\",\"name\":\"position\"}],[\"sourceB\",{\"kind\":\"prop\",\"name\":\"second\"}],[\"note\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"schemaVersion\":1,\"childComponent\":Panel} });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback\", Fallback, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health\", Health, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health\",\"host\":{\"child\":\"resource-value\",\"key\":\"health\",\"props\":[[\"data-health\",\"ready\"]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-e55bd8cf2adf0ff4\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0\",\"schemaVersion\":1}, closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"health\",\"props\":[[\"data-health\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"div\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0\"}],\"moduleRevision\":\"native-v1-e55bd8cf2adf0ff4\",\"schemaVersion\":4} });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint\", Joint, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":2,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":0,\"kind\":\"input\"}},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}},\"kind\":\"text\"}],\"key\":\"label\",\"props\":[[\"data-label\",{\"kind\":\"literal\",\"value\":\"sum\"}]],\"tag\":\"output\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":4,\"kind\":\"input\"}},\"kind\":\"text\"}],\"key\":\"model\",\"props\":[[\"data-model\",{\"kind\":\"literal\",\"value\":\"sum\"}]],\"tag\":\"span\"},\"kind\":\"host\"}],\"key\":\"joint\",\"props\":[[\"data-joint\",{\"kind\":\"literal\",\"value\":\"ready\"}],[\"data-value\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":2,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":0,\"kind\":\"input\"}},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}}],[\"style\",{\"entries\":[[\"transform\",{\"expressions\":[{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":2,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":0,\"kind\":\"input\"}},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}}],\"kind\":\"template\",\"parts\":[\"translateX(\",\"px)\"]}],[\"opacity\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":2,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"index\":0,\"kind\":\"input\"}},\"operator\":\"+\",\"right\":{\"index\":3,\"kind\":\"input\"}},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":20.0}}]],\"kind\":\"style\"}]],\"tag\":\"div\"},\"inputs\":[{\"paths\":[[\"offset\",\"x\"],[\"offset\",\"y\"]],\"storeProp\":\"first\",\"storeUseSiteId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0\"},{\"paths\":[[\"position\",\"x\"]],\"storeProp\":\"position\",\"storeUseSiteId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1\"},{\"paths\":[[\"offset\",\"x\"],[\"offset\",\"y\"]],\"storeProp\":\"second\",\"storeUseSiteId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2\"}],\"moduleRevision\":\"native-v1-e55bd8cf2adf0ff4\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel\", Panel, { propOnlySites: [], closedComponentForwardProgram: {\"childComponentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint\",\"componentProgramId\":\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel\",\"key\":\"joint-leaf\",\"moduleRevision\":\"native-v1-e55bd8cf2adf0ff4\",\"props\":[[\"first\",{\"kind\":\"prop\",\"name\":\"sourceA\"}],[\"position\",{\"kind\":\"prop\",\"name\":\"live\"}],[\"second\",{\"kind\":\"prop\",\"name\":\"sourceB\"}]],\"schemaVersion\":1,\"childComponent\":Joint} });\n__nativeDefineComponent(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row\", Row, { propOnlySites: [\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row\", moduleRevision: \"native-v1-e55bd8cf2adf0ff4\", slots: [{ siteId: \"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\ntype Payload = Readonly<{ offset: Readonly<{ x: number; y: number }> }>;\ntype Deferred<T> = { promise: Promise<T>; resolve(value: T): void };\nfunction deferred<T>(): Deferred<T> {\n  let resolve!: (value: T) => void;\n  const promise = new Promise<T>((done) => { resolve = done; });\n  return { promise, resolve };\n}\nconst first = deferred<Payload>(), second = deferred<Payload>(), health = deferred<string>();\nconst fallbackLife = { mounts: 0, cleanups: 0 };\nconst payload = (x: number, y: number) => storeRecord({ offset: storeRecord({ x, y }) });\nconst positionState = (x: number) => storeRecord({ position: storeRecord({ x }) });\nconst position = createStore(positionState(1));\nconst resourceFirst = new AsyncResource(first.promise), resourceSecond = new AsyncResource(second.promise);\nfunction Health(props: { resource: Promise<string> }) {\n  const value = __nativeUseAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0\", props.resource);\n  return <div key=\"health\" data-health=\"ready\">{value}</div>;\n}\nfunction Fallback() {\n  const [, setValue] = __nativeUseStateAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#state:0\", 1);\n  __nativeUseEffectAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#effect:0\", () => { void setValue; fallbackLife.mounts++; return () => { fallbackLife.cleanups++; }; });\n  return <span key=\"joint\" data-joint=\"fallback\">joint waiting</span>;\n}\nfunction Joint(props: { first: AsyncResource<Payload>; position: typeof position; second: AsyncResource<Payload> }) {\n  const a = __nativeUseAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0\", props.first);\n  const x = __nativeUseAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1\", props.position);\n  const b = __nativeUseAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2\", props.second);\n  return <div key=\"joint\" data-joint=\"ready\" data-value={x.position.x + a.offset.x + b.offset.x} style={{ transform: `translateX(${x.position.x + a.offset.x + b.offset.x}px)`, opacity: (x.position.x + a.offset.x + b.offset.x) / 20 }}><output key=\"label\" data-label=\"sum\">{x.position.x + a.offset.x + b.offset.x}</output><span key=\"model\" data-model=\"sum\">{a.offset.y + b.offset.y}</span></div>;\n}\ntype ForwardPosition = typeof position;\nfunction Panel(props: { sourceA: AsyncResource<Payload>; live: ForwardPosition; sourceB: AsyncResource<Payload>; note: string }) {\n  return <Joint key=\"joint-leaf\" first={props.sourceA} position={props.live} second={props.sourceB} />;\n}\nfunction Card({ first, position, second }: { first: AsyncResource<Payload>; position: ForwardPosition; second: AsyncResource<Payload> }) {\n  return <Panel sourceA={first} live={position} sourceB={second} note={\"ready\"} />;\n}\nfunction Row() {\n  const [value, setValue] = __nativeUseStateAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0\", 0);\n  return <button key=\"row\" data-row=\"local\" data-local={__nativeBindStatePropAt(\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0\", (value) => (value), __nativeNumericPrograms[0])} onClick={() => setValue((previous) => previous + 1)}>row</button>;\n}\nfunction App() {\n  return <main><Suspense fallback={<div key=\"health\" data-health=\"fallback\">health waiting</div>} __nativeBoundarySite=\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#boundary:0\"><Health resource={health.promise} /></Suspense><Suspense fallback={<Fallback />} __nativeBoundarySite=\"implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#boundary:1\"><Card first={resourceFirst} position={position} second={resourceSecond} /></Suspense><Row /></main>;\n}\nexport function mountNative(host: HTMLElement) {\n  const root = createDOMRoot(host);\n  const started = performance.now(); root.mount(<App />);\n  const mountDurationMs = performance.now() - started;\n  return {\n    mountDurationMs,\n    diagnostics() { return root.diagnostics(); },\n    settleSecond() { second.resolve(payload(2, 20)); },\n    settleFirst() { first.resolve(payload(3, 30)); },\n    updatePosition() { position.dispatch(positionState(7)); },\n    settleHealth() { health.resolve(\"health ready\"); },\n    fallbackLife() { return { ...fallbackLife }; },\n    dispose() { root.dispose(); return { ...root.diagnostics(), fallbackLife: { ...fallbackLife }, store: position.diagnostics() }; },\n  };\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:App",
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
			"name": "Card",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"closedComponentForwardProgram": {
				"childComponentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
				"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Card",
				"key": null,
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"props": [
					["sourceA", {
						"kind": "prop",
						"name": "first"
					}],
					["live", {
						"kind": "prop",
						"name": "position"
					}],
					["sourceB", {
						"kind": "prop",
						"name": "second"
					}],
					["note", {
						"kind": "literal",
						"value": "ready"
					}]
				],
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Fallback",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Fallback#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Health",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
				"host": {
					"child": "resource-value",
					"key": "health",
					"props": [["data-health", "ready"]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"resourceProp": "resource",
				"resourceUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0",
				"schemaVersion": 1
			},
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health",
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
					"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Health#store:0"
				}],
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Joint",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [
				{
					"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0",
					"source_expression": "props.first"
				},
				{
					"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1",
					"source_expression": "props.position"
				},
				{
					"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2",
					"source_expression": "props.second"
				}
			],
			"closedStoreHostProgram": {
				"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"host": {
					"children": [{
						"host": {
							"children": [{
								"expression": {
									"kind": "binary",
									"left": {
										"kind": "binary",
										"left": {
											"index": 2,
											"kind": "input"
										},
										"operator": "+",
										"right": {
											"index": 0,
											"kind": "input"
										}
									},
									"operator": "+",
									"right": {
										"index": 3,
										"kind": "input"
									}
								},
								"kind": "text"
							}],
							"key": "label",
							"props": [["data-label", {
								"kind": "literal",
								"value": "sum"
							}]],
							"tag": "output"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"kind": "binary",
									"left": {
										"index": 1,
										"kind": "input"
									},
									"operator": "+",
									"right": {
										"index": 4,
										"kind": "input"
									}
								},
								"kind": "text"
							}],
							"key": "model",
							"props": [["data-model", {
								"kind": "literal",
								"value": "sum"
							}]],
							"tag": "span"
						},
						"kind": "host"
					}],
					"key": "joint",
					"props": [
						["data-joint", {
							"kind": "literal",
							"value": "ready"
						}],
						["data-value", {
							"kind": "binary",
							"left": {
								"kind": "binary",
								"left": {
									"index": 2,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"index": 0,
									"kind": "input"
								}
							},
							"operator": "+",
							"right": {
								"index": 3,
								"kind": "input"
							}
						}],
						["style", {
							"entries": [["transform", {
								"expressions": [{
									"kind": "binary",
									"left": {
										"kind": "binary",
										"left": {
											"index": 2,
											"kind": "input"
										},
										"operator": "+",
										"right": {
											"index": 0,
											"kind": "input"
										}
									},
									"operator": "+",
									"right": {
										"index": 3,
										"kind": "input"
									}
								}],
								"kind": "template",
								"parts": ["translateX(", "px)"]
							}], ["opacity", {
								"kind": "binary",
								"left": {
									"kind": "binary",
									"left": {
										"kind": "binary",
										"left": {
											"index": 2,
											"kind": "input"
										},
										"operator": "+",
										"right": {
											"index": 0,
											"kind": "input"
										}
									},
									"operator": "+",
									"right": {
										"index": 3,
										"kind": "input"
									}
								},
								"operator": "/",
								"right": {
									"kind": "literal",
									"value": 20
								}
							}]],
							"kind": "style"
						}]
					],
					"tag": "div"
				},
				"inputs": [
					{
						"paths": [["offset", "x"], ["offset", "y"]],
						"storeProp": "first",
						"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:0"
					},
					{
						"paths": [["position", "x"]],
						"storeProp": "position",
						"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:1"
					},
					{
						"paths": [["offset", "x"], ["offset", "y"]],
						"storeProp": "second",
						"storeUseSiteId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint#store:2"
					}
				],
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Panel",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"closedComponentForwardProgram": {
				"childComponentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Joint",
				"componentProgramId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Panel",
				"key": "joint-leaf",
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"props": [
					["first", {
						"kind": "prop",
						"name": "sourceA"
					}],
					["position", {
						"kind": "prop",
						"name": "live"
					}],
					["second", {
						"kind": "prop",
						"name": "sourceB"
					}]
				],
				"schemaVersion": 1
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
			"prop_only_sites": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row",
				"moduleRevision": "native-v1-e55bd8cf2adf0ff4",
				"slots": [{
					"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#numeric-sink:2550",
				"source_sites": ["implementation/2026-10-18-component-forwarding/benchmark/native_arm.tsx#component:Row#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
