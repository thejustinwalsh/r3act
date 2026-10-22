import { type RuntimeElement } from "./jsx_binding_runtime.ts";
import { type ClosedHostPrimitive } from "./closed_host_value.ts";
import { type ClosedHostTreeNode } from "./closed_host_tree.ts";
type Primitive = ClosedHostPrimitive;
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
    host: ClosedHostTreeNode;
}>);
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export declare const normalizeClosedResourceHostProgram: (input: unknown) => ClosedResourceHostProgram | null;
/** Construct ready host output without invoking the authored component. */
export declare const evaluateClosedResourceHostProgram: (program: ClosedResourceHostProgram, readyValue: unknown) => RuntimeElement | null;
export {};
//# sourceMappingURL=closed_resource_host_program.d.ts.map