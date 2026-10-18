import { createElement } from "react";
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
