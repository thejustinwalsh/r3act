import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setImmediate } from "node:timers/promises";

// Node's built-in TS stripping does not transform parameter properties used
// in the runtime's imports. Bundle the real TS entry point with Deno, then run
// that JavaScript under Node so --expose-gc controls the retention check.
const bundleDirectory = mkdtempSync(
  join(tmpdir(), "mixed-candidate-retention-"),
);
const bridgePath = join(bundleDirectory, "bridge.ts");
const bundlePath = join(bundleDirectory, "runtime.mjs");
const moduleUrl = (relativePath) => new URL(relativePath, import.meta.url).href;
writeFileSync(
  bridgePath,
  `
  export { bindStatePropAt, ComponentStateRoot, defineComponent, renderCollectionAt, useEffectAt, useStateAt } from ${
    JSON.stringify(moduleUrl("../src/component_state_runtime.ts"))
  };
  export { createKeyedCollection } from ${
    JSON.stringify(moduleUrl("../src/keyed_collection.ts"))
  };
  export { jsx, keyedOwnerChildren } from ${
    JSON.stringify(moduleUrl("../src/jsx_binding_runtime.ts"))
  };
  export { MemoryVDOMHost, VDOMSnapshotRoot } from ${
    JSON.stringify(moduleUrl("../src/vdom_snapshot_runtime.ts"))
  };
`,
);
execFileSync("deno", [
  "bundle",
  "--platform=deno",
  bridgePath,
  "-o",
  bundlePath,
], {
  stdio: "ignore",
});
const {
  bindStatePropAt,
  ComponentStateRoot,
  createKeyedCollection,
  defineComponent,
  jsx,
  keyedOwnerChildren,
  MemoryVDOMHost,
  renderCollectionAt,
  useEffectAt,
  useStateAt,
  VDOMSnapshotRoot,
} = await import(pathToFileURL(bundlePath).href);
rmSync(bundleDirectory, { recursive: true, force: true });

assert.equal(typeof global.gc, "function", "Run Node 24+ with --expose-gc");
const nodeMajor = Number(process.versions.node.split(".")[0]);
assert.ok(
  nodeMajor >= 24,
  `Expected Node 24+, received ${process.versions.node}`,
);

const retainedRoots = [];
const retainedHosts = [];
const retainedContainers = [];
const retainedCandidates = [];
const retainedPrograms = [];
const retainedVDOMRoots = [];
const retainedVDOMHosts = [];
const retainedSetters = [];
const program = {
  schemaVersion: 1,
  sinkId: "mixed-retention-root.value",
  sourceSites: ["value"],
};

function createEnvironment() {
  // Establish the collection's committed component-site schema with a
  // payload-free retained row before exercising candidate preparation.
  const collection = createKeyedCollection([
    { id: "seed", payload: null },
  ], (row) => row.id);
  let setValue;
  let rootRenders = 0;
  let rowRenders = 0;
  const Row = defineComponent("mixed-retention-row", ({ row }) => {
    rowRenders++;
    const payload = row.payload;
    const [, setter] = useStateAt("payload-state", payload);
    retainedSetters.push(setter);
    if (payload) {
      useEffectAt("payload-effect", () => {
        // Both prepared setup and eventual cleanup close over the inserted row.
        void payload.bytes.byteLength;
        return () => void payload.bytes.byteLength;
      });
    }
    return jsx(
      "li",
      { "data-id": row.id, "data-size": payload?.bytes.length ?? 0 },
      row.id,
    );
  });
  const List = defineComponent(
    "mixed-retention-list",
    () =>
      jsx(
        "ul",
        {},
        renderCollectionAt(
          "mixed-retention-region",
          collection,
          (row) => jsx(Row, { row }),
        ),
      ),
  );
  const Root = defineComponent("mixed-retention-root", () => {
    rootRenders++;
    const [, update] = useStateAt("value", 1);
    setValue = update;
    return jsx("section", {}, [
      jsx("output", {
        value: bindStatePropAt("value", (value) => value, program),
      }),
      jsx(List, {}),
    ]);
  }, { propOnlySites: ["value"] });

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(Root, {}));
  retainedRoots.push(root);
  retainedHosts.push(host);
  retainedContainers.push(container);
  return {
    collection,
    root,
    setValue: (value) => setValue(value),
    container,
    get rootRenders() {
      return rootRenders;
    },
    get rowRenders() {
      return rowRenders;
    },
  };
}

const insertPayload = (environment, key) => {
  const payload = { bytes: new Uint8Array(128 * 1024) };
  const reference = new WeakRef(payload);
  assert.equal(environment.setValue(2), true, "numeric work was not queued");
  assert.equal(
    environment.collection.apply(environment.collection.version, [{
      type: "insert",
      key,
      value: { id: key, payload },
      beforeKey: null,
    }]).ok,
    true,
    "insert operation was rejected",
  );
  return reference;
};

const finish = (candidate) => {
  assert.ok(candidate, "mixed pending work did not produce a candidate");
  assert.equal(candidate.validate(), true, "candidate failed validation");
  candidate.commitHost();
  candidate.publish();
  candidate.runEffects();
};

const prepareMixed = (environment, { renderInsertedRow = true } = {}) => {
  const rootRendersBefore = environment.rootRenders;
  const rowRendersBefore = environment.rowRenders;
  const candidate = environment.root.preparePending();
  assert.ok(candidate, "mixed pending work did not produce a candidate");
  assert.equal(
    environment.rootRenders,
    rootRendersBefore,
    "candidate fell back to a full root render instead of the mixed route",
  );
  assert.equal(
    environment.rowRenders - rowRendersBefore,
    Number(renderInsertedRow),
    "candidate did not render exactly the expected inserted row set",
  );
  return candidate;
};

