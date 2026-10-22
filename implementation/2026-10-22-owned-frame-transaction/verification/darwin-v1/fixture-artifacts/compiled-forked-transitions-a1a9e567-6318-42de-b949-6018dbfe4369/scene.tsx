/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { AsyncResource, StoreSource } from "file:///Volumes/Depot/Developer/r3act/src/native_runtime_api.ts";
import type { BufferGeometry, Material } from "three";
import type { Panel } from "./app";

export function ThreeResult(props: { resource: AsyncResource<Panel> }) {
  const panel = use(props.resource);
  return <mesh key="result" name={`result-${panel.query}`} position={[panel.query === "A" ? 1 : panel.query === "B" ? 2 : 3, 0, 0]}>
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
  return <group key="scene" name="forked-transitions">
    <group key="frontier" name={`query-${query}`} />
    <group key="urgent" name={`urgent-${urgent}`} />
    <Suspense fallback={<group key="result" name="result-pending" />}
      error={(reason: unknown) => <group key="result" name={`result-error-${String(reason)}`} />}>
      <ThreeResult resource={props.resource} />
    </Suspense>
    <mesh key="borrowed" name="borrowed" args={[props.geometry, props.material]} />
  </group>;
}
