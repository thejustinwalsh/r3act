import { type ClosedNumericExpression, evaluateClosedNumericExpression, normalizeClosedNumericExpression } from "./closed_numeric_expression.ts";
import { jsx, type RuntimeElement, type RuntimeNode } from "./jsx_binding_runtime.ts";
import {
  closedDataArray, closedDataRecord, evaluateClosedHostValue, exactClosedFields,
  isClosedHostPrimitive, normalizeClosedHostValue,
  type ClosedHostTag, type ClosedHostValue,
} from "./closed_host_value.ts";

export type ClosedHostTreeChild = Readonly<{ kind: "host"; host: ClosedHostTreeNode }> |
  Readonly<{ kind: "text"; expression: ClosedNumericExpression }>;
export type ClosedHostTreeNode = Readonly<{
  tag: ClosedHostTag;
  key: string;
  props: readonly (readonly [string, ClosedHostValue])[];
  children: readonly ClosedHostTreeChild[];
}>;

/** Copy a finite host tree from untrusted descriptor data into frozen compiler metadata. */
export const normalizeClosedHostTree = (
  input: unknown,
  inputCount: number,
  allowAggregates: boolean,
): ClosedHostTreeNode | null => {
  if (!Number.isSafeInteger(inputCount) || inputCount < 1 || inputCount > 8) return null;
  const active = new Set<object>();
  const keys = new Set<string>();
  let nodes = 0;
  const visit = (raw: unknown, depth: number): ClosedHostTreeNode | null => {
    if (depth > 32 || ++nodes > 256 || typeof raw !== "object" || raw === null || active.has(raw)) return null;
    active.add(raw);
    try {
      const host = closedDataRecord(raw);
      if (!host || !exactClosedFields(host, ["tag", "key", "props", "children"]) ||
        !["div", "span", "output", "group", "mesh"].includes(host.tag as string) ||
        typeof host.key !== "string" || host.key.length === 0 || keys.has(host.key)) return null;
      const tag = host.tag as ClosedHostTag;
      keys.add(host.key);
      const rawProps = closedDataArray(host.props);
      const rawChildren = closedDataArray(host.children, 256);
      if (!rawProps || !rawChildren) return null;
      const props: (readonly [string, ClosedHostValue])[] = [];
      const names = new Set<string>();
      for (const rawPair of rawProps) {
        const pair = closedDataArray(rawPair, 2);
        if (!pair || pair.length !== 2 || typeof pair[0] !== "string" || names.has(pair[0])) return null;
        const expression = normalizeClosedHostValue(pair[1], tag, pair[0], inputCount, allowAggregates);
        if (!expression) return null;
        names.add(pair[0]);
        props.push(Object.freeze([pair[0], expression] as const));
      }
      const children: ClosedHostTreeChild[] = [];
      for (const rawChild of rawChildren) {
        const child = closedDataRecord(rawChild);
        if (!child) return null;
        if (child.kind === "host" && exactClosedFields(child, ["kind", "host"])) {
          const nested = visit(child.host, depth + 1);
          if (!nested) return null;
          children.push(Object.freeze({ kind: "host", host: nested }));
        } else if (child.kind === "text" && exactClosedFields(child, ["kind", "expression"])) {
          if (++nodes > 256) return null;
          const expression = normalizeClosedNumericExpression(child.expression, inputCount);
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

/** Build candidate-owned JSX values from a frozen host tree. */
export const evaluateClosedHostTree = (
  host: ClosedHostTreeNode,
  inputs: readonly number[],
  requireTextNode = false,
): RuntimeElement | null => {
  const construct = (node: ClosedHostTreeNode): RuntimeElement | null => {
    const props: Record<string, unknown> = { key: node.key };
    for (const [name, expression] of node.props) {
      const value = evaluateClosedHostValue(expression, inputs);
      if (value === undefined) return null;
      props[name] = value;
    }
    const children: RuntimeNode[] = [];
    for (const child of node.children) {
      if (child.kind === "host") {
        const nested = construct(child.host);
        if (!nested) return null;
        children.push(nested);
      } else {
        const value = evaluateClosedNumericExpression(child.expression, inputs);
        if (!isClosedHostPrimitive(value) || value === true ||
          (requireTextNode && typeof value !== "string" && typeof value !== "number")) return null;
        children.push(value);
      }
    }
    return jsx(node.tag, props, ...children);
  };
  return construct(host);
};
