import { AsyncResource, captureCanonicalResourceReads, } from "./async_resource_runtime.js";
const resourcePrototype = AsyncResource.prototype;
const canonicalRead = resourcePrototype.read;
const canonicalStatus = Object.getOwnPropertyDescriptor(resourcePrototype, "status").get;
const canonicalVersion = Object.getOwnPropertyDescriptor(resourcePrototype, "version").get;
/** @internal Read the provider's private version without an authored getter. */
export const canonicalResourceVersion = (resource) => {
    if (typeof resource !== "object" || resource === null)
        return null;
    try {
        return canonicalVersion.call(resource);
    }
    catch {
        return null;
    }
};
/** Inspect only the canonical resource implementation, without authored getters. */
export const closedResourceStatus = (resource) => {
    if (typeof resource !== "object" || resource === null)
        return null;
    try {
        const status = canonicalStatus.call(resource);
        if (Object.getPrototypeOf(resource) !== resourcePrototype ||
            Object.hasOwn(resource, "read") || Object.hasOwn(resource, "status") ||
            Object.hasOwn(resource, "version") ||
            Object.getOwnPropertyDescriptor(resourcePrototype, "read")?.value !== canonicalRead ||
            Object.getOwnPropertyDescriptor(resourcePrototype, "status")?.get !== canonicalStatus ||
            Object.getOwnPropertyDescriptor(resourcePrototype, "version")?.get !== canonicalVersion)
            return null;
        return status;
    }
    catch {
        return null;
    }
};
/** Candidate-local async reads; no subscriptions or provider cancellation. */
export class ResourceReadSet {
    table;
    // Result types are existential here; this registry reads only identity/status.
    #versions = new Map();
    #closed = false;
    constructor(table) {
        this.table = table;
    }
    read(source) {
        if (this.#closed)
            throw new Error("Resource read set is closed");
        const resource = source instanceof AsyncResource
            ? source
            : this.table.from(source);
        let capturedCanonical = null;
        if (!this.#versions.has(resource)) {
            const observedVersion = resource.version;
            try {
                capturedCanonical = canonicalVersion.call(resource);
            }
            catch { /* opaque source */ }
            this.#versions.set(resource, {
                observedVersion, canonicalVersion: null, closed: false,
            });
        }
        // Record pending/rejected reads too: a boundary decides whether to retry,
        // preserve prior content or reveal an error; the read set never hides them.
        let observedCanonical = false;
        try {
            return captureCanonicalResourceReads(() => resource.read(), (actual, version) => {
                observedCanonical = true;
                const previous = this.#versions.get(actual);
                if (previous === undefined) {
                    this.#versions.set(actual, {
                        observedVersion: version, canonicalVersion: version, closed: false,
                    });
                }
                else if (previous.observedVersion === version) {
                    previous.canonicalVersion = version;
                }
            });
        }
        finally {
            if (observedCanonical && capturedCanonical !== null) {
                const captured = this.#versions.get(resource);
                if (captured)
                    captured.canonicalVersion = capturedCanonical;
            }
            else if (observedCanonical) {
                const captured = this.#versions.get(resource);
                if (captured)
                    captured.hasCanonicalReads = true;
            }
        }
    }
    /** Capture a fulfilled canonical resource without calling its public methods. */
    readClosed(resource) {
        if (this.#closed)
            throw new Error("Resource read set is closed");
        const status = closedResourceStatus(resource);
        if (status?.status !== "fulfilled")
            return null;
        const previous = this.#versions.get(resource);
        if (previous !== undefined && previous.observedVersion !== status.version)
            return null;
        if (previous === undefined) {
            this.#versions.set(resource, {
                observedVersion: status.version, canonicalVersion: status.version, closed: true,
            });
        }
        return status;
    }
    get pending() {
        return [...this.#versions].filter(([resource, captured]) => !captured.closed && resource.status.status === "pending").map(([resource]) => resource);
    }
    validate() {
        return !this.#closed &&
            [...this.#versions].every(([resource, captured]) => !captured.closed ? resource.version === captured.observedVersion
                : closedResourceStatus(resource)?.version === captured.observedVersion);
    }
    validateCanonical() {
        if (this.#closed)
            return false;
        for (const [resource, captured] of this.#versions) {
            if (captured.canonicalVersion === null)
                continue;
            try {
                if (canonicalVersion.call(resource) !== captured.canonicalVersion)
                    return false;
            }
            catch {
                return false;
            }
        }
        return true;
    }
    validatePreparedCanonical() {
        return this.preparedCanonicalStatus() === "current";
    }
    preparedCanonicalStatus() {
        if (this.#closed)
            return "stale";
        for (const [resource, captured] of this.#versions) {
            if (captured.canonicalVersion === null) {
                // Opaque wrappers remain publicly validated; actual forwarded reads give
                // a canonical dependency cut, not proof about hidden wrapper reads.
                if (captured.hasCanonicalReads)
                    continue;
                return "unsupported";
            }
            try {
                if (canonicalVersion.call(resource) !== captured.canonicalVersion)
                    return "stale";
            }
            catch {
                return "stale";
            }
        }
        return "current";
    }
    discard() {
        this.#closed = true;
        this.#versions.clear();
    }
}
//# sourceMappingURL=resource_read_set.js.map