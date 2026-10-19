import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
import { type RuntimeElement } from "./jsx_binding_runtime.ts";
import { type ClosedHostTag, type ClosedHostValue } from "./closed_host_value.ts";
export type ClosedHostTreeChild = Readonly<{
    kind: "host";
    host: ClosedHostTreeNode;
}> | Readonly<{
    kind: "text";
    expression: ClosedNumericExpression;
}>;
export type ClosedHostTreeNode = Readonly<{
    tag: ClosedHostTag;
    key: string;
    props: readonly (readonly [string, ClosedHostValue])[];
    children: readonly ClosedHostTreeChild[];
}>;
/** Copy a finite host tree from untrusted descriptor data into frozen compiler metadata. */
export declare const normalizeClosedHostTree: (input: unknown, inputCount: number, allowAggregates: boolean, maximumInputs?: number) => ClosedHostTreeNode | null;
/** Build candidate-owned JSX values from a frozen host tree. */
export declare const evaluateClosedHostTree: (host: ClosedHostTreeNode, inputs: readonly number[], requireTextNode?: boolean) => RuntimeElement | null;
//# sourceMappingURL=closed_host_tree.d.ts.map