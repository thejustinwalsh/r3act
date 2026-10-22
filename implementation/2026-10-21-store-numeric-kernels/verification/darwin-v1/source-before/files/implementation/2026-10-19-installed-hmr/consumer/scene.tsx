/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { BufferGeometry, Material } from "three";
import type { SceneDomain } from "./state";

export function ScenePosition(props: { point: SceneDomain["point"] }) {
  const x = use(props.point);
  return <mesh key="cursor" name="cursor" position={[x, 0, 0]} />;
}

export function SceneSignal(props: { resource: SceneDomain["signal"] }) {
  const signal = use(props.resource);
  return <mesh key="signal" name="signal-ready" position={[signal, 1, 0]} />;
}

export function ThreeApp(props: { domain: SceneDomain; geometry: BufferGeometry; material: Material }) {
  return <group key="scene" name="installed-scene">
    <ScenePosition point={props.domain.point} />
    <Suspense fallback={<mesh key="signal" name="signal-waiting" />}>
      <SceneSignal resource={props.domain.signal} />
    </Suspense>
    <mesh key="decoration" name="decoration">
      <boxGeometry />
      <meshBasicMaterial color="#497ec5" />
    </mesh>
    <mesh key="borrowed" name="borrowed" args={[props.geometry, props.material]} />
  </group>;
}
