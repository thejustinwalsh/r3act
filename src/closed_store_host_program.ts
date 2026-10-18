import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
import {
  closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields,
  isClosedHostPrimitive, normalizeClosedHostValue,
  type ClosedHostOutputValue, type ClosedHostValue,
} from "./closed_host_value.ts";
import { evaluateClosedHostTree, normalizeClosedHostTree, type ClosedHostTreeNode } from "./closed_host_tree.ts";
import { jsx, type RuntimeElement } from "./jsx_binding_runtime.ts";

type Host<Value extends ClosedHostValue> = Readonly<{
  tag: "mesh" | "group" | "div" | "span" | "output";
  key: string;
  props: readonly (readonly [string, Value])[];
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
}> & (
  | Readonly<{ schemaVersion: 1; storeUseSiteId: string; storeProp: string; host: Host<ClosedNumericExpression> }>
  | Readonly<{ schemaVersion: 2; inputs: readonly ClosedStoreHostInput[]; host: Host<ClosedNumericExpression> }>
  | Readonly<{ schemaVersion: 3; inputs: readonly ClosedStoreHostInput[]; host: Host<ClosedHostValue> }>
  | Readonly<{ schemaVersion: 4; inputs: readonly ClosedStoreHostInput[]; host: ClosedHostTreeNode }>
);

export type ClosedStoreHostOutput = readonly (readonly [string, ClosedHostOutputValue])[];

const record = closedDataRecord;
const exact = exactClosedFields;
const array = closedDataArray;
const allowedName = (tag: Host<ClosedHostValue>["tag"], name: string) =>
  tag === "div" || tag === "span" || tag === "output"
    ? /^data-[a-z][a-z0-9-]*$/.test(name)
    : /^(?:position|rotation|scale)-[xyz]$/.test(name) || name === "visible";
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
    } else if (root.schemaVersion === 2 || root.schemaVersion === 3 || root.schemaVersion === 4) {
      if (!exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "inputs", "host"])) return null;
      const rawInputs = array(root.inputs);
      if (!rawInputs || rawInputs.length < (root.schemaVersion === 2 ? 2 : 1) || rawInputs.length > 8) return null;
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
    if (root.schemaVersion === 4) {
      const host = normalizeClosedHostTree(root.host, inputs.length, true);
      return host ? Object.freeze({
        schemaVersion: 4,
        componentProgramId: root.componentProgramId,
        moduleRevision: root.moduleRevision,
        inputs,
        host,
      }) : null;
    }
    const host = record(root.host);
    if (!host || !exact(host, ["tag", "key", "props", "child"]) ||
      !["mesh", "group", "div", "span", "output"].includes(host.tag as string) ||
      (root.schemaVersion !== 3 && host.tag === "span") ||
      typeof host.key !== "string" || host.key.length === 0 ||
      host.child !== null) return null;
    const tag = host.tag as Host<ClosedHostValue>["tag"];
    const rawProps = array(host.props);
    if (!rawProps) return null;
    const props: (readonly [string, ClosedHostValue])[] = [];
    const names = new Set<string>();
    for (const rawProp of rawProps) {
      const pair = array(rawProp);
      if (!pair || pair.length !== 2 || typeof pair[0] !== "string" ||
        (root.schemaVersion !== 3 && !allowedName(tag, pair[0])) || names.has(pair[0])) return null;
      const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputs.length, root.schemaVersion === 3);
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
      : Object.freeze({ ...common, schemaVersion: root.schemaVersion, inputs }) as ClosedStoreHostProgram;
  } catch {
    return null;
  }
};

/** The ordered direct Store reads covered by the frozen compiler program. */
export const closedStoreHostInputs = (
  program: ClosedStoreHostProgram,
): readonly ClosedStoreHostInput[] => program.schemaVersion !== 1
  ? program.inputs
  : Object.freeze([Object.freeze({
    storeUseSiteId: program.storeUseSiteId,
    storeProp: program.storeProp,
  })]);

/** Evaluate frozen compiler data into candidate-owned host values; unsupported values decline. */
export const evaluateClosedStoreHostProgram = (
  program: ClosedStoreHostProgram,
  numericValues: number | readonly number[],
): ClosedStoreHostOutput | null => {
  if (program.schemaVersion === 4) return null;
  const count = program.schemaVersion !== 1 ? program.inputs.length : 1;
  const values = typeof numericValues === "number"
    ? count === 1 ? [numericValues] : null
    : array(numericValues);
  if (!values || values.length !== count || values.some((value) =>
    typeof value !== "number" || !Number.isFinite(value))) return null;
  const props: (readonly [string, ClosedHostOutputValue])[] = [];
  for (const [name, expression] of program.host.props) {
    const value = evaluateClosedHostValue(expression, values as number[]);
    if (value === undefined || (program.schemaVersion !== 3 && !isClosedHostPrimitive(value))) return null;
    props.push(Object.freeze([name, value] as const));
  }
  return Object.freeze(props);
};

/** Evaluate every Store schema as a keyed candidate tree for scoped host publication. */
export const evaluateClosedStoreHostTree = (
  program: ClosedStoreHostProgram,
  numericValues: number | readonly number[],
): RuntimeElement | null => {
  if (program.schemaVersion !== 4) {
    const output = evaluateClosedStoreHostProgram(program, numericValues);
    if (!output) return null;
    const props: Record<string, unknown> = { key: program.host.key };
    for (const [name, value] of output) props[name] = value;
    return jsx(program.host.tag, props);
  }
  const values = typeof numericValues === "number"
    ? program.inputs.length === 1 ? [numericValues] : null
    : array(numericValues);
  if (!values || values.length !== program.inputs.length || values.some((value) =>
    typeof value !== "number" || !Number.isFinite(value))) return null;
  return evaluateClosedHostTree(program.host, values as number[], true);
};
