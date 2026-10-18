import { jsx } from "./jsx_binding_runtime.ts";
import { DOMVDOMHost, VDOMSnapshotRoot } from "./vdom_snapshot_runtime.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

class TestStyle {
  values = new Map<string, string>();
  color = "";
  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }
  removeProperty(name: string) {
    this.values.delete(name);
  }
}

class TestElement {
  readonly attributes = new Map<string, string>();
  readonly namespacedAttributes = new Map<string, string>();
  readonly style = new TestStyle() as unknown as CSSStyleDeclaration;
  readonly children: TestElement[] = [];
  parentNode: TestElement | null = null;
  textContent: string | null = null;
  readonly listeners = new Map<string, EventListener>();

  constructor(readonly namespaceURI: string, readonly localName: string) {}

  get lastChild(): TestElement | null {
    return this.children.at(-1) ?? null;
  }
  get nextSibling(): TestElement | null {
    if (!this.parentNode) return null;
    return this.parentNode.children[
      this.parentNode.children.indexOf(this) + 1
    ] ?? null;
  }
  insertBefore(node: TestElement, before: TestElement | null) {
    if (node.parentNode) node.parentNode.removeChild(node);
    const index = before === null
      ? this.children.length
      : this.children.indexOf(before);
    this.children.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }
  removeChild(node: TestElement) {
    const index = this.children.indexOf(node);
    if (index >= 0) this.children.splice(index, 1);
    node.parentNode = null;
    return node;
  }
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  setAttributeNS(namespace: string, name: string, value: string) {
    this.namespacedAttributes.set(`${namespace}|${name}`, value);
  }
  removeAttributeNS(namespace: string, localName: string) {
    this.namespacedAttributes.delete(`${namespace}|xlink:${localName}`);
  }
  addEventListener(name: string, listener: EventListener) {
    this.listeners.set(name, listener);
  }
  removeEventListener(name: string, listener: EventListener) {
    if (this.listeners.get(name) === listener) this.listeners.delete(name);
  }
}

class TestHTMLElement extends TestElement {
  className = "";
  value = "";
  checked = false;
  constructor(name: string) {
    super("http://www.w3.org/1999/xhtml", name);
  }
}
class TestSVGElement extends TestElement {
  constructor(name: string) {
    super(SVG_NS, name);
  }
}
class TestInputElement extends TestHTMLElement {
  constructor() {
    super("input");
  }
}
class TestTextAreaElement extends TestHTMLElement {
  constructor() {
    super("textarea");
  }
}
class TestSelectElement extends TestHTMLElement {
  constructor() {
    super("select");
  }
}
class TestLabelElement extends TestHTMLElement {
  htmlFor = "";
  constructor() {
    super("label");
  }
}

const installDOMMocks = () => {
  const names = [
    "Element",
    "HTMLElement",
    "SVGElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "HTMLLabelElement",
    "document",
  ] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const name of names) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  const set = (name: string, value: unknown) =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  set("Element", TestElement);
  set("HTMLElement", TestHTMLElement);
  set("SVGElement", TestSVGElement);
  set("HTMLInputElement", TestInputElement);
  set("HTMLTextAreaElement", TestTextAreaElement);
  set("HTMLSelectElement", TestSelectElement);
  set("HTMLLabelElement", TestLabelElement);
  set("document", {
    createElement: (name: string) => new TestHTMLElement(name),
    createElementNS: (_namespace: string, name: string) =>
      new TestSVGElement(name),
    createTextNode: (text: string) => {
      const node = new TestElement("text", "#text");
      node.textContent = text;
      return node;
    },
  });
  return () => {
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
};

Deno.test("DOM VDOM inherits SVG context and resets descendants at foreignObject", () => {
  const restore = installDOMMocks();
  try {
    const host = new DOMVDOMHost();
    const container = new TestSVGElement("svg");
    const root = new VDOMSnapshotRoot(host, container as unknown as Node);
    root.commit(
      jsx(
        "g",
        {},
        jsx("path", { d: "M0 0" }),
        jsx(
          "foreignObject",
          {},
          jsx("div", {}, jsx("svg", {}, jsx("circle", {}))),
        ),
      ),
    );

    const group = container.children[0];
    const foreignObject = group.children[1];
    const htmlDiv = foreignObject.children[0];
    const nestedSvg = htmlDiv.children[0];
    if (
      group.namespaceURI !== SVG_NS ||
      group.children[0].namespaceURI !== SVG_NS ||
      foreignObject.namespaceURI !== SVG_NS ||
      htmlDiv.namespaceURI === SVG_NS || nestedSvg.namespaceURI !== SVG_NS ||
      nestedSvg.children[0].namespaceURI !== SVG_NS
    ) {
      throw new Error(
        "SVG namespace inheritance or foreignObject reset failed",
      );
    }
  } finally {
    restore();
  }
});

