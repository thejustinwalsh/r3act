import { type RuntimeElement } from "./jsx_binding_runtime.ts";
type Primitive = string | number | boolean | null;
/** Immutable data program for one resource read and one keyed intrinsic host. */
export type ClosedResourceHostProgram = Readonly<{
    schemaVersion: 1;
    componentProgramId: string;
    moduleRevision: string;
    resourceUseSiteId: string;
    resourceProp: string;
    host: Readonly<{
        tag: "div";
        key: string;
        props: readonly (readonly [string, Primitive])[];
        child: "resource-value";
    }>;
}>;
/** Snapshot untrusted metadata; evaluation reads only this frozen copy. */
export declare const normalizeClosedResourceHostProgram: (input: unknown) => ClosedResourceHostProgram | null;
/** Construct a ready host leaf without invoking the authored component. */
export declare const evaluateClosedResourceHostProgram: (program: ClosedResourceHostProgram, readyValue: unknown) => RuntimeElement | null;
export {};
//# sourceMappingURL=closed_resource_host_program.d.ts.map