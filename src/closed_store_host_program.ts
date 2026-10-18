import {
  evaluateClosedNumericExpression,
  normalizeClosedNumericExpression,
  type ClosedNumericExpression,
} from "./closed_numeric_expression.ts";

type Primitive = string | number | boolean | null;
type Host = Readonly<{
  tag: "mesh" | "group" | "div" | "output";
  key: string;
  props: readonly (readonly [string, ClosedNumericExpression])[];
  child: null;
}>;
export type ClosedStoreHostInput = Readonly<{
  storeUseSiteId: string;
  storeProp: string;
}>;

/** Compiler data program for one or more direct numeric Store reads and one keyed host leaf. */
export type ClosedStoreHostProgram = Readonly<{
  componentProgramId: string;
  moduleRevision: string;
  host: Host;
}> & (
  | Readonly<{ schemaVersion: 1; storeUseSiteId: string; storeProp: string }>
  | Readonly<{ schemaVersion: 2; inputs: readonly ClosedStoreHostInput[] }>
);

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
const allowedName = (tag: Host["tag"], name: string) =>
  tag === "div" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
const primitive = (value: unknown): value is Primitive =>
  value === null || typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));
const input = (site: unknown, prop: unknown): ClosedStoreHostInput | null =>
  typeof site === "string" && site.length > 0 &&
    typeof prop === "string" && /^[A-Za-z_$][\w$]*$/.test(prop)
    ? Object.freeze({ storeUseSiteId: site, storeProp: prop }) : null;

/** Copy untrusted metadata into a frozen, data-only executable plan. */
export const normalizeClosedStoreHostProgram = (
  raw: unknown,
): ClosedStoreHostProgram | null => {
  try {
    const root = record(raw);
    if (!root || typeof root.componentProgramId !== "string" ||
      !root.componentProgramId || typeof root.moduleRevision !== "string" ||
      !root.moduleRevision) return null;
    let inputs: readonly ClosedStoreHostInput[];
    if (root.schemaVersion === 1) {
      if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "storeUseSiteId", "storeProp", "host"])) return null;
      const one = input(root.storeUseSiteId, root.storeProp);
      if (!one) return null;
      inputs = Object.freeze([one]);
    } else if (root.schemaVersion === 2) {
      if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "host"])) return null;
      const rawInputs = array(root.inputs);
      if (!rawInputs || rawInputs.length < 2 || rawInputs.length > 8) return null;
      const next: ClosedStoreHostInput[] = [];
      const sites = new Set<string>();
      for (const rawInput of rawInputs) {
        const item = record(rawInput);
        if (!item || !exact(item, ["storeUseSiteId", "storeProp"])) return null;
        const normalized = input(item.storeUseSiteId, item.storeProp);
        if (!normalized || sites.has(normalized.storeUseSiteId)) return null;
        sites.add(normalized.storeUseSiteId);
        next.push(normalized);
      }
      inputs = Object.freeze(next);
    } else return null;
    const host = record(root.host);
    if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
      !["mesh", "group", "div", "output"].includes(host.tag as string) ||
      typeof host.key !== "string" || host.key.length === 0 ||
      host.child !== null) return null;
    const tag = host.tag as Host["tag"];
    const rawProps = array(host.props);
    if (!rawProps) return null;
    const props: (readonly [string, ClosedNumericExpression])[] = [];
    const names = new Set<string>();
    for (const rawProp of rawProps) {
      const pair = array(rawProp);
      if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
        !allowedName(tag, pair[0]) || names.has(pair[0])) return null;
      const expression = normalizeClosedNumericExpression(pair[1], inputs.length);
      if (!expression) return null;
      names.add(pair[0]);
      props.push(Object.freeze([pair[0], expression] as const));
    }
    if (props.length === 0) return null;
    const common = {
      componentProgramId: root.componentProgramId,
      moduleRevision: root.moduleRevision,
      host: Object.freeze({ tag, key: host.key, props: Object.freeze(props), child: null }),
    };
    return root.schemaVersion === 1
      ? Object.freeze({ ...common, schemaVersion: 1, ...inputs[0] }) as ClosedStoreHostProgram
      : Object.freeze({ ...common, schemaVersion: 2, inputs }) as ClosedStoreHostProgram;
  } catch {
    return null;
  }
};

/** The ordered direct Store reads covered by the frozen compiler program. */
export const closedStoreHostInputs = (
  program: ClosedStoreHostProgram,
): readonly ClosedStoreHostInput[] => program.schemaVersion === 2
  ? program.inputs
  : Object.freeze([Object.freeze({
    storeUseSiteId: program.storeUseSiteId,
    storeProp: program.storeProp,
  })]);

/** Evaluate only frozen primitive data; unsupported values decline admission. */
export const evaluateClosedStoreHostProgram = (
  program: ClosedStoreHostProgram,
  numericValues: number | readonly number[],
): ClosedStoreHostOutput | null => {
  const count = program.schemaVersion === 2 ? program.inputs.length : 1;
  const values = typeof numericValues === "number"
    ? count === 1 ? [numericValues] : null
    : array(numericValues);
  if (!values || values.length !== count || values.some((value) =>
    typeof value !== "number" || !Number.isFinite(value))) return null;
  const props: (readonly [string, Primitive])[] = [];
  for (const [name, expression] of program.host.props) {
    const value = evaluateClosedNumericExpression(expression, values as number[]);
    if (!primitive(value)) return null;
    props.push(Object.freeze([name, value] as const));
  }
  return Object.freeze(props);
};
