import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "closed_rows_native.tsx",
	"module_revision": "native-v1-fe99c8feb0287179",
	"owners": [
		{
			"site_id": "closed_rows_native.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "closed_rows_native.tsx#component:DomRow",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "closed_rows_native.tsx#component:DomRows",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "closed_rows_native.tsx#component:ThreeRow",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "closed_rows_native.tsx#component:ThreeRows",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "closed_rows_native.tsx#component:Waiting",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [{
		"site_id": "closed_rows_native.tsx#component:Waiting#store:0",
		"owner_site_id": "closed_rows_native.tsx#component:Waiting",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [],
	"operations": [
		{
			"site_id": "closed_rows_native.tsx#component:DomRows#collection:0",
			"owner_site_id": "closed_rows_native.tsx#component:DomRows",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "closed_rows_native.tsx#component:ThreeRows#collection:0",
			"owner_site_id": "closed_rows_native.tsx#component:ThreeRows",
			"kind": "collection",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "closed_rows_native.tsx#component:Waiting#store:0",
			"owner_site_id": "closed_rows_native.tsx#component:Waiting",
			"kind": "use-store-or-resource",
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
		if (event?.sourceFile === "closed_rows_native.tsx" && event.previousRevision === "native-v1-fe99c8feb0287179" && event.previousInstance === "native-v1-fe99c8feb0287179") __invalidateNativeSemanticPlan("closed_rows_native.tsx", "native-v1-fe99c8feb0287179");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { AsyncResource, createDOMRoot, createKeyedCollection, NativeRootWorkQueue, Suspense, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("closed_rows_native.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("closed_rows_native.tsx#component:DomRow", DomRow, { propOnlySites: [] });
__nativeDefineComponent("closed_rows_native.tsx#component:DomRows", DomRows, {
	propOnlySites: [],
	closedCollectionSites: ["closed_rows_native.tsx#component:DomRows#collection:0"],
	closedCollectionRowPrograms: [{
		"collectionSiteId": "closed_rows_native.tsx#component:DomRows#collection:0",
		"componentProgramId": "closed_rows_native.tsx#component:DomRows",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": null,
			"props": [["data-x", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"inputs": [{ "path": ["x"] }],
		"moduleRevision": "native-v1-fe99c8feb0287179",
		"rowComponentProgramId": "closed_rows_native.tsx#component:DomRow",
		"rowProp": "row",
		"schemaVersion": 1,
		"rowComponent": DomRow
	}]
});
__nativeDefineComponent("closed_rows_native.tsx#component:ThreeRow", ThreeRow, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("closed_rows_native.tsx#component:ThreeRows", ThreeRows, {
	propOnlySites: [],
	closedCollectionSites: ["closed_rows_native.tsx#component:ThreeRows#collection:0"],
	closedCollectionRowPrograms: [{
		"collectionSiteId": "closed_rows_native.tsx#component:ThreeRows#collection:0",
		"componentProgramId": "closed_rows_native.tsx#component:ThreeRows",
		"host": {
			"children": [],
			"key": null,
			"props": [["position-x", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "group"
		},
		"inputs": [{ "path": ["x"] }],
		"moduleRevision": "native-v1-fe99c8feb0287179",
		"rowComponentProgramId": "closed_rows_native.tsx#component:ThreeRow",
		"rowProp": "row",
		"schemaVersion": 1,
		"rowComponent": ThreeRow
	}]
});
__nativeDefineComponent("closed_rows_native.tsx#component:Waiting", Waiting, { propOnlySites: [] });
import { createThreeNativeRoot } from "@r3act/host-three";
import * as THREE from "three";
const rows = createKeyedCollection(Array.from({ length: 64 }, (_, id) => storeRecord({
	id,
	x: id
})), (row) => String(row.id));
const pending = new AsyncResource(new Promise(() => {}));
function DomRow({ row }) {
	return /* @__PURE__ */ __nativeJsx.jsx("output", { "data-x": row.x }, row.x);
}
function ThreeRow({ row }) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { "position-x": row.x });
}
function DomRows() {
	return /* @__PURE__ */ __nativeJsx.jsx("div", {
		key: "row-list",
		"data-list": "rows"
	}, __nativeRenderCollectionAt("closed_rows_native.tsx#component:DomRows#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(DomRow, { row }))));
}
function ThreeRows() {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "row-list" }, __nativeRenderCollectionAt("closed_rows_native.tsx#component:ThreeRows#collection:0", rows, ((row) => /* @__PURE__ */ __nativeJsx.jsx(ThreeRow, { row }))));
}
function Waiting() {
	return /* @__PURE__ */ __nativeJsx.jsx("span", null, __nativeUseAt("closed_rows_native.tsx#component:Waiting#store:0", pending));
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("section", null, /* @__PURE__ */ __nativeJsx.jsx(DomRows, null), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("span", { "data-pending": "yes" }, "waiting"),
		__nativeBoundarySite: "closed_rows_native.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Waiting, null)));
}
export function mountClosedRows(container) {
	const scene = new THREE.Group();
	const dom = createDOMRoot(container, {
		rootId: "installed-closed-row-dom",
		scheduleCommit() {}
	});
	const sceneRoot = createThreeNativeRoot(scene, { rootOptions: {
		rootId: "installed-closed-row-three",
		scheduleCommit() {}
	} });
	const three = sceneRoot.root;
	const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
	dom.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
	three.mount(/* @__PURE__ */ __nativeJsx.jsx(ThreeRows, null));
	const first = container.querySelector("output");
	const firstObject = scene.children[0]?.children[0];
	let disposed = false;
	return {
		step(index) {
			const cycle = Math.floor(index / 3), key = String(64 + cycle);
			const kind = index % 3;
			if (kind === 0) rows.apply(rows.version, [{
				type: "replace",
				key: "0",
				value: storeRecord({
					id: 0,
					x: 1e3 + index
				})
			}]);
			else if (kind === 1) rows.apply(rows.version, [{
				type: "insert",
				key,
				value: storeRecord({
					id: 64 + cycle,
					x: 2e3 + index
				}),
				beforeKey: null
			}]);
			else rows.apply(rows.version, [{
				type: "remove",
				key
			}]);
			const handle = queue.enqueueCollections({
				id: `closed-row-${index}`,
				roots: [{
					root: dom,
					collections: [rows]
				}, {
					root: three,
					collections: [rows]
				}]
			});
			if (handle.status !== "committed") throw new Error(`Closed row publication ${index}: ${handle.status}`);
		},
		inspect() {
			return {
				values: [...container.querySelectorAll("output")].map((node) => Number(node.textContent)),
				attributes: [...container.querySelectorAll("output")].map((node) => Number(node.getAttribute("data-x"))),
				positions: scene.children[0]?.children.map((node) => node.position.x) ?? [],
				identity: container.querySelector("output") === first && scene.children[0]?.children[0] === firstObject,
				pending: container.querySelector("[data-pending]")?.textContent === "waiting",
				versions: [dom.publicationVersion, three.publicationVersion],
				disposed
			};
		},
		dispose() {
			queue.dispose();
			dom.dispose();
			sceneRoot.dispose();
			disposed = true;
			return {
				hostChildren: container.childNodes.length,
				sceneChildren: scene.children.length,
				owners: [dom.diagnostics().ownerCount, three.diagnostics().ownerCount],
				pending: [dom.diagnostics().pendingChangeCount, three.diagnostics().pendingChangeCount]
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-fe99c8feb0287179",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "closed_rows_native.tsx",
		"module_revision": "native-v1-fe99c8feb0287179",
		"owners": [
			{
				"site_id": "closed_rows_native.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "closed_rows_native.tsx#component:DomRow",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "closed_rows_native.tsx#component:DomRows",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "closed_rows_native.tsx#component:ThreeRow",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "closed_rows_native.tsx#component:ThreeRows",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "closed_rows_native.tsx#component:Waiting",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [{
			"site_id": "closed_rows_native.tsx#component:Waiting#store:0",
			"owner_site_id": "closed_rows_native.tsx#component:Waiting",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [],
		"operations": [
			{
				"site_id": "closed_rows_native.tsx#component:DomRows#collection:0",
				"owner_site_id": "closed_rows_native.tsx#component:DomRows",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "closed_rows_native.tsx#component:ThreeRows#collection:0",
				"owner_site_id": "closed_rows_native.tsx#component:ThreeRows",
				"kind": "collection",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "closed_rows_native.tsx#component:Waiting#store:0",
				"owner_site_id": "closed_rows_native.tsx#component:Waiting",
				"kind": "use-store-or-resource",
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
	"source_file": "closed_rows_native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { AsyncResource, createDOMRoot, createKeyedCollection, jsx, NativeRootWorkQueue, Suspense, storeRecord, use } from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"closed_rows_native.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"closed_rows_native.tsx#component:DomRow\", DomRow, { propOnlySites: [] });\n__nativeDefineComponent(\"closed_rows_native.tsx#component:DomRows\", DomRows, { propOnlySites: [], closedCollectionSites: [\"closed_rows_native.tsx#component:DomRows#collection:0\"], closedCollectionRowPrograms: [{\"collectionSiteId\":\"closed_rows_native.tsx#component:DomRows#collection:0\",\"componentProgramId\":\"closed_rows_native.tsx#component:DomRows\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":null,\"props\":[[\"data-x\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"path\":[\"x\"]}],\"moduleRevision\":\"native-v1-fe99c8feb0287179\",\"rowComponentProgramId\":\"closed_rows_native.tsx#component:DomRow\",\"rowProp\":\"row\",\"schemaVersion\":1,\"rowComponent\":DomRow}] });\n__nativeDefineComponent(\"closed_rows_native.tsx#component:ThreeRow\", ThreeRow, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"closed_rows_native.tsx#component:ThreeRows\", ThreeRows, { propOnlySites: [], closedCollectionSites: [\"closed_rows_native.tsx#component:ThreeRows#collection:0\"], closedCollectionRowPrograms: [{\"collectionSiteId\":\"closed_rows_native.tsx#component:ThreeRows#collection:0\",\"componentProgramId\":\"closed_rows_native.tsx#component:ThreeRows\",\"host\":{\"children\":[],\"key\":null,\"props\":[[\"position-x\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"group\"},\"inputs\":[{\"path\":[\"x\"]}],\"moduleRevision\":\"native-v1-fe99c8feb0287179\",\"rowComponentProgramId\":\"closed_rows_native.tsx#component:ThreeRow\",\"rowProp\":\"row\",\"schemaVersion\":1,\"rowComponent\":ThreeRow}] });\n__nativeDefineComponent(\"closed_rows_native.tsx#component:Waiting\", Waiting, { propOnlySites: [] });\nimport { createThreeNativeRoot } from '@r3act/host-three';\nimport * as THREE from 'three';\n\ntype Item = { id: number; x: number };\nconst rows = createKeyedCollection<Item>(Array.from({ length: 64 }, (_, id) => storeRecord({ id, x: id })), row => String(row.id));\nconst pending = new AsyncResource(new Promise<number>(() => {}));\nfunction DomRow({ row }: { row: Item }) { return <output data-x={row.x}>{row.x}</output>; }\nfunction ThreeRow({ row }: { row: Item }) { return <group position-x={row.x} />; }\nfunction DomRows() { return <div key=\"row-list\" data-list=\"rows\">{__nativeRenderCollectionAt(\"closed_rows_native.tsx#component:DomRows#collection:0\", rows, (row => <DomRow row={row} />))}</div>; }\nfunction ThreeRows() { return <group key=\"row-list\">{__nativeRenderCollectionAt(\"closed_rows_native.tsx#component:ThreeRows#collection:0\", rows, (row => <ThreeRow row={row} />))}</group>; }\nfunction Waiting() { return <span>{__nativeUseAt(\"closed_rows_native.tsx#component:Waiting#store:0\", pending)}</span>; }\nfunction App() { return <section><DomRows /><Suspense fallback={<span data-pending=\"yes\">waiting</span>} __nativeBoundarySite=\"closed_rows_native.tsx#boundary:0\"><Waiting /></Suspense></section>; }\n\nexport function mountClosedRows(container: HTMLElement) {\n  const scene = new THREE.Group();\n  const dom = createDOMRoot(container, { rootId: 'installed-closed-row-dom', scheduleCommit() {} });\n  const sceneRoot = createThreeNativeRoot(scene, { rootOptions: { rootId: 'installed-closed-row-three', scheduleCommit() {} } });\n  const three = sceneRoot.root;\n  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });\n  dom.mount(<App />);\n  three.mount(<ThreeRows />);\n  const first = container.querySelector('output');\n  const firstObject = scene.children[0]?.children[0];\n  let disposed = false;\n  return {\n    step(index: number) {\n      const cycle = Math.floor(index / 3), key = String(64 + cycle);\n      const kind = index % 3;\n      if (kind === 0) rows.apply(rows.version, [{ type: 'replace', key: '0', value: storeRecord({ id: 0, x: 1000 + index }) }]);\n      else if (kind === 1) rows.apply(rows.version, [{ type: 'insert', key, value: storeRecord({ id: 64 + cycle, x: 2000 + index }), beforeKey: null }]);\n      else rows.apply(rows.version, [{ type: 'remove', key }]);\n      const handle = queue.enqueueCollections({ id: `closed-row-${index}`, roots: [{ root: dom, collections: [rows] }, { root: three, collections: [rows] }] });\n      if (handle.status !== 'committed') throw new Error(`Closed row publication ${index}: ${handle.status}`);\n    },\n    inspect() {\n      return { values: [...container.querySelectorAll('output')].map(node => Number(node.textContent)),\n        attributes: [...container.querySelectorAll('output')].map(node => Number(node.getAttribute('data-x'))),\n        positions: scene.children[0]?.children.map(node => node.position.x) ?? [],\n        identity: container.querySelector('output') === first && scene.children[0]?.children[0] === firstObject,\n        pending: container.querySelector('[data-pending]')?.textContent === 'waiting',\n        versions: [dom.publicationVersion, three.publicationVersion], disposed };\n    },\n    dispose() {\n      queue.dispose(); dom.dispose(); sceneRoot.dispose(); disposed = true;\n      return { hostChildren: container.childNodes.length, sceneChildren: scene.children.length,\n        owners: [dom.diagnostics().ownerCount, three.diagnostics().ownerCount],\n        pending: [dom.diagnostics().pendingChangeCount, three.diagnostics().pendingChangeCount] };\n    },\n  };\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "closed_rows_native.tsx#component:App",
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
			"name": "DomRow",
			"component_site_id": "closed_rows_native.tsx#component:DomRow",
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
			"name": "DomRows",
			"component_site_id": "closed_rows_native.tsx#component:DomRows",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": "closed_rows_native.tsx#component:DomRows#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": ["closed_rows_native.tsx#component:DomRows#collection:0"],
			"closedCollectionRowPrograms": [{
				"collectionSiteId": "closed_rows_native.tsx#component:DomRows#collection:0",
				"componentProgramId": "closed_rows_native.tsx#component:DomRows",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": null,
					"props": [["data-x", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"inputs": [{ "path": ["x"] }],
				"moduleRevision": "native-v1-fe99c8feb0287179",
				"rowComponentProgramId": "closed_rows_native.tsx#component:DomRow",
				"rowProp": "row",
				"schemaVersion": 1
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ThreeRow",
			"component_site_id": "closed_rows_native.tsx#component:ThreeRow",
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
			"name": "ThreeRows",
			"component_site_id": "closed_rows_native.tsx#component:ThreeRows",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": "closed_rows_native.tsx#component:ThreeRows#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}],
			"closedCollectionSites": ["closed_rows_native.tsx#component:ThreeRows#collection:0"],
			"closedCollectionRowPrograms": [{
				"collectionSiteId": "closed_rows_native.tsx#component:ThreeRows#collection:0",
				"componentProgramId": "closed_rows_native.tsx#component:ThreeRows",
				"host": {
					"children": [],
					"key": null,
					"props": [["position-x", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "group"
				},
				"inputs": [{ "path": ["x"] }],
				"moduleRevision": "native-v1-fe99c8feb0287179",
				"rowComponentProgramId": "closed_rows_native.tsx#component:ThreeRow",
				"rowProp": "row",
				"schemaVersion": 1
			}],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Waiting",
			"component_site_id": "closed_rows_native.tsx#component:Waiting",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "closed_rows_native.tsx#component:Waiting#store:0",
				"source_expression": "pending"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
