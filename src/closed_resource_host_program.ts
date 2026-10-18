import { type ClosedNumericExpression, evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.ts";
import { jsx, type RuntimeElement, type RuntimeNode } from "./jsx_binding_runtime.ts";

type Primitive = string | number | boolean | null;
type ResourceHostTag = "div" | "span" | "output" | "group" | "mesh";
type ResourceHostChild = Readonly<{ kind: "host"; host: ResourceHostNode }> |
  Readonly<{ kind: "text"; expression: ClosedNumericExpression }>;
type ResourceHostNode = Readonly<{
  tag: ResourceHostTag;
  key: string;
  props: readonly (readonly [string, ClosedNumericExpression])[];
  children: readonly ResourceHostChild[];
}>;
type ProgramBase = Readonly<{
  componentProgramId: string;
  moduleRevision: string;
  resourceUseSiteId: string;
  resourceProp: string;
}>;

/** Immutable data program for one canonical resource read and a keyed intrinsic host. */
export type ClosedResourceHostProgram =
  | (ProgramBase & Readonly<{
    schemaVersion: 1;
    host: Readonly<{
      tag: "div";
      key: string;
      props: readonly (readonly [string, Primitive])[];
      child: "resource-value";
    }>;
  }>)
  | (ProgramBase & Readonly<{ schemaVersion: 2; host: ResourceHostNode }>);

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

const tupleArray = (input: unknown, limit = 32): unknown[] | null => {
  if (!Array.isArray(input) || input.length > limit) return null;
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

const propertyName = (tag: ResourceHostTag, name: string): boolean => {
  if (name === "key" || name === "children" || name === "ref" || name === "style" ||
    name === "__proto__" || name === "prototype" || name === "constructor" ||
    name.startsWith("on")) return false;
  if (tag === "div" || tag === "span" || tag === "output") {
    return /^data-[a-z][a-z0-9-]*$/.test(name);
  }
  return name === "name" || name === "visible" ||
    /^(position|rotation|scale)-[xyz]$/.test(name);
};

const normalizeHost = (input: unknown): ResourceHostNode | null => {
  const active = new Set<object>();
  const keys = new Set<string>();
  let nodes = 0;
  const visit = (raw: unknown, depth: number): ResourceHostNode | null => {
    if (depth > 32 || ++nodes > 256 || typeof raw !== "object" || raw === null || active.has(raw)) return null;
    active.add(raw);
    try {
      const host = record(raw);
      if (!host || !exact(host, ["tag", "key", "props", "children"]) ||
        !["div", "span", "output", "group", "mesh"].includes(host.tag as string) ||
        typeof host.key !== "string" || host.key.length === 0 || keys.has(host.key)) return null;
      const tag = host.tag as ResourceHostTag;
      keys.add(host.key);
      const rawProps = tupleArray(host.props);
      const rawChildren = tupleArray(host.children, 256);
      if (!rawProps || !rawChildren) return null;
      const props: (readonly [string, ClosedNumericExpression])[] = [];
      const seen = new Set<string>();
      for (const rawPair of rawProps) {
        const pair = tupleArray(rawPair, 2);
        if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
          !propertyName(tag, pair[0]) || seen.has(pair[0])) return null;
        const expression = normalizeClosedNumericExpression(pair[1], 1);
        if (!expression) return null;
        seen.add(pair[0]);
        props.push(Object.freeze([pair[0], expression] as const));
      }
      const children: ResourceHostChild[] = [];
      for (const rawChild of rawChildren) {
        const child = record(rawChild);
        if (!child) return null;
        if (child.kind === "host" && exact(child, ["kind", "host"])) {
          const nested = visit(child.host, depth + 1);
          if (!nested) return null;
          children.push(Object.freeze({ kind: "host", host: nested }));
        } else if (child.kind === "text" && exact(child, ["kind", "expression"])) {
          if (++nodes > 256) return null;
          const expression = normalizeClosedNumericExpression(child.expression, 1);
          if (!expression) return null;
          children.push(Object.freeze({ kind: "text", expression }));
        } else return null;
      }
      return Object.freeze({ tag, key: host.key, props: Object.freeze(props), children: Object.freeze(children) });
    } finally {
      active.delete(raw);
    }
  };
  try { return visit(input, 0); } catch { return null; }
};

/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export const normalizeClosedResourceHostProgram = (
  input: unknown,
): ClosedResourceHostProgram | null => {
  try {
    const root = record(input);
    if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp", "host"]) ||
      (root.schemaVersion !== 1 && root.schemaVersion !== 2)) return null;
    for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"] as const) {
      if (typeof root[key] !== "string" || root[key].length === 0) return null;
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp as string)) return null;
    if (root.schemaVersion === 2) {
      const host = normalizeHost(root.host);
      return host ? Object.freeze({
        schemaVersion: 2,
        componentProgramId: root.componentProgramId as string,
        moduleRevision: root.moduleRevision as string,
        resourceUseSiteId: root.resourceUseSiteId as string,
        resourceProp: root.resourceProp as string,
        host,
      }) : null;
    }
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
  } catch { return null; }
};

/** Construct ready host output without invoking the authored component. */
export const evaluateClosedResourceHostProgram = (
  program: ClosedResourceHostProgram,
  readyValue: unknown,
): RuntimeElement | null => {
  if (!primitive(readyValue)) return null;
  if (program.schemaVersion === 1) {
    if (readyValue === true) return null;
    const props: Record<string, Primitive> = { key: program.host.key };
    for (const [name, value] of program.host.props) props[name] = value;
    return jsx(program.host.tag, props, readyValue);
  }
  const inputs = [readyValue as number];
  const evaluate = (expression: ClosedNumericExpression): Primitive | undefined => {
    const value = evaluateClosedNumericExpression(expression, inputs);
    return primitive(value) ? value : undefined;
  };
  const construct = (host: ResourceHostNode): RuntimeElement | null => {
    const props: Record<string, Primitive> = { key: host.key };
    for (const [name, expression] of host.props) {
      const value = evaluate(expression);
      if (value === undefined) return null;
      props[name] = value;
    }
    const children: RuntimeNode[] = [];
    for (const child of host.children) {
      if (child.kind === "host") {
        const nested = construct(child.host);
        if (!nested) return null;
        children.push(nested);
      } else {
        const value = evaluate(child.expression);
        if (value === undefined || value === true) return null;
        children.push(value);
      }
    }
    return jsx(host.tag, props, ...children);
  };
  return construct(program.host);
};
