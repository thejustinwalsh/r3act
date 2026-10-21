import { useState } from "react";
import { createRoot } from "react-dom/client";

const Counter = () => {
  const [count, setCount] = useState(0);
  return <main><h1>Arrow counter</h1>
    <button type="button" onClick={() => setCount((value) => value + 1)}>Increment</button>
    <output data-count={count}>{count}</output></main>;
};

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const root = createRoot(host);
  root.render(<Counter />);
  window.comparison = {
    snapshot: () => ({ count: host.querySelector("[data-count]")?.textContent ?? null,
      title: host.querySelector("h1")?.textContent ?? null,
      button: host.querySelector("button")?.textContent ?? null }),
    dispose: () => root.unmount(),
  };
}

declare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }
