import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "@r3act/core";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": "main.tsx",
	"module_revision": "native-v1-8fc67683b96e0548",
	"owners": [
		{
			"site_id": "main.tsx#component:App",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Old",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:OriginProbe",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Result",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": "main.tsx#component:Urgent",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": "main.tsx#component:App#store:0",
			"owner_site_id": "main.tsx#component:App",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:Result#store:0",
			"owner_site_id": "main.tsx#component:Result",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": "main.tsx#component:Urgent#store:0",
			"owner_site_id": "main.tsx#component:Urgent",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": "main.tsx#component:App#store:0",
			"owner_site_id": "main.tsx#component:App",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Old#effect:0",
			"owner_site_id": "main.tsx#component:Old",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Result#store:0",
			"owner_site_id": "main.tsx#component:Result",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Result#effect:0",
			"owner_site_id": "main.tsx#component:Result",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#component:Urgent#store:0",
			"owner_site_id": "main.tsx#component:Urgent",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": "main.tsx#async-task:load",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["$label"]
		},
		{
			"site_id": "main.tsx#async-task:urgent",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": []
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": ["main.tsx#async-task:load", "main.tsx#async-task:urgent"]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === "main.tsx" && event.previousRevision === "native-v1-8fc67683b96e0548" && event.previousInstance === "native-v1-8fc67683b96e0548") __invalidateNativeSemanticPlan("main.tsx", "native-v1-8fc67683b96e0548");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
import { NativeRootWorkQueue, NativeTaskTransitionQueue, Suspense, asyncTask, createStore, createWorld } from "@r3act/core";
import { defineComponent as __nativeDefineComponent, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "@r3act/core";
__nativeDefineComponent("main.tsx#component:App", App, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:Old", Old, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:OriginProbe", OriginProbe, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:Result", Result, { propOnlySites: [] });
__nativeDefineComponent("main.tsx#component:Urgent", Urgent, {
	propOnlySites: [],
	closedResourceHostProgram: {
		"componentProgramId": "main.tsx#component:Urgent",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "urgent",
			"props": [["data-urgent", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"moduleRevision": "native-v1-8fc67683b96e0548",
		"resourceProp": "resource",
		"resourceUseSiteId": "main.tsx#component:Urgent#store:0",
		"schemaVersion": 2
	},
	closedStoreHostProgram: {
		"componentProgramId": "main.tsx#component:Urgent",
		"host": {
			"children": [{
				"expression": {
					"index": 0,
					"kind": "input"
				},
				"kind": "text"
			}],
			"key": "urgent",
			"props": [["data-urgent", {
				"index": 0,
				"kind": "input"
			}]],
			"tag": "output"
		},
		"inputs": [{
			"storeProp": "resource",
			"storeUseSiteId": "main.tsx#component:Urgent#store:0"
		}],
		"moduleRevision": "native-v1-8fc67683b96e0548",
		"schemaVersion": 4
	}
});
import { createDOMRoot } from "@r3act/host-dom";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";
import { SceneApp } from "./scene";
import { use as readCustom, originCalls } from "./fake/native_runtime_api";
import { use as readSubstring, substringCalls } from "./substring_native_runtime_api";
function OriginProbe() {
	const value = `${readCustom("shared")}|${readSubstring("shared")}`;
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "origin",
		"data-origin": value
	}, value);
}
const shared = createStore("shared");
const deferred = () => {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {
		promise,
		resolve
	};
};
const providers = {
	A: deferred(),
	B: deferred(),
	C: deferred(),
	urgent: deferred()
};
const started = [], settled = [];
const loadTasks = [asyncTask("load", ["$label"], async (values) => {
	const label = values.get("$label");
	started.push(label);
	return await providers[label].promise;
})];
const urgentTasks = [asyncTask("urgent", [], async (_values) => {
	started.push("urgent");
	return await providers.urgent.promise;
})];
const trace = {
	mounts: {},
	cleanups: {}
};
const countMount = (label) => {
	trace.mounts[label] = (trace.mounts[label] ?? 0) + 1;
	return () => {
		trace.cleanups[label] = (trace.cleanups[label] ?? 0) + 1;
	};
};
let a = null;
let b = null;
let c = null;
let urgent = null;
function Result(props) {
	const value = __nativeUseAt("main.tsx#component:Result#store:0", props.resource);
	__nativeUseEffectAt("main.tsx#component:Result#effect:0", () => countMount(value));
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "result",
		"data-result": value,
		"data-request": props.label
	}, value);
}
function App(props) {
	const sharedValue = __nativeUseAt("main.tsx#component:App#store:0", shared);
	return /* @__PURE__ */ __nativeJsx.jsx("main", {
		key: "main",
		"data-shared": sharedValue
	}, /* @__PURE__ */ __nativeJsx.jsx(OriginProbe, { key: "origin-owner" }), /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
		fallback: /* @__PURE__ */ __nativeJsx.jsx("output", {
			key: "result",
			"data-result": "waiting",
			"data-request": props.label
		}, "waiting"),
		__nativeBoundarySite: "main.tsx#boundary:0"
	}, /* @__PURE__ */ __nativeJsx.jsx(Result, {
		key: "result-owner",
		resource: props.resource,
		label: props.label
	})));
}
function Old() {
	__nativeUseEffectAt("main.tsx#component:Old#effect:0", () => countMount("old"));
	return /* @__PURE__ */ __nativeJsx.jsx("main", {
		key: "main",
		"data-shared": "shared"
	}, /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "result",
		"data-result": "old",
		"data-request": "none"
	}, "old"), /* @__PURE__ */ __nativeJsx.jsx(OriginProbe, { key: "origin-owner" }));
}
function Urgent(props) {
	const value = __nativeUseAt("main.tsx#component:Urgent#store:0", props.resource);
	return /* @__PURE__ */ __nativeJsx.jsx("output", {
		key: "urgent",
		"data-urgent": value
	}, value);
}
export function mountReplacement(host, forkHost, urgentHost) {
	const world = createWorld(), scene = new Scene();
	const dom = createDOMRoot(host, {
		world,
		rootId: "replacement-dom"
	});
	const three = createThreeNativeRoot(scene, { rootOptions: {
		world,
		rootId: "replacement-three"
	} });
	const fork = createDOMRoot(forkHost, {
		world,
		rootId: "replacement-fork"
	});
	const urgentRoot = createDOMRoot(urgentHost, {
		world,
		rootId: "replacement-urgent"
	});
	const work = new NativeRootWorkQueue();
	const queue = new NativeTaskTransitionQueue({ queue: work });
	dom.mount(/* @__PURE__ */ __nativeJsx.jsx(Old, null));
	three.root.mount(/* @__PURE__ */ __nativeJsx.jsx(SceneApp, { label: "none" }));
	fork.mount(/* @__PURE__ */ __nativeJsx.jsx(Old, null));
	const roots = (label) => [
		{
			root: dom,
			buildTree: (execution) => /* @__PURE__ */ __nativeJsx.jsx(App, {
				resource: execution.resource("load"),
				label
			})
		},
		{
			root: three.root,
			buildTree: (execution) => /* @__PURE__ */ __nativeJsx.jsx(SceneApp, {
				resource: execution.resource("load"),
				label
			})
		},
		{
			root: fork,
			buildTree: (execution) => /* @__PURE__ */ __nativeJsx.jsx(App, {
				resource: execution.resource("load"),
				label
			})
		}
	];
	const submit = (label, onSettled) => queue.enqueue(loadTasks, roots(label), {
		id: label,
		key: "route",
		inputs: { "$label": label },
		onSettled: (resolution) => {
			settled.push(`${label}:${resolution.status}`);
			onSettled?.(resolution.status);
		}
	});
	a = submit("A", (status) => {
		if (status === "cancelled") c = submit("C");
	});
	let disposed = false;
	const snapshot = () => ({
		origin: host.querySelector("[data-origin]")?.getAttribute("data-origin") ?? null,
		originCalls: originCalls(),
		substringCalls: substringCalls(),
		request: c ? "C" : b ? "B" : "A",
		accepted: host.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
		fork: forkHost.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
		scene: scene.children[0]?.children[0]?.name ?? null,
		urgent: urgentHost.querySelector("[data-urgent]")?.getAttribute("data-urgent") ?? null,
		statuses: {
			A: a?.status ?? null,
			B: b?.status ?? null,
			C: c?.status ?? null,
			urgent: urgent?.status ?? null
		},
		started: [...started],
		settled: [...settled],
		mounts: { ...trace.mounts },
		cleanups: { ...trace.cleanups },
		dom: dom.diagnostics(),
		three: three.root.diagnostics(),
		forkDiagnostics: fork.diagnostics(),
		urgentDiagnostics: urgentRoot.diagnostics(),
		threeHost: three.host.diagnostics,
		disposed
	});
	return {
		snapshot,
		replace() {
			b = submit("B");
			return b.resolution.status;
		},
		startUrgent() {
			urgent = queue.enqueue(urgentTasks, [{
				root: urgentRoot,
				buildTree: (execution) => /* @__PURE__ */ __nativeJsx.jsx(Suspense, {
					fallback: /* @__PURE__ */ __nativeJsx.jsx("output", {
						key: "urgent",
						"data-urgent": "waiting"
					}, "waiting"),
					__nativeBoundarySite: "main.tsx#boundary:1"
				}, /* @__PURE__ */ __nativeJsx.jsx(Urgent, {
					key: "urgent-owner",
					resource: execution.resource("urgent")
				}))
			}], {
				id: "urgent",
				key: "independent",
				onSettled: (resolution) => settled.push(`urgent:${resolution.status}`)
			});
		},
		settle(label, value) {
			providers[label].resolve(value);
		},
		async wait(label) {
			return await {
				A: a,
				B: b,
				C: c,
				urgent
			}[label]?.completion;
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			queue.dispose();
			work.dispose();
			dom.dispose();
			three.dispose();
			fork.dispose();
			urgentRoot.dispose();
		}
	};
}
window.replacementProof = mountReplacement(document.getElementById("app"), document.getElementById("fork"), document.getElementById("urgent"));
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-8fc67683b96e0548",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": "main.tsx",
		"module_revision": "native-v1-8fc67683b96e0548",
		"owners": [
			{
				"site_id": "main.tsx#component:App",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Old",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:OriginProbe",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Result",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": "main.tsx#component:Urgent",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": "main.tsx#component:App#store:0",
				"owner_site_id": "main.tsx#component:App",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:Result#store:0",
				"owner_site_id": "main.tsx#component:Result",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": "main.tsx#component:Urgent#store:0",
				"owner_site_id": "main.tsx#component:Urgent",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": "main.tsx#component:App#store:0",
				"owner_site_id": "main.tsx#component:App",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Old#effect:0",
				"owner_site_id": "main.tsx#component:Old",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Result#store:0",
				"owner_site_id": "main.tsx#component:Result",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Result#effect:0",
				"owner_site_id": "main.tsx#component:Result",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#component:Urgent#store:0",
				"owner_site_id": "main.tsx#component:Urgent",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": "main.tsx#async-task:load",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["$label"]
			},
			{
				"site_id": "main.tsx#async-task:urgent",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": []
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": ["main.tsx#async-task:load", "main.tsx#async-task:urgent"]
		}
	},
	"source_file": "main.tsx",
	"helper_module": "@r3act/core",
	"tasks": [{
		"id": "load",
		"site_id": "main.tsx#async-task:load",
		"depends_on": ["$label"],
		"span": {
			"start": 1226,
			"end": 1387
		}
	}, {
		"id": "urgent",
		"site_id": "main.tsx#async-task:urgent",
		"depends_on": [],
		"span": {
			"start": 1420,
			"end": 1530
		}
	}],
	"task_order": [0, 1],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { NativeRootWorkQueue, NativeTaskTransitionQueue, Suspense, asyncTask, createStore, createWorld, use, useEffect } from \"@r3act/core\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"@r3act/core\";\n__nativeDefineComponent(\"main.tsx#component:App\", App, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Old\", Old, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:OriginProbe\", OriginProbe, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Result\", Result, { propOnlySites: [] });\n__nativeDefineComponent(\"main.tsx#component:Urgent\", Urgent, { propOnlySites: [], closedResourceHostProgram: {\"componentProgramId\":\"main.tsx#component:Urgent\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"urgent\",\"props\":[[\"data-urgent\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"moduleRevision\":\"native-v1-8fc67683b96e0548\",\"resourceProp\":\"resource\",\"resourceUseSiteId\":\"main.tsx#component:Urgent#store:0\",\"schemaVersion\":2}, closedStoreHostProgram: {\"componentProgramId\":\"main.tsx#component:Urgent\",\"host\":{\"children\":[{\"expression\":{\"index\":0,\"kind\":\"input\"},\"kind\":\"text\"}],\"key\":\"urgent\",\"props\":[[\"data-urgent\",{\"index\":0,\"kind\":\"input\"}]],\"tag\":\"output\"},\"inputs\":[{\"storeProp\":\"resource\",\"storeUseSiteId\":\"main.tsx#component:Urgent#store:0\"}],\"moduleRevision\":\"native-v1-8fc67683b96e0548\",\"schemaVersion\":4} });\nimport type { AsyncResource, NativeTaskTransitionHandle } from \"@r3act/core\";\nimport { createDOMRoot } from \"@r3act/host-dom\";\nimport { createThreeNativeRoot } from \"@r3act/host-three\";\nimport { Scene } from \"three\";\nimport { SceneApp } from \"./scene\";\nimport { use as readCustom, originCalls } from \"./fake/native_runtime_api\";\nimport { use as readSubstring, substringCalls } from \"./substring_native_runtime_api\";\n\nfunction OriginProbe() {\n  const value = `${readCustom(\"shared\")}|${readSubstring(\"shared\")}`;\n  return <output key=\"origin\" data-origin={value}>{value}</output>;\n}\n\nconst shared = createStore(\"shared\");\ntype Deferred = { promise: Promise<string>; resolve(value: string): void };\nconst deferred = (): Deferred => {\n  let resolve!: (value: string) => void;\n  const promise = new Promise<string>(done => { resolve = done; });\n  return { promise, resolve };\n};\nconst providers = { A: deferred(), B: deferred(), C: deferred(), urgent: deferred() };\nconst started: string[] = [], settled: string[] = [];\nconst loadTasks = [asyncTask(\"load\", async (values) => {\n  const label = values.get(\"$label\") as \"A\" | \"B\" | \"C\";\n  started.push(label);\n  return await providers[label].promise;\n})] as const;\nconst urgentTasks = [asyncTask(\"urgent\", async (_values) => {\n  started.push(\"urgent\");\n  return await providers.urgent.promise;\n})] as const;\nconst trace = { mounts: {} as Record<string, number>, cleanups: {} as Record<string, number> };\nconst countMount = (label: string) => {\n  trace.mounts[label] = (trace.mounts[label] ?? 0) + 1;\n  return () => { trace.cleanups[label] = (trace.cleanups[label] ?? 0) + 1; };\n};\nlet a: NativeTaskTransitionHandle | null = null;\nlet b: NativeTaskTransitionHandle | null = null;\nlet c: NativeTaskTransitionHandle | null = null;\nlet urgent: NativeTaskTransitionHandle | null = null;\n\nfunction Result(props: { resource: AsyncResource<string>; label: string }) {\n  const value = __nativeUseAt(\"main.tsx#component:Result#store:0\", props.resource);\n  __nativeUseEffectAt(\"main.tsx#component:Result#effect:0\", () => countMount(value));\n  return <output key=\"result\" data-result={value} data-request={props.label}>{value}</output>;\n}\nfunction App(props: { resource: AsyncResource<string>; label: string }) {\n  const sharedValue = __nativeUseAt(\"main.tsx#component:App#store:0\", shared);\n  return <main key=\"main\" data-shared={sharedValue}>\n    <OriginProbe key=\"origin-owner\" />\n    <Suspense fallback={<output key=\"result\" data-result=\"waiting\" data-request={props.label}>waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:0\">\n      <Result key=\"result-owner\" resource={props.resource} label={props.label} />\n    </Suspense>\n  </main>;\n}\nfunction Old() {\n  __nativeUseEffectAt(\"main.tsx#component:Old#effect:0\", () => countMount(\"old\"));\n  return <main key=\"main\" data-shared=\"shared\"><output key=\"result\" data-result=\"old\" data-request=\"none\">old</output><OriginProbe key=\"origin-owner\" /></main>;\n}\nfunction Urgent(props: { resource: AsyncResource<string> }) {\n  const value = __nativeUseAt(\"main.tsx#component:Urgent#store:0\", props.resource);\n  return <output key=\"urgent\" data-urgent={value}>{value}</output>;\n}\n\nexport function mountReplacement(host: HTMLElement, forkHost: HTMLElement, urgentHost: HTMLElement) {\n  const world = createWorld(), scene = new Scene();\n  const dom = createDOMRoot(host, { world, rootId: \"replacement-dom\" });\n  const three = createThreeNativeRoot(scene, { rootOptions: { world, rootId: \"replacement-three\" } });\n  const fork = createDOMRoot(forkHost, { world, rootId: \"replacement-fork\" });\n  const urgentRoot = createDOMRoot(urgentHost, { world, rootId: \"replacement-urgent\" });\n  const work = new NativeRootWorkQueue();\n  const queue = new NativeTaskTransitionQueue({ queue: work });\n  dom.mount(<Old />);\n  three.root.mount(<SceneApp label=\"none\" />);\n  fork.mount(<Old />);\n  const roots = (label: \"A\" | \"B\" | \"C\") => [\n    { root: dom, buildTree: (execution: any) => <App resource={execution.resource(\"load\")} label={label} /> },\n    { root: three.root, buildTree: (execution: any) => <SceneApp resource={execution.resource(\"load\")} label={label} /> },\n    { root: fork, buildTree: (execution: any) => <App resource={execution.resource(\"load\")} label={label} /> },\n  ] as const;\n  const submit = (label: \"A\" | \"B\" | \"C\", onSettled?: (status: string) => void) => queue.enqueue(\n    loadTasks,\n    roots(label),\n    { id: label, key: \"route\", inputs: { \"$label\": label }, onSettled: resolution => {\n      settled.push(`${label}:${resolution.status}`);\n      onSettled?.(resolution.status);\n    } },\n  );\n  a = submit(\"A\", status => { if (status === \"cancelled\") c = submit(\"C\"); });\n  let disposed = false;\n  const snapshot = () => ({\n    origin: host.querySelector(\"[data-origin]\")?.getAttribute(\"data-origin\") ?? null,\n    originCalls: originCalls(), substringCalls: substringCalls(),\n    request: c ? \"C\" : b ? \"B\" : \"A\",\n    accepted: host.querySelector(\"[data-result]\")?.getAttribute(\"data-result\") ?? null,\n    fork: forkHost.querySelector(\"[data-result]\")?.getAttribute(\"data-result\") ?? null,\n    scene: scene.children[0]?.children[0]?.name ?? null,\n    urgent: urgentHost.querySelector(\"[data-urgent]\")?.getAttribute(\"data-urgent\") ?? null,\n    statuses: { A: a?.status ?? null, B: b?.status ?? null, C: c?.status ?? null, urgent: urgent?.status ?? null },\n    started: [...started], settled: [...settled], mounts: { ...trace.mounts }, cleanups: { ...trace.cleanups },\n    dom: dom.diagnostics(), three: three.root.diagnostics(), forkDiagnostics: fork.diagnostics(),\n    urgentDiagnostics: urgentRoot.diagnostics(), threeHost: three.host.diagnostics, disposed,\n  });\n  return {\n    snapshot,\n    replace() { b = submit(\"B\"); return b.resolution.status; },\n    startUrgent() {\n      urgent = queue.enqueue(urgentTasks, [{ root: urgentRoot, buildTree: (execution: any) =>\n        <Suspense fallback={<output key=\"urgent\" data-urgent=\"waiting\">waiting</output>} __nativeBoundarySite=\"main.tsx#boundary:1\">\n          <Urgent key=\"urgent-owner\" resource={execution.resource(\"urgent\")} />\n        </Suspense> }], { id: \"urgent\", key: \"independent\", onSettled: resolution =>\n        settled.push(`urgent:${resolution.status}`) });\n    },\n    settle(label: keyof typeof providers, value: string) { providers[label].resolve(value); },\n    async wait(label: \"A\" | \"B\" | \"C\" | \"urgent\") {\n      return await ({ A: a, B: b, C: c, urgent })[label]?.completion;\n    },\n    dispose() {\n      if (disposed) return;\n      disposed = true;\n      queue.dispose(); work.dispose(); dom.dispose(); three.dispose(); fork.dispose(); urgentRoot.dispose();\n    },\n  };\n}\n\n(window as Window & { replacementProof?: ReturnType<typeof mountReplacement> }).replacementProof =\n  mountReplacement(document.getElementById(\"app\")!, document.getElementById(\"fork\")!, document.getElementById(\"urgent\")!);\n",
	"components": [
		{
			"name": "App",
			"component_site_id": "main.tsx#component:App",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:App#store:0",
				"source_expression": "shared"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Old",
			"component_site_id": "main.tsx#component:Old",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": "main.tsx#component:Old#effect:0" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "OriginProbe",
			"component_site_id": "main.tsx#component:OriginProbe",
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
			"name": "Result",
			"component_site_id": "main.tsx#component:Result",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": "main.tsx#component:Result#effect:0" }],
			"store_sites": [{
				"site_id": "main.tsx#component:Result#store:0",
				"source_expression": "props.resource"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "Urgent",
			"component_site_id": "main.tsx#component:Urgent",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": "main.tsx#component:Urgent#store:0",
				"source_expression": "props.resource"
			}],
			"closedResourceHostProgram": {
				"componentProgramId": "main.tsx#component:Urgent",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "urgent",
					"props": [["data-urgent", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"moduleRevision": "native-v1-8fc67683b96e0548",
				"resourceProp": "resource",
				"resourceUseSiteId": "main.tsx#component:Urgent#store:0",
				"schemaVersion": 2
			},
			"closedStoreHostProgram": {
				"componentProgramId": "main.tsx#component:Urgent",
				"host": {
					"children": [{
						"expression": {
							"index": 0,
							"kind": "input"
						},
						"kind": "text"
					}],
					"key": "urgent",
					"props": [["data-urgent", {
						"index": 0,
						"kind": "input"
					}]],
					"tag": "output"
				},
				"inputs": [{
					"storeProp": "resource",
					"storeUseSiteId": "main.tsx#component:Urgent#store:0"
				}],
				"moduleRevision": "native-v1-8fc67683b96e0548",
				"schemaVersion": 4
			},
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		}
	]
};
import * as __nativeJsx from "@r3act/core";
