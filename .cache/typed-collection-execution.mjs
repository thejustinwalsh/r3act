import { defineComponent as __nativeDefineComponent, useEffectAt as __nativeUseEffectAt, renderCollectionAt as __nativeRenderCollectionAt } from "../src/native_runtime_api.ts";
__nativeDefineComponent(".cache/typed-collection-execution.tsx#component:Board", Board, { propOnlySites: [] });
__nativeDefineComponent(".cache/typed-collection-execution.tsx#component:Row", Row, { propOnlySites: [] });
export const lifetime = {
	mounts: 0,
	cleanups: 0
};
export function Row({ row }) {
	__nativeUseEffectAt(".cache/typed-collection-execution.tsx#component:Row#effect:0", () => {
		lifetime.mounts++;
		return () => {
			lifetime.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("li", {
		"data-id": row.id,
		"data-label": row.label
	}, row.label);
}
export function Board({ unrelated, left, right }) {
	const leftAlias = left;
	return /* @__PURE__ */ __nativeJsx.jsx("section", { "data-unrelated": unrelated }, /* @__PURE__ */ __nativeJsx.jsx("ul", { key: "left" }, __nativeRenderCollectionAt(".cache/typed-collection-execution.tsx#component:Board#collection:0", leftAlias, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		row
	})))), /* @__PURE__ */ __nativeJsx.jsx("ul", { key: "right" }, __nativeRenderCollectionAt(".cache/typed-collection-execution.tsx#component:Board#collection:1", right, ((row) => /* @__PURE__ */ __nativeJsx.jsx(Row, {
		key: row.id,
		row
	})))));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/typed-collection-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createDOMRoot, useEffect } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/typed-collection-execution.tsx#component:Board\", Board, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/typed-collection-execution.tsx#component:Row\", Row, { propOnlySites: [] });\nimport type { KeyedCollection } from \"../src/native_runtime_api.ts\";\ntype Item = { id: string; label: string };\nexport const lifetime = { mounts: 0, cleanups: 0 };\nexport function Row({ row }: { row: Item }) {\n  __nativeUseEffectAt(\".cache/typed-collection-execution.tsx#component:Row#effect:0\", () => { lifetime.mounts++; return () => { lifetime.cleanups++; }; });\n  return <li data-id={row.id} data-label={row.label}>{row.label}</li>;\n}\nexport function Board({ unrelated, left, right }: { unrelated: number; left: KeyedCollection<Item>; right: KeyedCollection<Item> }) {\n  const leftAlias = left;\n  return <section data-unrelated={unrelated}><ul key=\"left\">{__nativeRenderCollectionAt(\".cache/typed-collection-execution.tsx#component:Board#collection:0\", leftAlias, (row => (<Row key={row.id} row={row} />)))}</ul><ul key=\"right\">{__nativeRenderCollectionAt(\".cache/typed-collection-execution.tsx#component:Board#collection:1\", right, (row => <Row key={row.id} row={row} />))}</ul></section>;\n}",
	"components": [{
		"name": "Board",
		"component_site_id": ".cache/typed-collection-execution.tsx#component:Board",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [{
			"site_id": ".cache/typed-collection-execution.tsx#component:Board#collection:0",
			"source_expression": "leftAlias",
			"row_parameter": "row",
			"requires_owner_render": false
		}, {
			"site_id": ".cache/typed-collection-execution.tsx#component:Board#collection:1",
			"source_expression": "right",
			"row_parameter": "row",
			"requires_owner_render": false
		}]
	}, {
		"name": "Row",
		"component_site_id": ".cache/typed-collection-execution.tsx#component:Row",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [{ "site_id": ".cache/typed-collection-execution.tsx#component:Row#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
