/** @jsxImportSource react */
import React, { Suspense, use, useLayoutEffect, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as THREE from 'three';

type Item = { id: number; x: number };
let rows: Item[] = Array.from({ length: 64 }, (_, id) => ({ id, x: id }));
const listeners = new Set<() => void>();
const subscribe = (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; };
const snapshot = () => rows;
const pending = new Promise<number>(() => {});
function Row({ row }: { row: Item }) { return <output data-x={row.x}>{row.x}</output>; }
function Waiting() { return <span>{use(pending)}</span>; }
function App({ scene }: { scene: THREE.Group }) {
  const values = useSyncExternalStore(subscribe, snapshot, snapshot);
  useLayoutEffect(() => {
    const ids = new Set(values.map(row => row.id));
    for (const node of [...scene.children]) if (!ids.has(node.userData.id)) scene.remove(node);
    for (const row of values) {
      let node = scene.children.find(child => child.userData.id === row.id);
      if (!node) { node = new THREE.Group(); node.userData.id = row.id; scene.add(node); }
      if (!Object.is(node.position.x, row.x)) node.position.x = row.x;
    }
  }, [scene, values]);
  useLayoutEffect(() => () => { scene.clear(); }, [scene]);
  return <section><div data-list="rows">{values.map(row => <Row key={row.id} row={row} />)}</div><Suspense fallback={<span data-pending="yes">waiting</span>}><Waiting /></Suspense></section>;
}
export function mountClosedRows(container: HTMLElement) {
  const scene = new THREE.Group();
  const rowGroup = new THREE.Group();
  scene.add(rowGroup);
  const root = createRoot(container);
  flushSync(() => root.render(<App scene={rowGroup} />));
  const first = container.querySelector('output');
  const firstObject = rowGroup.children[0];
  let disposed = false;
  return {
    step(index: number) {
      const cycle = Math.floor(index / 3), id = 64 + cycle, kind = index % 3;
      flushSync(() => {
        if (kind === 0) rows = rows.map(row => row.id === 0 ? { id: 0, x: 1000 + index } : row);
        else if (kind === 1) rows = [...rows, { id, x: 2000 + index }];
        else rows = rows.filter(row => row.id !== id);
        for (const notify of listeners) notify();
      });
    },
    inspect() {
      return { values: [...container.querySelectorAll('output')].map(node => Number(node.textContent)),
        attributes: [...container.querySelectorAll('output')].map(node => Number(node.getAttribute('data-x'))),
        positions: rowGroup.children.map(node => node.position.x),
        identity: container.querySelector('output') === first && rowGroup.children[0] === firstObject,
        pending: container.querySelector('[data-pending]')?.textContent === 'waiting', disposed };
    },
    dispose() {
      flushSync(() => root.unmount()); scene.clear(); disposed = true;
      return { hostChildren: container.childNodes.length, sceneChildren: scene.children.length, listeners: listeners.size };
    },
  };
}
