import { type ClosedHostTreeNode } from "./closed_host_tree.ts";
import { type RuntimeElement } from "./jsx_binding_runtime.ts";
export type ClosedCollectionRowProgram = Readonly<{
    schemaVersion: 1;
    collectionSiteId: string;
    componentProgramId: string;
    rowComponentProgramId: string;
    moduleRevision: string;
    rowComponent: Function;
    rowProp: "row";
    inputs: readonly Readonly<{
        path: readonly string[];
    }>[];
    host: ClosedHostTreeNode;
}>;
/** Snapshot a compiler row template without retaining mutable metadata objects. */
export declare const normalizeClosedCollectionRowProgram: (raw: unknown) => ClosedCollectionRowProgram | null;
/** Admit only creator-owned immutable row records with finite numeric paths. */
export declare const captureClosedCollectionRowInputs: (program: ClosedCollectionRowProgram, row: unknown) => readonly number[] | null;
/** Build an unkeyed intrinsic root; the existing owner scope assigns its key. */
export declare const evaluateClosedCollectionRowProgram: (program: ClosedCollectionRowProgram, inputs: readonly number[]) => RuntimeElement | null;
//# sourceMappingURL=closed_collection_row_program.d.ts.map