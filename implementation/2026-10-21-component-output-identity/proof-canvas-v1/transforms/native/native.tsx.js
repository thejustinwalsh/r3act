import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-de025bd79d94da84",
	"owners": [
		{
			"site_id": "native.tsx#component:App",
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
	"sources": [{
		"site_id": "native.tsx#component:Position#state:0",
		"owner_site_id": "native.tsx#component:Position",
		"kind": "state",
		"provenance": "tracked"
	}, {
		"site_id": "native.tsx#component:Rotation#state:0",
		"owner_site_id": "native.tsx#component:Rotation",
		"kind": "state",
		"provenance": "tracked"
	}],
	"sinks": [{
		"site_id": "native.tsx#numeric-sink:564",
		"owner_site_id": "native.tsx#component:Position",
		"source_sites": ["native.tsx#component:Position#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}, {
		"site_id": "native.tsx#numeric-sink:808",
		"owner_site_id": "native.tsx#component:Rotation",
		"source_sites": ["native.tsx#component:Rotation#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": "native.tsx#component:Position#effect:0",
		"owner_site_id": "native.tsx#component:Position",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "native.tsx#component:Rotation#effect:0",
		"owner_site_id": "native.tsx#component:Rotation",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {
			"native.tsx#component:Position#state:0": ["native.tsx#numeric-sink:564"],
			"native.tsx#component:Rotation#state:0": ["native.tsx#numeric-sink:808"]
		},
		"execution_order": ["native.tsx#numeric-sink:564", "native.tsx#numeric-sink:808"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-de025bd79d94da84" && event.previousInstance === "native-v1-de025bd79d94da84") __invalidateNativeSemanticPlan("native.tsx", "native-v1-de025bd79d94da84");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "@r3act/core";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "native.tsx#component:Position",
	sinkId: "native.tsx#numeric-sink:564",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["native.tsx#component:Position#state:0"]
}, {
	schemaVersion: 2,
	ownerProgramId: "native.tsx#component:Rotation",
	sinkId: "native.tsx#numeric-sink:808",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["native.tsx#component:Rotation#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 2,
	programId: "native.tsx#component:Position",
	slotCount: 1,
	sinkIds: ["native.tsx#numeric-sink:564"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}, {
	schemaVersion: 2,
	programId: "native.tsx#component:Rotation",
	slotCount: 1,
	sinkIds: ["native.tsx#numeric-sink:808"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) {
		let stagedCount = 0;
		for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {
			const rowState = rowStates[changeIndex];
			switch (changedSlots[changeIndex]) {
				case 0: {
					if ((rowState.seenMask & 1) === 0) {
						rowState.seenMask |= 1;
						const next = rowState.inputValues[0];
						const sinkState = rowState.sinks[0];
						const last = sinkState.lastValue;
						const same = last === next ? typeof next !== "number" || typeof last === "number" && (last !== 0 || 1 / last === 1 / next) : typeof last === "number" && typeof next === "number" && last !== last && next !== next;
						if (!same) {
							stagedInputIndices[stagedCount] = changeIndex;
							stagedSinkIds[stagedCount] = 0;
							stagedValues[stagedCount] = next;
							stagedCount++;
						}
					}
					break;
				}
			}
		}
		return stagedCount;
	}
}];
__nativeDefineComponent("native.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("native.tsx#component:Position", Position, {
	propOnlySites: ["native.tsx#component:Position#state:0"],
	numericPrimitiveProps: ["id"],
	stateLayout: {
		schemaVersion: 1,
		programId: "native.tsx#component:Position",
		moduleRevision: "native-v1-de025bd79d94da84",
		slots: [{
			siteId: "native.tsx#component:Position#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent("native.tsx#component:Rotation", Rotation, {
	propOnlySites: ["native.tsx#component:Rotation#state:0"],
	numericPrimitiveProps: ["id"],
	stateLayout: {
		schemaVersion: 1,
		programId: "native.tsx#component:Rotation",
		moduleRevision: "native-v1-de025bd79d94da84",
		slots: [{
			siteId: "native.tsx#component:Rotation#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[1]
});
import { createThreeNativeRoot } from "@r3act/host-three";
import * as THREE from "three";
import { OBJECTS, start, value } from "./scene";
const setters = Array(OBJECTS).fill(undefined);
function Position({ id }) {
	const [x, setX] = __nativeUseStateAt("native.tsx#component:Position#state:0", 0);
	__nativeUseEffectAt("native.tsx#component:Position#effect:0", () => {
		setters[id] = setX;
		return () => {
			setters[id] = undefined;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: id,
		name: `object-${id}`,
		"position-x": __nativeBindStatePropAt("native.tsx#component:Position#state:0", (x) => x, __nativeNumericPrograms[0])
	});
}
function Rotation({ id }) {
	const [angle, setAngle] = __nativeUseStateAt("native.tsx#component:Rotation#state:0", 0);
	__nativeUseEffectAt("native.tsx#component:Rotation#effect:0", () => {
		setters[id] = setAngle;
		return () => {
			setters[id] = undefined;
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: id,
		name: `object-${id}`,
		"rotation-z": __nativeBindStatePropAt("native.tsx#component:Rotation#state:0", (angle) => angle, __nativeNumericPrograms[1])
	});
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx("group", { key: "objects" }, Array.from({ length: OBJECTS }, (_, id) => id % 2 === 0 ? /* @__PURE__ */ __nativeJsx.jsx(Position, {
		key: id,
		id
	}) : /* @__PURE__ */ __nativeJsx.jsx(Rotation, {
		key: id,
		id
	})));
}
const scene = new THREE.Scene();
const counts = {};
const diagnostics = window.__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
	rootId: "realtime-native",
	scheduleCommit() {},
	profileCounter: diagnostics ? (batch) => {
		for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
	} : undefined
} });
const setupStart = performance.now();
root.root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
const setupMs = performance.now() - setupStart;
if (setters.some((set) => !set)) throw new Error("Native mount effect did not register every setter");
start({
	scene,
	update(epoch) {
		for (let id = 0; id < OBJECTS; id++) setters[id](value(id, epoch));
		const published = root.root.flush();
		return {
			published,
			counters: diagnostics ? { ...counts } : undefined
		};
	},
	dispose() {
		root.dispose();
		return {
			setupMs,
			setupScope: "root.mount through activation; scene/root construction excluded",
			sceneChildren: scene.children.length,
			registeredSetters: setters.filter(Boolean).length,
			ownerCount: root.root.diagnostics().ownerCount,
			pending: root.root.diagnostics().pendingChangeCount,
			counters: { ...counts }
		};
	}
});
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-de025bd79d94da84",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-de025bd79d94da84",
		"owners": [
			{
				"site_id": "native.tsx#component:App",
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
		"sources": [{
			"site_id": "native.tsx#component:Position#state:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "state",
			"provenance": "tracked"
		}, {
			"site_id": "native.tsx#component:Rotation#state:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "state",
			"provenance": "tracked"
		}],
		"sinks": [{
			"site_id": "native.tsx#numeric-sink:564",
			"owner_site_id": "native.tsx#component:Position",
			"source_sites": ["native.tsx#component:Position#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}, {
			"site_id": "native.tsx#numeric-sink:808",
			"owner_site_id": "native.tsx#component:Rotation",
			"source_sites": ["native.tsx#component:Rotation#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": "native.tsx#component:Position#effect:0",
			"owner_site_id": "native.tsx#component:Position",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "native.tsx#component:Rotation#effect:0",
			"owner_site_id": "native.tsx#component:Rotation",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {
				"native.tsx#component:Position#state:0": ["native.tsx#numeric-sink:564"],
				"native.tsx#component:Rotation#state:0": ["native.tsx#numeric-sink:808"]
			},
			"execution_order": ["native.tsx#numeric-sink:564", "native.tsx#numeric-sink:808"]
		}
	},
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { useEffect, useState } from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"native.tsx#component:Position\", sinkId: \"native.tsx#numeric-sink:564\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"native.tsx#component:Position#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"native.tsx#component:Rotation\", sinkId: \"native.tsx#numeric-sink:808\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"native.tsx#component:Rotation#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"@r3act/core\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 2, programId: \"native.tsx#component:Position\", slotCount: 1, sinkIds: [\"native.tsx#numeric-sink:564\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }, { schemaVersion: 2, programId: \"native.tsx#component:Rotation\", slotCount: 1, sinkIds: [\"native.tsx#numeric-sink:808\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues) { let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) { const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount; } }];\n__nativeDefineComponent(\"native.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"native.tsx#component:Position\", Position, { propOnlySites: [\"native.tsx#component:Position#state:0\"], numericPrimitiveProps: [\"id\"], stateLayout: { schemaVersion: 1, programId: \"native.tsx#component:Position\", moduleRevision: \"native-v1-de025bd79d94da84\", slots: [{ siteId: \"native.tsx#component:Position#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\"native.tsx#component:Rotation\", Rotation, { propOnlySites: [\"native.tsx#component:Rotation#state:0\"], numericPrimitiveProps: [\"id\"], stateLayout: { schemaVersion: 1, programId: \"native.tsx#component:Rotation\", moduleRevision: \"native-v1-de025bd79d94da84\", slots: [{ siteId: \"native.tsx#component:Rotation#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[1] });\nimport { createThreeNativeRoot } from '@r3act/host-three';\nimport * as THREE from 'three';\nimport { OBJECTS, start, value } from './scene';\n\nconst setters: Array<((next: number) => void) | undefined> = Array(OBJECTS).fill(undefined);\nfunction Position({ id }: { id: number }) {\n  const [x, setX] = __nativeUseStateAt(\"native.tsx#component:Position#state:0\", 0);\n  __nativeUseEffectAt(\"native.tsx#component:Position#effect:0\", () => { setters[id] = setX; return () => { setters[id] = undefined; }; });\n  return <group key={id} name={`object-${id}`} position-x={__nativeBindStatePropAt(\"native.tsx#component:Position#state:0\", (x) => (x), __nativeNumericPrograms[0])} />;\n}\nfunction Rotation({ id }: { id: number }) {\n  const [angle, setAngle] = __nativeUseStateAt(\"native.tsx#component:Rotation#state:0\", 0);\n  __nativeUseEffectAt(\"native.tsx#component:Rotation#effect:0\", () => { setters[id] = setAngle; return () => { setters[id] = undefined; }; });\n  return <group key={id} name={`object-${id}`} rotation-z={__nativeBindStatePropAt(\"native.tsx#component:Rotation#state:0\", (angle) => (angle), __nativeNumericPrograms[1])} />;\n}\nfunction App() {\n  return <group key=\"objects\">{Array.from({ length: OBJECTS }, (_, id) =>\n    id % 2 === 0 ? <Position key={id} id={id} /> : <Rotation key={id} id={id} />)}</group>;\n}\nconst scene = new THREE.Scene();\nconst counts: Record<string, number> = {};\nconst diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;\nconst root = createThreeNativeRoot(scene, { rootOptions: {\n  rootId: 'realtime-native', scheduleCommit() {},\n  profileCounter: diagnostics ? batch => {\n    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;\n  } : undefined,\n} });\nconst setupStart = performance.now();\nroot.root.mount(<App />);\nconst setupMs = performance.now() - setupStart;\nif (setters.some(set => !set)) throw new Error('Native mount effect did not register every setter');\nstart({ scene,\n  update(epoch) {\n    for (let id = 0; id < OBJECTS; id++) setters[id]!(value(id, epoch));\n    const published = root.root.flush();\n    return { published, counters: diagnostics ? { ...counts } : undefined };\n  },\n  dispose() {\n    root.dispose();\n    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren: scene.children.length,\n      registeredSetters: setters.filter(Boolean).length,\n      ownerCount: root.root.diagnostics().ownerCount,\n      pending: root.root.diagnostics().pendingChangeCount,\n      counters: { ...counts } };\n  },\n});\n",
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
			"name": "Position",
			"component_site_id": "native.tsx#component:Position",
			"prop_only_sites": ["native.tsx#component:Position#state:0"],
			"numeric_primitive_props": ["id"],
			"state_layout": {
				"schema_version": 1,
				"programId": "native.tsx#component:Position",
				"moduleRevision": "native-v1-de025bd79d94da84",
				"slots": [{
					"site_id": "native.tsx#component:Position#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "native.tsx#component:Position#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "native.tsx#component:Position#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "native.tsx#numeric-sink:564",
				"source_sites": ["native.tsx#component:Position#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "Rotation",
			"component_site_id": "native.tsx#component:Rotation",
			"prop_only_sites": ["native.tsx#component:Rotation#state:0"],
			"numeric_primitive_props": ["id"],
			"state_layout": {
				"schema_version": 1,
				"programId": "native.tsx#component:Rotation",
				"moduleRevision": "native-v1-de025bd79d94da84",
				"slots": [{
					"site_id": "native.tsx#component:Rotation#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": "native.tsx#component:Rotation#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": "native.tsx#component:Rotation#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "native.tsx#numeric-sink:808",
				"source_sites": ["native.tsx#component:Rotation#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
