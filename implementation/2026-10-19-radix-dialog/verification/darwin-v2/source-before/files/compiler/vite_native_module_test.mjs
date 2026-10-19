import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { bindCompiledAsyncTasks } from "../src/async_task_plan.ts";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "..");
const modulePath = path.join(
  root,
  "src/browser/async_transition_stress_v1.tsx",
);
const componentModulePath = path.join(
  root,
  "src/browser/native_state_props.tsx",
);
const storeModulePath = path.join(root, "compiler/fixtures/native-store-positive.tsx");
const typedTaskModulePath = path.join(root, "src/browser/native_task_transitions.tsx");
const source = await readFile(modulePath, "utf8");
const unicodeSource = `// 🧭 native compiler source-map offset check\n${source}`;
const plugin = nativeModuleCompilerPlugin({ root });
const transform = plugin.transform;
assert.equal(typeof transform, "function");

const context = {
  addWatchFile() {},
  error(message) {
    throw new Error(String(message));
  },
};

const compile = (input) => transform.call(context, input, modulePath);

try {
  const first = await compile(unicodeSource);
  assert.ok(first?.code.includes('asyncTask("load-content", ["$request"],'));
  assert.ok(
    first.code.includes(
      'asyncTask("compose-update", ["load-content","load-target"],',
    ),
  );
  assert.ok(first.code.includes("The room stayed interactive while it worked."));
  assert.ok(first.code.includes("export const compiledAsyncTaskPlan ="));
  assert.ok(first.map);
  assert.deepEqual(first.map.sources, [modulePath]);
  assert.deepEqual(first.map.sourcesContent, [unicodeSource]);
  for (const anchor of [
    'async (values, signal) => {',
    'const request = values.get("$request")',
  ]) {
    const generatedOffset = first.code.indexOf(anchor);
    const originalOffset = unicodeSource.indexOf(anchor);
    assert.notEqual(generatedOffset, -1);
    assert.notEqual(originalOffset, -1);
    const generatedLocation = {
      line: first.code.slice(0, generatedOffset).split("\n").length,
      column: generatedOffset - first.code.lastIndexOf("\n", generatedOffset - 1) - 1,
    };
    const originalLocation = {
      line: unicodeSource.slice(0, originalOffset).split("\n").length,
      column: originalOffset - unicodeSource.lastIndexOf("\n", originalOffset - 1) - 1,
    };
    assert.deepEqual(
      originalPositionFor(new TraceMap(first.map), generatedLocation),
      { source: modulePath, line: originalLocation.line, column: originalLocation.column, name: null },
    );
  }

  const invalidRead = unicodeSource.replace(
    'const request = values.get("$request") as TransitionRequest;',
    'const inputName = "$request";\n    const request = values.get(inputName) as TransitionRequest;',
  );
  await assert.rejects(
    compile(invalidRead),
    /Native UI compilation failed.*literal.*get|Native UI compilation failed.*unsupported/i,
  );

  const second = await compile(unicodeSource);
  assert.equal(second.code, first.code);
  assert.equal(second.map.sourcesContent[0], unicodeSource);

  const publicAsyncTaskSource = unicodeSource.replace(
    'import { asyncTask } from "../async_task_plan.ts";',
    'import { asyncTask } from "../native_runtime_api.ts";',
  );
  assert.notEqual(publicAsyncTaskSource, unicodeSource);
  const publicAsyncTask = await compile(publicAsyncTaskSource);
  assert.ok(publicAsyncTask.code.includes('asyncTask("load-content", ["$request"],'));
  assert.ok(publicAsyncTask.code.includes('asyncTask("compose-update",'));
  assert.ok(publicAsyncTask.code.includes('"id":"load-content"'));
  assert.ok(publicAsyncTask.code.includes('"id":"compose-update"'));
  assert.deepEqual(publicAsyncTask.map.sourcesContent, [publicAsyncTaskSource]);
  const compiledPlanSource = publicAsyncTask.code.match(
    /export const compiledAsyncTaskPlan = ([\s\S]*?) as const;/,
  )?.[1];
  assert.ok(compiledPlanSource, "public asyncTask import emits a compiled plan");
  const publicPlan = JSON.parse(compiledPlanSource);
  const tasks = bindCompiledAsyncTasks(publicPlan, {
    "load-content": async (values) => {
      const request = values.get("$request");
      assert.equal(request.query, "fresh");
      return { text: `Loaded ${request.query}`, nextId: 3 };
    },
    "load-target": async (values) => {
      const request = values.get("$request");
      assert.equal(request.query, "fresh");
      return request.target;
    },
    "compose-update": async (values) => {
      const content = values.get("load-content");
      const target = values.get("load-target");
      return `${content.text} for ${target}`;
    },
  });
  const resultValues = new Map([[
    "request",
    { query: "fresh", target: "workspace" },
  ]]);
  for (const task of tasks) {
    const input = new Map(task.dependsOn.map((dependency) => [
      dependency,
      resultValues.get(dependency),
    ]));
    if (task.id === "load-content" || task.id === "load-target") {
      input.set("request", resultValues.get("request"));
    }
    resultValues.set(task.id, await task.run(input, new AbortController().signal));
  }
  assert.equal(resultValues.get("compose-update"), "Loaded fresh for workspace");

  const typedTaskSource = await readFile(typedTaskModulePath, "utf8");
  const typedTaskModule = await transform.call(context, typedTaskSource, typedTaskModulePath);
  assert.match(typedTaskModule.code, /compiledNativeComponentPlan/);
  assert.match(typedTaskModule.code, /"id":"profile"/);
  assert.match(typedTaskModule.code, /"id":"catalog"/);
  assert.match(typedTaskModule.code, /"id":"search"/);
  assert.match(typedTaskModule.code, /"id":"panel"/);

  const componentSource = `// 🧭 component source-map offset check\n${await readFile(componentModulePath, "utf8")}`;
  const compileComponent = (input) => transform.call(context, input, componentModulePath);
  const component = await compileComponent(componentSource);
  assert.match(component.code, /compiledNativeComponentPlan/);
  assert.match(component.code, /schema_version\":2/);
  assert.match(component.code, /__nativeDefineComponent/);
  assert.match(component.code, /__nativeUseStateAt/);
  assert.match(component.code, /__nativeUseEffectAt/);
  assert.match(component.code, /__nativeBindStatePropsAt/);
  assert.match(component.code, /__nativeBindStateProps?At\(/);
  assert.match(component.code, /data-x=\{__nativeBindStatePropAt/);
  assert.match(component.code, /--dot-tint/);
  assert.match(component.code, /prop_only_sites/);
  assert.match(
    component.code,
    /"prop_only_sites":\["src\/browser\/native_state_props\.tsx#component:MovingDot#state:0","src\/browser\/native_state_props\.tsx#component:MovingDot#state:1","src\/browser\/native_state_props\.tsx#component:MovingDot#state:2"\]/,
  );
  assert.match(component.code, /compiledNativeComponentPlan\s*=\s*\{/);
  assert.match(component.code, /keyed/);
  assert.match(component.code, /<EditableRow key=\{id\}/);
  assert.match(component.code, /State branch is visible/);
  assert.match(component.code, /--dot-x/);
  assert.ok(component.map);
  assert.deepEqual(component.map.sources, [componentModulePath]);
  assert.deepEqual(component.map.sourcesContent, [componentSource]);
  const assertComponentMap = (
    generatedAnchor,
    originalAnchor = generatedAnchor,
    generatedAnchorOffset = 0,
    originalAnchorOffset = 0,
  ) => {
    const generatedOffset = component.code.indexOf(generatedAnchor) + generatedAnchorOffset;
    const originalOffset = componentSource.indexOf(originalAnchor) + originalAnchorOffset;
    assert.notEqual(generatedOffset, -1, `missing generated anchor ${generatedAnchor}`);
    assert.notEqual(originalOffset, -1, `missing source anchor ${originalAnchor}`);
    const generatedLocation = {
      line: component.code.slice(0, generatedOffset).split("\n").length,
      column: generatedOffset - component.code.lastIndexOf("\n", generatedOffset - 1) - 1,
    };
    const originalLocation = {
      line: componentSource.slice(0, originalOffset).split("\n").length,
      column: originalOffset - componentSource.lastIndexOf("\n", originalOffset - 1) - 1,
    };
    assert.deepEqual(
      originalPositionFor(new TraceMap(component.map), generatedLocation),
      { source: componentModulePath, line: originalLocation.line, column: originalLocation.column, name: null },
    );
  };
  assertComponentMap("function MovingDot");
  assertComponentMap("const animate = () =>");
  assertComponentMap("=> (x)", "data-x={x}", 4, 8);
  const storeSource = await readFile(storeModulePath, "utf8");
  const store = await transform.call(context, storeSource, storeModulePath);
  assert.ok(store?.code.includes("__nativeUseAt(\"compiler/fixtures/native-store-positive.tsx#component:StorePanel#store:0\", source)"));
  assert.ok(store.code.includes("useAt as __nativeUseAt"));
  assert.ok(!store.code.includes("__nativeUseStoreAt("));
  assert.ok(store.code.includes("\"store_sites\":[{\"site_id\":\"compiler/fixtures/native-store-positive.tsx#component:StorePanel#store:0\",\"source_expression\":\"source\"}"));
  assert.ok(store.map);
  assert.deepEqual(store.map.sourcesContent, [storeSource]);
  const generatedStoreSource = store.code.indexOf(", source)", store.code.indexOf("__nativeUseAt(\"compiler/fixtures/native-store-positive.tsx#component:StorePanel#store:0\"")) + 2;
  const originalStoreSource = storeSource.indexOf("use(source)") + "use(".length;
  const generatedStoreLocation = {
    line: store.code.slice(0, generatedStoreSource).split("\n").length,
    column: generatedStoreSource - store.code.lastIndexOf("\n", generatedStoreSource - 1) - 1,
  };
  const originalStoreLocation = {
    line: storeSource.slice(0, originalStoreSource).split("\n").length,
    column: originalStoreSource - storeSource.lastIndexOf("\n", originalStoreSource - 1) - 1,
  };
  assert.deepEqual(
    originalPositionFor(new TraceMap(store.map), generatedStoreLocation),
    { source: storeModulePath, line: originalStoreLocation.line, column: originalStoreLocation.column, name: null },
  );
  const generatedStoreCallee = store.code.indexOf("__nativeUseAt(\"compiler/fixtures/native-store-positive.tsx#component:StorePanel#store:0\"");
  const originalStoreCallee = storeSource.indexOf("use(source)");
  const generatedStoreCalleeLocation = {
    line: store.code.slice(0, generatedStoreCallee).split("\n").length,
    column: generatedStoreCallee - store.code.lastIndexOf("\n", generatedStoreCallee - 1) - 1,
  };
  const originalStoreCalleeLocation = {
    line: storeSource.slice(0, originalStoreCallee).split("\n").length,
    column: originalStoreCallee - storeSource.lastIndexOf("\n", originalStoreCallee - 1) - 1,
  };
  assert.deepEqual(
    originalPositionFor(new TraceMap(store.map), generatedStoreCalleeLocation),
    { source: storeModulePath, line: originalStoreCalleeLocation.line, column: originalStoreCalleeLocation.column, name: null },
  );
  const genericUseSource = `// @native-ui
import { use } from "../native_runtime_api.ts";
export function GenericReader({ promise, resource, key, store }) {
  const promiseValue = use(promise);
  const resourceValue = use(resource);
  const keyValue = use(key);
  const nestedValue = use(use(store));
  return <output>{String(promiseValue)}:{String(resourceValue)}:{String(keyValue)}:{String(nestedValue)}</output>;
}`;
  const genericUsePath = path.join(root, "compiler/fixtures/native-use-generic.tsx");
  const genericUse = await transform.call(context, genericUseSource, genericUsePath);
  assert.ok(genericUse?.code.includes("useAt as __nativeUseAt"));
  assert.ok(genericUse.code.includes("__nativeUseAt(\"compiler/fixtures/native-use-generic.tsx#component:GenericReader#store:0\", promise)"));
  assert.ok(genericUse.code.includes("__nativeUseAt(\"compiler/fixtures/native-use-generic.tsx#component:GenericReader#store:1\", resource)"));
  assert.ok(genericUse.code.includes("__nativeUseAt(\"compiler/fixtures/native-use-generic.tsx#component:GenericReader#store:2\", key)"));
  assert.ok(genericUse.code.includes("__nativeUseAt(\"compiler/fixtures/native-use-generic.tsx#component:GenericReader#store:3\", __nativeUseAt(\"compiler/fixtures/native-use-generic.tsx#component:GenericReader#store:4\", store))"));
  assert.ok(!genericUse.code.includes("__nativeUseStoreAt("));
  const explicitStoreSource = `// @native-ui
import { useStore } from "../native_runtime_api.ts";
export function MigrationReader({ source }) {
  return <output>{String(useStore(source))}</output>;
}`;
  const explicitStore = await transform.call(
    context,
    explicitStoreSource,
    path.join(root, "compiler/fixtures/native-use-store-migration.tsx"),
  );
  assert.ok(explicitStore.code.includes("useStoreAt as __nativeUseStoreAt"));
  assert.ok(explicitStore.code.includes("__nativeUseStoreAt(\"compiler/fixtures/native-use-store-migration.tsx#component:MigrationReader#store:0\", source)"));
  const shadowedUseSource = `// @native-ui
import { use } from "../native_runtime_api.ts";
export function ShadowedReader(use) {
  return <output>{String(use("local"))}</output>;
}`;
  const shadowedUse = await transform.call(
    context,
    shadowedUseSource,
    path.join(root, "compiler/fixtures/native-use-shadowed.tsx"),
  );
  assert.ok(shadowedUse.code.includes('use("local")'));
  assert.ok(!shadowedUse.code.includes("__nativeUseAt("));
  assert.ok(shadowedUse.code.includes('"store_sites":[]'));
  for (const ownershipSource of [
    `// @native-ui\nimport { use } from "../native_runtime_api.ts";\nexport function LoopReader({ values }) { for (const value of values) use(value); return <output />; }`,
    `// @native-ui\nimport { use } from "../native_runtime_api.ts";\nexport function CallbackReader({ value }) { [value].map((item) => use(item)); return <output />; }`,
  ]) {
    await assert.rejects(
      transform.call(context, ownershipSource, genericUsePath),
      /Native UI compilation failed.*(?:loops|nested callbacks|repeated)/i,
    );
  }
  const suspenseSource = `// @native-ui
import { Suspense as Boundary, jsx } from "../native_runtime_api.ts";
export function SuspenseShell({ fallback, children, props }) {
  return <>
    <Boundary fallback={fallback} {...props}><span>{children}</span></Boundary>
    <Boundary {...props} />
    <suspense />
  </>;
}
export function ShadowedBoundary({ Boundary }) { return <Boundary />; }
`;
  const suspensePath = path.join(root, "compiler/fixtures/native-suspense-boundaries.tsx");
  const suspenseOnly = await transform.call(context,
    `// @native-ui\nimport { Suspense } from "../native_runtime_api.ts";\nexport function OnlyBoundary({children}) { return <Suspense fallback={null}>{children}</Suspense>; }`,
    suspensePath);
  assert.ok(suspenseOnly.code.includes('__nativeBoundarySite="compiler/fixtures/native-suspense-boundaries.tsx#boundary:0"'),
    "Suspense-only imports must activate native component compilation");
  const suspenseInput = `// 🧭 source-map boundary offset check\n${suspenseSource}`;
  const suspense = await transform.call(context, suspenseInput, suspensePath);
  const suspenseJs = suspense.code.slice(0, suspense.code.indexOf("\nexport const compiledNativeComponentPlan"));
  assert.ok(suspenseJs.includes('<Boundary fallback={fallback} {...props} __nativeBoundarySite="compiler/fixtures/native-suspense-boundaries.tsx#boundary:0">'));
  assert.ok(suspenseJs.includes('<Boundary {...props} __nativeBoundarySite="compiler/fixtures/native-suspense-boundaries.tsx#boundary:1" />'));
  assert.ok(suspenseJs.includes("<suspense />"));
  assert.ok(suspenseJs.includes("function ShadowedBoundary({ Boundary }) { return <Boundary />; }"));
  assert.equal(suspenseJs.match(/__nativeBoundarySite=/g)?.length, 2);
  assert.ok(suspense.map);
  assert.deepEqual(suspense.map.sourcesContent, [suspenseInput]);
  const suspenseTag = "<Boundary fallback={fallback}";
  const generatedSuspenseTag = suspense.code.indexOf(suspenseTag);
  const originalSuspenseTag = suspenseInput.indexOf(suspenseTag);
  const suspenseTagLocation = (text, offset) => ({
    line: text.slice(0, offset).split("\n").length,
    column: offset - text.lastIndexOf("\n", offset - 1) - 1,
  });
  assert.deepEqual(
    originalPositionFor(new TraceMap(suspense.map), suspenseTagLocation(suspense.code, generatedSuspenseTag)),
    { source: suspensePath, ...suspenseTagLocation(suspenseInput, originalSuspenseTag), name: null },
  );
  await assert.rejects(
    transform.call(context, `// @native-ui\nimport { Suspense, jsx } from "../native_runtime_api.ts";\nexport function Forged() { return <Suspense __nativeBoundarySite="forged" />; }`, suspensePath),
    /Native UI compilation failed.*`__nativeBoundarySite` is reserved/,
  );
  await assert.rejects(
    transform.call(context, `// @native-ui\nimport * as Runtime from "../native_runtime_api.ts";\nimport { jsx } from "../native_runtime_api.ts";\nexport function Qualified() { return <Runtime.Suspense fallback={null} />; }`, suspensePath),
    /Native UI compilation failed.*qualified native Suspense imports are unsupported/,
  );
  await assert.rejects(
    compileComponent(componentSource.replace(
      '  useEffect,\n  useState,',
      '  type useEffect,\n  type useState,',
    )),
    /Native UI compilation failed.*type-only|Native UI compilation failed.*type only|Native UI compilation failed.*direct named/i,
  );
  for (const [hook, typeOnlySource] of [
    ["use", `// @native-ui\nimport type { use } from "../native_runtime_api.ts";\nexport function Reader() { return <output>{String(use("key"))}</output>; }`],
    ["useStore", `// @native-ui\nimport type { useStore } from "../native_runtime_api.ts";\nexport function Reader() { return <output>{String(useStore("key"))}</output>; }`],
    ["use alias", `// @native-ui\nimport { use as read } from "../native_runtime_api.ts";\nexport function Reader() { return <output>{String(read("key"))}</output>; }`],
    ["useStore alias", `// @native-ui\nimport { useStore as read } from "../native_runtime_api.ts";\nexport function Reader() { return <output>{String(read("key"))}</output>; }`],
  ]) {
    await assert.rejects(
      transform.call(context, typeOnlySource, storeModulePath),
      /Native UI compilation failed.*direct named|Native UI compilation failed.*type-only|Native UI compilation failed.*type only/i,
      `${hook} import must be rejected when type-only or aliased`,
    );
  }
  const loopHookSource = componentSource.replace(
    "function NativeStateDemo() {",
    "function LoopHook() {\n  for (const item of [1]) useState(item);\n  return <div />;\n}\n\nfunction NativeStateDemo() {",
  );
  await assert.rejects(
    compileComponent(loopHookSource),
    /Native UI compilation failed.*loop|Native UI compilation failed.*repeated/i,
  );
  const markerWithoutNativeImports = await transform.call(
    context,
    "// @native-ui\nexport const ordinary = <div />;",
    path.join(root, "src/browser/ordinary_marker.tsx"),
  );
  assert.equal(markerWithoutNativeImports, null);
  const markerWithCommentOnlyImport = await transform.call(
    context,
    `// @native-ui\n// import { jsx, createDOMRoot } from "../native_runtime_api.ts";\nexport const ordinary = <div />;`,
    path.join(root, "src/browser/comment_import_marker.tsx"),
  );
  assert.equal(markerWithCommentOnlyImport, null);
  const typeOnlyRootImports = await transform.call(
    context,
    `// @native-ui\nimport type { createDOMRoot } from "../native_runtime_api.ts";\nexport function Statless() { return null; }`,
    path.join(root, "src/browser/type_only_native_root.tsx"),
  );
  assert.equal(typeOnlyRootImports, null);

  const statelessPath = path.join(root, "src/browser/stateless_native.tsx");
  const statelessSource = `// @native-ui
// import { useState } from "../native_runtime_api.ts"; this comment has from text
import { jsx, createDOMRoot } from "../native_runtime_api.ts";

export function StaticBadge() {
  return jsx("strong", { children: "Ready" });
}

createDOMRoot(document.querySelector("#app")!).mount(jsx(StaticBadge, {}));
`;
  const stateless = await transform.call(context, statelessSource, statelessPath);
  assert.ok(stateless?.code);
  assert.match(stateless.code, /compiledNativeComponentPlan/);
  assert.doesNotMatch(stateless.code, /compiledAsyncTaskPlan/);
  assert.match(stateless.code, /"name":"StaticBadge"/);
  assert.match(stateless.code, /"prop_only_sites":\[\]/);
  assert.match(stateless.code, /"state_sites":\[\]/);
  assert.match(stateless.code, /"effect_sites":\[\]/);
  assert.ok(stateless.map);
  assert.deepEqual(stateless.map.sources, [statelessPath]);
  assert.deepEqual(stateless.map.sourcesContent, [statelessSource]);

  const compileFixture = async (name) => {
    const fixturePath = path.join(root, `compiler/fixtures/${name}`);
    const fixtureSource = await readFile(fixturePath, "utf8");
    return {
      fixturePath,
      fixtureSource,
      result: await transform.call(context, fixtureSource, fixturePath),
    };
  };
  const collection = await compileFixture("native-collection-positive.tsx");
  assert.match(collection.result.code, /renderCollectionAt as __nativeRenderCollectionAt/);
  assert.match(collection.result.code, /__nativeRenderCollectionAt\("compiler\/fixtures\/native-collection-positive\.tsx#component:CollectionList#collection:0", items, \(\(item\) =>/);
  assert.match(collection.result.code, /__nativeRenderCollectionAt\("compiler\/fixtures\/native-collection-positive\.tsx#component:CollectionLabels#collection:0", items, \(\(entry\) =>/);
  assert.match(collection.result.code, /__nativeRenderCollectionAt\("compiler\/fixtures\/native-collection-positive\.tsx#component:CollectionList#collection:1", items, \(\(item\) =>/);
  assert.match(collection.result.code, /"collection_sites":\[\{"site_id":"compiler\/fixtures\/native-collection-positive\.tsx#component:CollectionList#collection:0","source_expression":"items","row_parameter":"item","requires_owner_render":false\}/);
  assert.match(collection.result.code, /"requires_owner_render":false/);
  assert.doesNotMatch(collection.result.code, /requiresOwnerRender: true/);
  assert.ok(collection.result.map);
  assert.deepEqual(collection.result.map.sourcesContent, [collection.fixtureSource]);
  const collectionCallback = "(item) => <li key={item.id}>{item.label}</li>";
  const generatedCallbackOffset = collection.result.code.indexOf(collectionCallback);
  const originalCallbackOffset = collection.fixtureSource.indexOf(collectionCallback);
  assert.notEqual(generatedCallbackOffset, -1);
  assert.notEqual(originalCallbackOffset, -1);
  const callbackLocation = (text, offset) => ({
    line: text.slice(0, offset).split("\n").length,
    column: offset - text.lastIndexOf("\n", offset - 1) - 1,
  });
  assert.deepEqual(
    originalPositionFor(new TraceMap(collection.result.map), callbackLocation(collection.result.code, generatedCallbackOffset)),
    { source: collection.fixturePath, ...callbackLocation(collection.fixtureSource, originalCallbackOffset), name: null },
  );
  const fallback = await compileFixture("native-collection-fallback.tsx");
  assert.doesNotMatch(fallback.result.code, /__nativeRenderCollectionAt\(/);
  assert.match(fallback.result.code, /arrayItems\.map\(/);
  assert.match(fallback.result.code, /records\.map\(/);
  assert.match(fallback.result.code, /"collection_sites":\[\]/);

  for (const name of ["native-collection-index-fallback.tsx", "native-collection-this-arg.tsx", "native-collection-alias-rejection.tsx"]) {
    const fixturePath = path.join(root, `compiler/fixtures/${name}`);
    const fixtureSource = await readFile(fixturePath, "utf8");
    await assert.rejects(
      transform.call(context, fixtureSource, fixturePath),
      /Native UI compilation failed.*(?:native collection `.map` requires one inline|mapping a collection alias is unsupported)/,
      `${name} must reject an unlowered known-collection map`,
    );
  }
  const ownerRender = await compileFixture("native-collection-owner-render.tsx");
  assert.match(ownerRender.result.code, /__nativeRenderCollectionAt\("compiler\/fixtures\/native-collection-owner-render\.tsx#component:CollectionRows#collection:0", items, \(\(item\) =>[\s\S]*?, \{ requiresOwnerRender: true \}\)/);
  assert.match(ownerRender.result.code, /"requires_owner_render":true/);
  const eventRead = await compileFixture("native-collection-event-read.tsx");
  assert.match(eventRead.result.code, /"requires_owner_render":false/);
  assert.doesNotMatch(eventRead.result.code, /requiresOwnerRender: true/);
  const aliasedFactoryPath = path.join(root, "compiler/fixtures/native-collection-alias-factory.tsx");
  const aliasedFactorySource = `// @native-ui\nimport { createKeyedCollection as makeCollection, jsx } from "../../src/native_runtime_api.ts";\nconst rows = makeCollection([{ id: "x" }], (row) => row.id);\nexport function Rows() { return <ul>{rows.map((row) => <li>{row.id}</li>)}</ul>; }`;
  await assert.rejects(
    transform.call(context, aliasedFactorySource, aliasedFactoryPath),
    /Native UI compilation failed.*direct, unaliased `createKeyedCollection` import/,
  );
} finally {
  plugin.closeBundle?.call({});
}

console.log("Native Vite transform smoke passed (Unicode map, diagnostic, reuse).");
