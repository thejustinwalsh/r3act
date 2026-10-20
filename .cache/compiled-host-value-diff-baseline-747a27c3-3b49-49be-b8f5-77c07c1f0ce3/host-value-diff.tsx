/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createKeyedCollection, jsx, use, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/implementation/2026-10-19-host-value-diff/baseline/runtime/src/native_runtime_api.ts";
import { Vector3 } from "three";

export const values = {
  position: new Vector3(1, 2, 3),
  rotation: [0, 0, 0],
  style: { color: "red", opacity: 1 },
  scalar: "first",
  payload: { marker: "same-reference" },
};
export const rows = createKeyedCollection([
  { id: "a", label: "Alpha" }, { id: "b", label: "Beta" },
], row => row.id);
let resolvePending;
export const pending = new AsyncResource(new Promise(resolve => { resolvePending = resolve; }));
export const resolveResource = value => resolvePending(value);
export const trace = {
  setDom: null, setThree: null, mounts: {}, cleanups: {},
};

export function Row(props) {
  const row = props.row;
  useEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1; };
  });
  return <li key={row.id} data-row={row.id}>{row.label}</li>;
}
export function DomTarget(props) {
  return <output key="dom-target" style={values.style}
    data-step={props.step} data-scalar={values.scalar} payload={values.payload} />;
}
export function ThreeTarget(props) {
  return <mesh key="three-target" name={`step-${props.step}`}
    position={values.position} rotation={values.rotation}>
    <boxGeometry key="three-geometry" />
    <meshStandardMaterial key="three-material" />
  </mesh>;
}
export function PendingDom() {
  const value = use(pending);
  return <span key="pending-dom" data-pending={value}>ready</span>;
}
export function PendingThree() {
  const value = use(pending);
  return <group key="pending-three" name={value} />;
}
export function DomApp() {
  const [step, setStep] = useState(0);
  trace.setDom = setStep;
  return <section key="dom-root">
    <DomTarget key="dom-owner" step={step} />
    <ul key="row-list">{rows.map(row => <Row row={row} />)}</ul>
    <Suspense fallback={<span key="pending-dom" data-pending="waiting" />}>
      <PendingDom key="pending-dom-owner" />
    </Suspense>
  </section>;
}
export function ThreeApp() {
  const [step, setStep] = useState(0);
  trace.setThree = setStep;
  return <group key="scene-root">
    <ThreeTarget key="three-owner" step={step} />
    <Suspense fallback={<group key="pending-three" name="waiting" />}>
      <PendingThree key="pending-three-owner" />
    </Suspense>
  </group>;
}
