import assert from "node:assert/strict";
import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { openBrowser } from "vitexec/cli";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(projectRoot, ".cache/owner-row-fusion-package-v1");
const browserConsumer = path.join(packageRoot, "browser-consumer");
const appSourcePath = path.join(browserConsumer, "src/native_app.tsx");
const resultPath = path.join(packageRoot, "browser-results-v2.json");
const origin = process.env.OWNER_ROW_FUSION_PACKAGE_BROWSER_ORIGIN ??
  "https://owner-row-fusion-package-browser-v1.localhost:1355";

const fixtureFiles = new Map([
  ["package.json", JSON.stringify({
    name: "compiled-owner-rows-package-browser-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@compiled-ui/runtime": "file:../compiled-ui-runtime.tgz",
      react: "19.3.0",
      "react-dom": "19.3.0",
      three: "0.186.1",
      vite: "8.3.1",
    },
  }, null, 2) + "\n"],
  ["vite.config.mjs", `import { defineConfig } from "vite";
import { nativeModulePlugin } from "@compiled-ui/runtime/vite";

export default defineConfig({ plugins: [nativeModulePlugin()] });
`],
  ["index.html", `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Installed native package browser check</title></head>
  <body>
    <main>
      <section id="direct-root" aria-label="Direct DOM root"></section>
      <section id="react-root" aria-label="React adapter root"></section>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`],
  ["src/native_app.tsx", `import { createStore, use, useEffect, useState } from "@compiled-ui/runtime";

export const buildToken = "v1";
export const labelStore = createStore("ready");
export const lifecycle = { activeEffects: 0, setups: 0, cleanups: 0 };

export function NativePanel({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  const storeValue = use(labelStore);
  useEffect(() => {
    lifecycle.activeEffects++;
    lifecycle.setups++;
    return () => {
      lifecycle.activeEffects--;
      lifecycle.cleanups++;
    };
  });
  return <button data-native-panel={label} onClick={() => setCount((value) => value + 1)}>{buildToken}:{label}:{storeValue}:{count}</button>;
}
`],
  ["src/main.ts", `import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createDOMRoot, createWorld, jsx } from "@compiled-ui/runtime";
import { createReactNativeRootAdapter } from "@compiled-ui/runtime/react";
import * as NativeModule from "./native_app.tsx";

const directContainer = document.querySelector("#direct-root");
const reactContainer = document.querySelector("#react-root");
if (!(directContainer instanceof HTMLElement) || !(reactContainer instanceof HTMLElement)) {
  throw new Error("Browser consumer root containers are missing");
}

let current;
const mount = (module) => {
  const directWorld = createWorld();
  const directRoot = createDOMRoot(directContainer, { world: directWorld, rootId: "package-browser-direct" });
  directRoot.mount(jsx(module.NativePanel, { label: "direct" }));

  const reactWorld = createWorld();
  const Adapter = createReactNativeRootAdapter(module.NativePanel, { world: reactWorld, rootId: "package-browser-react-adapter" });
  const reactRoot = createRoot(reactContainer);
  let reactLabel = "react";
  const renderReact = () => reactRoot.render(createElement(Adapter, { label: reactLabel }));
  renderReact();
  return {
    module,
    directWorld,
    directRoot,
    reactWorld,
    reactRoot,
    setReactLabel(value) { reactLabel = value; renderReact(); },
  };
};

const disposeCurrent = (mounted) => {
  mounted.directRoot.dispose();
  mounted.reactRoot.unmount();
};

current = mount(NativeModule);
window.__compiledOwnerRowsPackageProbe = {
  get current() { return current; },
  previous: null,
  setReactLabel(value) { current.setReactLabel(value); },
};

if (import.meta.hot) {
  import.meta.hot.accept("./native_app.tsx", (updatedModule) => {
    if (!updatedModule) return;
    const old = current;
    disposeCurrent(old);
    window.__compiledOwnerRowsPackageProbe.previous = {
      module: old.module,
      directRootDiagnostics: old.directRoot.diagnostics(),
      directContainerEmpty: directContainer.childNodes.length === 0,
      reactContainerEmpty: reactContainer.childNodes.length === 0,
    };
    current = mount(updatedModule);
  });
  import.meta.hot.dispose(() => {
    if (current) disposeCurrent(current);
  });
}
`],
]);

