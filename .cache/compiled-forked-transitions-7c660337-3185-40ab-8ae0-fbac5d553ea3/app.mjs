import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx",
	"module_revision": "native-v1-9d94df1d1227cb12",
	"owners": [{
		"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
		"repeated_scope": "runtime-keyed-owner"
	}, {
		"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
		"repeated_scope": "runtime-keyed-owner"
	}],
	"sources": [
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
			"kind": "use-input",
			"provenance": "opaque"
		}
	],
	"sinks": [],
	"operations": [
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#effect:0",
			"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:detail",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["$query", "$request"]
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:catalog",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["$request"]
		},
		{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:panel",
			"owner_site_id": null,
			"kind": "async-task",
			"provenance": "opaque",
			"source_sites": ["catalog", "detail"]
		}
	],
	"graph": {
		"coverage": "proven-sinks-only",
		"source_to_sinks": {},
		"execution_order": [
			".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:detail",
			".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:catalog",
			".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:panel"
		]
	}
});
if (import.meta.hot) {
	const __onNativeModuleRevision = (event) => {
		if (event?.sourceFile === ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx" && event.previousRevision === "native-v1-9d94df1d1227cb12" && event.previousInstance === "native-v1-9d94df1d1227cb12") __invalidateNativeSemanticPlan(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx", "native-v1-9d94df1d1227cb12");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
// @native-ui
import { asyncTask, Suspense } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__nativeDefineComponent(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp", DomApp, { propOnlySites: [] });
__nativeDefineComponent(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result", Result, { propOnlySites: [] });
export const tasks = [
	asyncTask("detail", ["$query", "$request"], async (values, signal) => {
		const query = String(values.get("$query"));
		const request = values.get("$request");
		return {
			query,
			detail: await request.load(query, signal)
		};
	}),
	asyncTask("catalog", ["$request"], async (values) => {
		const request = values.get("$request");
		return request.catalog;
	}),
	asyncTask("panel", ["catalog", "detail"], async (values) => {
		const detail = values.get("detail");
		const catalog = values.get("catalog");
		return {
			...detail,
			catalog
		};
	})
];
export function Result(props) {
	const panel = __nativeUseAt(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0", props.resource);
	__nativeUseEffectAt(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#effect:0", () => {
		props.life.starts++;
		return () => {
			props.life.cleanups++;
		};
	});
	return /* @__PURE__ */ jsx("output", {
		key: "result",
		"data-result": panel.query,
		"data-detail": panel.detail,
		"data-pending": props.requestedQuery === panel.query ? undefined : "detail"
	}, panel.query, ": ", panel.detail, " · ", panel.catalog);
}
export function DomApp(props) {
	const query = __nativeUseAt(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0", props.query);
	const urgent = __nativeUseAt(".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1", props.urgent);
	return /* @__PURE__ */ jsx("section", { "data-root": props.lane }, /* @__PURE__ */ jsx("h2", null, props.lane === "primary" ? "Workspace" : "Forked inspector"), /* @__PURE__ */ jsx("output", { "data-query": query }, query), /* @__PURE__ */ jsx("output", { "data-urgent": urgent }, urgent), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("output", {
			key: "result",
			"data-pending": "startup"
		}, "Loading"),
		error: (reason) => /* @__PURE__ */ jsx("output", {
			key: "result",
			"data-error": String(reason)
		}, "Load failed"),
		__nativeBoundarySite: ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(Result, {
		resource: props.resource,
		requestedQuery: query,
		life: props.life
	})));
}
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-9d94df1d1227cb12",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx",
		"module_revision": "native-v1-9d94df1d1227cb12",
		"owners": [{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
			"repeated_scope": "runtime-keyed-owner"
		}, {
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
			"repeated_scope": "runtime-keyed-owner"
		}],
		"sources": [
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
				"kind": "use-input",
				"provenance": "opaque"
			}
		],
		"sinks": [],
		"operations": [
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#effect:0",
				"owner_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:detail",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["$query", "$request"]
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:catalog",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["$request"]
			},
			{
				"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:panel",
				"owner_site_id": null,
				"kind": "async-task",
				"provenance": "opaque",
				"source_sites": ["catalog", "detail"]
			}
		],
		"graph": {
			"coverage": "proven-sinks-only",
			"source_to_sinks": {},
			"execution_order": [
				".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:detail",
				".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:catalog",
				".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:panel"
			]
		}
	},
	"source_file": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx",
	"helper_module": "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts",
	"tasks": [
		{
			"id": "detail",
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:detail",
			"depends_on": ["$query", "$request"],
			"span": {
				"start": 567,
				"end": 787
			}
		},
		{
			"id": "catalog",
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:catalog",
			"depends_on": ["$request"],
			"span": {
				"start": 791,
				"end": 919
			}
		},
		{
			"id": "panel",
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#async-task:panel",
			"depends_on": ["catalog", "detail"],
			"span": {
				"start": 923,
				"end": 1148
			}
		}
	],
	"task_order": [
		0,
		1,
		2
	],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { asyncTask, Suspense, use, useEffect } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n__nativeDefineComponent(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp\", DomApp, { propOnlySites: [] });\n__nativeDefineComponent(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result\", Result, { propOnlySites: [] });\nimport type { AsyncResource, StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n\nexport type Panel = Readonly<{ query: string; detail: string; catalog: string }>;\nexport type Request = Readonly<{\n  load(query: string, signal: AbortSignal): Promise<string>;\n  catalog: string;\n}>;\nexport type Life = { starts: number; cleanups: number };\n\nexport const tasks = [\n  asyncTask(\"detail\", async (values, signal) => {\n    const query = String(values.get(\"$query\"));\n    const request = values.get(\"$request\") as Request;\n    return { query, detail: await request.load(query, signal) };\n  }),\n  asyncTask(\"catalog\", async (values) => {\n    const request = values.get(\"$request\") as Request;\n    return request.catalog;\n  }),\n  asyncTask(\"panel\", async (values) => {\n    const detail = values.get(\"detail\") as { query: string; detail: string };\n    const catalog = values.get(\"catalog\") as string;\n    return { ...detail, catalog } satisfies Panel;\n  }),\n] as const;\n\nexport function Result(props: { resource: AsyncResource<Panel>; requestedQuery: string; life: Life }) {\n  const panel = __nativeUseAt(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0\", props.resource);\n  __nativeUseEffectAt(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#effect:0\", () => {\n    props.life.starts++;\n    return () => { props.life.cleanups++; };\n  });\n  return <output key=\"result\" data-result={panel.query} data-detail={panel.detail}\n    data-pending={props.requestedQuery === panel.query ? undefined : \"detail\"}>\n    {panel.query}: {panel.detail} · {panel.catalog}\n  </output>;\n}\n\nexport function DomApp(props: {\n  lane: \"primary\" | \"fork\";\n  query: StoreSource<string>;\n  urgent: StoreSource<number>;\n  resource: AsyncResource<Panel>;\n  life: Life;\n}) {\n  const query = __nativeUseAt(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0\", props.query);\n  const urgent = __nativeUseAt(\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1\", props.urgent);\n  return <section data-root={props.lane}>\n    <h2>{props.lane === \"primary\" ? \"Workspace\" : \"Forked inspector\"}</h2>\n    <output data-query={query}>{query}</output>\n    <output data-urgent={urgent}>{urgent}</output>\n    <Suspense fallback={<output key=\"result\" data-pending=\"startup\">Loading</output>}\n      error={(reason: unknown) => <output key=\"result\" data-error={String(reason)}>Load failed</output>} __nativeBoundarySite=\".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#boundary:0\">\n      <Result resource={props.resource} requestedQuery={query} life={props.life} />\n    </Suspense>\n  </section>;\n}\n",
	"components": [{
		"name": "DomApp",
		"component_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [],
		"store_sites": [{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:0",
			"source_expression": "props.query"
		}, {
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:DomApp#store:1",
			"source_expression": "props.urgent"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}, {
		"name": "Result",
		"component_site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result",
		"prop_only_sites": [],
		"host_leaf_output": false,
		"state_sites": [],
		"effect_sites": [{ "site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#effect:0" }],
		"store_sites": [{
			"site_id": ".cache/compiled-forked-transitions-7c660337-3185-40ab-8ae0-fbac5d553ea3/app.tsx#component:Result#store:0",
			"source_expression": "props.resource"
		}],
		"collection_sites": [],
		"numeric_sinks": [],
		"opaque_sinks": []
	}]
};
