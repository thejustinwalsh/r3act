import { Fragment, jsx, jsxs } from "./native_jsx_runtime.ts";
import { jsxDEV } from "./native_jsx_dev_runtime.ts";
import { jsx as classicJsx } from "./jsx_binding_runtime.ts";
import type { RuntimeNode } from "./jsx_binding_runtime.ts";
import { ComponentStateRoot } from "./component_state_runtime.ts";
import { MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

const assertEquals = (actual: unknown, expected: unknown, message = "Values differ") => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
};

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("automatic jsx consumes the fixed ABI and keeps props.children", () => {
  const child = jsx("span", { title: "child" });
  const input = { id: "parent", children: child };
  const element = jsx("div", input);

  assertEquals(element.type, "div");
  assertEquals(element.props.id, "parent");
  assert(element.props.children === child, "Single child identity changed");
  assertEquals(element.props.key, undefined);
  assert(!("key" in input), "jsx mutated its input props");
  assert(Object.isFrozen(input) === false, "jsx unexpectedly froze input props");
});

Deno.test("automatic jsxs preserves multiple children as one children array", () => {
  const first = jsx("span", { children: "first" });
  const second = jsx("span", { children: "second" });
  const children: RuntimeNode[] = [first, second];
  const element = jsxs("div", { children });

  assert(Array.isArray(element.props.children), "Children array was not preserved");
  assertEquals(element.props.children, [first, second]);
  assert(Object.isFrozen(element.props.children), "Children array should be immutable");
});

Deno.test("separate automatic key overrides props.key; absent key preserves props.key", () => {
  const explicit = jsx("li", { key: "from-props", value: 1 }, "from-abi");
  const fallback = jsx("li", { key: "from-props", value: 2 });
  const noKey = jsx("li", { key: "from-props" }, null);
  const numeric = jsx("li", { key: "from-props" }, 0);

  assertEquals(explicit.props.key, "from-abi");
  assertEquals(fallback.props.key, "from-props");
  assertEquals(noKey.props.key, null, "Explicit null key did not override props.key");
  assertEquals(numeric.props.key, 0, "Numeric zero key was lost");
});

Deno.test("automatic helpers support Fragment and function component types", () => {
  const Label = ({ children }: { children?: RuntimeNode }) =>
    jsx("strong", { children });
  const component = jsx(Label, { children: "ready" }, "label");
  const fragment = jsxs(Fragment, { children: [component, "!"] });

  assert(component.type === Label, "Function component type changed");
  assertEquals(component.props.children, "ready");
  assert(fragment.type === Fragment, "Fragment type changed");
  assertEquals(fragment.props.children, [component, "!"]);
});

Deno.test("jsxDEV accepts the standard development ABI and applies its key", () => {
  const source = { fileName: "example.tsx", lineNumber: 4, columnNumber: 3 };
  const element = jsxDEV("button", { children: "save", key: "prop-key" }, "dev-key", true, source, {});

  assertEquals(element.type, "button");
  assertEquals(element.props.children, "save");
  assertEquals(element.props.key, "dev-key");
});

Deno.test("classic variadic JSX factory keeps its existing child semantics", () => {
  const element = classicJsx("div", { id: "classic" }, "one", "two");
  assertEquals(element.props.children, ["one", "two"]);
  assertEquals(element.props.id, "classic");
});

Deno.test("automatic keys preserve keyed host identity when children reorder", () => {
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container);
  const keyedList = (ids: readonly string[]) => jsx("ul", {
    children: ids.map((id) => jsx("li", { "data-id": id }, id)),
  });

  root.mount(keyedList(["a", "b", "c"]));
  const list = container.children[0];
  const originalNodes = new Map(list.children.map((node) => [node.props["data-id"], node]));
  root.update(keyedList(["c", "a", "b"]));

  const reordered = list.children;
  assertEquals(reordered.map((node) => node.props["data-id"]), ["c", "a", "b"]);
  assert(reordered[0] === originalNodes.get("c"), "Key c did not retain its host node");
  assert(reordered[1] === originalNodes.get("a"), "Key a did not retain its host node");
  assert(reordered[2] === originalNodes.get("b"), "Key b did not retain its host node");
  root.dispose();
});
