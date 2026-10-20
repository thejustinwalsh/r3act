/** @jsxImportSource @compiled-ui/runtime/three */
import * as THREE from "three";
import type { ThreeIntrinsicElements } from "../../src/three_intrinsic_types.ts";

class ProbeGeometry extends THREE.BufferGeometry {
  mode: "solid" | "wire" = "solid";
  constructor(radius: number) { super(); void radius; }
}
declare module "../../src/three_jsx_runtime.ts" {
  namespace JSX {
    interface IntrinsicElements extends ThreeIntrinsicElements<{ ProbeGeometry: typeof ProbeGeometry }> {}
  }
}

export const valid = <group position={[1,2,3]} scale={2}>
  <pointLight args={["orange", 2]} color="blue" />
  <mesh><icosahedronGeometry args={[1,2]} /><meshPhysicalMaterial clearcoat={.5} /></mesh>
  <probeGeometry args={[3]} mode="wire" />
</group>;
// @ts-expect-error Constructor args are inferred, not a hand-written overload.
export const wrongArgs = <icosahedronGeometry args={[1,"two"]} />;
// @ts-expect-error Unknown public data props are rejected.
export const unknown = <group nonsense={1} />;
// @ts-expect-error Methods are not data props.
export const method = <group updateMatrixWorld={true} />;
// @ts-expect-error Unsupported instance classes are outside this host's lifecycle contract.
export const unsupported = <texture />;
// @ts-expect-error User class argument types are inferred too.
export const customArgs = <probeGeometry args={["three"]} />;
// @ts-expect-error Required custom constructor arguments cannot be omitted.
export const missingCustomArgs = <probeGeometry />;
