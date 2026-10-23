import type { ClosedNumericExpression } from "./closed_numeric_expression.ts";

export const MAX_SOURCE = 32768;
export const MAX_TOKENS = 16384;
export const MAX_NODES = 8192;
export const MAX_LOCALS = 128;
export const MAX_DEPTH = 128;
export const MAX_SLOTS = 32;
const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
export const isClosedNumericIdentifier = (name: string): boolean => identifier.test(name);
const numeric = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/;
const operatorSet = new Set(["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "|", "^", "&"]);
const precedence: Readonly<Record<string, number>> = Object.freeze({
  "|": 1, "^": 2, "&": 3, "<<": 4, ">>": 4, ">>>": 4,
  "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "**": 7,
});
export const isClosedNumericOperator = (operator: string): boolean => operatorSet.has(operator);
export const closedNumericPrecedence = (operator: string): number => precedence[operator];
const punctuators = [">>>", "=>", "**", "<<", ">>", "++", "--", "...", "==", "!=", "<=", ">=", "&&", "||", "??"];

export type Token = Readonly<{ text: string; category: "id" | "number" | "string" | "punct" }>;
export type Node = Readonly<{ kind: "input" | "literal" | "unary" | "binary";
  value: number | string; left?: number; right?: number }>;

export class Decline extends Error {
  constructor(readonly code: string) { super(code); }
}
export function fail(code: string): never { throw new Decline(code); }
const lineTerminator = (ch: string): boolean =>
  ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";

export const lex = (source: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  const push = (text: string, category: Token["category"]) => {
    if (tokens.length >= MAX_TOKENS) fail("tokens");
    tokens.push({ text, category });
  };
  while (i < source.length) {
    const start = i;
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (source.startsWith("//", i)) {
      i += 2;
      while (i < source.length && !lineTerminator(source[i])) i++;
      continue;
    }
    if (source.startsWith("/*", i)) {
      i = source.indexOf("*/", i + 2);
      if (i < 0) fail("syntax");
      i += 2;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      i++;
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) i++;
      push(source.slice(start, i), "id");
      continue;
    }
    if (/[0-9]/.test(ch) || ch === "." && /[0-9]/.test(source[i + 1] ?? "")) {
      const rest = source.slice(i);
      const match = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)/.exec(rest);
      if (!match || !numeric.test(match[0])) fail("syntax");
      i += match[0].length;
      push(match[0], "number");
      continue;
    }
    if (ch === "'" || ch === '"') {
      i++;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === "\\" || source[i] === "\n" || source[i] === "\r") fail("syntax");
        i++;
      }
      if (i >= source.length) fail("syntax");
      i++;
      push(source.slice(start, i), "string");
      continue;
    }
    const long = punctuators.find((part) => source.startsWith(part, i));
    if (long) { i += long.length; push(long, "punct"); continue; }
    if ("(){}[];,=+-*/%~|^&.<>".includes(ch)) {
      i++;
      push(ch, "punct");
      continue;
    }
    fail("syntax");
  }
  return tokens;
};

export class Graph {
  readonly nodes: Node[] = [];
  readonly keys = new Map<string, number>();
  add(kind: Node["kind"], value: number | string, left?: number, right?: number): number {
    const key = kind === "literal" ? `l:${Object.is(value, -0) ? "-0" : value}`
      : `${kind}:${value}:${left ?? ""}:${right ?? ""}`;
    const prior = this.keys.get(key);
    if (prior !== undefined) return prior;
    if (this.nodes.length >= MAX_NODES) fail("nodes");
    const id = this.nodes.length;
    this.nodes.push({ kind, value, left, right });
    this.keys.set(key, id);
    return id;
  }
  literal(value: number): number {
    if (!Number.isFinite(value)) fail("literal");
    return this.add("literal", value);
  }
}
Object.freeze(Graph.prototype);
Object.freeze(Graph);
export const hostNode = (expression: ClosedNumericExpression, graph: Graph, depth = 0): number => {
  if (depth > MAX_DEPTH) fail("depth");
  switch (expression.kind) {
    case "input": return graph.add("input", expression.index);
    case "literal":
      if (typeof expression.value !== "number") fail("host-expression");
      return graph.literal(expression.value);
    case "unary": {
      if (!["+", "-", "~"].includes(expression.operator)) fail("host-expression");
      const child = hostNode(expression.argument, graph, depth + 1);
      const node = graph.nodes[child];
      return (expression.operator === "+" || expression.operator === "-") && node.kind === "literal"
        ? graph.literal(expression.operator === "-" ? -(node.value as number) : +(node.value as number))
        : graph.add("unary", expression.operator, child);
    }
    case "binary":
      if (!operatorSet.has(expression.operator)) fail("host-expression");
      return graph.add("binary", expression.operator,
        hostNode(expression.left, graph, depth + 1),
        hostNode(expression.right, graph, depth + 1));
    default: fail("host-expression");
  }
};
