/** @jsxImportSource react */
import React, { useLayoutEffect, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import * as THREE from 'three';
import { makeObject, OBJECTS, start, value } from './scene';

type Frame = Readonly<{ phase: number; epoch: number }>;
const listeners = new Set<() => void>();
let snapshot: Frame = Object.freeze({ phase: 0, epoch: 0 });
const clock = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot() { return snapshot; },
  dispatch(frame: Frame) { snapshot = Object.freeze(frame); for (const listener of listeners) listener(); },
};
const scene = new THREE.Scene();
const group = new THREE.Group(); group.name = 'objects';
const marker = new THREE.Group(); marker.name = 'accepted-frame';
scene.add(marker, group);
const objects = Array.from({ length: OBJECTS }, (_, id) => makeObject(id));
group.add(...objects);

function Position({ id }: { id: number }) {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  useLayoutEffect(() => {
    const motion = objects[id].children[0];
    motion.position.x = frame.phase * .01;
    motion.position.y = frame.phase * .005;
    motion.rotation.z = frame.phase * .0001;
  }, [id, frame.phase]);
  return null;
}
function Rotation({ id }: { id: number }) {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  useLayoutEffect(() => {
    const motion = objects[id].children[0];
    motion.position.x = frame.phase * .0025;
    motion.position.y = frame.phase * .0075;
    motion.rotation.z = frame.phase * .0002;
  }, [id, frame.phase]);
  return null;
}
function FrameMarker() {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  useLayoutEffect(() => { marker.position.x = frame.epoch; }, [frame.epoch]);
  return null;
}
function App() {
  return <><FrameMarker />{Array.from({ length: OBJECTS }, (_, id) => id % 2 === 0
    ? <Position key={id} id={id} /> : <Rotation key={id} id={id} />)}</>;
}
const host = document.getElementById('react-root')!;
const root = createRoot(host);
const setupStart = performance.now();
flushSync(() => root.render(<App />));
const setupMs = performance.now() - setupStart;
start({ scene,
  update(epoch) {
    flushSync(() => clock.dispatch({ phase: value(epoch), epoch }));
    return { published: marker.position.x === epoch };
  },
  dispose() {
    flushSync(() => root.unmount()); scene.clear();
    return { setupMs, setupScope: 'preloaded Three objects excluded; flushSync React mount and layout adapter included',
      sceneChildren: scene.children.length, registeredSetters: listeners.size,
      hostChildren: host.childNodes.length };
  },
});
