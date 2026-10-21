/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { AsyncResource } from "@r3act/core";

function SceneResult(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <group key="scene-value" name={value} />;
}
export function SceneApp(props: { resource?: AsyncResource<string>; label: string }) {
  return <group key="scene-root">
    {props.resource
      ? <Suspense fallback={<group key="scene-value" name="waiting" />}>
          <SceneResult key="scene-owner" resource={props.resource} />
        </Suspense>
      : <group key="scene-value" name="old" />}
  </group>;
}
