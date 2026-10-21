import {
  getComponentOutputOwner,
  jsx,
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
