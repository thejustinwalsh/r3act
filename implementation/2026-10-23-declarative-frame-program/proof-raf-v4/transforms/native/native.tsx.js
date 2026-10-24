import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "native.tsx",
	"module_revision": "native-v1-a70381e174f8bfe0",
	"owners": [
		{
			"site_id": "native.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:CallbackProbe",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:Marker",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "native.tsx#component:Motion",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "native.tsx#component:CallbackProbe#state:0",
			"owner_site_id": "native.tsx#component:CallbackProbe",
			"kind": "state",
			"provenance": "tracked"
		},
		{
			"site_id": "native.tsx#component:Marker#frame:0",
			"owner_site_id": "native.tsx#component:Marker",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "native.tsx#component:Motion#frame:0",
			"owner_site_id": "native.tsx#component:Motion",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [{
		"site_id": "native.tsx#numeric-sink:821",
		"owner_site_id": "native.tsx#component:CallbackProbe",
		"source_sites": ["native.tsx#component:CallbackProbe#state:0"],
		"provenance": "closed",
		"equality": "object-is",
		"host_value": "scalar",
		"retention": "value",
		"execution": "compiled-binding"
	}],
	"operations": [{
		"site_id": "native.tsx#component:Marker#frame:0",
		"owner_site_id": "native.tsx#component:Marker",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}, {
		"site_id": "native.tsx#component:Motion#frame:0",
		"owner_site_id": "native.tsx#component:Motion",
		"kind": "use-store-or-resource",
		"provenance": "opaque",
		"source_sites": []
	}],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": { "native.tsx#component:CallbackProbe#state:0": ["native.tsx#numeric-sink:821"] },
		"execution_order": ["native.tsx#numeric-sink:821"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "native.tsx" && event.previousRevision === "native-v1-a70381e174f8bfe0" && event.previousInstance === "native-v1-a70381e174f8bfe0") __invalidateNativeSemanticPlan("native.tsx", "native-v1-a70381e174f8bfe0");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/host-three */
import { createNativeFrameLoop } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, bindStatePropAt as __nativeBindStatePropAt, useFrameAt as __nativeUseFrameAt } from "@r3act/core";
const __nativeNumericPrograms = [{
	schemaVersion: 2,
	ownerProgramId: "native.tsx#component:CallbackProbe",
	sinkId: "native.tsx#numeric-sink:821",
	closedExpression: {
		"index": 0,
		"kind": "input"
	},
	sourceSites: ["native.tsx#component:CallbackProbe#state:0"]
}];
const __nativeOwnerCutKernels = [{
	schemaVersion: 4,
	programId: "native.tsx#component:CallbackProbe",
	slotCount: 1,
	sinkIds: ["native.tsx#numeric-sink:821"],
	executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {
		let stagedCount = outputStart;
		for (let localIndex = 0; localIndex < changeCount; localIndex++) {
			const changeIndex = inputStart + localIndex;
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
		return stagedCount - outputStart;
	}
}];
__nativeDefineComponent("native.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("native.tsx#component:CallbackProbe", CallbackProbe, {
	propOnlySites: ["native.tsx#component:CallbackProbe#state:0"],
	hostLeafOutput: true,
	stateLayout: {
		schemaVersion: 1,
		programId: "native.tsx#component:CallbackProbe",
		moduleRevision: "native-v1-a70381e174f8bfe0",
		slots: [{
			siteId: "native.tsx#component:CallbackProbe#state:0",
			slot: 0
		}]
	},
	ownerUpdateProgram: __nativeOwnerCutKernels[0]
});
__nativeDefineComponent("native.tsx#component:Marker", Marker, {
	propOnlySites: [],
	hostLeafOutput: true
});
__nativeDefineComponent("native.tsx#component:Motion", Motion, {
	propOnlySites: [],
	closedStoreHostProgram: {
		"componentProgramId": "native.tsx#component:Motion",
		"effectSites": [],
		"host": {
			"child": null,
			"key": "motion",
			"props": [["rotation-y", {
				"kind": "binary",
				"left": {
					"kind": "binary",
					"left": {
						"kind": "binary",
						"left": {
							"index": 0,
							"kind": "input"
						},
						"operator": "%",
						"right": {
							"kind": "literal",
							"value": 1e3
						}
					},
					"operator": "/",
					"right": {
						"kind": "literal",
						"value": 1e3
					}
				},
				"operator": "*",
				"right": {
					"index": 1,
					"kind": "input"
				}
			}]],
			"tag": "group"
		},
		"inputs": [{
			"paths": [["timeMs"]],
			"sourceKind": "frameClock",
			"storeProp": "$frameClock",
			"storeUseSiteId": "native.tsx#component:Motion#frame:0"
		}],
		"moduleRevision": "native-v1-a70381e174f8bfe0",
		"propInputs": ["speed"],
		"retainedChildProp": "children",
		"schemaVersion": 8,
		"stateSites": []
	},
	closedStoreExecution: {
		"componentProgramId": "native.tsx#component:Motion",
		"kind": "owned-data",
		"moduleRevision": "native-v1-a70381e174f8bfe0",
		"schemaVersion": 3,
		"batchKernel": (sharedInputs, varyingInputs, outputs, rowCount) => {
			const $r3actDag0 = sharedInputs[0] % 1e3;
			const $r3actDag1 = $r3actDag0 / 1e3;
			for (let row = 0; row < rowCount; row++) {
				const rowOutput = outputs[row];
				rowOutput[0] = $r3actDag1 * varyingInputs[row * 1 + 0];
			}
		}
	}
});
import { createThreeNativeRoot } from "@r3act/host-three";
import { OBJECTS, createView, gridX, gridY, start, recordAcceptance } from "./frame";
function Motion(props) {
	const frame = __nativeUseFrameAt("native.tsx#component:Motion#frame:0");
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "motion",
		"rotation-y": frame.timeMs % 1e3 / 1e3 * props.speed
	}, props.children);
}
function Marker() {
	const frame = __nativeUseFrameAt("native.tsx#component:Marker#frame:0");
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "marker",
		name: "accepted-frame",
		"position-x": frame.timeMs
	});
}
function CallbackProbe() {
	const [position, setPosition] = __nativeUseStateAt("native.tsx#component:CallbackProbe#state:0", 0);
	__nativeUseFrameAt("native.tsx#component:CallbackProbe#frame:0", (frame) => setPosition((previous) => previous + frame.delta), [], { phase: "early" });
	return /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: "callback-probe",
		name: "callback-probe",
		"position-x": __nativeBindStatePropAt("native.tsx#component:CallbackProbe#state:0", (position) => position, __nativeNumericPrograms[0])
	});
}
function App() {
	return /* @__PURE__ */ __nativeJsx.jsx(__nativeJsx.Fragment, null, /* @__PURE__ */ __nativeJsx.jsx(Marker, null), proof ? /* @__PURE__ */ __nativeJsx.jsx(CallbackProbe, null) : null, /* @__PURE__ */ __nativeJsx.jsx("group", { name: "objects" }, Array.from({ length: OBJECTS }, (_, id) => /* @__PURE__ */ __nativeJsx.jsx("group", {
		key: id,
		name: `object-${id}`,
		"position-x": gridX(id),
		"position-y": gridY(id)
	}, /* @__PURE__ */ __nativeJsx.jsx(Motion, { speed: id % 4 + 1 }, /* @__PURE__ */ __nativeJsx.jsx("mesh", null, /* @__PURE__ */ __nativeJsx.jsx("boxGeometry", { args: [
		.12,
		.12,
		.12
	] }), /* @__PURE__ */ __nativeJsx.jsx("meshBasicMaterial", { color: "orange" })))))));
}
const proof = new URLSearchParams(location.search).get("proof") === "1";
const counters = {};
const view = createView(), host = createThreeNativeRoot(view.scene, proof ? { rootOptions: { profileCounter(frame) {
	for (const [name, count] of Object.entries(frame)) counters[name] = (counters[name] ?? 0) + count;
} } } : {});
host.root.mount(/* @__PURE__ */ __nativeJsx.jsx(App, null));
if (proof) for (const name of Object.keys(counters)) delete counters[name];
let drawCurrent = () => {}, expectedPosition = 0;
const loop = createNativeFrameLoop({
	declarative: true,
	roots: [{
		root: host.root,
		stores: []
	}],
	draw(frame) {
		recordAcceptance(frame.timeMs);
		drawCurrent();
	}
});
start(view, {
	step(time, _epoch, draw) {
		drawCurrent = draw;
		const result = loop.advance(time);
		if (result.status !== "drawn") throw result.error ?? new Error(`Native frame ${result.status}`);
		if (proof) {
			expectedPosition += result.frame.deltaMs / 1e3;
			const probe = view.scene.getObjectByName("callback-probe");
			if (!probe || Math.abs(probe.position.x - expectedPosition) > 1e-10) throw new Error(`Installed frame callback position mismatch ${probe?.position.x}/${expectedPosition}`);
		}
	},
	dispose() {
		const errors = [];
		try {
			loop.dispose();
		} catch (error) {
			errors.push(error);
		}
		try {
			host.dispose();
		} catch (error) {
			errors.push(error);
		}
		if (errors.length) throw new AggregateError(errors, "Native frame arm cleanup failed");
	},
	...proof ? { diagnostics() {
		const ownedDataVerifiedRows = counters["store.owned-data.verified-rows"] ?? 0;
		const ownedDataBatches = counters["store.owned-data.batches"] ?? 0;
		if (ownedDataVerifiedRows < OBJECTS || ownedDataBatches < 1) throw new Error(`Owned frame batch proof missing ${ownedDataVerifiedRows}/${ownedDataBatches}`);
		const componentRenders = counters["owner.component-renders"] ?? 0;
		if (componentRenders !== 0) throw new Error(`Scalar RAF reconstructed ${componentRenders} components`);
		return {
			ownedDataVerifiedRows,
			ownedDataBatches,
			componentRenders,
			callbackPosition: expectedPosition,
			ownedDataRows: counters["store.owned-data.rows"] ?? 0
		};
	} } : {}
});
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-a70381e174f8bfe0",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "native.tsx",
		"module_revision": "native-v1-a70381e174f8bfe0",
		"owners": [
			{
				"site_id": "native.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:CallbackProbe",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:Marker",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "native.tsx#component:Motion",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "native.tsx#component:CallbackProbe#state:0",
				"owner_site_id": "native.tsx#component:CallbackProbe",
				"kind": "state",
				"provenance": "tracked"
			},
			{
				"site_id": "native.tsx#component:Marker#frame:0",
				"owner_site_id": "native.tsx#component:Marker",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "native.tsx#component:Motion#frame:0",
				"owner_site_id": "native.tsx#component:Motion",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [{
			"site_id": "native.tsx#numeric-sink:821",
			"owner_site_id": "native.tsx#component:CallbackProbe",
			"source_sites": ["native.tsx#component:CallbackProbe#state:0"],
			"provenance": "closed",
			"equality": "object-is",
			"host_value": "scalar",
			"retention": "value",
			"execution": "compiled-binding"
		}],
		"operations": [{
			"site_id": "native.tsx#component:Marker#frame:0",
			"owner_site_id": "native.tsx#component:Marker",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}, {
			"site_id": "native.tsx#component:Motion#frame:0",
			"owner_site_id": "native.tsx#component:Motion",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		}],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": { "native.tsx#component:CallbackProbe#state:0": ["native.tsx#numeric-sink:821"] },
			"execution_order": ["native.tsx#numeric-sink:821"]
		}
	},
	"source_file": "native.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/host-three */\n// @native-ui\nimport {createNativeFrameLoop,useFrame,useState,type RuntimeNode} from '@r3act/core';\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt, useFrameAt as __nativeUseFrameAt } from \"@r3act/core\";\nconst __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"native.tsx#component:CallbackProbe\", sinkId: \"native.tsx#numeric-sink:821\", closedExpression: {\"index\":0,\"kind\":\"input\"}, sourceSites: [\"native.tsx#component:CallbackProbe#state:0\"] }] as const;\nconst __nativeOwnerCutKernels: readonly import(\"@r3act/core\").CompiledOwnerUpdateProgram[] = [{ schemaVersion: 4, programId: \"native.tsx#component:CallbackProbe\", slotCount: 1, sinkIds: [\"native.tsx#numeric-sink:821\"], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) { let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) { const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) { case 0: {if ((rowState.seenMask & 1) === 0) { rowState.seenMask |= 1; const next = (rowState.inputValues[0]); const sinkState = rowState.sinks[0]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) { stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = 0; stagedValues[stagedCount] = next; stagedCount++; } } break;} } } return stagedCount - outputStart; } }];\n__nativeDefineComponent(\"native.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"native.tsx#component:CallbackProbe\", CallbackProbe, { propOnlySites: [\"native.tsx#component:CallbackProbe#state:0\"], hostLeafOutput: true, stateLayout: { schemaVersion: 1, programId: \"native.tsx#component:CallbackProbe\", moduleRevision: \"native-v1-a70381e174f8bfe0\", slots: [{ siteId: \"native.tsx#component:CallbackProbe#state:0\", slot: 0 }] }, ownerUpdateProgram: __nativeOwnerCutKernels[0] });\n__nativeDefineComponent(\"native.tsx#component:Marker\", Marker, { propOnlySites: [], hostLeafOutput: true });\n__nativeDefineComponent(\"native.tsx#component:Motion\", Motion, { propOnlySites: [], closedStoreHostProgram: {\"componentProgramId\":\"native.tsx#component:Motion\",\"effectSites\":[],\"host\":{\"child\":null,\"key\":\"motion\",\"props\":[[\"rotation-y\",{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"kind\":\"binary\",\"left\":{\"index\":0,\"kind\":\"input\"},\"operator\":\"%\",\"right\":{\"kind\":\"literal\",\"value\":1000.0}},\"operator\":\"/\",\"right\":{\"kind\":\"literal\",\"value\":1000.0}},\"operator\":\"*\",\"right\":{\"index\":1,\"kind\":\"input\"}}]],\"tag\":\"group\"},\"inputs\":[{\"paths\":[[\"timeMs\"]],\"sourceKind\":\"frameClock\",\"storeProp\":\"$frameClock\",\"storeUseSiteId\":\"native.tsx#component:Motion#frame:0\"}],\"moduleRevision\":\"native-v1-a70381e174f8bfe0\",\"propInputs\":[\"speed\"],\"retainedChildProp\":\"children\",\"schemaVersion\":8,\"stateSites\":[]}, closedStoreExecution: {\"componentProgramId\":\"native.tsx#component:Motion\",\"kind\":\"owned-data\",\"moduleRevision\":\"native-v1-a70381e174f8bfe0\",\"schemaVersion\":3,\"batchKernel\":(sharedInputs, varyingInputs, outputs, rowCount) => {const $r3actDag0 = ((sharedInputs[0] % 1000.0));const $r3actDag1 = (($r3actDag0 / 1000.0));for (let row = 0; row < rowCount; row++) {const rowOutput = outputs[row];rowOutput[0] = ($r3actDag1 * varyingInputs[row * 1 + 0]);}}} });\nimport {createThreeNativeRoot} from '@r3act/host-three';\nimport {OBJECTS,createView,gridX,gridY,start,recordAcceptance} from './frame';\nfunction Motion(props:{speed:number;children?:RuntimeNode}) {\n  const frame=__nativeUseFrameAt(\"native.tsx#component:Motion#frame:0\");\n  return <group key=\"motion\" rotation-y={(frame.timeMs % 1000 / 1000)*props.speed}>{props.children}</group>;\n}\nfunction Marker(){const frame=__nativeUseFrameAt(\"native.tsx#component:Marker#frame:0\");return <group key=\"marker\" name=\"accepted-frame\" position-x={frame.timeMs}/>;}\nfunction CallbackProbe(){\n  const [position,setPosition]=__nativeUseStateAt(\"native.tsx#component:CallbackProbe#state:0\", 0);\n  __nativeUseFrameAt(\"native.tsx#component:CallbackProbe#frame:0\", frame=>setPosition(previous=>previous+frame.delta),[],{phase:'early'});\n  return <group key=\"callback-probe\" name=\"callback-probe\" position-x={__nativeBindStatePropAt(\"native.tsx#component:CallbackProbe#state:0\", (position) => (position), __nativeNumericPrograms[0])}/>;\n}\nfunction App(){return <><Marker/>{proof?<CallbackProbe/>:null}<group name=\"objects\">{Array.from({length:OBJECTS},(_,id)=><group key={id}\n  name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}><Motion speed={id%4+1}>\n  <mesh><boxGeometry args={[.12,.12,.12]}/><meshBasicMaterial color=\"orange\"/></mesh>\n  </Motion></group>)}</group></>;}\nconst proof=new URLSearchParams(location.search).get('proof')==='1';\nconst counters:Record<string,number>={};\nconst view=createView(),host=createThreeNativeRoot(view.scene,proof?{rootOptions:{\n  profileCounter(frame){for(const [name,count] of Object.entries(frame))\n    counters[name]=(counters[name]??0)+count;}\n}}:{});\nhost.root.mount(<App/>);\nif(proof)for(const name of Object.keys(counters))delete counters[name];\nlet drawCurrent=()=>{},expectedPosition=0;\nconst loop=createNativeFrameLoop({declarative:true,roots:[{root:host.root,stores:[]}],\n  draw(frame){recordAcceptance(frame.timeMs);drawCurrent();}});\nstart(view,{step(time,_epoch,draw){drawCurrent=draw;const result=loop.advance(time);\n  if(result.status!=='drawn')throw result.error??new Error(`Native frame ${result.status}`);\n  if(proof){expectedPosition+=result.frame.deltaMs/1000;\n    const probe=view.scene.getObjectByName('callback-probe');\n    if(!probe||Math.abs(probe.position.x-expectedPosition)>1e-10)\n      throw new Error(`Installed frame callback position mismatch ${probe?.position.x}/${expectedPosition}`);\n  }},\n  dispose(){const errors:unknown[]=[];\n    try{loop.dispose();}catch(error){errors.push(error);}\n    try{host.dispose();}catch(error){errors.push(error);}\n    if(errors.length)throw new AggregateError(errors,'Native frame arm cleanup failed');},\n  ...(proof?{diagnostics(){\n    const ownedDataVerifiedRows=counters['store.owned-data.verified-rows']??0;\n    const ownedDataBatches=counters['store.owned-data.batches']??0;\n    if(ownedDataVerifiedRows<OBJECTS||ownedDataBatches<1)\n      throw new Error(`Owned frame batch proof missing ${ownedDataVerifiedRows}/${ownedDataBatches}`);\n    const componentRenders=counters['owner.component-renders']??0;\n    if(componentRenders!==0)throw new Error(`Scalar RAF reconstructed ${componentRenders} components`);\n    return {ownedDataVerifiedRows,ownedDataBatches,componentRenders,callbackPosition:expectedPosition,\n      ownedDataRows:counters['store.owned-data.rows']??0};\n  }}:{})});\n",
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
			"name": "CallbackProbe",
			"component_site_id": "native.tsx#component:CallbackProbe",
			"prop_only_sites": ["native.tsx#component:CallbackProbe#state:0"],
			"state_layout": {
				"schema_version": 1,
				"programId": "native.tsx#component:CallbackProbe",
				"moduleRevision": "native-v1-a70381e174f8bfe0",
				"slots": [{
					"site_id": "native.tsx#component:CallbackProbe#state:0",
					"slot": 0
				}]
			},
			"host_leaf_output": true,
			"state_sites": [{
				"site_id": "native.tsx#component:CallbackProbe#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [{
				"sink_id": "native.tsx#numeric-sink:821",
				"source_sites": ["native.tsx#component:CallbackProbe#state:0"],
				"primitive_value": true
			}],
			"opaque_sinks": []
		},
		{
			"name": "Marker",
			"component_site_id": "native.tsx#component:Marker",
			"prop_only_sites": [],
			"host_leaf_output": true,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "native.tsx#component:Marker#frame:0",
				"source_expression": "$frameClock"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Motion",
			"component_site_id": "native.tsx#component:Motion",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "native.tsx#component:Motion#frame:0",
				"source_expression": "$frameClock"
			}],
			"closedStoreHostProgram": {
				"componentProgramId": "native.tsx#component:Motion",
				"effectSites": [],
				"host": {
					"child": null,
					"key": "motion",
					"props": [["rotation-y", {
						"kind": "binary",
						"left": {
							"kind": "binary",
							"left": {
								"kind": "binary",
								"left": {
									"index": 0,
									"kind": "input"
								},
								"operator": "%",
								"right": {
									"kind": "literal",
									"value": 1e3
								}
							},
							"operator": "/",
							"right": {
								"kind": "literal",
								"value": 1e3
							}
						},
						"operator": "*",
						"right": {
							"index": 1,
							"kind": "input"
						}
					}]],
					"tag": "group"
				},
				"inputs": [{
					"paths": [["timeMs"]],
					"sourceKind": "frameClock",
					"storeProp": "$frameClock",
					"storeUseSiteId": "native.tsx#component:Motion#frame:0"
				}],
				"moduleRevision": "native-v1-a70381e174f8bfe0",
				"propInputs": ["speed"],
				"retainedChildProp": "children",
				"schemaVersion": 8,
				"stateSites": []
			},
			"closedStoreExecution": {
				"componentProgramId": "native.tsx#component:Motion",
				"kind": "owned-data",
				"moduleRevision": "native-v1-a70381e174f8bfe0",
				"schemaVersion": 3
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