const queueRemoval = (environment, key) => {
  assert.equal(
    environment.collection.apply(environment.collection.version, [{
      type: "remove",
      key,
    }]).ok,
    true,
    "remove operation was rejected",
  );
};

function discardedPrivateCandidate() {
  const environment = createEnvironment();
  const reference = insertPayload(environment, "discarded");
  const candidate = prepareMixed(environment);
  assert.equal(candidate.validate(), true);
  candidate.discard();
  retainedCandidates.push(candidate);
  assert.equal(
    retainedSetters.at(-1)(null),
    false,
    "discarded private owner setter remained active",
  );

  // Consume the queued insert and removal so the mounted collection and its
  // reader history no longer own the inserted payload.
  queueRemoval(environment, "discarded");
  finish(prepareMixed(environment));
  assert.equal(
    environment.container.children[0].children[1].children.length,
    1,
  );
  assert.equal(retainedSetters.at(-1)(null), false);
  return reference;
}

function stalePrivateCandidate() {
  const environment = createEnvironment();
  const reference = insertPayload(environment, "stale");
  const candidate = prepareMixed(environment);
  queueRemoval(environment, "stale");
  assert.equal(
    candidate.validate(),
    false,
    "collection edit did not stale candidate",
  );
  let staleCommitRejected = false;
  try {
    candidate.commitHost();
  } catch {
    staleCommitRejected = true;
  }
  assert.equal(
    staleCommitRejected,
    true,
    "stale mixed candidate host commit did not reject",
  );
  retainedCandidates.push(candidate);
  assert.equal(
    retainedSetters.at(-1)(null),
    false,
    "stale candidate private owner setter remained active",
  );

  finish(prepareMixed(environment));
  assert.equal(
    environment.container.children[0].children[1].children.length,
    1,
  );
  return reference;
}

function finalizedCandidateThenRemovedRow() {
  const environment = createEnvironment();
  const reference = insertPayload(environment, "published");
  const inserted = prepareMixed(environment);
  finish(inserted);
  retainedCandidates.push(inserted);
  assert.equal(
    environment.container.children[0].children[1].children.length,
    2,
  );

  queueRemoval(environment, "published");
  const removed = prepareMixed(environment, { renderInsertedRow: false });
  finish(removed);
  retainedCandidates.push(removed);
  assert.equal(
    environment.container.children[0].children[1].children.length,
    1,
  );
  return reference;
}

function rawVDOMProgram(mode) {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const initial = () =>
    jsx(
      "main",
      { key: "app" },
      jsx(
        "ul",
        { key: "list" },
        keyedOwnerChildren("raw-retention-rows", [
          jsx("li", { key: "seed" }, "seed"),
        ]),
      ),
    );
  root.commit(initial());
  const payload = { bytes: new Uint8Array(96 * 1024) };
  const reference = new WeakRef(payload);
  const program = root.prepareKeyedRegionDelta("app", "raw-retention-rows", [{
    type: "insert",
    key: "raw-candidate",
    beforeKey: null,
    tree: jsx("li", { key: "raw-candidate", payload }, "raw"),
  }]);
  assert.ok(program, `raw ${mode} program did not prepare`);
  if (mode === "discard") {
    program.discard();
  } else if (mode === "stale") {
    root.commit(initial());
    assert.equal(program.validate(), false, "raw program did not become stale");
    let staleCommitRejected = false;
    try {
      program.commit();
    } catch {
      staleCommitRejected = true;
    }
    assert.equal(
      staleCommitRejected,
      true,
      "stale raw VDOM commit did not reject",
    );
    assert.equal(
      program.validate(),
      false,
      "stale raw VDOM handle stayed open",
    );
  } else {
    program.commit();
    root.commit(initial());
  }
  retainedPrograms.push(program);
  retainedVDOMRoots.push(root);
  retainedVDOMHosts.push(host);
  return reference;
}

const references = [
  discardedPrivateCandidate(),
  stalePrivateCandidate(),
  finalizedCandidateThenRemovedRow(),
  rawVDOMProgram("discard"),
  rawVDOMProgram("stale"),
  rawVDOMProgram("success"),
];

for (let attempt = 0; attempt < 16; attempt++) {
  await setImmediate();
  global.gc();
}

for (const [index, reference] of references.entries()) {
  assert.equal(
    reference.deref(),
    undefined,
    `retained candidate/composite VDOM handle kept payload ${index} alive`,
  );
}
assert.equal(
  retainedCandidates.length,
  4,
  "candidate handles were not retained",
);
assert.equal(
  retainedPrograms.length,
  3,
  "prepared VDOM handles were not retained",
);
assert.equal(retainedRoots.length, 3, "roots were not retained");
assert.equal(retainedHosts.length, 3, "hosts were not retained");
assert.equal(retainedContainers.length, 3, "containers were not retained");
assert.ok(retainedRoots.every((root) => !root.diagnostics().disposed));
assert.equal(retainedVDOMRoots.length, 3, "VDOM roots were not retained");
assert.equal(retainedVDOMHosts.length, 3, "VDOM hosts were not retained");
console.log(
  `PASS: Node ${process.versions.node}; discarded, stale, and finalized mixed candidates release inserted-row payloads while their candidate handles and mounted roots stay alive. Private setters are inert. Narrow --expose-gc retention check, not a heap claim.`,
);
