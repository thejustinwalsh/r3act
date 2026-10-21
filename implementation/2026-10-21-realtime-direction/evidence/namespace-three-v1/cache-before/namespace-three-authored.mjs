import { defineComponent as __nativeDefineComponent } from "../src/native_runtime_api.ts";
__nativeDefineComponent(".cache/namespace-three-authored.tsx#component:SceneView", SceneView, {
	propOnlySites: [],
	hostLeafOutput: true
});
export function SceneView({ value, reset = false }) {
	return /* @__PURE__ */ __nativeJsx.jsx("group", null, /* @__PURE__ */ __nativeJsx.jsx("pointLight", {
		key: "light",
		args: ["orange", 2],
		distance: reset ? undefined : value,
		position: reset ? undefined : [
			1,
			2,
			3
		],
		"shadow-mapSize": reset ? undefined : [1024, 512]
	}), /* @__PURE__ */ __nativeJsx.jsx("orthographicCamera", {
		key: "camera",
		zoom: reset ? undefined : value
	}), /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "mesh",
		"material-clearcoat": reset ? undefined : .65
	}, /* @__PURE__ */ __nativeJsx.jsx("icosahedronGeometry", { args: [1, 2] }), /* @__PURE__ */ __nativeJsx.jsx("meshPhysicalMaterial", {
		color: reset ? undefined : "blue",
		clearcoatRoughness: reset ? undefined : .25
	})), /* @__PURE__ */ __nativeJsx.jsx("probeGroup", {
		key: "custom",
		args: [7],
		probeMode: reset ? undefined : value
	}));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/namespace-three-authored.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { useState } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/namespace-three-authored.tsx#component:SceneView\", SceneView, { propOnlySites: [], hostLeafOutput: true });\nexport function SceneView({ value, reset=false }) {\n  return <group>\n    <pointLight key=\"light\" args={[\"orange\", 2]} distance={reset ? undefined : value} position={reset ? undefined : [1,2,3]} shadow-mapSize={reset ? undefined : [1024,512]} />\n    <orthographicCamera key=\"camera\" zoom={reset ? undefined : value} />\n    <mesh key=\"mesh\" material-clearcoat={reset ? undefined : .65}>\n      <icosahedronGeometry args={[1,2]} />\n      <meshPhysicalMaterial color={reset ? undefined : \"blue\"} clearcoatRoughness={reset ? undefined : .25} />\n    </mesh>\n    <probeGroup key=\"custom\" args={[7]} probeMode={reset ? undefined : value} />\n  </group>;\n}",
	"components": [{
		"name": "SceneView",
		"component_site_id": ".cache/namespace-three-authored.tsx#component:SceneView",
		"prop_only_sites": [],
		"host_leaf_output": true,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": []
	}]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
