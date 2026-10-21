import { Suspense, use, createKeyedCollection, storeRecord } from "file:///workspace/r3act/src/native_runtime_api.ts";
export const domRows = createKeyedCollection([
  storeRecord({ id: "a", value: 1 }), storeRecord({ id: "b", value: 2 }),
], row => row.id);
export const threeRows = createKeyedCollection([
  storeRecord({ id: "a", value: 1 }), storeRecord({ id: "b", value: 2 }),
], row => row.id);
export const domAux = createKeyedCollection([storeRecord({ id: "q", value: 5 })], row => row.id);
export const threeAux = createKeyedCollection([storeRecord({ id: "q", value: 5 })], row => row.id);
export const opaqueRows = createKeyedCollection([storeRecord({ id: "o", value: 1 })], row => row.id);
export const unownedRows = createKeyedCollection([{ id: "u", value: 1 }], row => row.id);
export const failingRows = createKeyedCollection([storeRecord({ id: "f", value: 1 })], row => row.id);
export const trace = { opaqueCalls: 0 };
export const pending = new Promise(() => {});
export function DomRow(props) {
  return <output data-value={props.row.value}>{props.row.value}</output>;
}
export function ThreeRow(props) {
  return <mesh position-x={props.row.value} />;
}
export function DomList() {
  return <ul key="rows">{domRows.map(row => <DomRow row={row} />)}</ul>;
}
export function ThreeList() {
  return <group key="rows">{threeRows.map(row => <ThreeRow row={row} />)}</group>;
}
export function DomAux() {
  return <div key="aux">{domAux.map(row => <DomRow row={row} />)}</div>;
}
export function ThreeAux() {
  return <group key="aux">{threeAux.map(row => <ThreeRow row={row} />)}</group>;
}
function opaqueValue(row) {
  trace.opaqueCalls++;
  return row.value;
}
export function OpaqueRow(props) {
  return <output data-value={opaqueValue(props.row)} />;
}
export function OpaqueList() {
  return <div key="opaque">{opaqueRows.map(row => <OpaqueRow row={row} />)}</div>;
}
export function UnownedList() {
  return <div key="unowned">{unownedRows.map(row => <DomRow row={row} />)}</div>;
}
export function FailingList() {
  return <div key="failing">{failingRows.map(row => <DomRow row={row} />)}</div>;
}
export function PendingDom() {
  const value = use(pending);
  return <output key="pending" data-value={value} />;
}
export function PendingThree() {
  const value = use(pending);
  return <group key="pending" name={value} />;
}
export function DomApp() {
  return <section><DomList key="list" /><DomAux key="aux" />
    <Suspense fallback={<output key="pending">waiting</output>}>
      <PendingDom key="pending-child" />
    </Suspense>
  </section>;
}
export function ThreeApp() {
  return <group key="app"><ThreeList key="list" /><ThreeAux key="aux" />
    <Suspense fallback={<group key="pending" name="waiting" />}>
      <PendingThree key="pending-child" />
    </Suspense>
  </group>;
}