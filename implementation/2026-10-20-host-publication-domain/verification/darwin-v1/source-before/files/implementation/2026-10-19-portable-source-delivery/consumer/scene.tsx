/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { AsyncResource } from "@r3act/core";
import { values } from "./state";

export function ActiveMesh(props: { step: number }) {
  return <mesh key="active-mesh" name={`step-${props.step}`}
    position={values.position} rotation={values.rotation}>
    <boxGeometry key="active-geometry" />
    <meshStandardMaterial key="active-material" />
  </mesh>;
}
export function PendingMesh(props: { resource: AsyncResource<{ x: number }> }) {
  const value = use(props.resource);
  return <group key="pending-mesh" name={`ready-${value.x}`} />;
}
export function SceneApp(props: { step: number; resource: AsyncResource<{ x: number }> }) {
  return <group key="scene-root">
    <ActiveMesh key="active-owner" step={props.step} />
    <Suspense fallback={<group key="pending-mesh" name="waiting" />}>
      <PendingMesh key="pending-owner" resource={props.resource} />
    </Suspense>
  </group>;
}
