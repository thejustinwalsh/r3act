// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from "/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt } from "/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/react-native-adapter-fixture.tsx#component:NativeButton", NativeButton, { propOnlySites: [] });
export let activeEffects = 0;
export let lastSetterResult = null;
export function NativeButton({ label, onAction }) {
	const [draft, setDraft] = __nativeUseStateAt(".cache/react-native-adapter-fixture.tsx#component:NativeButton#state:0", label);
	__nativeUseEffectAt(".cache/react-native-adapter-fixture.tsx#component:NativeButton#effect:0", () => {
		activeEffects++;
		return () => {
			activeEffects--;
		};
	});
	return /* @__PURE__ */ jsx("button", {
		"data-label": label,
		onClick: () => {
			lastSetterResult = setDraft((value) => value + "!");
			onAction(label);
		}
	}, draft);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/react-native-adapter-fixture.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "\n// @native-ui\n/** @jsxRuntime classic */\n/** @jsx jsx */\nimport { jsx, useEffect, useState } from \"/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/react-native-adapter-fixture.tsx#component:NativeButton\", NativeButton, { propOnlySites: [] });\n\nexport let activeEffects = 0;\nexport let lastSetterResult = null;\nexport function NativeButton({ label, onAction }) {\n  const [draft, setDraft] = __nativeUseStateAt(\".cache/react-native-adapter-fixture.tsx#component:NativeButton#state:0\", label);\n  __nativeUseEffectAt(\".cache/react-native-adapter-fixture.tsx#component:NativeButton#effect:0\", () => {\n    activeEffects++;\n    return () => { activeEffects--; };\n  });\n  return <button data-label={label} onClick={() => { lastSetterResult = setDraft(value => value + \"!\"); onAction(label); }}>{draft}</button>;\n}\n",
	"components": [{
		"name": "NativeButton",
		"component_site_id": ".cache/react-native-adapter-fixture.tsx#component:NativeButton",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/react-native-adapter-fixture.tsx#component:NativeButton#state:0",
			"initial_value": "label"
		}],
		"effect_sites": [{ "site_id": ".cache/react-native-adapter-fixture.tsx#component:NativeButton#effect:0" }],
		"store_sites": [],
		"collection_sites": []
	}]
};
