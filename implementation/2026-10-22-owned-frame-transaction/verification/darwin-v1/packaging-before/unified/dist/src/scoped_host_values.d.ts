export declare const isSafeClosedStyleName: (name: string) => boolean;
export type ScopedHostPropSnapshot = {
    readonly accepted: true;
    readonly value: unknown;
} | {
    readonly accepted: false;
};
/** Capture a supported host prop without retaining caller-owned structured values. */
export declare const snapshotScopedHostProp: (tag: string, name: string, value: unknown) => ScopedHostPropSnapshot;
//# sourceMappingURL=scoped_host_values.d.ts.map