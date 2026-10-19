import * as THREE from "three";
import nodeAssert from "node:assert/strict";
import { test } from "node:test";
import { createThreeHost } from "../src/three_host.ts";

const assert = (value, message) => nodeAssert.ok(value, message);
const same = (actual, expected, message) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`);
  }
};

test("Three describes copied tuples and retained ordinary data as actually written", () => {
  const host = createThreeHost();
  const mesh = host.createElement("mesh");
  const tuple = [4, 5, 6];
  const copied = host.describePropertyWrite(mesh, "position", tuple);
  same(copied.valuePolicy, "copy", "Vector3 tuple policy");
  same(copied.targetResource, null, "position is not a resource target");
  same(copied.valueResource, null, "tuple is not a resource");
  same(copied.mayThrow, true, "Three write must remain fallible");
  host.setProp(mesh, "position", tuple, undefined);
  tuple[0] = 99;
  assert(mesh.kind === "object", "mesh handle kind");
  same(mesh.object.position.x, 4, "copy writer retained the tuple");

  const data = [1, 2, 3];
  same(
    host.describePropertyWrite(mesh, "userData", data).valuePolicy,
    "retain",
    "ordinary assignment policy",
  );
  host.setProp(mesh, "userData", data, undefined);
  same(mesh.object.userData, data, "ordinary data was copied");
  data[0] = 7;
  same(mesh.object.userData[0], 7, "retained data lost identity");
  host.dispose();
});

test("Three tuple preflight reports a bad scalar before any host mutation", () => {
  const host = createThreeHost();
  const mesh = host.createElement("mesh");
  assert(mesh.kind === "object", "mesh handle kind");
  const position = mesh.object.position;
  let error = "";
  try {
    host.describePropertyWrite(mesh, "position", [8, "bad", 10]);
  } catch (cause) {
    error = String(cause);
  }
  assert(error.includes("compatible numeric array"), "bad tuple diagnostic missing");
  error = "";
  try {
    host.setProp(mesh, "position", [8, "bad", 10], undefined);
  } catch (cause) {
    error = String(cause);
  }
  assert(error.includes("compatible numeric array"), "write diagnostic differs from preflight");
  same(mesh.object.position, position, "preflight replaced Vector3");
  same(position.x, 0, "preflight mutated x");
  same(position.y, 0, "preflight mutated y");
  same(position.z, 0, "preflight mutated z");
  host.dispose();
});

test("Three observes the current nested material target after replacement", () => {
  const host = createThreeHost();
  const mesh = host.createElement("mesh");
  assert(mesh.kind === "object", "mesh handle kind");
  const fallback = mesh.object;
  const oldMaterial = fallback.material;
  const first = host.describePropertyWrite(mesh, "material-opacity", 0.4);
  same(first.valuePolicy, "scalar", "opacity policy");
  same(first.targetResource?.object, oldMaterial, "old target identity");
  same(first.targetResource?.ownership, "shared-owned", "fallback ownership");
  const replacement = new THREE.MeshBasicMaterial({ opacity: 0.7 });
  fallback.material = replacement;
  const second = host.describePropertyWrite(mesh, "material-opacity", 0.3);
  same(second.targetResource?.object, replacement, "new target identity");
  same(second.targetResource?.ownership, "borrowed", "external material ownership");
  host.setProp(mesh, "material-opacity", 0.3, 0.7);
  same(replacement.opacity, 0.3, "replacement material write missing");
  host.setProp(mesh, "material-opacity", null, 0.3);
  same(replacement.opacity, 0.7, "replacement default was not restored");
  host.dispose();
  replacement.dispose();
});

test("Three resource descriptions match owned, borrowed, and shared disposal", () => {
  const host = createThreeHost();
  const material = host.createElement("meshBasicMaterial");
  const borrowed = new THREE.MeshBasicMaterial();
  const primitive = host.createElement("primitive", undefined, { object: borrowed });
  const mesh = host.createElement("mesh");
  assert(material.kind === "resource" && primitive.kind === "resource" &&
    mesh.kind === "object", "resource handles missing");
  const fallback = mesh.object.geometry;
  const owned = host.describePropertyWrite(material, "opacity", 0.5);
  same(owned.targetResource?.object, material.resource, "owned referent");
  same(owned.targetResource?.ownership, "owned", "owned lifetime");
  const borrowedPolicy = host.describePropertyWrite(primitive, "opacity", 0.5);
  same(borrowedPolicy.targetResource?.object, borrowed, "borrowed referent");
  same(borrowedPolicy.targetResource?.ownership, "borrowed", "borrowed lifetime");
  const shared = host.describePropertyWrite(mesh, "geometry", fallback);
  same(shared.valueResource?.object, fallback, "shared referent");
  same(shared.valueResource?.ownership, "shared-owned", "fallback lifetime");
  let ownedDisposals = 0;
  let borrowedDisposals = 0;
  let sharedDisposals = 0;
  material.resource.addEventListener("dispose", () => ownedDisposals++);
  borrowed.addEventListener("dispose", () => borrowedDisposals++);
  fallback.addEventListener("dispose", () => sharedDisposals++);
  host.dispose(material);
  host.dispose(material);
  host.dispose(primitive);
  host.dispose(mesh);
  same(ownedDisposals, 1, "owned material disposed more than once");
  same(borrowedDisposals, 0, "borrowed material was disposed");
  same(sharedDisposals, 0, "fallback disposed with one mesh");
  host.dispose();
  host.dispose();
  same(sharedDisposals, 1, "shared fallback was not disposed once");
  same(borrowedDisposals, 0, "host disposal took borrowed material");
  borrowed.dispose();
});

test("custom writer policy is explicit and undeclared writers stay unknown", () => {
  const host = createThreeHost({
    propertyWriters: {
      copyTuple(handle, value) {
        if (handle.kind !== "object") throw new Error("object expected");
        handle.object.userData.copyTuple = [...value];
      },
      retainTuple(handle, value) {
        if (handle.kind !== "object") throw new Error("object expected");
        handle.object.userData.retainTuple = value;
      },
      borrowTuple(handle, value) {
        if (handle.kind !== "object") throw new Error("object expected");
        handle.object.userData.borrowedSum = value.reduce((a, b) => a + b, 0);
      },
      opaqueTuple(handle, value) {
        if (handle.kind !== "object") throw new Error("object expected");
        handle.object.userData.opaqueTuple = value;
      },
    },
    propertyCapabilities: {
      copyTuple: "copy", retainTuple: "retain", borrowTuple: "borrow-call",
    },
  });
  const mesh = host.createElement("mesh");
  assert(mesh.kind === "object", "mesh handle kind");
  const copy = [1, 2, 3];
  const retain = [4, 5, 6];
  same(host.describePropertyWrite(mesh, "copyTuple", copy).valuePolicy, "copy", "custom copy declaration");
  same(host.describePropertyWrite(mesh, "retainTuple", retain).valuePolicy, "retain", "custom retain declaration");
  same(host.describePropertyWrite(mesh, "borrowTuple", copy).valuePolicy, "borrow-call", "custom borrow declaration");
  same(host.describePropertyWrite(mesh, "opaqueTuple", retain).valuePolicy, "unknown", "undeclared custom writer was certified");
  host.setProp(mesh, "copyTuple", copy, undefined);
  host.setProp(mesh, "retainTuple", retain, undefined);
  host.setProp(mesh, "borrowTuple", copy, undefined);
  copy[0] = 9;
  retain[0] = 9;
  same(mesh.object.userData.copyTuple[0], 1, "custom copy retained caller tuple");
  same(mesh.object.userData.retainTuple, retain, "custom retain copied caller tuple");
  same(mesh.object.userData.retainTuple[0], 9, "custom retain lost live reference");
  same(mesh.object.userData.borrowedSum, 6, "custom borrow retained caller tuple");
  host.dispose();
});

test("Three event capabilities match retained registration and disposed handles decline", () => {
  const host = createThreeHost();
  const mesh = host.createElement("mesh");
  assert(mesh.kind === "object", "mesh handle kind");
  let calls = 0;
  const handler = () => { calls++; };
  same(host.describePropertyWrite(mesh, "onPointerDown", handler).valuePolicy,
    "retain", "pointer callback was not described as retained");
  host.setProp(mesh, "onPointerDown", handler, undefined);
  same(host.dispatchPointerEvent(mesh, "pointerdown"), true, "event was not registered");
  same(calls, 1, "retained callback did not run");
  same(host.describePropertyWrite(mesh, "onPointerDown", undefined).valuePolicy,
    "unknown", "event removal was certified as a retained write");
  host.setProp(mesh, "onPointerDown", undefined, handler);
  same(host.dispatchPointerEvent(mesh, "pointerdown"), false, "event was not detached");
  host.dispose(mesh);
  let error = "";
  try {
    host.describePropertyWrite(mesh, "position", [1, 2, 3]);
  } catch (cause) {
    error = String(cause);
  }
  assert(error.includes("disposed"), "disposed handle accepted a descriptor");
  host.dispose();
});

test("deferred fallback material props remain an unknown observational policy", () => {
  const host = createThreeHost();
  const mesh = host.createElement("mesh");
  same(host.describePropertyWrite(mesh, "material-customFlag", { x: 1 }).valuePolicy,
    "unknown", "deferred material write was classified as immediate");
  host.dispose();
});
