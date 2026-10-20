import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
export type ClosedHostPrimitive = string | number | boolean | null;
export type ClosedHostTag = "div" | "span" | "output" | "group" | "mesh";
export type ClosedHostValue = ClosedNumericExpression | Readonly<{
    kind: "tuple";
    items: readonly [ClosedNumericExpression, ClosedNumericExpression, ClosedNumericExpression];
}> | Readonly<{
    kind: "style";
    entries: readonly (readonly [string, ClosedNumericExpression])[];
}>;
export type ClosedHostOutputValue = ClosedHostPrimitive | readonly [number, number, number] | Readonly<Record<string, string | number | null>>;
export declare const closedDataRecord: (input: unknown) => Record<string, unknown> | null;
export declare const exactClosedFields: (value: Record<string, unknown>, keys: readonly string[]) => boolean;
export declare const closedDataArray: (input: unknown, limit?: number) => unknown[] | null;
export declare const isClosedHostPrimitive: (value: unknown) => value is ClosedHostPrimitive;
export declare const isClosedHostPropertyName: (tag: ClosedHostTag, name: string) => boolean;
/** Normalize one compiler-proven primitive or aggregate host prop from descriptor data. */
export declare const normalizeClosedHostValue: (input: unknown, tag: ClosedHostTag, name: string, inputCount: number, allowAggregates: boolean) => ClosedHostValue | null;
/** Evaluate into a fresh value owned by this candidate; undefined means unsupported output. */
export declare const evaluateClosedHostValue: (expression: ClosedHostValue, inputs: readonly number[]) => ClosedHostOutputValue | undefined;
/** Compiler-only: freeze a fresh, unescaped tuple literal proven by the compiler. This is not a purity proof for arbitrary arrays. */
export declare const stabilizeHostTuple: <const T extends readonly unknown[]>(value: T) => Readonly<T>;
//# sourceMappingURL=closed_host_value.d.ts.map