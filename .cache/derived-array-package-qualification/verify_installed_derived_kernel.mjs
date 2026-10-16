import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDirectory, "../..");
const tarball = path.join(evidenceDirectory, "compiled-ui-runtime.tgz");
const consumer = await mkdtemp(path.join(os.tmpdir(), "owner-kernel-installed-consumer-"));
const attemptId = randomUUID();
const resultPath = path.join(evidenceDirectory, "installed-owner-kernel-result.json");
const failurePath = path.join(evidenceDirectory, `installed-owner-kernel-failure-${attemptId}.json`);
const result = { status: "RUNNING", attemptId, checks: [] };
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = async (args) => {
  const child = spawnSync("pnpm", args, { cwd: consumer, encoding: "utf8", timeout: 120_000 });
  await writeFile(path.join(evidenceDirectory, "installed-kernel-consumer-install.log"),
    `pnpm ${args.join(" ")}\n${child.stdout ?? ""}\n${child.stderr ?? ""}`);
  assert.equal(child.status, 0, `${child.error ?? ""}\n${child.stdout}\n${child.stderr}`);
};

let plugin;
let rootInstance;
let oldPath;
let globalProbeName;
try {
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "owner-kernel-installed-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@compiled-ui/runtime": `file:${tarball}`,
      vite: "8.3.1",
      react: "19.3.0",
      three: "0.186.1",
    },
  }, null, 2));
  await run(["install", "--ignore-scripts"]);
  const installed = path.join(consumer, "node_modules/@compiled-ui/runtime");
  const packageManifest = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
  const compiler = path.resolve(installed, packageManifest.bin["compiled-ui-compiler"]);
  result.installedCompilerSha256 = hash(await readFile(compiler));
  result.tarballSha256 = hash(await readFile(tarball));
  const packageReport = JSON.parse(await readFile(path.join(evidenceDirectory, "package-report.json"), "utf8"));
  assert.equal(result.tarballSha256, packageReport.tarballSha256, "installed tarball matches fresh package report");
  const builtCompiler = path.join(root, ".cache/native-package-build/dist/compiler/bin", `${process.platform}-${process.arch}`, "ui-graph-compiler-spike");
  assert.equal(result.installedCompilerSha256, hash(await readFile(builtCompiler)), "installed compiler matches the fresh package binary");

  const runtimeApiPath = path.join(installed, "dist/src/native_runtime_api.js");
  const runtimeUrl = pathToFileURL(runtimeApiPath).href;
  const runtime = await import(runtimeUrl);
  const vdom = await import(pathToFileURL(path.join(installed, "dist/src/vdom_snapshot_runtime.js")).href);
  const { nativeModulePlugin } = await import(pathToFileURL(path.join(installed, "dist/compiler/vite_native_plugin.js")).href);
  assert.equal(typeof runtime.createNativeRoot, "function");
  assert.equal(typeof vdom.MemoryVDOMHost, "function");

  const blocker = path.join(consumer, "blocked-tools");
  await mkdir(blocker);
  await writeFile(path.join(blocker, "cargo"), "#!/bin/sh\necho 'Cargo must not run in installed consumer proof' >&2\nexit 97\n", { mode: 0o755 });
  oldPath = process.env.PATH;
  process.env.PATH = `${blocker}${path.delimiter}${oldPath}`;

  plugin = nativeModulePlugin();
  plugin.configResolved?.call({}, { root: consumer });
  const authoredPath = path.join(consumer, "owner-kernel-app.tsx");
  const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: 0, setValue: undefined };
