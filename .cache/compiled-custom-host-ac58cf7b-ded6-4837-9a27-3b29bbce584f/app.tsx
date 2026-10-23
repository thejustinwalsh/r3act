/** @jsxImportSource @r3act/core */
// @native-ui
import { use, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { BrushBinding, CanvasNode } from "./retained_host";

export type RowId = "shared-a" | "shared-b" | "owned" | "borrowed";
export type RowLife = { mounts: number; cleanups: number };
export type RowRefs = Record<RowId, { current: CanvasNode | null }>;
export type RowBrushes = Record<RowId, BrushBinding>;

export function DomApp(props: { stage: StoreSource<string> }) {
  const stage = use(props.stage);
  return <section data-custom-host="dom"><output data-stage={stage}>{stage}</output></section>;
}

export function CanvasRow(props: {
  id: RowId;
  index: number;
  brush: BrushBinding;
  nodeRef: { current: CanvasNode | null };
  payload: { label: string };
  life: RowLife;
}) {
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    props.life.mounts++;
    return () => { props.life.cleanups++; };
  });
  const y = 18 + props.index * 44;
  return <paintLayer key={props.id} name={props.id}>
    <paintRect key="body" ref={props.nodeRef} name={props.id} position={[16, y]}
      width={160} height={32} brush={props.brush} payload={props.payload}
      onClick={() => setClicks((current) => current + 1)} />
    <paintText key="label" name={`${props.id}-label`} position={[24, y + 21]}
      text={`${props.id}:${clicks}`} color="#ffffff" />
  </paintLayer>;
}

export function CanvasApp(props: {
  stage: StoreSource<string>;
  rows: readonly RowId[];
  brushes: RowBrushes;
  refs: RowRefs;
  payloads: Record<RowId, { label: string }>;
  life: RowLife;
}) {
  const stage = use(props.stage);
  return <paintLayer key="root" name="canvas-root">
    <paintText key="stage" name="stage" position={[16, 14]} text={`stage-${stage}`} color="#26384f" />
    {props.rows.map((id, index) => <CanvasRow key={id} id={id} index={index}
      brush={props.brushes[id]} nodeRef={props.refs[id]}
      payload={props.payloads[id]} life={props.life} />)}
  </paintLayer>;
}
