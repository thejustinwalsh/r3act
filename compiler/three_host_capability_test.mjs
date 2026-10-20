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

test("factory aliases keep shared owned geometry and material until the final live handle", () => {
  for (const kind of ["geometry", "material"]) {
    for (const order of [[0, 1], [1, 0]]) {
      const resource = kind === "geometry"
        ? new THREE.BufferGeometry()
        : new THREE.MeshBasicMaterial();
      const tag = `shared-${kind}`;
      const host = createThreeHost({ registry: { [tag]: () => resource } });
      let disposals = 0;
      resource.addEventListener("dispose", () => disposals++);
      const handles = [host.createElement(tag), host.createElement(tag)];
      same(host.diagnostics.createdResources, 1, "one owned resource identity");
      same(host.diagnostics.liveResources, 1, "both aliases share one live resource");
      same(host.describePropertyWrite(handles[0], "name", "shared").targetResource?.ownership,
        "shared-owned", "live factory aliases were described as exclusive ownership");
      host.dispose(handles[order[0]]);
      same(disposals, 0, "first alias disposed the shared resource");
      same(host.diagnostics.liveResources, 1, "first alias retired resource ownership");
      same(host.describePropertyWrite(handles[order[1]], "name", "last").targetResource?.ownership,
        "owned", "sole remaining handle was described as shared");
      host.dispose(handles[order[1]]);
      same(disposals, 1, "last alias must dispose exactly once");
      same(host.diagnostics.disposedResources, 1, "unique disposal accounting");
      same(host.diagnostics.liveResources, 0, "final alias retained live resource");
      host.dispose();
      same(disposals, 1, "host teardown repeated disposal");
    }
  }
});

test("host teardown releases each shared resource once and never takes borrowed-only aliases", () => {
  const owned = new THREE.BufferGeometry();
  const borrowed = new THREE.MeshBasicMaterial();
  let ownedDisposals = 0;
  let borrowedDisposals = 0;
  owned.addEventListener("dispose", () => ownedDisposals++);
  borrowed.addEventListener("dispose", () => borrowedDisposals++);
  const host = createThreeHost({ registry: { shared: () => owned } });
  host.createElement("shared");
  host.createElement("shared");
  host.createElement("primitive", undefined, { object: borrowed });
  host.createElement("primitive", undefined, { object: borrowed });
  host.dispose();
  host.dispose();
  same(ownedDisposals, 1, "teardown repeated owned disposal");
  same(borrowedDisposals, 0, "teardown disposed borrowed-only material");
  same(host.diagnostics.liveResources, 0, "teardown retained live owned resources");
  same(host.diagnostics.liveHandles, 0, "teardown retained handles");
  borrowed.dispose();
});

test("primitive aliases admitted before ownership pin that resource through final release", () => {
  for (const kind of ["geometry", "material"]) {
    const resource = kind === "geometry"
      ? new THREE.BufferGeometry()
      : new THREE.MeshBasicMaterial();
    const host = createThreeHost({ registry: { ownedAlias: () => resource } });
    let disposals = 0;
    resource.addEventListener("dispose", () => disposals++);
    const primitive = host.createElement("primitive", undefined, { object: resource });
    same(host.diagnostics.createdResources, 0, "borrowed admission claimed ownership");
    const owner = host.createElement("ownedAlias");
    same(host.diagnostics.createdResources, 1, "owning admission did not claim resource");
    host.dispose(owner);
    same(disposals, 0, "owning alias released before borrowed alias");
    host.dispose(primitive);
    same(disposals, 1, "final primitive alias did not release host-owned resource");
    host.dispose();
    same(disposals, 1, "teardown repeated primitive-final disposal");
  }
});

test("attachment restoration and disposal errors both reach the caller", () => {
  const resource = new THREE.BufferGeometry();
  const restorationFailure = new Error("attachment restore failed");
  const disposalFailure = new Error("resource disposal failed");
  const host = createThreeHost({ registry: { ownedGeometry: () => resource } });
  const mesh = host.createElement("mesh");
  const geometry = host.createElement("ownedGeometry");
  host.place(mesh, geometry, null);
  let disposals = 0;
  resource.addEventListener("dispose", () => {
    disposals++;
    throw disposalFailure;
  });
  const object = mesh.object;
  Object.defineProperty(object, "geometry", {
    configurable: true,
    get() { return resource; },
    set() { throw restorationFailure; },
  });
  let caught;
  try { host.dispose(geometry); } catch (error) { caught = error; }
  nodeAssert.ok(caught instanceof AggregateError, "both cleanup errors must be aggregated");
  nodeAssert.deepEqual(caught.errors, [restorationFailure, disposalFailure]);
  same(disposals, 1, "restore failure skipped resource disposal");
  same(host.diagnostics.liveResources, 0, "failed cleanup retained ownership");
  same(host.diagnostics.liveHandles, 1, "failed resource cleanup retained its handle");
  host.dispose(geometry);
  same(disposals, 1, "retired resource was disposed twice");
  host.dispose(mesh);
  host.dispose();
});

test("disposal listener reentry releases only live handles and rejects retired resources", () => {
  const resource = new THREE.MeshBasicMaterial();
  const other = new THREE.BufferGeometry();
  const host = createThreeHost({ registry: {
    materialAlias: () => resource,
    geometryAlias: () => other,
  } });
  const material = host.createElement("materialAlias");
  const geometry = host.createElement("geometryAlias");
  let materialDisposals = 0;
  let geometryDisposals = 0;
  resource.addEventListener("dispose", () => {
    materialDisposals++;
    host.dispose(material);
    host.dispose(geometry);
  });
  other.addEventListener("dispose", () => geometryDisposals++);
  host.dispose(material);
  same(materialDisposals, 1, "reentrant disposal repeated current resource");
  same(geometryDisposals, 1, "reentrant disposal skipped second resource");
  same(host.diagnostics.liveHandles, 0, "reentry retained handles");
  nodeAssert.throws(() => host.createElement("materialAlias"), /disposed/i,
    "disposed resource was readmitted");
  same(host.diagnostics.liveHandles, 0, "rejected readmission registered a handle");
  host.dispose();
  same(materialDisposals, 1, "teardown repeated disposed resource");
});

