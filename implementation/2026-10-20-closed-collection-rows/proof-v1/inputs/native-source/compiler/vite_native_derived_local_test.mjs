import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(sourcePath).href;
const inputPath = path.join(root, "compiler/fixtures/derived-local-map.tsx");
const authored = [
  "// 🧭 Rust byte offsets and JavaScript UTF-16 offsets differ here.",
  `import { useState } from ${JSON.stringify(runtimeUrl)};`,
  "export function Row() {",
  "  const [value] = useState(4);",
  "  const parity = value % 2;",
  "  const label = parity + 10;",
  "  return <div data-parity={parity} data-label={label} data-tail=\"sentinel\" />;",
  "}",
  "export const untouchedTail = \"tail-after-component\";",
].join("\n");
const locationAt = (source, offset) => ({
  line: source.slice(0, offset).split("\n").length,
  column: offset - source.lastIndexOf("\n", offset - 1) - 1,
});
const plugin = nativeModulePlugin({ root });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: sourcePath } : null;
  },
  error(message) { throw new Error(String(message)); },
};

try {
  const result = await plugin.transform.call(context, authored, inputPath);
  assert.ok(result?.map, "composed source map exists");
  assert.match(result.code, /ownerUpdateProgram:/);
  assert.match(result.code, /"data-parity":\s*__nativeBindStatePropAt\(/);
  assert.match(result.code, /"data-label":\s*__nativeBindStatePropAt\(/);
  assert.match(result.code, /"data-tail":\s*"sentinel"/);
  const sourceMap = new TraceMap(result.map);
  const functionOffset = result.code.indexOf("function Row(");
  assert.notEqual(functionOffset, -1, "executable component exists");
  const anchors = [
    ["__nativeUseStateAt(", "useState(4)"],
    ["jsx(\"div\"", "<div"],
    ["__nativeBindStatePropAt(", "parity} data-label"],
    ["untouchedTail = \"tail-after-component\"", "untouchedTail = \"tail-after-component\""],
  ];
  for (const [generatedAnchor, authoredAnchor] of anchors) {
    const generatedOffset = result.code.indexOf(generatedAnchor, functionOffset);
    const authoredOffset = authored.indexOf(authoredAnchor);
    assert.notEqual(generatedOffset, -1, generatedAnchor);
    assert.notEqual(authoredOffset, -1, authoredAnchor);
    assert.deepEqual(
      originalPositionFor(sourceMap, locationAt(result.code, generatedOffset)),
      { source: inputPath, ...locationAt(authored, authoredOffset), name: null },
      `authored location for ${generatedAnchor}`,
    );
  }
  console.log("Native derived-local source-map regression passed.");
} finally {
  await plugin.closeBundle?.call(context);
}
