/** @jsxImportSource @r3act/host-three */
// @native-ui
import { createStore, storeRecord, use, type StoreSource, type RuntimeNode } from '@r3act/core';
import { createThreeNativeRoot } from '@r3act/host-three';
import * as THREE from 'three';
import { OBJECTS, start, value } from './scene';

type Frame = { readonly phase: number; readonly epoch: number };
type MotionProps = { key?: string; clock: StoreSource<Frame>; children?: RuntimeNode };
const clock = createStore<Frame>(storeRecord({ phase: 0, epoch: 0 }));

function Position(props: MotionProps) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * .01} position-y={frame.phase * .005} rotation-z={frame.phase * .0001}>
    {props.children}
  </group>;
}
function Rotation(props: MotionProps) {
  const frame = use(props.clock);
  return <group key="motion" position-x={frame.phase * .0025} position-y={frame.phase * .0075} rotation-z={frame.phase * .0002}>
    {props.children}
  </group>;
}
function FrameMarker(props: { key?: string; clock: StoreSource<Frame> }) {
  const frame = use(props.clock);
  return <group key="frame-marker" name="accepted-frame" position-x={frame.epoch} />;
}
function App() {
  return <><FrameMarker key="frame-marker" clock={clock} /><group key="objects" name="objects">{Array.from({ length: OBJECTS }, (_, id) =>
    <group key={id} name={`object-${id}`}>
      {id % 2 === 0
        ? <Position key={id} clock={clock}><group name={`child-${id}`} /></Position>
        : <Rotation key={id} clock={clock}><group name={`child-${id}`} /></Rotation>}
    </group>)}</group></>;
}
const scene = new THREE.Scene();
const counts: Record<string, number> = {};
const diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;
const root = createThreeNativeRoot(scene, { rootOptions: {
  rootId: 'retained-store-clock-native', scheduleCommit() {},
  profileCounter: diagnostics ? batch => {
    for (const [key, count] of Object.entries(batch)) counts[key] = (counts[key] ?? 0) + count;
  } : undefined,
} });
const setupStart = performance.now();
root.root.mount(<App />);
const setupMs = performance.now() - setupStart;
for (const key of Object.keys(counts)) delete counts[key];
start({ scene,
  update(epoch) {
    clock.dispatch(() => storeRecord({ phase: value(epoch), epoch }));
    const published = root.root.flush();
    const accepted = scene.getObjectByName('accepted-frame')?.position.x;
    return { published: published && accepted === epoch, counters: diagnostics ? { ...counts } : undefined };
  },
  dispose() {
    root.dispose();
    return { setupMs, setupScope: 'root.mount through activation; scene/root construction excluded', sceneChildren: scene.children.length,
      registeredSetters: 0,
      ownerCount: root.root.diagnostics().ownerCount,
      pending: root.root.diagnostics().pendingChangeCount,
      counters: { ...counts } };
  },
});
