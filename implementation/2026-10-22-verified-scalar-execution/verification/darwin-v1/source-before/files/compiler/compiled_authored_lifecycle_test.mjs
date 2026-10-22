import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const stage = path.join(root, "implementation/2026-10-18-authored-lifecycle/workload");
const sourcePath = path.join(stage, "native_arm.tsx");
const runtimePath = path.join(root, "src/native_runtime_api.ts");
const compilerBinary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const output = path.join(root, ".cache", `compiled-authored-lifecycle-${randomUUID()}`);
const sha = (data) => createHash("sha256").update(data).digest("hex");
const plugin = nativeModulePlugin({ root, compilerBinary });
const context = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
  async resolve(id) { return id === "@r3act/core" ? { id: runtimePath } : null; },
};
const walk = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (["start", "end", "loc", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((item) => walk(item, visit));
    else if (child && typeof child === "object") walk(child, visit);
  }
};
const descendants = (node, predicate) => [ ...(predicate(node) ? [node] : []),
  ...(node.children ?? []).flatMap((child) => descendants(child, predicate)) ];
const rows = (container) => descendants(container, (node) => node.tag === "button");
const text = (node) => node.text ?? (node.children ?? []).map(text).join("");
let controller;
let primaryError;
try {
  await mkdir(output, { recursive: false });
  const source = await readFile(sourcePath, "utf8");
  await writeFile(path.join(output, "native_arm.tsx"), source, { flag: "wx" });
  const result = await plugin.transform.call(context, source, sourcePath);
  assert.ok(result?.code, "Public native import did not compile");
  await writeFile(path.join(output, "native_arm.transformed.mjs"), result.code, { flag: "wx" });
  const ast = parse(result.code, { sourceType: "module", plugins: ["typescript"] });
  const aliases = new Map();
  const replacements = [];
  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration") continue;
    for (const specifier of node.specifiers) if (specifier.type === "ImportSpecifier") {
      aliases.set(specifier.imported.name ?? specifier.imported.value, specifier.local.name);
    }
    const specifier = node.source.value;
    const resolved = specifier === "@r3act/core" ? runtimePath : specifier.startsWith(".")
      ? path.resolve(stage, specifier) : null;
    assert.ok(resolved, `Unexpected fixture import: ${specifier}`);
    replacements.push({ start: node.source.start, end: node.source.end,
      code: JSON.stringify(pathToFileURL(resolved).href), specifier, resolved });
  }
  const calls = { useAt: 0, useStateAt: 0, useEffectAt: 0, defineComponent: 0 };
  let revisionRegistrations = 0;
  walk(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
    for (const name of Object.keys(calls)) if (node.callee.name === aliases.get(name)) calls[name]++;
    if (node.callee.name === "__registerNativeSemanticPlan") revisionRegistrations++;
  });
  assert.ok(calls.useAt >= 4 && calls.useStateAt >= 1 && calls.useEffectAt >= 3);
  assert.ok(calls.defineComponent >= 7 && revisionRegistrations === 1);
  let executable = result.code;
  for (const replacement of replacements.toSorted((a, b) => b.start - a.start)) {
    executable = executable.slice(0, replacement.start) + replacement.code + executable.slice(replacement.end);
  }
  const modulePath = path.join(output, "native_arm.node.mjs");
  await writeFile(modulePath, executable, { flag: "wx" });
  await writeFile(path.join(output, "provenance.json"), JSON.stringify({
    compilerSha256: sha(await readFile(compilerBinary)), sourceSha256: sha(source),
    transformedSha256: sha(result.code), executableSha256: sha(executable), calls,
    importResolution: replacements.map(({ specifier, resolved }) => ({ specifier, resolved })),
    resolutionMeaning: "Actual public-import compilation, then explicit Node file-URL resolution to the same checkout graph. Not installed-consumer or DOM timing proof.",
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const callbacks = [];
  let scheduled = 0;
  const drain = async () => {
    for (let pass = 0; pass < 8; pass++) {
      await new Promise((done) => setTimeout(done, 0));
      while (callbacks.length) {
        assert.ok(scheduled <= 256, "Automatic work did not quiesce");
        callbacks.shift()();
      }
    }
  };
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  controller = app.mountNativeWithHost(host, container, {
    rootId: `authored-lifecycle-${randomUUID()}`,
    scheduleCommit(commit) {
      scheduled++;
      assert.ok(scheduled <= 256, "Automatic work exceeded the fixture bound");
      callbacks.push(commit);
    },
  });
  const initial = rows(container);
  assert.equal(initial.length, 256);
  assert.deepEqual(initial.map((row) => row.props["data-row"]), Array.from({ length: 256 }, (_, id) => id));
  const row0 = initial[0];
  assert.equal(typeof row0.props.onClick, "function");
  row0.props.onClick();
  await drain();
  assert.equal(row0.props["data-local"], 1);
  const assertRows = (ids, step) => {
    const actual = rows(container);
    assert.deepEqual(actual.map((row) => row.props["data-row"]), ids);
    for (const [index, row] of actual.entries()) {
      const id = ids[index], local = id === 0 ? 1 : 0;
      assert.equal(row.props["data-step"], step);
      assert.equal(row.props["data-local"], local);
      assert.equal(text(row), `${id}:${step}:${local}`);
      assert.deepEqual(row.props.style, { transform: `translateX(${(step + id) % 128}px)`,
        opacity: ((step + id) % 10 + 1) / 10 });
    }
    assert.strictEqual(actual.find((row) => row.props["data-row"] === 0), row0);
  };
  const waiting = (kind) => descendants(container, (node) => node.props?.[`data-${kind}`] === "waiting");
  for (let step = 1; step <= 60; step++) {
    controller.updateStep(step);
    assertRows(Array.from({ length: 256 }, (_, id) => id), step);
    assert.equal(waiting("detail").length, 1);
    assert.equal(waiting("health").length, 1);
  }
  controller.editRows();
  assertRows([...Array.from({ length: 254 }, (_, index) => index + 2), 256, 0], 60);
  assert.equal(controller.diagnostics().rowSetups, 257);
  assert.equal(controller.diagnostics().rowCleanups, 1);
  controller.settleDetail();
  await drain();
  const detail = descendants(container, (node) => node.props?.["data-detail"] === "ready");
  assert.equal(detail.length, 1);
  assert.equal(text(detail[0]), "detail ready");
  assert.equal(waiting("health").length, 1);
  assert.equal(controller.diagnostics().detailFallbackCleanups, 1);
  assertRows([...Array.from({ length: 254 }, (_, index) => index + 2), 256, 0], 60);
  controller.settleHealth();
  await drain();
  assert.equal(text(descendants(container, (node) => node.props?.["data-health"] === "ready")[0]), "health ready");
  const disposal = controller.dispose();
  assert.equal(container.children.length, 0);
  assert.equal(disposal.rowSetups, 257);
  assert.equal(disposal.rowCleanups, 257);
  for (const name of ["detailFallbackSetups", "detailFallbackCleanups", "healthFallbackSetups", "healthFallbackCleanups"]) {
    assert.equal(disposal[name], 1);
  }
  for (const name of ["storeListeners", "storeReaders", "ownerCount", "pendingChangeCount"]) assert.equal(disposal[name], 0);
  assert.equal(disposal.disposed, true);
  await drain();
  await writeFile(path.join(output, "result.json"), JSON.stringify({ status: "PASS", rows: 256,
    updates: 60, scheduled, disposal, preservedRowIdentity: true, independentDetailReveal: true,
    genericArrayEdit: true }, null, 2) + "\n", { flag: "wx" });
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { controller?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  await writeFile(path.join(output, "failure.json"), JSON.stringify({ status: "FAIL",
    primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" });
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Authored scene fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Authored scene fixture cleanup failed");
console.log(`PASS actual compiled authored lifecycle; provenance: ${output}`);
