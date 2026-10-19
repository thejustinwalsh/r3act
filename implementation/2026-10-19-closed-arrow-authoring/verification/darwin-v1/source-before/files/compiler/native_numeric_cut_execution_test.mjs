import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { jsx } from "../src/jsx_binding_runtime.ts";

const directory = process.cwd();
const nativeImport = pathToFileURL(path.join(directory, "src/native_runtime_api.ts")).href;
const source = `import { useState } from ${JSON.stringify(nativeImport)};
export const control: Record<string, (value: number) => boolean> = {};
export const trace = { renders: 0 };
export function Output() {
  trace.renders++;
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  control.a = setA;
  control.b = setB;
  return <output data-a={a} data-b={b} data-sum={a + b} />;
}`;
const plugin = nativeModulePlugin();
plugin.configResolved.call({}, { root: directory });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === nativeImport ? { id: path.join(directory, "src/native_runtime_api.ts") } : null;
  },
  error(message) { throw new Error(String(message)); },
};
let root;
try {
  const transformed = await plugin.transform.call(context, source, path.join(directory, ".cache/native-numeric-cut.tsx"));
  const executable = transformed.code.slice(0, transformed.code.indexOf("export const compiledNativeComponentPlan"));
  assert.equal((executable.match(/__nativeBindStatePropAt\(/g) ?? []).length, 2);
  assert.equal((executable.match(/__nativeBindStatePropsAt\(/g) ?? []).length, 1);
  await mkdir(".cache", { recursive: true });
  const output = path.join(directory, ".cache/native-numeric-cut.mjs");
  await writeFile(output, transformed.code);
  const app = await import(`${pathToFileURL(output).href}?run=${Date.now()}`);
  class Host extends MemoryVDOMHost {
    reenter = false;
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (this.reenter && name === "data-a") {
        this.reenter = false;
        app.control.b(9);
      }
    }
  }
  const host = new Host();
  const container = host.createContainer();
  const counterFrames = [];
  root = createNativeRoot(host, container, {
    scheduleCommit() {},
    profileCounter(frame) { counterFrames.push(frame); },
  });
  root.mount(jsx(app.Output, {}));
  app.control.a(2);
  app.control.b(3);
  host.reenter = true;
  root.flush();
  const values = () => ["data-a", "data-b", "data-sum"].map(name => container.children[0].props[name]);
  assert.deepEqual(values(), [2, 3, 5], "one captured cut must drive all compiled props");
  root.flush();
  assert.deepEqual(values(), [2, 9, 11], "reentrant writes must survive for the next commit");
  assert.equal(app.trace.renders, 1, "coherent numeric writes must not rerun the component");
  assert.equal(counterFrames.reduce((sum, frame) => sum + (frame["numeric.compiled-site-cache-constructions"] ?? 0), 0), 1, "compiled owner eligibility is interpreted once");
  assert.equal(counterFrames.reduce((sum, frame) => sum + (frame["numeric.compiled-site-metadata-inspections"] ?? 0), 0), 2, "both compiled state sites are interpreted once");
  assert.equal(counterFrames[1]["numeric.compiled-site-metadata-inspections"] ?? 0, 0, "reentrant retry reuses the compiled eligibility");
  console.log("Compiled numeric projection cut PASS: ordinary TSX, coherent unary/compound props, newer reentrant version, no component rerender.");
} finally {
  root?.dispose();
  plugin.closeBundle?.call({});
}
