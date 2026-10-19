/**
 * A small host-independent wrapper around promise-like values.
 *
 * Resources observe an already-created thenable; they do not start fetches,
 * cancel providers, or retain work after the resource itself is unreachable.
 */

const pendingTokenBrand: unique symbol = Symbol("native.resource.pending");
const rejectionBrand: unique symbol = Symbol("native.resource.rejection");

export type PendingResourceToken<T = unknown> = Readonly<{
  readonly [pendingTokenBrand]: true;
  readonly kind: "pending-resource";
  readonly resource: AsyncResource<T>;
  readonly version: 0;
}>;

export class ResourceRejection<T = unknown> extends Error {
  readonly [rejectionBrand] = true;
  readonly kind = "resource-rejection" as const;

  constructor(
    readonly resource: AsyncResource<T>,
    readonly reason: unknown,
  ) {
    super("An async resource was rejected");
    this.name = "ResourceRejection";
  }
}

export type PendingResourceStatus = Readonly<{
  status: "pending";
  /** Each resource starts at version zero and advances once on settlement. */
  version: 0;
}>;

export type FulfilledResourceStatus<T> = Readonly<{
  status: "fulfilled";
  version: 1;
  value: Awaited<T>;
}>;

export type RejectedResourceStatus<T> = Readonly<{
  status: "rejected";
  version: 1;
  reason: unknown;
  rejection: ResourceRejection<T>;
}>;

export type AsyncResourceStatus<T> =
  | PendingResourceStatus
  | FulfilledResourceStatus<T>
  | RejectedResourceStatus<T>;

export type ResourceListener<T> = (
  resource: AsyncResource<T>,
  status: AsyncResourceStatus<T>,
) => void;

export type ResourceErrorReporter = (error: unknown) => void;

function reportResourceListenerError(error: unknown): void {
  // Do not throw from a Promise callback: that would create an ignored rejected
  // promise and can prevent other resource subscribers from being notified.
  console.error("AsyncResource subscriber failed", error);
}

/**
 * A stable record for one PromiseLike. `read()` returns its value, or throws a
 * recognizable pending token/rejection. Settlement is one-shot even for
 * synchronous or hostile thenables.
 */
