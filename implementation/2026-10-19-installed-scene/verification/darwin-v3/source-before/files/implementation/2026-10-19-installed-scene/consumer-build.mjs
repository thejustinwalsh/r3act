import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "vite";
import { nativeModulePlugin } from "@r3act/vite";
import react from "@vitejs/plugin-react";

const consumer = process.cwd();
const mode = process.argv[2];
const output = process.argv[3];
if (!["scene", "native", "react"].includes(mode) || !output)
  throw new Error("usage: node consumer-build.mjs scene|native|react OUTPUT");
const source = path.join(consumer, mode === "scene" ? "example" : `comparison-${mode}`);
const captures = path.join(output, "transforms", mode);
await mkdir(captures, { recursive: true });
const transformed = [];
const capture = {
  name: "installed-transform-capture", enforce: "post",
  async transform(code, id) {
    const clean = id.split("?", 1)[0];
    if (!clean.startsWith(`${source}${path.sep}`) || !/\.[cm]?[jt]sx?$/.test(clean)) return null;
    const relative = path.relative(source, clean).replaceAll(path.sep, "/");
    const target = path.join(captures, `${relative}.js`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code);
    transformed.push(relative);
    return null;
  },
};
const compilerEvents = [];
const wrapperInputs = [];
const wrapperAudit = { name: "installed-wrapper-input-audit", enforce: "pre",
  async transform(code, id) {
    if (!id.includes("node_modules") || !id.endsWith("react_radix_dialog_adapter.js")) return null;
    const target = path.join(output, "wrapper-input", mode, "react_radix_dialog_adapter.js");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code);
    wrapperInputs.push({ phase: "pre", id, path: target });
    return null;
  },
};
const wrapperOutputAudit = { name: "installed-wrapper-output-audit", enforce: "post",
  async transform(code, id) {
    if (!id.includes("node_modules") || !id.endsWith("react_radix_dialog_adapter.js")) return null;
    const target = path.join(output, "wrapper-output", mode, "react_radix_dialog_adapter.js");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code);
    wrapperInputs.push({ phase: "post", id, path: target });
    return null;
  },
};
const plugins = [wrapperAudit, nativeModulePlugin()];
if (mode === "react") plugins.push(react({ include: /\/comparison-react\/react\.tsx$/,
  babel: { plugins: [["babel-plugin-react-compiler", { target: "19",
    logger: { logEvent(filename, event) { compilerEvents.push({ filename,
      kind: event.kind, fnName: event.fnName ?? null,
      reason: event.reason ?? null }); } },
  }]] } }));
plugins.push(wrapperOutputAudit, capture);
await build({ configFile: false, root: source, base: mode === "scene" ? "/" : "./", logLevel: "info", plugins,
  build: { outDir: path.join(output, "dist", mode), emptyOutDir: true, minify: false,
    rolldownOptions: { input: path.join(source, "index.html") } } });
await writeFile(path.join(output, `build-${mode}-transforms.json`), JSON.stringify({
  mode, transformed: transformed.sort(), compilerEvents, wrapperInputs,
}, null, 2) + "\n");
