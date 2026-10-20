import {
  captureThreePropertyCopy,
  createThreePropertyWriterResolver,
  resolveThreePropertyWriter,
} from "./three_property_writer.ts";
import * as THREE from "three";

const assertEquals = (
  actual: unknown,
  expected: unknown,
  message = "Values differ",
) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
};
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

Deno.test("Three copy capture freezes mutable inputs for the actual writer", () => {
  const root = {
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    material: { color: new THREE.Color() },
  };
  const vector = new THREE.Vector3(1, 2, 3);
  const vectorCopy = captureThreePropertyCopy(root, "position", vector);
  assert(vectorCopy?.kind === "copy", "Vector3 capture declined");
  vector.x = 9;
  resolveThreePropertyWriter(root, "position").write(vectorCopy!.writeValue);
  assertEquals(root.position.toArray(), [1, 2, 3]);
  assertEquals(vectorCopy!.comparison, [1, 2, 3]);

  const tuple = [4, 5, 6];
  const tupleCopy = captureThreePropertyCopy(root, "position", tuple);
  assert(tupleCopy?.kind === "copy", "tuple capture declined");
  tuple[0] = 8;
  resolveThreePropertyWriter(root, "position").write(tupleCopy!.writeValue);
  assertEquals(root.position.toArray(), [4, 5, 6]);

  const euler = new THREE.Euler(0.1, 0.2, 0.3, "ZYX");
  const eulerCopy = captureThreePropertyCopy(root, "rotation", euler);
  assert(eulerCopy?.kind === "copy", "Euler capture declined");
  euler.x = 2;
  resolveThreePropertyWriter(root, "rotation").write(eulerCopy!.writeValue);
  assertEquals(root.rotation.toArray().slice(0, 4), [0.1, 0.2, 0.3, "ZYX"]);

  const color = new THREE.Color(0.2, 0.4, 0.6);
  const colorCopy = captureThreePropertyCopy(root, "material-color", color);
  assert(colorCopy?.kind === "copy", "Color capture declined");
  color.r = 0.9;
  resolveThreePropertyWriter(root, "material-color").write(colorCopy!.writeValue);
  assertEquals(root.material.color.toArray(), colorCopy!.comparison);


  const otherCopies = [
    { value: new THREE.Vector2(-0, NaN), target: new THREE.Vector2() },
    { value: new THREE.Vector4(1, 2, 3, 4), target: new THREE.Vector4() },
    { value: new THREE.Quaternion(0, 0.5, 0, 1), target: new THREE.Quaternion() },
    { value: new THREE.Matrix3().set(1, 2, 3, 4, 5, 6, 7, 8, 9), target: new THREE.Matrix3() },
    { value: new THREE.Matrix4().makeTranslation(4, 5, 6), target: new THREE.Matrix4() },
  ];
  for (const { value, target } of otherCopies) {
    const captured = captureThreePropertyCopy({ target }, "target", value);
    assert(captured?.kind === "copy", "supported built-in capture declined");
    const expected = value.toArray();
    resolveThreePropertyWriter({ target }, "target").write(captured!.writeValue);
    const actual = target.toArray();
    assert(actual.length === expected.length && actual.every((item, index) =>
      Object.is(item, expected[index])), "built-in copy changed components");
    if (value instanceof THREE.Vector2) {
      assert(Object.is(captured!.comparison[0], -0), "signed zero was lost");
      assert(Object.is(captured!.comparison[1], NaN), "NaN was lost");
    }
    value.fromArray(expected.map(() => 0));
    resolveThreePropertyWriter({ target }, "target").write(captured!.writeValue);
    assert(target.toArray().every((item, index) => Object.is(item, expected[index])),
      "captured value retained mutable input storage");
    if (value instanceof THREE.Matrix3 || value instanceof THREE.Matrix4) {
      assert(Object.isFrozen((captured!.writeValue as THREE.Matrix3).elements),
        "captured matrix elements were not stable");
    }
  }
});

Deno.test("Three copy capture declines accessor and unrelated objects", () => {
  const root = { position: new THREE.Vector3() };
  let getterReads = 0;
  const input = Object.create(THREE.Vector3.prototype);
  Object.defineProperty(input, "x", { get() { getterReads++; return 1; } });
  Object.defineProperty(input, "y", { value: 2 });
  Object.defineProperty(input, "z", { value: 3 });
  assert(captureThreePropertyCopy(root, "position", input) === null,
    "accessor input was captured");
  assertEquals(getterReads, 0);
  assert(captureThreePropertyCopy(root, "position", { x: 1, y: 2, z: 3 }) === null,
    "ordinary object was captured");

  const overridden = new THREE.Vector3();
  Object.defineProperty(overridden, "copy", {
    value: (_value: unknown) => overridden,
  });
  assert(captureThreePropertyCopy({ position: overridden }, "position",
    new THREE.Vector3(1, 2, 3)) === null,
  "overridden target copy was captured");

  const alteredFlag = new THREE.Vector3(1, 2, 3);
  Object.defineProperty(alteredFlag, "isVector3", { value: false });
  assert(captureThreePropertyCopy(root, "position", alteredFlag) === null,
    "overridden input flag was captured");

  const alteredConstructor = new THREE.Vector3(1, 2, 3);
  Object.defineProperty(alteredConstructor, "constructor", { value: Array });
  assert(captureThreePropertyCopy(root, "position", alteredConstructor) === null,
    "overridden input constructor was captured");
});

