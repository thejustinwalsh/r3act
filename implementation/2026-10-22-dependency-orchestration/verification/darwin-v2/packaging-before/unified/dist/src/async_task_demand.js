import { AsyncResource } from "./async_resource_runtime.js";
const definitionKey = Symbol("async-task-demand-definition");
const validIdentity = (value) => (typeof value === "object" && value !== null) || typeof value === "function";
const validRevision = (value) => typeof value === "string" && value.length > 0;
const validateDefinition = (identity, codeRevision) => {
    if (!validIdentity(identity) || !validRevision(codeRevision))
        throw new TypeError("Invalid demand identity or code revision");
};
/** An explicit provider owns request startup and responds to its abort signal. */
export const defineProviderDemand = (identity, codeRevision, start) => {
    validateDefinition(identity, codeRevision);
    if (typeof start !== "function")
        throw new TypeError("Invalid demand provider");
    return Object.freeze({ [definitionKey]: true,
        kind: "provider", identity, codeRevision, start });
};
/** The author promises this derivation has no observable effects. */
export const definePureDerivedDemand = (identity, codeRevision, derive) => {
    validateDefinition(identity, codeRevision);
    if (typeof derive !== "function")
        throw new TypeError("Invalid pure derivation");
    return Object.freeze({ [definitionKey]: true,
        kind: "pure-derived", identity, codeRevision, derive });
};
const snapshotCaptures = (captures) => {
    if (!Array.isArray(captures))
        throw new TypeError("Invalid demand captures");
    const snapshot = [];
    for (let index = 0; index < captures.length; index++) {
        const capture = captures[index];
        if (!capture || typeof capture !== "object")
            throw new TypeError("Invalid demand capture");
        const { identity, version, value } = capture;
        if (!(typeof version === "string" && version.length > 0) &&
            !(typeof version === "number" && Number.isSafeInteger(version)))
            throw new TypeError("Invalid demand capture version");
        snapshot.push(Object.freeze({ identity, version, value }));
    }
    return Object.freeze(snapshot);
};
const isDemandDefinition = (value) => typeof value === "object" && value !== null &&
    value[definitionKey] === true;
const invoke = (definition, captures, signal) => definition.kind === "provider"
    ? definition.start(captures, signal) : definition.derive(captures);
/** Execute an explicit definition without sharing when a scope is full. */
export const runDemandUnshared = (definition, captures, signal) => {
    if (!isDemandDefinition(definition))
        return Promise.reject(new TypeError("Unowned demand definition"));
    if (signal.aborted)
        return Promise.reject(signal.reason);
    try {
        return Promise.resolve(invoke(definition, snapshotCaptures(captures), signal));
        as;
        Promise;
    }
    catch (error) {
        return Promise.reject(error);
    }
};
const matches = (entry, definition, captures) => {
    const prior = entry.definition;
    if (prior.identity !== definition.identity ||
        prior.codeRevision !== definition.codeRevision ||
        prior.kind !== definition.kind ||
        (prior.kind === "provider" && definition.kind === "provider" &&
            prior.start !== definition.start) ||
        (prior.kind === "pure-derived" && definition.kind === "pure-derived" &&
            prior.derive !== definition.derive) ||
        entry.captures.length !== captures.length)
        return false;
    for (let index = 0; index < captures.length; index++) {
        if (!Object.is(entry.captures[index].identity, captures[index].identity) ||
            !Object.is(entry.captures[index].version, captures[index].version))
            return false;
    }
    return true;
};
/** Caller-owned, bounded in-flight and leased-result sharing scope. */
export class AsyncTaskDemandScope {
    #entries = [];
    #maxEntries;
    #disposed = false;
    constructor(maxEntries = 1024) {
        if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 4096)
            throw new RangeError("Invalid demand scope capacity");
        this.#maxEntries = maxEntries;
    }
    get size() { return this.#entries.length; }
    acquire(definition, owner, captures) {
        if (this.#disposed)
            throw new Error("Demand scope disposed");
        if (!isDemandDefinition(definition) || !validIdentity(owner))
            throw new TypeError("Invalid demand definition or owner");
        const captured = snapshotCaptures(captures);
        let entry = this.#entries.find((candidate) => matches(candidate, definition, captured));
        if (!entry && this.#entries.length >= this.#maxEntries)
            return null;
        let created = false;
        if (!entry) {
            let resolve;
            let reject;
            const result = new Promise((yes, no) => { resolve = yes; reject = no; });
            void result.catch(() => { });
            entry = { definition: definition, captures: captured,
                controller: new AbortController(), resource: new AsyncResource(result),
                result, resolve, reject, leases: new Map(), active: true, settled: false };
            this.#entries.push(entry);
            created = true;
        }
        const existing = entry.leases.get(owner);
        if (existing)
            return existing;
        const held = entry;
        let released = false;
        const lease = Object.freeze({
            resource: held.resource,
            result: held.result,
            release: () => {
                if (released)
                    return;
                released = true;
                held.leases.delete(owner);
                if (held.leases.size === 0)
                    this.#evict(held);
            },
        });
        held.leases.set(owner, lease);
        if (created) {
            try {
                const started = invoke(definition, captured, held.controller.signal);
                Promise.resolve(started).then((value) => this.#settle(held, true, value), (reason) => this.#settle(held, false, reason));
            }
            catch (error) {
                this.#settle(held, false, error);
            }
        }
        return lease;
    }
    #settle(entry, fulfilled, value) {
        if (!entry.active || entry.settled)
            return;
        entry.settled = true;
        if (fulfilled)
            entry.resolve(value);
        else
            entry.reject(value);
    }
    #evict(entry) {
        if (!entry.active)
            return;
        entry.active = false;
        const index = this.#entries.indexOf(entry);
        if (index >= 0)
            this.#entries.splice(index, 1);
        if (!entry.settled) {
            const reason = new Error("Demand interest released");
            entry.controller.abort(reason);
            entry.reject(reason);
        }
        entry.leases.clear();
    }
    dispose() {
        if (this.#disposed)
            return;
        this.#disposed = true;
        for (const entry of [...this.#entries])
            this.#evict(entry);
    }
}
//# sourceMappingURL=async_task_demand.js.map