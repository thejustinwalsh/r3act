import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = process.env.NATIVE_DEV_FIX_PROJECT_ROOT
  ? path.resolve(process.env.NATIVE_DEV_FIX_PROJECT_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const installedRuntimePath = path.join(
  projectRoot,
  "node_modules/@compiled-ui/runtime/dist/src/native_runtime_api.js",
);
const source = `import { useState } from "@compiled-ui/runtime";\nexport function NativeCounter(){const [count]=useState(0);return <button>{count}</button>;}`;
const moduleId = path.join(projectRoot, "src/browser/native-package-dev-resolution.tsx");
const plugin = nativeModulePlugin({ root: projectRoot });

const userConfig = {
  optimizeDeps: {
    include: ["react", "react-dom/client"],
    exclude: ["user-kept-exclusion"],
  },
};
plugin.config.call({}, userConfig, { command: "serve", mode: "development" });
assert.deepEqual(userConfig.optimizeDeps, {
  include: ["react", "react-dom/client"],
  exclude: ["user-kept-exclusion", "@compiled-ui/runtime", "@compiled-ui/runtime/core"],
});

plugin.configResolved.call({}, { root: projectRoot });
const transform = plugin.transform;
assert.equal(typeof transform, "function");
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === "@compiled-ui/runtime") return { id: installedRuntimePath };
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
try {
  const result = await transform.call(context, source, moduleId);
  assert.ok(result?.code, "the canonical installed runtime entry opts native TSX into the compiler");
  assert.match(result.code, /__nativeUseStateAt\(/);
  assert.match(result.code, /import \* as __nativeJsx from "@compiled-ui\/runtime"/);

  const optimizedContext = {
    ...context,
    async resolve(specifier) {
      if (specifier === "@compiled-ui/runtime") {
        return { id: path.join(projectRoot, "node_modules/.vite/deps/@compiled-ui_runtime.js") };
      }
      return null;
    },
  };
  assert.equal(
    await transform.call(optimizedContext, source, moduleId),
    null,
    "an optimizer-generated lookalike ID is not accepted as the canonical package entry",
  );

  const lookalikeSource = source.replaceAll("@compiled-ui/runtime", "@compiled-ui/runtime-lookalike");
  const lookalikeContext = {
    ...context,
    async resolve() {
      return { id: installedRuntimePath };
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
  plugin.closeBundle?.call({});
}

console.log("Vite native installed-package dev resolution regression passed");
