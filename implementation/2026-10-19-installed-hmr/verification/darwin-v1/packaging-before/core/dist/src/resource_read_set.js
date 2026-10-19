import { AsyncResource, } from "./async_resource_runtime.js";
const resourcePrototype = AsyncResource.prototype;
const canonicalRead = resourcePrototype.read;
const canonicalStatus = Object.getOwnPropertyDescriptor(resourcePrototype, "status").get;
const canonicalVersion = Object.getOwnPropertyDescriptor(resourcePrototype, "version").get;
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
        if (!this.#versions.has(resource)) {
            this.#versions.set(resource, resource.version);
        }
        // Record pending/rejected reads too: a boundary decides whether to retry,
        // preserve prior content or reveal an error; the read set never hides them.
        return resource.read();
    }
    /** Capture a fulfilled canonical resource without calling its public methods. */
    readClosed(resource) {
        if (this.#closed)
            throw new Error("Resource read set is closed");
        const status = closedResourceStatus(resource);
        if (status?.status !== "fulfilled")
            return null;
        const previous = this.#versions.get(resource);
        if (previous !== undefined &&
            (typeof previous === "number" ? previous : previous.version) !== status.version)
            return null;
        if (previous === undefined)
            this.#versions.set(resource, { version: status.version, closed: true });
        return status;
    }
    get pending() {
        return [...this.#versions].filter(([resource, captured]) => typeof captured === "number" && resource.status.status === "pending").map(([resource]) => resource);
    }
    validate() {
        return !this.#closed &&
            [...this.#versions].every(([resource, captured]) => typeof captured === "number" ? resource.version === captured
                : closedResourceStatus(resource)?.version === captured.version);
    }
    discard() {
        this.#closed = true;
        this.#versions.clear();
    }
}
//# sourceMappingURL=resource_read_set.js.map