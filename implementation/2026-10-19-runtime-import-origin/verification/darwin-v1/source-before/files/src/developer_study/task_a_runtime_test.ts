import { ComponentStateRoot } from "../component_state_runtime.ts";
import {
  MemoryVDOMHost,
  type MemoryNode,
} from "../vdom_snapshot_runtime.ts";
import { taskATree, type TaskAOwner } from "./task_a_runtime.tsx";

const assertEquals = (actual: unknown, expected: unknown, label: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
};
const assertSame = (actual: unknown, expected: unknown, label: string) => {
  if (actual !== expected) throw new Error(label);
};

const rows = (container: MemoryNode) => container.children[0].children;
const rowFor = (container: MemoryNode, id: TaskAOwner["id"]) => {
  const row = rows(container).find((node) => node.props["data-owner"] === id);
  if (!row) throw new Error(`Missing owner ${id}`);
  return row;
};
const draftFor = (container: MemoryNode, id: TaskAOwner["id"]) =>
  Number(rowFor(container, id).children[0].props["data-draft"]);
const increment = (container: MemoryNode, id: TaskAOwner["id"]) => {
  const button = rowFor(container, id).children[1]?.children[0];
  if (!button) throw new Error(`Owner ${id} has no active settings region`);
  (button.props.onClick as () => void)();
};

Deno.test("developer study Task A preserves keyed state while conditional effects deactivate", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const setup: string[] = [];
  const cleanup: string[] = [];
  const root = new ComponentStateRoot(host, container);
  const lifecycle = {
    onSetup: (id: string) => setup.push(id),
    onCleanup: (id: string) => cleanup.push(id),
  };
  const tree = (owners: readonly TaskAOwner[]) => taskATree(owners, lifecycle);

  root.mount(tree([
    { id: "A", active: false },
    { id: "B", active: false },
  ]));
  const rowA = rowFor(container, "A");
  const rowB = rowFor(container, "B");
  assertEquals([draftFor(container, "A"), draftFor(container, "B")], [0, 0], "initial drafts");
  assertEquals([setup, cleanup], [[], []], "inactive regions do not subscribe");

  root.update(tree([
    { id: "A", active: true },
    { id: "B", active: false },
  ]));
  assertEquals(setup, ["A"], "show A sets up one subscription");
  increment(container, "A");
  increment(container, "A");
  root.flush();
  assertEquals(draftFor(container, "A"), 2, "two draft changes commit");

  root.update(tree([
    { id: "A", active: false },
    { id: "B", active: false },
  ]));
  assertEquals(cleanup, ["A"], "hiding A cleans up the active subscription");
  assertEquals(draftFor(container, "A"), 2, "hiding preserves A's owner state");
  root.update(tree([
    { id: "A", active: true },
    { id: "B", active: false },
  ]));
  assertEquals(setup, ["A", "A"], "showing A sets up again");
  assertEquals(draftFor(container, "A"), 2, "showing restores A's draft");
  increment(container, "A");
  root.flush();

  root.update(tree([
    { id: "B", active: false },
    { id: "A", active: true },
  ]));
  assertSame(rowFor(container, "A"), rowA, "A's host identity survives reorder");
  assertSame(rowFor(container, "B"), rowB, "B's host identity survives reorder");
  assertEquals([draftFor(container, "A"), draftFor(container, "B")], [3, 0], "keyed drafts follow their owners");

  root.update(tree([{ id: "B", active: false }]));
  assertEquals(cleanup, ["A", "A"], "removing active A cleans up exactly once more");
  assertEquals(setup, ["A", "A"], "A has exactly two setups");
  assertEquals(draftFor(container, "B"), 0, "B remains unchanged after A removal");
  root.dispose();
  assertEquals(cleanup, ["A", "A"], "inactive B has no subscription cleanup");
});
