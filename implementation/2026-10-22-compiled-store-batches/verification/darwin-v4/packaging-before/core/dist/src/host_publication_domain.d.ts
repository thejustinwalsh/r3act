/** One exact host object owns one synchronous publication domain. */
export declare class HostPublicationDomain {
    #private;
    owner: HostPublicationClaim | null;
    failed: boolean;
    failure: unknown;
    readonly waiters: Set<() => void>;
}
/** An opaque claim shared by every member of one publication group. */
export declare class HostPublicationClaim {
    #private;
}
export declare const hostPublicationDomain: (host: object) => HostPublicationDomain;
export declare const createHostPublicationClaim: () => HostPublicationClaim;
/** Acquire an entire domain set before the first host write, without callbacks. */
export declare const tryClaimHostPublicationDomains: (input: readonly HostPublicationDomain[], claim: HostPublicationClaim, mode?: "publish" | "teardown") => "claimed" | "busy";
export declare const isHostPublicationDomainBusy: (domain: HostPublicationDomain, claim?: HostPublicationClaim) => boolean;
export declare const assertHostPublicationClaim: (domain: HostPublicationDomain, claim: HostPublicationClaim) => void;
/** A partial writer failure poisons the affected domain until host replacement. */
export declare const quarantineHostPublicationDomains: (input: readonly HostPublicationDomain[], claim: HostPublicationClaim, error: unknown) => void;
export declare const releaseHostPublicationDomains: (input: readonly HostPublicationDomain[], claim: HostPublicationClaim) => void;
/** Notifications are always delivered after the holder leaves its stack. */
export declare const subscribeHostPublicationAvailability: (input: readonly HostPublicationDomain[], callback: () => void) => (() => void);
//# sourceMappingURL=host_publication_domain.d.ts.map