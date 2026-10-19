import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "compiler/fixtures/native-hmr-revision.tsx");
const source = `import { useState } from "../../src/native_runtime_api.ts";
export function RevisionProbe() {
  const [value] = useState(1);
  return <output>{value}</output>;
}`;
const compilerBinary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary });
const context = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
};
plugin.configResolved.call(context, { root, command: "serve" });

try {
  const transformed = await plugin.transform.call(context, source, file);
  assert.ok(transformed?.code);
  const code = transformed.code;
  const register = code.indexOf("__registerNativeSemanticPlan(");
  const defineComponent = code.indexOf("__nativeDefineComponent(");
  assert.ok(register >= 0 && defineComponent > register, "plan registers before component definition");
  assert.match(code, /invalidateCompiledSemanticPlan as __invalidateNativeSemanticPlan/);
  assert.match(code, /import\.meta\.hot\.on\("r3act:invalidate-native-module"/);
  assert.match(code, /import\.meta\.hot\.dispose\(/);
  const revision = code.match(/"module_revision":"([^"]+)"/)?.[1];
  const instance = code.match(/event\.previousInstance === "([^"]+)"/)?.[1];
  assert.ok(revision);
  assert.ok(instance);
  const messages = [];
  const server = { ws: { send(message) { messages.push(message); } } };
  const hotContext = { file, modules: [], server };
  assert.deepEqual(await plugin.handleHotUpdate.call(context, hotContext), []);
  assert.deepEqual(messages, [
    { type: "custom", event: "r3act:invalidate-native-module", data: { sourceFile: "compiler/fixtures/native-hmr-revision.tsx", previousRevision: revision, previousInstance: instance } },
    { type: "full-reload" },
  ]);
  messages.length = 0;
  const dependency = { file: path.join(root, "compiler/fixtures/hmr-dependency.ts"), importers: new Set() };
  const reexport = { file: path.join(root, "compiler/fixtures/hmr-reexport.ts"), importers: new Set() };
  const nativeImporter = { file, importers: new Set() };
  dependency.importers.add(reexport);
  reexport.importers.add(nativeImporter);
  assert.deepEqual(await plugin.handleHotUpdate.call(context, {
    file: dependency.file, modules: [dependency], server,
  }), []);
  assert.deepEqual(messages, [
    { type: "custom", event: "r3act:invalidate-native-module", data: { sourceFile: "compiler/fixtures/native-hmr-revision.tsx", previousRevision: revision, previousInstance: instance } },
    { type: "full-reload" },
  ]);
  messages.length = 0;
  const reactPanel = {
    file: path.join(root, "compiler/fixtures/react-panel.tsx"),
    isSelfAccepting: true,
    importers: new Set([nativeImporter]),
  };
  assert.equal(await plugin.handleHotUpdate.call(context, {
    file: reactPanel.file, modules: [reactPanel], server,
  }), undefined);
  assert.deepEqual(messages, [], "React Refresh boundaries keep native importers mounted");
  const acceptedDependency = {
    file: path.join(root, "compiler/fixtures/accepted-dependency.ts"),
    importers: new Set([nativeImporter]),
  };
  nativeImporter.acceptedHmrDeps = new Set([acceptedDependency]);
  assert.equal(await plugin.handleHotUpdate.call(context, {
    file: acceptedDependency.file, modules: [acceptedDependency], server,
  }), undefined);
  assert.deepEqual(messages, [], "explicit Vite dependency accepts stop native invalidation");
  await assert.rejects(() => plugin.transform.call(context,
    source.replace("useState(1)", "useState("), file));
  messages.length = 0;
  assert.deepEqual(await plugin.handleHotUpdate.call(context, hotContext), []);
  assert.equal(messages[0].data.previousRevision, revision, "invalid compiler edits retain the last accepted revision");
  assert.equal(messages[0].data.previousInstance, instance);
} finally {
  await plugin.closeBundle?.call(context);
}

for (const [excluded, updatedSource] of [[true, 'export const ReactView = () => <output />;'], [false, source]]) {
  const boundaryPlugin = nativeModuleCompilerPlugin({
    root,
    compilerBinary,
    reactBoundary: { excludedFiles: new Set(excluded ? [file] : []), sourceRoots: [root] },
  });
  let restarts = 0;
  const messages = [];
  const server = {
    watcher: { once() {} },
    ws: { send(message) { messages.push(message); } },
    async restart() { restarts++; },
  };
  boundaryPlugin.configureServer.call(context, server);
  try {
    assert.deepEqual(await boundaryPlugin.handleHotUpdate.call(context, {
      file, modules: [], server, read: async () => updatedSource,
    }), []);
    await Promise.resolve();
    assert.deepEqual(messages, [{ type: "full-reload" }]);
    assert.equal(restarts, 1, "native membership changes restart Vite before the next transform");
    await assert.rejects(() => boundaryPlugin.transform.call(context, updatedSource, file),
      /Native\/React module boundary changed/);
  } finally {
    await boundaryPlugin.closeBundle?.call(context);
  }
}
