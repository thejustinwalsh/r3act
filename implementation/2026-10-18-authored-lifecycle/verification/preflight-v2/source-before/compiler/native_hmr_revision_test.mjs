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
const plugin = nativeModuleCompilerPlugin({ root });
const context = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
};

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
  const messages = [];
  const hotContext = { file, server: { ws: { send(message) { messages.push(message); } } } };
  assert.deepEqual(plugin.handleHotUpdate.call(context, hotContext), []);
  assert.deepEqual(messages, [
    { type: "custom", event: "r3act:invalidate-native-module", data: { sourceFile: "compiler/fixtures/native-hmr-revision.tsx" } },
    { type: "full-reload" },
  ]);
} finally {
  await plugin.closeBundle?.call(context);
}
