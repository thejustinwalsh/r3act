/** Generic, lazily resolved property writers for Three-style host objects. */
import type { HostValuePolicy } from "./host_property_contract.ts";

export type ThreePropertyWriter = {
  /** Property spelling supplied by the caller (for example `position-x`). */
  readonly property: string;
  /** Apply a value while preserving Three object identity where supported. */
  write(value: unknown, invalidate?: ThreePropertyInvalidation): void;
  /** Restore the first value observed for the currently resolved target. */
  reset(invalidate?: ThreePropertyInvalidation): void;
};

/** Optional host-specific invalidation hook; this module does not guess methods. */
export type ThreePropertyInvalidation = (
  root: object,
  target: object,
  property: string,
  value: unknown,
) => void;

type ResolvedProperty = { target: object; key: string };
type SavedDefault = { value: unknown };

export type ThreePropertyWriterResolver = {
  resolve(root: object, property: string): ThreePropertyWriter;
  release(root: object): void;
};

const unsafeSegments = new Set(["__proto__", "constructor", "prototype"]);
const threeObjectFlags = [
  "isVector2",
  "isVector3",
  "isVector4",
  "isEuler",
  "isQuaternion",
  "isColor",
  "isMatrix3",
  "isMatrix4",
] as const;

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

const cloneValue = (value: unknown): unknown => {
  if (!isObject(value)) return value;
  // Only converted Three values are mutated in place. Ordinary data is
  // assigned, so its original reference is the correct removal default.
  if (isThreeObject(value) && typeof value.clone === "function") {
    return value.clone();
  }
  return value;
};

const isThreeObject = (value: unknown): value is Record<string, any> =>
  isObject(value) && threeObjectFlags.some((flag) => value[flag] === true);

const compatibleObjects = (target: Record<string, any>, value: unknown) => {
  if (!isObject(value)) return false;
  if (target.constructor === value.constructor) return true;
  return threeObjectFlags.some((flag) =>
    target[flag] === true && value[flag] === true
  );
};

const assertCompatibleNumericArray = (
  current: Record<string, any>,
  value: readonly unknown[],
  property: string,
) => {
  const length = current.isVector2
    ? 2
    : current.isVector3
    ? 3
    : current.isVector4 || current.isQuaternion
    ? 4
    : current.isMatrix3
    ? 9
    : current.isMatrix4
    ? 16
    : 3;
  const valid = current.isEuler === true
    ? (value.length === 3 || value.length === 4) &&
      value.slice(0, 3).every((item) => typeof item === "number") &&
      (value[3] === undefined || typeof value[3] === "string")
    : value.length === length &&
      value.every((item) => typeof item === "number");
  if (!valid) {
    throw new Error(
      `Three property ${JSON.stringify(property)} requires a compatible numeric array`,
    );
  }
};

const resolveProperty = (
  root: object,
  property: string,
  segments: readonly string[],
): ResolvedProperty => {
  if (
    Object.prototype.hasOwnProperty.call(root, property) || property in root
  ) {
    return { target: root, key: property };
  }
  let target: any = root;
  for (let index = 0; index < segments.length - 1; index++) {
    const segment = segments[index];
    if (target == null || !isObject(target) || !(segment in target)) {
      throw new Error(
        `Cannot resolve Three property path ${JSON.stringify(property)} at ${
          JSON.stringify(segment)
        }`,
      );
    }
    target = target[segment];
  }
  if (!isObject(target)) {
    throw new Error(
      `Three property path ${JSON.stringify(property)} has no object target`,
    );
  }
  if (!(segments.at(-1)! in target)) {
    throw new Error(`Unsupported Three property ${JSON.stringify(property)}`);
  }
  return { target, key: segments.at(-1)! };
};

const assertSafeProperty = (property: string) => {
  if (
    !property || property.split("-").some((part) => unsafeSegments.has(part))
  ) {
    throw new Error(`Unsafe Three property path ${JSON.stringify(property)}`);
  }
};

const writeResolved = (
  target: object,
  key: string,
  value: unknown,
  property: string,
) => {
  const record = target as Record<string, any>;
  const current = record[key];
  if (typeof current === "function") {
    throw new Error(
      `Three method ${JSON.stringify(property)} is not a data property`,
    );
  }
  if (Object.is(current, value)) return;

  if (
    isObject(current) && current.isColor === true &&
    typeof current.set === "function"
  ) {
    if (isObject(value) && compatibleObjects(current, value)) {
      if (typeof current.copy !== "function") {
        throw new Error(
          `Three Color property ${JSON.stringify(property)} cannot copy values`,
        );
      }
      current.copy(value);
      return;
    }
    if (typeof value === "string" || typeof value === "number") {
      current.set(value);
      return;
    }
    throw new Error(
      `Incompatible value for Three Color property ${JSON.stringify(property)}`,
    );
  }

  if (
    isThreeObject(current) && isObject(value) &&
    compatibleObjects(current, value) && typeof current.copy === "function"
  ) {
    current.copy(value);
    return;
  }

  if (isObject(current) && isThreeObject(current)) {
    if (typeof value === "number" && typeof current.setScalar === "function") {
      current.setScalar(value);
      return;
    }
    if (Array.isArray(value)) {
      assertCompatibleNumericArray(current, value, property);
      if (typeof current.fromArray === "function") {
        current.fromArray(value);
        return;
      }
      if (typeof current.set === "function") {
        current.set(...value);
        return;
      }
      throw new Error(
        `Three property ${JSON.stringify(property)} cannot read arrays`,
      );
    }
    if (isObject(value) && compatibleObjects(current, value)) {
      if (typeof current.copy !== "function") {
        throw new Error(
          `Three property ${JSON.stringify(property)} cannot copy values`,
        );
      }
      current.copy(value);
      return;
    }
    throw new Error(
      `Incompatible value for Three property ${JSON.stringify(property)}`,
    );
  }

  if (!isObject(current) || value == null || !isObject(value)) {
    record[key] = value;
    return;
  }

  // Ordinary user data remains assignable. Never call arbitrary `set` or `copy`.
  record[key] = value;
};

