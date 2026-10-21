/** One exact host object owns one synchronous publication domain. */
export class HostPublicationDomain {
    #brand = undefined;
    owner = null;
    failed = false;
    failure;
    waiters = new Set();
}
/** An opaque claim shared by every member of one publication group. */
export class HostPublicationClaim {
    #brand = undefined;
}
const domains = new WeakMap();
export const hostPublicationDomain = (host) => {
    let domain = domains.get(host);
    if (!domain) {
        domain = new HostPublicationDomain();
        domains.set(host, domain);
    }
    return domain;
};
export const createHostPublicationClaim = () => {
    return new HostPublicationClaim();
};
const uniqueDomains = (input) => [...new Set(input)];
/** Acquire an entire domain set before the first host write, without callbacks. */
export const tryClaimHostPublicationDomains = (input, claim, mode = "publish") => {
    const ordered = uniqueDomains(input);
    if (mode === "publish") {
        for (const domain of ordered) {
            if (domain.failed)
                throw domain.failure;
        }
    }
    if (ordered.some((domain) => domain.owner !== null && domain.owner !== claim)) {
        return "busy";
    }
    for (const domain of ordered)
        domain.owner = claim;
    return "claimed";
};
export const isHostPublicationDomainBusy = (domain, claim) => domain.owner !== null && domain.owner !== claim;
export const assertHostPublicationClaim = (domain, claim) => {
    if (domain.owner !== claim)
        throw new Error("Host publication claim is not held");
};
/** A partial writer failure poisons the affected domain until host replacement. */
export const quarantineHostPublicationDomains = (input, claim, error) => {
    for (const domain of uniqueDomains(input)) {
        assertHostPublicationClaim(domain, claim);
        if (!domain.failed) {
            domain.failed = true;
            domain.failure = error;
        }
    }
};
export const releaseHostPublicationDomains = (input, claim) => {
    const ordered = uniqueDomains(input);
    for (const domain of ordered)
        assertHostPublicationClaim(domain, claim);
    const wake = new Set();
    for (const domain of ordered) {
        domain.owner = null;
        for (const waiter of domain.waiters)
            wake.add(waiter);
    }
    for (const waiter of wake)
        queueMicrotask(waiter);
};
/** Notifications are always delivered after the holder leaves its stack. */
export const subscribeHostPublicationAvailability = (input, callback) => {
    const ordered = uniqueDomains(input);
    let active = true;
    const notify = () => {
        if (active)
            callback();
    };
    for (const domain of ordered)
        domain.waiters.add(notify);
    return () => {
        active = false;
        for (const domain of ordered)
            domain.waiters.delete(notify);
    };
};
//# sourceMappingURL=host_publication_domain.js.map