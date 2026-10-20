/** @jsxImportSource @r3act/host-three */
// @native-ui
import { Suspense, use } from "@r3act/core";
import type { AsyncResource, StoreSource } from "@r3act/core";
import type { Panel } from "./app";

export const ArrowMesh = (props: { resource: AsyncResource<Panel> }) => {
  const panel = use(props.resource);
  return <mesh key="result" name={`result-${panel.stage}`}>
    <boxGeometry />
    <meshBasicMaterial color="#4775ad" />
  </mesh>;
};

export const ArrowScene = (props: {
  stage: StoreSource<string>;
  urgent: StoreSource<number>;
  resource: AsyncResource<Panel>;
}) => {
  const stage = use(props.stage);
  const urgent = use(props.urgent);
  return <group key="scene" name="arrow-components">
    <group key="stage" name={`stage-${stage}`} />
    <group key="urgent" name={`urgent-${urgent}`} />
    <Suspense fallback={<group key="result" name="result-pending" />}
      error={(reason: unknown) => <group key="result" name={`result-error-${String(reason)}`} />}>
      <ArrowMesh resource={props.resource} />
    </Suspense>
  </group>;
};
