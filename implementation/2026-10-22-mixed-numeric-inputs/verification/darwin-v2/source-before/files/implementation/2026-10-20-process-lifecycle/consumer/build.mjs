import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import react from "@vitejs/plugin-react";
import { nativeReactPlugins } from "@r3act/vite";
import { build } from "vite";

const mode = process.argv[2];
const proof = process.argv[3];
assert.ok(mode === "native" || mode === "react", "usage: node build.mjs native|react PROOF_DIR");
assert.ok(proof, "proof directory is required");
const consumer = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(proof);
const transformed = [];
const compilerEvents = [];
let reactArmCode = "";
const capture = {
  name: `process-lifecycle-${mode}-capture`,
  enforce: "post",
  async transform(code, id) {
    const clean = id.split("?", 1)[0];
    if (!clean.startsWith(`${consumer}${path.sep}`) ||
        clean.includes(`${path.sep}node_modules${path.sep}`) ||
        !/\.[cm]?[jt]sx?$/.test(clean)) return null;
    const relative = path.relative(consumer, clean).replaceAll(path.sep, "/");
    const target = path.join(output, "transforms", mode, `${relative}.js`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, code, { flag: "wx" });
    transformed.push(relative);
    if (relative === "react_arm.tsx") reactArmCode = code;
    return null;
  },
};
const reactOptions = {
  include: /(?:^|\/)react_arm\.tsx$/,
  jsxImportSource: "react",
  babel: { plugins: [["babel-plugin-react-compiler", {
    target: "19",
    logger: { logEvent(filename, event) {
      compilerEvents.push({ filename, kind: event.kind,
        fnName: event.fnName ?? null, reason: event.reason ?? null });
    } },
  }]] },
};
const plugins = nativeReactPlugins(react, {
  root: consumer,
  sourceRoots: ["native_arm.tsx"],
  reactOptions,
});
plugins.push(capture);
await build({
  configFile: false,
  root: consumer,
  base: "./",
  plugins,
  logLevel: "info",
  ...(mode === "react" ? { oxc: { jsx: { runtime: "automatic", importSource: "react" } } } : {}),
  build: {
    outDir: path.join(output, "dist", mode),
    emptyOutDir: true,
    minify: false,
    rolldownOptions: { input: path.join(consumer, `${mode}.html`) },
  },
});
const reactRowMemoSlots = [];
if (mode === "react") {
  const program = parse(reactArmCode, { sourceType: "module", plugins: ["typescript", "jsx"] }).program;
  const memoAliases = new Set(program.body.filter(node =>
    node.type === "ImportDeclaration" && node.source.value === "react/compiler-runtime"
  ).flatMap(node => node.specifiers.filter(item =>
    item.type === "ImportSpecifier" && item.imported.name === "c").map(item => item.local.name)));
  const row = program.body.find(node => node.type === "FunctionDeclaration" && node.id?.name === "ReactRow");
  const visit = node => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
        memoAliases.has(node.callee.name) && node.arguments[0]?.type === "NumericLiteral" &&
        node.arguments[0].value > 0) reactRowMemoSlots.push(node.arguments[0].value);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  if (row) visit(row.body);
}
await writeFile(path.join(output, `build-${mode}-transforms.json`),
  JSON.stringify({ mode, transformed: transformed.sort(), compilerEvents, reactRowMemoSlots }, null, 2) + "\n",
  { flag: "wx" });
