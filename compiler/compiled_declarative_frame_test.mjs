import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { normalizeClosedStoreHostProgram } from "../src/closed_store_host_program.ts";
import { inspectClosedStoreDataExecution, normalizeClosedStoreDataExecution } from "../src/closed_store_execution.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-declarative-frame-${randomUUID()}`);
const sha = value => createHash("sha256").update(value).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, useFrame, useState, Suspense } from ${JSON.stringify(runtimeUrl)};
export const trace = { callbacks: [], renders: 0, captures: [], topologyRenders: 0 };
export function ClockProp(props) {
  const frame = useFrame();
  return <div key="clock" data-phase={(frame.elapsed + frame.delta) * props.speed}
    data-time={frame.timeMs + frame.deltaMs}>{props.children}</div>;
}
export function ClockMesh(props) {
  const frame = useFrame();
  return <group key="clock" name="clock-mesh" rotation-y={frame.elapsed * 0.25}
    rotation-z={frame.delta * 0.5}>{props.children}</group>;
}
export function NamedMarker() {
  const frame = useFrame();
  return <group key="named-marker" name="accepted-frame" position-x={frame.timeMs} />;
}
export function FrameState() {
  const frame = useFrame();
  const [position, setPosition] = useState(0);
  useFrame(tick => setPosition(previous => previous + tick.delta), [], { phase: "late" });
  return <group key="frame-state" name="frame-state" position-x={frame.elapsed + position} />;
}
export function StateClock(props) {
  const frame = useFrame();
  const [count] = useState(1);
  return <div key="mixed" data-mixed={frame.elapsed * props.speed + count} />;
}
export function Destructured(props) {
  const { elapsed: seconds, delta: step } = useFrame();
  return <div key="destructured" data-destructured={(seconds + step) * props.speed} />;
}
export function Stateful(props) {
  trace.renders++;
  const [count, setCount] = useState(0);
  useFrame((frame) => {
    trace.callbacks.push([props.id, props.multiplier, frame.timeMs]);
    setCount(previous => previous + props.multiplier);
  }, [props.id, props.multiplier], { phase: "update", priority: 2 });
  return <div key="state" data-count={count} />;
}
export function Mover(props) {
  const [position, setPosition] = useState(0);
  useFrame(frame => setPosition(previous => previous + frame.delta * props.velocity),
    [props.velocity], { id: "mover", phase: "update", priority: 3,
      before: [], after: [] });
  return <div key="mover" data-position={position} />;
}
export function Structural(props) {
  trace.renders++;
  const frame = useFrame();
  return frame.elapsed < 1 ? <span key="early" data-time={frame.timeMs} />
    : <span key="late" data-time={frame.timeMs} />;
}
export function MixedTopology() {
  trace.topologyRenders++;
  const frame = useFrame();
  return <section key="topology"><ClockMesh key="stable" />
    <ClockMesh key="empty-null">{null}</ClockMesh>
    <ClockMesh key="empty-false">{false}</ClockMesh><FrameState key="frame-state" />{frame.elapsed < .02
    ? <ClockProp key="changing" speed={frame.elapsed < .01 ? 1 : 2} />
    : frame.elapsed < .04
    ? <Suspense fallback={null}><ClockProp key="changing" speed={3} /></Suspense>
    : <span key="gone" />}</section>;
}
export function Capture(props) {
  const callback = frame => trace.captures.push([props.label, frame.timeMs]);
  useFrame(callback, [props.label], { priority: 1 });
  return <div key="capture" data-label={props.label} />;
}
export function App(props) {
  return <section key="app"><ClockProp key="a" speed={2}><Stateful key="state-a" id="a" multiplier={1} /></ClockProp>
    <ClockProp key="b" speed={props.secondSpeed}><Stateful key="state-b" id="b" multiplier={2} /></ClockProp>
    <ClockMesh key="mesh" /><NamedMarker key="named-marker" /><StateClock key="mixed" speed={5} />
    <Destructured key="destructured" speed={7} />
    <Mover key="mover" velocity={props.moverVelocity} />
    <Structural key="structural" /><Capture key="capture" label={props.label} /></section>;
}`;

const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find(item => !item.computed && (item.key?.name ?? item.key?.value) === name)?.value ?? null
  : null;
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let primaryError, root, stopLoop;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform must emit a native module");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map(), frameCalls = [], plans = [];
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan") plans.push(node);
    if (node.type === "CallExpression" && /^__nativeUseFrameAt_*$/.test(node.callee?.name ?? ""))
      frameCalls.push(node);
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (id) registrations.set(id.split("#component:").at(-1), { id, metadata: node.arguments[2] });
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const callSites = frameCalls.map(call => literal(call.arguments[0]));
  assert.equal(callSites.length, 12);
  assert.equal(new Set(callSites).size, 12);
  for (const name of ["ClockProp", "ClockMesh", "StateClock", "Destructured", "Stateful", "Mover", "Structural", "Capture", "MixedTopology", "NamedMarker", "FrameState"]) {
    assert.ok(callSites.some(site => site?.includes(`#component:${name}#frame:0`)));
  }
  assert.equal(frameCalls.filter(call => call.arguments.length === 1).length, 8);
  assert.equal(frameCalls.filter(call => call.arguments.length === 4).length, 4);
  for (const name of ["ClockProp", "ClockMesh", "StateClock", "Destructured", "NamedMarker", "FrameState"]) {
    const registration = registrations.get(name);
    assert.ok(registration);
    const programNode = property(registration.metadata, "closedStoreHostProgram");
    const executionNode = property(registration.metadata, "closedStoreExecution");
    assert.ok(programNode && executionNode, `${name} requires actual closed Store execution`);
    const program = Function(`"use strict"; return (${transformed.code.slice(programNode.start, programNode.end)});`)();
    const execution = Function(`"use strict"; return (${transformed.code.slice(executionNode.start, executionNode.end)});`)();
    assert.equal(program.schemaVersion, name === "ClockMesh" ? 6 : name === "NamedMarker" ? 5 : name === "FrameState" ? 7 : 8);
    if (name !== "ClockMesh" && name !== "NamedMarker" && name !== "FrameState") assert.deepEqual(program.propInputs, ["speed"]);
    if (name === "StateClock" || name === "FrameState") assert.equal(program.stateSites.length, 1);
    if (name === "FrameState") assert.deepEqual(program.effectSites,
      [`${registration.id}#frame:1`], "the retained callback shares the existing effect authority");
    assert.equal(program.componentProgramId, registration.id);
    assert.equal(program.moduleRevision, revision);
    assert.equal(program.inputs.length, 1);
    assert.equal(program.inputs[0].sourceKind, "frameClock");
    assert.equal(program.inputs[0].storeProp, "$frameClock");
    assert.ok(program.inputs[0].storeUseSiteId.includes(`#component:${name}#frame:0`));
    assert.ok(program.inputs[0].paths.length >= (name === "StateClock" || name === "NamedMarker" || name === "FrameState" ? 1 : 2));
    assert.ok(program.inputs[0].paths.every(path => path.length === 1 &&
      ["elapsed", "delta", "timeMs", "deltaMs"].includes(path[0])));
    if (name === "Destructured") assert.deepEqual(program.inputs[0].paths,
      [["elapsed"], ["delta"]]);
    const normalized = normalizeClosedStoreHostProgram(program);
    assert.ok(normalized, `${name} clock program must normalize`);
    const owned = normalizeClosedStoreDataExecution(execution, normalized);
    assert.equal(inspectClosedStoreDataExecution(owned)?.mode, "verified-batch");
    assert.equal(typeof execution.batchKernel, "function");
  }
  for (const name of ["Stateful", "Structural", "Capture", "MixedTopology"]) {
    assert.equal(property(registrations.get(name)?.metadata, "closedStoreHostProgram"), null,
      `${name} must preserve generic owner and callback semantics`);
  }
  assert.ok(property(registrations.get("Mover")?.metadata, "ownerUpdateProgram"),
    "callback plus local state must retain the existing compiled owner update program");
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const outputPath = path.join(artifact, "compiled.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  assert.equal(typeof app.App, "function", "actual compiled module must load");
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const counters = {};
  root = createNativeRoot(host, container, { rootId: `frame-${randomUUID()}`,
    scheduleCommit() {}, profileCounter(frame) {
      for (const [name, count] of Object.entries(frame)) counters[name] = (counters[name] ?? 0) + count;
    } });
  root.mount(jsx(app.App, { label: "first", secondSpeed: 3, moverVelocity: 10 }));
  const nodes = (node, result = []) => {
    result.push(node);
    for (const child of node.children ?? []) nodes(child, result);
    return result;
  };
  const findAll = predicate => nodes(container).filter(predicate);
  const clockHosts = findAll(node => node.props?.["data-phase"] !== undefined);
  assert.equal(clockHosts.length, 2);
  const stateHosts = findAll(node => node.props?.["data-count"] !== undefined);
  assert.equal(stateHosts.length, 2);
  const moverHost = findAll(node => node.props?.["data-position"] !== undefined)[0];
  assert.ok(moverHost);
  let nextRaf, nextId = 0, draws = 0;
  stopLoop = root.mountFrameLoop({ draw() { draws++; },
    requestFrame(callback) { nextRaf = callback; return ++nextId; },
    cancelFrame(id) { assert.ok(id > 0); } });
  const frame = timeMs => {
    const callback = nextRaf;
    assert.equal(typeof callback, "function");
    nextRaf = undefined;
    callback(timeMs);
  };
  frame(1000);
  assert.equal(draws, 1);
  assert.equal(app.trace.callbacks.length, 2);
  assert.deepEqual(app.trace.captures, [["first", 1000]]);
  assert.deepEqual(stateHosts.map(node => node.props["data-count"]), [1, 2]);
  frame(1016);
  assert.equal(draws, 2);
  assert.equal(findAll(node => node.props?.name === "accepted-frame")[0]
    ?.props["position-x"], 1016, "named no-props clock owner keeps direct output current");
  assert.deepEqual(stateHosts.map(node => node.props["data-count"]), [2, 4]);
  assert.equal(moverHost.props["data-position"], 0.16);
  assert.ok((counters["numeric.compiled-site-cache-constructions"] ?? 0) >= 1,
    "callback-driven local state must enter the compiled direct prop path");
  assert.ok(nodes(container).includes(moverHost),
    "callback-driven direct prop updates retain the mounted host");
  assert.deepEqual(clockHosts.map(node => node.props["data-phase"]), [0.064, 0.096]);
  assert.deepEqual(clockHosts.map(node => node.props["data-time"]), [1032, 1032]);
  assert.equal(findAll(node => node.props?.["data-mixed"] !== undefined)[0]?.props["data-mixed"], 1.08);
  assert.equal(findAll(node => node.props?.["data-destructured"] !== undefined)[0]
    ?.props["data-destructured"], 0.224);
  assert.ok(clockHosts.every(node => nodes(container).includes(node)),
    "clock hosts and their retained children must survive scalar ticks");
  assert.ok((counters["store.owned-data.rows"] ?? 0) >= 2,
    "clock props must execute the owned numeric batch, not only generic rerenders");
  root.update(jsx(app.App, { label: "second", secondSpeed: 4, moverVelocity: 20 }));
  frame(2000);
  assert.equal(findAll(node => node.props?.["data-position"] !== undefined)[0]
    ?.props["data-position"], 1.16,
    "changed explicit velocity dependency refreshes the accepted callback capture");
  assert.deepEqual(app.trace.captures.at(-1), ["second", 2000],
    "changed explicit dependency refreshes accepted callback capture");
  assert.deepEqual(clockHosts.map(node => node.props["data-time"]), [2050, 2050],
    "clock time includes the clamped 50ms delta after a long RAF gap");
  assert.deepEqual(clockHosts.map(node => node.props["data-phase"]), [2.1, 4.2],
    "accepted varying prop refreshes the mounted batch input");
  assert.equal(findAll(node => node.props?.["data-time"] === 0).length, 0);
  assert.ok(findAll(node => node.props?.["data-time"] === 2000).some(node =>
    node.tag === "span"), "structural clock branch reaches generic reconciliation");
  stopLoop(); stopLoop = null;
  root.dispose(); root = null;
  const topologyContainer = host.createContainer(), topologyCounters = {};
  root = createNativeRoot(host, topologyContainer, {
    rootId: `frame-topology-${randomUUID()}`, scheduleCommit() {},
    profileCounter(frame) {
      for (const [name, count] of Object.entries(frame))
        topologyCounters[name] = (topologyCounters[name] ?? 0) + count;
    },
  });
  root.mount(jsx(app.MixedTopology, {}));
  stopLoop = root.mountFrameLoop({ draw() {},
    requestFrame(callback) { nextRaf = callback; return ++nextId; },
    cancelFrame() {},
  });
  const topologyClock = () => nodes(topologyContainer).find(node =>
    node.props?.["data-phase"] !== undefined);
  frame(1000);
  const firstTopologyClock = topologyClock();
  assert.ok(firstTopologyClock);
  const topologyRenders = app.trace.topologyRenders;
  const componentRenders = topologyCounters["owner.component-renders"] ?? 0;
  frame(1016);
  assert.equal(topologyClock(), firstTopologyClock);
  assert.equal(topologyClock().props["data-phase"], .064,
    "opaque parent prop change must replace the staged old prop input");
  assert.equal(nodes(topologyContainer).find(node => node.props?.name === "frame-state")
    ?.props["position-x"], .032,
    "zero-argument clock and callback state share the compiled numeric cut");
  assert.equal(app.trace.topologyRenders, topologyRenders + 1,
    "mixed fallback must execute an opaque owner only once");
  assert.equal((topologyCounters["owner.component-renders"] ?? 0) - componentRenders, 2,
    "empty retained children keep numeric owners out of generic render execution");
  assert.ok((topologyCounters["store.owned-data.rows"] ?? 0) > 0,
    "stable numeric sibling remains batched alongside structural updates");
  frame(1032);
  assert.notEqual(topologyClock(), firstTopologyClock);
  assert.ok(Math.abs(topologyClock().props["data-phase"] - .144) < 1e-12,
    "new Suspense scope must use the new child and props");
  frame(1048);
  assert.equal(topologyClock(), undefined, "retired staged child must stay removed");
  assert.equal(app.trace.topologyRenders, topologyRenders + 3);
  stopLoop(); stopLoop = null; root.dispose(); root = null;
  const moverContainer = host.createContainer(), moverCounters = {};
  root = createNativeRoot(host, moverContainer, {
    rootId: `frame-mover-${randomUUID()}`, scheduleCommit() {},
    profileCounter(frame) {
      for (const [name, count] of Object.entries(frame)) {
        moverCounters[name] = (moverCounters[name] ?? 0) + count;
      }
    },
  });
  root.mount([jsx(app.Mover, { velocity: 10 }), jsx(app.NamedMarker, {})]);
  let isolatedDraws = 0, cancelledFrames = 0;
  stopLoop = root.mountFrameLoop({ draw() { isolatedDraws++; },
    requestFrame(callback) { nextRaf = callback; return ++nextId; },
    cancelFrame() { cancelledFrames++; },
  });
  for (const key of Object.keys(moverCounters)) delete moverCounters[key];
  const moverPublication = root.publicationVersion;
  frame(1000);
  frame(1016);
  assert.equal(moverContainer.children[0].props["data-position"], 0.16);
  assert.equal(moverCounters["owner.component-renders"] ?? 0, 0,
    "actual compiled frame callback must update state props without rendering Mover");
  assert.equal(moverCounters["store.mounted-frame.direct-cuts"], 2,
    "clock plus callback-only state must use one joint mounted cut per tick");
  assert.equal(root.publicationVersion, moverPublication + 2,
    "clock and callback state publish once together per tick");
  assert.equal(moverContainer.children[1].props["position-x"], 1016);
  const alternatePath = path.join(artifact, "revision.tsx");
  const alternateSource = source.replace("data-phase={(frame.elapsed + frame.delta) * props.speed}",
    "data-phase={(frame.elapsed + frame.delta) * props.speed + 1}");
  await writeFile(alternatePath, alternateSource, { flag: "wx" });
  const revisionModule = await plugin.transform.call(context, alternateSource, sourcePath);
  assert.ok(revisionModule?.code);
  const revisionAst = parse(revisionModule.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const nextPlans = [];
  visit(revisionAst, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan") nextPlans.push(node);
  });
  assert.equal(nextPlans.length, 1);
  assert.notEqual(literal(property(nextPlans[0].arguments[0], "module_revision")), revision);
  const revised = await transformWithOxc(revisionModule.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const revisionOutput = path.join(artifact, "revision-compiled.mjs");
  await writeFile(revisionOutput, revised.code, { flag: "wx" });
  const staleFrame = nextRaf;
  await import(pathToFileURL(revisionOutput).href);
  assert.equal(root.retired, true, "actual compiler revision retires old frame interests");
  assert.equal(cancelledFrames, 1, "revision retirement cancels the owned RAF");
  staleFrame(1032);
  assert.equal(isolatedDraws, 2, "old scheduled callbacks cannot draw after retirement");
  assert.equal(moverContainer.children[0].props["data-position"], 0.16);
  stopLoop(); stopLoop = null;
  root.dispose(); root = null;
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    compilerSha256: sha(await readFile(binary)), sourceSha256: sha(source),
    transformedSha256: sha(transformed.code), revision,
    assertions: { actualCompiledClockProps: true, emittedCrossInstanceBatch: true,
      callbackAndDependencyLowering: true, localStateAndStructuralFallback: true,
      stableSitesAndRevision: true, mountedFrameDelivery: true },
    boundary: "Deterministic host delivery; natural RAF freshness and presentation remain separate proof." },
  null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled declarative frame provenance: ${artifact}`);
} catch (error) { primaryError = error; }
let cleanupError;
try { stopLoop?.(); } catch (error) { cleanupError = error; }
try { root?.dispose(); } catch (error) { cleanupError = cleanupError
  ? new AggregateError([cleanupError, error], "Frame fixture cleanup failed") : error; }
try { await plugin.closeBundle(); } catch (error) { cleanupError = error; }
if (primaryError && cleanupError) throw new AggregateError([primaryError, cleanupError],
  "Compiled declarative frame fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupError) throw cleanupError;
