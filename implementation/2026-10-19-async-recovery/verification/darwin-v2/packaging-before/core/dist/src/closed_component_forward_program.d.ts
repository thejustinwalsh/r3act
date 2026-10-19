export type ClosedComponentForwardExpression = Readonly<{
    kind: "prop";
    name: string;
}> | Readonly<{
    kind: "literal";
    value: string | number | boolean | null;
}>;
/** Compiler-proven forwarding edge between two module-local component sites. */
export type ClosedComponentForwardProgram = Readonly<{
    schemaVersion: 1;
    componentProgramId: string;
    moduleRevision: string;
    childComponentProgramId: string;
    childComponent: Function;
    key: string | null;
    props: readonly (readonly [string, ClosedComponentForwardExpression])[];
}>;
/** Snapshot untrusted compiler metadata without invoking either component. */
export declare const normalizeClosedComponentForwardProgram: (input: unknown) => ClosedComponentForwardProgram | null;
//# sourceMappingURL=closed_component_forward_program.d.ts.map