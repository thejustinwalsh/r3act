import { use } from "native_runtime_api.ts";

export function DomTree(props) {
  const value = use(props.resource);
  return <div key="dom-root" data-kind="ready"><span key="dom-text" data-label="value">{value}</span><output key="dom-count" data-count={value + 1}>{value}</output></div>;
}

export function ThreeTree({ resource }) {
  const value = use(resource);
  return <group key="three-root" name="ready"><mesh key="three-mesh" position-x={value + 1}/><group key="three-child" name="static"/></group>;
}

export function ExtraCall(props) {
  const value = use(props.resource);
  audit();
  return <div key="x"><span key="child">{value}</span></div>;
}

export function ComponentChild(props) {
  const value = use(props.resource);
  return <div key="x"><Other value={value}/></div>;
}

export function Spread(props) {
  const value = use(props.resource);
  return <div key="x"><span key="y" {...props}>{value}</span></div>;
}

export function DuplicateKey(props) {
  const value = use(props.resource);
  return <div key="x"><span key="same">{value}</span><span key="same">{value}</span></div>;
}

export function Event(props) {
  const value = use(props.resource);
  return <div key="x"><span key="y" onClick={() => audit()}>{value}</span></div>;
}

export function Captured(props) {
  const value = use(props.resource);
  return <div key="x"><span key="y">{other}</span></div>;
}

export function MeaningfulWhitespace(props) {
  const value = use(props.resource);
  return <div key="x"><span key="y"> {value} </span></div>;
}

export function EntityAttribute(props) {
  const value = use(props.resource);
  return <div key="x" data-label="a&amp;b"><span key="y">{value}</span></div>;
}

export function MultipleHooks(props) {
  const value = use(props.resource);
  const other = use(props.other);
  return <div key="x"><span key="y">{value + other}</span></div>;
}
