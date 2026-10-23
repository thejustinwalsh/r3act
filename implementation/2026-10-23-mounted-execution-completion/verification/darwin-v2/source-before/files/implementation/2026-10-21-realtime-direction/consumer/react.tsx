/** @jsxImportSource react */
import React, { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as THREE from 'three';
import { makeObject, OBJECTS, start, value } from './scene';

const scene = new THREE.Scene();
const group = new THREE.Group();
scene.add(group);
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);
const setters: Array<((next: number) => void) | undefined> = Array(OBJECTS).fill(undefined);
function Position({ id }: { id: number }) {
  const [x, setX] = useState(0);
  useLayoutEffect(() => { setters[id] = setX; return () => { setters[id] = undefined; }; }, [id]);
  useLayoutEffect(() => { objects[id].position.x = x; }, [id, x]);
  return null;
}
function Rotation({ id }: { id: number }) {
  const [angle, setAngle] = useState(0);
  useLayoutEffect(() => { setters[id] = setAngle; return () => { setters[id] = undefined; }; }, [id]);
  useLayoutEffect(() => { objects[id].rotation.z = angle; }, [id, angle]);
  return null;
}
function App() {
  return <>{Array.from({ length: OBJECTS }, (_, id) => id % 2 === 0
    ? <Position key={id} id={id} /> : <Rotation key={id} id={id} />)}</>;
}
const host = document.getElementById('react-root')!;
const root = createRoot(host);
const setupStart = performance.now();
flushSync(() => root.render(<App />));
const setupMs = performance.now() - setupStart;
if (setters.some(set => !set)) throw new Error('React layout effect did not register every setter');
start({ scene,
  update(epoch) {
    flushSync(() => { for (let id = 0; id < OBJECTS; id++) setters[id]!(value(id, epoch)); });
    return { published: true };
  },
  dispose() {
    flushSync(() => root.unmount()); scene.clear();
    return { setupMs, setupScope: 'flushSync root.render through activation; scene/object construction excluded', sceneChildren: scene.children.length,
      registeredSetters: setters.filter(Boolean).length,
      hostChildren: host.childNodes.length };
  },
});
