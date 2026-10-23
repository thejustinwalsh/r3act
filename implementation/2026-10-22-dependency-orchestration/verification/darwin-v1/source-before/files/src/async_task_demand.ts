import { AsyncResource } from "./async_resource_runtime.ts";

const definitionKey: unique symbol = Symbol("async-task-demand-definition");

export type DemandCapture = Readonly<{
  /** Identity and version must cover every value dependency of the work. */
  identity: unknown;
  version: string | number;
  value: unknown;
}>;

type DemandBase = Readonly<{
  identity: object;
  codeRevision: string;
  readonly [definitionKey]: true;
}>;

export type DemandDefinition<T = unknown> = DemandBase & (
  Readonly<{ kind: "provider";
    start: (captures: readonly DemandCapture[], signal: AbortSignal) => PromiseLike<T> }> |
  Readonly<{ kind: "pure-derived";
    derive: (captures: readonly DemandCapture[]) => T | PromiseLike<T> }>
);

export type DemandLease<T> = Readonly<{
  resource: AsyncResource<Awaited<T>>;
  result: Promise<Awaited<T>>;
  release(): void;
}>;

const validIdentity = (value: unknown): value is object =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const validRevision = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const validateDefinition = (identity: object, codeRevision: string): void => {
  if (!validIdentity(identity) || !validRevision(codeRevision))
    throw new TypeError("Invalid demand identity or code revision");
};

/** An explicit provider owns request startup and responds to its abort signal. */
export const defineProviderDemand = <T>(identity: object, codeRevision: string,
  start: (captures: readonly DemandCapture[], signal: AbortSignal) => PromiseLike<T>,
): DemandDefinition<T> => {
  validateDefinition(identity, codeRevision);
  if (typeof start !== "function") throw new TypeError("Invalid demand provider");
  return Object.freeze({ [definitionKey]: true as const,
    kind: "provider" as const, identity, codeRevision, start });
};

/** The author promises this derivation has no observable effects. */
export const definePureDerivedDemand = <T>(identity: object, codeRevision: string,
  derive: (captures: readonly DemandCapture[]) => T | PromiseLike<T>,
): DemandDefinition<T> => {
  validateDefinition(identity, codeRevision);
  if (typeof derive !== "function") throw new TypeError("Invalid pure derivation");
  return Object.freeze({ [definitionKey]: true as const,
    kind: "pure-derived" as const, identity, codeRevision, derive });
};

const snapshotCaptures = (captures: readonly DemandCapture[]): readonly DemandCapture[] => {
  if (!Array.isArray(captures))
    throw new TypeError("Invalid demand captures");
  const snapshot: DemandCapture[] = [];
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

const isDemandDefinition = (value: unknown): value is DemandDefinition =>
  typeof value === "object" && value !== null &&
  (value as DemandDefinition)[definitionKey] === true;

const invoke = <T>(definition: DemandDefinition<T>,
  captures: readonly DemandCapture[], signal: AbortSignal): T | PromiseLike<T> =>
  definition.kind === "provider"
    ? definition.start(captures, signal) : definition.derive(captures);

/** Execute an explicit definition without sharing when a scope is full. */
export const runDemandUnshared = <T>(definition: DemandDefinition<T>,
  captures: readonly DemandCapture[], signal: AbortSignal): Promise<Awaited<T>> => {
  if (!isDemandDefinition(definition))
    return Promise.reject(new TypeError("Unowned demand definition"));
  if (signal.aborted) return Promise.reject(signal.reason);
  try {
    return Promise.resolve(invoke(definition, snapshotCaptures(captures), signal))
      as Promise<Awaited<T>>;
  } catch (error) { return Promise.reject(error); }
};

type Entry = {
  definition: DemandDefinition;
  captures: readonly DemandCapture[];
  controller: AbortController;
  resource: AsyncResource<unknown>;
  result: Promise<unknown>;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
  leases: Map<object, DemandLease<unknown>>;
  active: boolean;
  settled: boolean;
};

const matches = (entry: Entry, definition: DemandDefinition,
  captures: readonly DemandCapture[]): boolean => {
  const prior = entry.definition;
  if (prior.identity !== definition.identity ||
    prior.codeRevision !== definition.codeRevision ||
    prior.kind !== definition.kind ||
    (prior.kind === "provider" && definition.kind === "provider" &&
      prior.start !== definition.start) ||
    (prior.kind === "pure-derived" && definition.kind === "pure-derived" &&
      prior.derive !== definition.derive) ||
    entry.captures.length !== captures.length) return false;
  for (let index = 0; index < captures.length; index++) {
    if (!Object.is(entry.captures[index].identity, captures[index].identity) ||
      !Object.is(entry.captures[index].version, captures[index].version)) return false;
  }
  return true;
};

/** Caller-owned, bounded in-flight and leased-result sharing scope. */
export class AsyncTaskDemandScope {
  readonly #entries: Entry[] = [];
  readonly #maxEntries: number;
  #disposed = false;

  constructor(maxEntries = 1024) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 4096)
      throw new RangeError("Invalid demand scope capacity");
    this.#maxEntries = maxEntries;
  }

  get size(): number { return this.#entries.length; }

  acquire<T>(definition: DemandDefinition<T>, owner: object,
    captures: readonly DemandCapture[]): DemandLease<T> | null {
    if (this.#disposed) throw new Error("Demand scope disposed");
    if (!isDemandDefinition(definition) || !validIdentity(owner))
      throw new TypeError("Invalid demand definition or owner");
    const captured = snapshotCaptures(captures);
    let entry = this.#entries.find((candidate) => matches(candidate, definition, captured));
    if (!entry && this.#entries.length >= this.#maxEntries) return null;
    let created = false;
    if (!entry) {
      let resolve!: (value: unknown) => void;
      let reject!: (reason: unknown) => void;
      const result = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; });
      void result.catch(() => {});
      entry = { definition: definition as DemandDefinition, captures: captured,
        controller: new AbortController(), resource: new AsyncResource(result),
        result, resolve, reject, leases: new Map(), active: true, settled: false };
      this.#entries.push(entry);
      created = true;
    }
    const existing = entry.leases.get(owner);
    if (existing) return existing as DemandLease<T>;
    const held = entry;
    let released = false;
    const lease: DemandLease<T> = Object.freeze({
      resource: held.resource as AsyncResource<Awaited<T>>,
      result: held.result as Promise<Awaited<T>>,
      release: () => {
        if (released) return;
        released = true;
        held.leases.delete(owner);
        if (held.leases.size === 0) this.#evict(held);
      },
    });
    held.leases.set(owner, lease as DemandLease<unknown>);
    if (created) {
      try {
        const started = invoke(definition, captured, held.controller.signal);
        Promise.resolve(started).then(
          (value) => this.#settle(held, true, value),
          (reason) => this.#settle(held, false, reason),
        );
      } catch (error) { this.#settle(held, false, error); }
    }
    return lease;
  }

  #settle(entry: Entry, fulfilled: boolean, value: unknown): void {
    if (!entry.active || entry.settled) return;
    entry.settled = true;
    if (fulfilled) entry.resolve(value);
    else entry.reject(value);
  }

  #evict(entry: Entry): void {
    if (!entry.active) return;
    entry.active = false;
    const index = this.#entries.indexOf(entry);
    if (index >= 0) this.#entries.splice(index, 1);
    if (!entry.settled) {
      const reason = new Error("Demand interest released");
      entry.controller.abort(reason);
      entry.reject(reason);
    }
    entry.leases.clear();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const entry of [...this.#entries]) this.#evict(entry);
  }
}