/** Describe the current generic write branch; later writes still re-resolve it. */
export const describeThreePropertyWrite = (
  root: object,
  property: string,
  value: unknown,
): { target: object; valuePolicy: HostValuePolicy | "unknown" } => {
  assertSafeProperty(property);
  const { target, key } = resolveProperty(root, property, property.split("-"));
  const current = (target as Record<string, any>)[key];
  const result = (valuePolicy: HostValuePolicy | "unknown") => ({
    target,
    valuePolicy,
  });
  if (typeof current === "function" || value == null) return result("unknown");
  if (Object.is(current, value)) {
    return result(isObject(value) ? "unknown" : "scalar");
  }
  if (isObject(current) && current.isColor === true &&
    typeof current.set === "function") {
    if (isObject(value) && compatibleObjects(current, value) &&
      typeof current.copy === "function") return result("copy");
    return result(typeof value === "string" || typeof value === "number"
      ? "copy"
      : "unknown");
  }
  if (isObject(current) && isThreeObject(current)) {
    if (isObject(value) && compatibleObjects(current, value) &&
      typeof current.copy === "function") return result("copy");
    if (typeof value === "number" && typeof current.setScalar === "function") {
      return result("copy");
    }
    if (Array.isArray(value)) {
      assertCompatibleNumericArray(current, value, property);
      return result(typeof current.fromArray === "function" ||
          typeof current.set === "function"
        ? "copy"
        : "unknown");
    }
    return result("unknown");
  }
  return result(typeof value === "object" || typeof value === "function"
    ? "retain"
    : "scalar");
};

/**
 * Resolve and cache a writer by raw host object and authored property name.
 * Nested paths are resolved on each write so replaced materials remain live;
 * defaults are weakly keyed by the actual resolved target.
 */
/** Create a cache scoped to one host/handle lifecycle. */
export const createThreePropertyWriterResolver =
  (): ThreePropertyWriterResolver => {
    const writers = new WeakMap<object, Map<string, ThreePropertyWriter>>();
    const resolve = (root: object, property: string): ThreePropertyWriter => {
      let byProperty = writers.get(root);
      if (!byProperty) writers.set(root, byProperty = new Map());
      const cached = byProperty.get(property);
      if (cached) return cached;
      assertSafeProperty(property);
      const segments = property.split("-");

      const defaults = new WeakMap<object, SavedDefault>();
      const resolveAndCapture = () => {
        const resolved = resolveProperty(root, property, segments);
        if (typeof (resolved.target as any)[resolved.key] === "function") {
          throw new Error(
            `Three method ${JSON.stringify(property)} is not a data property`,
          );
        }
        if (!defaults.has(resolved.target)) {
          defaults.set(resolved.target, {
            value: cloneValue((resolved.target as any)[resolved.key]),
          });
        }
        return resolved;
      };
      const writer: ThreePropertyWriter = Object.freeze({
        property,
        write(value: unknown, invalidate?: ThreePropertyInvalidation) {
          const { target, key } = resolveAndCapture();
          writeResolved(target, key, value, property);
          invalidate?.(root, target, key, (target as any)[key]);
        },
        reset(invalidate?: ThreePropertyInvalidation) {
          const { target, key } = resolveAndCapture();
          const saved = defaults.get(target)!;
          const current = (target as any)[key];
          if (
            isThreeObject(current) && isObject(saved.value) &&
            compatibleObjects(current, saved.value) &&
            typeof current.copy === "function"
          ) {
            current.copy(saved.value);
          } else {
            (target as any)[key] = cloneValue(saved.value);
          }
          invalidate?.(root, target, key, (target as any)[key]);
        },
      });
      byProperty.set(property, writer);
      return writer;
    };

    return {
      resolve,
      release(root: object) {
        writers.delete(root);
      },
    };
  };

const standaloneResolver = createThreePropertyWriterResolver();

/** Resolve through the module-level cache for standalone host integrations. */
export const resolveThreePropertyWriter = (
  root: object,
  property: string,
): ThreePropertyWriter => standaloneResolver.resolve(root, property);
