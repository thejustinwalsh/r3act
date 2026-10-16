import { assertEquals } from "jsr:@std/assert";
import {
  bindStatePropAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { OwnerStateWorld } from "./owner_state_world.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

function harness(
  rootId: string,
  world: OwnerStateWorld,
  schedule: Array<() => void>,
  host = new MemoryVDOMHost(),
) {
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, {
    rootId,
    world,
    scheduleCommit: (commit) => schedule.push(commit),
  });
  return { root, container, host };
}

const textContent = (node: MemoryNode): string =>
  (node.text ?? "") + node.children.map(textContent).join("");

Deno.test("native roots queue only their own cells without public change records", () => {
  const world = new OwnerStateWorld();
  let publicSubscriptions = 0;
  const subscribeChanges = world.subscribeChanges.bind(world);
  Object.defineProperty(world, "subscribeChanges", {
    value: (...args: Parameters<typeof world.subscribeChanges>) => {
      publicSubscriptions++;
      return subscribeChanges(...args);
    },
  });
  const leftScheduled: Array<() => void> = [];
  const rightScheduled: Array<() => void> = [];
  const left = harness("cell-root-left", world, leftScheduled);
  const right = harness("cell-root-right", world, rightScheduled);
  let setLeft!: (value: number) => boolean;
  let setRight!: (value: number) => boolean;
  const Counter = (capture: (setter: (value: number) => boolean) => void) =>
    defineComponent("cell-root-counter", () => {
      const [value, set] = useStateAt("value", 0);
      capture(set);
      return jsx("output", {}, String(value));
    });
  left.root.mount(jsx(Counter((setter) => setLeft = setter), {}));
  right.root.mount(jsx(Counter((setter) => setRight = setter), {}));
  assertEquals(publicSubscriptions, 0);

  setLeft(4);
  assertEquals(leftScheduled.length, 1);
  assertEquals(rightScheduled.length, 0);
  leftScheduled.shift()!();
  assertEquals(textContent(left.container.children[0]), "4");
  assertEquals(textContent(right.container.children[0]), "0");

  setRight(9);
  assertEquals(leftScheduled.length, 0);
  assertEquals(rightScheduled.length, 1);
  rightScheduled.shift()!();
  assertEquals(textContent(right.container.children[0]), "9");
  left.root.dispose();
  right.root.dispose();
});

Deno.test("a reentrant newer cell version survives acknowledgement of the captured cut", () => {
  let setValue!: (value: number) => boolean;
  class ReentrantHost extends MemoryVDOMHost {
    reenter = false;
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      super.setProp(node, name, value, previous);
      if (this.reenter && name === "data-value") {
        this.reenter = false;
        setValue(3);
      }
    }
  }
  const world = new OwnerStateWorld();
  const scheduled: Array<() => void> = [];
  const { root, container, host } = harness(
    "cell-cut-root",
    world,
    scheduled,
    new ReentrantHost(),
  );
  const Output = defineComponent("cell-cut-output", () => {
    const [value, set] = useStateAt("value", 1);
    setValue = set;
    return jsx("output", {
      "data-value": bindStatePropAt("value", (next) => next),
    });
  }, { propOnlySites: ["value"] });
  root.mount(jsx(Output, {}));
  setValue(2);
  (host as ReentrantHost).reenter = true;
  scheduled.shift()!();
  assertEquals(container.children[0].props["data-value"], 2);
  assertEquals(root.diagnostics().pendingChangeCount, 1);
  assertEquals(scheduled.length, 1);
  scheduled.shift()!();
  assertEquals(container.children[0].props["data-value"], 3);
  assertEquals(root.diagnostics().pendingChangeCount, 0);
  root.dispose();
});

Deno.test("disposing a root drops queued cell work and makes retained setters inert", () => {
  const world = new OwnerStateWorld();
  const scheduled: Array<() => void> = [];
  const { root, container } = harness("cell-dispose-root", world, scheduled);
  let setValue!: (value: number) => boolean;
  const Counter = defineComponent("cell-dispose-counter", () => {
    const [value, set] = useStateAt("value", 0);
    setValue = set;
    return jsx("output", {}, String(value));
  });
  root.mount(jsx(Counter, {}));
  assertEquals(setValue(1), true);
  assertEquals(root.diagnostics().pendingChangeCount, 1);
  root.dispose();
  assertEquals(root.diagnostics().pendingChangeCount, 0);
  let rejectedDeadSetter = false;
  try {
    setValue(2);
  } catch {
    rejectedDeadSetter = true;
  }
  assertEquals(rejectedDeadSetter, true);
  assertEquals(world.hasPendingChanges(), false);
  scheduled.shift()!();
  assertEquals(container.children.length, 0);
});
