/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, createStore, jsx, storeRecord, use, useState } from "@r3act/core";
import { createNativeReactRootAdapter } from "@r3act/react-bridge";
import { ReactLeaf, type IslandProps } from "../../implementation/2026-10-19-react-island/workload/react_leaf.tsx";

export const Island = createNativeReactRootAdapter(ReactLeaf);
export type NativeIslandProps = {
  label: string;
  order: readonly string[];
  point: ReturnType<typeof createPointStore>;
  gate?: AsyncResource<string>;
  observer: IslandProps["observer"];
  onNativeAction: () => void;
};
export function createPointStore() {
  return createStore(storeRecord({ point: 1 }), (_old, value) => value);
}
export function PendingGate(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <output data-gate={value} />;
}
export function NativeIslandApp(props: NativeIslandProps) {
  const point = use(props.point);
  const [nativeClicks, setNativeClicks] = useState(0);
  return <section data-native-label={props.label} data-native-clicks={nativeClicks}>
    <button data-native-action="true" onClick={() => setNativeClicks(current => current + 1)}>native</button>
    {props.order.map(id => <Island key={id} id={id} label={props.label} point={point.point}
      nativeClicks={nativeClicks}
      observer={props.observer} onNativeAction={props.onNativeAction} />)}
    {props.gate ? <PendingGate resource={props.gate} /> : null}
  </section>;
}
