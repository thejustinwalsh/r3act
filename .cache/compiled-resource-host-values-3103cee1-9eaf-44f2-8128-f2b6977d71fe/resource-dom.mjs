import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx",
	"module_revision": "native-v1-ec7a8ebe58186fe7",
	"owners": [
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#state:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#effect:0",
			"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
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
		if (event?.sourceFile === ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx" && event.previousRevision === "native-v1-ec7a8ebe58186fe7" && event.previousInstance === "native-v1-ec7a8ebe58186fe7") __invalidateNativeSemanticPlan(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx", "native-v1-ec7a8ebe58186fe7");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A", A, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B", B, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
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
					"key": "b-label",
					"props": [["data-label", {
						"kind": "literal",
						"value": "ready"
					}]],
					"tag": "span"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "b-output",
					"props": [["data-count", {
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
					}]],
					"tag": "output"
				},
				"kind": "host"
			}],
			"key": "b-root",
			"props": [["data-b", {
				"kind": "literal",
				"value": "ready"
			}], ["style", {
				"entries": [["color", {
					"kind": "literal",
					"value": "green"
				}], ["opacity", {
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
				}]],
				"kind": "style"
			}]],
			"tag": "div"
		},
		"moduleRevision": "native-v1-ec7a8ebe58186fe7",
		"resourceProp": "resource",
		"resourceUseSiteId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
		"schemaVersion": 3
	},
	closedStoreHostProgram: {
		"componentProgramId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
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
					"key": "b-label",
					"props": [["data-label", {
						"kind": "literal",
						"value": "ready"
					}]],
					"tag": "span"
				},
				"kind": "host"
			}, {
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "b-output",
					"props": [["data-count", {
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
					}]],
					"tag": "output"
				},
				"kind": "host"
			}],
			"key": "b-root",
			"props": [["data-b", {
				"kind": "literal",
				"value": "ready"
			}], ["style", {
				"entries": [["color", {
					"kind": "literal",
					"value": "green"
				}], ["opacity", {
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
				}]],
				"kind": "style"
			}]],
			"tag": "div"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0"
		}],
		"moduleRevision": "native-v1-ec7a8ebe58186fe7",
		"schemaVersion": 4
	}
});
__nativeDefineComponent(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB", FallbackB, {
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
	const value = __nativeUseAt(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0", __nativeUseAt(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1", mode) === 0 ? oldA.promise : nextA.promise);
	return /* @__PURE__ */ jsx("div", {
		key: "a-host",
		"data-a": "primary"
	}, value);
}
export function FallbackB() {
	const [, setValue] = __nativeUseStateAt(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#state:0", 1);
	__nativeUseEffectAt(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#effect:0", () => {
		trace.fallbackSetter = setValue;
		trace.fallbackMounts++;
		return () => {
			trace.fallbackCleanups++;
			if (trace.fallbackSetter === setValue) trace.fallbackSetter = null;
		};
	});
	return /* @__PURE__ */ jsx("span", {
		key: "b-root",
		"data-b": "fallback",
		style: { color: "gray" }
	}, "B waiting");
}
export function B(props) {
	const value = __nativeUseAt(".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0", props.resource);
	return /* @__PURE__ */ jsx("div", {
		key: "b-root",
		"data-b": "ready",
		style: {
			color: "green",
			opacity: value / 10
		}
	}, /* @__PURE__ */ jsx("span", {
		key: "b-label",
		"data-label": "ready"
	}, value), /* @__PURE__ */ jsx("output", {
		key: "b-output",
		"data-count": value + 1
	}, value));
}
export function App() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("div", {
			key: "a-host",
			"data-a": "fallback"
		}, "A waiting"),
		__nativeBoundarySite: ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(A, { key: "a-child" })), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(FallbackB, { key: "b-fallback-owner" }),
		__nativeBoundarySite: ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(B, {
		key: "b-child",
		resource: resourceB
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-ec7a8ebe58186fe7",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx",
		"module_revision": "native-v1-ec7a8ebe58186fe7",
		"owners": [
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#state:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#effect:0",
				"owner_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
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
	"source_file": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A\", A, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B\", B, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-label\",\"props\":[[\"data-label\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"span\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-output\",\"props\":[[\"data-count\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}]],\"tag\":\"output\"},\"kind\":\"host\"}],\"key\":\"b-root\",\"props\":[[\"data-b\",{\"kind\":\"literal\",\"value\":\"ready\"}],[\"style\",{\"entries\":[[\"color\",{\"kind\":\"literal\",\"value\":\"green\"}],[\"opacity\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}}]],\"kind\":\"style\"}]],\"tag\":\"div\"},\"moduleRevision\":\"native-v1-ec7a8ebe58186fe7\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0\",\"schemaVersion\":3}, closedStoreHostProgram: {\"componentProgramId\":\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B\",\"host\":{\"children\":[{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-label\",\"props\":[[\"data-label\",{\"kind\":\"literal\",\"value\":\"ready\"}]],\"tag\":\"span\"},\"kind\":\"host\"},{\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"b-output\",\"props\":[[\"data-count\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"+\",\"right\":{\"kind\":\"literal\",\"value\":1.0}}]],\"tag\":\"output\"},\"kind\":\"host\"}],\"key\":\"b-root\",\"props\":[[\"data-b\",{\"kind\":\"literal\",\"value\":\"ready\"}],[\"style\",{\"entries\":[[\"color\",{\"kind\":\"literal\",\"value\":\"green\"}],[\"opacity\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":10.0}}]],\"kind\":\"style\"}]],\"tag\":\"div\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0\"}],\"moduleRevision\":\"native-v1-ec7a8ebe58186fe7\",\"schemaVersion\":4} });\n__nativeDefineComponent(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB\", FallbackB, { propOnlySites: [], hostLeafOutput: true });\nexport function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }\nexport const oldA = deferred(), nextA = deferred(), pendingB = deferred();\nexport const resourceB = new AsyncResource(pendingB.promise);\nexport const mode = createStore(0, (_current, next) => next);\nexport const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };\nexport function A() { const value = __nativeUseAt(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0\", __nativeUseAt(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1\", mode) === 0 ? oldA.promise : nextA.promise); return <div key=\"a-host\" data-a=\"primary\">{value}</div>; }\nexport function FallbackB() {\n  const [, setValue] = __nativeUseStateAt(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#state:0\", 1);\n  __nativeUseEffectAt(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#effect:0\", () => { trace.fallbackSetter = setValue; trace.fallbackMounts++;\n    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });\n  return <span key=\"b-root\" data-b=\"fallback\" style={{ color: \"gray\" }}>B waiting</span>;\n}\nexport function B(props) { const value = __nativeUseAt(\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0\", props.resource); return <div key=\"b-root\" data-b=\"ready\" style={{ color: \"green\", opacity: value / 10 }}><span key=\"b-label\" data-label=\"ready\">{value}</span><output key=\"b-output\" data-count={value + 1}>{value}</output></div>; }\nexport function App() { return <section>\n  <Suspense fallback={<div key=\"a-host\" data-a=\"fallback\">A waiting</div>} __nativeBoundarySite=\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#boundary:0\"><A key=\"a-child\" /></Suspense>\n  <Suspense fallback={<FallbackB key=\"b-fallback-owner\" />} __nativeBoundarySite=\".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#boundary:1\"><B key=\"b-child\" resource={resourceB} /></Suspense>\n</section>; }\n",
	"components": [
		{
			"name": "A",
			"component_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:0",
				"source_expression": "use(mode) === 0 ? oldA.promise : nextA.promise"
			}, {
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:A#store:1",
				"source_expression": "mode"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "App",
			"component_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:App",
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
			"component_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
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
							"key": "b-label",
							"props": [["data-label", {
								"kind": "literal",
								"value": "ready"
							}]],
							"tag": "span"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "b-output",
							"props": [["data-count", {
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
							}]],
							"tag": "output"
						},
						"kind": "host"
					}],
					"key": "b-root",
					"props": [["data-b", {
						"kind": "literal",
						"value": "ready"
					}], ["style", {
						"entries": [["color", {
							"kind": "literal",
							"value": "green"
						}], ["opacity", {
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
						}]],
						"kind": "style"
					}]],
					"tag": "div"
				},
				"moduleRevision": "native-v1-ec7a8ebe58186fe7",
				"resourceProp": "resource",
				"resourceUseSiteId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0",
				"schemaVersion": 3
			},
			"closedStoreHostProgram": {
				"componentProgramId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B",
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
							"key": "b-label",
							"props": [["data-label", {
								"kind": "literal",
								"value": "ready"
							}]],
							"tag": "span"
						},
						"kind": "host"
					}, {
						"host": {
							"children": [{
								"expression": {
									"index": 0,
									"kind": "input"
								},
								"kind": "text"
							}],
							"key": "b-output",
							"props": [["data-count", {
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
							}]],
							"tag": "output"
						},
						"kind": "host"
					}],
					"key": "b-root",
					"props": [["data-b", {
						"kind": "literal",
						"value": "ready"
					}], ["style", {
						"entries": [["color", {
							"kind": "literal",
							"value": "green"
						}], ["opacity", {
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
						}]],
						"kind": "style"
					}]],
					"tag": "div"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:B#store:0"
				}],
				"moduleRevision": "native-v1-ec7a8ebe58186fe7",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "FallbackB",
			"component_site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#state:0",
				"initial_value": "1"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-resource-host-values-3103cee1-9eaf-44f2-8128-f2b6977d71fe/resource-dom.tsx#component:FallbackB#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
