/**
 * Ready-to-commit work for retained roots. Transition records are independent
 * of root identity: overlapping roots coexist until an explicit key replaces
 * one of them. Preparation is synchronous and is repeated against current
 * versions when a candidate goes stale. Host commits must also be synchronous.
 */

export type RootWorkCandidate<T> = {
  rootId: string;
  baseVersion: number;
  targetVersion: number;
  value: T;
  /** Optional source/store read-set validation at the publication boundary. */
  validate?(): boolean;
};

/**
 * Suspend preparation until an adapter resolves every listed resource token.
 * Any resources created earlier in the throwing prepare call remain the
 * prepare callback's cleanup responsibility because no candidate batch was
 * returned to the queue.
 */
export class RootWorkPending extends Error {
  readonly tokens: readonly string[];

  constructor(tokens: readonly string[]) {
    super("Root work is waiting for resources");
    this.name = "RootWorkPending";
    if (tokens.length === 0) {
      throw new RangeError("RootWorkPending requires at least one token");
    }
    if (tokens.some((token) => !token)) {
      throw new Error("RootWorkPending token IDs must be non-empty");
    }
    if (new Set(tokens).size !== tokens.length) {
      throw new Error("RootWorkPending token IDs must be unique");
    }
    this.tokens = Object.freeze([...tokens]);
    Object.freeze(this);
  }
}

export type RootWorkPendingContext = {
  readonly tokens: readonly string[];
  resolve(token: string): RootWorkResolution;
  refresh(): RootWorkResolution;
};

export type RootWorkStatus =
  | "pending"
  | "committed"
  | "cancelled"
  | "stale"
  | "failed";

export type RootWorkResolution = {
  status: RootWorkStatus;
  transitionId: string;
  roots: readonly string[];
  error?: unknown;
  reason?: string;
};

export type RootWorkSettled = RootWorkResolution & {
  status: Exclude<RootWorkStatus, "pending">;
};

export type RootWorkPrepareContext = {
  transitionId: string;
  attempt: number;
  /** Versions are captured immediately before each synchronous preparation. */
  versions: ReadonlyMap<string, number>;
};

export type RootWorkStaleContext<T> = {
  transitionId: string;
  attempt: number;
  candidates: readonly RootWorkCandidate<T>[];
  currentVersions: ReadonlyMap<string, number>;
  reason: string;
};

export type RootWorkDefinition<T> = {
  /** Must be unique among currently pending work. */
  id: string;
  /** All roots commit as one synchronous group. */
  roots: readonly string[];
  /** Only an equal explicit key replaces previous work. */
  key?: string;
  /** Task/resource IDs that must resolve before preparation can begin. */
  pending?: readonly string[];
  prepare(context: RootWorkPrepareContext): readonly RootWorkCandidate<T>[];
  /** Task-only live inputs checked after preparation callbacks and before admission. */
  validateWork?(): boolean;
  /**
   * Release candidates when this queue abandons a prepared attempt. Called
   * once per candidate on retry or terminal failure/cancellation. A successful
   * commit takes ownership and is never followed by discard. If prepare throws
   * before returning, prepare remains responsible for any partial resources.
   */
  discard?(candidate: RootWorkCandidate<T>): void;
  /** Final callback-free admission before root commit flags and host writes. */
  admit?(candidates: readonly RootWorkCandidate<T>[]): void | (() => void);
  /** One synchronous callback owns the whole root group commit boundary. */
  commit(candidates: readonly RootWorkCandidate<T>[]): void;
  /** Whether a failed commit may have changed a host; defaults to true. */
  commitFailurePoison?(error: unknown): boolean;
  /**
   * Runs once after every root version is published and status is committed,
   * before onSettled. Group root locks remain held through both callbacks.
   * Calling enqueue is allowed; ready work runs after this publication phase.
   */
  afterCommit?(candidates: readonly RootWorkCandidate<T>[]): void;
  /** Subscribe to resources requested by a thrown RootWorkPending signal. */
  onPending?(context: RootWorkPendingContext): void;
  /** Return "retry" to rebuild; omit/reject to terminate stale work. */
  onStale?(context: RootWorkStaleContext<T>): "retry" | "reject";
  /** Runs after commit and version publication, or after terminal settlement. */
  onSettled?(resolution: RootWorkSettled): void;
};

