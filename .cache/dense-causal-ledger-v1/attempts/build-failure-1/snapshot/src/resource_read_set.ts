import { AsyncResource, AsyncResourceTable } from "./async_resource_runtime.ts";

/** Candidate-local async reads; no subscriptions or provider cancellation. */
export class ResourceReadSet {
  // Result types are existential here; this registry reads only identity/status.
  #versions = new Map<AsyncResource<any>, number>();
  #closed = false;

  constructor(private readonly table: AsyncResourceTable) {}

  read<T>(source: AsyncResource<T> | PromiseLike<T>): Awaited<T> {
    if (this.#closed) throw new Error("Resource read set is closed");
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

  get pending(): readonly AsyncResource<any>[] {
    return [...this.#versions.keys()].filter((resource) =>
      resource.status.status === "pending"
    );
  }

  validate(): boolean {
    return !this.#closed &&
      [...this.#versions].every(([resource, version]) =>
        resource.version === version
      );
  }

  discard(): void {
    this.#closed = true;
    this.#versions.clear();
  }
}
