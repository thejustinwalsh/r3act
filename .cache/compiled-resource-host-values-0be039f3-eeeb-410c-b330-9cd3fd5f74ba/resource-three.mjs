import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx",
	"module_revision": "native-v1-88f74df4c7433f29",
	"owners": [
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#state:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#effect:0",
			"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx" && event.previousRevision === "native-v1-88f74df4c7433f29" && event.previousInstance === "native-v1-88f74df4c7433f29") __invalidateNativeSemanticPlan(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx", "native-v1-88f74df4c7433f29");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A", A, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B", B, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "b-mesh",
					"props": [["position", {
						"items": [
							{
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"kind": "literal",
									"value": 1
								}
							},
							{
								"kind": "literal",
								"value": 2
							},
							{
								"kind": "literal",
								"value": 3
							}
						],
						"kind": "tuple"
					}]],
					"tag": "mesh"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [],
					"key": "b-child",
					"props": [["name", {
						"kind": "literal",
						"value": "static"
					}], ["scale", {
						"items": [
							{
								"kind": "literal",
								"value": 1
							},
							{
								"kind": "literal",
								"value": 2
							},
							{
								"kind": "literal",
								"value": 3
							}
						],
						"kind": "tuple"
					}]],
					"tag": "group"
				},
				"kind": "host"
			}],
			"key": "b-root",
			"props": [["name", {
				"kind": "literal",
				"value": "ready"
			}], ["rotation", {
				"items": [
					{
						"kind": "literal",
						"value": 0
					},
					{
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "/",
						"right": {
							"kind": "literal",
							"value": 10
						}
					},
					{
						"kind": "literal",
						"value": 0
					}
				],
				"kind": "tuple"
			}]],
			"tag": "group"
		},
		"moduleRevision": "native-v1-88f74df4c7433f29",
		"resourceProp": "resource",
		"resourceUseSiteId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
		"schemaVersion": 3
	},
	closedStoreHostProgram: {
		"componentProgramId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
		"host": {
			"children": [{
				"host": {
					"children": [],
					"key": "b-mesh",
					"props": [["position", {
						"items": [
							{
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "+",
								"right": {
									"kind": "literal",
									"value": 1
								}
							},
							{
								"kind": "literal",
								"value": 2
							},
							{
								"kind": "literal",
								"value": 3
							}
						],
						"kind": "tuple"
					}]],
					"tag": "mesh"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [],
					"key": "b-child",
					"props": [["name", {
						"kind": "literal",
						"value": "static"
					}], ["scale", {
						"items": [
							{
								"kind": "literal",
								"value": 1
							},
							{
								"kind": "literal",
								"value": 2
							},
							{
								"kind": "literal",
								"value": 3
							}
						],
						"kind": "tuple"
					}]],
					"tag": "group"
				},
				"kind": "host"
			}],
			"key": "b-root",
			"props": [["name", {
				"kind": "literal",
				"value": "ready"
			}], ["rotation", {
				"items": [
					{
						"kind": "literal",
						"value": 0
					},
					{
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "/",
						"right": {
							"kind": "literal",
							"value": 10
						}
					},
					{
						"kind": "literal",
						"value": 0
					}
				],
				"kind": "tuple"
			}]],
			"tag": "group"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0"
		}],
		"moduleRevision": "native-v1-88f74df4c7433f29",
		"schemaVersion": 4
	}
});
__nativeDefineComponent(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB", FallbackB, {
	propOnlySites: [],
	hostLeafOutput: true
});
export function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
}
export const oldA = deferred(), nextA = deferred(), pendingB = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const mode = createStore(0, (_current, next) => next);
export const trace = {
	fallbackMounts: 0,
	fallbackCleanups: 0,
	fallbackSetter: null
};
export function A() {
	const value = __nativeUseAt(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0", __nativeUseAt(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1", mode) === 0 ? oldA.promise : nextA.promise);
	return /* @__PURE__ */ jsx("group", {
		key: "a-host",
		name: value
	});
}
export function FallbackB() {
	const [, setValue] = __nativeUseStateAt(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#state:0", 1);
	__nativeUseEffectAt(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#effect:0", () => {
		trace.fallbackSetter = setValue;
		trace.fallbackMounts++;
		return () => {
			trace.fallbackCleanups++;
			if (trace.fallbackSetter === setValue) trace.fallbackSetter = null;
		};
	});
	return /* @__PURE__ */ jsx("mesh", {
		key: "b-root",
		name: "waiting"
	}, /* @__PURE__ */ jsx("boxGeometry", null), /* @__PURE__ */ jsx("meshStandardMaterial", null));
}
export function B(props) {
	const value = __nativeUseAt(".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0", props.resource);
	return /* @__PURE__ */ jsx("group", {
		key: "b-root",
		name: "ready",
		rotation: __nativeStabilizeHostTuple([
			0,
			value / 10,
			0
		])
	}, /* @__PURE__ */ jsx("mesh", {
		key: "b-mesh",
		position: __nativeStabilizeHostTuple([
			value + 1,
			2,
			3
		])
	}), /* @__PURE__ */ jsx("group", {
		key: "b-child",
		name: "static",
		scale: __nativeStabilizeHostTuple([
			1,
			2,
			3
		])
	}));
}
export function App() {
	return /* @__PURE__ */ jsx("group", { key: "scene-root" }, /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("group", {
			key: "a-host",
			name: "A waiting"
		}),
		__nativeBoundarySite: ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(A, { key: "a-child" })), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(FallbackB, { key: "b-fallback-owner" }),
		__nativeBoundarySite: ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(B, {
		key: "b-child",
		resource: resourceB
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-88f74df4c7433f29",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx",
		"module_revision": "native-v1-88f74df4c7433f29",
		"owners": [
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#state:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#effect:0",
				"owner_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt, stabilizeHostTuple as __nativeStabilizeHostTuple } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A\", A, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B\", B, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"b-mesh\",\"props\":[[\"position\",{\"items\":[{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}},{\"kind\":\"literal\",\"value\":2.0},{\"kind\":\"literal\",\"value\":3.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"kind\":\"host\"},{\"host\":{\"children\":[],\"key\":\"b-child\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"static\"}],[\"scale\",{\"items\":[{\"kind\":\"literal\",\"value\":1.0},{\"kind\":\"literal\",\"value\":2.0},{\"kind\":\"literal\",\"value\":3.0}],\"kind\":\"tuple\"}]],\"tag\":\"group\"},\"kind\":\"host\"}],\"key\":\"b-root\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"ready\"}],[\"rotation\",{\"items\":[{\"kind\":\"literal\",\"value\":0.0},{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"group\"},\"moduleRevision\":\"native-v1-88f74df4c7433f29\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0\",\"schemaVersion\":3}, closedStoreHostProgram: {\"componentProgramId\":\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B\",\"host\":{\"children\":[{\"host\":{\"children\":[],\"key\":\"b-mesh\",\"props\":[[\"position\",{\"items\":[{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}},{\"kind\":\"literal\",\"value\":2.0},{\"kind\":\"literal\",\"value\":3.0}],\"kind\":\"tuple\"}]],\"tag\":\"mesh\"},\"kind\":\"host\"},{\"host\":{\"children\":[],\"key\":\"b-child\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"static\"}],[\"scale\",{\"items\":[{\"kind\":\"literal\",\"value\":1.0},{\"kind\":\"literal\",\"value\":2.0},{\"kind\":\"literal\",\"value\":3.0}],\"kind\":\"tuple\"}]],\"tag\":\"group\"},\"kind\":\"host\"}],\"key\":\"b-root\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"ready\"}],[\"rotation\",{\"items\":[{\"kind\":\"literal\",\"value\":0.0},{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}},{\"kind\":\"literal\",\"value\":0.0}],\"kind\":\"tuple\"}]],\"tag\":\"group\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0\"}],\"moduleRevision\":\"native-v1-88f74df4c7433f29\",\"schemaVersion\":4} });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB\", FallbackB, { propOnlySites: [], hostLeafOutput: true });\nexport function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }\nexport const oldA = deferred(), nextA = deferred(), pendingB = deferred();\nexport const resourceB = new AsyncResource(pendingB.promise);\nexport const mode = createStore(0, (_current, next) => next);\nexport const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };\nexport function A() { const value = __nativeUseAt(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0\", __nativeUseAt(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1\", mode) === 0 ? oldA.promise : nextA.promise); return <group key=\"a-host\" name={value} />; }\nexport function FallbackB() {\n  const [, setValue] = __nativeUseStateAt(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#state:0\", 1);\n  __nativeUseEffectAt(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#effect:0\", () => { trace.fallbackSetter = setValue; trace.fallbackMounts++;\n    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });\n  return <mesh key=\"b-root\" name=\"waiting\"><boxGeometry /><meshStandardMaterial /></mesh>;\n}\nexport function B(props) { const value = __nativeUseAt(\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0\", props.resource); return <group key=\"b-root\" name=\"ready\" rotation={__nativeStabilizeHostTuple([0, value / 10, 0])}><mesh key=\"b-mesh\" position={__nativeStabilizeHostTuple([value + 1, 2, 3])} /><group key=\"b-child\" name=\"static\" scale={__nativeStabilizeHostTuple([1, 2, 3])} /></group>; }\nexport function App() { return <group key=\"scene-root\">\n  <Suspense fallback={<group key=\"a-host\" name=\"A waiting\" />} __nativeBoundarySite=\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#boundary:0\"><A key=\"a-child\" /></Suspense>\n  <Suspense fallback={<FallbackB key=\"b-fallback-owner\" />} __nativeBoundarySite=\".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#boundary:1\"><B key=\"b-child\" resource={resourceB} /></Suspense>\n</group>; }\n",
	"components": [
		{
			"name": "A",
			"component_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:0",
				"source_expression": "use(mode) === 0 ? oldA.promise : nextA.promise"
			}, {
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:A#store:1",
				"source_expression": "mode"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:App",
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
			"name": "B",
			"component_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
				"host": {
					"children": [{
						"host": {
							"children": [],
							"key": "b-mesh",
							"props": [["position", {
								"items": [
									{
										"kind": "binary",
										"left": {
											"index": 0,
											"kind": "input"
										},
										"operator": "+",
										"right": {
											"kind": "literal",
											"value": 1
										}
									},
									{
										"kind": "literal",
										"value": 2
									},
									{
										"kind": "literal",
										"value": 3
									}
								],
								"kind": "tuple"
							}]],
							"tag": "mesh"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [],
							"key": "b-child",
							"props": [["name", {
								"kind": "literal",
								"value": "static"
							}], ["scale", {
								"items": [
									{
										"kind": "literal",
										"value": 1
									},
									{
										"kind": "literal",
										"value": 2
									},
									{
										"kind": "literal",
										"value": 3
									}
								],
								"kind": "tuple"
							}]],
							"tag": "group"
						},
						"kind": "host"
					}],
					"key": "b-root",
					"props": [["name", {
						"kind": "literal",
						"value": "ready"
					}], ["rotation", {
						"items": [
							{
								"kind": "literal",
								"value": 0
							},
							{
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "/",
								"right": {
									"kind": "literal",
									"value": 10
								}
							},
							{
								"kind": "literal",
								"value": 0
							}
						],
						"kind": "tuple"
					}]],
					"tag": "group"
				},
				"moduleRevision": "native-v1-88f74df4c7433f29",
				"resourceProp": "resource",
				"resourceUseSiteId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0",
				"schemaVersion": 3
			},
			"closedStoreHostProgram": {
				"componentProgramId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B",
				"host": {
					"children": [{
						"host": {
							"children": [],
							"key": "b-mesh",
							"props": [["position", {
								"items": [
									{
										"kind": "binary",
										"left": {
											"index": 0,
											"kind": "input"
										},
										"operator": "+",
										"right": {
											"kind": "literal",
											"value": 1
										}
									},
									{
										"kind": "literal",
										"value": 2
									},
									{
										"kind": "literal",
										"value": 3
									}
								],
								"kind": "tuple"
							}]],
							"tag": "mesh"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [],
							"key": "b-child",
							"props": [["name", {
								"kind": "literal",
								"value": "static"
							}], ["scale", {
								"items": [
									{
										"kind": "literal",
										"value": 1
									},
									{
										"kind": "literal",
										"value": 2
									},
									{
										"kind": "literal",
										"value": 3
									}
								],
								"kind": "tuple"
							}]],
							"tag": "group"
						},
						"kind": "host"
					}],
					"key": "b-root",
					"props": [["name", {
						"kind": "literal",
						"value": "ready"
					}], ["rotation", {
						"items": [
							{
								"kind": "literal",
								"value": 0
							},
							{
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "/",
								"right": {
									"kind": "literal",
									"value": 10
								}
							},
							{
								"kind": "literal",
								"value": 0
							}
						],
						"kind": "tuple"
					}]],
					"tag": "group"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:B#store:0"
				}],
				"moduleRevision": "native-v1-88f74df4c7433f29",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "FallbackB",
			"component_site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-resource-host-values-0be039f3-eeeb-410c-b330-9cd3fd5f74ba/resource-three.tsx#component:FallbackB#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
