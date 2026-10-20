import assert from "node:assert/strict";
import * as THREE from "three";
import { createThreeHost } from "./source/src/three_host.ts";

const geometry = new THREE.BufferGeometry();
let sharedDisposals = 0;
geometry.addEventListener("dispose", () => sharedDisposals++);
const host = createThreeHost({ registry: { sharedGeometry: () => geometry } });
const scene = new THREE.Scene();
const first = host.createElement("sharedGeometry", scene);
const second = host.createElement("sharedGeometry", scene);
host.dispose(first);
assert.equal(second.live, true);
assert.equal(sharedDisposals, 1, "old host disposes resource while second handle remains live");
host.dispose();
assert.equal(sharedDisposals, 1);

const owned = new THREE.BufferGeometry();
let ownedDisposals = 0;
owned.addEventListener("dispose", () => ownedDisposals++);
const restoreError = new Error("restore refused");
let attached;
let rejectRestore = false;
const parent = new THREE.Object3D();
Object.defineProperty(parent, "geometry", {
  configurable: true,
  get() { return attached; },
  set(value) { if (rejectRestore) throw restoreError; attached = value; },
});
const failing = createThreeHost({ registry: { ownedGeometry: () => owned } });
const handle = failing.createElement("ownedGeometry", parent);
failing.place(parent, handle, null);
rejectRestore = true;
assert.throws(() => failing.dispose(handle), (error) =>
  error instanceof AggregateError && error.errors.includes(restoreError));
assert.equal(handle.live, false);
assert.equal(ownedDisposals, 0, "old host skips resource disposal after restoration throws");
failing.dispose();
assert.equal(ownedDisposals, 0, "old host cannot recover retired handle ownership");
console.log(JSON.stringify({ oldSharedDisposedWithLiveAlias: true,
  oldOwnedDisposalSkippedAfterRestoreFailure: true, sharedDisposals, ownedDisposals }));
