import { createKeyedCollection, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
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
  return <ul>{rows.map(row => <Row key={row.id} id={row.id} />)}
    {trace.candidateMutationKey === null ? null : <CandidateProbe key="candidate" />}</ul>;
}