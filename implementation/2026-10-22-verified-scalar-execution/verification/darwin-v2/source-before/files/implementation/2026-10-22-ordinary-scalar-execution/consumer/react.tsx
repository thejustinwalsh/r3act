/** @jsxImportSource react */
import React, { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createRoot, flushSync, unmountComponentAtNode } from '@react-three/fiber/legacy';
import { OBJECTS, applyCommonRendererSettings, createView, gridX, gridY, start, value } from './scene';

type Frame = Readonly<{ phase: number; epoch: number }>;
const listeners = new Set<() => void>();
let snapshot: Frame = Object.freeze({ phase: 0, epoch: 0 });
const clock = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot() { return snapshot; },
  dispatch(frame: Frame) { snapshot = Object.freeze(frame); for (const listener of listeners) listener(); },
};
const controls: Array<((value: number) => void) | undefined> = [];
const { scene, camera, renderer } = createView();
const canvas = renderer.domElement;

function Position({ id, children }: { id: number; children: React.ReactNode }) {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => { controls[id] = setOffset; return () => { controls[id] = undefined; }; }, [id]);
  return <group key="motion" position-x={frame.phase * .01 + offset}
    position-y={frame.phase * .005 + offset * .5}
    rotation-z={frame.phase * .0001 + offset * .01}>{children}</group>;
}
function Rotation({ id, children }: { id: number; children: React.ReactNode }) {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => { controls[id] = setOffset; return () => { controls[id] = undefined; }; }, [id]);
  return <group key="motion" position-x={frame.phase * .0025 + offset}
    position-y={frame.phase * .0075 + offset * .5}
    rotation-z={frame.phase * .0002 + offset * .01}>{children}</group>;
}
function FrameMarker() {
  const frame = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  return <group name="accepted-frame" position-x={frame.epoch} />;
}
function App() {
  return <><FrameMarker /><group name="objects">{Array.from({ length: OBJECTS }, (_, id) =>
    <group key={id} name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}>
      {id % 2 === 0
        ? <Position key="motion" id={id}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color="orange" /></mesh></group></Position>
        : <Rotation key="motion" id={id}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color="orange" /></mesh></group></Rotation>}
    </group>)}</group></>;
}
const root = createRoot(canvas);
const setupStart = performance.now();
await root.configure({ gl: renderer, scene, camera, frameloop: 'never', dpr: 1,
  size: { width: canvas.width, height: canvas.height, top: 0, left: 0 } });
applyCommonRendererSettings(renderer);
root.render(<App />);
const setupMs = performance.now() - setupStart;
start({ scene, camera, renderer,
  controlProof() {
    if (controls.filter(Boolean).length !== OBJECTS) throw new Error('Missing declarative R3F local controls');
    flushSync(() => { controls[0]!(2); controls[1]!(3); });
    const objects = scene.getObjectByName('objects')!.children;
    if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3)
      throw new Error('R3F local control mismatch');
    flushSync(() => { controls[0]!(0); controls[1]!(0); });
  },
  update(epoch) {
    flushSync(() => clock.dispatch({ phase: value(epoch), epoch }));
    return { published: scene.getObjectByName('accepted-frame')?.position.x === epoch };
  },
  async dispose() {
    await new Promise<void>(resolve => unmountComponentAtNode(canvas, () => resolve()));
    scene.remove(camera);
    const sceneChildren = scene.children.length;
    const registeredSetters = listeners.size + controls.filter(Boolean).length;
    return { setupMs, setupScope: 'R3F configure plus declarative root.render through activation; scene/camera/renderer construction excluded',
      sceneChildren, registeredSetters };
  },
});
