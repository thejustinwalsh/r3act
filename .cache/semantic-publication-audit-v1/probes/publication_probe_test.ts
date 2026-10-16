import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../../../src/component_state_runtime.ts";
import { jsx } from "../../../src/jsx_binding_runtime.ts";
import { NativeRootWorkQueue } from "../../../src/native_root_work_queue.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "../../../src/vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};
const truth = (value: unknown, label: string) => {
  if (!value) throw new Error(label);
};
const cleanup = (steps: readonly (() => void)[], primaryFailed: boolean) => {
  const errors: unknown[] = [];
  for (const step of steps) {
    try {
      step();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 0) return;
  if (primaryFailed) console.error("Probe cleanup failed after primary error", errors);
  else throw new AggregateError(errors, "Probe cleanup failed");
};

Deno.test("public host setter dispatches and disposes during candidate application", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setLocal!: (value: number) => boolean;
  let armed = false;
  const trace: string[] = [];
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (armed && name === "data-value") {
        armed = false;
        trace.push("host-enter");
        equal(setLocal(9), true, "setter accepted during host callback");
        trace.push("setter-return");
        equal(root.flush(), false, "nested flush deferred during application");
        trace.push("nested-flush-deferred");
        root.dispose();
        trace.push("dispose-return");
      }
      super.setProp(node, name, value, previous);
    }
  }();
  root = new ComponentStateRoot(host, host.createContainer(), {
    rootId: "semantic-dispose-during-apply",
    scheduleCommit() {},
  });
  const View = defineComponent(
    "semantic-dispose-view",
    ({ value }: { value: number }) => {
      const [, set] = useStateAt("local", 0);
      setLocal = set;
      return jsx("output", { "data-value": value });
    },
  );
  let primaryFailed = false;
  try {
    root.mount(jsx(View, { value: 0 }));
    const candidate = root.prepare(jsx(View, { value: 2 }));
    armed = true;
    let commitError: unknown;
    try {
      candidate.commitHost();
    } catch (error) {
      commitError = error;
      trace.push("commit-threw");
    }
    equal(trace.slice(0, 4).join(","),
      "host-enter,setter-return,nested-flush-deferred,dispose-return",
      "public callback order");
    truth(commitError instanceof Error, "cancelled applying candidate must reject");
    equal(root.diagnostics().disposed, true, "root disposed in host callback");
    equal(root.diagnostics().pendingChangeCount, 0, "dispose drops pending work");
    // Proposed §5 contract: teardown waits until the active host batch exits.
    // Current trace explicitly records disposal returning within the host callback.
  } catch (error) {
    primaryFailed = true;
    throw error;
  } finally {
    cleanup([() => root.dispose()], primaryFailed);
  }
});

Deno.test("public task validation fails group after both hosts applied", () => {
  let armed = false;
  let stale = false;
  const trace: string[] = [];
  const host = (id: string) => new class extends MemoryVDOMHost {
    override setText(node: MemoryNode, value: string) {
      if (armed) {
        trace.push(`${id}:host-write`);
        stale = true;
      }
      super.setText(node, value);
    }
  }();
  const leftHost = host("left"), rightHost = host("right");
  const leftContainer = leftHost.createContainer();
  const rightContainer = rightHost.createContainer();
  const left = new ComponentStateRoot(leftHost, leftContainer, {
    rootId: "semantic-group-left",
    scheduleCommit() {},
  });
  const right = new ComponentStateRoot(rightHost, rightContainer, {
    rootId: "semantic-group-right",
    scheduleCommit() {},
  });
  let queue: NativeRootWorkQueue | undefined;
  let primaryFailed = false;
  try {
    const old = jsx("i", {}, "old");
    left.mount(old);
    right.mount(old);
    const leftAccepted = left.publicationVersion;
    const rightAccepted = right.publicationVersion;
    queue = new NativeRootWorkQueue();
    armed = true;
    const handle = queue.enqueue({
      id: "semantic-group-posthost-stale",
      roots: [
        { root: left, tree: jsx("i", {}, "new") },
        { root: right, tree: jsx("i", {}, "new") },
      ],
      validateWork: () => !stale,
    });
    equal(handle.status, "failed", "group terminal after posthost validation");
    equal(trace.join(","), "left:host-write,right:host-write", "both hosts applied");
    equal(leftContainer.children[0].children[0].text, "new", "left physical host");
    equal(rightContainer.children[0].children[0].text, "new", "right physical host");
    equal(left.publicationVersion, leftAccepted, "left accepted revision unchanged");
    equal(right.publicationVersion, rightAccepted, "right accepted revision unchanged");
    // Proposed §5 contract additionally requires an explicit failed-partial receipt.
    // This public seam is pre-publish; it does not exercise a later publish throw.
  } catch (error) {
    primaryFailed = true;
    throw error;
  } finally {
    cleanup([
      () => queue?.dispose(),
      () => left.dispose(),
      () => right.dispose(),
    ], primaryFailed);
  }
});
