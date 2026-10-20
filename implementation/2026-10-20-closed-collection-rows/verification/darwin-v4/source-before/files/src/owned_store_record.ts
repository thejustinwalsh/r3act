const ownedStoreRecords = new WeakSet<object>();

/** Copy one plain data record into immutable runtime-owned Store state. */
export function storeRecord<T extends object>(input: T): Readonly<T> {
  if (Array.isArray(input)) throw new TypeError("Store record cannot be an array");
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Store record requires a plain prototype");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input) as unknown as
    Record<PropertyKey, PropertyDescriptor>;
  const copy = Object.create(prototype) as T;
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string" || key === "__proto__" ||
      key === "constructor" || key === "prototype") {
      throw new TypeError("Store record has an unsafe property");
    }
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor)) {
      throw new TypeError("Store record requires own data properties");
    }
    Object.defineProperty(copy, key, {
      value: descriptor.value,
      enumerable: descriptor.enumerable,
      writable: false,
      configurable: false,
    });
  }
  Object.freeze(copy);
  ownedStoreRecords.add(copy);
  return copy;
}

const closedPathSegment = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z_$][\w$]*$/.test(value) &&
  value !== "__proto__" && value !== "constructor" && value !== "prototype";

const closedDataArray = (value: unknown, maximum: number): unknown[] | null => {
  if (!Array.isArray(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<string, PropertyDescriptor>;
  const length = descriptors.length?.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0 || length > maximum ||
    Reflect.ownKeys(value).length !== length + 1 ||
    Object.keys(descriptors).length !== length + 1) return null;
  const result: unknown[] = [];
  for (let index = 0; index < length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor || !("value" in descriptor)) return null;
    result.push(descriptor.value);
  }
  return result;
};

/** Capture finite numeric paths through records issued by storeRecord. */
export function captureClosedProjectionValues(
  state: unknown,
  paths: readonly (readonly string[])[],
): readonly number[] | null {
  try {
    const selectedPaths = closedDataArray(paths, 32);
    if (!selectedPaths || selectedPaths.length < 1) return null;
    const values: number[] = [];
    for (const rawPath of selectedPaths) {
      const path = closedDataArray(rawPath, 8);
      if (!path) return null;
      let value = state;
      for (const segment of path) {
        if (!closedPathSegment(segment) || typeof value !== "object" ||
          value === null || !ownedStoreRecords.has(value)) return null;
        const descriptor = Object.getOwnPropertyDescriptor(value, segment);
        if (!descriptor || !("value" in descriptor)) return null;
        value = descriptor.value;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      values.push(value);
    }
    return Object.freeze(values);
  } catch {
    return null;
  }
}
