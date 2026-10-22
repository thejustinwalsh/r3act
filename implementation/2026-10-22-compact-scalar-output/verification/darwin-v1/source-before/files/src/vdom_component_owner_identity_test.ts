import {
  Fragment,
  getComponentOutputOwner,
  jsx,
  markSuspenseRevealAdoption,
  type RuntimeElement,
  stampComponentOutput,
} from "./jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const assertSame = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) throw new Error(message);
};

const assertDifferent = (actual: unknown, expected: unknown, message: string) => {
  if (actual === expected) throw new Error(message);
};

Deno.test("owner lookup ignores unowned objects without invoking their traps", () => {
  let traps = 0;
  const unowned = new Proxy({}, {
    get() { traps++; throw new Error("unexpected property read"); },
    getOwnPropertyDescriptor() {
      traps++;
      throw new Error("unexpected descriptor read");
    },
  }) as unknown as RuntimeElement;
  if (getComponentOutputOwner(unowned) !== undefined || traps !== 0) {
    throw new Error("unowned output was inspected or accepted");
  }
});

Deno.test("a constant host key remounts when its component owner changes", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const render = (owner: number, text: string) =>
    stampComponentOutput(jsx("div", { key: "host", children: text }), owner);

  root.commit(render(11, "first"));
  const first = container.children[0];
  root.commit(render(11, "second"));
  assertSame(container.children[0], first, "same owner lost its host identity");
  root.commit(render(12, "third"));
  assertDifferent(container.children[0], first, "new owner reused the old host");
  if (container.children[0].props.key !== undefined) {
    throw new Error("the explicit key leaked into host props");
  }
  root.dispose();
});

Deno.test("primitive component output keeps text identity only for its owner", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);

  root.commit(stampComponentOutput("first", 21));
  const first = container.children[0];
  root.commit(stampComponentOutput("second", 21));
  assertSame(container.children[0], first, "same owner replaced its text host");
  root.commit(stampComponentOutput(3, 21));
  assertSame(container.children[0], first, "same owner replaced its number host");
  root.commit(stampComponentOutput("third", 22));
  assertDifferent(container.children[0], first, "new owner reused the text host");
  root.dispose();
});

Deno.test("keyed primitive component outputs move with their text hosts", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const a = (text: string) => stampComponentOutput(text, 31, "a");
  const b = (text: string) => stampComponentOutput(text, 32, "b");

  root.commit([a("A"), b("B")]);
  const [first, second] = container.children;
  root.commit([b("B2"), a("A2")]);
  assertSame(container.children[0], second, "keyed text b lost identity on move");
  assertSame(container.children[1], first, "keyed text a lost identity on move");
  if (container.children[0].text !== "B2" ||
    container.children[1].text !== "A2") {
    throw new Error("keyed text moves lost their new values");
  }
  root.dispose();
});

Deno.test("flattened equal host keys retain distinct owner identities", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const row = (owner: number, tag: string, text: string) =>
    stampComponentOutput(jsx(tag, { key: "same:0" }, text), owner);
  const a = row(41, "li", "A");
  const b = row(42, "li", "B");

  root.commit([jsx(Fragment, { key: "group", children: [a] }), [b]]);
  const [first, second] = container.children;
  root.commit([[b], jsx(Fragment, { key: "group", children: [a] })]);
  assertSame(container.children[0], second, "second owner lost its host on move");
  assertSame(container.children[1], first, "first owner lost its host on move");

  root.commit([b]);
  assertSame(container.children[0], second, "removal replaced the surviving owner");
  root.commit([b, row(41, "section", "A2")]);
  assertSame(container.children[0], second, "replacement changed the other owner");
  assertDifferent(container.children[1], first, "host type change reused the old host");
  root.dispose();
});

Deno.test("equal sibling keys still reject one owner or two unowned hosts", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const sameOwner = [
    stampComponentOutput(jsx("li", { key: "same:0" }), 51),
    stampComponentOutput(jsx("li", { key: "same:0" }), 51),
  ];
  const unowned = [
    jsx("li", { key: "same:0" }),
    jsx("li", { key: "same:0" }),
  ];
  for (const tree of [sameOwner, unowned]) {
    let rejected = false;
    try {
      root.commit(tree);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("Duplicate key");
    }
    if (!rejected || container.children.length !== 0) {
      throw new Error("duplicate sibling key was accepted or mutated the host");
    }
  }
  root.dispose();
});

Deno.test("bare fallback adoption respects a retained equal-key bare sibling", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new VDOMSnapshotRoot(host, container);
  const bare = jsx("div", { key: "same:0" }, "fallback");
  const managed = markSuspenseRevealAdoption(
    stampComponentOutput(jsx("div", { key: "same:0" }, "ready"), 61) as RuntimeElement,
    61,
  );

  root.commit([bare]);
  const first = container.children[0];
  root.commit([managed]);
  assertSame(container.children[0], first, "approved reveal did not adopt bare host");

  root.commit([bare]);
  const retained = container.children[0];
  root.commit([managed, bare]);
  assertSame(container.children[1], retained, "managed reveal stole retained bare host");
  assertDifferent(container.children[0], retained, "distinct owner aliased bare host");
  root.dispose();
});
