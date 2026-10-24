import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = process.env.NATIVE_DEV_FIX_PROJECT_ROOT
  ? path.resolve(process.env.NATIVE_DEV_FIX_PROJECT_ROOT)
  : repositoryRoot;
const packageManifest = JSON.parse(await readFile(path.join(repositoryRoot, "packages/core/package.json"), "utf8"));
assert.equal(packageManifest.name, "@r3act/core");
const installedRoot = await mkdtemp(path.join(tmpdir(), "r3act-native-dev-entry-"));
const packageRoot = path.join(installedRoot, "node_modules/@r3act/core");
const installedRuntimePath = path.resolve(packageRoot, packageManifest.exports["."].import);
await mkdir(path.dirname(installedRuntimePath), { recursive: true });
await writeFile(path.join(packageRoot, "package.json"), JSON.stringify(packageManifest));
await writeFile(installedRuntimePath, "export {};\n");
const lookalikeRoot = path.join(installedRoot, "node_modules/@r3act/core-lookalike");
const lookalikeRuntimePath = path.resolve(lookalikeRoot, packageManifest.exports["."].import);
await mkdir(path.dirname(lookalikeRuntimePath), { recursive: true });
await writeFile(path.join(lookalikeRoot, "package.json"), JSON.stringify({
  ...packageManifest, name: "@r3act/core-lookalike",
}));
await writeFile(lookalikeRuntimePath, "export {};\n");
const source = `import { useState } from "@r3act/core";\nexport function NativeCounter(){const [count]=useState(0);return <button>{count}</button>;}`;
const moduleId = path.join(projectRoot, "src/browser/native-package-dev-resolution.tsx");
const plugin = nativeModulePlugin({ root: projectRoot, compilerRoot: repositoryRoot });

const userConfig = {
  optimizeDeps: {
    include: ["react", "react-dom/client"],
    exclude: ["user-kept-exclusion"],
  },
};
plugin.config.call({}, userConfig, { command: "serve", mode: "development" });
assert.deepEqual(userConfig.optimizeDeps, {
  include: ["react", "react-dom/client"],
  exclude: ["user-kept-exclusion", "@compiled-ui/runtime", "@compiled-ui/runtime/core", "@r3act/core"],
});

plugin.configResolved.call({}, { root: projectRoot });
const transform = plugin.transform;
assert.equal(typeof transform, "function");
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === "@r3act/core") return { id: installedRuntimePath };
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
try {
  const result = await transform.call(context, source, moduleId);
  assert.ok(result?.code, "the canonical core package entry opts native TSX into the compiler");
  assert.match(result.code, /__nativeUseStateAt\(/);
  assert.match(result.code, /import \* as __nativeJsx from "@r3act\/core"/);

  const optimizedContext = {
    ...context,
    async resolve(specifier) {
      if (specifier === "@r3act/core") {
        return { id: path.join(projectRoot, "node_modules/.vite/deps/@r3act_core.js") };
      }
      return null;
    },
  };
  assert.equal(
    await transform.call(optimizedContext, source, moduleId),
    null,
    "an optimizer-generated lookalike ID is not accepted as the canonical package entry",
  );

  const aliasSource = source.replaceAll("@r3act/core", "@alias/native");
  const aliasContext = {
    ...context,
    async resolve(specifier) {
      return specifier === "@alias/native" ? { id: installedRuntimePath } : null;
    },
  };
  const alias = await transform.call(aliasContext, aliasSource, moduleId);
  assert.match(alias?.code ?? "", /__nativeUseStateAt\(/,
    "a resolver-confirmed alias to the canonical core entry remains native");

  const lookalikeSource = source.replaceAll("@r3act/core", "@r3act/core-lookalike");
  const lookalikeContext = {
    ...context,
    async resolve() {
      return { id: lookalikeRuntimePath };
    },
  };
  assert.equal(
    await transform.call(lookalikeContext, lookalikeSource, moduleId),
    null,
    "a similarly named package is not accepted even if it resolves to a runtime-looking file",
  );

  const reactSource = `import { useState } from "react";\nexport function ReactCounter(){const [count]=useState(0);return <button>{count}</button>;}`;
  assert.equal(await transform.call(context, reactSource, moduleId), null, "React stays on its ordinary Vite transform path");
} finally {
  try { plugin.closeBundle?.call({}); }
  finally { await rm(installedRoot, { recursive: true, force: true }); }
}

console.log("Vite native installed-package dev resolution regression passed");
