import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { nativeModulePlugin } from "../../compiler/vite_native_plugin.ts";

const stageDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(stageDirectory, "../..");
const proofDirectory = path.join(stageDirectory, "proof-v5");
const inputPath = path.join(stageDirectory, "derived-local-source-map.tsx");
const outputPath = path.join(proofDirectory, "compiled.mjs");
const sourceMapPath = path.join(proofDirectory, "source-map.json");
const resultPath = path.join(proofDirectory, "result.json");
const errorPath = path.join(proofDirectory, "error.json");
const sourcePath = path.join(repositoryRoot, "src/native_runtime_api.ts");
const compilerSources = [
  "compiler/vite_native_plugin.ts",
  "compiler/vite_native_module.ts",
  "compiler/oxc-spike/src/main.rs",
  "compiler/oxc-spike/src/owner_update_program.rs",
  "src/native_runtime_api.ts",
];
const runtimeUrl = pathToFileURL(sourcePath).href;
const authored = [
  "// 🧭 UTF-8 prefix; Rust byte offsets must map to JavaScript UTF-16 columns.",
  "import { useState } from " + JSON.stringify(runtimeUrl) + ";",
  "",
  "export function DerivedRow() {",
  "  const [value] = useState(4);",
  "  const parity = value % 2;",
  "  const label = parity + 10;",
  "  return <div data-parity={parity} data-label={label} data-tail=\"sentinel\" />;",
  "}",
  "",
  "export const untouchedTail = \"tail-after-component\";",
  "",
].join("\n");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const locationAt = (source, offset) => ({
  line: source.slice(0, offset).split("\n").length,
  column: offset - source.lastIndexOf("\n", offset - 1) - 1,
});
const plugin = nativeModulePlugin({ root: repositoryRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === runtimeUrl) return { id: sourcePath };
    return null;
  },
  error(message) { throw new Error(String(message)); },
};

await mkdir(proofDirectory, { recursive: true });
await mkdir(path.join(proofDirectory, "sources/compiler/oxc-spike/src"), { recursive: true });
await mkdir(path.join(proofDirectory, "sources/src"), { recursive: true });
await writeFile(inputPath, authored);
try {
  const compiled = await plugin.transform.call(context, authored, inputPath);
  assert.ok(compiled && typeof compiled.code === "string", "native Vite plugin did not transform authored TSX");
  assert.ok(compiled.map, "native Vite plugin returned no composed source map");
  const code = compiled.code;
  const sourceMap = new TraceMap(compiled.map);
  assert.match(code, /ownerUpdateProgram:/, "transform omitted compiled owner update program metadata");
  assert.match(code, /__nativeBindStatePropAt\(/, "transform omitted compiled dynamic prop binding");
  assert.match(code, /data-parity/, "rewritten parity prop is absent");
  assert.match(code, /data-label/, "rewritten label prop is absent");
  assert.match(code, /\"data-tail\":\s*\"sentinel\"/, "untouched tail prop was not retained");
  assert.match(code, /untouchedTail\s*=\s*\"tail-after-component\"/, "untouched tail declaration was not retained");

  const generatedHookOffset = code.indexOf("__nativeUseStateAt(");
  const originalHookOffset = authored.indexOf("useState(4)");
  assert.notEqual(generatedHookOffset, -1, "compiled hook call missing");
  assert.notEqual(originalHookOffset, -1, "authored hook anchor missing");
  const mappedHook = originalPositionFor(sourceMap, locationAt(code, generatedHookOffset));
  assert.deepEqual(mappedHook, { source: inputPath, ...locationAt(authored, originalHookOffset), name: null }, "hook mapping lost authored TSX location");

  const generatedTagOffset = code.indexOf("jsx(\"div\"");
  const originalTagOffset = authored.indexOf("<div");
  assert.notEqual(generatedTagOffset, -1, "lowered JSX tag missing");
  assert.notEqual(originalTagOffset, -1, "authored JSX tag missing");
  const mappedTag = originalPositionFor(sourceMap, locationAt(code, generatedTagOffset));
  assert.deepEqual(mappedTag, { source: inputPath, ...locationAt(authored, originalTagOffset), name: null }, "lowered tag mapping lost authored TSX location");

  const generatedTailOffset = code.indexOf("untouchedTail = \"tail-after-component\"");
  const originalTailOffset = authored.indexOf("untouchedTail = \"tail-after-component\"");
  assert.notEqual(generatedTailOffset, -1, "untouched tail declaration missing");
  const mappedTail = originalPositionFor(sourceMap, locationAt(code, generatedTailOffset));
  assert.deepEqual(mappedTail, { source: inputPath, ...locationAt(authored, originalTailOffset), name: null }, "unchanged tail mapping drifted");

  await writeFile(outputPath, code, { flag: "wx" });
  const sourceMapJson = JSON.stringify(compiled.map, null, 2) + "\n";
  await writeFile(sourceMapPath, sourceMapJson, { flag: "wx" });
  const sourceSnapshots = {};
  for (const relativePath of compilerSources) {
    const bytes = await readFile(path.join(repositoryRoot, relativePath));
    const snapshotPath = path.join(proofDirectory, "sources", relativePath);
    await writeFile(snapshotPath, bytes, { flag: "wx" });
    sourceSnapshots[relativePath] = {
      snapshotPath,
      sha256: sha256(bytes),
      bytes: bytes.byteLength,
    };
  }
  const testBytes = await readFile(fileURLToPath(import.meta.url));
  const result = {
    schemaVersion: "derived-local-source-map-proof-v1",
    status: "PASS",
    inputPath,
    inputSha256: sha256(authored),
    compilerPath: path.join(repositoryRoot, "compiler/vite_native_plugin.ts"),
    generatedCodePath: outputPath,
    generatedCodeSha256: sha256(code),
    sourceMapPath,
    sourceMapSha256: sha256(sourceMapJson),
    testPath: fileURLToPath(import.meta.url),
    testSha256: sha256(testBytes),
    compilerSources: sourceSnapshots,
    sourceMapSources: compiled.map.sources,
    anchors: {
      hook: { generated: locationAt(code, generatedHookOffset), original: mappedHook },
      tag: { generated: locationAt(code, generatedTagOffset), original: mappedTag },
      untouchedTail: { generated: locationAt(code, generatedTailOffset), original: mappedTail },
    },
    checks: {
      ownerUpdateProgram: true,
      dynamicBinding: true,
      rewrittenProps: ["data-parity", "data-label"],
      untouchedTail: true,
      composedMap: true,
      hookMap: true,
      tagMap: true,
      tailMap: true,
    },
  };
  await writeFile(resultPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log("PASS: derived-local compiler source-map proof; " + result.generatedCodeSha256);
} catch (error) {
  const failure = {
    schemaVersion: "derived-local-source-map-proof-v1",
    status: "FAIL",
    inputPath,
    inputSha256: sha256(authored),
    error: String(error?.stack ?? error),
  };
  await writeFile(errorPath, JSON.stringify(failure, null, 2) + "\n", { flag: "wx" });
  throw error;
} finally {
  await plugin.closeBundle?.call(context);
}