test("a second live Object3D handle is rejected without corrupting the first event map", () => {
  const object = new THREE.Group();
  const host = createThreeHost();
  const first = host.createElement("primitive", undefined, { object });
  let events = 0;
  host.setProp(first, "onPointerDown", () => events++, undefined);
  nodeAssert.throws(() => host.createElement("primitive", undefined, { object }), /live|handle|admit/i);
  same(host.diagnostics.liveHandles, 1, "duplicate admission registered a second handle");
  same(host.diagnostics.eventRegistrations, 1, "duplicate admission altered event registration");
  same(host.dispatchPointerEvent(object, "pointerdown"), true, "first event map was lost");
  same(events, 1, "first handler stopped receiving events");
  host.dispose(first);
  same(host.diagnostics.eventRegistrations, 0, "first handle event cleanup failed");
  host.dispose();
});

test("factory reentry cannot admit a resource after host disposal", () => {
  for (const throwOnDispose of [false, true]) {
    const resource = new THREE.BufferGeometry();
    const cleanupFailure = new Error("factory resource cleanup failed");
    let disposals = 0;
    resource.addEventListener("dispose", () => {
      disposals++;
      if (throwOnDispose) throw cleanupFailure;
    });
    let host;
    host = createThreeHost({ registry: {
      reentrantGeometry() {
        host.dispose();
        return resource;
      },
    } });
    let caught;
    try { host.createElement("reentrantGeometry"); } catch (error) { caught = error; }
    nodeAssert.ok(caught, "disposed host admitted factory result");
    nodeAssert.match(String(caught), /disposed|AggregateError/i);
    if (throwOnDispose) {
      const includes = (error, target) => error === target ||
        (error instanceof AggregateError && error.errors.some((part) => includes(part, target)));
      const hasRetiredHostError = (error) =>
        (error instanceof Error && /Three host is disposed/.test(error.message)) ||
        (error instanceof AggregateError && error.errors.some(hasRetiredHostError));
      nodeAssert.ok(includes(caught, cleanupFailure), "factory disposal error was lost");
      nodeAssert.ok(hasRetiredHostError(caught), "factory retirement error was lost");
    }
    same(disposals, 1, "rejected factory resource was not disposed exactly once");
    same(host.diagnostics.liveHandles, 0, "reentrant factory registered a live handle");
    same(host.diagnostics.liveResources, 0, "reentrant factory retained a live resource");
    host.dispose();
    same(disposals, 1, "second host disposal repeated factory cleanup");
  }
});

test("factory reentry does not dispose an already borrowed active resource", () => {
  const resource = new THREE.BufferGeometry();
  let disposals = 0;
  resource.addEventListener("dispose", () => disposals++);
  let host;
  host = createThreeHost({ registry: {
    borrowedFactory() {
      host.dispose();
      return resource;
    },
  } });
  host.createElement("primitive", undefined, { object: resource });
  nodeAssert.throws(() => host.createElement("borrowedFactory"), /disposed/i);
  same(disposals, 0, "factory rejection disposed caller-owned resource");
  same(host.diagnostics.liveHandles, 0, "host disposal retained borrowed handle");
  resource.dispose();
});

test("attachment metadata reentry retires the host before handle admission", () => {
  const resource = new THREE.BufferGeometry();
  let disposals = 0;
  resource.addEventListener("dispose", () => disposals++);
  const host = createThreeHost({ registry: { metadataGeometry: () => resource } });
  let reads = 0;
  const props = {
    get attach() {
      reads++;
      host.dispose();
      return "geometry";
    },
  };
  nodeAssert.throws(() => host.createElement("metadataGeometry", undefined, props), /disposed/i);
  same(disposals, 1, "metadata reentry leaked fresh owned resource");
  same(reads, 1, "attachment metadata getter was read more than once");
  same(host.diagnostics.liveHandles, 0, "metadata reentry admitted a live handle");
  same(host.diagnostics.liveResources, 0, "metadata reentry retained a resource");
  host.dispose();
  same(disposals, 1, "teardown repeated metadata resource disposal");
});

test("constructor args metadata can retire the host before factory invocation", () => {
  let calls = 0;
  let reads = 0;
  const host = createThreeHost({ registry: {
    neverCalled() {
      calls++;
      return new THREE.BufferGeometry();
    },
  } });
  const props = {
    get args() {
      reads++;
      host.dispose();
      return [];
    },
  };
  nodeAssert.throws(() => host.createElement("neverCalled", undefined, props), /disposed/i);
  same(calls, 0, "retired host invoked the factory after args inspection");
  same(reads, 1, "constructor args getter was read more than once");
  same(host.diagnostics.liveHandles, 0, "args reentry admitted a live handle");
});

test("borrowed Object3D parent getter reentry cannot admit a handle", () => {
  const object = new THREE.Group();
  const host = createThreeHost();
  let reads = 0;
  Object.defineProperty(object, "parent", {
    configurable: true,
    get() {
      reads++;
      host.dispose();
      return null;
    },
  });
  nodeAssert.throws(() => host.createElement("primitive", undefined, { object }), /disposed/i);
  same(reads, 1, "primitive parent getter was read more than once");
  same(host.diagnostics.liveHandles, 0, "retired host admitted borrowed Object3D");
});
