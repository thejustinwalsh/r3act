import { jsx, Fragment } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { registerCompiledSemanticPlan as __registerNativeSemanticPlan, invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
__registerNativeSemanticPlan({
	"schema_version": 1,
	"source_file": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx",
	"module_revision": "native-v1-7d5d580db1b00922",
	"owners": [
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowBadge",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
			"repeated_scope": "runtime-keyed-owner"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
			"repeated_scope": "runtime-keyed-owner"
		}
	],
	"sources": [
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
			"kind": "use-input",
			"provenance": "opaque"
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#state:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
			"kind": "state",
			"provenance": "tracked"
		}
	],
	"sinks": [{
		"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#opaque-sink:1264",
		"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
		"source_sites": [],
		"provenance": "opaque",
		"equality": "adapter-declared",
		"host_value": "adapter-declared",
		"retention": "adapter-declared",
		"execution": "generic"
	}],
	"operations": [
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
			"kind": "use-store-or-resource",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#effect:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:0",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
			"kind": "activation-effect",
			"provenance": "opaque",
			"source_sites": []
		},
		{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:1",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
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
		if (event?.sourceFile === ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx" && event.previousRevision === "native-v1-7d5d580db1b00922" && event.previousInstance === "native-v1-7d5d580db1b00922") __invalidateNativeSemanticPlan(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx", "native-v1-7d5d580db1b00922");
	};
	import.meta.hot.on("r3act:invalidate-native-module", __onNativeModuleRevision);
	import.meta.hot.dispose(() => import.meta.hot?.off("r3act:invalidate-native-module", __onNativeModuleRevision));
}
/** @jsxImportSource @r3act/core */
// @native-ui
import { Suspense } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useAt as __nativeUseAt } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
// @ts-expect-error Lexical arguments is intentionally absent in this ES module.
export const ArrowBadge = __nativeDefineComponent(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowBadge", { ArrowBadge: (props) => /* @__PURE__ */ jsx("strong", {
	"data-badge": props.stage,
	"data-lexical-arguments": typeof arguments,
	"data-lexical-this": typeof this
}, props.stage) }.ArrowBadge, { propOnlySites: [] });
export const ArrowRow = __nativeDefineComponent(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow", { ArrowRow: (props) => {
	const [count, setCount] = __nativeUseStateAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#state:0", 0);
	__nativeUseEffectAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:0", () => {
		props.life.mounts++;
		return () => {
			props.life.cleanups++;
		};
	});
	if (count % 2 === 1) __nativeUseEffectAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:1", () => {
		props.life.conditionalMounts++;
		return () => {
			props.life.conditionalCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("li", {
		key: props.id,
		"data-row": props.id,
		"data-count": count
	}, /* @__PURE__ */ jsx("button", {
		ref: props.rowRef,
		"data-click": props.id,
		onClick: () => setCount((value) => value + 1)
	}, props.id, ": ", count));
} }.ArrowRow, { propOnlySites: [] });
export const ArrowResult = __nativeDefineComponent(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult", { ArrowResult: (props) => {
	const panel = __nativeUseAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0", props.resource);
	__nativeUseEffectAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#effect:0", () => {
		props.life.resultMounts++;
		return () => {
			props.life.resultCleanups++;
		};
	});
	return /* @__PURE__ */ jsx("output", {
		key: "result",
		"data-result": panel.stage,
		"data-detail": panel.detail
	}, panel.stage, ": ", panel.detail);
} }.ArrowResult, { propOnlySites: [] });
export const ArrowApp = __nativeDefineComponent(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp", { ArrowApp: (props) => {
	const stage = __nativeUseAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0", props.stage);
	const urgent = __nativeUseAt(".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1", props.urgent);
	return /* @__PURE__ */ jsx("section", { "data-arrow-app": "yes" }, /* @__PURE__ */ jsx("h2", null, "Arrow workspace"), /* @__PURE__ */ jsx(ArrowBadge, { stage }), /* @__PURE__ */ jsx("output", { "data-stage": stage }, stage), /* @__PURE__ */ jsx("output", { "data-urgent": urgent }, urgent), /* @__PURE__ */ jsx("ul", null, props.rows.map((id) => /* @__PURE__ */ jsx(ArrowRow, {
		key: id,
		id,
		rowRef: props.refs[id],
		life: props.life
	}))), /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx("output", {
			key: "result",
			"data-pending": "yes"
		}, "Loading"),
		error: (reason) => /* @__PURE__ */ jsx("output", {
			key: "result",
			"data-error": String(reason)
		}, "Failed"),
		__nativeBoundarySite: ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#boundary:0"
	}, /* @__PURE__ */ jsx(ArrowResult, {
		resource: props.resource,
		life: props.life
	})));
} }.ArrowApp, { propOnlySites: [] });
export const compiledNativeComponentPlan = {
	"schema_version": 2,
	"module_revision": "native-v1-7d5d580db1b00922",
	"semantic_plan": {
		"schema_version": 1,
		"source_file": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx",
		"module_revision": "native-v1-7d5d580db1b00922",
		"owners": [
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowBadge",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
				"repeated_scope": "runtime-keyed-owner"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
				"repeated_scope": "runtime-keyed-owner"
			}
		],
		"sources": [
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
				"kind": "use-input",
				"provenance": "opaque"
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#state:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
				"kind": "state",
				"provenance": "tracked"
			}
		],
		"sinks": [{
			"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#opaque-sink:1264",
			"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
			"source_sites": [],
			"provenance": "opaque",
			"equality": "adapter-declared",
			"host_value": "adapter-declared",
			"retention": "adapter-declared",
			"execution": "generic"
		}],
		"operations": [
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
				"kind": "use-store-or-resource",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#effect:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:0",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
				"kind": "activation-effect",
				"provenance": "opaque",
				"source_sites": []
			},
			{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:1",
				"owner_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
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
	"source_file": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx",
	"helper_module": "",
	"tasks": [],
	"task_order": [],
	"component_module": "/** @jsxImportSource @r3act/core */\n// @native-ui\nimport { Suspense, use, useEffect, useState } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport { defineComponent as __nativeDefineComponent, useStateAt as __nativeUseStateAt, useEffectAt as __nativeUseEffectAt, useStoreAt as __nativeUseStoreAt, bindStatePropsAt as __nativeBindStatePropsAt, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\nimport type { AsyncResource, StoreSource } from \"file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts\";\n\nexport type Panel = Readonly<{ stage: string; detail: string }>;\nexport type Life = { mounts: number; cleanups: number; conditionalMounts: number;\n  conditionalCleanups: number; resultMounts: number; resultCleanups: number };\nexport type RowRef = { current: HTMLButtonElement | null };\n\n// @ts-expect-error Lexical arguments is intentionally absent in this ES module.\nexport const ArrowBadge = __nativeDefineComponent(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowBadge\", ({ ArrowBadge: (props: { stage: string }) => <strong data-badge={props.stage} data-lexical-arguments={typeof arguments} data-lexical-this={typeof this}>{props.stage}</strong> }).ArrowBadge, { propOnlySites: [] });\n\nexport const ArrowRow = __nativeDefineComponent(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow\", ({ ArrowRow: (props: {\n  id: string;\n  life: Life;\n  rowRef: RowRef;\n}) => {\n  const [count, setCount] = __nativeUseStateAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#state:0\", 0);\n  __nativeUseEffectAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:0\", () => {\n    props.life.mounts++;\n    return () => { props.life.cleanups++; };\n  });\n  if (count % 2 === 1) __nativeUseEffectAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:1\", () => {\n    props.life.conditionalMounts++;\n    return () => { props.life.conditionalCleanups++; };\n  });\n  return <li key={props.id} data-row={props.id} data-count={count}>\n    <button ref={props.rowRef} data-click={props.id}\n      onClick={() => setCount((value) => value + 1)}>{props.id}: {count}</button>\n  </li>;\n} }).ArrowRow, { propOnlySites: [] });\n\nexport const ArrowResult = __nativeDefineComponent(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult\", ({ ArrowResult: (props: { resource: AsyncResource<Panel>; life: Life }) => {\n  const panel = __nativeUseAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0\", props.resource);\n  __nativeUseEffectAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#effect:0\", () => {\n    props.life.resultMounts++;\n    return () => { props.life.resultCleanups++; };\n  });\n  return <output key=\"result\" data-result={panel.stage} data-detail={panel.detail}>\n    {panel.stage}: {panel.detail}\n  </output>;\n} }).ArrowResult, { propOnlySites: [] });\n\nexport const ArrowApp = __nativeDefineComponent(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp\", ({ ArrowApp: (props: {\n  stage: StoreSource<string>;\n  urgent: StoreSource<number>;\n  resource: AsyncResource<Panel>;\n  rows: readonly string[];\n  refs: Record<string, RowRef>;\n  life: Life;\n}) => {\n  const stage = __nativeUseAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0\", props.stage);\n  const urgent = __nativeUseAt(\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1\", props.urgent);\n  return <section data-arrow-app=\"yes\">\n    <h2>Arrow workspace</h2>\n    <ArrowBadge stage={stage} />\n    <output data-stage={stage}>{stage}</output>\n    <output data-urgent={urgent}>{urgent}</output>\n    <ul>{props.rows.map((id) => <ArrowRow key={id} id={id}\n      rowRef={props.refs[id]} life={props.life} />)}</ul>\n    <Suspense fallback={<output key=\"result\" data-pending=\"yes\">Loading</output>}\n      error={(reason: unknown) => <output key=\"result\" data-error={String(reason)}>Failed</output>} __nativeBoundarySite=\".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#boundary:0\">\n      <ArrowResult resource={props.resource} life={props.life} />\n    </Suspense>\n  </section>;\n} }).ArrowApp, { propOnlySites: [] });\n",
	"components": [
		{
			"name": "ArrowApp",
			"component_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [],
			"store_sites": [{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:0",
				"source_expression": "props.stage"
			}, {
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowApp#store:1",
				"source_expression": "props.urgent"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ArrowBadge",
			"component_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowBadge",
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
			"name": "ArrowResult",
			"component_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [],
			"effect_sites": [{ "site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#effect:0" }],
			"store_sites": [{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowResult#store:0",
				"source_expression": "props.resource"
			}],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": []
		},
		{
			"name": "ArrowRow",
			"component_site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow",
			"prop_only_sites": [],
			"host_leaf_output": false,
			"state_sites": [{
				"site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#state:0",
				"initial_value": "0"
			}],
			"effect_sites": [{ "site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:0" }, { "site_id": ".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#component:ArrowRow#effect:1" }],
			"store_sites": [],
			"collection_sites": [],
			"numeric_sinks": [],
			"opaque_sinks": [".cache/compiled-arrow-components-b9203dcf-afdb-4c57-82f9-6d4b49a639c5/app.tsx#opaque-sink:1264"]
		}
	]
};