class Vector3 {
  readonly isVector3 = true;
  constructor(public x = 1, public y = 2, public z = 3) {}
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setScalar(value: number) {
    return this.set(value, value, value);
  }
  fromArray(values: number[]) {
    return this.set(values[0], values[1], values[2]);
  }
  copy(value: Vector3) {
    return this.set(value.x, value.y, value.z);
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
}
class Euler {
  readonly isEuler = true;
  constructor(public x = 0, public y = 0, public z = 0, public order = "XYZ") {}
  set(x: number, y: number, z: number, order = this.order) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
    return this;
  }
  fromArray(values: unknown[]) {
    return this.set(
      values[0] as number,
      values[1] as number,
      values[2] as number,
      values[3] as string,
    );
  }
  copy(value: Euler) {
    return this.set(value.x, value.y, value.z, value.order);
  }
  clone() {
    return new Euler(this.x, this.y, this.z, this.order);
  }
}
class Color {
  readonly isColor = true;
  constructor(public value: string | number = "red") {}
  set(value: string | number) {
    this.value = value;
    return this;
  }
  copy(value: Color) {
    return this.set(value.value);
  }
  clone() {
    return new Color(this.value);
  }
}

Deno.test("writes vectors, scalar fields, Euler values, colors, and plain properties in place", () => {
  const position = new Vector3();
  const scale = new Vector3(1, 1, 1);
  const rotation = new Euler();
  const color = new Color("red");
  const root = {
    position,
    scale,
    rotation,
    material: { color },
    opacity: 0.5,
    label: "before",
  };

  const positionWriter = resolveThreePropertyWriter(root, "position");
  assert(
    positionWriter === resolveThreePropertyWriter(root, "position"),
    "writer cache missed",
  );
  positionWriter.write([4, 5, 6]);
  assert(position === root.position, "Vector identity changed");
  assertEquals([position.x, position.y, position.z], [4, 5, 6]);
  positionWriter.reset();
  assertEquals([position.x, position.y, position.z], [1, 2, 3]);

  const scaleWriter = resolveThreePropertyWriter(root, "scale");
  scaleWriter.write(2);
  assert(scale === root.scale, "Scalar vector write changed identity");
  assertEquals([scale.x, scale.y, scale.z], [2, 2, 2]);
  scaleWriter.reset();
  assertEquals([scale.x, scale.y, scale.z], [1, 1, 1]);

  resolveThreePropertyWriter(root, "rotation").write([0.1, 0.2, 0.3, "ZYX"]);
  assert(rotation === root.rotation, "Euler identity changed");
  assertEquals([rotation.x, rotation.y, rotation.z, rotation.order], [
    0.1,
    0.2,
    0.3,
    "ZYX",
  ]);
  resolveThreePropertyWriter(root, "rotation").reset();
  assertEquals([rotation.x, rotation.y, rotation.z, rotation.order], [
    0,
    0,
    0,
    "XYZ",
  ]);

  const colorWriter = resolveThreePropertyWriter(root, "material-color");
  colorWriter.write("blue");
  assert(color === root.material.color, "Color identity changed");
  assertEquals(color.value, "blue");
  colorWriter.reset();
  assertEquals(color.value, "red");

  const opacityWriter = resolveThreePropertyWriter(root, "opacity");
  opacityWriter.write(0.9);
  assertEquals(root.opacity, 0.9);
  opacityWriter.reset();
  assertEquals(root.opacity, 0.5);
  resolveThreePropertyWriter(root, "label").write("after");
  assertEquals(root.label, "after");
});

Deno.test("prefers literal keys and resolves nested replacements with per-target defaults", () => {
  const root: Record<string, any> = {
    "position-x": 2,
    position: new Vector3(10, 20, 30),
    material: { color: new Color("red") },
  };
  const literalWriter = resolveThreePropertyWriter(root, "position-x");
  literalWriter.write(7);
  assertEquals(root["position-x"], 7);
  assertEquals(root.position.x, 10, "Literal property did not take precedence");
  literalWriter.reset();
  assertEquals(root["position-x"], 2);

  const colorWriter = resolveThreePropertyWriter(root, "material-color");
  const firstMaterial = root.material;
  colorWriter.write("green");
  colorWriter.reset();
  assertEquals(firstMaterial.color.value, "red");

  const replacement = { color: new Color("blue") };
  root.material = replacement;
  colorWriter.write("white");
  colorWriter.reset();
  assertEquals(replacement.color.value, "blue");
  assertEquals(root.material, replacement);
});

