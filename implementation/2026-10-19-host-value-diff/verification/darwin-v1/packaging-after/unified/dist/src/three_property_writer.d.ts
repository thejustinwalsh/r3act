/** Generic, lazily resolved property writers for Three-style host objects. */
import type { HostValuePolicy } from "./host_property_contract.ts";
import type { HostCopyValueCapture } from "./host_property_contract.ts";
export type ThreePropertyWriter = {
    /** Property spelling supplied by the caller (for example `position-x`). */
    readonly property: string;
    /** Apply a value while preserving Three object identity where supported. */
    write(value: unknown, invalidate?: ThreePropertyInvalidation): void;
    /** Restore the first value observed for the currently resolved target. */
    reset(invalidate?: ThreePropertyInvalidation): void;
};
/** Optional host-specific invalidation hook; this module does not guess methods. */
export type ThreePropertyInvalidation = (root: object, target: object, property: string, value: unknown) => void;
export type ThreePropertyWriterResolver = {
    resolve(root: object, property: string): ThreePropertyWriter;
    release(root: object): void;
};
/** Capture supported built-in Three copy inputs from own data fields. */
export declare const captureThreePropertyCopy: (root: object, property: string, value: unknown) => HostCopyValueCapture | null;
/** Describe the current generic write branch; later writes still re-resolve it. */
export declare const describeThreePropertyWrite: (root: object, property: string, value: unknown) => {
    target: object;
    valuePolicy: HostValuePolicy | "unknown";
};
/**
 * Resolve and cache a writer by raw host object and authored property name.
 * Nested paths are resolved on each write so replaced materials remain live;
 * defaults are weakly keyed by the actual resolved target.
 */
/** Create a cache scoped to one host/handle lifecycle. */
export declare const createThreePropertyWriterResolver: () => ThreePropertyWriterResolver;
/** Resolve through the module-level cache for standalone host integrations. */
export declare const resolveThreePropertyWriter: (root: object, property: string) => ThreePropertyWriter;
//# sourceMappingURL=three_property_writer.d.ts.map