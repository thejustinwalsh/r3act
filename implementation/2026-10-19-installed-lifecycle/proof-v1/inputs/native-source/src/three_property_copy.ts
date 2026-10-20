/** Finite copy capture for built-in Three host values. */
import * as THREE from "three";
import type { HostCopyValueCapture } from "./host_property_contract.ts";

const unsafeSegments = new Set(["__proto__", "constructor", "prototype"]);
const assertSafeProperty = (property: string) => {
  if (!property || property.split("-").some((part) => unsafeSegments.has(part))) {
    throw new Error(`Unsafe Three property path ${JSON.stringify(property)}`);
  }
};

const dataValue = (object: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
};

const numericData = (object: object, keys: readonly string[]): number[] | null => {
  const values: number[] = [];
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor || !("value" in descriptor) ||
      typeof descriptor.value !== "number") return null;
    values.push(descriptor.value);
  }
  return values;
};

const numericTuple = (value: unknown, length: number): number[] | null => {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== length + 1 ||
    Object.getOwnPropertyDescriptor(value, "length")?.value !== length) return null;
  const items: number[] = [];
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor || !("value" in descriptor) ||
      typeof descriptor.value !== "number") return null;
    items.push(descriptor.value);
  }
  return items;
};

const eulerTuple = (value: unknown): (number | string)[] | null => {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    return null;
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value;
  if ((length !== 3 && length !== 4) ||
    Reflect.ownKeys(descriptors).length !== length + 1) return null;
  const components: (number | string)[] = [];
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor || !("value" in descriptor) ||
      (index < 3 ? typeof descriptor.value !== "number" :
        typeof descriptor.value !== "string")) return null;
    components.push(descriptor.value);
  }
  return components;
};

type BuiltinCopySpec = Readonly<{
  prototype: object;
  fields: readonly string[];
  ownFields: readonly string[];
  length: number;
  flag?: string;
  copy: unknown;
  fromArray: unknown;
}>;

const builtinCopySpecs: readonly BuiltinCopySpec[] = [
  {
    prototype: THREE.Vector2.prototype, fields: ["x", "y"],
    ownFields: ["x", "y"], length: 2,
    copy: THREE.Vector2.prototype.copy,
    fromArray: THREE.Vector2.prototype.fromArray,
  },
  {
    prototype: THREE.Vector3.prototype, fields: ["x", "y", "z"],
    ownFields: ["x", "y", "z"], length: 3,
    copy: THREE.Vector3.prototype.copy,
    fromArray: THREE.Vector3.prototype.fromArray,
  },
  {
    prototype: THREE.Vector4.prototype, fields: ["x", "y", "z", "w"],
    ownFields: ["x", "y", "z", "w"], length: 4,
    copy: THREE.Vector4.prototype.copy,
    fromArray: THREE.Vector4.prototype.fromArray,
  },
  {
    prototype: THREE.Quaternion.prototype,
    fields: ["_x", "_y", "_z", "_w"],
    ownFields: ["isQuaternion", "_x", "_y", "_z", "_w"],
    length: 4, flag: "isQuaternion",
    copy: THREE.Quaternion.prototype.copy,
    fromArray: THREE.Quaternion.prototype.fromArray,
  },
  {
    prototype: THREE.Euler.prototype, fields: ["_x", "_y", "_z"],
    ownFields: ["isEuler", "_x", "_y", "_z", "_order"],
    length: 3, flag: "isEuler",
    copy: THREE.Euler.prototype.copy,
    fromArray: THREE.Euler.prototype.fromArray,
  },
  {
    prototype: THREE.Color.prototype, fields: ["r", "g", "b"],
    ownFields: ["isColor", "r", "g", "b"],
    length: 3, flag: "isColor",
    copy: THREE.Color.prototype.copy,
    fromArray: THREE.Color.prototype.fromArray,
  },
  {
    prototype: THREE.Matrix3.prototype, fields: [],
    ownFields: ["elements"], length: 9,
    copy: THREE.Matrix3.prototype.copy,
    fromArray: THREE.Matrix3.prototype.fromArray,
  },
  {
    prototype: THREE.Matrix4.prototype, fields: [],
    ownFields: ["elements"], length: 16,
    copy: THREE.Matrix4.prototype.copy,
    fromArray: THREE.Matrix4.prototype.fromArray,
  },
];

const ordinaryOwnFields = (
  object: object,
  expected: readonly string[],
): boolean => {
  const keys = Reflect.ownKeys(object);
  if (keys.length !== expected.length &&
    !(keys.length === expected.length + 1 &&
      keys.includes("_onChangeCallback"))) return false;
  for (const key of keys) {
    if (key === "_onChangeCallback" && !expected.includes(key)) {
      if (typeof dataValue(object, key) !== "function") return false;
      continue;
    }
    if (typeof key !== "string" || !expected.includes(key)) return false;
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor || !("value" in descriptor)) return false;
  }
  return expected.every((key) => keys.includes(key));
};