Deno.test("SVG props use attributes and styles without assigning animated properties", () => {
  const restore = installDOMMocks();
  try {
    const host = new DOMVDOMHost();
    const svg = new TestSVGElement("svg");
    host.setProp(svg as unknown as Node, "viewBox", "0 0 10 10", undefined);
    host.setProp(svg as unknown as Node, "strokeWidth", 2, undefined);
    host.setProp(svg as unknown as Node, "xlinkHref", "#shape", undefined);
    host.setProp(svg as unknown as Node, "aria-hidden", false, undefined);
    host.setProp(svg as unknown as Node, "data-active", false, undefined);
    host.setProp(svg as unknown as Node, "keyPoints", "0;1", undefined);
    host.setProp(svg as unknown as Node, "repeatDur", "indefinite", undefined);
    host.setProp(svg as unknown as Node, "numOctaves", 2, undefined);
    host.setProp(svg as unknown as Node, "limitingConeAngle", 30, undefined);
    host.setProp(svg as unknown as Node, "baseProfile", "full", undefined);
    host.setProp(svg as unknown as Node, "tableValues", "0 1", undefined);
    host.setProp(svg as unknown as Node, "pointsAtX", 1, undefined);
    host.setProp(
      svg as unknown as Node,
      "style",
      { color: "red", "--accent": "blue" },
      undefined,
    );
    if (
      svg.attributes.get("viewBox") !== "0 0 10 10" ||
      svg.attributes.get("stroke-width") !== "2" ||
      svg.attributes.get("aria-hidden") !== "false" ||
      svg.attributes.get("data-active") !== "false" ||
      svg.attributes.get("keyPoints") !== "0;1" ||
      svg.attributes.get("repeatDur") !== "indefinite" ||
      svg.attributes.get("numOctaves") !== "2" ||
      svg.attributes.get("limitingConeAngle") !== "30" ||
      svg.attributes.get("baseProfile") !== "full" ||
      svg.attributes.get("tableValues") !== "0 1" ||
      svg.attributes.get("pointsAtX") !== "1" ||
      svg.namespacedAttributes.get(`${XLINK_NS}|xlink:href`) !== "#shape" ||
      (svg.style as unknown as TestStyle).color !== "red" ||
      (svg.style as unknown as TestStyle).values.get("--accent") !== "blue"
    ) throw new Error("SVG attribute or style write failed");

    host.setProp(svg as unknown as Node, "viewBox", null, "0 0 10 10");
    host.setProp(svg as unknown as Node, "xlinkHref", null, "#shape");
    host.setProp(svg as unknown as Node, "aria-hidden", null, "false");
    if (
      svg.attributes.has("viewBox") || svg.attributes.has("aria-hidden") ||
      svg.namespacedAttributes.size !== 0
    ) {
      throw new Error("SVG attribute removal failed");
    }
  } finally {
    restore();
  }
});

Deno.test("HTML form values, booleans and native event replacement keep DOM semantics", () => {
  const restore = installDOMMocks();
  try {
    const host = new DOMVDOMHost();
    const input = new TestInputElement();
    const oldClick = () => {};
    const newClick = () => {};
    host.setProp(input as unknown as Node, "value", "ready", undefined);
    host.setProp(input as unknown as Node, "checked", true, false);
    host.setProp(input as unknown as Node, "onClick", oldClick, undefined);
    host.setProp(input as unknown as Node, "onClick", newClick, oldClick);
    if (
      input.value !== "ready" || !input.checked ||
      input.listeners.get("click") !== newClick
    ) throw new Error("HTML form or event semantics changed");
    host.setProp(input as unknown as Node, "value", null, "ready");
    host.setProp(input as unknown as Node, "checked", false, true);
    if (
      String(input.value) !== "" || input.checked ||
      input.attributes.has("value")
    ) {
      throw new Error("HTML form property clearing failed");
    }
  } finally {
    restore();
  }
});
