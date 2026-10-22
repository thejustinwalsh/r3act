import {
  evaluateClosedNumericExpression,
  normalizeClosedNumericExpression,
  type ClosedNumericExpression,
} from "./closed_numeric_expression.ts";
import { isSafeClosedStyleName } from "./scoped_host_values.ts";

export type ClosedHostPrimitive = string | number | boolean | null;
export type ClosedHostTag = "div" | "span" | "output" | "group" | "mesh";
export type ClosedHostValue = ClosedNumericExpression | Readonly<{
  kind: "tuple";
  items: readonly [ClosedNumericExpression, ClosedNumericExpression, ClosedNumericExpression];
}> | Readonly<{
  kind: "style";
  entries: readonly (readonly [string, ClosedNumericExpression])[];
}>;
export type ClosedHostOutputValue = ClosedHostPrimitive |
  readonly [number, number, number] |
  Readonly<Record<string, string | number | null>>;

export const closedDataRecord = (input: unknown): Record<string, unknown> | null => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length) return null;
  const copy: Record<string, unknown> = Object.create(null);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) return null;
    copy[key] = descriptor.value;
  }
  return copy;
};

export const exactClosedFields = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export const closedDataArray = (input: unknown, limit = 32): unknown[] | null => {
  if (!Array.isArray(input) || input.length > limit) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== input.length + 1 ||
    Object.keys(descriptors).length !== input.length + 1) return null;
  const copy: unknown[] = [];
  for (let index = 0; index < input.length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor || !("value" in descriptor)) return null;
    copy.push(descriptor.value);
  }
  return copy;
};

export const isClosedHostPrimitive = (value: unknown): value is ClosedHostPrimitive =>
  value === null || typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

export const isClosedHostPropertyName = (tag: ClosedHostTag, name: string): boolean => {
  if (name === "key" || name === "children" || name === "ref" || name === "style" ||
    name === "__proto__" || name === "prototype" || name === "constructor" ||
    name.startsWith("on")) return false;
  if (tag === "div" || tag === "span" || tag === "output") {
    return /^data-[a-z][a-z0-9-]*$/.test(name);
  }
  return name === "name" || name === "visible" ||
    /^(position|rotation|scale)-[xyz]$/.test(name);
};

/** Normalize one compiler-proven primitive or aggregate host prop from descriptor data. */
export const normalizeClosedHostValue = (
  input: unknown,
  tag: ClosedHostTag,
  name: string,
  inputCount: number,
  allowAggregates: boolean,
): ClosedHostValue | null => {
  try {
    if (allowAggregates && typeof input === "object" && input !== null) {
      const aggregate = closedDataRecord(input);
      if (!aggregate) return null;
      if (aggregate.kind === "tuple") {
        if ((tag !== "group" && tag !== "mesh") ||
          (name !== "position" && name !== "rotation" && name !== "scale") ||
          !exactClosedFields(aggregate, ["kind", "items"])) return null;
        const items = closedDataArray(aggregate.items, 3);
        if (!items || items.length !== 3) return null;
        const first = normalizeClosedNumericExpression(items[0], inputCount);
        const second = normalizeClosedNumericExpression(items[1], inputCount);
        const third = normalizeClosedNumericExpression(items[2], inputCount);
        return first && second && third
          ? Object.freeze({ kind: "tuple", items: Object.freeze([first, second, third] as const) })
          : null;
      }
      if (aggregate.kind === "style") {
        if ((tag !== "div" && tag !== "span" && tag !== "output") ||
          name !== "style" || !exactClosedFields(aggregate, ["kind", "entries"])) return null;
        const rawEntries = closedDataArray(aggregate.entries, 32);
        if (!rawEntries) return null;
        const entries: (readonly [string, ClosedNumericExpression])[] = [];
        const seen = new Set<string>();
        for (const raw of rawEntries) {
          const pair = closedDataArray(raw, 2);
          if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
            !isSafeClosedStyleName(pair[0]) || seen.has(pair[0])) return null;
          const expression = normalizeClosedNumericExpression(pair[1], inputCount);
          if (!expression) return null;
          seen.add(pair[0]);
          entries.push(Object.freeze([pair[0], expression] as const));
        }
        return Object.freeze({ kind: "style", entries: Object.freeze(entries) });
      }
    }
    return isClosedHostPropertyName(tag, name)
      ? normalizeClosedNumericExpression(input, inputCount) : null;
  } catch {
    return null;
  }
};

/** Evaluate into a fresh value owned by this candidate; undefined means unsupported output. */
export const evaluateClosedHostValue = (
  expression: ClosedHostValue,
  inputs: readonly number[],
): ClosedHostOutputValue | undefined => {
  if (expression.kind === "tuple") {
    const values = expression.items.map((item) => evaluateClosedNumericExpression(item, inputs));
    if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return undefined;
    return Object.freeze(values as [number, number, number]);
  }
  if (expression.kind === "style") {
    const style: Record<string, string | number | null> = Object.create(null);
    for (const [name, item] of expression.entries) {
      const value = evaluateClosedNumericExpression(item, inputs);
      if (value !== null && typeof value !== "string" &&
        !(typeof value === "number" && Number.isFinite(value))) return undefined;
      style[name] = value;
    }
    return Object.freeze(style);
  }
  const value = evaluateClosedNumericExpression(expression, inputs);
  return isClosedHostPrimitive(value) ? value : undefined;
};

/** Compiler-only: freeze a fresh, unescaped tuple literal proven by the compiler. This is not a purity proof for arbitrary arrays. */
export const stabilizeHostTuple = <const T extends readonly unknown[]>(value: T): Readonly<T> =>
  Object.freeze(value);