const copiedInput = (
  current: object,
  value: unknown,
): { writeValue: unknown; comparison: readonly (number | string)[] } | null => {
  const prototype = Object.getPrototypeOf(current);
  const spec = builtinCopySpecs.find((candidate) =>
    prototype === candidate.prototype
  );
  if (!spec) return null;
  const { prototype: known, fields, ownFields, length, flag } = spec;
  if (!ordinaryOwnFields(current, ownFields) ||
    (flag && dataValue(current, flag) !== true)) return null;
  if (dataValue(known, "copy") !== spec.copy ||
    dataValue(known, "fromArray") !== spec.fromArray) return null;
  if (fields.length && !numericData(current, fields)) return null;
  if (!fields.length && !numericTuple(dataValue(current, "elements"), length)) {
    return null;
  }
  if (known === THREE.Color.prototype) {
    if (typeof value !== "object" || value === null ||
      Object.getPrototypeOf(value) !== known ||
      !ordinaryOwnFields(value, ownFields) || dataValue(value, flag!) !== true) {
      return null;
    }
    const components = numericData(value, fields);
    if (!components) return null;
    const copy = new THREE.Color();
    [copy.r, copy.g, copy.b] = components;
    return { writeValue: Object.freeze(copy), comparison: components };
  }
  let components: (number | string)[] | null = null;
  let order: string | undefined;
  const objectInput = typeof value === "object" && value !== null &&
    Object.getPrototypeOf(value) === known &&
    ordinaryOwnFields(value, ownFields) &&
    (!flag || dataValue(value, flag) === true);
  if (objectInput) {
    if (fields.length) components = numericData(value, fields);
    else components = numericTuple(dataValue(value, "elements"), length);
    if (known === THREE.Euler.prototype) {
      const candidate = dataValue(value, "_order");
      if (typeof candidate !== "string") return null;
      order = candidate;
    }
  } else if (known === THREE.Euler.prototype) {
    components = eulerTuple(value);
  } else components = numericTuple(value, length);
  if (!components) return null;
  if (known === THREE.Euler.prototype && order !== undefined) components.push(order);
  const snapshot = Object.freeze([...components]);
  if (!objectInput) return { writeValue: snapshot, comparison: snapshot };
  let writeValue: unknown;
  if (known === THREE.Vector2.prototype) {
    writeValue = new THREE.Vector2(components[0] as number, components[1] as number);
  } else if (known === THREE.Vector3.prototype) {
    writeValue = new THREE.Vector3(
      components[0] as number, components[1] as number, components[2] as number,
    );
  } else if (known === THREE.Vector4.prototype) {
    writeValue = new THREE.Vector4(
      components[0] as number, components[1] as number,
      components[2] as number, components[3] as number,
    );
  } else if (known === THREE.Quaternion.prototype) {
    writeValue = new THREE.Quaternion(
      components[0] as number, components[1] as number,
      components[2] as number, components[3] as number,
    );
  } else if (known === THREE.Euler.prototype) {
    writeValue = new THREE.Euler(
      components[0] as number, components[1] as number,
      components[2] as number,
      components[3] as ConstructorParameters<typeof THREE.Euler>[3],
    );
  } else if (known === THREE.Matrix3.prototype) {
    writeValue = new THREE.Matrix3().fromArray(components as number[]);
  } else {
    writeValue = new THREE.Matrix4().fromArray(components as number[]);
  }
  if (known === THREE.Matrix3.prototype || known === THREE.Matrix4.prototype) {
    Object.freeze((writeValue as THREE.Matrix3 | THREE.Matrix4).elements);
  }
  Object.freeze(writeValue);
  return { writeValue, comparison: snapshot };
};

/** Capture supported built-in Three copy inputs from own data fields. */
export const captureThreePropertyCopy = (
  root: object,
  property: string,
  value: unknown,
): HostCopyValueCapture | null => {
  if (value === null || value === undefined) return null;
  assertSafeProperty(property);
  const direct = Object.getOwnPropertyDescriptor(root, property);
  const segments = direct ? [property] : property.split("-");
  let target = root;
  for (const segment of segments.slice(0, -1)) {
    const next = dataValue(target, segment);
    if (typeof next !== "object" || next === null) return null;
    target = next;
  }
  const current = dataValue(target, segments.at(-1)!);
  if (typeof current !== "object" || current === null ||
    Object.is(current, value)) return null;
  const copied = copiedInput(current, value);
  if (!copied) return null;
  return Object.freeze({
    kind: "copy",
    writeValue: copied.writeValue,
    comparison: Object.freeze([...copied.comparison]),
  });
};
