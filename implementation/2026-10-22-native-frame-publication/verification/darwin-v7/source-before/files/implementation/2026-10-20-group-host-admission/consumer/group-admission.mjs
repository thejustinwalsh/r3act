import assert from "node:assert/strict";
import * as THREE from "three";
import { createNativeRoot, jsx, NativeRootWorkQueue } from "@r3act/core";
import { createThreeHost } from "@r3act/host-three";

const checks = [];
for (const reversed of [false, true]) {
  const writes = [];
  const host = createThreeHost({ propertyWriters: {
    phase(handle, value) { writes.push(value); handle.object.userData.phase = value; },
  } });
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const fixtures = ["left", "right"].map(side => {
    const scene = new THREE.Group();
    const root = createNativeRoot(host, scene, {
      rootId: `installed-admission-${side}-${reversed}`,
      renderPreparation: "repeatable", scheduleCommit() {},
    });
    root.mount(jsx("group", { phase: 0 }));
    return { root, scene };
  });
  let primary;
  try {
    const [left, right] = fixtures;
    const accepted = left.root.publicationVersion;
    const count = writes.length;
    let callbacks = 0;
    const result = queue.enqueue({
      id: `installed-admission-revoke-${reversed}`,
      roots: (reversed ? [...fixtures].reverse() : fixtures).map(({ root }) =>
        ({ root, tree: jsx("group", { phase: 1 }) })),
      validateWork() { if (++callbacks === 3) right.root.dispose(); return true; },
      onStaleWork: () => "reject",
    });
    assert.ok(result.status === "stale" || result.status === "cancelled");
    assert.equal(writes.length, count);
    assert.equal(left.root.publicationVersion, accepted);
    assert.equal(left.scene.children[0].userData.phase, 0);
    checks.push(`late group callback declines before writes (${reversed ? "right" : "left"} first)`);
    const healthy = queue.enqueue({
      id: `installed-admission-healthy-${reversed}`,
      roots: [{ root: left.root, tree: jsx("group", { phase: 2 }) }],
    });
    assert.equal(healthy.status, "committed");
    assert.equal(left.scene.children[0].userData.phase, 2);
    checks.push(`prewrite decline leaves shared host healthy (${reversed ? "right" : "left"} first)`);
  } catch (error) { primary = error; }
  const cleanup = [];
  for (const value of [queue, ...fixtures.map(item => item.root), host]) {
    try { value.dispose(); } catch (error) { cleanup.push(error); }
  }
  if (primary !== undefined) throw cleanup.length
    ? new AggregateError([primary, ...cleanup], "Installed admission and cleanup failed") : primary;
  if (cleanup.length) throw new AggregateError(cleanup, "Installed admission cleanup failed");
}
console.log(JSON.stringify({ status: "PASS_INSTALLED_GROUP_ADMISSION", checks,
  publicCoreExport: import.meta.resolve("@r3act/core"),
  publicHostExport: import.meta.resolve("@r3act/host-three") }));
