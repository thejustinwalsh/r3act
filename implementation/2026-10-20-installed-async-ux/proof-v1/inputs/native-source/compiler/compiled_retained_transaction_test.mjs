import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";

const projectRoot = path.resolve(".");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `import { useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { controls: {}, activations: 0 };
export function Scene() {
  const [position, setPosition] = useState(1);
  const [camera, setCamera] = useState(10);
  const [health, setHealth] = useState(100);
  useEffect(() => { trace.controls = { position: setPosition, camera: setCamera, health: setHealth }; trace.activations++; });
  return <output data-position={position} data-joint={position + camera}
    data-conditional={position ? camera : 0} data-label={\`x=\${position}\`}
    data-health={health} />;
}`;
const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl
      ? { id: path.join(projectRoot, "src/native_runtime_api.ts") }
      : null;
  },
  error(message) { throw new Error(String(message)); },
};
const attempt = `${Date.now()}-${randomUUID()}`;
const directory = path.join(projectRoot, ".cache/compiled-retained-transaction");
let root;
let restoreHookObserver = () => {};
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, `scene-${attempt}.tsx`);
  const outputPath = path.join(directory, `scene-${attempt}.mjs`);
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "ordinary TSX compiles through Rust/OXC");
  await writeFile(outputPath, transformed.code, { flag: "wx" });
  const descriptors = compiledNumericDescriptors(transformed.code);
  assert.equal(descriptors.length, 5, "all five authored props have compiled descriptors");
  assert.ok(descriptors.every((entry) => entry.closedExpressionKinds.length > 0),
    "every primitive binding has an executable closed data expression");
  assert.ok(descriptors.some((entry) => entry.closedExpressionKinds.includes("conditional")),
    "conditional is represented in the executable plan");
  assert.ok(descriptors.some((entry) => entry.closedExpressionKinds.includes("template")),
    "template is represented in the executable plan");
  const app = await import(`${pathToFileURL(outputPath).href}?attempt=${attempt}`);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const renderFrames = [];
  root = createNativeRoot(host, container, {
    rootId: `compiled-retained-${attempt}`,
    scheduleCommit() {},
    profileCounter(frame) { renderFrames.push(frame); },
  });
  let sceneFirstHookReads = 0;
  const originalUseState = root.world.useState;
  const originalBeginPreparation = root.world.beginPreparation;
  const countSceneHook = (_owner, site) => {
    if (site.endsWith("#component:Scene#state:0")) sceneFirstHookReads++;
  };
  root.world.useState = function (...args) {
    countSceneHook(args[0], args[1]);
    return originalUseState.apply(this, args);
  };
  root.world.beginPreparation = function (...args) {
    const preparation = originalBeginPreparation.apply(this, args);
    const useState = preparation.useState;
    preparation.useState = function (...stateArgs) {
      countSceneHook(stateArgs[0], stateArgs[1]);
      return useState.apply(this, stateArgs);
    };
    return preparation;
  };
  restoreHookObserver = () => {
    root.world.useState = originalUseState;
    root.world.beginPreparation = originalBeginPreparation;
  };
  root.mount(jsx(app.Scene, {}));
  const componentRenders = () => renderFrames.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0);
  assert.equal(app.trace.activations, 1, "Scene controls activate once at mount");
  assert.equal(sceneFirstHookReads, 1, "Scene executes exactly once at mount");
  assert.equal(componentRenders(), 0, "mount does not emit flush profile frames");
  const node = container.children[0];
  assert.deepEqual(
    [node.props["data-position"], node.props["data-joint"],
      node.props["data-conditional"], node.props["data-label"],
      node.props["data-health"]],
    [1, 11, 10, "x=1", 100],
  );
  const siteMatch = transformed.code.match(/#component:Scene/);
  assert.ok(siteMatch, "Scene has a compiled component site");
  const dirty = [];
  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
  assert.equal(app.trace.controls.position(2), true);
  const position = dirty.find((handle) => handle.site.endsWith("#state:0"));
  assert.ok(position, "position setter exposes a World cell handle");
  const camera = root.world.cellHandle(position.owner,
    position.site.replace(/#state:0$/, "#state:1"));
  assert.ok(camera, "unchanged joint input has a live cell handle");
  const hookReadsBeforeCandidates = sceneFirstHookReads;
  assert.equal(root.prepareRetained([position]), null,
    "joint output declines an incomplete input footprint");
  const positionCut = root.prepareRetained([position, camera]);
  assert.ok(positionCut, "complete joint cut prepares");
  assert.equal(positionCut.validate(), true);
  assert.equal(app.trace.controls.health(101), true);
  const health = dirty.find((handle) => handle.site.endsWith("#state:2"));
  assert.ok(health, "health setter exposes a World cell handle");
  const healthCut = root.prepareRetained([health]);
  assert.ok(healthCut, "independent health cut prepares");
  const accept = (candidate) => {
    assert.equal(candidate.validate(), true, "candidate remains admitted");
    candidate.commitHost();
    assert.equal(candidate.validatePostHost(), true, "host cut remains current");
    candidate.preparePublication();
    candidate.publish();
    candidate.installSubscriptions();
    candidate.runEffects();
  };
  accept(healthCut);
  assert.equal(positionCut.validate(), true,
    "unrelated accepted health publication preserves preprepared position cut");
  accept(positionCut);
  assert.deepEqual(
    [node.props["data-position"], node.props["data-joint"],
      node.props["data-conditional"], node.props["data-label"],
      node.props["data-health"]],
    [2, 12, 10, "x=2", 101],
    "retained primitive outputs share the captured position/camera cut",
  );
  assert.equal(componentRenders(), 0, "retained cuts do not rerender Scene");
  assert.equal(sceneFirstHookReads, hookReadsBeforeCandidates,
    "manual retained candidates do not execute Scene hooks");
  unsubscribe();
  console.log("PASS compiled retained transaction: actual TSX closed AST, complete joint footprint, unrelated accepted cut, primitive outputs, and no rerender.");
} finally {
  restoreHookObserver();
  root?.dispose();
  await plugin.closeBundle();
}
