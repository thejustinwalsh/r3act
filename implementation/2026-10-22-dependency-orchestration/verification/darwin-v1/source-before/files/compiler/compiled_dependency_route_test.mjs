import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { Scene } from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import {
  AsyncResource, AsyncTaskDemandScope, NativeTaskTransitionQueue, createNativeRoot,
  createStore, defineProviderDemand, definePureDerivedDemand, jsx,
} from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = process.env.COMPILER_SPIKE_BINARY ??
  path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-dependency-route-${randomUUID()}`);
const sha = value => createHash("sha256").update(value).digest("hex");
const sourcePath = path.join(rootPath, "examples/dependency-scoped/app.tsx");
const authored = await readFile(sourcePath, "utf8");
const source = authored.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find(item => !item.computed &&
    (item.key?.name ?? item.key?.value) === name)?.value : undefined;
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type)
  ? node.value : undefined;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [name, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(name)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const findNode = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node?.children ?? []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return null;
};
const deferred = () => {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
};
const drain = async () => {
  for (let turn = 0; turn < 12; turn++)
    await new Promise(resolve => setImmediate(resolve));
};

const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
const roots = [];
let queue, demandScope, three, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const fixtureSource = path.join(artifact, "authored.tsx");
  await writeFile(fixtureSource, source, { flag: "wx" });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, fixtureSource);
  assert.ok(transformed?.code, "actual Rust/OXC transform missing");
  assert.doesNotMatch(transformed.code, /\beval\s*\(|\bnew\s+Function\s*\(/);
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const emittedTasks = new Map();
  visit(ast, node => {
    if (node.type !== "CallExpression" || node.callee?.name !== "asyncTask") return;
    const id = literal(node.arguments[0]);
    const metadata = node.arguments[3];
    if (!id || !metadata) return;
    const hard = property(metadata, "hardPrerequisites")?.elements?.map(literal);
    const controls = property(metadata, "controlInputs")?.elements?.map(literal);
    emittedTasks.set(id, { hard, controls,
      revision: literal(property(metadata, "moduleRevision")) });
  });
  assert.deepEqual([...emittedTasks.keys()].sort(),
    ["navigation", "permissions", "profile", "projects", "recommendations"]);
  assert.deepEqual(emittedTasks.get("profile").hard, []);
  assert.deepEqual(emittedTasks.get("permissions").hard, []);
  assert.deepEqual(emittedTasks.get("projects").hard, ["profile"]);
  assert.deepEqual(emittedTasks.get("navigation").hard,
    ["profile", "permissions", "projects"]);
  assert.deepEqual(emittedTasks.get("recommendations").hard, []);
  assert.deepEqual(emittedTasks.get("profile").controls, ["query", "provider"]);
  assert.equal(typeof emittedTasks.get("profile").revision, "string");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, fixtureSource,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "compiled.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  assert.equal(app.profileTask.compiled.moduleRevision,
    emittedTasks.get("profile").revision);
  assert.deepEqual(app.projectsTask.dependsOn, ["profile", "$provider"]);
  const navHost = new MemoryVDOMHost(), navContainer = navHost.createContainer();
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const scene = new Scene();
  const nav = createNativeRoot(navHost, navContainer,
    { rootId: `route-nav-${randomUUID()}`, scheduleCommit() {} });
  const fork = createNativeRoot(forkHost, forkContainer,
    { rootId: `route-fork-${randomUUID()}`, scheduleCommit() {} });
  three = createThreeNativeRoot(scene,
    { rootOptions: { rootId: `route-three-${randomUUID()}`, scheduleCommit() {} } });
  roots.push(nav, fork);
  const urgent = createStore(0), query = createStore("B");
  const initialNav = new AsyncResource(Promise.resolve({ query: "A",
    label: "Initial", projectCount: 0 }));
  const initialRecommendations = new AsyncResource(Promise.resolve({
    query: "A", label: "Initial",
  }));
  const navTree = resource => jsx(app.NavigationApp, { resource, urgent });
  const recTree = resource => jsx(app.RecommendationsApp, { resource, urgent });
  const threeTree = resource => jsx(app.ThreeApp, { resource, urgent });
  nav.mount(navTree(initialNav)); fork.mount(recTree(initialRecommendations));
  three.root.mount(threeTree(initialNav));
  const oldAccepted = nav.snapshot, oldBytes = JSON.stringify(oldAccepted);
  const trace = [], pending = new Map();
  const start = (kind, key, signal) => {
    trace.push({ kind, key, event: "start" });
    signal.addEventListener("abort", () => trace.push({ kind, key, event: "abort" }),
      { once: true });
    const request = deferred();
    const id = `${kind}:${key}`;
    pending.set(id, [...(pending.get(id) ?? []), request]);
    return request.promise;
  };
  const provider = Object.freeze({
    profile: (key, signal) => start("profile", key, signal),
    permissions: (key, signal) => start("permissions", key, signal),
    projects: (key, signal) => start("projects", key, signal),
    recommendations: (key, signal) => start("recommendations", key, signal),
  });
  const resolve = (kind, key, value) => {
    trace.push({ kind, key, event: "resolve" });
    const id = `${kind}:${key}`;
    assert.ok(pending.has(id), `missing started ${id}`);
    for (const request of pending.get(id)) request.resolve(value);
    pending.delete(id);
  };
  const revision = app.profileTask.compiled.moduleRevision;
  const identities = { profile: {}, permissions: {}, projects: {},
    navigation: {}, recommendations: {} };
  const captured = value => Object.freeze({ identity: value, version: 0, value });
  const providerCapture = captured(provider);
  const queryCaptures = inputs => Object.freeze([providerCapture,
    captured(String(inputs.get("$query")))]);
  let navigationDerivations = 0;
  const demands = new Map([
    ["profile", { definition: defineProviderDemand(identities.profile, revision,
      (values, signal) => provider.profile(String(values[1].value), signal)),
      captures: queryCaptures }],
    ["permissions", { definition: defineProviderDemand(identities.permissions, revision,
      (values, signal) => provider.permissions(String(values[1].value), signal)),
      captures: queryCaptures }],
    ["projects", { definition: defineProviderDemand(identities.projects, revision,
      (values, signal) => provider.projects(values[1].value.accountId, signal)),
      captures: inputs => Object.freeze([providerCapture, captured(inputs.get("profile"))]) }],
    ["navigation", { definition: definePureDerivedDemand(identities.navigation, revision,
      values => {
        navigationDerivations++;
        return app.deriveNavigation(values[0].value, values[1].value, values[2].value);
      }),
      captures: inputs => Object.freeze([captured(inputs.get("profile")),
        captured(inputs.get("permissions")), captured(inputs.get("projects"))]) }],
    ["recommendations", { definition: defineProviderDemand(identities.recommendations,
      revision, (values, signal) =>
        provider.recommendations(String(values[1].value), signal)),
      captures: queryCaptures }],
  ]);
  demandScope = new AsyncTaskDemandScope();
  queue = new NativeTaskTransitionQueue();
  const options = { renderPreparation: "repeatable", inputs: { "$provider": provider },
    liveInputs: { "$query": query }, demandScope, demands };
  const route = queue.enqueue(app.routeTasks, [
    { root: nav, buildTree: execution => navTree(execution.resource("navigation")) },
    { root: three.root, buildTree: execution =>
      threeTree(execution.resource("navigation")) },
    { root: fork, buildTree: execution =>
      recTree(execution.resource("recommendations")) },
  ], { ...options, reveal: "independent", id: "route-B" });
  await drain();
  const starts = kind => trace.filter(item => item.kind === kind && item.event === "start");
  assert.equal(starts("profile").length, 1, "two roots must share profile request");
  assert.equal(starts("permissions").length, 1);
  assert.equal(starts("projects").length, 0, "unknown account key must wait");
  assert.equal(starts("recommendations").length, 1);
  resolve("profile", "B", Object.freeze({ query: "B", accountId: "account-B",
    name: "Bea" }));
  await drain();
  assert.equal(starts("projects").length, 1);
  resolve("permissions", "B", Object.freeze({ query: "B", level: "editor" }));
  resolve("projects", "account-B", Object.freeze({ accountId: "account-B",
    titles: Object.freeze(["one", "two"]) }));
  await drain();
  const navNode = findNode(navContainer, node => node.props?.["data-navigation"] === "B");
  assert.ok(navNode, "ready navigation must reveal while recommendations wait");
  assert.equal(navNode.props["data-project-count"], 2);
  assert.equal(findNode(forkContainer,
    node => node.props?.["data-recommendations"] === "B"), null);
  assert.match(scene.children[0]?.name ?? "", /navigation-B-2-urgent-0/);
  assert.equal(navigationDerivations, 1, "pure navigation must derive once");
  assert.equal(route.status, "pending", "slow sibling keeps the parent operation pending");
  assert.equal(JSON.stringify(oldAccepted), oldBytes,
    "older accepted snapshot must remain immutable");
  urgent.dispatch(1);
  nav.flush(); fork.flush(); three.root.flush();
  assert.ok(findNode(navContainer, node => node.props?.["data-urgent"] === 1),
    "urgent Store work must progress during slow recommendations");
  assert.ok(findNode(forkContainer, node => node.props?.["data-urgent"] === 1));
  assert.match(scene.children[0]?.name ?? "", /urgent-1/);
  route.cancel("retire pending fork");
  await drain();
  assert.equal(trace.filter(item => item.kind === "recommendations" &&
    item.event === "abort").length, 1);
  const forkAccepted = JSON.stringify(fork.snapshot);
  resolve("recommendations", "B", Object.freeze({ query: "B", label: "late" }));
  await drain();
  assert.equal(JSON.stringify(fork.snapshot), forkAccepted,
    "late result must not reach retired fork host");
  assert.equal(demandScope.size, 0, "settled and cancelled interests must evict");
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    compilerSha256: sha(await readFile(binary)), authoredSha256: sha(authored),
    transformedSha256: sha(transformed.code), taskIds: [...emittedTasks.keys()],
    assertions: ["compiled hard/control edges", "shared request and pure navigation",
      "unknown project key wait", "independent reveal", "urgent progress",
      "old snapshot", "fork cancellation", "late result quarantine", "bounded eviction",
      "CSP-safe transformed source"],
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled dependency route; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanup = [];
for (const root of roots.reverse()) {
  try { root.dispose(); } catch (error) { cleanup.push(error); }
}
for (const dispose of [() => queue?.dispose(), () => demandScope?.dispose(),
  () => three?.dispose(), () => plugin.closeBundle()]) {
  try { await dispose(); } catch (error) { cleanup.push(error); }
}
if (primaryError && cleanup.length) throw new AggregateError([primaryError, ...cleanup],
  "Compiled dependency route and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanup.length) throw new AggregateError(cleanup, "Compiled dependency route cleanup failed");
