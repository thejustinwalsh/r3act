/** @jsxImportSource @r3act/core */
// @native-ui
import { useState } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";

const Counter = () => {
  const [count, setCount] = useState(0);
  return <main><h1>Arrow counter</h1>
    <button type="button" onClick={() => setCount((value) => value + 1)}>Increment</button>
    <output data-count={count}>{count}</output></main>;
};

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const root = createDOMRoot(host);
  root.mount(<Counter />);
  window.comparison = {
    snapshot: () => ({ count: host.querySelector("[data-count]")?.textContent ?? null,
      title: host.querySelector("h1")?.textContent ?? null,
      button: host.querySelector("button")?.textContent ?? null }),
    dispose: () => root.dispose(),
  };
}

declare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }
