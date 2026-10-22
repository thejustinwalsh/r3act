import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-realtime-store-progress-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from ${JSON.stringify(runtime)};
export const clock = createStore(storeRecord({ phase: 0 }));
export const control = createStore(storeRecord({ ids: ["a", "b", "c"] }));
export function Motion(props) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * 2}>{props.children}</group>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * 3}>{props.children}</group>;
}
export function Marker(props) {
  const frame = use(props.clock);
  return <group key="frame-marker" name="accepted-frame" position-x={frame.phase} />;
}
export function Scene(props) {
  const state = use(props.control);
  return <group key="scene">
    <Marker key="marker-owner" clock={props.clock} />
    {state.ids.map(id => <section key={"slot-" + id} name={"slot-" + id}>
      {id === "b" || id === "d"
        ? <Alternate key={"owner-" + id} clock={props.clock}>
            <mesh key={"child-" + id} name={"retained-" + id} />
          </Alternate>
        : <Motion key={"owner-" + id} clock={props.clock}>
            <mesh key={"child-" + id} name={"retained-" + id} />
          </Motion>}
    </section>)}
  </group>;
}`;
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find(item => !item.computed && (item.key?.name ?? item.key?.value) === name)?.value
  : undefined;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [name, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(name)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
class ObservingHost extends MemoryVDOMHost {
  onWrite;
  setProp(node, name, value, previous) {
    super.setProp(node, name, value, previous);
    if (name === "position-x") this.onWrite?.();
  }
}
const roots = [];
let plugin, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourcePath);
  assert.ok(transformed?.code);
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  visit(ast, node => {
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const name = node.arguments[0]?.value?.split("#component:").at(-1);
    if (name) registrations.set(name, node.arguments[2]);
  });
  assert.deepEqual([...registrations.keys()].sort(), ["Alternate", "Marker", "Motion", "Scene"]);
  assert.equal(property(registrations.get("Scene"), "closedStoreHostProgram"), undefined,
    "dynamic control Store array parent must remain generic");
  assert.equal(property(registrations.get("Scene"), "closedStoreExecution"), undefined);
  for (const name of ["Motion", "Alternate", "Marker"]) {
    const metadata = registrations.get(name);
    const program = property(metadata, "closedStoreHostProgram");
    const execution = property(metadata, "closedStoreExecution");
    assert.ok(program && execution, `${name} must be actual compiler-selected closed output`);
    assert.equal(property(property(program, "host"), "key")?.value,
      name === "Marker" ? "frame-marker" : "motion");
    assert.equal(property(execution, "schemaVersion")?.value, 2);
    assert.equal(property(execution, "numericKernel")?.type, "ArrowFunctionExpression");
  }
  assert.equal(property(property(registrations.get("Marker"), "closedStoreHostProgram"),
    "schemaVersion")?.value, 5);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "compiled.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const make = label => {
    const host = new ObservingHost(), container = host.createContainer(), counters = {};
    const root = createNativeRoot(host, container, {
      rootId: `${label}-${randomUUID()}`, scheduleCommit() {},
      profileCounter(batch) {
        for (const [name, count] of Object.entries(batch))
          counters[name] = (counters[name] ?? 0) + count;
      },
    });
    roots.push(root);
    root.mount(jsx(app.Scene, { control: app.control, clock: app.clock }));
    return { root, host, container, counters,
      reset() { for (const name of Object.keys(counters)) delete counters[name]; } };
  };
  const first = make("progress-primary"), second = make("progress-fork");
  const scene = instance => instance.container.children[0];
  const marker = instance => scene(instance).children[0];
  const slots = instance => scene(instance).children.slice(1);
  const ids = instance => slots(instance).map(slot => slot.props.name.slice("slot-".length));
  const motion = instance => new Map(slots(instance).map(slot => [
    slot.props.name.slice("slot-".length), slot.children[0],
  ]));
  const snapshotEpoch = instance => instance.root.snapshot[0].children[0].props["position-x"];
  const assertCurrent = (instance, expectedIds, phase) => {
    assert.deepEqual(ids(instance), expectedIds);
    assert.equal(marker(instance).props.name, "accepted-frame");
    assert.equal(marker(instance).props["position-x"], phase);
    assert.equal(snapshotEpoch(instance), phase);
    const targets = motion(instance);
    for (const id of expectedIds) {
      assert.equal(targets.get(id).props["position-x"], phase * (["b", "d"].includes(id) ? 3 : 2));
      assert.equal(targets.get(id).children[0].props.name, `retained-${id}`);
    }
  };
  let phase = 0;
  assertCurrent(first, ["a", "b", "c"], 0);
  assertCurrent(second, ["a", "b", "c"], 0);
  const original = motion(first);
  const originalChildren = new Map([...original].map(([id, node]) => [id, node.children[0]]));
  const forkAccepted = JSON.stringify(second.root.snapshot);
  for (let frame = 0; frame < 3; frame++) {
    const nextPhase = ++phase;
    first.reset(); app.clock.dispatch(() => storeRecord({ phase: nextPhase }));
    assert.equal(first.root.flush(), true);
    assert.equal(first.counters["owner.component-renders"] ?? 0, 0,
      "unchanged opaque control subscription must not render on a closed clock frame");
    assert.equal(first.counters["store.owned-data.verified-rows"], 4);
    assertCurrent(first, ["a", "b", "c"], phase);
    for (const [id, node] of original) {
      assert.equal(motion(first).get(id), node);
      assert.equal(node.children[0], originalChildren.get(id));
    }
  }
  assert.equal(JSON.stringify(second.root.snapshot), forkAccepted,
    "a second root must keep its own accepted Store history until it flushes");
  assertCurrent(second, ["a", "b", "c"], 0);
  const settledSnapshot = first.root.snapshot, settledBytes = JSON.stringify(settledSnapshot);
  const changeControl = expectedIds => {
    const before = motion(first);
    const beforeChildren = new Map([...before].map(([id, node]) => [id, node.children[0]]));
    app.control.dispatch(() => storeRecord({ ids: expectedIds }));
    let published = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const nextPhase = ++phase;
      app.clock.dispatch(() => storeRecord({ phase: nextPhase }));
      assert.equal(first.root.flush(), true, "fresh clock work must make publication progress");
      if (JSON.stringify(ids(first)) === JSON.stringify(expectedIds)) {
        published = true;
        assertCurrent(first, expectedIds, phase);
        break;
      }
    }
    assert.equal(published, true, `control Store must publish within four live-clock flushes: ${expectedIds}`);
    for (const id of expectedIds) if (before.has(id)) {
      const node = motion(first).get(id);
      assert.equal(node, before.get(id), `keyed owner ${id} must retain host identity`);
      assert.equal(node.children[0], beforeChildren.get(id), `authored child ${id} must retain identity`);
    }
    for (const id of before.keys()) if (!expectedIds.includes(id))
      assert.equal(motion(first).has(id), false, `removed owner ${id} must leave the host`);
  };
  changeControl(["a", "c"]);
  assert.equal(JSON.stringify(settledSnapshot), settledBytes, "saved accepted snapshot must stay immutable");
  const removedB = original.get("b");
  changeControl(["a", "c", "d"]);
  changeControl(["d", "c", "a"]);
  changeControl(["d", "c", "a", "b"]);
  assert.notEqual(motion(first).get("b"), removedB, "reinserted owner must have a new target");
  changeControl(["c", "a", "b"]);
  assert.deepEqual(ids(second), ["a", "b", "c"]);
  assert.equal(JSON.stringify(second.root.snapshot), forkAccepted);
  const afterControls = motion(first);
  const settledPhase = ++phase;
  first.reset(); app.clock.dispatch(() => storeRecord({ phase: settledPhase }));
  assert.equal(first.root.flush(), true);
  assert.equal(first.counters["owner.component-renders"] ?? 0, 0,
    "settled structural state must return to the closed frame path");
  assert.equal(first.counters["store.owned-data.verified-rows"], 4);
  assertCurrent(first, ["c", "a", "b"], phase);
  for (const [id, node] of afterControls) assert.equal(motion(first).get(id), node);
  const admittedPhase = ++phase;
  first.host.onWrite = () => {
    first.host.onWrite = undefined;
    app.clock.dispatch(() => storeRecord({ phase: admittedPhase + 1 }));
  };
  app.clock.dispatch(() => storeRecord({ phase: admittedPhase }));
  assert.equal(first.root.flush(), true);
  assertCurrent(first, ["c", "a", "b"], admittedPhase);
  assert.equal(first.root.flush(), true);
  assertCurrent(first, ["c", "a", "b"], admittedPhase + 1);
  phase = admittedPhase + 1;
  let forkPublished = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    const nextPhase = ++phase;
    app.clock.dispatch(() => storeRecord({ phase: nextPhase }));
    assert.equal(second.root.flush(), true);
    if (JSON.stringify(ids(second)) === JSON.stringify(["c", "a", "b"])) {
      forkPublished = true;
      assertCurrent(second, ["c", "a", "b"], phase);
      break;
    }
  }
  assert.equal(forkPublished, true, "fork must independently catch up to control and clock Stores");
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    compilerSha256: sha(await readFile(binary)), sourceSha256: sha(source),
    transformedSha256: sha(transformed.code),
    assertions: ["actual generic control parent and schema2 closed clock children",
      "bounded structural progress under continuous clock dispatch", "keyed target and child lifetime",
      "settled clock-only zero owner renders", "exact newer host-time action", "independent root history"],
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS actual compiled realtime Store progress; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanup = [];
for (const root of roots.reverse()) {
  try { root.dispose(); } catch (error) { cleanup.push(error); }
}
try { await plugin?.closeBundle(); } catch (error) { cleanup.push(error); }
if (primaryError && cleanup.length) throw new AggregateError([primaryError, ...cleanup],
  "Compiled realtime Store progress and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanup.length) throw new AggregateError(cleanup, "Compiled realtime Store progress cleanup failed");
