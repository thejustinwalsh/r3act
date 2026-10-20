import { createKeyedCollection, useEffect, useState } from "file:///private/tmp/r3act-native-transfer-v2-3kH8UO/stagedroot/src/native_runtime_api.ts";
export const rows = createKeyedCollection([{ id: "a" }, { id: "b" }], row => row.id);
export const trace = { controls: {}, candidateMutationKey: null, candidateMutations: 0 };

export function Row({ id }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  useEffect(() => { trace.controls[id] = { x: setX, y: setY, z: setZ }; });
  return <i data-row={id} position={[z, x, y]} data-repeat={x + x} style={{
    left: `${x}px`,
    top: `${y}px`,
    opacity: z,
  }} />;
}

export function CandidateProbe() {
  const [value, setValue] = useState(0);
  if (trace.candidateMutationKey !== null) {
    trace.candidateMutations++;
    setValue(999);
  }
  return <span data-candidate={value} />;
}

export function Board() {
  const children = rows.map(row => <Row key={row.id} id={row.id} />);
  if (trace.candidateMutationKey !== null) {
    return <ul>{children}<CandidateProbe key="candidate" /></ul>;
  }
  return <ul>{children}</ul>;
}