import { jsx, type RuntimeElement } from "./jsx_binding_runtime.ts";
import {
  closedDataArray, closedDataRecord, exactClosedFields, isClosedHostPrimitive,
  type ClosedHostPrimitive,
} from "./closed_host_value.ts";
import { evaluateClosedHostTree, normalizeClosedHostTree, type ClosedHostTreeNode } from "./closed_host_tree.ts";

type Primitive = ClosedHostPrimitive;
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
  | (ProgramBase & Readonly<{ schemaVersion: 2 | 3; host: ClosedHostTreeNode }>);

const record = closedDataRecord;
const exact = exactClosedFields;
const primitive = isClosedHostPrimitive;
const tupleArray = closedDataArray;

/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export const normalizeClosedResourceHostProgram = (
  input: unknown,
): ClosedResourceHostProgram | null => {
  try {
    const root = record(input);
    if (!root || !exact(root, ["schemaVersion", "componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp", "host"]) ||
      (root.schemaVersion !== 1 && root.schemaVersion !== 2 && root.schemaVersion !== 3)) return null;
    for (const key of ["componentProgramId", "moduleRevision", "resourceUseSiteId", "resourceProp"] as const) {
      if (typeof root[key] !== "string" || root[key].length === 0) return null;
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(root.resourceProp as string)) return null;
    if (root.schemaVersion === 2 || root.schemaVersion === 3) {
      const host = normalizeClosedHostTree(root.host, 1, root.schemaVersion === 3);
      return host ? Object.freeze({
        schemaVersion: root.schemaVersion,
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
  return evaluateClosedHostTree(program.host, [readyValue as number]);
};
