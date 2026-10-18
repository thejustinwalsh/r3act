import { AsyncResource } from "./async_resource_runtime.js";
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
    get pending() {
        return [...this.#versions.keys()].filter((resource) => resource.status.status === "pending");
    }
    validate() {
        return !this.#closed &&
            [...this.#versions].every(([resource, version]) => resource.version === version);
    }
    discard() {
        this.#closed = true;
        this.#versions.clear();
    }
}
//# sourceMappingURL=resource_read_set.js.map