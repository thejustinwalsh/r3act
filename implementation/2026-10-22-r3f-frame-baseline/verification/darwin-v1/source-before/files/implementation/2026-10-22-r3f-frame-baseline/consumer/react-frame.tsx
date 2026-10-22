/** @jsxImportSource react */
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createRoot, flushSync, getScheduler, unmountComponentAtNode, useFrame } from '@react-three/fiber/legacy';
import type { Group } from 'three';
import { MEASURED, OBJECTS, WARMUP, applyCommonRendererSettings, createView, gridX, gridY, start, value } from './scene';

type Frame = Readonly<{ phase: number; epoch: number }>;
const diagnostics = (window as Window & { __realtimeProof?: boolean }).__realtimeProof === true;
let input: Frame = { phase: 0, epoch: 0 };
let motionCallbacks = 0;
let markerCallbacks = 0;
let renderTakeovers = 0;
let controlCommits = 0;
let registeredFrameCallbacks = 0;
const controls: Array<((value: number) => void) | undefined> = [];
let renderJob: ReturnType<typeof useFrame> | undefined;
const { scene, camera, renderer } = createView();
const canvas = renderer.domElement;
let renderCalls = 0;
const originalRender = renderer.render;
if (diagnostics) renderer.render = function (this: typeof renderer, ...args: Parameters<typeof renderer.render>) {
  renderCalls++;
  return originalRender.apply(this, args);
};

function Position({ id, children }: { id: number; children: React.ReactNode }) {
  const motion = useRef<Group>(null);
  const [offset, setOffset] = useState(0);
  useFrame(() => {
    if (diagnostics) motionCallbacks++;
    const group = motion.current!;
    group.position.x = input.phase * .01 + offset;
    group.position.y = input.phase * .005 + offset * .5;
    group.rotation.z = input.phase * .0001 + offset * .01;
  }, { phase: 'update' });
  useLayoutEffect(() => {
    controls[id] = setOffset;
    registeredFrameCallbacks++;
    return () => { controls[id] = undefined; registeredFrameCallbacks--; };
  }, [id]);
  useLayoutEffect(() => { if (diagnostics) controlCommits++; }, [offset]);
  return <group key="motion" ref={motion}>{children}</group>;
}

function Rotation({ id, children }: { id: number; children: React.ReactNode }) {
  const motion = useRef<Group>(null);
  const [offset, setOffset] = useState(0);
  useFrame(() => {
    if (diagnostics) motionCallbacks++;
    const group = motion.current!;
    group.position.x = input.phase * .0025 + offset;
    group.position.y = input.phase * .0075 + offset * .5;
    group.rotation.z = input.phase * .0002 + offset * .01;
  }, { phase: 'update' });
  useLayoutEffect(() => {
    controls[id] = setOffset;
    registeredFrameCallbacks++;
    return () => { controls[id] = undefined; registeredFrameCallbacks--; };
  }, [id]);
  useLayoutEffect(() => { if (diagnostics) controlCommits++; }, [offset]);
  return <group key="motion" ref={motion}>{children}</group>;
}

function FrameMarker() {
  const marker = useRef<Group>(null);
  useFrame(() => { if (diagnostics) markerCallbacks++; marker.current!.position.x = input.epoch; }, { phase: 'update' });
  useLayoutEffect(() => {
    registeredFrameCallbacks++;
    return () => { registeredFrameCallbacks--; };
  }, []);
  return <group ref={marker} name="accepted-frame" />;
}

function RenderTakeover() {
  const job = useFrame(() => { if (diagnostics) renderTakeovers++; }, { phase: 'render' });
  useLayoutEffect(() => {
    renderJob = job;
    registeredFrameCallbacks++;
    return () => { registeredFrameCallbacks--; };
  }, [job]);
  return null;
}

function App() {
  return <><FrameMarker /><RenderTakeover /><group name="objects">{Array.from({ length: OBJECTS }, (_, id) =>
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
const rootStore = root.render(<App />);
const setupMs = performance.now() - setupStart;
const advance = () => rootStore.getState().advance(performance.now());
start({ scene, camera, renderer,
  controlProof() {
    if (controls.filter(Boolean).length !== OBJECTS || registeredFrameCallbacks !== OBJECTS + 2)
      throw new Error('Missing R3F frame controls');
    if (diagnostics && renderCalls !== 0) throw new Error('R3F rendered during setup');
    flushSync(() => { controls[0]!(2); controls[1]!(3); });
    advance();
    if (diagnostics && renderCalls !== 0) throw new Error('R3F rendered during activation step');
    const objects = scene.getObjectByName('objects')!.children;
    if (objects[0].children[0].position.x !== 2 || objects[1].children[0].position.x !== 3)
      throw new Error('R3F frame local control mismatch');
    flushSync(() => { controls[0]!(0); controls[1]!(0); });
    advance();
    if (diagnostics && renderCalls !== 0) throw new Error('R3F rendered during reset step');
  },
  update(epoch) {
    const before = diagnostics ? { motionCallbacks, markerCallbacks, renderTakeovers, controlCommits } : undefined;
    if (diagnostics && renderCalls !== epoch - 1)
      throw new Error(`Expected ${epoch - 1} shared draws before frame ${epoch}, saw ${renderCalls}`);
    const drawsBeforeAdvance = renderCalls;
    input = { phase: value(epoch), epoch };
    advance();
    const drawsDuringAdvance = renderCalls - drawsBeforeAdvance;
    if (diagnostics && drawsDuringAdvance !== 0)
      throw new Error(`R3F scheduler drew ${drawsDuringAdvance} times during frame ${epoch}`);
    return { published: scene.getObjectByName('accepted-frame')?.position.x === epoch,
      counters: before ? { frameCallbacks: motionCallbacks - before.motionCallbacks + markerCallbacks - before.markerCallbacks,
        motionCallbacks: motionCallbacks - before.motionCallbacks, markerCallbacks: markerCallbacks - before.markerCallbacks,
        renderTakeovers: renderTakeovers - before.renderTakeovers,
        controlCommitsDuringUpdate: controlCommits - before.controlCommits,
        drawsDuringAdvance } : undefined };
  },
  async dispose() {
    const job = renderJob;
    const rootId = job?.rootId;
    await new Promise<void>(resolve => unmountComponentAtNode(canvas, () => resolve()));
    scene.remove(camera);
    const rootStopped = !!rootId && !getScheduler().hasUserJobsInPhase('update', rootId)
      && !getScheduler().hasUserJobsInPhase('render', rootId);
    if (diagnostics && renderCalls !== WARMUP + MEASURED)
      throw new Error(`Expected ${WARMUP + MEASURED} shared draws, saw ${renderCalls}`);
    if (diagnostics) renderer.render = originalRender;
    return { setupMs, setupScope: 'R3F configure plus authored frame root.render through activation; scene/camera/renderer construction excluded',
      sceneChildren: scene.children.length, registeredSetters: controls.filter(Boolean).length,
      registeredFrameCallbacks, rootStopped, renderCalls: diagnostics ? renderCalls : undefined };
  },
});
