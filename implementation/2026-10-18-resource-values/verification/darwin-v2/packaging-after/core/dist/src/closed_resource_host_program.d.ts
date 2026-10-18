import { type ClosedNumericExpression } from "./closed_numeric_expression.ts";
import { type RuntimeElement } from "./jsx_binding_runtime.ts";
type Primitive = string | number | boolean | null;
type ResourceHostTag = "div" | "span" | "output" | "group" | "mesh";
type ResourceHostValue = ClosedNumericExpression | Readonly<{
    kind: "tuple";
    items: readonly [ClosedNumericExpression, ClosedNumericExpression, ClosedNumericExpression];
}> | Readonly<{
    kind: "style";
    entries: readonly (readonly [string, ClosedNumericExpression])[];
}>;
type ResourceHostChild = Readonly<{
    kind: "host";
    host: ResourceHostNode;
}> | Readonly<{
    kind: "text";
    expression: ClosedNumericExpression;
}>;
type ResourceHostNode = Readonly<{
    tag: ResourceHostTag;
    key: string;
    props: readonly (readonly [string, ResourceHostValue])[];
    children: readonly ResourceHostChild[];
}>;
type ProgramBase = Readonly<{
    componentProgramId: string;
    moduleRevision: string;
    resourceUseSiteId: string;
    resourceProp: string;
}>;
/** Immutable data program for one canonical resource read and a keyed intrinsic host. */
export type ClosedResourceHostProgram = (ProgramBase & Readonly<{
    schemaVersion: 1;
    host: Readonly<{
        tag: "div";
        key: string;
        props: readonly (readonly [string, Primitive])[];
        child: "resource-value";
    }>;
}>) | (ProgramBase & Readonly<{
    schemaVersion: 2 | 3;
    host: ResourceHostNode;
}>);
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export declare const normalizeClosedResourceHostProgram: (input: unknown) => ClosedResourceHostProgram | null;
/** Construct ready host output without invoking the authored component. */
export declare const evaluateClosedResourceHostProgram: (program: ClosedResourceHostProgram, readyValue: unknown) => RuntimeElement | null;
export {};
//# sourceMappingURL=closed_resource_host_program.d.ts.map