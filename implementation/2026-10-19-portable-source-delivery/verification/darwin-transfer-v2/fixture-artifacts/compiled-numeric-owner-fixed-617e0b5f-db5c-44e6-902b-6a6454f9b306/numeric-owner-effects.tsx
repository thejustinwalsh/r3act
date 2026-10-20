/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, jsx, use, useEffect, useState } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";

export const trace = {
  opaqueValue: "A", throwOpaque: false, opaqueCalls: 0, getterCalls: 0,
  initializerCalls: 0, opaqueMounts: 0, opaqueCleanups: 0,
  hotMounts: 0, hotCleanups: 0, initializerMounts: 0, initializerCleanups: 0,
  setOpaque: null, setHot: null, setInitializer: null,
  setPrimitive: null, primitiveProps: null, setMutation: null, mutationError: null,
};
const opaqueSource = {
  get value() {
    trace.getterCalls++;
    if (trace.throwOpaque) throw new Error("opaque getter failed");
    return trace.opaqueValue;
  },
};
export function readOpaque() {
  trace.opaqueCalls++;
  return opaqueSource.value;
}
export function readInitial() {
  trace.initializerCalls++;
  return 0;
}

export function OpaqueSibling() {
  const [n, setN] = useState(0);
  useEffect(() => {
    trace.opaqueMounts++;
    trace.setOpaque = setN;
    return () => { trace.opaqueCleanups++; };
  });
  const opaque = readOpaque();
  return <output key="opaque" data-n={n + 1} data-opaque={opaque} />;
}
export const HotCounter = () => {
  const [n, setN] = useState(0);
  useEffect(() => {
    trace.hotMounts++;
    trace.setHot = setN;
    return () => { trace.hotCleanups++; };
  });
  return <output key="hot" data-hot={n + 1} />;
};
export function PureNamed() {
  const [n] = useState(0);
  return <output key="pure-named" data-pure-named={n + 1} />;
}
export const PureArrow = () => {
  const [n] = useState(0);
  return <output key="pure-arrow" data-pure-arrow={n + 1} />;
};
export function DerivedPure() {
  const [n] = useState(0);
  const doubled = (n + 1) * 2;
  return <output key="derived" data-derived={doubled} />;
}
export function InitializerOwner() {
  const [n, setN] = useState(readInitial());
  useEffect(() => {
    trace.initializerMounts++;
    trace.setInitializer = setN;
    return () => { trace.initializerCleanups++; };
  });
  return <output key="initializer" data-initializer={n + 1} />;
}
export function CapturedCallback(props) {
  const [n] = useState(0);
  return <button key="callback" data-callback={n + 1} onClick={props.onAction}>Act</button>;
}
export function HiddenCapture() {
  const [n] = useState(0);
  return <output key="capture" data-capture={n + trace.opaqueValue.length} />;
}
export function PrimitiveProp(props) {
  const [n, setN] = useState(0);
  useEffect(() => { trace.setPrimitive = setN; trace.primitiveProps = props; });
  return <output key="primitive" data-id={props.id} data-primitive={n + 1} />;
}
export function PrimitiveMutation(props) {
  const [n, setN] = useState(0);
  useEffect(() => {
    trace.setMutation = setN;
    try { props.id = "changed"; }
    catch (error) { trace.mutationError = String(error); }
  });
  return <output key="mutation" data-id={props.id} data-mutation={n + 1} />;
}
export function SceneLeaf(props) {
  const value = use(props.resource);
  return <group key="scene-leaf"><mesh key="scene-mesh" position={[value.sample.x, 0, 0]} /></group>;
}
export function SceneApp(props) {
  return <group key="scene-root"><Suspense fallback={<group key="scene-leaf" name="waiting" />}>
    <SceneLeaf key="scene-owner" resource={props.resource} />
  </Suspense></group>;
}
export function App() {
  return <main>
    <OpaqueSibling key="opaque-owner" />
    <HotCounter key="hot-owner" />
    <PureNamed key="named-owner" />
    <PureArrow key="arrow-owner" />
    <DerivedPure key="derived-owner" />
  </main>;
}
