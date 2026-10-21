import { use } from "native_runtime_api.ts";

export function DomTree(props) {
  const x = use(props.left);
  const y = use(props.right);
  return <div key="dom-root"><span key="dom-value" style={{ opacity: x, "--offset": y + 1 }}>{`x-${x}`}</span><output key="dom-total" data-total={x + y}>{x + y}</output></div>;
}

export function ThreeTree({ position, angle }) {
  const x = use(position);
  const y = use(angle);
  return <group key="three-root"><mesh key="mesh" position={[x, y, 1]} rotation={[0, y, 0]}/><group key="outline" scale={[x, 1, 1]} position-x={x + y}/></group>;
}

export function Captured(props) {
  const x = use(props.store);
  return <div key="root"><span key="child">{x + other}</span></div>;
}

export function DuplicateKey(props) {
  const x = use(props.store);
  return <div key="root"><span key="child">{x}</span><output key="child">{x}</output></div>;
}

export function ComponentChild(props) {
  const x = use(props.store);
  return <div key="root"><Other key="other" value={x}/></div>;
}

export function UnsafeTuple(props) {
  const x = use(props.store);
  return <group key="root"><mesh key="mesh" position={[x, helper(), 1]}/></group>;
}