export class AsyncResource<T> {
  #status: AsyncResourceStatus<T> = Object.freeze({
    status: "pending",
    version: 0,
  });
  #pendingToken: PendingResourceToken<T>;
  #listeners = new Set<ResourceListener<T>>();

  constructor(
    thenable: PromiseLike<T>,
    private readonly reportListenerError: ResourceErrorReporter =
      reportResourceListenerError,
    /** Internal hook used by tables to publish identity before then runs. */
    beforeObserve?: (resource: AsyncResource<T>) => void,
  ) {
    this.#pendingToken = Object.freeze({
      [pendingTokenBrand]: true as const,
      kind: "pending-resource" as const,
      resource: this,
      version: 0 as const,
    });
    beforeObserve?.(this);
    this.#observe(thenable);
  }

  get status(): AsyncResourceStatus<T> {
    return this.#status;
  }

  get version(): 0 | 1 {
    return this.#status.version;
  }

  read(): Awaited<T> {
    const status = this.#status;
    if (status.status === "fulfilled") return status.value;
    if (status.status === "rejected") throw status.rejection;
    throw this.#pendingToken;
  }

  /** Subscribe to the single pending-to-settled transition. */
  subscribe(listener: ResourceListener<T>): () => void {
    if (this.#status.status !== "pending") return () => {};
    this.#listeners.add(listener);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#listeners.delete(listener);
    };
  }

  #observe(thenable: PromiseLike<T>): void {
    this.#adopt(thenable, new Set<object>(), true);
  }

  #adopt(value: unknown, seen: Set<object>, requireThenable = false): void {
    // Synchronous thenables can form arbitrarily long chains. Drain them in a
    // loop rather than recursively calling #adopt from each resolve callback.
    for (;;) {
      if (
        (typeof value !== "object" || value === null) &&
        typeof value !== "function"
      ) {
        if (requireThenable) {
          this.#reject(new TypeError("AsyncResource requires a thenable"));
        } else {
          this.#fulfill(value as Awaited<T>);
        }
        return;
      }
      const objectValue = value as object;
      if (seen.has(objectValue)) {
        this.#reject(new TypeError("Thenable resolution cycle"));
        return;
      }

      let then: unknown;
      try {
        then = (value as { then?: unknown }).then;
      } catch (error) {
        this.#reject(error);
        return;
      }

      if (typeof then !== "function") {
        if (requireThenable) {
          this.#reject(new TypeError("AsyncResource requires a thenable"));
        } else {
          this.#fulfill(value as Awaited<T>);
        }
        return;
      }

      seen.add(objectValue);
      let called = false;
      let invoking = true;
      let nextValue: unknown;
      let resolvedSynchronously = false;
      let rejectedSynchronously = false;
      let rejectionReason: unknown;
      const resolve = (next: unknown) => {
        if (called) return;
        called = true;
        if (invoking) {
          nextValue = next;
          resolvedSynchronously = true;
        } else {
          this.#adopt(next, seen);
        }
      };
      const reject = (reason: unknown) => {
        if (called) return;
        called = true;
        if (invoking) {
          rejectionReason = reason;
          rejectedSynchronously = true;
        } else {
          this.#reject(reason);
        }
      };

      try {
        // Preserve the thenable as `this`, as Promise assimilation requires.
        (then as (
          this: object,
          onFulfilled: (value: unknown) => void,
          onRejected: (reason: unknown) => void,
        ) => unknown).call(objectValue, resolve, reject);
      } catch (error) {
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
      if (!resolvedSynchronously) return;
      value = nextValue;
      requireThenable = false;
    }
  }

  #fulfill(value: Awaited<T>): void {
    if (this.#status.status !== "pending") return;
    this.#status = Object.freeze({ status: "fulfilled", version: 1, value });
    this.#notify();
  }

  #reject(reason: unknown): void {
    if (this.#status.status !== "pending") return;
    const rejection = new ResourceRejection(this, reason);
    this.#status = Object.freeze({
      status: "rejected",
      version: 1,
      reason,
      rejection,
    });
    this.#notify();
  }

  #notify(): void {
    const status = this.#status;
    const listeners = [...this.#listeners];
    // Clear before callbacks: settlement is final and subscriptions no longer
    // need to keep consumers alive, even if a callback throws or unsubscribes.
    this.#listeners.clear();
    for (const listener of listeners) {
      try {
        listener(this, status);
      } catch (error) {
        try {
          this.reportListenerError(error);
        } catch {
          // Error reporting must not block delivery to the remaining listeners.
        }
      }
    }
  }
}

/** True for the structured token thrown by a pending resource's read(). */
export function isPendingResourceToken(
  value: unknown,
): value is PendingResourceToken {
  return typeof value === "object" && value !== null &&
    (value as Partial<PendingResourceToken>)[pendingTokenBrand] === true;
}

/** True for the structured rejection thrown by a rejected resource's read(). */
export function isResourceRejection(
  value: unknown,
): value is ResourceRejection {
  return value instanceof ResourceRejection && value[rejectionBrand] === true;
}

/**
 * A caller-owned identity table. The WeakMap deduplicates object/function
 * thenables without keeping keys alive; each table has independent identity.
 */
export class AsyncResourceTable {
  // `any` is intentional here: the opaque thenable identity is the cache key,
  // while each caller supplies the corresponding result type at `from()`.
  #resources = new WeakMap<object, AsyncResource<any>>();

  constructor(
    private readonly reportListenerError: ResourceErrorReporter =
      reportResourceListenerError,
  ) {}

  from<T>(thenable: PromiseLike<T>): AsyncResource<Awaited<T>> {
    if (
      (typeof thenable !== "object" || thenable === null) &&
      typeof thenable !== "function"
    ) {
      throw new TypeError("AsyncResourceTable requires an object thenable");
    }
    const key = thenable as object;
    let resource: AsyncResource<any> | undefined = this.#resources.get(key);
    if (!resource) {
      resource = new AsyncResource<Awaited<T>>(
        thenable as PromiseLike<Awaited<T>>,
        this.reportListenerError,
        (created) => this.#resources.set(key, created),
      );
    }
    return resource as AsyncResource<Awaited<T>>;
  }
}
