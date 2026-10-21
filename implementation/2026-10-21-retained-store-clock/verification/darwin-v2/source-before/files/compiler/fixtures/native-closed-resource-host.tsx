import { use } from "native_runtime_api.ts";

export function Ready(props) {
  const value = use(props.resource);
  return <div key="b-primary" data-b="primary">{value}</div>;
}

export function Destructured({ resource }) {
  const value = use(resource);
  return <div key="b-other" data-b="other">{value}</div>;
}

export function ExtraCall(props) {
  const value = use(props.resource);
  audit();
  return <div key="x" data-b="primary">{value}</div>;
}

export function DynamicProp(props) {
  const value = use(props.resource);
  return <div key="x" data-b={value}>{value}</div>;
}

export function Spread(props) {
  const value = use(props.resource);
  return <div key="x" {...props}>{value}</div>;
}

export function ComponentChild(props) {
  const value = use(props.resource);
  return <div key="x"><Other value={value} /></div>;
}

export function EventHandler(props) {
  const value = use(props.resource);
  return <div key="x" onClick={() => audit()}>{value}</div>;
}

export function CapturedChild(props) {
  const value = use(props.resource);
  return <div key="x">{other}</div>;
}

export function MultipleHooks(props) {
  const first = use(props.resource);
  const second = use(props.other);
  return <div key="x">{first}</div>;
}

export function MeaningfulWhitespace(props) {
  const value = use(props.resource);
  return <div key="x"> {value} </div>;
}

export function UnicodeResourceProp(props) {
  const value = use(props.资源);
  return <div key="x">{value}</div>;
}

export function EntityAttribute(props) {
  const value = use(props.resource);
  return <div key="x" data-b="a&amp;b">{value}</div>;
}
