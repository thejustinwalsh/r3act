/** @jsxImportSource @r3act/core */
// @native-ui
import { Suspense, use, useEffect, useState } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { AsyncResource, StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";

export type Panel = Readonly<{ stage: string; detail: string }>;
export type Life = { mounts: number; cleanups: number; conditionalMounts: number;
  conditionalCleanups: number; resultMounts: number; resultCleanups: number };
export type RowRef = { current: HTMLButtonElement | null };

// @ts-expect-error Lexical arguments is intentionally absent in this ES module.
export const ArrowBadge = (props: { stage: string }) => <strong data-badge={props.stage} data-lexical-arguments={typeof arguments} data-lexical-this={typeof this}>{props.stage}</strong>;

export const ArrowRow = (props: {
  id: string;
  life: Life;
  rowRef: RowRef;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    props.life.mounts++;
    return () => { props.life.cleanups++; };
  });
  if (count % 2 === 1) useEffect(() => {
    props.life.conditionalMounts++;
    return () => { props.life.conditionalCleanups++; };
  });
  return <li key={props.id} data-row={props.id} data-count={count}>
    <button ref={props.rowRef} data-click={props.id}
      onClick={() => setCount((value) => value + 1)}>{props.id}: {count}</button>
  </li>;
};

export const ArrowResult = (props: { resource: AsyncResource<Panel>; life: Life }) => {
  const panel = use(props.resource);
  useEffect(() => {
    props.life.resultMounts++;
    return () => { props.life.resultCleanups++; };
  });
  return <output key="result" data-result={panel.stage} data-detail={panel.detail}>
    {panel.stage}: {panel.detail}
  </output>;
};

export const ArrowApp = (props: {
  stage: StoreSource<string>;
  urgent: StoreSource<number>;
  resource: AsyncResource<Panel>;
  rows: readonly string[];
  refs: Record<string, RowRef>;
  life: Life;
}) => {
  const stage = use(props.stage);
  const urgent = use(props.urgent);
  return <section data-arrow-app="yes">
    <h2>Arrow workspace</h2>
    <ArrowBadge stage={stage} />
    <output data-stage={stage}>{stage}</output>
    <output data-urgent={urgent}>{urgent}</output>
    <ul>{props.rows.map((id) => <ArrowRow key={id} id={id}
      rowRef={props.refs[id]} life={props.life} />)}</ul>
    <Suspense fallback={<output key="result" data-pending="yes">Loading</output>}
      error={(reason: unknown) => <output key="result" data-error={String(reason)}>Failed</output>}>
      <ArrowResult resource={props.resource} life={props.life} />
    </Suspense>
  </section>;
};
