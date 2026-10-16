import { createDOMRoot } from "../../../../src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, bindStatePropAt as __nativeBindStatePropAt } from "../../../../src/native_runtime_api.ts";
const __nativeNumericPrograms = [
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1120",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1135",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1156",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1804",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1819",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"]
	},
	{
		schemaVersion: 2,
		ownerProgramId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		sinkId: "src/browser/native_high_frequency_arm.tsx#numeric-sink:1840",
		sourceSites: ["src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0"]
	}
];
__nativeDefineComponent("src/browser/native_high_frequency_arm.tsx#component:NativeBoard", NativeBoard, { propOnlySites: [] });
__nativeDefineComponent("src/browser/native_high_frequency_arm.tsx#component:NativeRowA", NativeRowA, {
	propOnlySites: [
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"
	],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
		slots: [
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
				slot: 0
			},
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
				slot: 1
			},
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
				slot: 2
			}
		]
	}
});
__nativeDefineComponent("src/browser/native_high_frequency_arm.tsx#component:NativeRowB", NativeRowB, {
	propOnlySites: [
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
		"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"
	],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
		slots: [
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
				slot: 0
			},
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
				slot: 1
			},
			{
				siteId: "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
				slot: 2
			}
		]
	}
});
import { highFrequencyState } from "./high_frequency_contract";
function NativeRowA({ id, session }) {
	const [x, setX] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0", 0);
	const [y, setY] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1", 0);
	const [rotation, setRotation] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2", 0);
	__nativeUseEffectAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0", () => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.mounts++;
		session.setters.set(id, setter);
		return () => {
			session.cleanups++;
			if (session.setters.get(id) === setter) session.setters.delete(id);
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0", (x) => `${x}px`, __nativeNumericPrograms[0]),
			top: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1", (y) => `${y}px`, __nativeNumericPrograms[1]),
			transform: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[2])
		}
	});
}
function NativeRowB({ id, session }) {
	const [rotation, setRotation] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0", 0);
	const [x, setX] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1", 0);
	const [y, setY] = __nativeUseStateAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2", 0);
	__nativeUseEffectAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0", () => {
		const setter = (frame) => {
			const state = highFrequencyState(id, frame);
			setX(state.x);
			setY(state.y);
			setRotation(state.rotation);
		};
		session.mounts++;
		session.setters.set(id, setter);
		return () => {
			session.cleanups++;
			if (session.setters.get(id) === setter) session.setters.delete(id);
		};
	});
	return /* @__PURE__ */ __nativeJsx.jsx("i", {
		className: "row",
		"data-row-id": id,
		style: {
			left: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1", (x) => `${x}px`, __nativeNumericPrograms[3]),
			top: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2", (y) => `${y}px`, __nativeNumericPrograms[4]),
			transform: __nativeBindStatePropAt("src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0", (rotation) => `rotate(${rotation}deg)`, __nativeNumericPrograms[5])
		}
	});
}
function NativeBoard({ ids, session, programs }) {
	return /* @__PURE__ */ __nativeJsx.jsx("div", { className: "board" }, ids.map((id) => programs === "heterogeneous" && id % 2 === 1 ? /* @__PURE__ */ __nativeJsx.jsx(NativeRowB, {
		key: id,
		id,
		session
	}) : /* @__PURE__ */ __nativeJsx.jsx(NativeRowA, {
		key: id,
		id,
		session
	})));
}
export const createHighFrequencyNative = (container, ids, programs) => {
	const session = {
		setters: new Map(),
		mounts: 0,
		cleanups: 0
	};
	let root = createDOMRoot(container, { scheduleCommit: () => {} });
	let disposed = false;
	let staleSetters = [];
	const diagnostics = () => ({
		mounts: session.mounts,
		cleanups: session.cleanups,
		writers: session.setters.size
	});
	const controller = {
		mount() {
			if (disposed || !root) throw new Error("Cannot mount a disposed native arm");
			root.mount(/* @__PURE__ */ __nativeJsx.jsx(NativeBoard, {
				ids,
				session,
				programs
			}));
			root.flush();
			for (const setter of session.setters.values()) setter(0);
			root.flush();
		},
		step(frame, dirtyIds) {
			if (disposed || !root) throw new Error("Cannot step a disposed native arm");
			for (const id of dirtyIds) {
				const setter = session.setters.get(id);
				if (!setter) throw new Error(`Missing native row setter ${id}`);
				setter(frame);
			}
			root.flush();
		},
		diagnostics,
		dispose() {
			if (disposed) return;
			disposed = true;
			staleSetters = [...session.setters.values()];
			root?.dispose();
			root = null;
		},
		probeDeadSetters(frame) {
			let thrown = 0;
			for (const setter of staleSetters) {
				try {
					setter(frame);
				} catch {
					thrown++;
				}
			}
			return thrown;
		}
	};
	return controller;
};
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"source_file": "src/browser/native_high_frequency_arm.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "import {\n  createDOMRoot,\n  useEffect,\n  useState,\n} from \"../../../../src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"../../../../src/native_runtime_api.ts\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1120\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\"] }, { schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1135\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\"] }, { schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1156\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\"] }, { schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1804\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\"] }, { schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1819\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\"] }, { schemaVersion: 2, ownerProgramId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", sinkId: \"src/browser/native_high_frequency_arm.tsx#numeric-sink:1840\", sourceSites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\"] }] as const;\n__nativeDefineComponent(\"src/browser/native_high_frequency_arm.tsx#component:NativeBoard\", NativeBoard, { propOnlySites: [] });\n__nativeDefineComponent(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", NativeRowA, { propOnlySites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA\", slots: [{ siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", slot: 0 }, { siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", slot: 1 }, { siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", slot: 2 }] } });\n__nativeDefineComponent(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", NativeRowB, { propOnlySites: [\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB\", slots: [{ siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", slot: 0 }, { siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", slot: 1 }, { siteId: \"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", slot: 2 }] } });\nimport type {\n  HighFrequencyController,\n  HighFrequencyDiagnostics,\n  HighFrequencyFactory,\n  ProgramMix,\n} from \"./high_frequency_contract\";\nimport { highFrequencyState } from \"./high_frequency_contract\";\n\ntype FrameSetter = (frame: number) => void;\ntype Session = {\n  readonly setters: Map<number, FrameSetter>;\n  mounts: number;\n  cleanups: number;\n};\n\ntype RowProps = { id: number; session: Session };\n\nfunction NativeRowA({ id, session }: RowProps) {\n  const [x, setX] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", 0);\n  const [y, setY] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", 0);\n  const [rotation, setRotation] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", 0);\n  __nativeUseEffectAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0\", () => {\n    const setter: FrameSetter = (frame) => {\n      const state = highFrequencyState(id, frame);\n      setX(state.x);\n      setY(state.y);\n      setRotation(state.rotation);\n    };\n    session.mounts++;\n    session.setters.set(id, setter);\n    return () => {\n      session.cleanups++;\n      if (session.setters.get(id) === setter) session.setters.delete(id);\n    };\n  });\n  return <i className=\"row\" data-row-id={id} style={{ left: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0\", (x) => (`${x}px`), __nativeNumericPrograms[0]), top: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1\", (y) => (`${y}px`), __nativeNumericPrograms[1]), transform: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[2]) }} />;\n}\n\nfunction NativeRowB({ id, session }: RowProps) {\n  const [rotation, setRotation] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", 0);\n  const [x, setX] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", 0);\n  const [y, setY] = __nativeUseStateAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", 0);\n  __nativeUseEffectAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0\", () => {\n    const setter: FrameSetter = (frame) => {\n      const state = highFrequencyState(id, frame);\n      setX(state.x);\n      setY(state.y);\n      setRotation(state.rotation);\n    };\n    session.mounts++;\n    session.setters.set(id, setter);\n    return () => {\n      session.cleanups++;\n      if (session.setters.get(id) === setter) session.setters.delete(id);\n    };\n  });\n  return <i className=\"row\" data-row-id={id} style={{ left: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1\", (x) => (`${x}px`), __nativeNumericPrograms[3]), top: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2\", (y) => (`${y}px`), __nativeNumericPrograms[4]), transform: __nativeBindStatePropAt(\"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0\", (rotation) => (`rotate(${rotation}deg)`), __nativeNumericPrograms[5]) }} />;\n}\n\nfunction NativeBoard({ ids, session, programs }: { ids: readonly number[]; session: Session; programs: ProgramMix }) {\n  return (\n    <div className=\"board\">\n      {ids.map((id) => programs === \"heterogeneous\" && id % 2 === 1\n        ? <NativeRowB key={id} id={id} session={session} />\n        : <NativeRowA key={id} id={id} session={session} />)}\n    </div>\n  );\n}\n\nexport const createHighFrequencyNative: HighFrequencyFactory = (\n  container,\n  ids,\n  programs,\n) => {\n  const session: Session = { setters: new Map(), mounts: 0, cleanups: 0 };\n  let root: ReturnType<typeof createDOMRoot> | null = createDOMRoot(container, {\n    scheduleCommit: () => {},\n  });\n  let disposed = false;\n  let staleSetters: FrameSetter[] = [];\n  const diagnostics = (): HighFrequencyDiagnostics => ({\n    mounts: session.mounts,\n    cleanups: session.cleanups,\n    writers: session.setters.size,\n  });\n  const controller: HighFrequencyController = {\n    mount() {\n      if (disposed || !root) throw new Error(\"Cannot mount a disposed native arm\");\n      root.mount(<NativeBoard ids={ids} session={session} programs={programs} />);\n      root.flush();\n      for (const setter of session.setters.values()) setter(0);\n      root.flush();\n    },\n    step(frame, dirtyIds) {\n      if (disposed || !root) throw new Error(\"Cannot step a disposed native arm\");\n      for (const id of dirtyIds) {\n        const setter = session.setters.get(id);\n        if (!setter) throw new Error(`Missing native row setter ${id}`);\n        setter(frame);\n      }\n      root.flush();\n    },\n    diagnostics,\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      staleSetters = [...session.setters.values()];\n      root?.dispose();\n      root = null;\n    },\n    probeDeadSetters(frame) {\n      let thrown = 0;\n      for (const setter of staleSetters) {\n        try {\n          setter(frame);\n        } catch {\n          thrown++;\n        }\n      }\n      return thrown;\n    },\n  };\n  return controller;\n};\n",
	"components": [
		{
			"name": "NativeBoard",
			"component_site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeBoard",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "NativeRowA",
			"component_site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
			"prop_only_sites": [
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2"
			],
			"state_layout": {
				"schema_version": 1,
				"programId": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA",
				"slots": [
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
						"slot": 0
					},
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
						"slot": 1
					},
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
						"slot": 2
					}
				]
			},
			"host_leaf_output": true,
			"state_sites": [
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:0",
					"initial_value": "0"
				},
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:1",
					"initial_value": "0"
				},
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#state:2",
					"initial_value": "0"
				}
			],
			"effect_sites": [{ "site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowA#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		},
		{
			"name": "NativeRowB",
			"component_site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
			"prop_only_sites": [
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
				"src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2"
			],
			"state_layout": {
				"schema_version": 1,
				"programId": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB",
				"slots": [
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
						"slot": 0
					},
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
						"slot": 1
					},
					{
						"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
						"slot": 2
					}
				]
			},
			"host_leaf_output": true,
			"state_sites": [
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:0",
					"initial_value": "0"
				},
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:1",
					"initial_value": "0"
				},
				{
					"site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#state:2",
					"initial_value": "0"
				}
			],
			"effect_sites": [{ "site_id": "src/browser/native_high_frequency_arm.tsx#component:NativeRowB#effect:0" }],
			"store_sites": [],
			"collection_sites": []
		}
	]
};
import * as __nativeJsx from "../../../../src/native_runtime_api.ts";
