import * as THREE from "three";
import nodeAssert from "node:assert/strict";
import { test } from "node:test";
import { captureThreePropertyCopy } from "../src/three_property_copy.ts";
import { resolveThreePropertyWriter } from "../src/three_property_writer.ts";

const assert = (condition, message) => nodeAssert.ok(condition, message);
const assertEquals = (actual, expected) => nodeAssert.deepStrictEqual(actual, expected);

test("Three copy capture freezes mutable inputs for the actual writer", () => {
  const root = {
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    material: { color: new THREE.Color() },
  };
  const vector = new THREE.Vector3(1, 2, 3);
  const vectorCopy = captureThreePropertyCopy(root, "position", vector);
  assert(vectorCopy?.kind === "copy", "Vector3 capture declined");
  vector.x = 9;
  resolveThreePropertyWriter(root, "position").write(vectorCopy.writeValue);
  assertEquals(root.position.toArray(), [1, 2, 3]);
  assertEquals(vectorCopy.comparison, [1, 2, 3]);

  const tuple = [4, 5, 6];
  const tupleCopy = captureThreePropertyCopy(root, "position", tuple);
  assert(tupleCopy?.kind === "copy", "tuple capture declined");
  tuple[0] = 8;
  resolveThreePropertyWriter(root, "position").write(tupleCopy.writeValue);
  assertEquals(root.position.toArray(), [4, 5, 6]);

  const euler = new THREE.Euler(0.1, 0.2, 0.3, "ZYX");
  const eulerCopy = captureThreePropertyCopy(root, "rotation", euler);
  assert(eulerCopy?.kind === "copy", "Euler capture declined");
  euler.x = 2;
  resolveThreePropertyWriter(root, "rotation").write(eulerCopy.writeValue);
  assertEquals(root.rotation.toArray().slice(0, 4), [0.1, 0.2, 0.3, "ZYX"]);

  const color = new THREE.Color(0.2, 0.4, 0.6);
  const colorCopy = captureThreePropertyCopy(root, "material-color", color);
  assert(colorCopy?.kind === "copy", "Color capture declined");
  color.r = 0.9;
  resolveThreePropertyWriter(root, "material-color").write(colorCopy.writeValue);
  assertEquals(root.material.color.toArray(), colorCopy.comparison);


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
    resolveThreePropertyWriter({ target }, "target").write(captured.writeValue);
    const actual = target.toArray();
    assert(actual.length === expected.length && actual.every((item, index) =>
      Object.is(item, expected[index])), "built-in copy changed components");
    if (value instanceof THREE.Vector2) {
      assert(Object.is(captured.comparison[0], -0), "signed zero was lost");
      assert(Object.is(captured.comparison[1], NaN), "NaN was lost");
    }
    value.fromArray(expected.map(() => 0));
    resolveThreePropertyWriter({ target }, "target").write(captured.writeValue);
    assert(target.toArray().every((item, index) => Object.is(item, expected[index])),
      "captured value retained mutable input storage");
    if (value instanceof THREE.Matrix3 || value instanceof THREE.Matrix4) {
      assert(Object.isFrozen(captured.writeValue.elements),
        "captured matrix elements were not stable");
    }
  }
});

test("Three copy capture declines accessor and unrelated objects", () => {
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
    value: (_value) => overridden,
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
