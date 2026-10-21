/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { Domain } from "./state";

export const HeldThree = (props: { heldA: Domain["heldA"]; resource: Domain["signal"] }) => {
  const a = use(props.heldA);
  const signal = use(props.resource);
  return <group key="held-three">
    {/* elidable formatting around the closed mesh */}
    <mesh key="held-mesh" position={[a.vector.x, signal.sample.x, a.vector.y + signal.sample.y]} />
  </group>;
}

export const SceneApp = (props: { domain: Domain }) => {
  return <group key="scene-root">
    <Suspense fallback={<group key="held-three" name="waiting" />}>
      <HeldThree key="held-three-owner" heldA={props.domain.heldA}
        resource={props.domain.signal} />
    </Suspense>
  </group>;
}
