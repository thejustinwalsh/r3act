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
const nativeCodes = new Map();
const capture = {
  name: `installed-async-ux-${mode}-capture`,
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
    if (relative === "app.tsx" || relative === "scene.tsx") nativeCodes.set(relative, code);
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
  sourceRoots: ["app.tsx", "scene.tsx"],
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
const reactMemoSlots = { Projection: [], Result: [], App: [] };
const nativeSemantic = {};
if (mode === "native") {
  for (const [filename, code] of nativeCodes) {
    const program = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] }).program;
    const registerAliases = new Set(program.body.filter(node => node.type === "ImportDeclaration")
      .flatMap(node => node.specifiers.filter(item => item.type === "ImportSpecifier" &&
        (item.imported.name ?? item.imported.value) === "registerCompiledSemanticPlan")
        .map(item => item.local.name)));
    const calls = [];
    const visit = node => {
      if (!node || typeof node !== "object") return;
      if (node.type === "CallExpression") calls.push(node);
      for (const [key, value] of Object.entries(node)) {
        if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    };
    visit(program);
    const field = (node, name) => node?.type === "ObjectExpression"
      ? node.properties.find(item => item.type === "ObjectProperty" &&
        (item.key.name ?? item.key.value) === name)?.value : undefined;
    const literal = node => node?.type === "StringLiteral" ? node.value : null;
    const definitions = calls.filter(node => /defineComponent/i.test(node.callee.name ?? ""));
    const registrations = calls.filter(node => registerAliases.has(node.callee.name));
    const plans = registrations.map(node => {
      const value = node.arguments[0];
      return { sourceFile: literal(field(value, "source_file")),
        revision: literal(field(value, "module_revision")),
        owners: field(value, "owners")?.elements?.map(owner => literal(field(owner, "site_id"))) ?? [] };
    });
    nativeSemantic[filename] = {
      componentDefinitions: definitions.map(node => literal(node.arguments[0])),
      semanticPlans: plans,
      compiledHookCalls: calls.filter(node => /__nativeUse(?:At|StoreAt|EffectAt|StateAt)/.test(node.callee.name ?? "")).length,
    };
  }
}
if (mode === "react") {
  const program = parse(reactArmCode, { sourceType: "module", plugins: ["typescript", "jsx"] }).program;
  const memoAliases = new Set(program.body.filter(node =>
    node.type === "ImportDeclaration" && node.source.value === "react/compiler-runtime"
  ).flatMap(node => node.specifiers.filter(item =>
    item.type === "ImportSpecifier" && item.imported.name === "c").map(item => item.local.name)));
  const visit = (node, callback) => {
    if (!node || typeof node !== "object") return;
    callback(node);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(child => visit(child, callback));
      else if (value && typeof value === "object") visit(value, callback);
    }
  };
  const functions = [];
  visit(program, node => {
    if (node.type === "FunctionDeclaration" && Object.hasOwn(reactMemoSlots, node.id?.name)) functions.push(node);
  });
  for (const name of Object.keys(reactMemoSlots)) {
    const fn = functions.find(item => item.id?.name === name);
    if (!fn) continue;
    visit(fn.body, node => {
      if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
          memoAliases.has(node.callee.name) && node.arguments[0]?.type === "NumericLiteral" &&
          node.arguments[0].value > 0) reactMemoSlots[name].push(node.arguments[0].value);
    });
  }
}
await writeFile(path.join(output, `build-${mode}-transforms.json`),
  JSON.stringify({ mode, transformed: transformed.sort(), compilerEvents,
    reactMemoSlots, nativeSemantic }, null, 2) + "\n",
  { flag: "wx" });
