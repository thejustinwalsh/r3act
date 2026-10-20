import assert from "node:assert/strict";
import {
  bindStatePropAt, ComponentStateRoot, defineComponent, renderCollectionAt,
  isNativeRootHostPublicationBusy, useStateAt,
} from "./source/src/component_state_runtime.ts";
import { createKeyedCollection } from "./source/src/keyed_collection.ts";
import { jsx } from "./source/src/jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "./source/src/native_root_work_queue.ts";
import { MemoryVDOMHost } from "./source/src/vdom_snapshot_runtime.ts";

const base = new MemoryVDOMHost();
const keyedContainer = base.createContainer();
let armed = false;
let descriptorCalls = 0;
let callbackCount = 0;
let revocations = 0;
let revoke;
const keyedHost = new Proxy(base, {
  get(target, name) {
    const value = Reflect.get(target, name, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
  getOwnPropertyDescriptor(target, name) {
    if (name === "setProp") {
      descriptorCalls++;
      if (armed && isNativeRootHostPublicationBusy(keyedRoot)) {
        armed = false;
        revoke();
      }
    }
    return Reflect.getOwnPropertyDescriptor(target, name);
  },
});
const keyedRoot = new ComponentStateRoot(keyedHost, keyedContainer, {
  rootId: "baseline-admission-keyed", scheduleCommit() {},
});
const rows = createKeyedCollection(["a", "b"], (value) => value);
const List = defineComponent("baseline-admission-list", () => jsx("ul", {},
  renderCollectionAt("baseline-admission-region", rows, (value) =>
    jsx("li", { "data-key": value }, value))));
const peerHost = new MemoryVDOMHost();
const peerContainer = peerHost.createContainer();
const peerRoot = new ComponentStateRoot(peerHost, peerContainer, {
  rootId: "baseline-admission-peer", scheduleCommit() {},
});
let setPeer;
let peerCell;
const unsubscribe = peerRoot.world.subscribeDirtyCells((handle) => { peerCell = handle; });
const Peer = defineComponent("baseline-admission-peer-view", () => {
  [, setPeer] = useStateAt("value", 0);
  return jsx("output", {
    value: bindStatePropAt("value", (value) => value, {
      schemaVersion: 2,
      ownerProgramId: "baseline-admission-peer-view",
      sinkId: "value", sourceSites: ["value"],
      closedExpression: { kind: "input", index: 0 },
    }),
  });
}, {
  propOnlySites: ["value"],
  stateLayout: {
    schemaVersion: 1,
    programId: "baseline-admission-peer-view",
    slots: [{ siteId: "value", slot: 0 }],
  },
});
const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
let primaryError;
const cleanupErrors = [];
try {
  keyedRoot.mount(jsx(List, {}));
  peerRoot.mount(jsx(Peer, {}));
  assert.equal(setPeer(1), true);
  assert.equal(rows.apply(rows.version, [
    { type: "move", key: "b", beforeKey: "a" },
  ]).ok, true);
  const before = {
    keyedVersion: keyedRoot.publicationVersion,
    peerVersion: peerRoot.publicationVersion,
    keyedPlaces: base.placementCount,
    peerWrites: peerHost.writeCount,
  };
  revoke = () => { revocations++; assert.equal(setPeer(2), true); };
  const work = queue.enqueueTransaction({
    id: "baseline-admission-host-descriptor",
    roots: [
      { root: keyedRoot, cells: [], collections: [rows] },
      { root: peerRoot, cells: [peerCell], collections: [] },
    ],
    validateWork: () => {
      if (++callbackCount === 2) armed = true;
      return true;
    },
    onStaleWork: () => "reject",
  });
  assert.equal(callbackCount >= 2, true, "late admission wave was not reached");
  assert.equal(descriptorCalls > 0, true, "keyed host descriptor trap was not reached");
  assert.equal(revocations, 1, "trap did not revoke the peer under the host claim");
  assert.equal(work.status, "failed", "old group did not enter a partial failure");
  assert.equal(base.placementCount > before.keyedPlaces, true,
    "old first member did not write before the later member declined");
  assert.equal(peerHost.writeCount, before.peerWrites,
    "later stale member unexpectedly wrote");
  assert.equal(keyedRoot.publicationVersion, before.keyedVersion,
    "failed group advanced first accepted history");
  assert.equal(peerRoot.publicationVersion, before.peerVersion,
    "failed group advanced second accepted history");
  console.log(JSON.stringify({
    status: "PASS_OLD_DEFECT_CHARACTERIZATION",
    sourceCommit: "33209ecef0e50114b01edd3618b20e99ef4287ac",
    callbackCount, descriptorCalls, revocations,
    firstMemberHostPlacements: base.placementCount - before.keyedPlaces,
    laterMemberHostWrites: peerHost.writeCount - before.peerWrites,
    acceptedVersionsUnchanged: true,
  }));
} catch (error) {
  primaryError = error;
} finally {
  for (const cleanup of [() => queue.dispose(), unsubscribe,
    () => keyedRoot.dispose(), () => peerRoot.dispose()]) {
    try { cleanup(); } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Old defect and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Old defect cleanup failed");
