import * as THREE from "three";
import type { ThreeIntrinsicElements } from "../../src/three_intrinsic_types.ts";

class ProbeGeometry extends THREE.BufferGeometry {
  readonly segmentCount: number;
  probeMode: "solid" | "wire" = "solid";

  constructor(radius: number, segmentCount: number) {
    super();
    this.segmentCount = segmentCount;
    this.setAttribute("position", new THREE.Float32BufferAttribute([radius, 0, 0], 3));
  }
}

class VectorPropsProbe extends THREE.Object3D {
  vector2 = new THREE.Vector2();
  vector3 = new THREE.Vector3();
  vector4 = new THREE.Vector4();
  euler = new THREE.Euler();
  color = new THREE.Color();
}
abstract class AbstractSceneNode extends THREE.Object3D {}

type UserThreeNamespace = typeof THREE & {
  ProbeGeometry: typeof ProbeGeometry;
  VectorPropsProbe: typeof VectorPropsProbe;
  AbstractSceneNode: typeof AbstractSceneNode;
};
type Elements = ThreeIntrinsicElements<UserThreeNamespace>;
type Assert<T extends true> = T;
type IsPresent<Key extends PropertyKey, Map> = Key extends keyof Map ? true : false;
type IsAbsent<Key extends PropertyKey, Map> = Key extends keyof Map ? false : true;

type KnownTags = [
  Assert<IsPresent<"group", Elements>>,
  Assert<IsPresent<"mesh", Elements>>,
  Assert<IsPresent<"icosahedronGeometry", Elements>>,
  Assert<IsPresent<"pointLight", Elements>>,
  Assert<IsPresent<"probeGeometry", Elements>>,
  Assert<IsPresent<"vectorPropsProbe", Elements>>,
  Assert<IsAbsent<"abstractSceneNode", Elements>>,
  Assert<IsAbsent<"webGLRenderer", Elements>>,
  Assert<IsAbsent<"texture", Elements>>,
];
export type _KnownTags = KnownTags;

const groupRef: { current: THREE.Group | null } = { current: null };
const groupProps = {
  key: "group-a",
  ref: groupRef,
  name: "scene-root",
  position: [1, 2, 3],
  visible: true,
  children: null,
} satisfies Elements["group"];

const meshProps = {
  args: [new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()],
  position: new THREE.Vector3(1, 2, 3),
  rotation: new THREE.Euler(0.1, 0.2, 0.3),
  scale: 2,
  castShadow: true,
} satisfies Elements["mesh"];

const geometryProps = {
  args: [2, 7],
  attach: "geometry",
  probeMode: "wire",
} satisfies Elements["probeGeometry"];

const builtInGeometryProps = {
  args: [2, 3],
  attach: "geometry",
} satisfies Elements["icosahedronGeometry"];

const pointLightProps = {
  args: ["#d08040", 2],
  color: new THREE.Color(0.2, 0.4, 0.6),
  intensity: 2,
  position: [1, 2, 3] as const,
} satisfies Elements["pointLight"];

const mappedMathProps = {
  vector2: [1, 2],
  vector3: 3,
  vector4: [1, 2, 3, 4],
  euler: [0.1, 0.2, 0.3],
  color: "rebeccapurple",
} satisfies Elements["vectorPropsProbe"];

// @ts-expect-error IcosahedronGeometry's second argument is numeric.
const wrongConstructorArgs: Elements["icosahedronGeometry"] = { args: [2, "three"] };
// @ts-expect-error Group has no public field named `notAThreeProperty`.
const nonexistentProp: Elements["group"] = { notAThreeProperty: true };
// @ts-expect-error Public methods are not mapped as JSX data props.
const methodAsProp: Elements["group"] = { updateMatrixWorld: true };
// @ts-expect-error Three position requires a three-number vector form.
const wrongVectorTuple: Elements["group"] = { position: [1, 2] };
// @ts-expect-error Vector object literals are not accepted by the host's tuple-based writer.
const unsupportedVectorObject: Elements["group"] = { position: { x: 1, y: 2, z: 3 } };
// @ts-expect-error Readonly Three identity fields must not become writable JSX props.
const readonlyIdentityProp: Elements["group"] = { id: 42 };
// @ts-expect-error Readonly custom fields are omitted from writable data props.
const readonlyCustomProp: Elements["probeGeometry"] = { segmentCount: 7 };

void [groupProps, meshProps, geometryProps, builtInGeometryProps, pointLightProps, mappedMathProps];
void [wrongConstructorArgs, nonexistentProp, methodAsProp, wrongVectorTuple, unsupportedVectorObject, readonlyIdentityProp, readonlyCustomProp];
