import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";
import { createNativeRoot } from "../src/native_runtime_api.ts";
import { compiledOwnerUpdateProgramFor } from "../src/compiled_state_layout.ts";
import { jsx } from "../src/jsx_binding_runtime.ts";
import { OwnerStateWorld } from "../src/owner_state_world.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = process.argv[2];
assert.ok(compilerBinary, "pass the corrected staged compiler binary as argv[2]");
const compilerBinaryPath = path.resolve(compilerBinary);
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const proofDirectory = path.join(stageRoot, "proof", "results");
const authoredPath = path.join(proofDirectory, `authored-${attemptId}.tsx`);
const emittedPath = path.join(proofDirectory, `emitted-${attemptId}.mjs`);
const resultPath = path.join(proofDirectory, `result-${attemptId}.json`);
const failurePath = path.join(proofDirectory, `failure-${attemptId}.json`);
const runtimePath = path.join(stageRoot, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: 0, setValue: null };
export function Row() {
  trace.renders++;
  const [value, setValue] = useState(1);
  trace.setValue = setValue;
  return <button data-value={value} style={{ left: \`\${value}px\` }} />;
}`;

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const plugin = nativeModulePlugin({
  root: projectRoot,
  compilerRoot: projectRoot,
  compilerBinary: compilerBinaryPath,
});
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: runtimePath } : null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
const findButton = (node) => {
  if (node?.tag === "button") return node;
  for (const child of node?.children ?? []) {
    const found = findButton(child);
    if (found) return found;
  }
  return undefined;
};

let root;
let app;
let unsubscribeDirty;
const originalUseState = OwnerStateWorld.prototype.useState;
const originalBeginPreparation = OwnerStateWorld.prototype.beginPreparation;
const worldLayouts = [];
const recordLayout = (owner, site, layout) => {
  if (layout) worldLayouts.push({ owner, site, layout });
};
OwnerStateWorld.prototype.useState = function (owner, site, initial, layout) {
  recordLayout(owner, site, layout);
  return originalUseState.call(this, owner, site, initial, layout);
};
OwnerStateWorld.prototype.beginPreparation = function (...args) {
  const preparation = originalBeginPreparation.apply(this, args);
  const originalPreparationUseState = preparation.useState;
  preparation.useState = function (owner, site, initial, layout) {
    recordLayout(owner, site, layout);
    return originalPreparationUseState.call(this, owner, site, initial, layout);
  };
  return preparation;
};
try {
  await mkdir(proofDirectory, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary TSX compiles through the staged Rust/OXC binary");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/);
  assert.match(transformed.code, /__nativeDefineComponent\(/);
  assert.match(transformed.code, /ownerUpdateProgram:/);
  assert.match(transformed.code, /slotCount:\s*\d+/);
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, {
    rootId: `compiled-owner-metadata-${attemptId}`,
    scheduleCommit() {},
  });
  root.mount(jsx(app.Row, {}));
  const componentMatch = transformed.code.match(
    /__nativeDefineComponent\("([^"]+#component:Row)",\s*Row,\s*\{/,
  );
  assert.ok(componentMatch, "emitted Row has a stable defineComponent registration");
  const componentId = componentMatch[1];
  const stateLayoutMatch = transformed.code.match(
    /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:\s*"([^"]+)",\s*slots:\s*\[([^\]]*)\]/s,
  );
  assert.ok(stateLayoutMatch, "emitted defineComponent contains its layout");
  assert.equal(stateLayoutMatch[1], componentId);
  assert.equal(worldLayouts.length, 1, "World activation received the compiled layout");
  assert.equal(worldLayouts[0].layout.programId, componentId);
  const button = findButton(container);
  assert.ok(button, "compiled Row attaches its button host node");
  assert.equal(button.props["data-value"], 1);
  assert.deepEqual(button.props.style, { left: "1px" });
  assert.equal(app.trace.renders, 1);

  let dirtyCell;
  unsubscribeDirty = root.world.subscribeDirtyCells((handle, version) => {
    dirtyCell = { handle, version };
  });
  app.trace.setValue(2);
  assert.ok(dirtyCell, "compiled setter publishes an actual World dirty-cell handle");
  const rowView = root.world.numericRowForCell(dirtyCell.handle, dirtyCell.version);
  assert.ok(rowView, "the emitted TSX state is backed by a committed numeric row view");
  assert.equal(rowView.layout, worldLayouts[0].layout, "World stores the exact normalized defineComponent layout object");
  const program = compiledOwnerUpdateProgramFor(rowView.layout);
  assert.ok(program, "defineComponent associated its owner program with the World layout");
  assert.equal(program.programId, rowView.layout.programId);
  assert.equal(program.slotCount, rowView.layout.slots.length);
  assert.equal(rowView.layout.programId, rowView.layout.slots[0].siteId.split("#state:")[0]);
  assert.equal(program.sinkIds.length, 2);
  assert.equal(typeof program.executeCut, "function");

  root.flush();
  assert.equal(button.props["data-value"], 2);
  assert.deepEqual(button.props.style, { left: "2px" });
  assert.equal(app.trace.renders, 1, "numeric binding update preserves correct output without rerender");
  unsubscribeDirty();
  unsubscribeDirty = undefined;
  const proof = {
    status: "PASS",
    claim: "authored TSX registration associates the emitted owner-update program with the same normalized layout carried by its committed World numeric row; update output remains correct on current runtime path",
    limitation: "The VDOM whole-cut kernel is not integrated by this proof; this demonstrates compiler metadata registration and generic-path correctness only.",
    attemptId,
    command: process.argv,
    node: process.version,
    compilerBinaryPath,
    hashes: {
      authored: await hashFile(authoredPath),
      emitted: await hashFile(emittedPath),
      compilerBinary: await hashFile(compilerBinaryPath),
      metadataLayout: await hashFile(path.join(stageRoot, "src/compiled_state_layout.ts")),
      metadataComponent: await hashFile(path.join(stageRoot, "src/component_state_runtime.ts")),
      world: await hashFile(path.join(stageRoot, "src/owner_state_world.ts")),
      vdom: await hashFile(path.join(stageRoot, "src/vdom_snapshot_runtime.ts")),
    },
    association: {
      programId: program.programId,
      layoutProgramId: rowView.layout.programId,
      slotCount: program.slotCount,
      sinkIds: program.sinkIds,
      layoutSlots: rowView.layout.slots,
      exactWorldLayoutObject: true,
    },
    visibleOutput: button.props,
    componentRenders: app.trace.renders,
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ resultPath, proof }, null, 2));
} catch (error) {
  const failure = {
    status: "FAIL",
    attemptId,
    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    authoredPath,
    emittedPath,
    compilerBinaryPath,
    compilerBinarySha256: await hashFile(compilerBinaryPath).catch(() => null),
  };
  await writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, { flag: "wx" });
  throw error;
} finally {
  unsubscribeDirty?.();
  root?.dispose();
  OwnerStateWorld.prototype.useState = originalUseState;
  OwnerStateWorld.prototype.beginPreparation = originalBeginPreparation;
  plugin.closeBundle?.call({});
}
