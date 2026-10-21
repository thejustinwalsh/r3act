import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const [arm, output] = process.argv.slice(2);
assert.ok(["native", "react"].includes(arm) && output && path.isAbsolute(output));
const consumer = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(consumer, `${arm}_arm.tsx`);
const activePlugin = arm === "native"
  ? (await import("@r3act/vite")).nativeModulePlugin()
  : (await import("@vitejs/plugin-react")).default({
    include: /react_arm\.tsx$/,
    babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] },
  });
let captured = false;
const capture = {
  name: "r3act-compiler-artifact-post-transform",
  enforce: "post",
  async transform(code, id) {
    if (path.resolve(id.split("?", 1)[0]) !== entry) return null;
    assert.equal(captured, false, "entry transformed more than once");
    captured = true;
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, "post-transform.js"), code, { flag: "wx" });
    return null;
  },
  closeBundle() { assert.equal(captured, true, "entry post-transform was not captured"); },
};
await build({
  configFile: false, root: consumer, logLevel: "error",
  plugins: [activePlugin, capture],
  esbuild: { jsx: "automatic", jsxImportSource: arm === "native" ? "@r3act/core" : "react" },
  build: {
    minify: false, sourcemap: true, outDir: path.join(output, "dist"), emptyOutDir: false,
    lib: { entry, formats: ["es"], fileName: arm },
  },
});
