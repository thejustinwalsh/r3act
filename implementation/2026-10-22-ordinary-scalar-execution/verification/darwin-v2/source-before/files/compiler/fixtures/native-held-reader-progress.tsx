/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx, storeRecord, use, useEffect, useState } from "native_runtime_api.ts";

export function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

export const detailWait = deferred();
export const signalWait = deferred();
export const detail = new AsyncResource(detailWait.promise);
export const signal = new AsyncResource(signalWait.promise);
export const heldA = createStore(storeRecord({ vector: storeRecord({ x: 1, y: 2 }) }),
  (_old, next) => next);
export const independentB = createStore(false, (_old, next) => next);
export const trace = { mounts: 0, cleanups: 0, setters: [], localChoiceSetters: [] };

export function HeldDom(props) {
  const a = use(props.heldA);
  const value = use(props.resource);
  return <div key="held-dom" data-joint={a.vector.x + value.sample.x}><output key="held-dom-value" data-value={a.vector.y + value.sample.y} /></div>;
}

export function HeldThree(props) {
  const a = use(props.heldA);
  const value = use(props.resource);
  return <group key="held-three"><mesh key="held-mesh" position={[a.vector.x, value.sample.x, a.vector.y + value.sample.y]} /></group>;
}

export function DialogSlot(props) {
  const open = use(props.independentB);
  const [local, setLocal] = useState(0);
  useEffect(() => {
    trace.mounts++;
    trace.setters.push(setLocal);
    return () => { trace.cleanups++; };
  });
  return <div key="dialog-slot" data-dialog-slot="true" data-open={open} data-local={local} />;
}

export function ControlledChoice(props) {
  const a = use(props.heldA);
  return <Suspense fallback={<div key="held-dom" data-choice="waiting" />}>
    {a.vector.x > 0 ? <HeldDom key="choice" heldA={props.heldA} resource={props.detail} /> :
      <HeldDom key="choice" heldA={props.heldA} resource={props.signal} />}
  </Suspense>;
}

export function LocalChoice(props) {
  const [selected, setSelected] = useState(1);
  trace.localChoiceSetters.push(setSelected);
  return <Suspense fallback={<div key="held-dom" data-choice="waiting" />}>
    {selected > 0 ? <HeldDom key="local-choice" heldA={props.heldA} resource={props.detail} /> :
      <HeldDom key="local-choice" heldA={props.heldA} resource={props.signal} />}
  </Suspense>;
}

export function AppDom() {
  return <main>
    <Suspense fallback={<div key="held-dom" data-joint="waiting" />}>
      <HeldDom key="held-owner" heldA={heldA} resource={detail} />
    </Suspense>
    <DialogSlot key="dialog-owner" independentB={independentB} />
  </main>;
}

export function AppThree() {
  return <group key="scene-root">
    <Suspense fallback={<group key="held-three" name="waiting" />}>
      <HeldThree key="held-owner" heldA={heldA} resource={signal} />
    </Suspense>
  </group>;
}
