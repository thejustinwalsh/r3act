/** A finite, compiler-emitted expression over ordered numeric source sites. */
export type ClosedNumericExpression =
  | Readonly<{ kind: "input"; index: number }>
  | Readonly<{ kind: "literal"; value: number | string | boolean | null }>
  | Readonly<{
    kind: "unary";
    operator: "+" | "-" | "!" | "~";
    argument: ClosedNumericExpression;
  }>
  | Readonly<{
    kind: "binary";
    operator:
      | "+"
      | "-"
      | "*"
      | "/"
      | "%"
      | "**"
      | "=="
      | "!="
      | "==="
      | "!=="
      | "<"
      | "<="
      | ">"
      | ">="
      | "<<"
      | ">>"
      | ">>>"
      | "|"
      | "^"
      | "&";
    left: ClosedNumericExpression;
    right: ClosedNumericExpression;
  }>
  | Readonly<{
    kind: "logical";
    operator: "&&" | "||" | "??";
    left: ClosedNumericExpression;
    right: ClosedNumericExpression;
  }>
  | Readonly<{
    kind: "conditional";
    test: ClosedNumericExpression;
    consequent: ClosedNumericExpression;
    alternate: ClosedNumericExpression;
  }>
  | Readonly<{
    kind: "template";
    parts: readonly string[];
    expressions: readonly ClosedNumericExpression[];
  }>;

type Primitive = number | string | boolean | null;
const unary = new Set(["+", "-", "!", "~"]);
const binary = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "==",
  "!=",
  "===",
  "!==",
  "<",
  "<=",
  ">",
  ">=",
  "<<",
  ">>",
  ">>>",
  "|",
  "^",
  "&",
]);
const logical = new Set(["&&", "||", "??"]);
const MAX_DEPTH = 32;
const MAX_NODES = 256;

const dataRecord = (input: unknown): Record<string, unknown> | null => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
};

const dataArray = (input: unknown): unknown[] | null => {
  if (!Array.isArray(input) || input.length > MAX_NODES) return null;
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

/** Snapshot untrusted descriptor data; evaluation touches only these frozen copies. */
export const normalizeClosedNumericExpression = (
  input: unknown,
  inputCount: number,
): ClosedNumericExpression | null => {
  if (!Number.isSafeInteger(inputCount) || inputCount < 0) return null;
  const active = new Set<object>();
  let nodes = 0;
  const visit = (
    value: unknown,
    depth: number,
  ): ClosedNumericExpression | null => {
    if (
      depth > MAX_DEPTH || ++nodes > MAX_NODES ||
      typeof value !== "object" || value === null || active.has(value)
    ) {
      return null;
    }
    active.add(value);
    try {
      const node = dataRecord(value);
      if (!node) return null;
      switch (node.kind) {
        case "input":
          return Number.isSafeInteger(node.index) &&
              (node.index as number) >= 0 &&
              (node.index as number) < inputCount
            ? Object.freeze({ kind: "input", index: node.index as number })
            : null;
        case "literal": {
          const literal = node.value;
          return literal === null || typeof literal === "string" ||
              typeof literal === "boolean" ||
              (typeof literal === "number" && Number.isFinite(literal))
            ? Object.freeze({ kind: "literal", value: literal as Primitive })
            : null;
        }
        case "unary": {
          if (typeof node.operator !== "string" || !unary.has(node.operator)) {
            return null;
          }
          const argument = visit(node.argument, depth + 1);
          return argument
            ? Object.freeze({
              kind: "unary",
              operator: node.operator as "+" | "-" | "!" | "~",
              argument,
            })
            : null;
        }
        case "binary":
        case "logical": {
          if (
            typeof node.operator !== "string" ||
            !(node.kind === "binary" ? binary : logical).has(node.operator)
          ) {
            return null;
          }
          const left = visit(node.left, depth + 1);
          const right = visit(node.right, depth + 1);
          if (!left || !right) return null;
          return node.kind === "binary"
            ? Object.freeze({
              kind: "binary",
              operator: node.operator as Extract<
                ClosedNumericExpression,
                { kind: "binary" }
              >["operator"],
              left,
              right,
            })
            : Object.freeze({
              kind: "logical",
              operator: node.operator as "&&" | "||" | "??",
              left,
              right,
            });
        }
        case "conditional": {
          const test = visit(node.test, depth + 1);
          const consequent = visit(node.consequent, depth + 1);
          const alternate = visit(node.alternate, depth + 1);
          return test && consequent && alternate
            ? Object.freeze({
              kind: "conditional",
              test,
              consequent,
              alternate,
            })
            : null;
        }
        case "template": {
          const parts = dataArray(node.parts);
          const expressions = dataArray(node.expressions);
          if (
            !parts || !expressions || parts.length !== expressions.length + 1 ||
            parts.some((part) => typeof part !== "string")
          ) return null;
          const normalized: ClosedNumericExpression[] = [];
          for (const expression of expressions) {
            const child = visit(expression, depth + 1);
            if (!child) return null;
            normalized.push(child);
          }
          return Object.freeze({
            kind: "template",
            parts: Object.freeze(parts as string[]),
            expressions: Object.freeze(normalized),
          });
        }
        default:
          return null;
      }
    } finally {
      active.delete(value);
    }
  };
  try {
    return visit(input, 0);
  } catch {
    return null;
  }
};

/** Evaluate a normalized expression without invoking authored projectors. */
export const evaluateClosedNumericExpression = (
  expression: ClosedNumericExpression,
  inputs: readonly number[],
): Primitive => {
  const read = (node: ClosedNumericExpression): Primitive => {
    switch (node.kind) {
      case "input":
        return inputs[node.index];
      case "literal":
        return node.value;
      case "unary": {
        const value = read(node.argument);
        switch (node.operator) {
          case "+":
            return Number(value);
          case "-":
            return -Number(value);
          case "!":
            return !value;
          case "~":
            return ~Number(value);
        }
      }
      case "binary": {
        const left = read(node.left);
        const right = read(node.right);
        switch (node.operator) {
          case "+":
            return (left as number) + (right as number);
          case "-":
            return Number(left) - Number(right);
          case "*":
            return Number(left) * Number(right);
          case "/":
            return Number(left) / Number(right);
          case "%":
            return Number(left) % Number(right);
          case "**":
            return Number(left) ** Number(right);
          case "==":
            return left == right;
          case "!=":
            return left != right;
          case "===":
            return left === right;
          case "!==":
            return left !== right;
          case "<":
            return (left as number) < (right as number);
          case "<=":
            return (left as number) <= (right as number);
          case ">":
            return (left as number) > (right as number);
          case ">=":
            return (left as number) >= (right as number);
          case "<<":
            return Number(left) << Number(right);
          case ">>":
            return Number(left) >> Number(right);
          case ">>>":
            return Number(left) >>> Number(right);
          case "|":
            return Number(left) | Number(right);
          case "^":
            return Number(left) ^ Number(right);
          case "&":
            return Number(left) & Number(right);
        }
      }
      case "logical": {
        const left = read(node.left);
        if (node.operator === "&&") return left ? read(node.right) : left;
        if (node.operator === "||") return left ? left : read(node.right);
        return left === null ? read(node.right) : left;
      }
      case "conditional":
        return read(node.test) ? read(node.consequent) : read(node.alternate);
      case "template": {
        let output = node.parts[0] ?? "";
        for (let index = 0; index < node.expressions.length; index++) {
          output += String(read(node.expressions[index])) +
            node.parts[index + 1];
        }
        return output;
      }
    }
  };
  return read(expression);
};
