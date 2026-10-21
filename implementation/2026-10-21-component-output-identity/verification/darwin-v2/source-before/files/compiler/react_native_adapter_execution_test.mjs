import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformWithOxc } from "vite";
import { openBrowser } from "vitexec/cli";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(directory, ".cache");
const fixturePath = path.join(cacheDirectory, "react-native-adapter-fixture.mjs");
const entryPath = path.join(cacheDirectory, "react-native-adapter-entry.mjs");
const portlessPage = "https://async-transition-stress.localhost:1355/native-task-transitions.html";
const authored = `
// @native-ui
/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx, useEffect, useState } from "/src/native_runtime_api.ts";

export let activeEffects = 0;
export let lastSetterResult = null;
export function NativeButton({ label, onAction }) {
  const [draft, setDraft] = useState(label);
  useEffect(() => {
    activeEffects++;
    return () => { activeEffects--; };
  });
  return <button data-label={label} onClick={() => { lastSetterResult = setDraft(value => value + "!"); onAction(label); }}>{draft}</button>;
}
`;

const plugin = nativeModuleCompilerPlugin({ root: directory });
const context = {
  addWatchFile() {},
  error(message) {
    throw new Error(String(message));
  },
};

try {
  const transformed = await plugin.transform.call(
    context,
    authored,
    path.join(cacheDirectory, "react-native-adapter-fixture.tsx"),
  );
  assert.ok(transformed?.code, "native component must be Rust compiled");
  const emitted = await transformWithOxc(
    transformed.code,
    ".cache/react-native-adapter-fixture.tsx",
    { lang: "tsx", jsx: { runtime: "classic" } },
  );
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(fixturePath, emitted.code);
  await writeFile(
    entryPath,
    `export {createElement,StrictMode,useLayoutEffect} from "react";\n` +
      `export {createRoot} from "react-dom/client";\n` +
      `export {createWorld,createDOMRoot,jsx} from "../src/native_runtime_api.ts";\n` +
      `export {createReactNativeRootAdapter} from "../src/react_native_adapter.ts";\n` +
      `export * from "./react-native-adapter-fixture.mjs";\n`,
  );

  const browser = await openBrowser({ gpu: false });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(portlessPage, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      const modules = await import("/.cache/react-native-adapter-entry.mjs");
      const state = {
        modules,
        actions: [],
        directActions: [],
        replay: { setups: 0, cleanups: 0 },
      };
      const directHost = document.createElement("div");
      directHost.dataset.adapterProbe = "direct";
      document.body.append(directHost);
      state.directHost = directHost;
      state.directRoot = modules.createDOMRoot(directHost, {
        world: modules.createWorld(),
        rootId: "react-native-adapter-direct-dom-probe",
      });
      state.directRoot.mount(modules.jsx(modules.NativeButton, {
        label: "direct",
        onAction: (value) => state.directActions.push(value),
      }));

      const world = modules.createWorld();
      state.rootClaims = 0;
      const claimRootId = world.claimRootId.bind(world);
      world.claimRootId = (rootId) => {
        state.rootClaims++;
        return claimRootId(rootId);
      };
      state.world = world;
      state.Adapter = modules.createReactNativeRootAdapter(modules.NativeButton, {
        world,
        rootId: "react-native-adapter-execution-test",
      });
      state.host = document.createElement("div");
      state.host.dataset.adapterProbe = "react";
      document.body.append(state.host);
      state.reactRoot = modules.createRoot(state.host);
      state.StrictProbe = function StrictProbe() {
        modules.useLayoutEffect(() => {
          state.replay.setups++;
          return () => { state.replay.cleanups++; };
        }, []);
        return null;
      };
      window.__reactNativeAdapterProbe = state;
      state.reactRoot.render(modules.createElement(modules.StrictMode, null,
        modules.createElement(state.StrictProbe),
        modules.createElement(state.Adapter, {
          label: "first",
          onAction: (value) => state.actions.push("old:" + value),
        }),
      ));
    });

    await page.waitForFunction(() => {
      const state = window.__reactNativeAdapterProbe;
      return document.querySelector('[data-adapter-probe="react"] button') &&
        document.querySelector('[data-adapter-probe="direct"] button') &&
        state?.replay.setups >= 2 && state?.replay.cleanups >= 1;
    }, null, { timeout: 10_000 });
    await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      state.directButton = state.directHost.querySelector("button");
      state.directButton.click();
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-adapter-probe="direct"] button')?.textContent === "direct!"
    );
    const directProbe = await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      state.directRoot.update(state.modules.jsx(state.modules.NativeButton, {
        label: "direct-next",
        onAction: (value) => state.directActions.push(value),
      }));
      const button = state.directHost.querySelector("button");
      return {
        sameButton: button === state.directButton,
        text: button.textContent,
        label: button.dataset.label,
      };
    });
    assert.deepEqual(directProbe, {
      sameButton: true,
      text: "direct!",
      label: "direct-next",
    });
    await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      state.directRoot.dispose();
      state.directHost.remove();
    });

    const initial = await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      return {
        text: state.host.querySelector("button")?.textContent,
        effects: state.modules.activeEffects,
        claims: state.rootClaims,
        replay: { ...state.replay },
      };
    });
    assert.equal(initial.text, "first");
    assert.equal(initial.effects, 1, "StrictMode replay must leave one active native effect");
    assert.equal(initial.claims, initial.replay.setups, "each StrictMode setup needs one live root");

    await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      state.host.querySelector("button").click();
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-adapter-probe="react"] button')?.textContent === "first!"
    );
    await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      state.buttonBeforeUpdate = state.host.querySelector("button");
      state.reactRoot.render(state.modules.createElement(state.modules.StrictMode, null,
        state.modules.createElement(state.StrictProbe),
        state.modules.createElement(state.Adapter, {
          label: "second",
          onAction: (value) => state.actions.push("new:" + value),
        }),
      ));
    });
    await page.waitForFunction(() =>
      document.querySelector('[data-adapter-probe="react"] button')?.dataset.label === "second"
    );
    const update = await page.evaluate(() => {
      const state = window.__reactNativeAdapterProbe;
      const button = state.host.querySelector("button");
      return {
        sameButton: button === state.buttonBeforeUpdate,
        text: button.textContent,
        label: button.dataset.label,
        effects: state.modules.activeEffects,
        claims: state.rootClaims,
      };
    });
    assert.equal(update.sameButton, true, "native host identity changed on boundary props update");
    assert.equal(update.text, "first!", "native state did not survive the React prop update");
    assert.equal(update.label, "second", "committed boundary props were not forwarded");
    assert.equal(update.effects, 1, "props update duplicated native effects");
    assert.equal(update.claims, initial.claims, "React prop commit restarted the native root");

    await page.evaluate(() => window.__reactNativeAdapterProbe.host.querySelector("button").click());
    await page.waitForFunction(() => window.__reactNativeAdapterProbe.actions.length === 2);
    const callbacks = await page.evaluate(() => window.__reactNativeAdapterProbe.actions);
    assert.deepEqual(callbacks, ["old:first", "new:second"]);

    await page.evaluate(() => window.__reactNativeAdapterProbe.reactRoot.unmount());
    await page.waitForFunction(() => window.__reactNativeAdapterProbe.modules.activeEffects === 0);
    const unmount = await page.evaluate(() => ({
      effects: window.__reactNativeAdapterProbe.modules.activeEffects,
      children: window.__reactNativeAdapterProbe.host.childNodes.length,
    }));
    assert.deepEqual(unmount, { effects: 0, children: 0 });
    assert.deepEqual(pageErrors, []);
    console.log("PASS React StrictMode + Rust-compiled native component: effect replay, stable root/host and local state across committed prop updates, callback forwarding, and unmount disposal.");
  } finally {
    await browser.close();
  }
} finally {
  await plugin.closeBundle.call(context);
}
