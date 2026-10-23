import assert from "node:assert/strict";
import { DOMVDOMHost } from "./vdom_snapshot_runtime.ts";

class MockStyle {
  color = "";
  readonly custom = new Map<string, string>();
  setProperty(name: string, value: string) { this.custom.set(name, value); }
  removeProperty(name: string) { this.custom.delete(name); }
}

class MockElement {
  readonly style = new MockStyle() as unknown as CSSStyleDeclaration;
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, EventListener>();
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  addEventListener(name: string, listener: EventListener) {
    this.listeners.set(name, listener);
  }
  removeEventListener(name: string, listener: EventListener) {
    if (this.listeners.get(name) === listener) this.listeners.delete(name);
  }
}

class MockHTMLElement extends MockElement {
  private retained: unknown;
  propertyReads = 0;
  set custom(value: unknown) { this.retained = value; }
  get custom() { return this.retained; }
  get tricky() { this.propertyReads++; return null; }
}

class MockSVGElement extends MockElement {
  setAttributeNS(_namespace: string, name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttributeNS(_namespace: string, name: string) {
    this.attributes.delete(name);
  }
}

const installMocks = () => {
  const names = ["HTMLElement", "SVGElement", "HTMLLabelElement",
    "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement"] as const;
  const prior = names.map((name) =>
    [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const
  );
  for (const name of names) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: name === "SVGElement" ? MockSVGElement : MockHTMLElement,
    });
  }
  return () => {
    for (const [name, descriptor] of prior) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  };
};

const describe = (host: DOMVDOMHost, node: MockElement, name: string, next: unknown) => {
  const capability = host.describePropertyWrite(node as unknown as Node, name, next);
  assert.equal(capability.mayThrow, true);
  assert.equal(capability.mayReenter, true);
  assert.equal(capability.targetResource, null);
  assert.equal(capability.valueResource, null);
  return capability.valuePolicy;
};

Deno.test("DOM capability reports copied style and attribute inputs without aliasing", () => {
  const restore = installMocks();
  try {
    const host = new DOMVDOMHost();
    const html = new MockHTMLElement();
    const style = { color: "red", "--accent": "blue" };
    assert.equal(describe(host, html, "style", style), "copy");
    host.setProp(html as unknown as Node, "style", style, undefined);
    style.color = "green";
    assert.equal(html.style.color, "red");
    assert.equal((html.style as unknown as MockStyle).custom.get("--accent"), "blue");
    assert.equal(describe(host, html, "data-label", "ready"), "copy");
    host.setProp(html as unknown as Node, "data-label", "ready", undefined);
    assert.equal(html.attributes.get("data-label"), "ready");
    const svg = new MockSVGElement();
    assert.equal(describe(host, svg, "viewBox", "0 0 1 1"), "copy");
    host.setProp(svg as unknown as Node, "viewBox", "0 0 1 1", undefined);
    assert.equal(svg.attributes.get("viewBox"), "0 0 1 1");
  } finally {
    restore();
  }
});

Deno.test("DOM capability reports retained event listeners through replacement and removal", () => {
  const restore = installMocks();
  try {
    const host = new DOMVDOMHost();
    const element = new MockHTMLElement();
    const first = () => {};
    const second = () => {};
    assert.equal(describe(host, element, "onClick", first), "retain");
    host.setProp(element as unknown as Node, "onClick", first, undefined);
    assert.equal(element.listeners.get("click"), first);
    host.setProp(element as unknown as Node, "onClick", second, first);
    assert.equal(element.listeners.get("click"), second);
    host.setProp(element as unknown as Node, "onClick", null, second);
    assert.equal(element.listeners.has("click"), false);
    assert.equal(describe(host, element, "onClick", null), "unknown");
  } finally {
    restore();
  }
});

Deno.test("DOM capability leaves arbitrary setters and subclass overrides unknown", () => {
  const restore = installMocks();
  try {
    const host = new DOMVDOMHost();
    const element = new MockHTMLElement();
    const object = { id: 1 };
    assert.equal(describe(host, element, "custom", object), "unknown");
    assert.equal(describe(host, element, "tricky", object), "unknown");
    assert.equal(element.propertyReads, 0, "description invoked a property getter");
    host.setProp(element as unknown as Node, "custom", object, undefined);
    assert.equal(element.custom, object, "generic DOM setter did not retain input");
    class CustomHost extends DOMVDOMHost {
      override setProp(node: Node, name: string, value: unknown, previous: unknown) {
        super.setProp(node, name, value, previous);
      }
    }
    const subclass = new CustomHost();
    assert.equal(describe(subclass, element, "style", { color: "red" }), "unknown");
    assert.equal(describe(subclass, element, "onClick", () => {}), "unknown");
    const ownOverride = new DOMVDOMHost();
    ownOverride.setProp = (_node, _name, _value, _previous) => {};
    assert.equal(describe(ownOverride, element, "style", { color: "red" }), "unknown");
    const getterOverride = new DOMVDOMHost();
    let getterReads = 0;
    Object.defineProperty(getterOverride, "setProp", {
      configurable: true,
      get() { getterReads++; return host.setProp; },
    });
    assert.equal(describe(getterOverride, element, "style", { color: "red" }), "unknown");
    assert.equal(getterReads, 0, "description invoked an overridden setter getter");
  } finally {
    restore();
  }
});
