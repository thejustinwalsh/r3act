import {
  closedStoreHostValueCount, isNormalizedClosedStoreHostProgram,
  type ClosedStoreHostProgram,
} from "./closed_store_host_program.ts";
import type { ClosedNumericExpression } from "./closed_numeric_expression.ts";

export type ClosedScalarNumericKernel =
  (inputs: readonly number[], outputs: number[]) => void;
export type ClosedScalarKernelProof =
  | Readonly<{ kind: "verified"; kernel: ClosedScalarNumericKernel;
    numericPropIndices: readonly number[] }>
  | Readonly<{ kind: "rejected"; reason: string }>;

const functionToString = Function.prototype.toString;
const intrinsicApply = Reflect.apply;
const MAX_SOURCE = 32768;
const MAX_TOKENS = 16384;
const MAX_NODES = 8192;
const MAX_LOCALS = 128;
const MAX_DEPTH = 128;
const MAX_SLOTS = 32;
const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const numeric = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+|(?:(?:0|[1-9]\d*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/;
const operatorSet = new Set(["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "|", "^", "&"]);
const precedence: Record<string, number> = {
  "|": 1, "^": 2, "&": 3, "<<": 4, ">>": 4, ">>>": 4,
  "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "**": 7,
};
const punctuators = [">>>", "=>", "**", "<<", ">>", "++", "--", "...", "==", "!=", "<=", ">=", "&&", "||", "??"];

type Token = Readonly<{ text: string; category: "id" | "number" | "string" | "punct" }>;
type Node = Readonly<{ kind: "input" | "literal" | "unary" | "binary";
  value: number | string; left?: number; right?: number }>;

class Decline extends Error {
  constructor(readonly code: string) { super(code); }
}
const fail = (code: string): never => { throw new Decline(code); };
const lineTerminator = (ch: string): boolean =>
  ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";

const lex = (source: string): Token[] => {
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

class Graph {
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

class Parser {
  private at = 0;
  private depth = 0;
  private inputs = "";
  private outputs = "";
  private readonly locals = new Map<string, number>();
  private readonly assigned: number[] = [];
  constructor(private readonly tokens: Token[], private readonly graph: Graph,
    private readonly inputCount: number, private readonly outputCount: number) {}
  private peek(offset = 0): Token | undefined { return this.tokens[this.at + offset]; }
  private take(): Token { return this.tokens[this.at++] ?? fail("syntax"); }
  private eat(value: string): boolean {
    if (this.peek()?.text !== value) return false;
    this.at++;
    return true;
  }
  private need(value: string): void { if (!this.eat(value)) fail("syntax"); }
  private name(): string {
    const token = this.take();
    if (token.category !== "id" || !identifier.test(token.text) ||
      ["this", "arguments", "eval", "await", "yield"].includes(token.text)) fail("syntax");
    return token.text;
  }
  private index(): number {
    const token = this.take();
    if (token.category !== "number" || !/^(?:0|[1-9][0-9]*)$/.test(token.text)) fail("index");
    const index = Number(token.text);
    if (!Number.isSafeInteger(index) || index >= MAX_SLOTS) fail("index");
    return index;
  }
  private expression(min = 0): number {
    if (++this.depth > MAX_DEPTH) fail("depth");
    try {
      let left: number;
      const token = this.take();
      if (token.text === "(") {
        left = this.expression();
        this.need(")");
      } else if (token.text === "+" || token.text === "-" || token.text === "~") {
        const right = this.expression(7);
        const child = this.graph.nodes[right];
        left = (token.text === "+" || token.text === "-") && child.kind === "literal"
          ? this.graph.literal(token.text === "-" ? -(child.value as number) : +(child.value as number))
          : this.graph.add("unary", token.text, right);
      } else if (token.category === "number") {
        left = this.graph.literal(Number(token.text));
      } else if (token.category === "id") {
        if (token.text === this.inputs) {
          this.need("[");
          const index = this.index();
          if (index >= this.inputCount) fail("index");
          this.need("]");
          left = this.graph.add("input", index);
        } else {
          const local = this.locals.get(token.text);
          if (local === undefined) fail("reference");
          left = local;
        }
      } else fail("syntax");
      while (true) {
        const op = this.peek()?.text;
        if (!op || !operatorSet.has(op) || precedence[op] < min) break;
        this.take();
        const right = this.expression(precedence[op] + (op === "**" ? 0 : 1));
        left = this.graph.add("binary", op, left, right);
      }
      return left;
    } finally { this.depth--; }
  }
  private assignment(): void {
    const target = this.name();
    if (target !== this.outputs) fail("assignment");
    this.need("[");
    const index = this.index();
    this.need("]");
    if (index !== this.assigned.length || index >= this.outputCount) fail("output-order");
    this.need("=");
    this.assigned.push(this.expression());
  }
  private declarationItem(): void {
    const name = this.name();
    if (name === this.inputs || name === this.outputs || this.locals.has(name) ||
      this.locals.size >= MAX_LOCALS) fail("local");
    this.need("=");
    const value = this.expression();
    this.locals.set(name, value);
  }
  private declaration(): void {
    this.take();
    this.declarationItem();
    while (this.eat(",")) this.declarationItem();
  }
  private assignmentList(): void {
    this.assignment();
    while (this.eat(",")) this.assignment();
  }
  parse(): readonly number[] {
    if (this.eat("function")) {
      if (this.peek()?.category === "id") this.name();
    }
    this.need("(");
    this.inputs = this.name();
    this.need(",");
    this.outputs = this.name();
    if (this.inputs === this.outputs) fail("parameters");
    this.need(")");
    const arrow = this.eat("=>");
    if (!arrow && this.peek()?.text !== "{") fail("syntax");
    if (this.eat("{")) {
      if (this.peek()?.category === "string") {
        const directive = this.take().text;
        if (directive !== '"use strict"' && directive !== "'use strict'") fail("syntax");
        this.need(";");
      }
      while (!this.eat("}")) {
        if (this.at >= this.tokens.length) fail("syntax");
        const before = this.at;
        if (["const", "let", "var"].includes(this.peek()!.text)) this.declaration();
        else this.assignmentList();
        if (!this.eat(";") && this.peek()?.text !== "}") fail("syntax");
        if (this.at === before) fail("syntax");
      }
    } else {
      if (this.eat("(")) {
        this.assignmentList();
        this.need(")");
      } else this.assignment();
    }
    if (this.at !== this.tokens.length || this.assigned.length !== this.outputCount) fail("output-count");
    return this.assigned;
  }
}

const hostNode = (expression: ClosedNumericExpression, graph: Graph, depth = 0): number => {
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

/** Verify complete source behavior against a privately normalized host program. */
export function proveClosedScalarNumericKernel(
  candidate: unknown, host: ClosedStoreHostProgram,
): ClosedScalarKernelProof {
  try {
    if (!isNormalizedClosedStoreHostProgram(host)) fail("host");
    if (host.schemaVersion === 4 || host.schemaVersion === 5 &&
      (host.host.tag !== "group" || host.host.children.length !== 0)) fail("host-shape");
    const inputCount = closedStoreHostValueCount(host);
    if (inputCount > MAX_SLOTS || typeof candidate !== "function") fail("candidate");
    const expressions: ClosedNumericExpression[] = [];
    const numericPropIndices: number[] = [];
    for (let i = 0; i < host.host.props.length; i++) {
      const value = host.host.props[i][1];
      if (value.kind === "literal" && typeof value.value !== "number") continue;
      if (value.kind === "tuple" || value.kind === "style") fail("host-shape");
      expressions.push(value);
      numericPropIndices.push(i);
    }
    if (!expressions.length || expressions.length > MAX_SLOTS) fail("host-shape");
    const source = intrinsicApply(functionToString, candidate, []) as string;
    if (source.length > MAX_SOURCE || new TextEncoder().encode(source).byteLength > MAX_SOURCE) {
      fail("source-size");
    }
    const graph = new Graph();
    const expected = expressions.map((value) => hostNode(value, graph));
    const actual = new Parser(lex(source), graph, inputCount, expected.length).parse();
    if (actual.some((node, index) => node !== expected[index])) fail("mismatch");
    return Object.freeze({ kind: "verified", kernel: candidate as ClosedScalarNumericKernel,
      numericPropIndices: Object.freeze(numericPropIndices) });
  } catch (error) {
    return Object.freeze({ kind: "rejected", reason: error instanceof Decline ? error.code : "source" });
  }
}
