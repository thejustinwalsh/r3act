import { use } from "native_runtime_api.ts";

export function Mesh(props) {
  const value = use(props.position);
  return <mesh key="mesh" position-x={value * 2} visible={value > 0} />;
}

export function Dom({ store }) {
  const value = use(store);
  return <div key="dom" data-value={value > 0 ? `x-${value}` : "zero"} />;
}

export function ExtraCall(props) {
  const value = use(props.store);
  audit();
  return <div key="x" data-value={value} />;
}

export function OpaqueProp(props) {
  const value = use(props.store);
  return <div key="x" data-value={Math.round(value)} />;
}

export function CapturedProp(props) {
  const value = use(props.store);
  return <div key="x" data-value={value + other} />;
}

export function Child(props) {
  const value = use(props.store);
  return <div key="x" data-value={value}>child</div>;
}

export function Style(props) {
  const value = use(props.store);
  return <div key="x" style={{ opacity: value }} />;
}

export function Event(props) {
  const value = use(props.store);
  return <mesh key="x" onClick={() => value} />;
}

export function Spread(props) {
  const value = use(props.store);
  return <mesh key="x" {...props} position-x={value} />;
}

export function MultipleHooks(props) {
  const value = use(props.store);
  const other = use(props.other);
  return <mesh key="x" position-x={value + other} />;
}

export function NonliteralKey(props) {
  const value = use(props.store);
  return <mesh key={String(value)} position-x={value} />;
}

export function DestructureDefault({ store = fallback }) {
  const value = use(store);
  return <mesh key="x" position-x={value} />;
}

export function UnicodeStoreProp(props) {
  const value = use(props.资源);
  return <mesh key="x" position-x={value} />;
}

export function EntityKey(props) {
  const value = use(props.store);
  return <mesh key="x&amp;y" position-x={value} />;
}
