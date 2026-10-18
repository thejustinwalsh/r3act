import { jsx, type RuntimeElement } from "./jsx_binding_runtime.ts";

type Primitive = string | number | boolean | null;

/** Immutable data program for one resource read and one keyed intrinsic host. */
export type ClosedResourceHostProgram = Readonly<{
  schemaVersion: 1;
  componentProgramId: string;
  moduleRevision: string;
  resourceUseSiteId: string;
  resourceProp: string;
  host: Readonly<{
    tag: "div";
    key: string;
    props: readonly (readonly [string, Primitive])[];
    child: "resource-value";
  }>;
}>;

const record = (input: unknown): Record<string, unknown> | null => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const copy: Record<string, unknown> = Object.create(null);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) return null;
    copy[key] = descriptor.value;
  }
  return copy;
};

const exact = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));

const primitive = (value: unknown): value is Primitive =>
  value === null || typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

const tupleArray = (input: unknown): unknown[] | null => {
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

/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export const normalizeClosedResourceHostProgram = (
  input: unknown,
): ClosedResourceHostProgram | null => {
  const root = record(input);
  if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp", "host"]) || root.schemaVersion !== 1) return null;
  for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"] as const) {
    if (typeof root[key] !== "string" || root[key].length === 0) return null;
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp as string)) return null;
  const host = record(root.host);
  if (!host || !exact(host, ["tag", "key", "props", "child"]) || host.tag !== "div" || host.child !== "resource-value" || typeof host.key !== "string" || host.key.length === 0) return null;
  const rawProps = tupleArray(host.props);
  if (!rawProps) return null;
  const seen = new Set<string>();
  const props: (readonly [string, Primitive])[] = [];
  for (const raw of rawProps) {
    const pair = tupleArray(raw);
    if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || !/^data-[a-z][a-z0-9-]*$/.test(pair[0]) || seen.has(pair[0]) || !primitive(pair[1])) return null;
    seen.add(pair[0]);
    props.push(Object.freeze([pair[0], pair[1]] as const));
  }
  return Object.freeze({
    schemaVersion: 1,
    componentProgramId: root.componentProgramId as string,
    moduleRevision: root.moduleRevision as string,
    resourceUseSiteId: root.resourceUseSiteId as string,
    resourceProp: root.resourceProp as string,
    host: Object.freeze({ tag: "div", key: host.key as string, props: Object.freeze(props), child: "resource-value" }),
  });
};

/** Construct a ready host leaf without invoking the authored component. */
export const evaluateClosedResourceHostProgram = (
  program: ClosedResourceHostProgram,
  readyValue: unknown,
): RuntimeElement | null => {
  if (!primitive(readyValue)) return null;
  if (readyValue === true) return null;
  const props: Record<string, Primitive> = { key: program.host.key };
  for (const [name, value] of program.host.props) props[name] = value;
  return jsx(program.host.tag, props, readyValue);
};
