/** @jsxImportSource @r3act/core */
// @native-ui
import { createNativeRoot, useState, jsx } from "@r3act/core";
import { createDOMRoot } from "@r3act/host-dom";
import { Brush, RetainedCanvasHost } from "../example/retained_host";

function Counter(props: { paint: (count: number) => void }) {
  const [count, setCount] = useState(0);
  return <main><h1>Canvas counter</h1>
    <button type="button" onClick={() => {
      const next = count + 1;
      setCount(next);
      props.paint(next);
    }}>Increment</button>
    <output data-count={count}>{count}</output></main>;
}

const host = document.querySelector<HTMLElement>("#app");
if (host) {
  const panel = document.createElement("div");
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 80;
  host.append(panel, canvas);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  const adapter = new RetainedCanvasHost();
  const brush = new Brush("#227e70");
  const root = createNativeRoot(adapter, adapter.createContainer());
  root.mount(jsx("paintLayer", { name: "counter" }));
  const paint = (count: number) => {
    root.update(jsx("paintLayer", { name: "counter", children: [
      jsx("paintRect", { name: "bar", position: [12, 12], width: 20 + count * 20,
        height: 28, brush: { brush, ownership: "owned" } }),
      jsx("paintText", { name: "value", position: [12, 58], text: String(count), color: "#26384f" }),
    ] }));
    context.clearRect(0, 0, 200, 80);
    adapter.draw(context);
  };
  const dom = createDOMRoot(panel);
  dom.mount(<Counter paint={paint} />);
  paint(0);
  window.comparison = {
    snapshot: () => ({ count: panel.querySelector("[data-count]")?.textContent ?? null,
      frame: adapter.frame(), pixel: [...context.getImageData(16, 16, 1, 1).data],
      growthPixel: [...context.getImageData(45, 16, 1, 1).data],
      brushDisposals: brush.disposeCalls, canvasNodes: adapter.diagnostics().liveHandles }),
    dispose: () => { dom.dispose(); root.dispose(); adapter.dispose(); panel.remove(); canvas.remove(); },
  };
}

declare global { interface Window { comparison?: { snapshot(): unknown; dispose(): void } } }
