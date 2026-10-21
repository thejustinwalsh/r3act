/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, createStore, jsx, storeRecord, use, useState } from "@r3act/core";
import { RadixDialog } from "@r3act/react-bridge/radix-dialog";
import { createElement } from "react";
import { DialogBody, type DialogObserver } from "../../implementation/2026-10-19-radix-dialog/workload/dialog_body.tsx";

export function createOpenStore() {
  return createStore(storeRecord({ open: false }), (_old, value) => value);
}
export function createPointStore() {
  return createStore(storeRecord({ point: 1 }), (_old, value) => value);
}
export type NativeRadixProps = {
  openStore: ReturnType<typeof createOpenStore>;
  pointStore: ReturnType<typeof createPointStore>;
  label: string;
  order: readonly string[];
  portalContainer: HTMLElement;
  observer: DialogObserver;
  onOpenChange: (open: boolean) => void;
  gate?: AsyncResource<string>;
};
export function PendingGate(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <output data-gate={value} />;
}
export function NativeRadixApp(props: NativeRadixProps) {
  const open = use(props.openStore);
  const point = use(props.pointStore);
  const [nativeCount, setNativeCount] = useState(0);
  return <section data-native-label={props.label} data-native-count={nativeCount}>
    <button data-native-action="true" onClick={() => setNativeCount(current => current + 1)}>Native count</button>
    {props.order.map(id => <div key={id} data-row={id}>{id === "dialog" ?
      <RadixDialog key="dialog" open={open.open} onOpenChange={props.onOpenChange}
        title="Settings" description="Edit your dialog note" triggerLabel="Open settings"
        closeLabel="Close settings" portalContainer={props.portalContainer}
        children={createElement(DialogBody, { label: props.label, point: point.point,
          nativeCount, observer: props.observer })} /> : <output data-other="stable" />}</div>)}
    {props.gate ? <PendingGate resource={props.gate} /> : null}
  </section>;
}
