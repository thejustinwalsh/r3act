/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { SceneValue } from "./state";
import type { AsyncResource } from "@r3act/core";

export function SceneLeaf(props: { resource: AsyncResource<SceneValue> }) {
  const value = use(props.resource);
  return <group key="scene-leaf"><mesh key="scene-mesh" position={[value.sample.x, 0, 0]} /></group>;
}
export function SceneApp(props: { resource: AsyncResource<SceneValue> }) {
  return <group key="scene-root"><Suspense fallback={<group key="scene-leaf" name="waiting" />}>
    <SceneLeaf key="scene-owner" resource={props.resource} />
  </Suspense></group>;
}
