import {
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "../../../../src/component_state_runtime.ts";
import { jsx } from "../../../../src/jsx_binding_runtime.ts";
import {
  type MemoryNode,
  MemoryVDOMHost,
} from "../../../../src/vdom_snapshot_runtime.ts";

const equal = (actual: unknown, expected: unknown, label: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

Deno.test("disposing during public host application removes the live root inside callback", () => {
  let root!: ComponentStateRoot<MemoryNode, MemoryNode>;
  let setLocal!: (value: number) => boolean;
  let armed = false;
  let insideHost = false;
  let insideDisposed: boolean | undefined;
  let insideOwnerCount: number | undefined;
  let insideContainerChildren: number | undefined;
  let insideRemovals = 0;
  let container!: MemoryNode;
  const trace: string[] = [];
  const host = new class extends MemoryVDOMHost {
    override setProp(
      node: MemoryNode,
      name: string,
      value: unknown,
      previous?: unknown,
    ) {
      if (!armed || name !== "data-value") {
        super.setProp(node, name, value, previous);
        return;
      }
      armed = false;
      insideHost = true;
      trace.push("host-enter");
      try {
        equal(setLocal(9), true, "reentrant setter accepted");
        equal(root.flush(), false, "nested flush deferred");
        root.dispose();
        trace.push("dispose-return");
        const observed = root.diagnostics();
        insideDisposed = observed.disposed;
        insideOwnerCount = observed.ownerCount;
        insideContainerChildren = container.children.length;
        super.setProp(node, name, value, previous);
      } finally {
        insideHost = false;
        trace.push("host-exit");
      }
    }
    override remove(parent: MemoryNode, node: MemoryNode) {
      if (insideHost) {
        insideRemovals++;
        trace.push("host-remove-inside");
      }
      super.remove(parent, node);
    }
  }();
  container = host.createContainer();
  root = new ComponentStateRoot(host, container, {
    rootId: "semantic-observable-disposal-v3",
    scheduleCommit() {},
  });
  const View = defineComponent(
    "semantic-observable-disposal-view",
    ({ value }: { value: number }) => {
      const [, set] = useStateAt("local", 0);
      setLocal = set;
      return jsx("output", { "data-value": value });
    },
  );
  let primaryFailed = false;
  try {
    root.mount(jsx(View, { value: 0 }));
    equal(root.diagnostics().ownerCount > 0, true, "mounted owner exists");
    equal(container.children.length, 1, "mounted host child exists");
    const candidate = root.prepare(jsx(View, { value: 2 }));
    armed = true;
    let commitError: unknown;
    try {
      candidate.commitHost();
    } catch (error) {
      commitError = error;
      trace.push("commit-threw");
    }
    equal(commitError instanceof Error, true, "cancelled candidate rejects");
    equal(insideDisposed, true, "disposed flag already set inside host callback");
    equal(insideOwnerCount, 0, "owner retirement completed inside callback");
    equal(insideContainerChildren, 0, "host child removed inside callback");
    equal(insideRemovals > 0, true, "host.remove ran inside callback");
    equal(trace[0], "host-enter", "callback entered first");
    equal(trace.indexOf("host-remove-inside") < trace.indexOf("dispose-return"),
      true, "host removal precedes dispose return");
    equal(trace.indexOf("dispose-return") < trace.indexOf("host-exit"),
      true, "dispose returns before callback exit");
  } catch (error) {
    primaryFailed = true;
    throw error;
  } finally {
    try {
      root.dispose();
    } catch (cleanupError) {
      if (primaryFailed) console.error("Probe cleanup failed after primary error", cleanupError);
      else throw cleanupError;
    }
  }
});
