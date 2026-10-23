import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-67491c21e58a1462",
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
			"site_id": "native.tsx#component:Position#state:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "native.tsx#component:Position#store:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native.tsx#component:Rotation#state:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "native.tsx#component:Rotation#store:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [
		{
			"site_id": "native.tsx#opaque-sink:900",
			"owner_site_id": "native.tsx#component:Position",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "native.tsx#opaque-sink:940",
			"owner_site_id": "native.tsx#component:Position",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "native.tsx#opaque-sink:986",
			"owner_site_id": "native.tsx#component:Position",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "native.tsx#opaque-sink:1322",
			"owner_site_id": "native.tsx#component:Rotation",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "native.tsx#opaque-sink:1364",
			"owner_site_id": "native.tsx#component:Rotation",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		},
		{
			"site_id": "native.tsx#opaque-sink:1411",
			"owner_site_id": "native.tsx#component:Rotation",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}
	],
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
			"site_id": "native.tsx#component:Position#effect:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native.tsx#component:Rotation#store:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "native.tsx#component:Rotation#effect:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "activation-effect",
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
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-67491c21e58a1462" && event.previousInstance === "native-v1-67491c21e58a1462") __invalidateNativeSemanticPlan("native.tsx", "native-v1-67491c21e58a1462");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { createNativeFrameLoop, createStore, storeRecord } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "@r3act/core";
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
		"moduleRevision": "native-v1-67491c21e58a1462",
		"schemaVersion": 5
	},
	closedStoreExecution: {
		"componentProgramId": "native.tsx#component:FrameMarker",
		"kind": "owned-data",
		"moduleRevision": "native-v1-67491c21e58a1462",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[1] = sharedInputs[0];
			}
		}
	}
});
__nativeDefineComponent("native.tsx#component:Position", Position, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:Position",
		"effectSites": ["native.tsx#component:Position#effect:0"],
		"host": {
			"child": null,
			"key": "motion",
			"props": [
				["position-x", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"index": 1,
						"kind": "input"
					}
				}],
				["position-y", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"kind": "binary",
						"left": {
							"index": 1,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": .5
						}
					}
				}],
				["rotation-z", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"kind": "binary",
						"left": {
							"index": 1,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": .01
						}
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
		"moduleRevision": "native-v1-67491c21e58a1462",
		"retainedChildProp": "children",
		"schemaVersion": 7,
		"stateSites": ["native.tsx#component:Position#state:0"]
	},
	closedStoreExecution: {
		"componentProgramId": "native.tsx#component:Position",
		"kind": "owned-data",
		"moduleRevision": "native-v1-67491c21e58a1462",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			const $r3actDag0 = sharedInputs[0] * 1e-4;
			const $r3actDag1 = sharedInputs[0] * .005;
			const $r3actDag2 = sharedInputs[0] * .01;
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[0] = $r3actDag2 + varyingInputs[row * 1 + 0];
				rowOutput[1] = $r3actDag1 + varyingInputs[row * 1 + 0] * .5;
				rowOutput[2] = $r3actDag0 + varyingInputs[row * 1 + 0] * .01;
			}
		}
	}
});
__nativeDefineComponent("native.tsx#component:Rotation", Rotation, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:Rotation",
		"effectSites": ["native.tsx#component:Rotation#effect:0"],
		"host": {
			"child": null,
			"key": "motion",
			"props": [
				["position-x", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"index": 1,
						"kind": "input"
					}
				}],
				["position-y", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"kind": "binary",
						"left": {
							"index": 1,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": .5
						}
					}
				}],
				["rotation-z", {
					"kind": "binary",
					"left": {
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
					},
					"operator": "+",
					"right": {
						"kind": "binary",
						"left": {
							"index": 1,
							"kind": "input"
						},
						"operator": "*",
						"right": {
							"kind": "literal",
							"value": .01
						}
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
		"moduleRevision": "native-v1-67491c21e58a1462",
		"retainedChildProp": "children",
		"schemaVersion": 7,
		"stateSites": ["native.tsx#component:Rotation#state:0"]
	},
	closedStoreExecution: {
		"componentProgramId": "native.tsx#component:Rotation",
		"kind": "owned-data",
		"moduleRevision": "native-v1-67491c21e58a1462",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			const $r3actDag0 = sharedInputs[0] * 2e-4;
			const $r3actDag1 = sharedInputs[0] * .0025;
			const $r3actDag2 = sharedInputs[0] * .0075;
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[0] = $r3actDag1 + varyingInputs[row * 1 + 0];
				rowOutput[1] = $r3actDag2 + varyingInputs[row * 1 + 0] * .5;
				rowOutput[2] = $r3actDag0 + varyingInputs[row * 1 + 0] * .01;
			}
		}
	}
});
import { createThreeNativeRoot } from "@r3act/host-three";
import { OBJECTS, createView, gridX, gridY, start, value } from "./scene";
const clock = createStore(storeRecord({
	phase: 0,
	epoch: 0
}));
const controls = [];
function Position(props) {
	const frame = __nativeUseAt("native.tsx#component:Position#store:0", props.clock);
	const [offset, setOffset] = __nativeUseStateAt("native.tsx#component:Position#state:0", 0);
	__nativeUseEffectAt("native.tsx#component:Position#effect:0", () => {
		controls[props.id] = setOffset;
		return () => {
			controls[props.id] = undefined;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		"position-x": frame.phase * .01 + offset,
		"position-y": frame.phase * .005 + offset * .5,
		"rotation-z": frame.phase * 1e-4 + offset * .01
	}, props.children);
}
function Rotation(props) {
	const frame = __nativeUseAt("native.tsx#component:Rotation#store:0", props.clock);
	const [offset, setOffset] = __nativeUseStateAt("native.tsx#component:Rotation#state:0", 0);
	__nativeUseEffectAt("native.tsx#component:Rotation#effect:0", () => {
		controls[props.id] = setOffset;
		return () => {
			controls[props.id] = undefined;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		"position-x": frame.phase * .0025 + offset,
		"position-y": frame.phase * .0075 + offset * .5,
		"rotation-z": frame.phase * 2e-4 + offset * .01
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
		name: `object-${id}`,
		"position-x": gridX(id),
		"position-y": gridY(id)
	}, id % 2 === 0 ? /* @__PURE__ */ __nativeJsx.jsx(Position, {
		key: "motion",
		id,
		clock
	}, /* @__PURE__ */ __nativeJsx.jsx("group", { name: `child-${id}` }, /* @__PURE__ */ __nativeJsx.jsx("mesh", null, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		.12,
		.12,
		.12
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshBasicMaterial", { color: "orange" })))) : /* @__PURE__ */ __nativeJsx.jsx(Rotation, {
		key: "motion",
		id,
		clock
	}, /* @__PURE__ */ __nativeJsx.jsx("group", { name: `child-${id}` }, /* @__PURE__ */ __nativeJsx.jsx("mesh", null, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		.12,
		.12,
		.12
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshBasicMaterial", { color: "orange" }))))))));
}
const { scene, camera, renderer } = createView();
const counts = {};
const diagnostics = window.__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
	rootId: "mixed-numeric-r3f-native",
	scheduleCommit() {},
	profileCounter: diagnostics ? (batch) => {
		for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
	} : undefined
} });
const setupStart = performance.now();
const appTree = /* @__PURE__ */ __nativeJsx.jsx(App, null);
root.root.mount(appTree);
const setupMs = performance.now() - setupStart;
for (const key of Object.keys(counts)) delete counts[key];
let requestedEpoch = 0, drawnFrames = 0;
const frameLoop = createNativeFrameLoop({
	roots: [{
		root: root.root,
		stores: [clock]
	}],
	update() {
		clock.dispatch(() => storeRecord({
			phase: value(requestedEpoch),
			epoch: requestedEpoch
		}));
	},
	draw() {
		if (diagnostics) drawnFrames++;
	}
});
start({
	scene,
	camera,
	renderer,
	controlProof() {
		if (controls.filter(Boolean).length !== OBJECTS) throw new Error("Missing native local controls");
		controls[0](2);
		controls[1](3);
		if (!root.root.flush()) throw new Error("Local publication deferred");
		const objects = scene.getObjectByName("objects").children;
		if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error("Local control mismatch");
		controls[0](0);
		controls[1](0);
		if (!root.root.flush()) throw new Error("Local reset deferred");
		for (const key of Object.keys(counts)) delete counts[key];
	},
	update(epoch) {
		requestedEpoch = epoch;
		const result = frameLoop.advance(epoch * (1e3 / 60));
		if (result.status !== "drawn" || result.publication?.status !== "committed") throw new Error(`Frame group did not publish: ${result.status}`);
		if (diagnostics) {
			counts["frame.group.committed"] = epoch;
			counts["frame.draws"] = drawnFrames;
			counts["frame.accepted-root-version"] = root.root.publicationVersion;
		}
		return {
			published: true,
			counters: diagnostics ? { ...counts } : undefined
		};
	},
	dispose() {
		frameLoop.dispose();
		if (diagnostics) {
			const before = { ...counts };
			const saved = root.root.snapshot;
			const savedBytes = JSON.stringify(saved);
			const objects = scene.getObjectByName("objects").children;
			const identities = objects.map((object) => {
				const motion = object.children[0], child = motion.children[0];
				const mesh = child.children[0];
				return [
					object,
					motion,
					child,
					mesh,
					mesh.geometry,
					mesh.material
				];
			});
			root.root.render(appTree);
			const observed = root.root.snapshot;
			const ordered = (value) => Array.isArray(value) ? value.map(ordered) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])])) : value;
			const current = scene.getObjectByName("objects").children;
			if (current.length !== identities.length) throw new Error("Observation changed membership");
			for (let id = 0; id < current.length; id++) {
				const object = current[id], motion = object.children[0], child = motion.children[0];
				const mesh = child.children[0];
				const actual = [
					object,
					motion,
					child,
					mesh,
					mesh.geometry,
					mesh.material
				];
				if (actual.some((entry, index) => entry !== identities[id][index])) throw new Error(`Observation replaced retained identity ${id}`);
			}
			if (scene.getObjectByName("accepted-frame")?.position.x !== 72 || JSON.stringify(ordered(observed)) !== JSON.stringify(ordered(saved))) throw new Error("Generic observation changed accepted output");
			clock.dispatch(() => storeRecord({
				phase: value(73),
				epoch: 73
			}));
			if (!root.root.flush() || scene.getObjectByName("accepted-frame")?.position.x !== 73) throw new Error("Post-observation frame did not publish");
			if (JSON.stringify(saved) !== savedBytes) throw new Error("Saved snapshot changed after a later frame");
			counts["proof.compact.root-observation-delta"] = (counts["store.scalar-output.root-materializations"] ?? 0) - (before["store.scalar-output.root-materializations"] ?? 0);
			counts["proof.compact.prop-observation-delta"] = (counts["store.scalar-output.prop-materializations"] ?? 0) - (before["store.scalar-output.prop-materializations"] ?? 0);
			counts["proof.compact.saved-snapshot-immutable"] = 1;
			counts["proof.compact.observed-epoch"] = 72;
			counts["proof.compact.later-epoch"] = 73;
		}
		root.dispose();
		scene.remove(camera);
		const sceneChildren = scene.children.length;
		return {
			setupMs,
			setupScope: "root.mount through activation; scene/root construction excluded",
			sceneChildren,
			registeredSetters: controls.filter(Boolean).length,
			ownerCount: root.root.diagnostics().ownerCount,
			pending: root.root.diagnostics().pendingChangeCount,
			counters: { ...counts }
		};
	}
});
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-67491c21e58a1462",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-67491c21e58a1462",
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
				"site_id": "native.tsx#component:Position#state:0",
				"owner_site_id": "native.tsx#component:Position",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "native.tsx#component:Position#store:0",
				"owner_site_id": "native.tsx#component:Position",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "native.tsx#component:Rotation#state:0",
				"owner_site_id": "native.tsx#component:Rotation",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "native.tsx#component:Rotation#store:0",
				"owner_site_id": "native.tsx#component:Rotation",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [
			{
				"site_id": "native.tsx#opaque-sink:900",
				"owner_site_id": "native.tsx#component:Position",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "native.tsx#opaque-sink:940",
				"owner_site_id": "native.tsx#component:Position",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "native.tsx#opaque-sink:986",
				"owner_site_id": "native.tsx#component:Position",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "native.tsx#opaque-sink:1322",
				"owner_site_id": "native.tsx#component:Rotation",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "native.tsx#opaque-sink:1364",
				"owner_site_id": "native.tsx#component:Rotation",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			},
			{
				"site_id": "native.tsx#opaque-sink:1411",
				"owner_site_id": "native.tsx#component:Rotation",
				"source_sites": [],
				"provenance": "opaque",
				"equality": "adapter-declared",
				"host_value": "adapter-declared",
				"retention": "adapter-declared",
				"execution": "generic"
			}
		],
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
				"site_id": "native.tsx#component:Position#effect:0",
				"owner_site_id": "native.tsx#component:Position",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "native.tsx#component:Rotation#store:0",
				"owner_site_id": "native.tsx#component:Rotation",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "native.tsx#component:Rotation#effect:0",
				"owner_site_id": "native.tsx#component:Rotation",
				"kind": "activation-effect",
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
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { createNativeFrameLoop, createStore, storeRecord, use, useState, useEffect, type StoreSource, type RuntimeNode } from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"native.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"native.tsx#component:FrameMarker\", FrameMarker, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:FrameMarker\",\"host\":{\"children\":[],\"key\":\"frame-marker\",\"props\":[[\"name\",{\"kind\":\"literal\",\"value\":\"accepted-frame\"}],[\"position-x\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"epoch\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:FrameMarker#store:0\"}],\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"schemaVersion\":5}, closedStoreExecution: {\"componentProgramId\":\"native.tsx#component:FrameMarker\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[1] = sharedInputs[0];}}} });\n__nativeDefineComponent(\"native.tsx#component:Position\", Position, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:Position\",\"effectSites\":[\"native.tsx#component:Position#effect:0\"],\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"position-x\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.01}},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}],[\"position-y\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.005}},\"operator\":\"+\",\"right\":{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.5}}}],[\"rotation-z\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0001}},\"operator\":\"+\",\"right\":{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.01}}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:Position#store:0\"}],\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"retainedChildProp\":\"children\",\"schemaVersion\":7,\"stateSites\":[\"native.tsx#component:Position#state:0\"]}, closedStoreExecution: {\"componentProgramId\":\"native.tsx#component:Position\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {const $r3actDag0 = ((sharedInputs[0] * 0.0001));const $r3actDag1 = ((sharedInputs[0] * 0.005));const $r3actDag2 = ((sharedInputs[0] * 0.01));for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[0] = ($r3actDag2 + varyingInputs[row * 1 + 0]);rowOutput[1] = ($r3actDag1 + (varyingInputs[row * 1 + 0] * 0.5));rowOutput[2] = ($r3actDag0 + (varyingInputs[row * 1 + 0] * 0.01));}}} });\n__nativeDefineComponent(\"native.tsx#component:Rotation\", Rotation, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:Rotation\",\"effectSites\":[\"native.tsx#component:Rotation#effect:0\"],\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"position-x\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0025}},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}],[\"position-y\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0075}},\"operator\":\"+\",\"right\":{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.5}}}],[\"rotation-z\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.0002}},\"operator\":\"+\",\"right\":{\"kind\":\"binary\",\"left\":{\"index\":1,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.01}}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\"native.tsx#component:Rotation#store:0\"}],\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"retainedChildProp\":\"children\",\"schemaVersion\":7,\"stateSites\":[\"native.tsx#component:Rotation#state:0\"]}, closedStoreExecution: {\"componentProgramId\":\"native.tsx#component:Rotation\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-67491c21e58a1462\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {const $r3actDag0 = ((sharedInputs[0] * 0.0002));const $r3actDag1 = ((sharedInputs[0] * 0.0025));const $r3actDag2 = ((sharedInputs[0] * 0.0075));for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[0] = ($r3actDag1 + varyingInputs[row * 1 + 0]);rowOutput[1] = ($r3actDag2 + (varyingInputs[row * 1 + 0] * 0.5));rowOutput[2] = ($r3actDag0 + (varyingInputs[row * 1 + 0] * 0.01));}}} });\nimport { createThreeNativeRoot } from '@r3act/host-three';\nimport { OBJECTS, createView, gridX, gridY, start, value } from './scene';\n\ntype Frame = { readonly phase: number; readonly epoch: number };\ntype MotionProps = { key?: string; id: number; clock: StoreSource<Frame>; children?: RuntimeNode };\nconst clock = createStore<Frame>(storeRecord({ phase: 0, epoch: 0 }));\nconst controls: Array<((value: number) => void) | undefined> = [];\n\nfunction Position(props: MotionProps) {\n  const frame = __nativeUseAt(\"native.tsx#component:Position#store:0\", props.clock);\n  const [offset, setOffset] = __nativeUseStateAt(\"native.tsx#component:Position#state:0\", 0);\n  __nativeUseEffectAt(\"native.tsx#component:Position#effect:0\", () => { controls[props.id] = setOffset; return () => { controls[props.id] = undefined; }; });\n  return <group key=\"motion\" position-x={frame.phase * .01 + offset} position-y={frame.phase * .005 + offset * .5} rotation-z={frame.phase * .0001 + offset * .01}>\n    {props.children}\n  </group>;\n}\nfunction Rotation(props: MotionProps) {\n  const frame = __nativeUseAt(\"native.tsx#component:Rotation#store:0\", props.clock);\n  const [offset, setOffset] = __nativeUseStateAt(\"native.tsx#component:Rotation#state:0\", 0);\n  __nativeUseEffectAt(\"native.tsx#component:Rotation#effect:0\", () => { controls[props.id] = setOffset; return () => { controls[props.id] = undefined; }; });\n  return <group key=\"motion\" position-x={frame.phase * .0025 + offset} position-y={frame.phase * .0075 + offset * .5} rotation-z={frame.phase * .0002 + offset * .01}>\n    {props.children}\n  </group>;\n}\nfunction FrameMarker(props: { key?: string; clock: StoreSource<Frame> }) {\n  const frame = __nativeUseAt(\"native.tsx#component:FrameMarker#store:0\", props.clock);\n  return <group key=\"frame-marker\" name=\"accepted-frame\" position-x={frame.epoch} />;\n}\nfunction App() {\n  return <><FrameMarker key=\"frame-marker\" clock={clock} /><group key=\"objects\" name=\"objects\">{Array.from({ length: OBJECTS }, (_, id) =>\n    <group key={id} name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}>\n      {id % 2 === 0\n        ? <Position key=\"motion\" id={id} clock={clock}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color=\"orange\" /></mesh></group></Position>\n        : <Rotation key=\"motion\" id={id} clock={clock}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color=\"orange\" /></mesh></group></Rotation>}\n    </group>)}</group></>;\n}\nconst { scene, camera, renderer } = createView();\nconst counts: Record<string, number> = {};\nconst diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;\nconst root = createThreeNativeRoot(scene, { rootOptions: {\n  rootId: 'mixed-numeric-r3f-native', scheduleCommit() {},\n  profileCounter: diagnostics ? batch => {\n    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;\n  } : undefined,\n} });\nconst setupStart = performance.now();\nconst appTree = <App />;\nroot.root.mount(appTree);\nconst setupMs = performance.now() - setupStart;\nfor (const key of Object.keys(counts)) delete counts[key];\nlet requestedEpoch = 0, drawnFrames = 0;\nconst frameLoop = createNativeFrameLoop({\n  roots: [{ root: root.root, stores: [clock] }],\n  update() { clock.dispatch(() => storeRecord({ phase: value(requestedEpoch), epoch: requestedEpoch })); },\n  draw() { if (diagnostics) drawnFrames++; },\n});\n\nstart({ scene, camera, renderer,\n  controlProof() {\n    if (controls.filter(Boolean).length !== OBJECTS) throw new Error('Missing native local controls');\n    controls[0]!(2); controls[1]!(3);\n    if (!root.root.flush()) throw new Error('Local publication deferred');\n    const objects = scene.getObjectByName('objects')!.children;\n    if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error('Local control mismatch');\n    controls[0]!(0); controls[1]!(0);\n    if (!root.root.flush()) throw new Error('Local reset deferred');\n    for (const key of Object.keys(counts)) delete counts[key];\n  },\n  update(epoch) {\n    requestedEpoch = epoch;\n    const result = frameLoop.advance(epoch * (1000 / 60));\n    if (result.status !== 'drawn' || result.publication?.status !== 'committed')\n      throw new Error(`Frame group did not publish: ${result.status}`);\n    if (diagnostics) {\n      counts['frame.group.committed'] = epoch;\n      counts['frame.draws'] = drawnFrames;\n      counts['frame.accepted-root-version'] = root.root.publicationVersion;\n    }\n    return { published: true, counters: diagnostics ? { ...counts } : undefined };\n  },\n  dispose() {\n    frameLoop.dispose();\n    // compact-output proof begin\n    if (diagnostics) {\n      const before = { ...counts };\n      const saved = root.root.snapshot;\n      const savedBytes = JSON.stringify(saved);\n      const objects = scene.getObjectByName('objects')!.children;\n      const identities = objects.map(object => {\n        const motion = object.children[0], child = motion.children[0];\n        const mesh = child.children[0] as typeof child.children[number] & { geometry: unknown; material: unknown };\n        return [object, motion, child, mesh, mesh.geometry, mesh.material];\n      });\n      root.root.render(appTree);\n      const observed = root.root.snapshot;\n      const ordered = (value: unknown): unknown => Array.isArray(value)\n        ? value.map(ordered) : value && typeof value === 'object'\n        ? Object.fromEntries(Object.keys(value).sort().map(key =>\n          [key, ordered((value as Record<string, unknown>)[key])])) : value;\n      const current = scene.getObjectByName('objects')!.children;\n      if (current.length !== identities.length) throw new Error('Observation changed membership');\n      for (let id = 0; id < current.length; id++) {\n        const object = current[id], motion = object.children[0], child = motion.children[0];\n        const mesh = child.children[0] as typeof child.children[number] & { geometry: unknown; material: unknown };\n        const actual = [object, motion, child, mesh, mesh.geometry, mesh.material];\n        if (actual.some((entry, index) => entry !== identities[id][index]))\n          throw new Error(`Observation replaced retained identity ${id}`);\n      }\n      if (scene.getObjectByName('accepted-frame')?.position.x !== 72 ||\n        JSON.stringify(ordered(observed)) !== JSON.stringify(ordered(saved))) throw new Error('Generic observation changed accepted output');\n      clock.dispatch(() => storeRecord({ phase: value(73), epoch: 73 }));\n      if (!root.root.flush() || scene.getObjectByName('accepted-frame')?.position.x !== 73)\n        throw new Error('Post-observation frame did not publish');\n      if (JSON.stringify(saved) !== savedBytes) throw new Error('Saved snapshot changed after a later frame');\n      counts['proof.compact.root-observation-delta'] =\n        (counts['store.scalar-output.root-materializations'] ?? 0) -\n        (before['store.scalar-output.root-materializations'] ?? 0);\n      counts['proof.compact.prop-observation-delta'] =\n        (counts['store.scalar-output.prop-materializations'] ?? 0) -\n        (before['store.scalar-output.prop-materializations'] ?? 0);\n      counts['proof.compact.saved-snapshot-immutable'] = 1;\n      counts['proof.compact.observed-epoch'] = 72;\n      counts['proof.compact.later-epoch'] = 73;\n    }\n    // compact-output proof end\n    root.dispose();\n    scene.remove(camera);\n    const sceneChildren = scene.children.length;\n    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren,\n      registeredSetters: controls.filter(Boolean).length,\n      ownerCount: root.root.diagnostics().ownerCount,\n      pending: root.root.diagnostics().pendingChangeCount,\n      counters: { ...counts } };\n  },\n});\n",
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
				"moduleRevision": "native-v1-67491c21e58a1462",
				"schemaVersion": 5
			},
			"closedStoreExecution": {
				"componentProgramId": "native.tsx#component:FrameMarker",
				"kind": "owned-data",
				"moduleRevision": "native-v1-67491c21e58a1462",
				"schemaVersion": 3
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
			"state_sites": [{
				"site_id": "native.tsx#component:Position#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "native.tsx#component:Position#effect:0" }],
			"store_sites": [{
				"site_id": "native.tsx#component:Position#store:0",
				"source_expression": "props.clock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:Position",
				"effectSites": ["native.tsx#component:Position#effect:0"],
				"host": {
					"child": null,
					"key": "motion",
					"props": [
						["position-x", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"index": 1,
								"kind": "input"
							}
						}],
						["position-y", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": .5
								}
							}
						}],
						["rotation-z", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": .01
								}
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
				"moduleRevision": "native-v1-67491c21e58a1462",
				"retainedChildProp": "children",
				"schemaVersion": 7,
				"stateSites": ["native.tsx#component:Position#state:0"]
			},
			"closedStoreExecution": {
				"componentProgramId": "native.tsx#component:Position",
				"kind": "owned-data",
				"moduleRevision": "native-v1-67491c21e58a1462",
				"schemaVersion": 3
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": [
				"native.tsx#opaque-sink:900",
				"native.tsx#opaque-sink:940",
				"native.tsx#opaque-sink:986"
			]
		},
		{
			"name": "Rotation",
			"component_site_id": "native.tsx#component:Rotation",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "native.tsx#component:Rotation#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "native.tsx#component:Rotation#effect:0" }],
			"store_sites": [{
				"site_id": "native.tsx#component:Rotation#store:0",
				"source_expression": "props.clock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:Rotation",
				"effectSites": ["native.tsx#component:Rotation#effect:0"],
				"host": {
					"child": null,
					"key": "motion",
					"props": [
						["position-x", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"index": 1,
								"kind": "input"
							}
						}],
						["position-y", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": .5
								}
							}
						}],
						["rotation-z", {
							"kind": "binary",
							"left": {
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
							},
							"operator": "+",
							"right": {
								"kind": "binary",
								"left": {
									"index": 1,
									"kind": "input"
								},
								"operator": "*",
								"right": {
									"kind": "literal",
									"value": .01
								}
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
				"moduleRevision": "native-v1-67491c21e58a1462",
				"retainedChildProp": "children",
				"schemaVersion": 7,
				"stateSites": ["native.tsx#component:Rotation#state:0"]
			},
			"closedStoreExecution": {
				"componentProgramId": "native.tsx#component:Rotation",
				"kind": "owned-data",
				"moduleRevision": "native-v1-67491c21e58a1462",
				"schemaVersion": 3
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": [
				"native.tsx#opaque-sink:1322",
				"native.tsx#opaque-sink:1364",
				"native.tsx#opaque-sink:1411"
			]
		}
	]
};
import * as __nativeJsx from "@r3act/core";
