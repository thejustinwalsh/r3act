import { createStore } from "/node_modules/.pnpm/@compiled-ui+runtime@file+..+compiled-ui-runtime.tgz_react@19.3.0_three@0.186.1_vite@8.3.1/node_modules/@compiled-ui/runtime/dist/src/native_runtime_api.js?v=f65bcbf5";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "/node_modules/.pnpm/@compiled-ui+runtime@file+..+compiled-ui-runtime.tgz_react@19.3.0_three@0.186.1_vite@8.3.1/node_modules/@compiled-ui/runtime/dist/src/native_runtime_api.js?v=f65bcbf5";
__nativeDefineComponent("src/native_app.tsx#component:NativePanel", NativePanel, { propOnlySites: [] });
export const buildToken = "v1";
export const labelStore = createStore("ready");
export const lifecycle = {
	activeEffects: 0,
	setups: 0,
	cleanups: 0
};
export function NativePanel({ label }) {
	const [count, setCount] = __nativeUseStateAt("src/native_app.tsx#component:NativePanel#state:0", 0);
	const storeValue = __nativeUseAt("src/native_app.tsx#component:NativePanel#store:0", labelStore);
	__nativeUseEffectAt("src/native_app.tsx#component:NativePanel#effect:0", () => {
		lifecycle.activeEffects++;
		lifecycle.setups++;
		return () => {
			lifecycle.activeEffects--;
			lifecycle.cleanups++;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("button", {
		"data-native-panel": label,
		onClick: () => setCount((value) => value + 1)
	}, buildToken, ":", label, ":", storeValue, ":", count);
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": "src/native_app.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { createStore, use, useEffect, useState } from \"@compiled-ui/runtime\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@compiled-ui/runtime\";\n__nativeDefineComponent(\"src/native_app.tsx#component:NativePanel\", NativePanel, { propOnlySites: [] });\n\nexport const buildToken = \"v1\";\nexport const labelStore = createStore(\"ready\");\nexport const lifecycle = { activeEffects: 0, setups: 0, cleanups: 0 };\n\nexport function NativePanel({ label }: { label: string }) {\n  const [count, setCount] = __nativeUseStateAt(\"src/native_app.tsx#component:NativePanel#state:0\", 0);\n  const storeValue = __nativeUseAt(\"src/native_app.tsx#component:NativePanel#store:0\", labelStore);\n  __nativeUseEffectAt(\"src/native_app.tsx#component:NativePanel#effect:0\", () => {\n    lifecycle.activeEffects++;\n    lifecycle.setups++;\n    return () => {\n      lifecycle.activeEffects--;\n      lifecycle.cleanups++;\n    };\n  });\n  return <button data-native-panel={label} onClick={() => setCount((value) => value + 1)}>{buildToken}:{label}:{storeValue}:{count}</button>;\n}\n",
	"components": [{
		"name": "NativePanel",
		"component_site_id": "src/native_app.tsx#component:NativePanel",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": "src/native_app.tsx#component:NativePanel#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [{ "site_id": "src/native_app.tsx#component:NativePanel#effect:0" }],
		"store_sites": [{
			"site_id": "src/native_app.tsx#component:NativePanel#store:0",
			"source_expression": "labelStore"
		}],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "/node_modules/.pnpm/@compiled-ui+runtime@file+..+compiled-ui-runtime.tgz_react@19.3.0_three@0.186.1_vite@8.3.1/node_modules/@compiled-ui/runtime/dist/src/native_runtime_api.js?v=f65bcbf5";

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxtQkFBNkM7OztBQUV0RCxPQUFPLE1BQU0sYUFBYTtBQUMxQixPQUFPLE1BQU0sYUFBYSxZQUFZLE9BQU87QUFDN0MsT0FBTyxNQUFNLFlBQVk7Q0FBRSxlQUFlO0NBQUcsUUFBUTtDQUFHLFVBQVU7QUFBRTtBQUVwRSxPQUFPLFNBQVMsWUFBWSxFQUFFLFNBQTRCO0NBQ3hELE1BQU0sQ0FBQyxPQUFPLFlBQVksbUJBQVEsb0RBQUMsQ0FBQztDQUNwQyxNQUFNLGFBQWEsY0FBRyxvREFBQyxVQUFVO0NBQ2pDLG9CQUFTLDJEQUFPO0VBQ2QsVUFBVTtFQUNWLFVBQVU7RUFDVixhQUFhO0dBQ1gsVUFBVTtHQUNWLFVBQVU7RUFDWjtDQUNGLENBQUM7Q0FDRCxPQUFPLGdDQUFDLFVBQUQ7RUFBUSxxQkFBbUI7RUFBTyxlQUFlLFVBQVUsVUFBVSxRQUFRLENBQUM7Q0FBb0QsR0FBaEQsWUFBVyxLQUFFLE9BQU0sS0FBRSxZQUFXLEtBQUUsS0FBYztBQUMzSSIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsibmF0aXZlX2FwcC50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlU3RvcmUsIHVzZSwgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gXCJAY29tcGlsZWQtdWkvcnVudGltZVwiO1xuXG5leHBvcnQgY29uc3QgYnVpbGRUb2tlbiA9IFwidjFcIjtcbmV4cG9ydCBjb25zdCBsYWJlbFN0b3JlID0gY3JlYXRlU3RvcmUoXCJyZWFkeVwiKTtcbmV4cG9ydCBjb25zdCBsaWZlY3ljbGUgPSB7IGFjdGl2ZUVmZmVjdHM6IDAsIHNldHVwczogMCwgY2xlYW51cHM6IDAgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIE5hdGl2ZVBhbmVsKHsgbGFiZWwgfTogeyBsYWJlbDogc3RyaW5nIH0pIHtcbiAgY29uc3QgW2NvdW50LCBzZXRDb3VudF0gPSB1c2VTdGF0ZSgwKTtcbiAgY29uc3Qgc3RvcmVWYWx1ZSA9IHVzZShsYWJlbFN0b3JlKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBsaWZlY3ljbGUuYWN0aXZlRWZmZWN0cysrO1xuICAgIGxpZmVjeWNsZS5zZXR1cHMrKztcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgbGlmZWN5Y2xlLmFjdGl2ZUVmZmVjdHMtLTtcbiAgICAgIGxpZmVjeWNsZS5jbGVhbnVwcysrO1xuICAgIH07XG4gIH0pO1xuICByZXR1cm4gPGJ1dHRvbiBkYXRhLW5hdGl2ZS1wYW5lbD17bGFiZWx9IG9uQ2xpY2s9eygpID0+IHNldENvdW50KCh2YWx1ZSkgPT4gdmFsdWUgKyAxKX0+e2J1aWxkVG9rZW59OntsYWJlbH06e3N0b3JlVmFsdWV9Ontjb3VudH08L2J1dHRvbj47XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy90ancvRG9jdW1lbnRzL0NvZGV4LzIwMjYtMTAtMDkvbGUvb3V0cHV0cy9yZWFjdC1ydW50aW1lLXJlc2VhcmNoLy5jYWNoZS9jb21waWxlZC1vd25lci1yb3dzLXBhY2thZ2UtdjIvYnJvd3Nlci1jb25zdW1lci9zcmMvbmF0aXZlX2FwcC50c3gifQ==