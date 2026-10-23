import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx",
	"module_revision": "native-v1-114ac429b0ea0458",
	"owners": [{
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Game",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [{
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0",
		"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"kind": "state",
		"provenance": "tracked"
	}, {
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0",
		"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"kind": "use-input",
		"provenance": "opaque"
	}],
	"sinks": [{
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#opaque-sink:1009",
		"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [{
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0",
		"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0",
		"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"kind": "activation-effect",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": []
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx" && event.previousRevision === "native-v1-114ac429b0ea0458" && event.previousInstance === "native-v1-114ac429b0ea0458") __invalidateNativeSemanticPlan(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx", "native-v1-114ac429b0ea0458");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
// @native-ui
import { createNativeFrameLoop, createStore, storeRecord, jsx } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Game", Game, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion", Motion, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"effectSites": [".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0"],
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
						"value": .001
					}
				}]
			],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["phase"]],
			"storeProp": "clock",
			"storeUseSiteId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0"
		}],
		"moduleRevision": "native-v1-114ac429b0ea0458",
		"retainedChildProp": "children",
		"schemaVersion": 7,
		"stateSites": [".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0"]
	},
	closedStoreExecution: {
		"componentProgramId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"kind": "owned-data",
		"moduleRevision": "native-v1-114ac429b0ea0458",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			const $r3actDag0 = sharedInputs[0] * .001;
			const $r3actDag1 = sharedInputs[0] * .005;
			const $r3actDag2 = sharedInputs[0] * .01;
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[0] = $r3actDag2 + varyingInputs[row * 1 + 0];
				rowOutput[1] = $r3actDag1;
				rowOutput[2] = $r3actDag0;
			}
		}
	}
});
import { createThreeNativeRoot } from "file:///Volumes/Depot/Developer/r3act/src/three_host.ts";
import { Scene, Mesh } from "three";
import { Hud } from "./hud.mjs";
const COUNT = 1024;
const controls = [];
let activations = 0, retirements = 0;
function Motion(props) {
	const frame = __nativeUseAt(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0", props.clock);
	const [offset, setOffset] = __nativeUseStateAt(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0", () => {
		activations++;
		controls[props.id] = setOffset;
		return () => {
			retirements++;
			controls[props.id] = undefined;
		};
	});
	return /* @__PURE__ */ jsx("group", {
		key: "motion",
		"position-x": frame.phase * .01 + offset,
		"position-y": frame.phase * .005,
		"rotation-z": frame.phase * .001
	}, props.children);
}
function Game(props) {
	return /* @__PURE__ */ jsx("group", {
		key: "entities",
		name: "entities"
	}, props.ids.map((id) => /* @__PURE__ */ jsx("group", {
		key: id,
		name: `entity-${id}`,
		"position-x": (id % 32 - 15.5) * .3,
		"position-y": (Math.floor(id / 32) - 15.5) * .3
	}, /* @__PURE__ */ jsx(Motion, {
		id,
		clock: props.clock
	}, /* @__PURE__ */ jsx("mesh", null, /* @__PURE__ */ jsx("boxGeometry", { args: [
		.12,
		.12,
		.12
	] }), /* @__PURE__ */ jsx("meshBasicMaterial", { color: "orange" }))))));
}
const check = (condition, message) => {
	if (!condition) throw new Error(message);
};
export function runGameLifecycle(hud, readHud, render) {
	const clock = createStore(storeRecord({ phase: 0 })), ticks = createStore(0);
	const scene = new Scene(), game = createThreeNativeRoot(scene, { rootOptions: {
		rootId: "mounted-game-companion",
		scheduleCommit() {}
	} });
	let ids = Object.freeze(Array.from({ length: COUNT }, (_, id) => id));
	const tree = () => /* @__PURE__ */ jsx(Game, {
		clock,
		ids
	});
	const resources = new Set(), disposed = new Set();
	let disposalEvents = 0, phase = 0, draws = 0, coherentDraws = 0;
	const offsets = new Map();
	const refs = new Map();
	const object = (id) => scene.getObjectByName(`entity-${id}`);
	const capture = (id) => {
		const outer = object(id), motion = outer.children[0], mesh = motion.children[0];
		check(mesh instanceof Mesh && !Array.isArray(mesh.material), "mesh resource shape");
		const ref = [
			outer,
			motion,
			mesh,
			mesh.geometry,
			mesh.material
		];
		for (const resource of [mesh.geometry, mesh.material]) if (!resources.has(resource)) {
			resources.add(resource);
			resource.addEventListener("dispose", () => {
				disposalEvents++;
				disposed.add(resource);
			});
		}
		return ref;
	};
	const verify = () => {
		check(scene.getObjectByName("entities").children.length === ids.length, "membership");
		for (const id of ids) {
			const actual = capture(id), previous = refs.get(id);
			if (previous) check(actual.every((entry, index) => entry === previous[index]), `identity ${id}`);
			const motion = actual[1];
			check(Math.abs(motion.position.x - (phase * .01 + (offsets.get(id) ?? 0))) < 1e-10, `position ${id}`);
			check(Math.abs(motion.position.y - phase * .005) < 1e-10, `position-y ${id}`);
			check(Math.abs(motion.rotation.z - phase * .001) < 1e-10, `rotation ${id}`);
			refs.set(id, actual);
		}
	};
	const loop = createNativeFrameLoop({
		roots: [{
			root: game.root,
			stores: [clock]
		}],
		update() {
			clock.dispatch(() => storeRecord({ phase }));
		},
		draw() {
			draws++;
		}
	});
	let coherent;
	try {
		hud.mount(jsx(Hud, { ticks }));
		game.root.mount(tree());
		verify();
		check(controls.filter(Boolean).length === COUNT, "all controls mounted");
		const saved = game.root.snapshot, savedBytes = JSON.stringify(saved);
		for (const id of [
			0,
			127,
			1023
		]) {
			offsets.set(id, id + .5);
			controls[id](id + .5);
		}
		check(game.root.flush(), "sparse local publication");
		verify();
		for (const id of [
			0,
			127,
			1023
		]) {
			offsets.set(id, 0);
			controls[id](0);
		}
		check(game.root.flush(), "sparse reset");
		for (phase = 1; phase <= 12; phase++) {
			check(loop.advance(phase * 16).status === "drawn", "shared clock publication");
			verify();
			if (phase % 4 === 0) {
				ticks.dispatch(phase);
				check(hud.flush(), "independent HUD");
			}
			check(readHud() === Math.floor(phase / 4) * 4, "independent DOM cadence");
		}
		phase = 12;
		const removed = [
			1,
			512,
			1022
		], retiredRefs = removed.map((id) => refs.get(id));
		ids = Object.freeze(ids.filter((id) => !removed.includes(id)));
		game.root.render(tree());
		verify();
		check(disposed.size === 6 && retirements === 3, "removed resources/effects retired");
		ids = Object.freeze([...ids].reverse());
		game.root.render(tree());
		verify();
		for (const id of removed) {
			refs.delete(id);
			offsets.set(id, 0);
		}
		ids = Object.freeze([...ids, ...removed]);
		game.root.render(tree());
		verify();
		removed.forEach((id, index) => check(refs.get(id)[0] !== retiredRefs[index][0], "new incarnation"));
		check(controls.filter(Boolean).length === COUNT, "controls after reinsert");
		coherent = createNativeFrameLoop({
			roots: [{
				root: game.root,
				stores: [clock]
			}, {
				root: hud,
				stores: [ticks]
			}],
			update() {
				clock.dispatch(() => storeRecord({ phase }));
				ticks.dispatch(phase);
			},
			draw() {
				verify();
				check(readHud() === phase, "coherent DOM/Three cut");
				coherentDraws++;
			}
		});
		phase = 20;
		check(coherent.advance(400).status === "drawn", "coherent group publication");
		check(JSON.stringify(saved) === savedBytes, "old accepted snapshot changed");
		const rendering = render?.(scene);
		check(draws === 12 && coherentDraws === 1, "draw counts");
		coherent.dispose();
		loop.dispose();
		game.dispose();
		hud.dispose();
		check(scene.children.length === 0, "scene cleanup");
		check(controls.filter(Boolean).length === 0 && activations === retirements, "effect cleanup");
		check(resources.size === 2054 && disposed.size === resources.size && disposalEvents === resources.size, "exact resource disposal");
		return {
			status: "PASS",
			owners: COUNT,
			sparseOwners: 3,
			sharedFrames: draws,
			coherentFrames: coherentDraws,
			independentHudCommits: 3,
			structuralEdits: 3,
			resources: resources.size,
			disposals: disposalEvents,
			activations,
			retirements,
			oldSnapshotImmutable: true,
			rendering
		};
	} finally {
		coherent?.dispose();
		loop.dispose();
		game.dispose();
		hud.dispose();
	}
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-114ac429b0ea0458",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx",
		"module_revision": "native-v1-114ac429b0ea0458",
		"owners": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Game",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0",
			"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"kind": "state",
			"provenance": "tracked"
		}, {
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0",
			"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"kind": "use-input",
			"provenance": "opaque"
		}],
		"sinks": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#opaque-sink:1009",
			"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0",
			"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0",
			"owner_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": []
		}
	},
	"source_file": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport { createDOMRoot, createNativeFrameLoop, createStore, storeRecord, jsx,\n  use, useEffect, useState, type RuntimeNode, type StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Game\", Game, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion\", Motion, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion\",\"effectSites\":[\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0\"],\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"position-x\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.01}},\"operator\":\"+\",\"right\":{\"index\":1,\"kind\":\"input\"}}],[\"position-y\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.005}}],[\"rotation-z\",{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"*\",\"right\":{\"kind\":\"literal\",\"value\":0.001}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"phase\"]],\"storeProp\":\"clock\",\"storeUseSiteId\":\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0\"}],\"moduleRevision\":\"native-v1-114ac429b0ea0458\",\"retainedChildProp\":\"children\",\"schemaVersion\":7,\"stateSites\":[\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0\"]}, closedStoreExecution: {\"componentProgramId\":\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-114ac429b0ea0458\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {const $r3actDag0 = ((sharedInputs[0] * 0.001));const $r3actDag1 = ((sharedInputs[0] * 0.005));const $r3actDag2 = ((sharedInputs[0] * 0.01));for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[0] = ($r3actDag2 + varyingInputs[row * 1 + 0]);rowOutput[1] = $r3actDag1;rowOutput[2] = $r3actDag0;}}} });\nimport { createThreeNativeRoot } from \"file:///Volumes/Depot/Developer/r3act/src/three_host.ts\";\nimport { Scene, Mesh, type Object3D } from 'three';\nimport { Hud } from './hud.mjs';\n\nconst COUNT = 1024;\ntype Frame = Readonly<{ phase: number }>;\ntype MotionProps = { id: number; clock: StoreSource<Frame>; children?: RuntimeNode };\nconst controls: Array<((value: number) => void) | undefined> = [];\nlet activations = 0, retirements = 0;\nfunction Motion(props: MotionProps) {\n  const frame = __nativeUseAt(\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0\", props.clock);\n  const [offset, setOffset] = __nativeUseStateAt(\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0\", () => {\n    activations++; controls[props.id] = setOffset;\n    return () => { retirements++; controls[props.id] = undefined; };\n  });\n  return <group key=\"motion\" position-x={frame.phase * .01 + offset}\n    position-y={frame.phase * .005} rotation-z={frame.phase * .001}>\n    {props.children}\n  </group>;\n}\nfunction Game(props: { clock: StoreSource<Frame>; ids: readonly number[] }) {\n  return <group key=\"entities\" name=\"entities\">{props.ids.map(id =>\n    <group key={id} name={`entity-${id}`} position-x={(id % 32 - 15.5) * .3}\n      position-y={(Math.floor(id / 32) - 15.5) * .3}>\n      <Motion id={id} clock={props.clock}><mesh>\n        <boxGeometry args={[.12, .12, .12]} /><meshBasicMaterial color=\"orange\" />\n      </mesh></Motion>\n    </group>)}</group>;\n}\nconst check: (condition: unknown, message: string) => asserts condition = (condition, message) => {\n  if (!condition) throw new Error(message);\n};\n\nexport function runGameLifecycle(hud: ReturnType<typeof createDOMRoot>, readHud: () => number,\n  render?: (scene: Scene) => unknown) {\n  const clock = createStore<Frame>(storeRecord({ phase: 0 })), ticks = createStore(0);\n  const scene = new Scene(), game = createThreeNativeRoot(scene, {\n    rootOptions: { rootId: 'mounted-game-companion', scheduleCommit() {} },\n  });\n  let ids: readonly number[] = Object.freeze(Array.from({ length: COUNT }, (_, id) => id));\n  const tree = () => <Game clock={clock} ids={ids} />;\n  const resources = new Set<object>(), disposed = new Set<object>();\n  let disposalEvents = 0, phase = 0, draws = 0, coherentDraws = 0;\n  const offsets = new Map<number, number>();\n  const refs = new Map<number, readonly object[]>();\n  const object = (id: number) => scene.getObjectByName(`entity-${id}`)!;\n  const capture = (id: number) => {\n    const outer = object(id), motion = outer.children[0], mesh = motion.children[0] as Mesh;\n    check(mesh instanceof Mesh && !Array.isArray(mesh.material), 'mesh resource shape');\n    const ref = [outer, motion, mesh, mesh.geometry, mesh.material] as const;\n    for (const resource of [mesh.geometry, mesh.material]) if (!resources.has(resource)) {\n      resources.add(resource);\n      resource.addEventListener('dispose', () => { disposalEvents++; disposed.add(resource); });\n    }\n    return ref;\n  };\n  const verify = () => {\n    check(scene.getObjectByName('entities')!.children.length === ids.length, 'membership');\n    for (const id of ids) {\n      const actual = capture(id), previous = refs.get(id);\n      if (previous) check(actual.every((entry, index) => entry === previous[index]), `identity ${id}`);\n      const motion = actual[1] as Object3D;\n      check(Math.abs(motion.position.x - (phase * .01 + (offsets.get(id) ?? 0))) < 1e-10,\n        `position ${id}`);\n      check(Math.abs(motion.position.y - phase * .005) < 1e-10, `position-y ${id}`);\n      check(Math.abs(motion.rotation.z - phase * .001) < 1e-10, `rotation ${id}`);\n      refs.set(id, actual);\n    }\n  };\n  const loop = createNativeFrameLoop({ roots: [{ root: game.root, stores: [clock] }],\n    update() { clock.dispatch(() => storeRecord({ phase })); }, draw() { draws++; } });\n  let coherent: ReturnType<typeof createNativeFrameLoop> | undefined;\n  try {\n    hud.mount(jsx(Hud, { ticks })); game.root.mount(tree()); verify();\n    check(controls.filter(Boolean).length === COUNT, 'all controls mounted');\n    const saved = game.root.snapshot, savedBytes = JSON.stringify(saved);\n    for (const id of [0, 127, 1023]) { offsets.set(id, id + .5); controls[id]!(id + .5); }\n    check(game.root.flush(), 'sparse local publication'); verify();\n    for (const id of [0, 127, 1023]) { offsets.set(id, 0); controls[id]!(0); }\n    check(game.root.flush(), 'sparse reset');\n    for (phase = 1; phase <= 12; phase++) {\n      check(loop.advance(phase * 16).status === 'drawn', 'shared clock publication'); verify();\n      if (phase % 4 === 0) { ticks.dispatch(phase); check(hud.flush(), 'independent HUD'); }\n      check(readHud() === Math.floor(phase / 4) * 4, 'independent DOM cadence');\n    }\n    phase = 12;\n    const removed = [1, 512, 1022], retiredRefs = removed.map(id => refs.get(id)!);\n    ids = Object.freeze(ids.filter(id => !removed.includes(id)));\n    game.root.render(tree()); verify();\n    check(disposed.size === 6 && retirements === 3, 'removed resources/effects retired');\n    ids = Object.freeze([...ids].reverse()); game.root.render(tree()); verify();\n    for (const id of removed) { refs.delete(id); offsets.set(id, 0); }\n    ids = Object.freeze([...ids, ...removed]); game.root.render(tree()); verify();\n    removed.forEach((id, index) => check(refs.get(id)![0] !== retiredRefs[index][0], 'new incarnation'));\n    check(controls.filter(Boolean).length === COUNT, 'controls after reinsert');\n    coherent = createNativeFrameLoop({ roots: [\n      { root: game.root, stores: [clock] }, { root: hud, stores: [ticks] },\n    ], update() { clock.dispatch(() => storeRecord({ phase })); ticks.dispatch(phase); },\n    draw() { verify(); check(readHud() === phase, 'coherent DOM/Three cut'); coherentDraws++; } });\n    phase = 20;\n    check(coherent.advance(400).status === 'drawn', 'coherent group publication');\n    check(JSON.stringify(saved) === savedBytes, 'old accepted snapshot changed');\n    const rendering = render?.(scene);\n    check(draws === 12 && coherentDraws === 1, 'draw counts');\n    coherent.dispose(); loop.dispose(); game.dispose(); hud.dispose();\n    check(scene.children.length === 0, 'scene cleanup');\n    check(controls.filter(Boolean).length === 0 && activations === retirements, 'effect cleanup');\n    check(resources.size === 2054 && disposed.size === resources.size && disposalEvents === resources.size,\n      'exact resource disposal');\n    return { status: 'PASS', owners: COUNT, sparseOwners: 3, sharedFrames: draws,\n      coherentFrames: coherentDraws, independentHudCommits: 3, structuralEdits: 3,\n      resources: resources.size, disposals: disposalEvents, activations, retirements,\n      oldSnapshotImmutable: true, rendering };\n  } finally { coherent?.dispose(); loop.dispose(); game.dispose(); hud.dispose(); }\n}\n",
	"components": [{
		"name": "Game",
		"component_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Game",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "Motion",
		"component_site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0",
			"initial_value": "0"
		}],
		"effect_sites": [{ "site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0" }],
		"store_sites": [{
			"site_id": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0",
			"source_expression": "props.clock"
		}],
		"closedStoreHostProgram": {
			"componentProgramId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"effectSites": [".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#effect:0"],
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
							"value": .001
						}
					}]
				],
				"tag": "group"
			},
			"inputs": [{
				"paths": [["phase"]],
				"storeProp": "clock",
				"storeUseSiteId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#store:0"
			}],
			"moduleRevision": "native-v1-114ac429b0ea0458",
			"retainedChildProp": "children",
			"schemaVersion": 7,
			"stateSites": [".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion#state:0"]
		},
		"closedStoreExecution": {
			"componentProgramId": ".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#component:Motion",
			"kind": "owned-data",
			"moduleRevision": "native-v1-114ac429b0ea0458",
			"schemaVersion": 3
		},
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": [".cache/compiled-mounted-frame-e6cfd4be-ff22-4823-92ce-c7755dc85775/game.tsx#opaque-sink:1009"]
	}]
};
