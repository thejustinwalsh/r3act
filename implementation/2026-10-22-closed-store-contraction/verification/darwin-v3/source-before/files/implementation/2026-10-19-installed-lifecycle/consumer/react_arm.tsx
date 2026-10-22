/** @jsxImportSource react */
import { Suspense, use, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { editedRows, initialRows, type SceneController, type SceneDiagnostics } from "./contract";

type ReactRoot = { render(children: ReactNode): void; unmount(): void };
type Listener = () => void;

class ExternalStore<T> {
  private value: T;
  private readonly listeners = new Set<Listener>();

  constructor(initial: T) {
    this.value = initial;
  }

  readonly getSnapshot = (): T => this.value;

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  publish(value: T): void {
    this.value = value;
    for (const listener of this.listeners) listener();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

type Deferred = Readonly<{ promise: Promise<string>; resolve(value: string): void }>;

function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

type Lifecycle = {
  rowSetups: number;
  rowCleanups: number;
  detailFallbackSetups: number;
  detailFallbackCleanups: number;
  healthFallbackSetups: number;
  healthFallbackCleanups: number;
};

type Scene = Readonly<{
  stepStore: ExternalStore<number>;
  rowsStore: ExternalStore<readonly number[]>;
  detail: Deferred;
  health: Deferred;
  activateRow(): () => void;
  activateDetailFallback(): () => void;
  activateHealthFallback(): () => void;
}>;

type RowProps = Readonly<{ id: number; scene: Scene }>;
type SceneProps = Readonly<{ scene: Scene }>;
type FallbackProps = SceneProps;
type ResourceProps = Readonly<{ resource: Deferred }>;

function ReactRow(props: RowProps) {
  const { id, scene } = props;
  const step = useSyncExternalStore(scene.stepStore.subscribe, scene.stepStore.getSnapshot, scene.stepStore.getSnapshot);
  const [local, setLocal] = useState(0);

  useLayoutEffect(scene.activateRow, [id, scene]);

  return (
    <button
      data-row={id}
      data-step={step}
      data-local={local}
      style={{
        transform: `translateX(${(step + id) % 128}px)`,
        opacity: ((step + id) % 10 + 1) / 10,
      }}
      onClick={() => setLocal((current) => current + 1)}
    >{`${id}:${step}:${local}`}</button>
  );
}

function DetailFallback(props: FallbackProps) {
  const { scene } = props;
  useLayoutEffect(scene.activateDetailFallback, [scene]);
  return <output key="detail-output" data-detail="waiting">waiting</output>;
}

function HealthFallback(props: FallbackProps) {
  const { scene } = props;
  useLayoutEffect(scene.activateHealthFallback, [scene]);
  return <output key="health-output" data-health="waiting">waiting</output>;
}

function DetailReady(props: ResourceProps) {
  const value = use(props.resource.promise);
  return <output key="detail-output" data-detail="ready">{value}</output>;
}

function HealthReady(props: ResourceProps) {
  const value = use(props.resource.promise);
  return <output key="health-output" data-health="ready">{value}</output>;
}

function ReactScene(props: SceneProps) {
  const { scene } = props;
  const rows = useSyncExternalStore(scene.rowsStore.subscribe, scene.rowsStore.getSnapshot, scene.rowsStore.getSnapshot);
  return (
    <main>
      <div data-rows="ready">
        {rows.map((id) => <ReactRow key={id} id={id} scene={scene} />)}
      </div>
      <Suspense fallback={<DetailFallback scene={scene} />}>
        <DetailReady resource={scene.detail} />
      </Suspense>
      <Suspense fallback={<HealthFallback scene={scene} />}>
        <HealthReady resource={scene.health} />
      </Suspense>
    </main>
  );
}

export function mountReact(host: HTMLElement): SceneController {
  const lifecycle: Lifecycle = {
    rowSetups: 0,
    rowCleanups: 0,
    detailFallbackSetups: 0,
    detailFallbackCleanups: 0,
    healthFallbackSetups: 0,
    healthFallbackCleanups: 0,
  };
  const scene: Scene = {
    stepStore: new ExternalStore(0),
    rowsStore: new ExternalStore(initialRows()),
    detail: deferred(),
    health: deferred(),
    activateRow() {
      lifecycle.rowSetups++;
      return () => { lifecycle.rowCleanups++; };
    },
    activateDetailFallback() {
      lifecycle.detailFallbackSetups++;
      return () => { lifecycle.detailFallbackCleanups++; };
    },
    activateHealthFallback() {
      lifecycle.healthFallbackSetups++;
      return () => { lifecycle.healthFallbackCleanups++; };
    },
  };
  let root: ReactRoot | null = createRoot(host);
  let disposed = false;
  flushSync(() => { root!.render(<ReactScene scene={scene} />); });

  const diagnostics = (): SceneDiagnostics => ({
    arm: "react",
    rowSetups: lifecycle.rowSetups,
    rowCleanups: lifecycle.rowCleanups,
    detailFallbackSetups: lifecycle.detailFallbackSetups,
    detailFallbackCleanups: lifecycle.detailFallbackCleanups,
    healthFallbackSetups: lifecycle.healthFallbackSetups,
    healthFallbackCleanups: lifecycle.healthFallbackCleanups,
    storeListeners: scene.stepStore.listenerCount + scene.rowsStore.listenerCount,
    storeReaders: null,
    ownerCount: null,
    pendingChangeCount: null,
    disposed,
  });

  return {
    updateStep(step) {
      if (disposed) throw new Error("Cannot update a disposed React scene");
      flushSync(() => { scene.stepStore.publish(step); });
    },
    editRows() {
      if (disposed) throw new Error("Cannot edit a disposed React scene");
      flushSync(() => { scene.rowsStore.publish(editedRows()); });
    },
    settleDetail() {
      if (disposed) throw new Error("Cannot settle a disposed React scene");
      scene.detail.resolve("detail ready");
    },
    settleHealth() {
      if (disposed) throw new Error("Cannot settle a disposed React scene");
      scene.health.resolve("health ready");
    },
    diagnostics,
    dispose() {
      if (!disposed) {
        const activeRoot = root;
        if (activeRoot) flushSync(() => { activeRoot.unmount(); });
        root = null;
        disposed = true;
      }
      return diagnostics();
    },
  };
}
