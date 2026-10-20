import assert from "node:assert/strict";
import * as THREE from "three";
import { createThreeHost } from "@r3act/host-three";

const checks = [];
for (const [name, Resource] of [["geometry", THREE.BufferGeometry], ["material", THREE.MeshBasicMaterial]]) {
  for (const reverse of [false, true]) {
    const resource = new Resource();
    let disposals = 0;
    resource.addEventListener("dispose", () => disposals++);
    const host = createThreeHost({ registry: { shared: () => resource } });
    const first = host.createElement("shared");
    const second = host.createElement("shared");
    const order = reverse ? [second, first] : [first, second];
    assert.equal(host.diagnostics.createdResources, 1);
    assert.equal(host.describePropertyWrite(first, name === "geometry" ? "name" : "opacity", 1).targetResource.ownership, "shared-owned");
    host.dispose(order[0]);
    assert.equal(order[1].live, true);
    assert.equal(disposals, 0);
    assert.equal(host.diagnostics.liveResources, 1);
    host.dispose(order[1]);
    assert.equal(disposals, 1);
    assert.equal(host.diagnostics.liveResources, 0);
    assert.throws(() => host.createElement("shared"), /disposed resource/);
    host.dispose();
    assert.equal(disposals, 1);
    checks.push({ name, reverse, disposals, remaining: host.diagnostics.liveHandles });
  }
}
const resource = new THREE.BufferGeometry();
let borrowedDisposals = 0;
resource.addEventListener("dispose", () => borrowedDisposals++);
const host = createThreeHost({ registry: { owned: () => resource } });
const borrowed = host.createElement("primitive", undefined, { object: resource });
const owned = host.createElement("owned");
host.dispose(owned);
assert.equal(borrowedDisposals, 0);
host.dispose(borrowed);
assert.equal(borrowedDisposals, 1);
host.dispose();
checks.push({ name: "borrower-before-owner", disposals: borrowedDisposals });

const callerResource = new THREE.BufferGeometry();
let callerDisposals = 0;
callerResource.addEventListener("dispose", () => callerDisposals++);
const borrowing = createThreeHost();
borrowing.createElement("primitive", undefined, { object: callerResource });
borrowing.dispose();
assert.equal(callerDisposals, 0);
callerResource.dispose();
assert.equal(callerDisposals, 1);
checks.push({ name: "borrowed-only", hostDisposals: 0, callerDisposals });
console.log(JSON.stringify({ status: "PASS_INSTALLED_RESOURCE_LIFETIMES", checks,
  publicHostExport: import.meta.resolve("@r3act/host-three") }));