export type RootWorkHandle = {
  readonly id: string;
  readonly status: RootWorkStatus;
  readonly resolution: RootWorkResolution;
  /** Resolve one pending resource. Repeated/unknown tokens are stale. */
  resolve(resourceId: string): RootWorkResolution;
  /** Invalidate dynamic resource waits only; static pending gates remain. */
  refresh(): RootWorkResolution;
  cancel(reason?: string): RootWorkResolution;
};

type WorkRecord<T> = {
  definition: RootWorkDefinition<T>;
  pending: Set<string>;
  dynamicPending: Set<string>;
  dynamicPendingWave: number;
  status: RootWorkStatus;
  resolution: RootWorkResolution;
  enqueued: boolean;
  committing: boolean;
  deferSettledNotification: boolean;
  settledNotified: boolean;
};

/**
 * Serializes ready root groups on one JS turn while allowing arbitrary
 * independent transitions, including several that share the same root.
 * This is a publication queue, not an async task scheduler.
 */
export class RootWorkQueue<T = unknown> {
  #versions: Map<string, number>;
  #work = new Map<string, WorkRecord<T>>();
  #keys = new Map<string, string>();
  #ready: WorkRecord<T>[] = [];
  #draining = false;
  #committingRoots = new Set<string>();
  #rootFailures = new Map<string, unknown>();

  constructor(
    initialRootVersions: ReadonlyMap<string, number>,
    private readonly maxStaleRetries = 2,
    private readonly onCallbackError?: (error: unknown) => void,
  ) {
    if (!Number.isSafeInteger(maxStaleRetries) || maxStaleRetries < 0) {
      throw new RangeError("maxStaleRetries must be a non-negative integer");
    }
    this.#versions = new Map();
    for (const [rootId, version] of initialRootVersions) {
      this.#validateVersion(rootId, version);
      this.#versions.set(rootId, version);
    }
  }

  getVersion(rootId: string): number {
    const version = this.#versions.get(rootId);
    if (version === undefined) throw new Error(`Unknown root: ${rootId}`);
    return version;
  }

  /** Whether this exact work is inside its synchronous commit boundary. */
  isCommitting(id: string): boolean {
    return this.#work.get(id)?.committing ?? false;
  }

  /** Register a new or remounted root. Remount clears its terminal failure. */
  attachRoot(rootId: string, version = 0): void {
    if (this.#versions.has(rootId)) {
      throw new Error(`Root is already attached: ${rootId}`);
    }
    this.#validateVersion(rootId, version);
    this.#versions.set(rootId, version);
    this.#rootFailures.delete(rootId);
  }

  /** Publish an urgent/external commit while leaving pending work independent. */
  recordRootCommit(rootId: string, version: number): void {
    const current = this.getVersion(rootId);
    if (this.#committingRoots.has(rootId)) {
      throw new Error(`Cannot publish a reentrant commit for root ${rootId}`);
    }
    this.#validateVersion(rootId, version);
    if (version <= current) {
      throw new Error(`Root version for ${rootId} must advance ${current}`);
    }
    this.#versions.set(rootId, version);
  }

  /** Alias for urgent commits; omitting version advances the root by one. */
  recordUrgentCommit(rootId: string, version?: number): number {
    const targetVersion = version ?? this.getVersion(rootId) + 1;
    this.recordRootCommit(rootId, targetVersion);
    return targetVersion;
  }

