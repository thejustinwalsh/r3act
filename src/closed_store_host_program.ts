import {
  evaluateClosedNumericExpression,
  normalizeClosedNumericExpression,
  type ClosedNumericExpression,
} from "./closed_numeric_expression.ts";

type Primitive = string | number | boolean | null;

/** Compiler data program for one numeric Store read and one keyed host leaf. */
export type ClosedStoreHostProgram = Readonly<{
  schemaVersion: 1;
  componentProgramId: string;
  moduleRevision: string;
  storeUseSiteId: string;
  storeProp: string;
  host: Readonly<{
    tag: "mesh" | "group" | "div" | "output";
    key: string;
    props: readonly (readonly [string, ClosedNumericExpression])[];
    child: null;
  }>;
}>;

export type ClosedStoreHostOutput = readonly (readonly [string, Primitive])[];

const record = (input: unknown): Record<string, unknown> | null => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const copy: Record<string, unknown> = Object.create(null);
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))) {
    if (!("value" in descriptor)) return null;
    copy[key] = descriptor.value;
  }
  return copy;
};
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const array = (input: unknown): unknown[] | null => {
  if (!Array.isArray(input) || input.length > 32) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Object.keys(descriptors).length !== input.length + 1) return null;
  const copy: unknown[] = [];
  for (let index = 0; index < input.length; index++) {
    const descriptor = descriptors[index];
    if (!descriptor || !("value" in descriptor)) return null;
    copy.push(descriptor.value);
  }
  return copy;
};
const allowedName = (tag: ClosedStoreHostProgram["host"]["tag"], name: string) =>
  tag === "div" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
const primitive = (value: unknown): value is Primitive =>
  value === null || typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

/** Copy untrusted metadata into a frozen, data-only executable plan. */
export const normalizeClosedStoreHostProgram = (
  input: unknown,
): ClosedStoreHostProgram | null => {
  try {
    const root = record(input);
    if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp", "host"]) || root.schemaVersion !== 1) return null;
    for (const key of ["componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp"] as const) {
      if (typeof root[key] !== "string" || root[key].length === 0) return null;
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(root.storeProp as string)) return null;
    const host = record(root.host);
    if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
      !["mesh", "group", "div", "output"].includes(host.tag as string) ||
      typeof host.key !== "string" || host.key.length === 0 ||
      host.child !== null) return null;
    const tag = host.tag as ClosedStoreHostProgram["host"]["tag"];
    const rawProps = array(host.props);
    if (!rawProps) return null;
    const props: (readonly [string, ClosedNumericExpression])[] = [];
    const names = new Set<string>();
    for (const raw of rawProps) {
      const pair = array(raw);
      if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
        !allowedName(tag, pair[0]) || names.has(pair[0])) return null;
      const expression = normalizeClosedNumericExpression(pair[1], 1);
      if (!expression) return null;
      names.add(pair[0]);
      props.push(Object.freeze([pair[0], expression] as const));
    }
    if (props.length === 0) return null;
    return Object.freeze({
      schemaVersion: 1,
      componentProgramId: root.componentProgramId as string,
      moduleRevision: root.moduleRevision as string,
      storeUseSiteId: root.storeUseSiteId as string,
      storeProp: root.storeProp as string,
      host: Object.freeze({ tag, key: host.key as string,
        props: Object.freeze(props), child: null }),
    });
  } catch {
    return null;
  }
};

/** Evaluate only frozen primitive data; unsupported values decline admission. */
export const evaluateClosedStoreHostProgram = (
  program: ClosedStoreHostProgram,
  numericValue: unknown,
): ClosedStoreHostOutput | null => {
  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) return null;
  const props: (readonly [string, Primitive])[] = [];
  for (const [name, expression] of program.host.props) {
    const value = evaluateClosedNumericExpression(expression, [numericValue]);
    if (!primitive(value)) return null;
    props.push(Object.freeze([name, value] as const));
  }
  return Object.freeze(props);
};
