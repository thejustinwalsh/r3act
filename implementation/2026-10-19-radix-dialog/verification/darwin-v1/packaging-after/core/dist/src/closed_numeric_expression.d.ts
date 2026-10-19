/** A finite, compiler-emitted expression over ordered numeric source sites. */
export type ClosedNumericExpression = Readonly<{
    kind: "input";
    index: number;
}> | Readonly<{
    kind: "literal";
    value: number | string | boolean | null;
}> | Readonly<{
    kind: "unary";
    operator: "+" | "-" | "!" | "~";
    argument: ClosedNumericExpression;
}> | Readonly<{
    kind: "binary";
    operator: "+" | "-" | "*" | "/" | "%" | "**" | "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "|" | "^" | "&";
    left: ClosedNumericExpression;
    right: ClosedNumericExpression;
}> | Readonly<{
    kind: "logical";
    operator: "&&" | "||" | "??";
    left: ClosedNumericExpression;
    right: ClosedNumericExpression;
}> | Readonly<{
    kind: "conditional";
    test: ClosedNumericExpression;
    consequent: ClosedNumericExpression;
    alternate: ClosedNumericExpression;
}> | Readonly<{
    kind: "template";
    parts: readonly string[];
    expressions: readonly ClosedNumericExpression[];
}>;
type Primitive = number | string | boolean | null;
/** Snapshot untrusted descriptor data; evaluation touches only these frozen copies. */
export declare const normalizeClosedNumericExpression: (input: unknown, inputCount: number) => ClosedNumericExpression | null;
/** Evaluate a normalized expression without invoking authored projectors. */
export declare const evaluateClosedNumericExpression: (expression: ClosedNumericExpression, inputs: readonly number[]) => Primitive;
export {};
//# sourceMappingURL=closed_numeric_expression.d.ts.map