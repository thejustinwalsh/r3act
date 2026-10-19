/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createDOMRoot, createStore, jsx,
  NativeRootWorkQueue, use, useEffect } from "@r3act/core";

type Payload = Readonly<{ label: string; x: number }>;
type Deferred = { promise: Promise<Payload>; resolve(value: Payload): void; reject(reason: unknown): void };
function deferred(): Deferred {
  let resolve!: Deferred["resolve"], reject!: Deferred["reject"];
  const promise = new Promise<Payload>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const ready = new AsyncResource<Payload>(Promise.resolve({ label: "accepted", x: 1 }));
export const resourceStore = createStore(ready, (_old, next) => next);
export const urgentStore = createStore(0, (_old, next) => next);
export const life = { readyMounts: 0, readyCleanups: 0, errorMounts: 0, errorCleanups: 0 };

export function ReadDom() {
  const resource = use(resourceStore);
  const value = use(resource);
  useEffect(() => { life.readyMounts++; return () => { life.readyCleanups++; }; });
  return <output key="resource" data-value={value.label} data-x={value.x}>{value.label}</output>;
}
export function UrgentDom() {
  const value = use(urgentStore);
  return <output key="urgent" data-urgent={value} />;
}
export function ErrorDom({ reason }: { reason: unknown }) {
  useEffect(() => { life.errorMounts++; return () => { life.errorCleanups++; }; });
  return <output key="resource" data-error={String(reason)} />;
}
export function AppDom() {
  return <section><Suspense fallback={<output key="resource" data-pending="true" />}
    error={(reason: unknown) => <ErrorDom reason={reason} />}><ReadDom /></Suspense><UrgentDom /></section>;
}
export function ReadThree() {
  const resource = use(resourceStore);
  const value = use(resource);
  return <mesh key="resource" name={value.label} position-x={value.x}><boxGeometry /><meshStandardMaterial /></mesh>;
}
export function UrgentThree() {
  const value = use(urgentStore);
  return <group key="urgent" name={`urgent-${value}`} />;
}
export function AppThree() {
  return <group key="scene"><Suspense fallback={<group key="resource" name="pending" />}
    error={(reason: unknown) => <group key="resource" name={`error-${String(reason)}`} />}>
    <ReadThree /></Suspense><UrgentThree /></group>;
}
export function ScopedDom({ resource }: { resource: AsyncResource<string> }) {
  const value = use(resource);
  return <div key="scoped" data-kind="ready">{value}</div>;
}
export function ScopedRoot({ resource }: { resource: AsyncResource<string> }) {
  return <Suspense fallback={<output key="scoped" data-pending="true" />}
    error={(reason: unknown) => <output key="scoped" data-error={String(reason)} />}>
    <ScopedDom resource={resource} /></Suspense>;
}

export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const queue = new NativeRootWorkQueue();
  root.mount(<AppDom />);
  let sequence = 0;
  const operations: ReturnType<typeof queue.enqueue>[] = [];
  const providers: Deferred[] = [];
  function replace() {
    const provider = deferred();
    providers.push(provider);
    const resource = new AsyncResource(provider.promise);
    const id = `recovery-${++sequence}`;
    resourceStore.beginTransition(id, [root.rootId]);
    resourceStore.dispatch(resource, { kind: "transition", transitionId: id });
    const handle = queue.enqueue({ id, roots: [{ root, tree: <AppDom /> }],
      transitions: [id], finishTransitions: true,
      onSettled() {
        if (resourceStore.hasTransition(id)) {
          if (resourceStore.transitionRoots(id).includes(root.rootId))
            resourceStore.releaseTransition(id, root.rootId);
          resourceStore.finishTransition(id);
        }
      } });
    operations.push(handle);
    return { provider, resource, handle };
  }
  return { root, replace, operations, providers,
    urgent(value: number) { urgentStore.dispatch(value); },
    dispose() { queue.dispose(); root.dispose(); return root.diagnostics(); } };
}
