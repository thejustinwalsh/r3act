import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "../../../src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx",
	"module_revision": "native-v1-e135b3b879649416",
	"owners": [{
		"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeList",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#state:0",
		"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#opaque-sink:547",
		"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [{
		"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#effect:0",
		"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx") __invalidateNativeSemanticPlan("implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx", "native-v1-e135b3b879649416");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { createDOMRoot, createKeyedCollection, renderCollectionAt } from "../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt } from "../../../src/native_runtime_api.ts";
__nativeDefineComponent("implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeList", NativeList, { propOnlySites: [] });
__nativeDefineComponent("implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow", NativeRow, { propOnlySites: [] });
function NativeRow({ id, life }) {
	const [selected, setSelected] = __nativeUseStateAt("implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#state:0", false);
	__nativeUseEffectAt("implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#effect:0", () => {
		life.mount(id);
		return () => life.cleanup(id);
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-id": id,
		"data-selected": String(selected),
		onClick: () => setSelected((value) => !value)
	}, id);
}
function NativeList({ rows, life }) {
	return /* @__PURE__ */ __nativeJsx.jsx("ul", null, renderCollectionAt("scoped-structure-rows", rows, (row) => /* @__PURE__ */ __nativeJsx.jsx(NativeRow, {
		key: row.id,
		id: row.id,
		life
	})));
}
export function mountNative(host, ids, life) {
	const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
	const root = createDOMRoot(host, { scheduleCommit: () => {} });
	root.mount(/* @__PURE__ */ __nativeJsx.jsx(NativeList, {
		rows,
		life
	}));
	root.flush();
	const moveTail = Object.freeze([{
		type: "move",
		key: "row-0",
		beforeKey: null
	}]);
	const moveHead = Object.freeze([{
		type: "move",
		key: "row-0",
		beforeKey: "row-1"
	}]);
	const removeMiddle = Object.freeze([{
		type: "remove",
		key: "row-512"
	}]);
	const restoreMiddle = Object.freeze([{
		type: "insert",
		key: "row-512",
		value: { id: "row-512" },
		beforeKey: "row-513"
	}]);
	const accept = (operations) => {
		const result = rows.apply(rows.version, operations);
		if (!result.ok) throw new Error(`native collection edit rejected: ${JSON.stringify(result)}`);
		const candidate = root.prepareCollections([rows]);
		if (!candidate) throw new Error("native scoped collection candidate declined");
		if (!candidate.validate()) throw new Error("native scoped collection candidate became stale before host commit");
		candidate.commitHost();
		if (!candidate.validatePostHost()) throw new Error("native scoped collection candidate became stale after host commit");
		candidate.preparePublication();
		candidate.publish();
		candidate.installSubscriptions();
		candidate.runEffects();
		return candidate;
	};
	const resetInsert = (operations) => {
		const result = rows.apply(rows.version, operations);
		if (!result.ok || !root.flush()) throw new Error(`native untimed insertion reset failed: ${JSON.stringify(result)}`);
	};
	return {
		click(id) {
			const node = [...host.querySelectorAll("li[data-id]")].find((item) => item.dataset.id === id);
			if (!node) throw new Error(`missing row ${id}`);
			node.click();
			root.flush();
		},
		moveTail() {
			return accept(moveTail);
		},
		moveHead() {
			return accept(moveHead);
		},
		removeMiddle() {
			return accept(removeMiddle);
		},
		restoreMiddle() {
			resetInsert(restoreMiddle);
		},
		scopeState() {
			return {
				rootId: root.rootId,
				publicationVersion: root.publicationVersion
			};
		},
		dispose() {
			root.dispose();
			return {
				ownerCount: root.diagnostics().ownerCount,
				readerCount: rows.stats().readerCount
			};
		}
	};
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-e135b3b879649416",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx",
		"module_revision": "native-v1-e135b3b879649416",
		"owners": [{
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeList",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#state:0",
			"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#opaque-sink:547",
			"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [{
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#effect:0",
			"owner_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  createKeyedCollection,\n  renderCollectionAt,\n  useEffect,\n  useState,\n  type KeyedCollection,\n  type KeyedCollectionOperation,\n} from \"../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../src/native_runtime_api.ts\";\n__nativeDefineComponent(\"implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeList\", NativeList, { propOnlySites: [] });\n__nativeDefineComponent(\"implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow\", NativeRow, { propOnlySites: [] });\n\ntype Row = { id: string };\ntype Life = { mount(id: string): void; cleanup(id: string): void };\n\nfunction NativeRow({ id, life }: { id: string; life: Life; key?: string }) {\n  const [selected, setSelected] = __nativeUseStateAt(\"implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#state:0\", false);\n  __nativeUseEffectAt(\"implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#effect:0\", () => {\n    life.mount(id);\n    return () => life.cleanup(id);\n  });\n  return <li data-id={id} data-selected={String(selected)} onClick={() => setSelected((value) => !value)}>{id}</li>;\n}\n\nfunction NativeList({ rows, life }: { rows: KeyedCollection<Row>; life: Life }) {\n  return <ul>{renderCollectionAt(\"scoped-structure-rows\", rows, (row) => <NativeRow key={row.id} id={row.id} life={life} />)}</ul>;\n}\n\nexport function mountNative(host: HTMLElement, ids: readonly string[], life: Life) {\n  const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);\n  const root = createDOMRoot(host, { scheduleCommit: () => {} });\n  root.mount(<NativeList rows={rows} life={life} />);\n  root.flush();\n  const moveTail: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: \"move\", key: \"row-0\", beforeKey: null }]);\n  const moveHead: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: \"move\", key: \"row-0\", beforeKey: \"row-1\" }]);\n  const removeMiddle: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: \"remove\", key: \"row-512\" }]);\n  const restoreMiddle: readonly KeyedCollectionOperation<Row>[] = Object.freeze([{ type: \"insert\", key: \"row-512\", value: { id: \"row-512\" }, beforeKey: \"row-513\" }]);\n  const accept = (operations: readonly KeyedCollectionOperation<Row>[]) => {\n    const result = rows.apply(rows.version, operations);\n    if (!result.ok) throw new Error(`native collection edit rejected: ${JSON.stringify(result)}`);\n    const candidate = root.prepareCollections([rows]);\n    if (!candidate) throw new Error(\"native scoped collection candidate declined\");\n    if (!candidate.validate()) throw new Error(\"native scoped collection candidate became stale before host commit\");\n    candidate.commitHost();\n    if (!candidate.validatePostHost()) throw new Error(\"native scoped collection candidate became stale after host commit\");\n    candidate.preparePublication();\n    candidate.publish();\n    candidate.installSubscriptions();\n    candidate.runEffects();\n    return candidate;\n  };\n  const resetInsert = (operations: readonly KeyedCollectionOperation<Row>[]) => {\n    const result = rows.apply(rows.version, operations);\n    if (!result.ok || !root.flush()) throw new Error(`native untimed insertion reset failed: ${JSON.stringify(result)}`);\n  };\n  return {\n    click(id: string) {\n      const node = [...host.querySelectorAll<HTMLLIElement>(\"li[data-id]\")].find((item) => item.dataset.id === id);\n      if (!node) throw new Error(`missing row ${id}`);\n      node.click();\n      root.flush();\n    },\n    moveTail() { return accept(moveTail); },\n    moveHead() { return accept(moveHead); },\n    removeMiddle() { return accept(removeMiddle); },\n    restoreMiddle() { resetInsert(restoreMiddle); },\n    scopeState() { return { rootId: root.rootId, publicationVersion: root.publicationVersion }; },\n    dispose() { root.dispose(); return { ownerCount: root.diagnostics().ownerCount, readerCount: rows.stats().readerCount }; },\n  };\n}\n",
	"components": [{
		"name": "NativeList",
		"component_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeList",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "NativeRow",
		"component_site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#state:0",
			"initial_value": "false"
		}],
		"effect_sites": [{ "site_id": "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#component:NativeRow#effect:0" }],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": ["implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx#opaque-sink:547"]
	}]
};
import * as __nativeJsx from "../../../src/native_runtime_api.ts";