const prepareFixture = async () => {
  await mkdir(path.join(browserConsumer, "src"), { recursive: true });
  for (const [relative, contents] of fixtureFiles) {
    const destination = path.join(browserConsumer, relative);
    await writeFile(destination, contents, { flag: "wx" });
  }
  const blockedTools = path.join(browserConsumer, "blocked-tools");
  await mkdir(blockedTools, { recursive: true });
  const cargoBlocker = path.join(blockedTools, "cargo");
  await writeFile(cargoBlocker, "#!/bin/sh\necho 'Cargo must not run in installed-package browser fixture' >&2\nexit 97\n", { flag: "wx", mode: 0o755 });
  await chmod(cargoBlocker, 0o755);
  console.log(`Prepared browser consumer fixture at ${path.relative(projectRoot, browserConsumer)}; install the versioned tarball with scripts disabled, then launch Vite through Portless.`);
};

if (process.argv.includes("--prepare")) {
  await prepareFixture();
} else {
  await access(path.join(browserConsumer, "node_modules/@compiled-ui/runtime/package.json"));
  await access(appSourcePath);

  const originalSource = await readFile(appSourcePath, "utf8");
  const updatedSource = originalSource.replace('export const buildToken = "v1";', 'export const buildToken = "v2";');
  assert.notEqual(updatedSource, originalSource, "HMR fixture contains the expected v1 build token");

  const record = {
    schemaVersion: 1,
    status: "RUNNING",
    scope: "Installed package DOM root, React adapter lifecycle, and fixture-managed native-module HMR accept/remount with explicit teardown; no automatic-plugin cleanup or state-preservation claim.",
    origin,
    package: "@compiled-ui/runtime from .cache/owner-row-fusion-package-v1/compiled-ui-runtime.tgz",
    checks: [],
    pageErrors: [],
  };
  const browser = await openBrowser({ gpu: false });
  let context;
  let page;
  let sourceEdited = false;
  try {
    context = await browser.newContext({ ignoreHTTPSErrors: true });
    page = await context.newPage();
    page.on("pageerror", (error) => record.pageErrors.push(error.message));
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const probe = window.__compiledOwnerRowsPackageProbe;
      return probe?.current &&
        document.querySelector("#direct-root button")?.textContent?.includes("v1:direct:ready:0") &&
        document.querySelector("#react-root button")?.textContent?.includes("v1:react:ready:0");
    }, null, { timeout: 15_000 });

    assert.equal(await page.locator("#direct-root button").textContent(), "v1:direct:ready:0");
    assert.equal(await page.locator("#react-root button").textContent(), "v1:react:ready:0");
    const initial = await page.evaluate(() => {
      const mounted = window.__compiledOwnerRowsPackageProbe.current;
      return {
        directRoot: mounted.directRoot.diagnostics(),
        directStore: mounted.module.labelStore.diagnostics(),
        reactStore: mounted.module.labelStore.diagnostics(),
        activeEffects: mounted.module.lifecycle.activeEffects,
      };
    });
    assert.equal(initial.directRoot.disposed, false);
    assert.ok(initial.directStore.roots > 0 && initial.reactStore.readers > 0);
    assert.equal(initial.activeEffects, 2, "both installed-package DOM roots mounted native effects");
    record.directDOMRoot = initial.directRoot;
    record.initialStoreDiagnostics = initial.directStore;
    record.initialActiveEffects = initial.activeEffects;
    record.checks.push("installed public createDOMRoot mounts authored TSX into real browser DOM");

    await page.locator("#direct-root button").click();
    await page.waitForFunction(() => document.querySelector("#direct-root button")?.textContent === "v1:direct:ready:1");
    await page.evaluate(() => window.__compiledOwnerRowsPackageProbe.setReactLabel("react-updated"));
    await page.waitForFunction(() => document.querySelector("#react-root button")?.textContent === "v1:react-updated:ready:0");
    await page.locator("#react-root button").click();
    await page.waitForFunction(() => document.querySelector("#react-root button")?.textContent === "v1:react-updated:ready:1");
    record.checks.push("React 19 adapter mounts through its public entry, updates committed props, and native state responds in real DOM");

    await writeFile(appSourcePath, updatedSource);
    sourceEdited = true;
    await page.waitForFunction(() => {
      const probe = window.__compiledOwnerRowsPackageProbe;
      return probe?.previous?.module?.buildToken === "v1" &&
        probe?.current?.module?.buildToken === "v2" &&
        document.querySelector("#direct-root button")?.textContent === "v2:direct:ready:0" &&
        document.querySelector("#react-root button")?.textContent === "v2:react:ready:0";
    }, null, { timeout: 20_000 });
    const hmr = await page.evaluate(() => {
      const probe = window.__compiledOwnerRowsPackageProbe;
      const old = probe.previous;
      const current = probe.current;
      return {
        oldBuildToken: old.module.buildToken,
        oldDirectRoot: old.directRootDiagnostics,
        oldActiveEffects: old.module.lifecycle.activeEffects,
        oldEffectSetups: old.module.lifecycle.setups,
        oldEffectCleanups: old.module.lifecycle.cleanups,
        oldStore: old.module.labelStore.diagnostics(),
        oldDirectContainerEmpty: old.directContainerEmpty,
        oldReactContainerEmpty: old.reactContainerEmpty,
        newBuildToken: current.module.buildToken,
        newDirectRoot: current.directRoot.diagnostics(),
        newActiveEffects: current.module.lifecycle.activeEffects,
        newStore: current.module.labelStore.diagnostics(),
        directText: document.querySelector("#direct-root button")?.textContent,
        reactText: document.querySelector("#react-root button")?.textContent,
      };
    });
    assert.equal(hmr.oldBuildToken, "v1");
    assert.equal(hmr.oldDirectRoot.disposed, true);
    assert.equal(hmr.oldDirectRoot.ownerCount, 0);
    assert.equal(hmr.oldDirectRoot.pendingChangeCount, 0);
    assert.equal(hmr.oldDirectContainerEmpty, true);
    assert.equal(hmr.oldReactContainerEmpty, true);
    assert.equal(hmr.oldActiveEffects, 0);
    assert.ok(hmr.oldEffectCleanups >= hmr.oldEffectSetups);
    for (const field of ["roots", "listeners", "readers", "retainedActions", "transitions"]) {
      assert.equal(hmr.oldStore[field], 0, `old package store ${field} released during HMR`);
    }
    assert.equal(hmr.newBuildToken, "v2");
    assert.equal(hmr.newDirectRoot.disposed, false);
    assert.equal(hmr.newActiveEffects, 2);
    assert.equal(hmr.directText, "v2:direct:ready:0");
    assert.equal(hmr.reactText, "v2:react:ready:0");
    record.hmr = hmr;
    record.checks.push("installed Vite HMR disposes old DOM/React native roots, effects, and store subscriptions before one fresh remount");

    const finalTeardown = await page.evaluate(() => {
      const mounted = window.__compiledOwnerRowsPackageProbe.current;
      mounted.directRoot.dispose();
      mounted.reactRoot.unmount();
      return {
        directRoot: mounted.directRoot.diagnostics(),
        activeEffects: mounted.module.lifecycle.activeEffects,
        store: mounted.module.labelStore.diagnostics(),
        directContainerEmpty: document.querySelector("#direct-root").childNodes.length === 0,
        reactContainerEmpty: document.querySelector("#react-root").childNodes.length === 0,
      };
    });
    assert.equal(finalTeardown.directRoot.disposed, true);
    assert.equal(finalTeardown.directRoot.ownerCount, 0);
    assert.equal(finalTeardown.directRoot.pendingChangeCount, 0);
    assert.equal(finalTeardown.activeEffects, 0);
    assert.equal(finalTeardown.directContainerEmpty, true);
    assert.equal(finalTeardown.reactContainerEmpty, true);
    for (const field of ["roots", "listeners", "readers", "retainedActions", "transitions"]) {
      assert.equal(finalTeardown.store[field], 0, `final package store ${field} released after explicit teardown`);
    }
    record.finalTeardown = finalTeardown;
    record.checks.push("explicit teardown of remounted v2 roots releases effects, store registrations, and DOM nodes");
    assert.deepEqual(record.pageErrors, []);
    record.status = "PASS";
  } catch (error) {
    record.status = "FAIL";
    record.error = String(error?.stack ?? error);
    throw error;
  } finally {
    if (page) await page.evaluate(() => {
      const mounted = window.__compiledOwnerRowsPackageProbe?.current;
      mounted?.directRoot.dispose();
      mounted?.reactRoot.unmount();
    }).catch(() => {});
    await context?.close().catch(() => {});
    await browser.close();
    if (sourceEdited) await writeFile(appSourcePath, originalSource);
    await mkdir(packageRoot, { recursive: true });
    await writeFile(resultPath, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  }
  console.log(`Installed package browser qualification ${record.status}: ${resultPath}`);
}