export function Counter() {
  trace.renders++;
  const [value, setValue] = useState(1);
  trace.setValue = setValue;
  const parity = value % 2;
  const offset = value + 2;
  return <div data-parity={parity} style={{ left: \`${"${offset}"}px\` }} />;
}`;
  globalProbeName = `__ownerKernelCalls_${attemptId.replaceAll("-", "")}`;
  globalThis[globalProbeName] = [];
  const context = {
    addWatchFile() {},
    async resolve(specifier) {
      return specifier === runtimeUrl ? { id: runtimeApiPath } : null;
    },
    error(message) { throw new Error(String(message)); },
  };
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "installed Rust compiler transforms ordinary TSX");
  assert.match(transformed.code, /ownerUpdateProgram: __nativeOwnerCutKernels\[\d+\]/);
  assert.match(transformed.code, /schemaVersion: 2, programId:/);
  const wrappers = [...transformed.code.matchAll(/ownerUpdateProgram: (__nativeOwnerCutKernels\[\d+\])/g)];
  assert.ok(wrappers.length >= 2, "owner kernel appears in plan metadata and executable registration");
  const executableKernel = wrappers[0];
  const programExpression = executableKernel[1];
  const replacement = `ownerUpdateProgram: (() => { const program = ${programExpression}; return { ...program, executeCut(...args) { const stagedCount = program.executeCut(...args); globalThis[${JSON.stringify(globalProbeName)}].push({ argumentCount: args.length, changeCount: args[1], stagedCount }); return stagedCount; } }; })()`;
  const instrumentedCode = `${transformed.code.slice(0, executableKernel.index)}${replacement}${transformed.code.slice(executableKernel.index + executableKernel[0].length)}`;
  assert.notEqual(instrumentedCode, transformed.code, "the emitted owner program is instrumented for call evidence");
  const emittedPath = path.join(consumer, `emitted-${attemptId}.mjs`);
  await writeFile(emittedPath, instrumentedCode);
  const app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);
  const trace = app.trace;
  const host = new vdom.MemoryVDOMHost();
  const container = host.createContainer();
  rootInstance = runtime.createNativeRoot(host, container, { rootId: `installed-kernel-${attemptId}`, scheduleCommit() {} });
  rootInstance.mount(runtime.jsx(app.Counter, {}));
  const findElement = (node) => {
    if (node?.tag === "div") return node;
    for (const child of node?.children ?? []) {
      const found = findElement(child);
      if (found) return found;
    }
    return undefined;
  };
  const element = findElement(container);
  assert.ok(element, "compiled TSX mounted into the installed memory host");
  assert.equal(element.props["data-parity"], 1);
  assert.deepEqual(element.props.style, { left: "3px" });
  assert.equal(trace.renders, 1);
  result.checks.push("installed consumer mounted primitive numeric TSX in MemoryVDOMHost");

  trace.setValue(3);
  rootInstance.flush();
  const calls = globalThis[globalProbeName];
  assert.ok(calls.length > 0, "Root invoked the emitted packaged owner kernel");
  const lastCut = calls.at(-1);
  assert.equal(lastCut.argumentCount, 6, "installed Root used the v2 six-argument cut ABI");
  assert.equal(lastCut.stagedCount, 1, "equal parity sink was suppressed while the style sink changed");
  assert.equal(element.props["data-parity"], 1);
  assert.deepEqual(element.props.style, { left: "5px" });
  assert.equal(trace.renders, 1, "numeric kernel update avoided a component rerender");
  result.kernelCuts = calls;
  result.checks.push("schema-v2 owner kernel ran; equal parity output was suppressed and changed style was committed without rerender");

  const callCountBeforeEqualState = calls.length;
  trace.setValue(3);
  rootInstance.flush();
  assert.equal(calls.length, callCountBeforeEqualState, "identical state value generated no additional owner cut");
  assert.equal(trace.renders, 1);
  rootInstance.dispose();
  rootInstance = undefined;
  assert.equal(container.children.length, 0, "dispose removed the mounted subtree");
  assert.equal(calls.length, callCountBeforeEqualState, "dispose did not publish another owner cut");
  result.checks.push("equal state update was inert and dispose removed host state");
  result.status = "PASS";
  result.componentRenderCount = trace.renders;
  result.ownerUpdateProgramCalls = calls.length;
  result.ownerUpdateProgramSchemaVersion = 2;
  result.ownerUpdateProgramSinkCount = 2;
  result.compilerSource = "fresh package build; no Cargo invoked by installed consumer";
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  result.status = "FAIL";
  result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  await writeFile(failurePath, `${JSON.stringify(result, null, 2)}\n`);
  throw error;
} finally {
  rootInstance?.dispose();
  plugin?.closeBundle?.call({});
  if (oldPath !== undefined) process.env.PATH = oldPath;
  await rm(consumer, { recursive: true, force: true });
  if (globalProbeName) delete globalThis[globalProbeName];
}

console.log(JSON.stringify(result, null, 2));