Deno.test("walks multi-segment host property paths", () => {
  const root = { shadow: { mapSize: new Vector3(512, 256, 1) } };
  const writer = resolveThreePropertyWriter(root, "shadow-mapSize");
  writer.write([2048, 1024, 1]);
  assertEquals(
    [root.shadow.mapSize.x, root.shadow.mapSize.y],
    [2048, 1024],
  );
  writer.reset();
  assertEquals(
    [root.shadow.mapSize.x, root.shadow.mapSize.y],
    [512, 256],
  );
});

Deno.test("copies compatible object values and restores cloned defaults", () => {
  const position = new Vector3(1, 2, 3);
  const root = { position };
  const writer = resolveThreePropertyWriter(root, "position");
  writer.write(new Vector3(8, 9, 10));
  assert(
    position === root.position,
    "Compatible Vector3 copy replaced object identity",
  );
  assertEquals([position.x, position.y, position.z], [8, 9, 10]);
  writer.reset();
  assertEquals([position.x, position.y, position.z], [1, 2, 3]);
});

Deno.test("rejects unsafe paths and incompatible Three setter inputs before mutation", () => {
  const root = { position: new Vector3(1, 2, 3) };
  for (
    const path of [
      "__proto__",
      "constructor",
      "prototype",
      "position-constructor-x",
    ]
  ) {
    let error = "";
    try {
      resolveThreePropertyWriter(root, path);
    } catch (cause) {
      error = String(cause);
    }
    assert(
      error.includes("Unsafe Three property path"),
      `Unsafe path was accepted: ${path}`,
    );
  }
  const writer = resolveThreePropertyWriter(root, "position");
  let error = "";
  try {
    writer.write([9, "bad", 11]);
  } catch (cause) {
    error = String(cause);
  }
  assert(
    error.includes("compatible numeric array"),
    "Invalid vector array did not fail clearly",
  );
  assertEquals([root.position.x, root.position.y, root.position.z], [1, 2, 3]);
  error = "";
  try {
    writer.write({ unrelated: true });
  } catch (cause) {
    error = String(cause);
  }
  assert(
    error.includes("Incompatible value"),
    "Incompatible vector object did not fail clearly",
  );
});

Deno.test("never calls arbitrary set methods on ordinary objects and reports explicit invalidation", () => {
  let calls = 0;
  const ordinary = {
    value: {
      set() {
        calls++;
      },
    },
  };
  const writer = resolveThreePropertyWriter(ordinary, "value");
  let invalidated: unknown[] = [];
  writer.write([1, 2], (...args) => {
    invalidated = args;
  });
  assertEquals(calls, 0);
  assertEquals(ordinary.value, [1, 2]);
  assert(
    invalidated[0] === ordinary && invalidated[1] === ordinary &&
      invalidated[2] === "value",
    "Invalidation callback did not receive resolved host coordinates",
  );
  writer.reset();
  assertEquals(
    ordinary.value,
    { set: ordinary.value.set },
    "Plain object default was not cloned",
  );
});

Deno.test("invalid tuple lengths, unknown fields, and method removal do not mutate targets", () => {
  const root = {
    position: new Vector3(),
    action() {},
    data: { retained: true },
  };
  const original = root.position.clone();
  for (const tuple of [[1, 2], [1, 2, 3, 4]]) {
    let rejected = false;
    try {
      resolveThreePropertyWriter(root, "position").write(tuple);
    } catch {
      rejected = true;
    }
    assert(rejected, "invalid vector tuple accepted");
    assertEquals(root.position, original);
  }
  for (const property of ["missing", "action"]) {
    let rejected = false;
    try {
      resolveThreePropertyWriter(root, property).reset();
    } catch {
      rejected = true;
    }
    assert(rejected, "unknown or method property removal accepted");
  }
  const data = root.data;
  const writer = resolveThreePropertyWriter(root, "data");
  writer.write({ retained: false });
  writer.reset();
  assert(
    root.data === data,
    "ordinary assigned data lost its original reference on removal",
  );
});

Deno.test("resolver caches isolate defaults across host lifetimes and release cleanly", () => {
  const borrowed = { x: 1 };
  const firstResolver = createThreePropertyWriterResolver();
  const first = firstResolver.resolve(borrowed, "x");
  assert(
    first === firstResolver.resolve(borrowed, "x"),
    "resolver did not reuse its writer",
  );
  first.write(3);
  first.reset();
  assertEquals(borrowed.x, 1);

  borrowed.x = 7;
  const secondResolver = createThreePropertyWriterResolver();
  const second = secondResolver.resolve(borrowed, "x");
  assert(first !== second, "separate host resolvers shared a cached writer");
  second.write(9);
  second.reset();
  assertEquals(borrowed.x, 7, "new host lifetime reused stale removal default");

  borrowed.x = 9;
  secondResolver.release(borrowed);
  const afterRelease = secondResolver.resolve(borrowed, "x");
  assert(second !== afterRelease, "release retained the previous writer");
  afterRelease.reset();
  assertEquals(
    borrowed.x,
    9,
    "released writer cache did not capture the fresh baseline",
  );
});
