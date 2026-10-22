import type { ClosedHostPrimitive } from "./closed_host_value.ts";
import type { ClosedStoreHostOutput } from "./closed_store_host_program.ts";

export type OwnedScalarValue = ClosedHostPrimitive;
export type OwnedScalarOutputCounts = {
  frames: number;
  rootMaterializations: number;
  propMaterializations: number;
};
const layoutKey = Symbol("owned-scalar-layout");
const frameKey = Symbol("owned-scalar-frame");
const intrinsicDefineProperty = Object.defineProperty;
const intrinsicIsArray = Array.isArray;

const copySlots = <T>(source: readonly T[]): T[] => {
  const copied: T[] = [];
  if (!intrinsicIsArray(source)) throw new TypeError("Scalar slots must be an array");
  const length = source.length;
  if (!Number.isSafeInteger(length) || length < 0 || length > 32) {
    throw new TypeError("Invalid scalar slot count");
  }
  for (let index = 0; index < length; index++) {
    intrinsicDefineProperty(copied, index, { value: source[index],
      enumerable: true, writable: true, configurable: true });
  }
  return copied;
};

export class OwnedScalarLayout {
  readonly #names: readonly string[];
  readonly #slots: readonly number[];
  readonly #constantSlots: readonly (OwnedScalarValue | undefined)[];

  private constructor(key: symbol, names: readonly string[],
    constantSlots: readonly (OwnedScalarValue | undefined)[]) {
    if (key !== layoutKey) throw new TypeError("Invalid scalar layout");
    this.#names = Object.freeze(names);
    const slots: number[] = [];
    let nextSlot = 0;
    for (let index = 0; index < names.length; index++) {
      const slot = constantSlots[index] === undefined ? nextSlot++ : -1;
      intrinsicDefineProperty(slots, index, { value: slot,
        enumerable: true, writable: true, configurable: true });
    }
    this.#slots = Object.freeze(slots);
    this.#constantSlots = Object.freeze(constantSlots);
    Object.freeze(this);
  }

  static create(names: readonly string[],
    constantSlots: readonly (OwnedScalarValue | undefined)[]): OwnedScalarLayout {
    const copiedNames = copySlots(names);
    const copiedConstants = copySlots(constantSlots);
    if (copiedNames.length !== copiedConstants.length || copiedNames.length === 0 ||
      copiedNames.some((name) => typeof name !== "string" || name.length === 0) ||
      new Set(copiedNames).size !== copiedNames.length ||
      copiedConstants.some((value) => value !== undefined && value !== null &&
        typeof value !== "string" && typeof value !== "boolean" &&
        !(typeof value === "number" && Number.isFinite(value)))) {
      throw new TypeError("Invalid scalar layout fields");
    }
    return new OwnedScalarLayout(layoutKey, copiedNames, copiedConstants);
  }

  static owns(value: unknown): value is OwnedScalarLayout {
    try { return typeof value === "object" && value !== null && #names in value; }
    catch { return false; }
  }

  get length(): number { return this.#names.length; }
  nameAt(index: number): string { return this.#names[index]; }
  slotAt(index: number): number { return this.#slots[index]; }
  constantAt(index: number): OwnedScalarValue | undefined {
    return this.#constantSlots[index];
  }
}

export class OwnedScalarFrame {
  readonly #layout: OwnedScalarLayout;
  readonly #values: readonly OwnedScalarValue[];

  private constructor(key: symbol, layout: OwnedScalarLayout,
    values: readonly OwnedScalarValue[]) {
    if (key !== frameKey || !isOwnedScalarLayout(layout) ||
      values.length !== layout.length) throw new TypeError("Invalid scalar frame");
    this.#layout = layout;
    this.#values = Object.freeze(values);
    Object.freeze(this);
  }

  static create(layout: OwnedScalarLayout,
    values: readonly OwnedScalarValue[], counts?: OwnedScalarOutputCounts): OwnedScalarFrame {
    if (!isOwnedScalarLayout(layout)) throw new TypeError("Unowned scalar layout");
    const copiedValues = copySlots(values);
    if (copiedValues.length !== layout.length) throw new TypeError("Scalar width mismatch");
    for (let index = 0; index < copiedValues.length; index++) {
      const value = copiedValues[index];
      if (value !== null && typeof value !== "string" &&
        typeof value !== "boolean" &&
        !(typeof value === "number" && Number.isFinite(value))) {
        throw new TypeError("Invalid scalar value");
      }
      const constant = layout.constantAt(index);
      if (constant !== undefined && !Object.is(value, constant)) {
        throw new TypeError("Scalar constant mismatch");
      }
    }
    const frame = new OwnedScalarFrame(frameKey, layout, copiedValues);
    if (counts) counts.frames++;
    return frame;
  }

  static owns(value: unknown): value is OwnedScalarFrame {
    try { return typeof value === "object" && value !== null && #values in value; }
    catch { return false; }
  }

  get layout(): OwnedScalarLayout { return this.#layout; }
  get length(): number { return this.#values.length; }
  valueAt(index: number): OwnedScalarValue { return this.#values[index]; }
}

export const isOwnedScalarLayout = (value: unknown): value is OwnedScalarLayout =>
  OwnedScalarLayout.owns(value);

export const isOwnedScalarFrame = (value: unknown): value is OwnedScalarFrame =>
  OwnedScalarFrame.owns(value);

Object.freeze(OwnedScalarLayout.prototype);
Object.freeze(OwnedScalarLayout);
Object.freeze(OwnedScalarFrame.prototype);
Object.freeze(OwnedScalarFrame);

/** Derive the former public tuple shape only when an ordinary caller observes it. */
export const materializeOwnedScalarPropEntries = (
  frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts,
): ClosedStoreHostOutput => {
  if (!isOwnedScalarFrame(frame)) throw new TypeError("Unowned scalar frame");
  const pairs: (readonly [string, OwnedScalarValue])[] = [];
  for (let index = 0; index < frame.length; index++) {
    pairs.push(Object.freeze([frame.layout.nameAt(index), frame.valueAt(index)] as const));
  }
  if (counts) counts.propMaterializations++;
  return Object.freeze(pairs);
};

/** Create ordinary own data properties without exposing the frame's backing values. */
export const materializeOwnedScalarPropRecord = (
  frame: OwnedScalarFrame, counts?: OwnedScalarOutputCounts,
): Readonly<Record<string, OwnedScalarValue>> => {
  if (!isOwnedScalarFrame(frame)) throw new TypeError("Unowned scalar frame");
  const props: Record<string, OwnedScalarValue> = {};
  for (let index = 0; index < frame.length; index++) {
    Object.defineProperty(props, frame.layout.nameAt(index), {
      value: frame.valueAt(index), enumerable: true, configurable: true,
      writable: true,
    });
  }
  if (counts) counts.propMaterializations++;
  return Object.freeze(props);
};
