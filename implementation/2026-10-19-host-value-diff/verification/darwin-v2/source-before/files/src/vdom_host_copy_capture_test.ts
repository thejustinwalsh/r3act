import { bind, jsx, ScalarSource } from "./jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "./vdom_snapshot_runtime.ts";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

class CopyHost extends MemoryVDOMHost {
  captures = 0;
  positionWrites = 0;
  duringCapture?: () => void;

  capturePropertyValue(_node: MemoryNode, name: string, next: unknown) {
    if (name !== "position" || !Array.isArray(next)) return null;
    this.captures++;
    const callback = this.duringCapture;
    this.duringCapture = undefined;
    callback?.();
    const comparison = Object.freeze([...next] as number[]);
    return {
      kind: "copy" as const,
      writeValue: comparison,
      comparison,
    };
  }

  override setProp(
    node: MemoryNode,
    name: string,
    value: unknown,
    previous?: unknown,
  ) {
    if (name === "position" && value != null) this.positionWrites++;
    super.setProp(node, name, value, previous);
  }
}

Deno.test("copied host props retain accepted components across same-reference input mutation", () => {
  const host = new CopyHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const position = [1, 2, 3];
  root.commit(jsx("mesh", { position }));
  const mesh = container.children[0];
  assert(JSON.stringify(mesh.props.position) === "[1,2,3]", "initial copy");
  const firstWrites = host.writeCount;

  position[0] = 4;
  root.commit(jsx("mesh", { position }));
  assert(JSON.stringify(mesh.props.position) === "[4,2,3]", "mutated input copy");
  assert(host.writeCount === firstWrites + 1, "same-reference mutation wrote once");

  const settledWrites = host.writeCount;
  root.commit(jsx("mesh", { position }));
  assert(host.writeCount === settledWrites, "identical accepted copy skipped");
  root.commit(jsx("mesh", { position: [4, 2, 3] }));
  assert(host.writeCount === settledWrites + 1, "new authored input still wrote");
  assert(host.captures >= 4, "copy hook reached on ordinary host diff");
  root.dispose();
});

Deno.test("bound copy history stays accepted and a revoked capture fails before writing", () => {
  const host = new CopyHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const position = [1, 2, 3];
  root.commit(jsx("mesh", { position: bind(source, () => position) }));
  const mesh = container.children[0];
  const initialWrites = host.writeCount;
  position[1] = 7;
  root.setSource(source, 2);
  assert(JSON.stringify(mesh.props.position) === "[1,7,3]", "bound copy update");
  assert(host.writeCount === initialWrites + 1, "bound mutation wrote once");
  const settledWrites = host.writeCount;
  root.commit(jsx("mesh", { position: bind(source, () => position) }));
  assert(host.writeCount === settledWrites, "full diff used current bound copy history");

  const beforeRevoke = host.writeCount;
  Object.defineProperty(host, "capturePropertyValue", {
    configurable: true,
    value: undefined,
  });
  position[1] = 9;
  let rejected = false;
  try { root.setSource(source, 3); }
  catch (error) {
    rejected = String(error).includes("Host copy capture changed");
  }
  assert(rejected, "revoked copy method rejected");
  assert(host.writeCount === beforeRevoke, "revoke did not invoke writer");
  root.dispose();
});

Deno.test("capture reentry cannot write through a detached bound group", () => {
  const host = new CopyHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const source = new ScalarSource(0, 1);
  const position = [1, 2, 3];
  root.commit(jsx("mesh", { position: bind(source, () => position) }));
  const acceptedWrites = host.positionWrites;
  host.duringCapture = () => root.dispose();
  position[0] = 8;
  let rejected = false;
  try { root.setSource(source, 2); }
  catch (error) {
    rejected = String(error).includes("Bound host copy writer changed");
  }
  assert(rejected, "detached bound group rejected after capture");
  assert(host.positionWrites === acceptedWrites, "detached host was not written");
});

Deno.test("copy capture rejects a replaced host writer before application", () => {
  const host = new CopyHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const position = [1, 2, 3];
  root.commit(jsx("mesh", { position }));
  const acceptedWrites = host.positionWrites;
  let replacementCalls = 0;
  host.duringCapture = () => {
    Object.defineProperty(host, "setProp", {
      configurable: true,
      value: () => { replacementCalls++; },
    });
  };
  position[0] = 8;
  let rejected = false;
  try { root.commit(jsx("mesh", { position })); }
  catch (error) {
    rejected = String(error).includes("Host property writer changed");
  }
  assert(rejected, "replaced host writer rejected after capture");
  assert(host.positionWrites === acceptedWrites, "old writer did not apply the stale value");
  assert(replacementCalls === 0, "replacement writer was not invoked");
  Reflect.deleteProperty(host, "setProp");
  root.dispose();
});

Deno.test("public VDOM snapshots never expose accepted copy history", () => {
  const host = new CopyHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const position = [1, 2, 3];
  const tree = () => jsx("mesh", { key: "copy", position });
  root.commit(tree());
  assert(root.commitKeyedRegion("copy", tree()), "ordinary partial commit");
  const ordinary = root.snapshot[0] as Record<string, unknown>;
  assert(!Object.hasOwn(ordinary, "acceptedCopyProps"), "normal serializer is public");

  assert(root.commitKeyedRegion("copy", tree()), "managed partial commit");
  root.beginPublication();
  const managed = root.snapshot[0] as Record<string, unknown>;
  assert(!Object.hasOwn(managed, "acceptedCopyProps"), "journal serializer is public");
  root.cancelPublication();

  ordinary.acceptedCopyProps = { position: { comparison: [9, 9, 9] } };
  managed.acceptedCopyProps = { position: { comparison: [9, 9, 9] } };
  const before = host.positionWrites;
  position[0] = 4;
  position[1] = 5;
  position[2] = 6;
  assert(root.commitKeyedRegion("copy", tree()), "post-snapshot partial commit");
  assert(host.positionWrites === before + 1, "public snapshot mutation did not alter copy history");
  assert(
    JSON.stringify(container.children[0].props.position) === "[4,5,6]",
    "accepted host copy still updated",
  );
  root.dispose();
});
