/** @jsxImportSource @r3act/host-three */
// @native-ui
import { useEffect, useState } from '@r3act/core';
import { createThreeNativeRoot } from '@r3act/host-three';
import * as THREE from 'three';
import { OBJECTS, start, value } from './scene';

const setters: Array<((next: number) => void) | undefined> = Array(OBJECTS).fill(undefined);
function Position({ id }: { id: number }) {
  const [x, setX] = useState(0);
  useEffect(() => { setters[id] = setX; return () => { setters[id] = undefined; }; });
  return <group key={id} name={`object-${id}`} position-x={x} />;
}
function Rotation({ id }: { id: number }) {
  const [angle, setAngle] = useState(0);
  useEffect(() => { setters[id] = setAngle; return () => { setters[id] = undefined; }; });
  return <group key={id} name={`object-${id}`} rotation-z={angle} />;
}
function App() {
  return <group key="objects">{Array.from({ length: OBJECTS }, (_, id) =>
    id % 2 === 0 ? <Position key={id} id={id} /> : <Rotation key={id} id={id} />)}</group>;
}
const scene = new THREE.Scene();
const counts: Record<string, number> = {};
const diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
  rootId: 'realtime-native', scheduleCommit() {},
  profileCounter: diagnostics ? batch => {
    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
  } : undefined,
} });
const setupStart = performance.now();
root.root.mount(<App />);
const setupMs = performance.now() - setupStart;
if (setters.some(set => !set)) throw new Error('Native mount effect did not register every setter');
start({ scene,
  update(epoch) {
    for (let id = 0; id < OBJECTS; id++) setters[id]!(value(id, epoch));
    const published = root.root.flush();
    return { published, counters: diagnostics ? { ...counts } : undefined };
  },
  dispose() {
    root.dispose();
    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren: scene.children.length,
      registeredSetters: setters.filter(Boolean).length,
      ownerCount: root.root.diagnostics().ownerCount,
      pending: root.root.diagnostics().pendingChangeCount,
      counters: { ...counts } };
  },
});
