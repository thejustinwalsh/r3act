import {
  createDOMRoot, createKeyedCollection, createStore, NativeRootWorkQueue,
  renderCollectionAt, Suspense, use, useEffect, useState,
  type StateCellHandle,
} from "../../../src/native_runtime_api.ts";

type Deferred = { promise: Promise<string>; resolve(value: string): void };
function deferred(): Deferred {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => { resolve = done; });
  return { promise, resolve };
}
const health = deferred();
const position = createStore(1);
const camera = createStore(2);
const ids = Array.from({ length: 64 }, (_, index) => `row-${index}`);
const rows = createKeyedCollection(ids.map((id) => ({ id })), (row) => row.id);
let setWorld: ((value: number) => boolean) | null = null;

function Health(props: { resource: Promise<string> }) {
  const value = use(props.resource);
  return <div key="health" data-health="ready">{value}</div>;
}
function Position(props: { position: typeof position }) {
  const x = use(props.position);
  return <div key="position" data-position={x} style={{ transform: `translateX(${x}px)` }} />;
}
function Joint(props: { position: typeof position; camera: typeof camera }) {
  const x = use(props.position);
  const y = use(props.camera);
  return <output key="joint" data-joint={x + y} style={{ opacity: (x + y) / 10 }} />;
}
function World() {
  const [value, setter] = useState(0);
  useEffect(() => { setWorld = setter; return () => { setWorld = null; }; });
  return <output key="world" data-world={value} />;
}
function Row(props: { id: string }) {
  const [local, setLocal] = useState(0);
  return <li key={props.id} data-id={props.id} data-local={local}
    onClick={() => setLocal((previous) => previous + 1)}>{props.id}</li>;
}
function List() {
  return <ul>{renderCollectionAt("store-values-benchmark-rows", rows, (row) => <Row key={row.id} id={row.id} />)}</ul>;
}
function App() {
  return <main>
    <Suspense fallback={<div key="health" data-health="fallback">health waiting</div>}>
      <Health resource={health.promise} />
    </Suspense>
    <Position position={position} />
    <Joint position={position} camera={camera} />
    <World />
    <List />
  </main>;
}

export function mountNative(host: HTMLElement) {
  const root = createDOMRoot(host);
  const queue = new NativeRootWorkQueue();
  const started = performance.now();
  root.mount(<App />);
  const mountDurationMs = performance.now() - started;
  const dirty: StateCellHandle[] = [];
  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
  return {
    mountDurationMs,
    transact() {
      position.dispatch(7);
      if (!setWorld || !setWorld(5)) throw new Error("World setter rejected measured action");
      const worldHandle = dirty.find((handle) => handle.site.endsWith("#component:World#state:0"));
      if (!worldHandle) throw new Error("World cell handle was not observed");
      unsubscribe();
      if (!rows.apply(rows.version, [{ type: "move", key: "row-0", beforeKey: null }]).ok) {
        throw new Error("keyed move rejected");
      }
      const work = queue.enqueueTransaction({ id: "store-values-benchmark-once", roots: [{
        root, cells: [worldHandle], collections: [rows], stores: [position],
      }] });
      if (work.status !== "committed") throw new Error(`joint transaction ${work.status}`);
    },
    settleHealth() { health.resolve("health ready"); },
    dispose() {
      unsubscribe();
      queue.dispose(); root.dispose();
      return { ...root.diagnostics(), position: position.diagnostics(), camera: camera.diagnostics(),
        collection: rows.stats() };
    },
  };
}
