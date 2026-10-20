import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const fixtureRoot = path.join(root, "compiler/fixtures/native-runtime-origin");
const runtimePath = path.join(root, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(root, ".cache", `compiled-runtime-origin-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
let native;
try {
  await mkdir(artifact, { recursive: true });
  const authoredPath = path.join(fixtureRoot, "app.tsx");
  const wrapperPath = path.join(fixtureRoot, "my_native_runtime_api.ts");
  const authored = await readFile(authoredPath, "utf8");
  const wrapperSource = await readFile(wrapperPath, "utf8");
  const wrapperEmitted = await transformWithOxc(
    wrapperSource.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl)),
    wrapperPath, { lang: "ts" });
  const wrapperExecutablePath = path.join(artifact, "wrapper.mjs");
  await writeFile(wrapperExecutablePath, wrapperEmitted.code, { flag: "wx" });
  const wrapperUrl = pathToFileURL(wrapperExecutablePath).href;
  const context = {
    addWatchFile() {},
    error(message) { throw new Error(String(message)); },
    async resolve(specifier, importer) {
      if (specifier === "@r3act/core") return { id: runtimePath };
      if (specifier.startsWith(".")) {
        return { id: path.resolve(path.dirname(importer.split("?", 1)[0]), specifier) };
      }
      return null;
    },
  };
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "Actual public native import did not compile");
  assert.match(transformed.code, /registerCompiledSemanticPlan/);
  assert.match(transformed.code, /__nativeDefineComponent\("[^"]*#component:App"/);
  assert.match(transformed.code, /__nativeUseStateAt/);
  assert.match(transformed.code, /wrapperUse\(count\)/);
  assert.doesNotMatch(transformed.code, /__nativeUseAt\s*\(/);
  assert.doesNotMatch(transformed.code, /"hook_name"\s*:\s*"use"/);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code,
    { flag: "wx" });
  const executableSource = transformed.code
    .replace(/(["'])@r3act\/core\1/g, JSON.stringify(runtimeUrl))
    .replace(/(["'])\.\/my_native_runtime_api\.ts\1/g,
      JSON.stringify(wrapperUrl));
  const emitted = await transformWithOxc(executableSource, authoredPath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
  const executablePath = path.join(artifact, "app.mjs");
  await writeFile(executablePath, executable, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256: sha(await readFile(binary)),
    authoredSha256: sha(authored), wrapperSha256: sha(wrapperSource),
    wrapperEmittedSha256: sha(wrapperEmitted.code),
    transformedSha256: sha(transformed.code), emittedSha256: sha(executable),
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(executablePath).href);
  const wrapper = await import(wrapperUrl);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  native = createNativeRoot(host, container, {
    rootId: "compiled-runtime-origin", world: createWorld(), scheduleCommit() {},
  });
  native.mount(jsx(app.App, {}));
  const button = container.children[0];
  assert.equal(button.tag, "button");
  assert.equal(button.props["data-count"], 0);
  assert.equal(button.children.map(node => node.text ?? "").join(""), "wrapper:0");
  assert.deepEqual(wrapper.observations, { calls: 1, last: 0 });
  button.props.onClick();
  native.flush();
  assert.equal(container.children[0], button);
  assert.equal(button.props["data-count"], 1);
  assert.equal(button.children.map(node => node.text ?? "").join(""), "wrapper:1");
  assert.deepEqual(wrapper.observations, { calls: 2, last: 1 });
  native.dispose(); native = undefined;
  assert.equal(container.children.length, 0);
  console.log(JSON.stringify({ status: "PASS", artifact,
    actualCompiledExecution: true, wrapperCalls: wrapper.observations.calls }));
} finally {
  native?.dispose();
  await plugin.closeBundle?.();
}
