import { useEffect, useState } from "file:///Users/tjw/Documents/Codex/2026-10-09/le/outputs/react-runtime-research/src/native_runtime_api.ts";
export const trace = {
  initializers: 0, renders: 0, events: [], node: null, setValue: null,
};
export function resetTrace() {
  trace.initializers = 0;
  trace.renders = 0;
  trace.events.length = 0;
  trace.node = null;
  trace.setValue = null;
}
export function captureNode(node) {
  if (node) {
    trace.node = node;
    trace.events.push({ kind: "ref", left: node.props.style?.left });
    return () => {
      trace.events.push({ kind: "ref-cleanup", left: node.props.style?.left });
      if (trace.node === node) trace.node = null;
    };
  }
}
export function Row() {
  trace.renders++;
  const [value, setValue] = useState(() => {
    trace.initializers++;
    return 2;
  });
  trace.setValue = setValue;
  useEffect(() => {
    trace.events.push({ kind: "effect", left: trace.node?.props.style?.left });
    return () => {
      trace.events.push({ kind: "effect-cleanup", left: trace.node?.props.style?.left });
      if (trace.setValue === setValue) trace.setValue = null;
    };
  });
  return <i ref={captureNode} style={{ left: `${value}px` }} />;
}