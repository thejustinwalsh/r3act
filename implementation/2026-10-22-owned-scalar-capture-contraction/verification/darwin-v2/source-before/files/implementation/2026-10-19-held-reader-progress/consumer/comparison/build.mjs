import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { nativeReactPlugins } from "@r3act/vite";
import { build } from "vite";

const mode = process.argv[2], output = process.argv[3];
if (!["native", "react"].includes(mode) || !output)
  throw new Error("usage: node comparison/build.mjs native|react OUTPUT");
const consumer = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = path.join(consumer, "comparison", mode);
const compilerEvents = [], transformed = [];
const capture = {
  name: "held-reader-comparison-transform-capture",
  enforce: "post",
  async transform(code, id) {
    const clean = id.split("?", 1)[0];
    if (!clean.startsWith(`${consumer}${path.sep}`) ||
      clean.includes(`${path.sep}node_modules${path.sep}`) ||
      !/\.[cm]?[jt]sx?$/.test(clean)) return null;
    const relative = path.relative(consumer, clean).replaceAll(path.sep, "/");
    const target = path.join(output, "transforms", mode, `${relative}.js`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code);
    transformed.push(relative);
    return null;
  },
};
const reactOptions = { include: mode === "native" ? /\/react-panel\.tsx$/ :
  /\/(?:react|react-panel)\.tsx$/,
  babel: { plugins: [["babel-plugin-react-compiler", { target: "19",
    logger: { logEvent(filename, event) {
      compilerEvents.push({ filename, kind: event.kind,
        fnName: event.fnName ?? null, reason: event.reason ?? null });
    } },
  }]] } };
const plugins = mode === "native"
  ? nativeReactPlugins(react, { root: consumer, sourceRoots: ["."],
    reactOptions: { ...reactOptions, jsxImportSource: "react" } })
  : react({ ...reactOptions, jsxImportSource: "react" });
plugins.push(capture);
await build({ configFile: false, root, base: "./", plugins, logLevel: "info",
  ...(mode === "react" ? { oxc: { jsx: { runtime: "automatic", importSource: "react" } } } : {}),
  build: { outDir: path.join(output, "dist", mode), emptyOutDir: true, minify: false,
    rolldownOptions: { input: path.join(root, "index.html") } } });
await writeFile(path.join(output, `build-${mode}-transforms.json`), JSON.stringify({
  mode, transformed: transformed.sort(), compilerEvents,
}, null, 2) + "\n");
