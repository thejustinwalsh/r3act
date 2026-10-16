import { BoxGeometry, MeshStandardMaterial } from "three";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt } from "../src/native_runtime_api.ts";
__nativeDefineComponent(".cache/three-host-scene.tsx#component:CameraScene", CameraScene, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/three-host-scene.tsx#component:CleanupScene", CleanupScene, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent(".cache/three-host-scene.tsx#component:NativeScene", NativeScene, { propOnlySites: [] });
__nativeDefineComponent(".cache/three-host-scene.tsx#component:SharedScene", SharedScene, {
	propOnlySites: [],
	hostLeafOutput: true
});
export let pointerEventCount = 0;
export function NativeScene({ x, roughness, order, show, reset = false, materialKey }) {
	const [clicks, setClicks] = __nativeUseStateAt(".cache/three-host-scene.tsx#component:NativeScene#state:0", 0);
	const mesh = show ? /* @__PURE__ */ __nativeJsx.jsx("mesh", {
		key: "mesh",
		"position-x": reset ? undefined : x,
		"material-roughness": reset ? undefined : roughness,
		onPointerDown: () => {
			pointerEventCount++;
			setClicks((value) => value + 1);
		}
	}, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		1,
		2,
		3
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", {
		key: materialKey,
		color: "orange"
	})) : null;
	const light = /* @__PURE__ */ __nativeJsx.jsx("directionalLight", {
		key: "light",
		intensity: 2
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", null, order === "mesh-first" ? [mesh, light] : [light, mesh]);
}
export const sharedGeometry = new BoxGeometry(2, 2, 2);
export const sharedMaterial = new MeshStandardMaterial({ color: "blue" });
export function CameraScene({ fov }) {
	return /* @__PURE__ */ __nativeJsx.jsx("perspectiveCamera", { fov });
}
export function SharedScene() {
	return /* @__PURE__ */ __nativeJsx.jsx("mesh", { key: "shared" }, /* @__PURE__ */ __nativeJsx.jsx("primitive", {
		object: sharedGeometry,
		attach: "geometry"
	}), /* @__PURE__ */ __nativeJsx.jsx("primitive", {
		object: sharedMaterial,
		attach: "material"
	}));
}
export function CleanupScene() {
	return /* @__PURE__ */ __nativeJsx.jsx("group", null, /* @__PURE__ */ __nativeJsx.jsx("mesh", { onPointerDown: () => {} }, /* @__PURE__ */ __nativeJsx.jsx("throwingGeometry", null), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", null)), /* @__PURE__ */ __nativeJsx.jsx("mesh", null, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", null), /* @__PURE__ */ __nativeJsx.jsx("meshStandardMaterial", null)));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": ".cache/three-host-scene.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import { BoxGeometry, MeshStandardMaterial } from \"three\";\nimport { useState } from \"../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/three-host-scene.tsx#component:CameraScene\", CameraScene, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/three-host-scene.tsx#component:CleanupScene\", CleanupScene, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\".cache/three-host-scene.tsx#component:NativeScene\", NativeScene, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/three-host-scene.tsx#component:SharedScene\", SharedScene, { propOnlySites: [], hostLeafOutput: true });\nexport let pointerEventCount = 0;\nexport function NativeScene({ x, roughness, order, show, reset = false, materialKey }) {\n  const [clicks, setClicks] = __nativeUseStateAt(\".cache/three-host-scene.tsx#component:NativeScene#state:0\", 0);\n  const mesh = show ? <mesh key=\"mesh\" position-x={reset ? undefined : x} material-roughness={reset ? undefined : roughness} onPointerDown={() => { pointerEventCount++; setClicks((value) => value + 1); }}>\n    <boxGeometry args={[1, 2, 3]} />\n    <meshStandardMaterial key={materialKey} color=\"orange\" />\n  </mesh> : null;\n  const light = <directionalLight key=\"light\" intensity={2} />;\n  return <group>{order === \"mesh-first\" ? [mesh, light] : [light, mesh]}</group>;\n}\nexport const sharedGeometry = new BoxGeometry(2, 2, 2);\nexport const sharedMaterial = new MeshStandardMaterial({ color: \"blue\" });\nexport function CameraScene({ fov }) {\n  return <perspectiveCamera fov={fov} />;\n}\nexport function SharedScene() {\n  return <mesh key=\"shared\">\n    <primitive object={sharedGeometry} attach=\"geometry\" />\n    <primitive object={sharedMaterial} attach=\"material\" />\n  </mesh>;\n}\nexport function CleanupScene() {\n  return <group><mesh onPointerDown={() => {}}>\n    <throwingGeometry />\n    <meshStandardMaterial />\n  </mesh><mesh><boxGeometry /><meshStandardMaterial /></mesh></group>;\n}",
	"components": [
		{
			"name": "CameraScene",
			"component_site_id": ".cache/three-host-scene.tsx#component:CameraScene",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "CleanupScene",
			"component_site_id": ".cache/three-host-scene.tsx#component:CleanupScene",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "NativeScene",
			"component_site_id": ".cache/three-host-scene.tsx#component:NativeScene",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/three-host-scene.tsx#component:NativeScene#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "SharedScene",
			"component_site_id": ".cache/three-host-scene.tsx#component:SharedScene",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
import * as __nativeJsx from "../src/native_runtime_api.ts";
