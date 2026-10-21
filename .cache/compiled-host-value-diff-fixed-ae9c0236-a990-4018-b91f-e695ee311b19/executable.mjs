import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx",
	"module_revision": "native-v1-80ccd5460f82546b",
	"owners": [
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomTarget",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeTarget",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#state:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp#state:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#collection:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row#effect:0",
			"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row",
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
		if (event?.sourceFile === ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx" && event.previousRevision === "native-v1-80ccd5460f82546b" && event.previousInstance === "native-v1-80ccd5460f82546b") __invalidateNativeSemanticPlan(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx", "native-v1-80ccd5460f82546b");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createKeyedCollection, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp", DomApp, {
	propOnlySites: [],
	closedCollectionSites: []
});
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomTarget", DomTarget, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom", PendingDom, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree", PendingThree, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row", Row, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp", ThreeApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeTarget", ThreeTarget, {
	propOnlySites: [],
	hostLeafOutput: true
});
import { Vector3 } from "three";
export const values = {
	position: new Vector3(1, 2, 3),
	rotation: [
		0,
		0,
		0
	],
	style: {
		color: "red",
		opacity: 1
	},
	scalar: "first",
	payload: { marker: "same-reference" }
};
export const rows = createKeyedCollection([{
	id: "a",
	label: "Alpha"
}, {
	id: "b",
	label: "Beta"
}], (row) => row.id);
let resolvePending;
export const pending = new AsyncResource(new Promise((resolve) => {
	resolvePending = resolve;
}));
export const resolveResource = (value) => resolvePending(value);
export const trace = {
	setDom: null,
	setThree: null,
	mounts: {},
	cleanups: {}
};
export function Row(props) {
	const row = props.row;
	__nativeUseEffectAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row#effect:0", () => {
		trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
		return () => {
			trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1;
		};
	});
	return /* @__PURE__ */ jsx("li", {
		key: row.id,
		"data-row": row.id
	}, row.label);
}
export function DomTarget(props) {
	return /* @__PURE__ */ jsx("output", {
		key: "dom-target",
		style: values.style,
		"data-step": props.step,
		"data-scalar": values.scalar,
		payload: values.payload
	});
}
export function ThreeTarget(props) {
	return /* @__PURE__ */ jsx("mesh", {
		key: "three-target",
		name: `step-${props.step}`,
		position: values.position,
		rotation: values.rotation
	}, /* @__PURE__ */ jsx("boxGeometry", { key: "three-geometry" }), /* @__PURE__ */ jsx("meshStandardMaterial", { key: "three-material" }));
}
export function PendingDom() {
	const value = __nativeUseAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0", pending);
	return /* @__PURE__ */ jsx("span", {
		key: "pending-dom",
		"data-pending": value
	}, "ready");
}
export function PendingThree() {
	const value = __nativeUseAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0", pending);
	return /* @__PURE__ */ jsx("group", {
		key: "pending-three",
		name: value
	});
}
export function DomApp() {
	const [step, setStep] = __nativeUseStateAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#state:0", 0);
	trace.setDom = setStep;
	return /* @__PURE__ */ jsx("section", { key: "dom-root" }, /* @__PURE__ */ jsx(DomTarget, {
		key: "dom-owner",
		step
	}), /* @__PURE__ */ jsx("ul", { key: "row-list" }, __nativeRenderCollectionAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#collection:0", rows, ((row) => /* @__PURE__ */ jsx(Row, { row })), { requiresOwnerRender: true })), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("span", {
			key: "pending-dom",
			"data-pending": "waiting"
		}),
		__nativeBoundarySite: ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(PendingDom, { key: "pending-dom-owner" })));
}
export function ThreeApp() {
	const [step, setStep] = __nativeUseStateAt(".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp#state:0", 0);
	trace.setThree = setStep;
	return /* @__PURE__ */ jsx("group", { key: "scene-root" }, /* @__PURE__ */ jsx(ThreeTarget, {
		key: "three-owner",
		step
	}), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("group", {
			key: "pending-three",
			name: "waiting"
		}),
		__nativeBoundarySite: ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#boundary:1"
	}, /* @__PURE__ */ jsx(PendingThree, { key: "pending-three-owner" })));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-80ccd5460f82546b",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx",
		"module_revision": "native-v1-80ccd5460f82546b",
		"owners": [
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomTarget",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeTarget",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#state:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp#state:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#collection:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row#effect:0",
				"owner_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row",
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
	"source_file": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport { AsyncResource, Suspense, createKeyedCollection, jsx, use, useEffect, useState } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp\", DomApp, { propOnlySites: [], closedCollectionSites: [] });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomTarget\", DomTarget, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom\", PendingDom, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree\", PendingThree, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row\", Row, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp\", ThreeApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeTarget\", ThreeTarget, { propOnlySites: [], hostLeafOutput: true });\nimport { Vector3 } from \"three\";\n\nexport const values = {\n  position: new Vector3(1, 2, 3),\n  rotation: [0, 0, 0],\n  style: { color: \"red\", opacity: 1 },\n  scalar: \"first\",\n  payload: { marker: \"same-reference\" },\n};\nexport const rows = createKeyedCollection([\n  { id: \"a\", label: \"Alpha\" }, { id: \"b\", label: \"Beta\" },\n], row => row.id);\nlet resolvePending;\nexport const pending = new AsyncResource(new Promise(resolve => { resolvePending = resolve; }));\nexport const resolveResource = value => resolvePending(value);\nexport const trace = {\n  setDom: null, setThree: null, mounts: {}, cleanups: {},\n};\n\nexport function Row(props) {\n  const row = props.row;\n  __nativeUseEffectAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row#effect:0\", () => {\n    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;\n    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1; };\n  });\n  return <li key={row.id} data-row={row.id}>{row.label}</li>;\n}\nexport function DomTarget(props) {\n  return <output key=\"dom-target\" style={values.style}\n    data-step={props.step} data-scalar={values.scalar} payload={values.payload} />;\n}\nexport function ThreeTarget(props) {\n  return <mesh key=\"three-target\" name={`step-${props.step}`}\n    position={values.position} rotation={values.rotation}>\n    <boxGeometry key=\"three-geometry\" />\n    <meshStandardMaterial key=\"three-material\" />\n  </mesh>;\n}\nexport function PendingDom() {\n  const value = __nativeUseAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0\", pending);\n  return <span key=\"pending-dom\" data-pending={value}>ready</span>;\n}\nexport function PendingThree() {\n  const value = __nativeUseAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0\", pending);\n  return <group key=\"pending-three\" name={value} />;\n}\nexport function DomApp() {\n  const [step, setStep] = __nativeUseStateAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#state:0\", 0);\n  trace.setDom = setStep;\n  return <section key=\"dom-root\">\n    <DomTarget key=\"dom-owner\" step={step} />\n    <ul key=\"row-list\">{__nativeRenderCollectionAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#collection:0\", rows, (row => <Row row={row} />), { requiresOwnerRender: true })}</ul>\n    <Suspense fallback={<span key=\"pending-dom\" data-pending=\"waiting\" />} __nativeBoundarySite=\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#boundary:0\">\n      <PendingDom key=\"pending-dom-owner\" />\n    </Suspense>\n  </section>;\n}\nexport function ThreeApp() {\n  const [step, setStep] = __nativeUseStateAt(\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp#state:0\", 0);\n  trace.setThree = setStep;\n  return <group key=\"scene-root\">\n    <ThreeTarget key=\"three-owner\" step={step} />\n    <Suspense fallback={<group key=\"pending-three\" name=\"waiting\" />} __nativeBoundarySite=\".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#boundary:1\">\n      <PendingThree key=\"pending-three-owner\" />\n    </Suspense>\n  </group>;\n}\n",
	"components": [
		{
			"name": "DomApp",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomApp#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": true
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "DomTarget",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:DomTarget",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "PendingDom",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingDom#store:0",
				"source_expression": "pending"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "PendingThree",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:PendingThree#store:0",
				"source_expression": "pending"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Row",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:Row#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ThreeApp",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeApp#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ThreeTarget",
			"component_site_id": ".cache/compiled-host-value-diff-fixed-ae9c0236-a990-4018-b91f-e695ee311b19/host-value-diff.tsx#component:ThreeTarget",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
