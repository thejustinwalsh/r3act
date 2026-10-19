import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { nativeReactPlugins } from "./vite_native_plugin.ts";

const root = mkdtempSync(path.join(os.tmpdir(), "r3act-native-react-"));
try {
  mkdirSync(path.join(root, "src"));
  mkdirSync(path.join(root, "implementation"));
  const nativeFile = path.join(root, "src", "main.tsx");
  const reactFile = path.join(root, "src", "panel.tsx");
  writeFileSync(nativeFile, 'import { use } from "@r3act/core"; export const View = () => <output>{use(data)}</output>;');
  writeFileSync(reactFile, 'import { useState } from "react"; export const Panel = () => <output>{useState(0)[0]}</output>;');
  writeFileSync(path.join(root, "implementation", "old.tsx"), 'import { use } from "@r3act/core";');
  let reactOptions;
  const plugins = nativeReactPlugins((options) => {
    reactOptions = options;
    return [{ name: "fake-react" }];
  }, {
    root,
    sourceRoots: ["."],
    reactOptions: { exclude: /external\.tsx$/, jsxRuntime: "automatic" },
  });
  assert.deepEqual(plugins.map((plugin) => plugin.name), ["native-module", "fake-react"]);
  assert.equal(await plugins[0].transform.call({}, "raw loader output", `${nativeFile}?raw`), null);
  assert.equal(await plugins[0].transform.call({}, "url loader output", `${nativeFile}?import&url`), null);
  assert.equal(reactOptions.jsxRuntime, "automatic");
  const excluded = (id) => reactOptions.exclude.some((pattern) => pattern.test(id));
  assert.ok(excluded(nativeFile));
  assert.ok(excluded(`${nativeFile}?direct`));
  assert.ok(excluded(path.join(root, "node_modules", "library.tsx")));
  assert.ok(excluded(path.join(root, "external.tsx")));
  assert.equal(excluded(reactFile), false);
  assert.equal(excluded(path.join(root, "implementation", "old.tsx")), false);
  let defaultReactOptions;
  nativeReactPlugins((options) => {
    defaultReactOptions = options;
    return [{ name: "default-react" }];
  }, { root, sourceRoots: ["src"] });
  assert.ok(Array.isArray(defaultReactOptions.exclude));
  assert.ok(defaultReactOptions.exclude.some((pattern) => pattern.test(nativeFile)));
  assert.throws(() => nativeReactPlugins(() => [], {
    root,
    sourceRoots: ["../outside"],
  }), /inside the Vite root/);
} finally {
  rmSync(root, { recursive: true, force: true });
}
