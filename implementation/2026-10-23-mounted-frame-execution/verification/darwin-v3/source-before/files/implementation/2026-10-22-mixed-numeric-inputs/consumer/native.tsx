/** @jsxImportSource @r3act/host-three */
// @native-ui
import { createStore, storeRecord, use, useState, useEffect, type StoreSource, type RuntimeNode } from '@r3act/core';
import { createThreeNativeRoot } from '@r3act/host-three';
import { OBJECTS, createView, gridX, gridY, start, value } from './scene';

type Frame = { readonly phase: number; readonly epoch: number };
type MotionProps = { key?: string; id: number; clock: StoreSource<Frame>; children?: RuntimeNode };
const clock = createStore<Frame>(storeRecord({ phase: 0, epoch: 0 }));
const controls: Array<((value: number) => void) | undefined> = [];

function Position(props: MotionProps) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { controls[props.id] = undefined; }; });
  return <group key="motion" position-x={frame.phase * .01 + offset} position-y={frame.phase * .005 + offset * .5} rotation-z={frame.phase * .0001 + offset * .01}>
    {props.children}
  </group>;
}
function Rotation(props: MotionProps) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { controls[props.id] = undefined; }; });
  return <group key="motion" position-x={frame.phase * .0025 + offset} position-y={frame.phase * .0075 + offset * .5} rotation-z={frame.phase * .0002 + offset * .01}>
    {props.children}
  </group>;
}
function FrameMarker(props: { key?: string; clock: StoreSource<Frame> }) {
  const frame = use(props.clock);
  return <group key="frame-marker" name="accepted-frame" position-x={frame.epoch} />;
}
function App() {
  return <><FrameMarker key="frame-marker" clock={clock} /><group key="objects" name="objects">{Array.from({ length: OBJECTS }, (_, id) =>
    <group key={id} name={`object-${id}`} position-x={gridX(id)} position-y={gridY(id)}>
      {id % 2 === 0
        ? <Position key="motion" id={id} clock={clock}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color="orange" /></mesh></group></Position>
        : <Rotation key="motion" id={id} clock={clock}><group name={`child-${id}`}><mesh><boxGeometry args={[.12,.12,.12]} /><meshBasicMaterial color="orange" /></mesh></group></Rotation>}
    </group>)}</group></>;
}
const { scene, camera, renderer } = createView();
const counts: Record<string, number> = {};
const diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
  rootId: 'mixed-numeric-r3f-native', scheduleCommit() {},
  profileCounter: diagnostics ? batch => {
    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
  } : undefined,
} });
const setupStart = performance.now();
root.root.mount(<App />);
const setupMs = performance.now() - setupStart;
for (const key of Object.keys(counts)) delete counts[key];
start({ scene, camera, renderer,
  controlProof() {
    if (controls.filter(Boolean).length !== OBJECTS) throw new Error('Missing native local controls');
    controls[0]!(2); controls[1]!(3);
    if (!root.root.flush()) throw new Error('Local publication deferred');
    const objects = scene.getObjectByName('objects')!.children;
    if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3) throw new Error('Local control mismatch');
    controls[0]!(0); controls[1]!(0);
    if (!root.root.flush()) throw new Error('Local reset deferred');
    for (const key of Object.keys(counts)) delete counts[key];
  },
  update(epoch) {
    clock.dispatch(() => storeRecord({ phase: value(epoch), epoch }));
    const published = root.root.flush();
    const accepted = scene.getObjectByName('accepted-frame')?.position.x;
    return { published: published && accepted === epoch, counters: diagnostics ? { ...counts } : undefined };
  },
  dispose() {
    root.dispose();
    scene.remove(camera);
    const sceneChildren = scene.children.length;
    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren,
      registeredSetters: controls.filter(Boolean).length,
      ownerCount: root.root.diagnostics().ownerCount,
      pending: root.root.diagnostics().pendingChangeCount,
      counters: { ...counts } };
  },
});
