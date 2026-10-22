/** @jsxImportSource @r3act/core */
// @native-ui
import { asyncTask, Suspense, use, useEffect } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { AsyncResource, StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { BufferGeometry, Material } from "three";

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
  asyncTask("catalog", async (values) =>
    (values.get("$request") as Request).catalog),
  asyncTask("panel", async (values) => ({
    ...(values.get("detail") as { query: string; detail: string }),
    catalog: values.get("catalog") as string,
  } satisfies Panel)),
] as const;

export function DomResult(props: { resource: AsyncResource<Panel>; life: Life }) {
  const panel = use(props.resource);
  useEffect(() => {
    props.life.starts++;
    return () => { props.life.cleanups++; };
  });
  return <output key="result" data-result={panel.query} data-detail={panel.detail}>
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
    <output data-query={query}>{query}</output>
    <output data-urgent={urgent}>{urgent}</output>
    <Suspense fallback={<output key="result" data-pending="startup">Loading</output>}>
      <DomResult resource={props.resource} life={props.life} />
    </Suspense>
  </section>;
}

export function ThreeResult(props: { resource: AsyncResource<Panel> }) {
  const panel = use(props.resource);
  return <mesh key="result" name={`result-${panel.query}`} position={[panel.query === "A" ? 1 : 3, 0, 0]}>
    <boxGeometry />
    <meshBasicMaterial color="#4775ad" />
  </mesh>;
}

export function ThreeApp(props: {
  query: StoreSource<string>;
  urgent: StoreSource<number>;
  resource: AsyncResource<Panel>;
  geometry: BufferGeometry;
  material: Material;
}) {
  const query = use(props.query);
  const urgent = use(props.urgent);
  return <group key="scene" name="reentrant-replacement">
    <group key="query" name={`query-${query}`} />
    <group key="urgent" name={`urgent-${urgent}`} />
    <Suspense fallback={<group key="result" name="result-pending" />}>
      <ThreeResult resource={props.resource} />
    </Suspense>
    <mesh key="borrowed" name="borrowed" args={[props.geometry, props.material]} />
  </group>;
}
