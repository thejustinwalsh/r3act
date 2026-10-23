import { AsyncResource, createDOMRoot, createKeyedCollection, jsx, NativeRootWorkQueue, Suspense, storeRecord, use } from '@r3act/core';
import { createThreeNativeRoot } from '@r3act/host-three';
import * as THREE from 'three';

type Item = { id: number; x: number };
const rows = createKeyedCollection<Item>(Array.from({ length: 64 }, (_, id) => storeRecord({ id, x: id })), row => String(row.id));
const pending = new AsyncResource(new Promise<number>(() => {}));
function DomRow({ row }: { row: Item }) { return <output data-x={row.x}>{row.x}</output>; }
function ThreeRow({ row }: { row: Item }) { return <group position-x={row.x} />; }
function DomRows() { return <div key="row-list" data-list="rows">{rows.map(row => <DomRow row={row} />)}</div>; }
function ThreeRows() { return <group key="row-list">{rows.map(row => <ThreeRow row={row} />)}</group>; }
function Waiting() { return <span>{use(pending)}</span>; }
function App() { return <section><DomRows /><Suspense fallback={<span data-pending="yes">waiting</span>}><Waiting /></Suspense></section>; }

export function mountClosedRows(container: HTMLElement) {
  const scene = new THREE.Group();
  const dom = createDOMRoot(container, { rootId: 'installed-closed-row-dom', scheduleCommit() {} });
  const sceneRoot = createThreeNativeRoot(scene, { rootOptions: { rootId: 'installed-closed-row-three', scheduleCommit() {} } });
  const three = sceneRoot.root;
  const queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  dom.mount(<App />);
  three.mount(<ThreeRows />);
  const first = container.querySelector('output');
  const firstObject = scene.children[0]?.children[0];
  let disposed = false;
  return {
    step(index: number) {
      const cycle = Math.floor(index / 3), key = String(64 + cycle);
      const kind = index % 3;
      if (kind === 0) rows.apply(rows.version, [{ type: 'replace', key: '0', value: storeRecord({ id: 0, x: 1000 + index }) }]);
      else if (kind === 1) rows.apply(rows.version, [{ type: 'insert', key, value: storeRecord({ id: 64 + cycle, x: 2000 + index }), beforeKey: null }]);
      else rows.apply(rows.version, [{ type: 'remove', key }]);
      const handle = queue.enqueueCollections({ id: `closed-row-${index}`, roots: [{ root: dom, collections: [rows] }, { root: three, collections: [rows] }] });
      if (handle.status !== 'committed') throw new Error(`Closed row publication ${index}: ${handle.status}`);
    },
    inspect() {
      return { values: [...container.querySelectorAll('output')].map(node => Number(node.textContent)),
        attributes: [...container.querySelectorAll('output')].map(node => Number(node.getAttribute('data-x'))),
        positions: scene.children[0]?.children.map(node => node.position.x) ?? [],
        identity: container.querySelector('output') === first && scene.children[0]?.children[0] === firstObject,
        pending: container.querySelector('[data-pending]')?.textContent === 'waiting',
        versions: [dom.publicationVersion, three.publicationVersion], disposed };
    },
    dispose() {
      queue.dispose(); dom.dispose(); sceneRoot.dispose(); disposed = true;
      return { hostChildren: container.childNodes.length, sceneChildren: scene.children.length,
        owners: [dom.diagnostics().ownerCount, three.diagnostics().ownerCount],
        pending: [dom.diagnostics().pendingChangeCount, three.diagnostics().pendingChangeCount] };
    },
  };
}
