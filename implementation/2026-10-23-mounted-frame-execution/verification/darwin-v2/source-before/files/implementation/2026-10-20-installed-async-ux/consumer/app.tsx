/** @jsxImportSource @r3act/core */
// @native-ui
import { asyncTask, Suspense, use, useEffect } from "@r3act/core";
import type { AsyncResource, StoreSource } from "@r3act/core";

export type Panel = Readonly<{ query: string; detail: string; catalog: string }>;
export type Request = Readonly<{
  load(query: string, signal: AbortSignal): Promise<string>;
  catalog: string;
}>;
export type Life = { starts: number; cleanups: number };

export const tasks = [
  asyncTask("detail", async (values, signal) => {
    const query = String(values.get("$query"));
    const request = values.get("$request") as Request;
    return { query, detail: await request.load(query, signal) };
  }),
  asyncTask("catalog", async (values) => {
    const request = values.get("$request") as Request;
    return request.catalog;
  }),
  asyncTask("panel", async (values) => {
    const detail = values.get("detail") as { query: string; detail: string };
    const catalog = values.get("catalog") as string;
    return { ...detail, catalog } satisfies Panel;
  }),
] as const;

export function Result(props: { resource: AsyncResource<Panel>; requestedQuery: string; life: Life }) {
  const panel = use(props.resource);
  useEffect(() => {
    props.life.starts++;
    return () => { props.life.cleanups++; };
  });
  return <output key="result" data-result={panel.query} data-detail={panel.detail}
    data-pending={props.requestedQuery === panel.query ? undefined : "detail"}>
    {panel.query}: {panel.detail} · {panel.catalog}
  </output>;
}

export function DomApp(props: {
  lane: "primary" | "fork";
  query: StoreSource<string>;
  urgent: StoreSource<number>;
  resource: AsyncResource<Panel>;
  life: Life;
}) {
  const query = use(props.query);
  const urgent = use(props.urgent);
  return <section data-root={props.lane}>
    <h2>{props.lane === "primary" ? "Workspace" : "Forked inspector"}</h2>
    <output data-query={query}>{query}</output>
    <output data-urgent={urgent}>{urgent}</output>
    <Suspense fallback={<output key="result" data-pending="startup">Loading</output>}
      error={(reason: unknown) => <output key="result" data-error={String(reason)}>Load failed</output>}>
      <Result resource={props.resource} requestedQuery={query} life={props.life} />
    </Suspense>
  </section>;
}
