/** Copy one plain data record into immutable runtime-owned Store state. */
export declare function storeRecord<T extends object>(input: T): Readonly<T>;
/** Copy validated projection paths into a privately owned immutable plan. */
export declare function normalizeClosedProjectionPaths(raw: unknown): readonly (readonly string[])[] | null;
export declare function isOwnedClosedProjectionPaths(paths: unknown): paths is readonly (readonly string[])[];
/** Capture an owned path plan through records issued by storeRecord. */
export declare function captureOwnedClosedProjectionValues(state: unknown, paths: readonly (readonly string[])[]): readonly number[] | null;
/** Capture finite numeric paths through records issued by storeRecord. */
export declare function captureClosedProjectionValues(state: unknown, paths: readonly (readonly string[])[]): readonly number[] | null;
//# sourceMappingURL=owned_store_record.d.ts.map