  /** Detach a root and cancel only work that actually includes that root. */
  detachRoot(rootId: string): number {
    this.getVersion(rootId);
    if (this.#committingRoots.has(rootId)) {
      throw new Error(`Cannot detach root ${rootId} during its grouped commit`);
    }
    let cancelled = 0;
    for (const record of [...this.#work.values()]) {
      if (record.status !== "pending") continue;
      if (!record.definition.roots.includes(rootId)) continue;
      this.#settle(record, {
        status: "cancelled",
        transitionId: record.definition.id,
        roots: record.definition.roots,
        reason: `Root detached: ${rootId}`,
      });
      cancelled++;
    }
    this.#versions.delete(rootId);
    this.#rootFailures.delete(rootId);
    return cancelled;
  }

  enqueue(definition: RootWorkDefinition<T>): RootWorkHandle {
    this.#validateDefinition(definition);
    if (this.#work.has(definition.id)) {
      throw new Error(`Duplicate active transition id: ${definition.id}`);
    }

    // The caller owns its definition object. Snapshot routing fields so later
    // array edits cannot change cancellation, freshness, or commit membership.
    definition = {
      ...definition,
      roots: Object.freeze([...definition.roots]),
      pending: Object.freeze([...(definition.pending ?? [])]),
    };

    const record: WorkRecord<T> = {
      definition,
      pending: new Set(definition.pending ?? []),
      dynamicPending: new Set(),
      dynamicPendingWave: 0,
      status: "pending",
      resolution: {
        status: "pending",
        transitionId: definition.id,
        roots: [...definition.roots],
      },
      enqueued: false,
      committing: false,
      deferSettledNotification: false,
      settledNotified: false,
    };
    const replacedId = definition.key === undefined
      ? undefined
      : this.#keys.get(definition.key);
    const replaced = replacedId === undefined
      ? undefined
      : this.#work.get(replacedId);
    this.#work.set(definition.id, record);
    if (definition.key !== undefined) {
      this.#keys.set(definition.key, definition.id);
    }
    if (replaced && !replaced.committing) {
      this.#settle(replaced, {
        status: "cancelled",
        transitionId: replaced.definition.id,
        roots: replaced.definition.roots,
        reason: `Replaced by transition ${definition.id}`,
      });
    }
    if (record.status !== "pending") return this.#handle(record);
    if (record.pending.size === 0) this.#markReady(record);
    this.#drain();
    return this.#handle(record);
  }

  #validateDefinition(definition: RootWorkDefinition<T>): void {
    if (!definition.id) throw new Error("Transition id must be non-empty");
    if (!definition.roots.length) {
      throw new Error("Root work requires at least one root");
    }
    if (new Set(definition.roots).size !== definition.roots.length) {
      throw new Error("Root work cannot contain duplicate roots");
    }
    for (const rootId of definition.roots) this.getVersion(rootId);
    if (definition.key !== undefined && !definition.key) {
      throw new Error("Replacement key must be non-empty when provided");
    }
    if (
      new Set(definition.pending ?? []).size !==
        (definition.pending ?? []).length
    ) {
      throw new Error("Pending resource IDs must be unique");
    }
  }

  #validateVersion(rootId: string, version: number): void {
    if (!rootId) throw new Error("Root id must be non-empty");
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new Error(
        `Root version for ${rootId} must be a non-negative integer`,
      );
    }
  }

  #handle(record: WorkRecord<T>): RootWorkHandle {
    return {
      id: record.definition.id,
      get status() {
        return record.status;
      },
      get resolution() {
        return record.resolution;
      },
      resolve: (resourceId) => this.#resolve(record, resourceId),
      refresh: () => this.#refreshDynamic(record),
      cancel: (reason) => this.#cancel(record, reason),
    };
  }

  #resolve(record: WorkRecord<T>, resourceId: string): RootWorkResolution {
    if (record.status !== "pending" || !record.pending.delete(resourceId)) {
      return {
        status: "stale",
        transitionId: record.definition.id,
        roots: record.definition.roots,
        reason: `Unknown or already resolved resource: ${resourceId}`,
      };
    }
    if (record.pending.size === 0 && record.dynamicPending.size === 0) {
      this.#markReady(record);
    }
    this.#drain();
    return record.resolution;
  }

  #resolveDynamic(
    record: WorkRecord<T>,
    token: string,
    wave: number,
  ): RootWorkResolution {
    if (
      record.status !== "pending" || record.dynamicPendingWave !== wave ||
      !record.dynamicPending.delete(token)
    ) {
      return {
        status: "stale",
        transitionId: record.definition.id,
        roots: record.definition.roots,
        reason: `Unknown or already resolved dynamic resource: ${token}`,
      };
    }
    if (record.dynamicPending.size === 0) {
      record.dynamicPendingWave++;
      if (record.pending.size === 0) this.#markReady(record);
    }
    this.#drain();
    return record.resolution;
  }

  #refreshDynamic(
    record: WorkRecord<T>,
    expectedWave?: number,
  ): RootWorkResolution {
    if (
      record.status !== "pending" || record.dynamicPending.size === 0 ||
      (expectedWave !== undefined && record.dynamicPendingWave !== expectedWave)
    ) {
      return {
        status: "stale",
        transitionId: record.definition.id,
        roots: record.definition.roots,
        reason: "No matching dynamic resource wait to refresh",
      };
    }
    record.dynamicPending.clear();
    record.dynamicPendingWave++;
    if (record.pending.size === 0) this.#markReady(record);
    this.#drain();
    return record.resolution;
  }

  #suspendForPending(record: WorkRecord<T>, signal: RootWorkPending): void {
    const { definition } = record;
    record.enqueued = false;
    record.dynamicPending = new Set(signal.tokens);
    const wave = ++record.dynamicPendingWave;
    if (!definition.onPending) {
      this.#settle(record, {
        status: "failed",
        transitionId: definition.id,
        roots: definition.roots,
        reason: "Dynamic resource wait requires an onPending callback",
        error: signal,
      });
      record.deferSettledNotification = false;
      this.#notifySettled(record);
      return;
    }
    try {
      definition.onPending({
        tokens: signal.tokens,
        resolve: (token) => this.#resolveDynamic(record, token, wave),
        refresh: () => this.#refreshDynamic(record, wave),
      });
    } catch (error) {
      if (record.status === "pending") {
        record.dynamicPending.clear();
        record.dynamicPendingWave++;
        this.#settle(record, {
          status: "failed",
          transitionId: definition.id,
          roots: definition.roots,
          reason: "Dynamic resource subscription failed",
          error,
        });
      } else {
        this.#reportCallbackError(error);
      }
    }
    record.deferSettledNotification = false;
    this.#notifySettled(record);
  }

  #cancel(record: WorkRecord<T>, reason = "Cancelled"): RootWorkResolution {
    if (record.status !== "pending" || record.committing) {
      return record.resolution;
    }
    this.#settle(record, {
      status: "cancelled",
      transitionId: record.definition.id,
      roots: record.definition.roots,
      reason,
    });
    return record.resolution;
  }

  #markReady(record: WorkRecord<T>): void {
    if (
      record.enqueued || record.status !== "pending" ||
      record.pending.size > 0 || record.dynamicPending.size > 0
    ) return;
    record.enqueued = true;
    this.#ready.push(record);
  }

  #drain(): void {
    if (this.#draining) return;
    this.#draining = true;
    try {
      while (this.#ready.length) {
        const record = this.#ready.shift()!;
        record.enqueued = false;
        if (record.status === "pending") this.#commitReady(record);
      }
    } finally {
      this.#draining = false;
    }
  }

  #commitReady(record: WorkRecord<T>): void {
    const { definition } = record;
    const poisonedRoot = definition.roots.find((rootId) =>
      this.#rootFailures.has(rootId)
    );
    if (poisonedRoot !== undefined) {
      this.#settle(record, {
        status: "failed",
        transitionId: definition.id,
        roots: definition.roots,
        reason:
          `Root requires remount after a failed host commit: ${poisonedRoot}`,
        error: this.#rootFailures.get(poisonedRoot),
      });
      return;
    }

    for (let attempt = 0; attempt <= this.maxStaleRetries; attempt++) {
      if (record.status !== "pending") return;
      // Reentrant cancellation can happen before prepare returns its resources.
      // Defer onSettled until the returned candidate batch has been released.
      record.deferSettledNotification = true;
      const versions = new Map(
        definition.roots.map((rootId) => [rootId, this.getVersion(rootId)]),
      );
      let candidates: readonly RootWorkCandidate<T>[];
      try {
        candidates = definition.prepare({
          transitionId: definition.id,
          attempt,
          versions,
        });
      } catch (error) {
        if (error instanceof RootWorkPending) {
          if (record.status === "pending") {
            this.#suspendForPending(record, error);
          } else {
            record.deferSettledNotification = false;
            this.#notifySettled(record);
          }
          return;
        }
        if (record.status === "pending") {
          this.#settle(record, {
            status: "failed",
            transitionId: definition.id,
            roots: definition.roots,
            reason: "Candidate preparation failed",
            error,
          });
        }
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        return;
      }
      if (record.status !== "pending") {
        this.#discardCandidates(definition, candidates);
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        return;
      }

      let staleReason: string | undefined;
      try {
        staleReason = definition.validateWork?.() === false
          ? "External work inputs are stale"
          : this.#candidateError(record, candidates);
      } catch (error) {
        if (record.status !== "pending") {
          this.#discardCandidates(definition, candidates);
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }
        this.#failValidation(record, error);
        this.#discardCandidates(definition, candidates);
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        return;
      }
      if (record.status !== "pending") {
        this.#discardCandidates(definition, candidates);
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        return;
      }
      if (staleReason === undefined) {
        let finalReason: string | undefined;
        try {
          // External validation may invoke caller code. Recheck every captured
          // candidate after it returns, before any host application begins.
          finalReason = definition.validateWork?.() === false
            ? "External work inputs are stale"
            : this.#candidateError(record, candidates);
        } catch (error) {
          if (record.status !== "pending") {
            this.#discardCandidates(definition, candidates);
            record.deferSettledNotification = false;
            this.#notifySettled(record);
            return;
          }
          this.#failValidation(record, error);
          this.#discardCandidates(definition, candidates);
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }
        if (record.status !== "pending") {
          this.#discardCandidates(definition, candidates);
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }
        if (finalReason !== undefined) {
          const retry = this.#shouldRetry(
            definition,
            record,
            attempt,
            candidates,
            finalReason,
          );
          this.#discardCandidates(definition, candidates);
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          if (!retry) return;
          continue;
        }

        let releaseAdmission: void | (() => void);
        try {
          releaseAdmission = definition.admit?.(candidates);
        } catch (error) {
          this.#discardCandidates(definition, candidates);
          if (error instanceof RootWorkPending && record.status === "pending") {
            this.#suspendForPending(record, error);
          } else if (record.status === "pending") {
            this.#failValidation(record, error);
          }
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }
        if (record.status !== "pending") {
          try { releaseAdmission?.(); } catch (error) {
            this.#reportCallbackError(error);
          }
          this.#discardCandidates(definition, candidates);
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }

        for (const rootId of definition.roots) {
          this.#committingRoots.add(rootId);
        }
        record.committing = true;
        try {
          definition.commit(candidates);
        } catch (error) {
          record.committing = false;
          for (const rootId of definition.roots) {
            this.#committingRoots.delete(rootId);
          }
          let partial = true;
          try {
            partial = definition.commitFailurePoison?.(error) ?? true;
          } catch (classificationError) {
            this.#reportCallbackError(classificationError);
          }
          if (partial) {
            for (const rootId of definition.roots) {
              this.#rootFailures.set(rootId, error);
            }
          }
          this.#settle(record, {
            status: "failed",
            transitionId: definition.id,
            roots: definition.roots,
            reason: partial
              ? "Grouped host commit failed; roots require remount"
              : "Grouped commit failed before host application",
            error,
          });
          this.#discardCandidates(definition, candidates);
          try { releaseAdmission?.(); } catch (releaseError) {
            this.#reportCallbackError(releaseError);
          }
          record.deferSettledNotification = false;
          this.#notifySettled(record);
          return;
        }
        for (const candidate of candidates) {
          this.#versions.set(candidate.rootId, candidate.targetVersion);
        }
        this.#settle(record, {
          status: "committed",
          transitionId: definition.id,
          roots: definition.roots,
        });
        try {
          definition.afterCommit?.(candidates);
        } catch (error) {
          this.#reportCallbackError(error);
        } finally {
          try { releaseAdmission?.(); } catch (error) {
            this.#reportCallbackError(error);
          }
        }
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        record.committing = false;
        for (const rootId of definition.roots) {
          this.#committingRoots.delete(rootId);
        }
        return;
      }

      if (
        !this.#shouldRetry(definition, record, attempt, candidates, staleReason)
      ) {
        this.#discardCandidates(definition, candidates);
        record.deferSettledNotification = false;
        this.#notifySettled(record);
        return;
      }
      this.#discardCandidates(definition, candidates);
      record.deferSettledNotification = false;
      this.#notifySettled(record);
    }

    this.#settle(record, {
      status: "stale",
      transitionId: definition.id,
      roots: definition.roots,
      reason: `Candidate remained stale after ${this.maxStaleRetries} retries`,
    });
  }

  #candidateError(
    record: WorkRecord<T>,
    candidates: readonly RootWorkCandidate<T>[],
  ): string | undefined {
    const roots = record.definition.roots;
    if (!Array.isArray(candidates) || candidates.length !== roots.length) {
      return "Prepared candidates must cover every root exactly once";
    }
    const byRoot = new Map<string, RootWorkCandidate<T>>();
    for (const candidate of candidates) {
      if (!roots.includes(candidate.rootId) || byRoot.has(candidate.rootId)) {
        return `Invalid or duplicate candidate root: ${candidate.rootId}`;
      }
      byRoot.set(candidate.rootId, candidate);
    }
    for (const rootId of roots) {
      const candidate = byRoot.get(rootId);
      if (!candidate) return `Missing candidate for root ${rootId}`;
      const current = this.getVersion(rootId);
      if (candidate.baseVersion !== current) {
        return `Stale candidate for ${rootId}: expected base ${current}, received ${candidate.baseVersion}`;
      }
      if (candidate.validate) {
        const isFresh = candidate.validate();
        if (record.status !== "pending") {
          return "Transition settled during candidate validation";
        }
        if (!isFresh) return `Candidate read set is stale for ${rootId}`;
        // A validator may synchronously publish an urgent version. Recheck
        // after it returns so the freshness boundary observes that update.
        const validatedVersion = this.getVersion(rootId);
        if (candidate.baseVersion !== validatedVersion) {
          return `Stale candidate for ${rootId}: expected base ${validatedVersion}, received ${candidate.baseVersion}`;
        }
      }
      if (
        !Number.isSafeInteger(candidate.targetVersion) ||
        candidate.targetVersion <= current
      ) {
        return `Candidate target for ${rootId} must advance ${current}`;
      }
    }
    // A later root's validator may synchronously advance an earlier root.
    // Re-read the whole group after every validator has run; no user callback
    // occurs between this pass and the caller's grouped commit callback.
    for (const rootId of roots) {
      const candidate = byRoot.get(rootId)!;
      const current = this.getVersion(rootId);
      if (candidate.baseVersion !== current) {
        return `Stale candidate for ${rootId}: expected base ${current}, received ${candidate.baseVersion}`;
      }
    }
    return undefined;
  }

  #failValidation(record: WorkRecord<T>, error: unknown): void {
    this.#settle(record, {
      status: "failed",
      transitionId: record.definition.id,
      roots: record.definition.roots,
      reason: "Candidate freshness validation failed",
      error,
    });
  }

  #discardCandidates(
    definition: RootWorkDefinition<T>,
    candidates: readonly RootWorkCandidate<T>[],
  ): void {
    if (!definition.discard || !Array.isArray(candidates)) return;
    // A malformed candidate list can contain the same object more than once.
    // Treat ownership as attached to the candidate object, not its array slot.
    const discarded = new Set<RootWorkCandidate<T>>();
    for (const candidate of candidates) {
      if (candidate === null || typeof candidate !== "object") continue;
      if (discarded.has(candidate)) continue;
      discarded.add(candidate);
      try {
        definition.discard(candidate);
      } catch (error) {
        this.#reportCallbackError(error);
      }
    }
  }

  #reportCallbackError(error: unknown): void {
    try {
      this.onCallbackError?.(error);
    } catch {
      // Error reporting is deliberately outside the host commit outcome.
    }
  }

  #shouldRetry(
    definition: RootWorkDefinition<T>,
    record: WorkRecord<T>,
    attempt: number,
    candidates: readonly RootWorkCandidate<T>[],
    reason: string,
  ): boolean {
    const currentVersions = new Map(
      definition.roots.map((rootId) => [rootId, this.getVersion(rootId)]),
    );
    let decision: "retry" | "reject" = attempt < this.maxStaleRetries
      ? "retry"
      : "reject";
    try {
      if (definition.onStale) {
        decision = definition.onStale({
          transitionId: definition.id,
          attempt,
          candidates,
          currentVersions,
          reason,
        });
      }
    } catch (error) {
      this.#settle(record, {
        status: "failed",
        transitionId: definition.id,
        roots: definition.roots,
        reason: "Stale candidate hook failed",
        error,
      });
      return false;
    }
    if (record.status !== "pending") return false;
    if (decision === "retry" && attempt < this.maxStaleRetries) return true;
    this.#settle(record, {
      status: "stale",
      transitionId: definition.id,
      roots: definition.roots,
      reason,
    });
    return false;
  }

  #settle(record: WorkRecord<T>, resolution: RootWorkSettled): void {
    if (record.status !== "pending") return;
    record.status = resolution.status;
    record.resolution = resolution;
    record.dynamicPending.clear();
    record.dynamicPendingWave++;
    if (!record.committing) this.#work.delete(record.definition.id);
    const key = record.definition.key;
    if (key !== undefined && this.#keys.get(key) === record.definition.id) {
      this.#keys.delete(key);
    }
    this.#notifySettled(record);
  }

  #notifySettled(record: WorkRecord<T>): void {
    if (
      record.status === "pending" || record.deferSettledNotification ||
      record.settledNotified
    ) return;
    if (this.#work.get(record.definition.id) === record) {
      this.#work.delete(record.definition.id);
    }
    record.settledNotified = true;
    try {
      record.definition.onSettled?.(record.resolution as RootWorkSettled);
    } catch (error) {
      // Notification failure cannot undo a published commit or poison roots.
      this.#reportCallbackError(error);
    }
  }
}
