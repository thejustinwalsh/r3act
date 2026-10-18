/**
 * A small host-independent wrapper around promise-like values.
 *
 * Resources observe an already-created thenable; they do not start fetches,
 * cancel providers, or retain work after the resource itself is unreachable.
 */
const pendingTokenBrand = Symbol("native.resource.pending");
const rejectionBrand = Symbol("native.resource.rejection");
export class ResourceRejection extends Error {
    resource;
    reason;
    [rejectionBrand] = true;
    kind = "resource-rejection";
    constructor(resource, reason) {
        super("An async resource was rejected");
        this.resource = resource;
        this.reason = reason;
        this.name = "ResourceRejection";
    }
}
function reportResourceListenerError(error) {
    // Do not throw from a Promise callback: that would create an ignored rejected
    // promise and can prevent other resource subscribers from being notified.
    console.error("AsyncResource subscriber failed", error);
}
/**
 * A stable record for one PromiseLike. `read()` returns its value, or throws a
 * recognizable pending token/rejection. Settlement is one-shot even for
 * synchronous or hostile thenables.
 */
export class AsyncResource {
    reportListenerError;
    #status = Object.freeze({
        status: "pending",
        version: 0,
    });
    #pendingToken;
    #listeners = new Set();
    constructor(thenable, reportListenerError = reportResourceListenerError, 
    /** Internal hook used by tables to publish identity before then runs. */
    beforeObserve) {
        this.reportListenerError = reportListenerError;
        this.#pendingToken = Object.freeze({
            [pendingTokenBrand]: true,
            kind: "pending-resource",
            resource: this,
            version: 0,
        });
        beforeObserve?.(this);
        this.#observe(thenable);
    }
    get status() {
        return this.#status;
    }
    get version() {
        return this.#status.version;
    }
    read() {
        const status = this.#status;
        if (status.status === "fulfilled")
            return status.value;
        if (status.status === "rejected")
            throw status.rejection;
        throw this.#pendingToken;
    }
    /** Subscribe to the single pending-to-settled transition. */
    subscribe(listener) {
        if (this.#status.status !== "pending")
            return () => { };
        this.#listeners.add(listener);
        let active = true;
        return () => {
            if (!active)
                return;
            active = false;
            this.#listeners.delete(listener);
        };
    }
    #observe(thenable) {
        this.#adopt(thenable, new Set(), true);
    }
    #adopt(value, seen, requireThenable = false) {
        // Synchronous thenables can form arbitrarily long chains. Drain them in a
        // loop rather than recursively calling #adopt from each resolve callback.
        for (;;) {
            if ((typeof value !== "object" || value === null) &&
                typeof value !== "function") {
                if (requireThenable) {
                    this.#reject(new TypeError("AsyncResource requires a thenable"));
                }
                else {
                    this.#fulfill(value);
                }
                return;
            }
            const objectValue = value;
            if (seen.has(objectValue)) {
                this.#reject(new TypeError("Thenable resolution cycle"));
                return;
            }
            let then;
            try {
                then = value.then;
            }
            catch (error) {
                this.#reject(error);
                return;
            }
            if (typeof then !== "function") {
                if (requireThenable) {
                    this.#reject(new TypeError("AsyncResource requires a thenable"));
                }
                else {
                    this.#fulfill(value);
                }
                return;
            }
            seen.add(objectValue);
            let called = false;
            let invoking = true;
            let nextValue;
            let resolvedSynchronously = false;
            let rejectedSynchronously = false;
            let rejectionReason;
            const resolve = (next) => {
                if (called)
                    return;
                called = true;
                if (invoking) {
                    nextValue = next;
                    resolvedSynchronously = true;
                }
                else {
                    this.#adopt(next, seen);
                }
            };
            const reject = (reason) => {
                if (called)
                    return;
                called = true;
                if (invoking) {
                    rejectionReason = reason;
                    rejectedSynchronously = true;
                }
                else {
                    this.#reject(reason);
                }
            };
            try {
                // Preserve the thenable as `this`, as Promise assimilation requires.
                then.call(objectValue, resolve, reject);
            }
            catch (error) {
                // A throw after either callback is ignored by the first-call rule.
                if (!called) {
                    called = true;
                    rejectionReason = error;
                    rejectedSynchronously = true;
                }
            }
            invoking = false;
            if (rejectedSynchronously) {
                this.#reject(rejectionReason);
                return;
            }
            if (!resolvedSynchronously)
                return;
            value = nextValue;
            requireThenable = false;
        }
    }
    #fulfill(value) {
        if (this.#status.status !== "pending")
            return;
        this.#status = Object.freeze({ status: "fulfilled", version: 1, value });
        this.#notify();
    }
    #reject(reason) {
        if (this.#status.status !== "pending")
            return;
        const rejection = new ResourceRejection(this, reason);
        this.#status = Object.freeze({
            status: "rejected",
            version: 1,
            reason,
            rejection,
        });
        this.#notify();
    }
    #notify() {
        const status = this.#status;
        const listeners = [...this.#listeners];
        // Clear before callbacks: settlement is final and subscriptions no longer
        // need to keep consumers alive, even if a callback throws or unsubscribes.
        this.#listeners.clear();
        for (const listener of listeners) {
            try {
                listener(this, status);
            }
            catch (error) {
                try {
                    this.reportListenerError(error);
                }
                catch {
                    // Error reporting must not block delivery to the remaining listeners.
                }
            }
        }
    }
}
/** True for the structured token thrown by a pending resource's read(). */
export function isPendingResourceToken(value) {
    return typeof value === "object" && value !== null &&
        value[pendingTokenBrand] === true;
}
/** True for the structured rejection thrown by a rejected resource's read(). */
export function isResourceRejection(value) {
    return value instanceof ResourceRejection && value[rejectionBrand] === true;
}
/**
 * A caller-owned identity table. The WeakMap deduplicates object/function
 * thenables without keeping keys alive; each table has independent identity.
 */
export class AsyncResourceTable {
    reportListenerError;
    // `any` is intentional here: the opaque thenable identity is the cache key,
    // while each caller supplies the corresponding result type at `from()`.
    #resources = new WeakMap();
    constructor(reportListenerError = reportResourceListenerError) {
        this.reportListenerError = reportListenerError;
    }
    /** Return an observed thenable's resource without starting observation. */
    lookup(thenable) {
        return this.#resources.get(thenable);
    }
    from(thenable) {
        if ((typeof thenable !== "object" || thenable === null) &&
            typeof thenable !== "function") {
            throw new TypeError("AsyncResourceTable requires an object thenable");
        }
        const key = thenable;
        let resource = this.#resources.get(key);
        if (!resource) {
            resource = new AsyncResource(thenable, this.reportListenerError, (created) => this.#resources.set(key, created));
        }
        return resource;
    }
}
//# sourceMappingURL=async_resource_runtime.js.map