/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, renderCollectionAt as __nativeRenderCollectionAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/native-collection-retention.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-retention.tsx#component:List", List, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-collection-retention.tsx#component:Row", Row, { propOnlySites: [] });
export const rows = createKeyedCollection([{
	id: "dead",
	payload: { value: "removed" }
}, {
	id: "live",
	payload: { value: "surviving" }
}], (row) => row.id);
export function Row({ row }) {
	return /* @__PURE__ */ jsx("li", {
		"data-id": row.id,
		onClick: () => row.payload
	}, row.id);
}
export function List() {
	return /* @__PURE__ */ jsx("ul", null, __nativeRenderCollectionAt(".cache/native-collection-retention.tsx#component:List#collection:0", rows, ((row) => /* @__PURE__ */ jsx(Row, {
		key: row.id,
		row
	}))));
}
export function App() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(List, null));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-collection-retention.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n// @native-ui\nimport {jsx,createKeyedCollection} from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/native-collection-retention.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-retention.tsx#component:List\", List, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-collection-retention.tsx#component:Row\", Row, { propOnlySites: [] });\nexport const rows=createKeyedCollection([{id:'dead',payload:{value:'removed'}},{id:'live',payload:{value:'surviving'}}],row=>row.id);\nexport function Row({row}:any){return <li data-id={row.id} onClick={()=>row.payload}>{row.id}</li>;}\nexport function List(){return <ul>{__nativeRenderCollectionAt(\".cache/native-collection-retention.tsx#component:List#collection:0\", rows, (row=><Row key={row.id} row={row}/>))}</ul>;}\nexport function App(){return <section><List/></section>;}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-collection-retention.tsx#component:App",
			"prop_only_sites": [],
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "List",
			"component_site_id": ".cache/native-collection-retention.tsx#component:List",
			"prop_only_sites": [],
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [{
				"site_id": ".cache/native-collection-retention.tsx#component:List#collection:0",
				"source_expression": "rows",
				"row_parameter": "row",
				"requires_owner_render": false
			}]
		},
		{
			"name": "Row",
			"component_site_id": ".cache/native-collection-retention.tsx#component:Row",
			"prop_only_sites": [],
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
