import { use } from "native_runtime_api.ts";

export function Joint(props) {
  const x = use(props.position);
  const camera = use(props.camera);
  return <mesh key="joint" position-x={x + camera} visible={camera > 0 ? x > 0 : false} />;
}

export function Destructured({ position, camera }) {
  const x = use(position);
  const y = use(camera);
  return <output key="joint-dom" data-sum={x + y} />;
}

export function SameStoreTwice(props) {
  const first = use(props.position);
  const second = use(props.position);
  return <div key="twice" data-sum={first + second} />;
}

export function ExtraStatement(props) {
  const x = use(props.position);
  const y = use(props.camera);
  audit();
  return <mesh key="bad" position-x={x + y} />;
}

export function OpaqueCall(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="bad" position-x={Math.max(x, y)} />;
}

export function ExtraCapture(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="bad" position-x={x + y + external} />;
}

export function HostChild(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <div key="bad" data-sum={x + y}>child</div>;
}

export function GetterSource(props) {
  const x = use(props.position.current);
  const y = use(props.camera);
  return <mesh key="bad" position-x={x + y} />;
}

export function Defaulted({ position = fallback, camera }) {
  const x = use(position);
  const y = use(camera);
  return <mesh key="bad" position-x={x + y} />;
}

export function Controlled(props) {
  const x = use(props.position);
  if (x > 0) return <mesh key="bad" position-x={x} />;
  const y = use(props.camera);
  return <mesh key="bad" position-x={x + y} />;
}

export function DestructuredTwice({ position }) {
  const first = use(position);
  const second = use(position);
  return <div key="destructured-twice" data-sum={first + second} />;
}
