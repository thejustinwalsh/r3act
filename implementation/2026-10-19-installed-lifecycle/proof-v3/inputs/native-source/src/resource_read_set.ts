import {
  AsyncResource,
  AsyncResourceTable,
  type AsyncResourceStatus,
  type FulfilledResourceStatus,
} from "./async_resource_runtime.ts";

const resourcePrototype = AsyncResource.prototype;
const canonicalRead = resourcePrototype.read;
const canonicalStatus = Object.getOwnPropertyDescriptor(resourcePrototype, "status")!.get!;
const canonicalVersion = Object.getOwnPropertyDescriptor(resourcePrototype, "version")!.get!;

/** @internal Read the provider's private version without an authored getter. */
export const canonicalResourceVersion = (resource: unknown): number | null => {
  if (typeof resource !== "object" || resource === null) return null;
  try { return canonicalVersion.call(resource); } catch { return null; }
};

/** Inspect only the canonical resource implementation, without authored getters. */
export const closedResourceStatus = (resource: unknown): AsyncResourceStatus<unknown> | null => {
  if (typeof resource !== "object" || resource === null) return null;
  try {
    const status = canonicalStatus.call(resource);
    if (Object.getPrototypeOf(resource) !== resourcePrototype ||
      Object.hasOwn(resource, "read") || Object.hasOwn(resource, "status") ||
      Object.hasOwn(resource, "version") ||
      Object.getOwnPropertyDescriptor(resourcePrototype, "read")?.value !== canonicalRead ||
      Object.getOwnPropertyDescriptor(resourcePrototype, "status")?.get !== canonicalStatus ||
      Object.getOwnPropertyDescriptor(resourcePrototype, "version")?.get !== canonicalVersion) return null;
    return status;
  } catch {
    return null;
  }
};

/** Candidate-local async reads; no subscriptions or provider cancellation. */
export class ResourceReadSet {
  // Result types are existential here; this registry reads only identity/status.
  #versions = new Map<AsyncResource<any>, {
    observedVersion: number;
    canonicalVersion: number | null;
    closed: boolean;
  }>();
  #closed = false;

  constructor(private readonly table: AsyncResourceTable) {}

  read<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T> {
    if (this.#closed) throw new Error("Resource read set is closed");
    const resource = source instanceof AsyncResource
      ? source
      : this.table.from(source);
    if (!this.#versions.has(resource)) {
      const observedVersion = resource.version;
      let capturedCanonical: number | null = null;
      try { capturedCanonical = canonicalVersion.call(resource); } catch { /* opaque source */ }
      this.#versions.set(resource, {
        observedVersion, canonicalVersion: capturedCanonical, closed: false,
      });
    }
    // Record pending/rejected reads too: a boundary decides whether to retry,
    // preserve prior content or reveal an error; the read set never hides them.
    return resource.read();
  }

  /** Capture a fulfilled canonical resource without calling its public methods. */
  readClosed<T>(resource: AsyncResource<T>): FulfilledResourceStatus<unknown> | null {
    if (this.#closed) throw new Error("Resource read set is closed");
    const status = closedResourceStatus(resource);
    if (status?.status !== "fulfilled") return null;
    const previous = this.#versions.get(resource);
    if (previous !== undefined && previous.observedVersion !== status.version) return null;
    if (previous === undefined) {
      this.#versions.set(resource, {
        observedVersion: status.version, canonicalVersion: status.version, closed: true,
      });
    }
    return status;
  }

  get pending(): readonly AsyncResource<any>[] {
    return [...this.#versions].filter(([resource, captured]) =>
      !captured.closed && resource.status.status === "pending"
    ).map(([resource]) => resource);
  }

  validate(): boolean {
    return !this.#closed &&
      [...this.#versions].every(([resource, captured]) =>
        !captured.closed ? resource.version === captured.observedVersion
          : closedResourceStatus(resource)?.version === captured.observedVersion
      );
  }

  validateCanonical(): boolean {
    if (this.#closed) return false;
    for (const [resource, captured] of this.#versions) {
      if (captured.canonicalVersion === null) continue;
      try { if (canonicalVersion.call(resource) !== captured.canonicalVersion) return false; }
      catch { return false; }
    }
    return true;
  }

  discard(): void {
    this.#closed = true;
    this.#versions.clear();
  }
}
