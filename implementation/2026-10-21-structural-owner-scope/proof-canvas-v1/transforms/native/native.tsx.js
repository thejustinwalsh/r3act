import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-e5f71d51e116f8f6",
	"owners": [
		{
			"site_id": "native.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:FrameMarker",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:Position",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:Rotation",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "native.tsx#component:FrameMarker#store:0",
			"owner_site_id": "native.tsx#component:FrameMarker",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native.tsx#component:Position#store:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native.tsx#component:Rotation#store:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "native.tsx#component:FrameMarker#store:0",
			"owner_site_id": "native.tsx#component:FrameMarker",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native.tsx#component:Position#store:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native.tsx#component:Rotation#store:0",
			"owner_site_id": "native.tsx#component:Rotation",
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
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-e5f71d51e116f8f6" && event.previousInstance === "native-v1-e5f71d51e116f8f6") __invalidateNativeSemanticPlan("native.tsx", "native-v1-e5f71d51e116f8f6");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { createStore, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("native.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("native.tsx#component:FrameMarker", FrameMarker, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:FrameMarker",
		"host": {
			"children": [],
			"key": "frame-marker",
			"props": [["name", {
				"kind": "literal",
				"value": "accepted-frame"
			}], ["position-x", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["epoch"]],
			"storeProp": "clock",
			"storeUseSiteId": "native.tsx#component:FrameMarker#store:0"
		}],
		"moduleRevision": "native-v1-e5f71d51e116f8f6",
		"schemaVersion": 5
	}
});
__nativeDefineComponent("native.tsx#component:Position", Position, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:Position",
		"host": {
			"child": null,
			"key": "motion",
			"props": [
				["position-x", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": .01
					}
				}],
				["position-y", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": .005
					}
				}],
				["rotation-z", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": 1e-4
					}
				}]
			],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["phase"]],
			"storeProp": "clock",
			"storeUseSiteId": "native.tsx#component:Position#store:0"
		}],
		"moduleRevision": "native-v1-e5f71d51e116f8f6",
		"retainedChildProp": "children",
		"schemaVersion": 6
	}
});
__nativeDefineComponent("native.tsx#component:Rotation", Rotation, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:Rotation",
		"host": {
			"child": null,
			"key": "motion",
			"props": [
				["position-x", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": .0025
					}
				}],
				["position-y", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": .0075
					}
				}],
				["rotation-z", {
					"kind": "binary",
					"left": {
						"index": 0,
						"kind": "input"
					},
					"operator": "*",
					"right": {
						"kind": "literal",
						"value": 2e-4
					}
				}]
			],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["phase"]],
			"storeProp": "clock",
			"storeUseSiteId": "native.tsx#component:Rotation#store:0"
		}],
		"moduleRevision": "native-v1-e5f71d51e116f8f6",
		"retainedChildProp": "children",
		"schemaVersion": 6
	}
});
import { createThreeNativeRoot } from "@r3act/host-three";
import * as THREE from "three";
import { OBJECTS, start, value } from "./scene";
const clock = createStore(storeRecord({
	phase: 0,
	epoch: 0
}));
function Position(props) {
	const frame = __nativeUseAt("native.tsx#component:Position#store:0", props.clock);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		"position-x": frame.phase * .01,
		"position-y": frame.phase * .005,
		"rotation-z": frame.phase * 1e-4
	}, props.children);
}
function Rotation(props) {
	const frame = __nativeUseAt("native.tsx#component:Rotation#store:0", props.clock);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		"position-x": frame.phase * .0025,
		"position-y": frame.phase * .0075,
		"rotation-z": frame.phase * 2e-4
	}, props.children);
}
function FrameMarker(props) {
	const frame = __nativeUseAt("native.tsx#component:FrameMarker#store:0", props.clock);
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "frame-marker",
		name: "accepted-frame",
		"position-x": frame.epoch
	});
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx(__nativeJsx.Fragment, null, /* @__PURE__ */ __nativeJsx.jsx(FrameMarker, {
		key: "frame-marker",
		clock
	}), /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "objects",
		name: "objects"
	}, Array.from({ length: OBJECTS }, (_, id) => /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: id,
		name: `object-${id}`
	}, id % 2 === 0 ? /* @__PURE__ */ __nativeJsx.jsx(Position, {
		key: "motion",
		clock
	}, /* @__PURE__ */ __nativeJsx.jsx("group", { name: `child-${id}` })) : /* @__PURE__ */ __nativeJsx.jsx(Rotation, {
		key: "motion",
		clock
	}, /* @__PURE__ */ __nativeJsx.jsx("group", { name: `child-${id}` }))))));
}
const scene = new THREE.Scene();
const counts = {};
const diagnostics = window.__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
	rootId: "structural-owner-scope-native",
	scheduleCommit() {},
	profileCounter: diagnostics ? (batch) => {
		for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
	} : undefined
} });
const setupStart = performance.now();
root.root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
const setupMs = performance.now() - setupStart;
for (const key of Object.keys(counts)) delete counts[key];
start({
	scene,
	update(epoch) {
		clock.dispatch(() => storeRecord({
			phase: value(epoch),
			epoch
		}));
		const published = root.root.flush();
		const accepted = scene.getObjectByName("accepted-frame")?.position.x;
		return {
			published: published && accepted === epoch,
			counters: diagnostics ? { ...counts } : undefined
		};
	},
	dispose() {
		root.dispose();
		return {
			setupMs,
			setupScope: "root.mount through activation; scene/root construction excluded",
			sceneChildren: scene.children.length,
			registeredSetters: 0,
			ownerCount: root.root.diagnostics().ownerCount,
			pending: root.root.diagnostics().pendingChangeCount,
			counters: { ...counts }
		};
	}
});
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-e5f71d51e116f8f6",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-e5f71d51e116f8f6",
		"owners": [
			{
				"site_id": "native.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:FrameMarker",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:Position",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:Rotation",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "native.tsx#component:FrameMarker#store:0",
				"owner_site_id": "native.tsx#component:FrameMarker",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "native.tsx#component:Position#store:0",
				"owner_site_id": "native.tsx#component:Position",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "native.tsx#component:Rotation#store:0",
				"owner_site_id": "native.tsx#component:Rotation",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "native.tsx#component:FrameMarker#store:0",
				"owner_site_id": "native.tsx#component:FrameMarker",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "native.tsx#component:Position#store:0",
				"owner_site_id": "native.tsx#component:Position",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "native.tsx#component:Rotation#store:0",
				"owner_site_id": "native.tsx#component:Rotation",
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
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { createStore, storeRecord, use, type StoreSource, type RuntimeNode } from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"native.tsx#component:FrameMarker\", FrameMarker, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:FrameMarker\",\"host\":{\"children\":[],\"key\":\"frame-marker\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"accepted-frame\"}],[\"position-x\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"epoch\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:FrameMarker#store:0\"}],\"moduleRevision\":\"native-v1-e5f71d51e116f8f6\",\"schemaVersion\":5} });\n__nativeDefineComponent(\"native.tsx#component:Position\", Position, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:Position\",\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"position-x\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.01}}],[\"position-y\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.005}}],[\"rotation-z\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0001}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:Position#store:0\"}],\"moduleRevision\":\"native-v1-e5f71d51e116f8f6\",\"retainedChildProp\":\"children\",\"schemaVersion\":6} });\n__nativeDefineComponent(\"native.tsx#component:Rotation\", Rotation, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:Rotation\",\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"position-x\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0025}}],[\"position-y\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0075}}],[\"rotation-z\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0002}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:Rotation#store:0\"}],\"moduleRevision\":\"native-v1-e5f71d51e116f8f6\",\"retainedChildProp\":\"children\",\"schemaVersion\":6} });\nimport { createThreeNativeRoot } from '@r3act/host-three';\nimport * as THREE from 'three';\nimport { OBJECTS, start, value } from './scene';\n\ntype Frame = { readonly phase: number; readonly epoch: number };\ntype MotionProps = { key?: string; clock: StoreSource<Frame>; children?: RuntimeNode };\nconst clock = createStore<Frame>(storeRecord({ phase: 0, epoch: 0 }));\n\nfunction Position(props: MotionProps) {\n  const frame = __nativeUseAt(\"native.tsx#component:Position#store:0\", props.clock);\n  return <group key=\"motion\" position-x={frame.phase * .01} position-y={frame.phase * .005} rotation-z={frame.phase * .0001}>\n    {props.children}\n  </group>;\n}\nfunction Rotation(props: MotionProps) {\n  const frame = __nativeUseAt(\"native.tsx#component:Rotation#store:0\", props.clock);\n  return <group key=\"motion\" position-x={frame.phase * .0025} position-y={frame.phase * .0075} rotation-z={frame.phase * .0002}>\n    {props.children}\n  </group>;\n}\nfunction FrameMarker(props: { key?: string; clock: StoreSource<Frame> }) {\n  const frame = __nativeUseAt(\"native.tsx#component:FrameMarker#store:0\", props.clock);\n  return <group key=\"frame-marker\" name=\"accepted-frame\" position-x={frame.epoch} />;\n}\nfunction App() {\n  return <><FrameMarker key=\"frame-marker\" clock={clock} /><group key=\"objects\" name=\"objects\">{Array.from({ length: OBJECTS }, (_, id) =>\n    <group key={id} name={`object-${id}`}>\n      {id % 2 === 0\n        ? <Position key=\"motion\" clock={clock}><group name={`child-${id}`} /></Position>\n        : <Rotation key=\"motion\" clock={clock}><group name={`child-${id}`} /></Rotation>}\n    </group>)}</group></>;\n}\nconst scene = new THREE.Scene();\nconst counts: Record<string, number> = {};\nconst diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;\nconst root = createThreeNativeRoot(scene, { rootOptions: {\n  rootId: 'structural-owner-scope-native', scheduleCommit() {},\n  profileCounter: diagnostics ? batch => {\n    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;\n  } : undefined,\n} });\nconst setupStart = performance.now();\nroot.root.mount(<App />);\nconst setupMs = performance.now() - setupStart;\nfor (const key of Object.keys(counts)) delete counts[key];\nstart({ scene,\n  update(epoch) {\n    clock.dispatch(() => storeRecord({ phase: value(epoch), epoch }));\n    const published = root.root.flush();\n    const accepted = scene.getObjectByName('accepted-frame')?.position.x;\n    return { published: published && accepted === epoch, counters: diagnostics ? { ...counts } : undefined };\n  },\n  dispose() {\n    root.dispose();\n    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren: scene.children.length,\n      registeredSetters: 0,\n      ownerCount: root.root.diagnostics().ownerCount,\n      pending: root.root.diagnostics().pendingChangeCount,\n      counters: { ...counts } };\n  },\n});\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "native.tsx#component:App",
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
			"name": "FrameMarker",
			"component_site_id": "native.tsx#component:FrameMarker",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "native.tsx#component:FrameMarker#store:0",
				"source_expression": "props.clock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:FrameMarker",
				"host": {
					"children": [],
					"key": "frame-marker",
					"props": [["name", {
						"kind": "literal",
						"value": "accepted-frame"
					}], ["position-x", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "group"
				},
				"inputs": [{
					"paths": [["epoch"]],
					"storeProp": "clock",
					"storeUseSiteId": "native.tsx#component:FrameMarker#store:0"
				}],
				"moduleRevision": "native-v1-e5f71d51e116f8f6",
				"schemaVersion": 5
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Position",
			"component_site_id": "native.tsx#component:Position",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "native.tsx#component:Position#store:0",
				"source_expression": "props.clock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:Position",
				"host": {
					"child": null,
					"key": "motion",
					"props": [
						["position-x", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": .01
							}
						}],
						["position-y", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": .005
							}
						}],
						["rotation-z", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": 1e-4
							}
						}]
					],
					"tag": "group"
				},
				"inputs": [{
					"paths": [["phase"]],
					"storeProp": "clock",
					"storeUseSiteId": "native.tsx#component:Position#store:0"
				}],
				"moduleRevision": "native-v1-e5f71d51e116f8f6",
				"retainedChildProp": "children",
				"schemaVersion": 6
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Rotation",
			"component_site_id": "native.tsx#component:Rotation",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "native.tsx#component:Rotation#store:0",
				"source_expression": "props.clock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:Rotation",
				"host": {
					"child": null,
					"key": "motion",
					"props": [
						["position-x", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": .0025
							}
						}],
						["position-y", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": .0075
							}
						}],
						["rotation-z", {
							"kind": "binary",
							"left": {
								"index": 0,
								"kind": "input"
							},
							"operator": "*",
							"right": {
								"kind": "literal",
								"value": 2e-4
							}
						}]
					],
					"tag": "group"
				},
				"inputs": [{
					"paths": [["phase"]],
					"storeProp": "clock",
					"storeUseSiteId": "native.tsx#component:Rotation#store:0"
				}],
				"moduleRevision": "native-v1-e5f71d51e116f8f6",
				"retainedChildProp": "children",
				"schemaVersion": 6
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
