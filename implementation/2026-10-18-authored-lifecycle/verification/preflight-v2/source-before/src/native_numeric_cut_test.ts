import {
  bindStatePropAt,
  bindStatePropsAt,
  ComponentStateRoot,
  defineComponent,
  useStateAt,
} from "./component_state_runtime.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("reentrant host writes do not mix numeric projection versions in one commit", () => {
  let setA!: (value: number) => boolean;
  let setB!: (value: number) => boolean;
  class Host extends MemoryVDOMHost {
    reenter = false;
    override setProp(node: MemoryNode, name: string, value: unknown, previous?: unknown) {
      super.setProp(node, name, value, previous);
      if (this.reenter && name === "data-a") {
        this.reenter = false;
        setB(9);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  const Output = defineComponent("numeric-cut-output", () => {
    const [, a] = useStateAt("a", 1);
    const [, b] = useStateAt("b", 1);
    setA = a;
    setB = b;
    return jsx("output", {
      "data-a": bindStatePropAt("a", (value) => value),
      "data-b": bindStatePropAt("b", (value) => value),
      "data-sum": bindStatePropsAt(["a", "b"], ([a, b]) => a + b),
    });
  }, { propOnlySites: ["a", "b"] });
  try {
    root.mount(jsx(Output, {}));
    setA(2);
    setB(3);
    host.reenter = true;
    root.flush();
    const node = container.children[0];
    const values = () => [node.props["data-a"], node.props["data-b"], node.props["data-sum"]];
    assertEquals(values(), [2, 3, 5], "first commit must use its complete captured cut");
    root.flush();
    assertEquals(values(), [2, 9, 11], "newer reentrant write belongs to the next commit");
  } finally {
    root.dispose();
  }
});
