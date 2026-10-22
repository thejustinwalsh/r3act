import {
  AsyncResource,
  createDOMRoot,
  createNativeRoot,
  createStore,
  Suspense,
  use,
  useEffect,
  useState,
  type NativeRootOptions,
  type RuntimeNode,
  type VDOMHost,
} from "@r3act/core";
import {
  editedRows,
  initialRows,
  type SceneController,
  type SceneDiagnostics,
} from "./contract.ts";

type Deferred = {
  promise: Promise<string>;
  resolve(value: string): void;
};

function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}

function createDomain() {
  const detail = deferred();
  const health = deferred();
  return {
    stepStore: createStore(0),
    itemsStore: createStore(initialRows()),
    detail,
    health,
    detailResource: new AsyncResource(detail.promise),
    healthResource: new AsyncResource(health.promise),
    counts: {
      rowSetups: 0,
      rowCleanups: 0,
      detailFallbackSetups: 0,
      detailFallbackCleanups: 0,
      healthFallbackSetups: 0,
      healthFallbackCleanups: 0,
    },
  };
}

type Domain = ReturnType<typeof createDomain>;
type DomainProps = { domain: Domain };
type RowProps = DomainProps & { id: number };

function Row(props: RowProps) {
  const step = use(props.domain.stepStore);
  const [local, setLocal] = useState(0);
  useEffect(() => {
    props.domain.counts.rowSetups++;
    return () => { props.domain.counts.rowCleanups++; };
  });
  return <button
    data-row={props.id}
    data-step={step}
    data-local={local}
    style={{
      transform: `translateX(${(step + props.id) % 128}px)`,
      opacity: ((step + props.id) % 10 + 1) / 10,
    }}
    onClick={() => setLocal((previous) => previous + 1)}
  >{`${props.id}:${step}:${local}`}</button>;
}

function Rows(props: DomainProps) {
  const items = use(props.domain.itemsStore);
  return <div data-rows="ready">{items.map((id) =>
    <Row key={id} id={id} domain={props.domain} />
  )}</div>;
}

function Detail(props: DomainProps) {
  const value = use(props.domain.detailResource);
  return <output key="detail-output" data-detail="ready">{value}</output>;
}

function Health(props: DomainProps) {
  const value = use(props.domain.healthResource);
  return <output key="health-output" data-health="ready">{value}</output>;
}

function DetailFallback(props: DomainProps) {
  useEffect(() => {
    props.domain.counts.detailFallbackSetups++;
    return () => { props.domain.counts.detailFallbackCleanups++; };
  });
  return <output key="detail-output" data-detail="waiting">waiting</output>;
}

function HealthFallback(props: DomainProps) {
  useEffect(() => {
    props.domain.counts.healthFallbackSetups++;
    return () => { props.domain.counts.healthFallbackCleanups++; };
  });
  return <output key="health-output" data-health="waiting">waiting</output>;
}

function App(props: DomainProps) {
  return <main>
    <Rows domain={props.domain} />
    <Suspense fallback={<DetailFallback domain={props.domain} />}>
      <Detail domain={props.domain} />
    </Suspense>
    <Suspense fallback={<HealthFallback domain={props.domain} />}>
      <Health domain={props.domain} />
    </Suspense>
  </main>;
}

type SceneRoot = {
  mount(tree: RuntimeNode): void;
  flush(): boolean;
  diagnostics(): { ownerCount: number; pendingChangeCount: number; disposed: boolean };
  dispose(): void;
};

function mountScene(root: SceneRoot): SceneController {
  const domain = createDomain();
  root.mount(<App domain={domain} />);
  let disposed = false;

  const diagnostics = (): SceneDiagnostics => {
    const step = domain.stepStore.diagnostics();
    const items = domain.itemsStore.diagnostics();
    const state = root.diagnostics();
    return {
      arm: "native",
      ...domain.counts,
      storeListeners: step.listeners + items.listeners,
      storeReaders: step.readers + items.readers,
      ownerCount: state.ownerCount,
      pendingChangeCount: state.pendingChangeCount,
      disposed: state.disposed,
    };
  };

  return {
    updateStep(step: number) {
      if (disposed) throw new Error("Native scene is disposed");
      domain.stepStore.dispatch(step);
      root.flush();
    },
    editRows() {
      if (disposed) throw new Error("Native scene is disposed");
      domain.itemsStore.dispatch(editedRows());
      root.flush();
    },
    settleDetail() {
      if (disposed) throw new Error("Native scene is disposed");
      domain.detail.resolve("detail ready");
    },
    settleHealth() {
      if (disposed) throw new Error("Native scene is disposed");
      domain.health.resolve("health ready");
    },
    diagnostics,
    dispose() {
      if (!disposed) {
        disposed = true;
        root.dispose();
      }
      return diagnostics();
    },
  };
}

export function mountNative(host: HTMLElement): SceneController {
  return mountScene(createDOMRoot(host));
}

export function mountNativeWithHost<H, Parent = H>(
  host: VDOMHost<H, Parent>,
  container: Parent,
  options: NativeRootOptions = {},
): SceneController {
  return mountScene(createNativeRoot(host, container, options));
}
