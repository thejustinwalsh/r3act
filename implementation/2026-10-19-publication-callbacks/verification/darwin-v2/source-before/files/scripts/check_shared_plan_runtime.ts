import {
  mountRepeatedHostPlanCsr,
  type RepeatedPlanSource,
} from "../src/compiled_plan_runtime.ts";
import {
  bindingParticlesPlan,
  mountGeneratedBindingParticles,
} from "../src/browser/generated_shared_source_plan.ts";

class FakeElement {
  readonly style: Record<string, string> & { setProperty(name: string, value: string): void };
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  className = "";
  parentNode: FakeElement | null = null;

  constructor(readonly tagName: string) {
    const values: Record<string, string> = {};
    this.style = Object.assign(values, {
      setProperty(name: string, value: string) { values[name] = value; },
    });
  }

  setAttribute(name: string, value: string) { this.attributes.set(name, value); }

  appendChild(child: FakeElement) {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...children: FakeElement[]) {
    for (const child of this.children) child.parentNode = null;
    this.children.length = 0;
    for (const child of children) this.appendChild(child);
  }

  removeChild(child: FakeElement) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }

  remove() { this.parentNode?.removeChild(this); }
}

function snapshot(container: FakeElement) {
  return container.children[0].children.map(({ style }) => ({
    left: style.left,
    opacity: style.opacity,
    transform: style.transform,
  }));
}

const originalDocument = globalThis.document;
Object.defineProperty(globalThis, "document", {
  configurable: true,
  value: { createElement: (tagName: string) => new FakeElement(tagName) },
});

try {
  const sources: readonly RepeatedPlanSource[] = [
    { id: 0, values: [10] },
    { id: 1, values: [20] },
  ];
  const denseContainer = new FakeElement("main");
  const csrContainer = new FakeElement("main");
  const dense = mountGeneratedBindingParticles(sources, denseContainer as unknown as HTMLElement, [0.4]);
  const csr = mountRepeatedHostPlanCsr(sources, csrContainer as unknown as HTMLElement, bindingParticlesPlan, [0.4]);
  const initial = [
    { left: "10px", opacity: "0.4", transform: "translateX(10px)" },
    { left: "20px", opacity: "0.4", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(snapshot(denseContainer)) !== JSON.stringify(initial) ||
    JSON.stringify(snapshot(csrContainer)) !== JSON.stringify(initial)) {
    throw new Error("Generated dense and CSR plans did not initialize shared bindings identically");
  }

  dense.setShared(0, 0.9);
  dense.setShared(0, 0.6);
  dense.set(0, 15, 0);
  csr.setShared(0, 0.9);
  csr.setShared(0, 0.6);
  csr.set(0, 15, 0);
  dense.flush();
  csr.flush();
  const expected = [
    { left: "15px", opacity: "0.6", transform: "translateX(15px)" },
    { left: "20px", opacity: "0.6", transform: "translateX(20px)" },
  ];
  if (JSON.stringify(snapshot(denseContainer)) !== JSON.stringify(expected) ||
    JSON.stringify(snapshot(csrContainer)) !== JSON.stringify(expected)) {
    throw new Error("Generated dense and CSR plans diverged on shared fan-out/coalescing");
  }

  dense.dispose();
  csr.dispose();
  const record = {
    status: "pass",
    harness: "fake-dom",
    dispatchers: ["dense", "csr"],
    entities: sources.length,
    sharedPath: bindingParticlesPlan.dependencyGraph.sharedSourcePaths?.[0],
    initial,
    afterSharedFanOut: expected,
    parity: true,
    coalescing: true,
    localAndSharedBatch: true,
    timing: false,
  };
  const serialized = `${JSON.stringify(record, null, 2)}\n`;
  await Deno.writeTextFile("results/shared-source-runtime-check-v1.json", serialized);
  console.log(JSON.stringify(record));
} finally {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  });
}
