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
const watched = [];
const context = {
  addWatchFile(filename) { watched.push(filename); },
  error(message) { throw new Error(String(message)); },
};
plugin.configResolved.call(context, { root, command: "serve" });

try {
  const transformed = await plugin.transform.call(context, source, `${file}?v=source-watch`);
  assert.ok(transformed?.code);
  assert.deepEqual(watched.filter((filename) => filename === file), [file],
    "a queried native transform registers its clean absolute input");
  watched.length = 0;
  const ordinaryFile = path.join(root, "compiler/fixtures/react-hmr-revision.tsx");
  assert.equal(await plugin.transform.call(context,
    "export function ReactProbe() { return <output />; }", ordinaryFile), null);
  assert.equal(await plugin.transform.call(context, source, `${file}?raw`), null);
  assert.deepEqual(watched, [], "ordinary and non-transform requests add no native source watch");
  const outsideFile = path.resolve(root, "../native-hmr-outside.tsx");
  await assert.rejects(() => plugin.transform.call(context,
    '// @native-ui\nimport { asyncTask } from "./missing.ts";', outsideFile),
  /Native UI module must be inside the project root/);
  assert.deepEqual(watched, [], "a rejected outside-root candidate adds no source watch");
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
  const hotContext = { file, modules: [], server, read: async () => source };
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
  const invalid = source.replace("useState(1)", "useState(");
  await assert.rejects(() => plugin.transform.call(context, invalid, file),
    /Native UI compilation failed/);
  assert.ok(watched.includes(file), "a failed native transform still watches its input for repair");
  watched.length = 0;
  messages.length = 0;
  await assert.rejects(() => plugin.handleHotUpdate.call(context, {
    ...hotContext, read: async () => invalid,
  }));
  assert.deepEqual(messages, [], "invalid edits leave the accepted app mounted");
  await assert.rejects(() => plugin.handleHotUpdate.call(context, {
    ...hotContext,
    read: async () => source.replace("export function RevisionProbe", "export async function RevisionProbe"),
  }), /Native UI compilation failed/);
  assert.deepEqual(messages, [], "Rust semantic rejection keeps the accepted revision live");
  let reads = 0;
  assert.deepEqual(await plugin.handleHotUpdate.call(context, {
    ...hotContext,
    read: async () => ++reads === 1 ? source : invalid,
  }), []);
  assert.deepEqual(messages, [], "an edit that changes during preflight cannot retire the old revision");
  const repaired = source.replace("useState(1)", "useState(2)");
  assert.deepEqual(await plugin.handleHotUpdate.call(context, {
    ...hotContext, read: async () => repaired,
  }), []);
  assert.deepEqual(messages, [
    { type: "custom", event: "r3act:invalidate-native-module", data: { sourceFile: "compiler/fixtures/native-hmr-revision.tsx", previousRevision: revision, previousInstance: instance } },
    { type: "full-reload" },
  ], "a repaired edit invalidates exactly the last accepted revision and instance");
  const refreshed = await plugin.transform.call(context, repaired, file);
  assert.ok(refreshed?.code);
  assert.ok(watched.includes(file), "repair re-enters the watched native transform");
  const refreshedRevision = refreshed.code.match(/"module_revision":"([^"]+)"/)?.[1];
  const refreshedInstance = refreshed.code.match(/event\.previousInstance === "([^"]+)"/)?.[1];
  assert.notEqual(refreshedRevision, revision);
  assert.ok(refreshedInstance);
  messages.length = 0;
  let sameTokenReads = 0;
  assert.deepEqual(await plugin.handleHotUpdate.call(context, {
    ...hotContext,
    read: async () => {
      if (++sameTokenReads === 1) return repaired;
      await plugin.transform.call(context, repaired, file);
      return repaired;
    },
  }), []);
  assert.deepEqual(messages, [
    { type: "custom", event: "r3act:invalidate-native-module", data: { sourceFile: "compiler/fixtures/native-hmr-revision.tsx", previousRevision: refreshedRevision, previousInstance: refreshedInstance } },
    { type: "full-reload" },
  ], "a same-token retransformation does not swallow a valid native edit");
  messages.length = 0;
  let supersedingReads = 0;
  const superseding = source.replace("useState(1)", "useState(3)");
  assert.deepEqual(await plugin.handleHotUpdate.call(context, {
    ...hotContext,
    read: async () => {
      if (++supersedingReads === 1) return repaired;
      await plugin.transform.call(context, superseding, file);
      return repaired;
    },
  }), []);
  assert.deepEqual(messages, [], "a superseding transform cannot be retired by an older preflight");
} finally {
  await plugin.closeBundle?.call(context);
}

{
  const importerPlugin = nativeModuleCompilerPlugin({
    root, compilerBinary,
    reactBoundary: { excludedFiles: new Set([file]), sourceRoots: [root] },
  });
  importerPlugin.configResolved.call(context, { root, command: "serve" });
  const messages = [];
  const server = { ws: { send(message) { messages.push(message); } } };
  try {
    await importerPlugin.transform.call(context, source, file);
    const importer = { file, importers: new Set() };
    const dependency = {
      file: path.join(root, "compiler/fixtures/hmr-react-dependency.tsx"),
      importers: new Set([importer]),
    };
    assert.deepEqual(await importerPlugin.handleHotUpdate.call(context, {
      file: dependency.file, modules: [dependency], server,
      read: async () => {
        await importerPlugin.transform.call(context,
          source.replace("useState(1)", "useState(4)"), file);
        return "export function ReactDependency() { return <output />; }";
      },
    }), []);
    assert.deepEqual(messages, [], "a superseding native importer cannot receive an obsolete dependency invalidation");
  } finally {
    await importerPlugin.closeBundle?.call(context);
  }
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
