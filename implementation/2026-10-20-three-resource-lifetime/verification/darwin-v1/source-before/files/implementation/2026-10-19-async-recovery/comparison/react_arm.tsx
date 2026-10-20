import { Component, Suspense, startTransition, use, useLayoutEffect,
  useState, useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";

type Payload = Readonly<{ label: string; x: number }>;
type Deferred = { promise: Promise<Payload>; resolve(value: Payload): void; reject(reason: unknown): void };
function deferred(): Deferred {
  let resolve!: Deferred["resolve"], reject!: Deferred["reject"];
  const promise = new Promise<Payload>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const initial = Promise.resolve<Payload>({ label: "accepted", x: 1 });
let replaceResource: ((next: { promise: Promise<Payload>; key: number }) => void) | null = null;
let urgent = 0;
const urgentListeners = new Set<() => void>();
const subscribeUrgent = (listener: () => void) => {
  urgentListeners.add(listener); return () => { urgentListeners.delete(listener); };
};
export const life = { readyMounts: 0, readyCleanups: 0, errorMounts: 0, errorCleanups: 0 };

function Ready({ promise }: { promise: Promise<Payload> }) {
  const payload = use(promise);
  useLayoutEffect(() => { life.readyMounts++; return () => { life.readyCleanups++; }; }, []);
  return <output data-value={payload.label} data-x={payload.x}>{payload.label}</output>;
}
function ErrorView({ reason }: { reason: unknown }) {
  useLayoutEffect(() => { life.errorMounts++; return () => { life.errorCleanups++; }; }, []);
  return <output data-error={String(reason)} />;
}
class RecoveryBoundary extends Component<{ children: ReactNode }, { reason: unknown | null }> {
  state: { reason: unknown | null } = { reason: null };
  static getDerivedStateFromError(reason: unknown) { return { reason }; }
  render() { return this.state.reason === null ? this.props.children : <ErrorView reason={this.state.reason} />; }
}
function Urgent() {
  const score = useSyncExternalStore(subscribeUrgent, () => urgent);
  return <output data-urgent={score} />;
}
function App() {
  const [resource, setResource] = useState({ promise: initial, key: 0 });
  useLayoutEffect(() => {
    replaceResource = setResource;
    return () => { if (replaceResource === setResource) replaceResource = null; };
  }, [setResource]);
  return <section><Suspense fallback={<output data-pending="true" />}>
    <RecoveryBoundary key={resource.key}><Ready promise={resource.promise} /></RecoveryBoundary>
  </Suspense><Urgent /></section>;
}

export function mountReact(host: HTMLElement) {
  const caught: string[] = [];
  const root = createRoot(host, { onCaughtError(error) { caught.push(String(error)); } });
  flushSync(() => root.render(<App />));
  let generation = 0;
  const providers: Deferred[] = [];
  const operations: { status: string; cancel(reason?: string): void }[] = [];
  function replace() {
    const update = replaceResource;
    if (!update) throw new Error("React recovery controller is not mounted");
    const provider = deferred();
    providers.push(provider);
    const key = ++generation;
    const handle = { status: "pending", cancel(_reason?: string) {
      if (handle.status === "pending") handle.status = "cancelled";
    } };
    operations.push(handle);
    provider.promise.then(() => { if (handle.status === "pending") handle.status = "committed"; },
      () => { if (handle.status === "pending") handle.status = "committed"; });
    startTransition(() => update({ promise: provider.promise, key }));
    return { provider, handle };
  }
  return { replace, operations, providers,
    urgent(value: number) { flushSync(() => { urgent = value;
      for (const listener of [...urgentListeners]) listener(); }); },
    dispose() { for (const operation of operations) operation.cancel("disposed");
      flushSync(() => root.unmount()); return { listenerCount: urgentListeners.size, caught }; } };
}
