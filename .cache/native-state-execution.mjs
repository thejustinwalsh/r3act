/** @jsxRuntime classic */
/** @jsx jsx */
/** @jsxFrag Fragment */
// @native-ui
import { jsx } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropsAt as __nativeBindStatePropsAt, bindStatePropAt as __nativeBindStatePropAt } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 1,
		sinkId: ".cache/native-state-execution.tsx#numeric-sink:566",
		sourceSites: [".cache/native-state-execution.tsx#component:Hot#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-state-execution.tsx#numeric-sink:583",
		sourceSites: [".cache/native-state-execution.tsx#component:Hot#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-state-execution.tsx#numeric-sink:602",
		sourceSites: [".cache/native-state-execution.tsx#component:Hot#state:0", ".cache/native-state-execution.tsx#component:Hot#state:1"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-state-execution.tsx#numeric-sink:831",
		sourceSites: [".cache/native-state-execution.tsx#component:Generic#state:0"]
	},
	{
		schemaVersion: 1,
		sinkId: ".cache/native-state-execution.tsx#numeric-sink:1732",
		sourceSites: [".cache/native-state-execution.tsx#component:Captured#state:0"]
	}
];
__nativeDefineComponent(".cache/native-state-execution.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Captured", Captured, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Child", Child, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Forwarded", Forwarded, { propOnlySites: [] });
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Generic", Generic, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Guard", Guard, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Hot", Hot, {
	propOnlySites: [".cache/native-state-execution.tsx#component:Hot#state:0", ".cache/native-state-execution.tsx#component:Hot#state:1"],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/native-state-execution.tsx#component:Keyed", Keyed, { propOnlySites: [] });
export const setters = {};
export const renders = {
	hot: 0,
	generic: 0,
	guard: 0,
	forwarded: 0,
	captured: 0
};
export function Hot() {
	renders.hot++;
	const [x, setX] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Hot#state:0", 0);
	const [y, setY] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Hot#state:1", 2);
	setters.x = setX;
	setters.y = setY;
	return /* @__PURE__ */ jsx("div", {
		"data-hot": "yes",
		"data-x": __nativeBindStatePropAt(".cache/native-state-execution.tsx#component:Hot#state:0", (x) => x, __nativeNumericPrograms[0]),
		style: {
			left: __nativeBindStatePropAt(".cache/native-state-execution.tsx#component:Hot#state:0", (x) => `${x}px`, __nativeNumericPrograms[1]),
			opacity: __nativeBindStatePropsAt([".cache/native-state-execution.tsx#component:Hot#state:0", ".cache/native-state-execution.tsx#component:Hot#state:1"], ([x, y]) => (x + y) / 100, __nativeNumericPrograms[2])
		},
		onClick: () => setX((previous) => previous + 1)
	});
}
export function Generic() {
	renders.generic++;
	const [count, setCount] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Generic#state:0", 0);
	setters.count = setCount;
	return /* @__PURE__ */ jsx("span", {
		"data-generic": "yes",
		"data-count": __nativeBindStatePropAt(".cache/native-state-execution.tsx#component:Generic#state:0", (count) => count, __nativeNumericPrograms[3])
	}, "Visible ", count);
}
export function Guard() {
	renders.guard++;
	const [fail, setFail] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Guard#state:0", false);
	setters.fail = setFail;
	if (fail) throw new Error("candidate failed");
	return /* @__PURE__ */ jsx("i", { "data-guard": "yes" }, "Stable guard");
}
export function Child({ value }) {
	if (typeof value !== "number") throw new Error("Child received a bound object");
	return /* @__PURE__ */ jsx("b", { "data-forwarded": "yes" }, value);
}
export function Forwarded() {
	renders.forwarded++;
	const [value, setValue] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Forwarded#state:0", 10);
	setters.forwarded = setValue;
	return /* @__PURE__ */ jsx(Child, { value });
}
export function Keyed() {
	const [key, setKey] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Keyed#state:0", 0);
	setters.key = setKey;
	return /* @__PURE__ */ jsx("em", {
		key,
		"data-keyed": "yes"
	}, "keyed");
}
export function Captured() {
	renders.captured++;
	const [value, setValue] = __nativeUseStateAt(".cache/native-state-execution.tsx#component:Captured#state:0", 0);
	setters.captured = setValue;
	return /* @__PURE__ */ jsx("button", {
		"data-captured": "yes",
		"data-value": __nativeBindStatePropAt(".cache/native-state-execution.tsx#component:Captured#state:0", (value) => value, __nativeNumericPrograms[4]),
		onClick: () => setValue(value + 1)
	}, "captured");
}
export function App() {
	return /* @__PURE__ */ jsx("section", null, /* @__PURE__ */ jsx(Hot, { key: "hot" }), /* @__PURE__ */ jsx(Generic, { key: "generic" }), /* @__PURE__ */ jsx(Guard, { key: "guard" }), /* @__PURE__ */ jsx(Forwarded, null), /* @__PURE__ */ jsx(Keyed, null), /* @__PURE__ */ jsx(Captured, null));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/native-state-execution.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxRuntime classic */\n/** @jsx jsx */\n/** @jsxFrag Fragment */\n// @native-ui\nimport { useState, jsx, Fragment } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 1, sinkId: \".cache/native-state-execution.tsx#numeric-sink:566\", sourceSites: [\".cache/native-state-execution.tsx#component:Hot#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-state-execution.tsx#numeric-sink:583\", sourceSites: [\".cache/native-state-execution.tsx#component:Hot#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-state-execution.tsx#numeric-sink:602\", sourceSites: [\".cache/native-state-execution.tsx#component:Hot#state:0\", \".cache/native-state-execution.tsx#component:Hot#state:1\"] }, { schemaVersion: 1, sinkId: \".cache/native-state-execution.tsx#numeric-sink:831\", sourceSites: [\".cache/native-state-execution.tsx#component:Generic#state:0\"] }, { schemaVersion: 1, sinkId: \".cache/native-state-execution.tsx#numeric-sink:1732\", sourceSites: [\".cache/native-state-execution.tsx#component:Captured#state:0\"] }] as const;\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Captured\", Captured, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Child\", Child, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Forwarded\", Forwarded, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Generic\", Generic, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Guard\", Guard, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Hot\", Hot, { propOnlySites: [\".cache/native-state-execution.tsx#component:Hot#state:0\", \".cache/native-state-execution.tsx#component:Hot#state:1\"], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/native-state-execution.tsx#component:Keyed\", Keyed, { propOnlySites: [] });\nexport const setters: Record<string, (value: any) => boolean> = {};\nexport const renders = { hot: 0, generic: 0, guard: 0, forwarded: 0, captured: 0 };\nexport function Hot() {\n  renders.hot++;\n  const [x, setX] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Hot#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Hot#state:1\", 2);\n  setters.x = setX;\n  setters.y = setY;\n  return <div data-hot=\"yes\" data-x={__nativeBindStatePropAt(\".cache/native-state-execution.tsx#component:Hot#state:0\", (x) => (x), __nativeNumericPrograms[0])} style={{left: __nativeBindStatePropAt(\".cache/native-state-execution.tsx#component:Hot#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[1]), opacity: __nativeBindStatePropsAt([\".cache/native-state-execution.tsx#component:Hot#state:0\", \".cache/native-state-execution.tsx#component:Hot#state:1\"], ([x, y]) => ((x+y)/100), __nativeNumericPrograms[2])}} onClick={() => setX(previous => previous + 1)} />;\n}\nexport function Generic() {\n  renders.generic++;\n  const [count, setCount] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Generic#state:0\", 0);\n  setters.count = setCount;\n  return <span data-generic=\"yes\" data-count={__nativeBindStatePropAt(\".cache/native-state-execution.tsx#component:Generic#state:0\", (count) => (count), __nativeNumericPrograms[3])}>Visible {count}</span>;\n}\nexport function Guard() {\n  renders.guard++;\n  const [fail, setFail] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Guard#state:0\", false);\n  setters.fail = setFail;\n  if (fail) throw new Error(\"candidate failed\");\n  return <i data-guard=\"yes\">Stable guard</i>;\n}\nexport function Child({value}: {value: number}) {\n  if(typeof value !== 'number') throw new Error('Child received a bound object');\n  return <b data-forwarded=\"yes\">{value}</b>;\n}\nexport function Forwarded() {\n  renders.forwarded++;\n  const [value, setValue] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Forwarded#state:0\", 10);\n  setters.forwarded = setValue;\n  return <Child value={value} />;\n}\nexport function Keyed() {\n  const [key, setKey] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Keyed#state:0\", 0);\n  setters.key = setKey;\n  return <em key={key} data-keyed=\"yes\">keyed</em>;\n}\nexport function Captured() {\n  renders.captured++;\n  const [value, setValue] = __nativeUseStateAt(\".cache/native-state-execution.tsx#component:Captured#state:0\", 0);\n  setters.captured = setValue;\n  return <button data-captured=\"yes\" data-value={__nativeBindStatePropAt(\".cache/native-state-execution.tsx#component:Captured#state:0\", (value) => (value), __nativeNumericPrograms[4])} onClick={() => setValue(value+1)}>captured</button>;\n}\nexport function App() {\n  return <section><Hot key=\"hot\" /><Generic key=\"generic\" /><Guard key=\"guard\" /><Forwarded /><Keyed /><Captured /></section>;\n}\n",
	"components": [
		{
			"name": "App",
			"component_site_id": ".cache/native-state-execution.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Captured",
			"component_site_id": ".cache/native-state-execution.tsx#component:Captured",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Captured#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Child",
			"component_site_id": ".cache/native-state-execution.tsx#component:Child",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Forwarded",
			"component_site_id": ".cache/native-state-execution.tsx#component:Forwarded",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Forwarded#state:0",
				"initial_value": "10"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Generic",
			"component_site_id": ".cache/native-state-execution.tsx#component:Generic",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Generic#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Guard",
			"component_site_id": ".cache/native-state-execution.tsx#component:Guard",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Guard#state:0",
				"initial_value": "false"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Hot",
			"component_site_id": ".cache/native-state-execution.tsx#component:Hot",
			"prop_only_sites": [".cache/native-state-execution.tsx#component:Hot#state:0", ".cache/native-state-execution.tsx#component:Hot#state:1"],
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Hot#state:0",
				"initial_value": "0"
			}, {
				"site_id": ".cache/native-state-execution.tsx#component:Hot#state:1",
				"initial_value": "2"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "Keyed",
			"component_site_id": ".cache/native-state-execution.tsx#component:Keyed",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/native-state-execution.tsx#component:Keyed#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
