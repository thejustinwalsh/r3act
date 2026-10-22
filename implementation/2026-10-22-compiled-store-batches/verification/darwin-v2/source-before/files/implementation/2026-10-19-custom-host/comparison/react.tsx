import { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

function Counter() {
  const [count, setCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) throw new Error("Canvas 2D unavailable");
    context.clearRect(0, 0, 200, 80);
    context.fillStyle = "#227e70";
    context.fillRect(12, 12, 20 + count * 20, 28);
    context.fillStyle = "#26384f";
    context.font = "10px sans-serif";
    context.fillText(String(count), 12, 58);
  }, [count]);
  return <main><h1>Canvas counter</h1>
    <button type="button" onClick={() => setCount((value) => value + 1)}>Increment</button>
    <output data-count={count}>{count}</output>
    <canvas ref={canvasRef} width={200} height={80} /></main>;
}

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const root = createRoot(host);
  root.render(<Counter />);
  window.comparison = {
    snapshot: () => {
      const context = host.querySelector("canvas")?.getContext("2d");
      return { count: host.querySelector("[data-count]")?.textContent ?? null,
        pixel: context ? [...context.getImageData(16, 16, 1, 1).data] : null,
        growthPixel: context ? [...context.getImageData(45, 16, 1, 1).data] : null };
    },
    dispose: () => { root.unmount(); },
  };
}

declare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }
