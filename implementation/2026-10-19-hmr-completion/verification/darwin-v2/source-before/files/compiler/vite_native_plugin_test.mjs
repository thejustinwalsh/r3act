import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeId = path.join(projectRoot, "src/browser/native-plugin-zero-config.tsx");
const reactId = path.join(projectRoot, "src/browser/react-plugin-unmodified.tsx");
const source = `import { asyncTask, createStore, use, useState } from "../native_runtime_api.ts";
type Request = { label: string };
const requestLabel = asyncTask("request-label", ["$request"], async (values) => {
  const request = values.get("$request") as Request;
  return request.label;
});
const labelStore = createStore("ready");
export function NativeCounter({ request }: { request: Request }) {
  const [count, setCount] = useState(0);
  const value = use(labelStore);
  return <button onClick={() => setCount((previous) => previous + 1)}>{count}: {String(value)}</button>;
}`;

const plugin = nativeModulePlugin();
const context = {
  addWatchFile() {},
  async resolve(specifier, importer) {
    if (specifier === "../native_runtime_api.ts") {
      return { id: path.resolve(path.dirname(importer), specifier) };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
plugin.configResolved.call({}, { root: projectRoot });
const transform = plugin.transform;
assert.equal(typeof transform, "function");

let first;
try {
  first = await transform.call(context, source, nativeId);
  assert.ok(first?.code, "the native runtime import opts into native compilation without a pragma");
  assert.match(first.code, /import \* as __nativeJsx from "\.\.\/native_runtime_api\.ts"/);
  assert.match(first.code, /__nativeJsx\.jsx\("button"/);
  assert.match(first.code, /__nativeUseStateAt\(/);
  assert.match(first.code, /__nativeUseAt\(/);
  assert.match(first.code, /"tasks": \[\{[\s\S]*"id": "request-label"/);
  assert.doesNotMatch(first.code, /\n\s*return <button/);
  assert.ok(first.map, "the composed transform returns a source map");
  assert.deepEqual(first.map.sources, [nativeId]);
  assert.deepEqual(first.map.sourcesContent, [source]);

  const generatedOffset = first.code.indexOf("setCount((previous) => previous + 1)");
  const originalOffset = source.indexOf("setCount((previous) => previous + 1)");
  assert.notEqual(generatedOffset, -1);
  const generatedLocation = {
    line: first.code.slice(0, generatedOffset).split("\n").length,
    column: generatedOffset - first.code.lastIndexOf("\n", generatedOffset - 1) - 1,
  };
  const originalLocation = {
    line: source.slice(0, originalOffset).split("\n").length,
    column: originalOffset - source.lastIndexOf("\n", originalOffset - 1) - 1,
  };
  assert.deepEqual(
    originalPositionFor(new TraceMap(first.map), generatedLocation),
    { source: nativeId, line: originalLocation.line, column: originalLocation.column, name: null },
  );

  const edited = source.replace("return request.label", "return `edited:${request.label}`");
  const second = await transform.call(context, edited, nativeId);
  assert.ok(second?.code.includes("edited:"), "a changed native source produces a fresh transform result");
  assert.notEqual(second.code, first.code);

  const taskOnlyId = path.join(projectRoot, "src/browser/native-plugin-task-only.tsx");
  const taskOnly = `import { asyncTask } from "../native_runtime_api.ts";\nexport const load = asyncTask("load", [], async (values) => "ready");`;
  const taskOnlyResult = await transform.call(context, taskOnly, taskOnlyId);
  assert.match(taskOnlyResult.code, /compiledNativeComponentPlan|compiledAsyncTaskPlan/);

  const reactSource = `import { useState } from "react";\nexport function ReactCounter() { const [count] = useState(0); return <button>{count}</button>; }`;
  assert.equal(await transform.call(context, reactSource, reactId), null, "React TSX remains outside native lowering");

  const consumerRoot = path.join(projectRoot, ".cache/fictitiousconsumer");
  const consumerId = path.join(consumerRoot, "src/consumer.tsx");
  const consumerPlugin = nativeModulePlugin();
  consumerPlugin.configResolved.call({}, { root: consumerRoot });
  const consumerContext = {
    ...context,
    async resolve(specifier) {
      if (specifier === "../native_runtime_api.ts") {
        return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
      }
      return null;
    },
  };
  try {
    const consumerResult = await consumerPlugin.transform.call(
      consumerContext,
      `import { useState } from "../native_runtime_api.ts";\nexport function ConsumerCounter() { const [count] = useState(0); return <mesh>{count}</mesh>; }`,
      consumerId,
    );
    assert.ok(consumerResult?.code.includes('"source_file": "src/consumer.tsx"'));
    assert.deepEqual(consumerResult.map.sources, [consumerId]);
  } finally {
    consumerPlugin.closeBundle?.call({});
  }
} finally {
  plugin.closeBundle?.call({});
}

// A consumer's Vite root is distinct from the installed compiler root.
const consumerRoot = path.join(projectRoot, ".cache/native-plugin-consumer");
const consumer = nativeModulePlugin();
consumer.configResolved.call({}, { root: consumerRoot });
try {
  const consumerSource = `import { useState } from "native_runtime_api.ts";
export function Consumer(){const [count]=useState(1);return <output>{count}</output>;}`;
  const result = await consumer.transform.call({
    ...context,
    async resolve(){ return {id:path.join(projectRoot,"src/native_runtime_api.ts")}; },
  }, consumerSource, path.join(consumerRoot,"App.tsx"));
  assert.match(result.code, /"source_file": "App\.tsx"/);
  assert.match(result.code, /App\.tsx#component:Consumer/);
  assert.match(result.code, /__nativeJsx\.jsx\("output"/);
} finally {
  consumer.closeBundle?.call({});
}

const missingBinary = nativeModulePlugin({
  root: projectRoot,
  compilerBinary: path.join(projectRoot, ".cache/nonexistent-native-compiler"),
});
try {
  await assert.rejects(() => missingBinary.transform.call(context,
    `import {useState} from "../native_runtime_api.ts"; export function Missing(){const [value]=useState(0);return <output>{value}</output>;}`,
    nativeId), /Unable to start Rust native compiler/);
} finally {
  missingBinary.closeBundle?.call({});
}

console.log("Vite native composed plugin smoke test passed");
