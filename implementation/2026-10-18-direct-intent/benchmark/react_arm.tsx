import { createRoot, type Root } from "react-dom/client";
import { startTransition, Suspense, use, useState } from "react";
import { flushSync } from "react-dom";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

const initial = deferred();
initial.resolve("initial value");
const obsolete = deferred();
const latest = deferred();
const initialControl = deferred();
initialControl.resolve("control ready");
const pendingControl = deferred();

function Primary(props: { resource: Promise<string>; control: Promise<string>; label: string }) {
  const value = use(props.resource);
  use(props.control);
  const [count, setCount] = useState(0);
  return <div data-primary="yes" data-label={props.label}>
    <button data-counter="yes" onClick={() => setCount((n) => n + 1)}>{count}</button>
    <span data-value="yes">{value}</span>
  </div>;
}

function App(props: { resource: Promise<string>; control: Promise<string>; label: string }) {
  return <Suspense fallback={<div data-fallback="yes">waiting</div>}>
    <Primary resource={props.resource} control={props.control} label={props.label} />
  </Suspense>;
}

export function mountReact(host: HTMLElement) {
  const root: Root = createRoot(host);
  const started = performance.now();
  flushSync(() => root.render(<App resource={initial.promise} control={initialControl.promise} label="initial" />));
  const mountDurationMs = performance.now() - started;
  return {
    mountDurationMs,
    beginRequests() {
      startTransition(() => root.render(<App resource={obsolete.promise} control={pendingControl.promise} label="obsolete" />));
      startTransition(() => root.render(<App resource={latest.promise} control={pendingControl.promise} label="latest" />));
    },
    settleObsolete() { obsolete.resolve("obsolete value"); },
    settleLatest() {
      latest.resolve("latest value");
      pendingControl.resolve("control next");
    },
    dispose() { flushSync(() => root.unmount()); return { disposed: true }; },
  };
}
