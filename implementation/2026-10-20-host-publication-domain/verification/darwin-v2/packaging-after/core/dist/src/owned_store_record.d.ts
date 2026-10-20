/** Copy one plain data record into immutable runtime-owned Store state. */
export declare function storeRecord<T extends object>(input: T): Readonly<T>;
/** Capture finite numeric paths through records issued by storeRecord. */
export declare function captureClosedProjectionValues(state: unknown, paths: readonly (readonly string[])[]): readonly number[] | null;
//# sourceMappingURL=owned_store_record.d.ts.map