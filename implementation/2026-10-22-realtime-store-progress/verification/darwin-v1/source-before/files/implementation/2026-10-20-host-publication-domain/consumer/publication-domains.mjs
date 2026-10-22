import assert from "node:assert/strict";
import * as THREE from "three";
import { createNativeRoot, jsx, NativeRootWorkQueue } from "@r3act/core";
import { createThreeHost } from "@r3act/host-three";

const checks = [];
const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const tree = phase => jsx("group", { phase });
const roots = [], hosts = [], queues = [];
let primary;
try {
  const trace = [];
  let callback;
  const host = createThreeHost({ propertyWriters: {
    phase(handle, value) {
      trace.push(`${handle.object.name}:${value}:enter`);
      callback?.(handle, value);
      handle.object.userData.phase = value;
      trace.push(`${handle.object.name}:${value}:exit`);
    },
  } });
  hosts.push(host);
  const make = (name, owner = host) => {
    const scene = new THREE.Group();
    const root = createNativeRoot(owner, scene, { rootId: `installed-domain-${name}`,
      renderPreparation: "repeatable", scheduleCommit: commit => queueMicrotask(commit) });
    roots.push(root);
    root.mount(tree(0));
    scene.children[0].name = name;
    return { root, scene };
  };
  const a = make("a"), b = make("b");
  const bVersion = b.root.publicationVersion;
  callback = (handle, value) => {
    if (handle.object.name === "a" && value === 1) {
      b.root.update(tree(1));
      b.root.update(tree(2));
      b.root.flush();
      assert.equal(b.root.publicationVersion, bVersion);
      assert.equal(b.scene.children[0].userData.phase, 0);
    }
  };
  a.root.update(tree(1));
  await drain();
  assert.equal(b.scene.children[0].userData.phase, 2);
  assert.equal(b.root.publicationVersion, bVersion + 1);
  assert.ok(trace.indexOf("a:1:exit") < trace.indexOf("b:2:enter"));
  checks.push("direct reentry queues latest intent before same-host writes");

  const first = new NativeRootWorkQueue(), second = new NativeRootWorkQueue();
  queues.push(first, second);
  let nested;
  callback = (handle, value) => {
    if (handle.object.name === "a" && value === 3) {
      nested = second.enqueue({ id: "installed-domain-nested", roots: [{ root: b.root, tree: tree(3) }] });
      assert.equal(nested.status, "pending");
      assert.equal(b.scene.children[0].userData.phase, 2);
    }
  };
  const outer = first.enqueue({ id: "installed-domain-outer", roots: [{ root: a.root, tree: tree(3) }] });
  assert.equal(outer.status, "committed");
  await drain();
  assert.equal(nested.status, "committed");
  assert.ok(trace.indexOf("a:3:exit") < trace.indexOf("b:3:enter"));
  callback = undefined;
  const grouped = first.enqueue({ id: "installed-domain-shared-group", roots: [
    { root: a.root, tree: tree(4) }, { root: b.root, tree: tree(4) },
  ] });
  assert.equal(grouped.status, "committed");
  checks.push("separate queues serialize and same-host groups share one claim");

  const independent = createThreeHost({ propertyWriters: {
    phase(handle, value) { handle.object.userData.phase = value; },
  } });
  hosts.push(independent);
  const c = make("c", independent);
  callback = (handle, value) => {
    if (handle.object.name === "a" && value === 5) {
      c.root.update(tree(5));
      assert.equal(c.scene.children[0].userData.phase, 5);
    }
  };
  a.root.update(tree(5));
  checks.push("distinct host objects progress independently");

  const bAccepted = b.root.publicationVersion;
  const failure = new Error("installed-domain-writer-failure");
  callback = (handle, value) => {
    if (handle.object.name === "a" && value === 99) throw failure;
  };
  assert.throws(() => a.root.update(tree(99)));
  assert.throws(() => b.root.update(tree(99)));
  assert.equal(b.root.publicationVersion, bAccepted);
  assert.equal(b.scene.children[0].userData.phase, 4);
  callback = undefined;
  b.root.dispose();
  assert.equal(b.scene.children.length, 0);
  c.root.update(tree(6));
  assert.equal(c.scene.children[0].userData.phase, 6);
  checks.push("partial failure quarantines shared host and permits teardown");
} catch (error) { primary = error; }
const cleanup = [];
for (const queue of queues) try { queue.dispose(); } catch (error) { cleanup.push(error); }
for (const root of roots) try { root.dispose(); } catch (error) { cleanup.push(error); }
for (const host of hosts) try { host.dispose(); } catch (error) { cleanup.push(error); }
if (primary) throw cleanup.length ? new AggregateError([primary, ...cleanup], "Installed domain control and cleanup failed") : primary;
if (cleanup.length) throw new AggregateError(cleanup, "Installed domain cleanup failed");
console.log(JSON.stringify({ status: "PASS_INSTALLED_PUBLICATION_DOMAINS", checks,
  publicCoreExport: import.meta.resolve("@r3act/core"), publicHostExport: import.meta.resolve("@r3act/host-three") }));
