import { type ClosedStoreHostProgram } from "./closed_store_host_program.ts";
import type { ClosedNumericExpression } from "./closed_numeric_expression.ts";
export type ClosedScalarNumericKernel = (inputs: readonly number[], outputs: number[]) => void;
export type ClosedScalarKernelProof = Readonly<{
    kind: "verified";
    kernel: ClosedScalarNumericKernel;
    numericPropIndices: readonly number[];
}> | Readonly<{
    kind: "rejected";
    reason: string;
}>;
export declare const MAX_SOURCE = 32768;
export declare const MAX_TOKENS = 16384;
export declare const MAX_NODES = 8192;
export declare const MAX_LOCALS = 128;
export declare const MAX_DEPTH = 128;
export declare const MAX_SLOTS = 32;
export declare const isClosedNumericIdentifier: (name: string) => boolean;
export declare const isClosedNumericOperator: (operator: string) => boolean;
export declare const closedNumericPrecedence: (operator: string) => number;
export type Token = Readonly<{
    text: string;
    category: "id" | "number" | "string" | "punct";
}>;
export type Node = Readonly<{
    kind: "input" | "literal" | "unary" | "binary";
    value: number | string;
    left?: number;
    right?: number;
}>;
export declare class Decline extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function fail(code: string): never;
export declare const lex: (source: string) => Token[];
export declare class Graph {
    readonly nodes: Node[];
    readonly keys: Map<string, number>;
    add(kind: Node["kind"], value: number | string, left?: number, right?: number): number;
    literal(value: number): number;
}
export declare const hostNode: (expression: ClosedNumericExpression, graph: Graph, depth?: number) => number;
/** Verify complete source behavior against a privately normalized host program. */
export declare function proveClosedScalarNumericKernel(candidate: unknown, host: ClosedStoreHostProgram): ClosedScalarKernelProof;
//# sourceMappingURL=closed_scalar_kernel_proof.d.ts.map