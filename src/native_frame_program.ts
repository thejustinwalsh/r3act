export type NativeFrameClock = Readonly<{
  elapsed: number;
  delta: number;
  timeMs: number;
  deltaMs: number;
}>;

export type NativeFrameCallback = (clock: NativeFrameClock) => void;

export type NativeFrameCallbackOptions = Readonly<{
  id?: string;
  phase?: "early" | "update" | "late";
  priority?: number;
  before?: readonly string[];
  after?: readonly string[];
}>;

type Registration = {
  readonly key: string;
  id: string;
  readonly order: number;
  phase: number;
  priority: number;
  before: readonly string[];
  after: readonly string[];
  callback: NativeFrameCallback;
  dependencies: readonly unknown[];
};

const phases = { early: 0, update: 1, late: 2 } as const;

const sameDependencies = (left: readonly unknown[], right: readonly unknown[]) =>
  left.length === right.length && left.every((value, index) =>
    Object.is(value, right[index]));

export class NativeFrameProgram {
  #registrations = new Map<string, Registration>();
  #ordered: readonly Registration[] = [];
  #dirty = false;
  #nextOrder = 0;

  register(key: string, callback: NativeFrameCallback,
    dependencies: readonly unknown[], options: NativeFrameCallbackOptions = {},
  ): () => void {
    if (!key || this.#registrations.has(key)) {
      throw new Error(`Duplicate frame registration: ${key}`);
    }
    const id = options.id ?? key;
    if (typeof id !== "string" || !id ||
      [...this.#registrations.values()].some((entry) => entry.id === id)) {
      throw new Error(`Duplicate frame callback id: ${id}`);
    }
    if (typeof callback !== "function" || !Array.isArray(dependencies) ||
      !Number.isFinite(options.priority ?? 0) ||
      (options.phase !== undefined && !Object.hasOwn(phases, options.phase)) ||
      !Array.isArray(options.before ?? []) || !Array.isArray(options.after ?? [])) {
      throw new TypeError("Invalid frame callback registration");
    }
    const before = Object.freeze([...(options.before ?? [])]);
    const after = Object.freeze([...(options.after ?? [])]);
    if ([...before, ...after].some((edge) => typeof edge !== "string" || !edge)) {
      throw new TypeError("Frame callback edges require nonempty ids");
    }
    const registration: Registration = {
      key, id, order: this.#nextOrder++,
      phase: phases[options.phase ?? "update"],
      priority: options.priority ?? 0, before, after,
      callback, dependencies: Object.freeze([...dependencies]),
    };
    this.#registrations.set(key, registration);
    this.#dirty = true;
    return () => {
      if (this.#registrations.get(key) !== registration) return;
      this.#registrations.delete(key);
      this.#ordered = [];
      this.#dirty = true;
    };
  }

  refresh(key: string, callback: NativeFrameCallback,
    dependencies: readonly unknown[], options: NativeFrameCallbackOptions = {},
  ): void {
    const current = this.#registrations.get(key);
    if (!current) throw new Error(`Frame registration is not active: ${key}`);
    if (typeof callback !== "function" || !Array.isArray(dependencies) ||
      !Number.isFinite(options.priority ?? 0) ||
      (options.phase !== undefined && !Object.hasOwn(phases, options.phase)) ||
      !Array.isArray(options.before ?? []) || !Array.isArray(options.after ?? [])) {
      throw new TypeError("Invalid frame callback refresh");
    }
    const phase = phases[options.phase ?? "update"];
    const priority = options.priority ?? 0;
    const before = options.before ?? [];
    const after = options.after ?? [];
    const id = options.id ?? key;
    if (typeof id !== "string" || !id ||
      [...this.#registrations.values()].some((entry) =>
      entry !== current && entry.id === id)) {
      throw new Error(`Duplicate frame callback id: ${id}`);
    }
    if ([...before, ...after].some((edge) => typeof edge !== "string" || !edge)) {
      throw new TypeError("Frame callback edges require nonempty ids");
    }
    if (id !== current.id || phase !== current.phase ||
      priority !== current.priority ||
      !sameDependencies(before, current.before) ||
      !sameDependencies(after, current.after)) {
      current.id = id;
      current.phase = phase;
      current.priority = priority;
      current.before = Object.freeze([...before]);
      current.after = Object.freeze([...after]);
      this.#dirty = true;
    }
    if (!sameDependencies(current.dependencies, dependencies)) {
      current.callback = callback;
      current.dependencies = Object.freeze([...dependencies]);
    }
  }

  run(clock: NativeFrameClock, isCurrent: () => boolean = () => true): void {
    this.prepareTick();
    for (const registration of this.#ordered) {
      if (!isCurrent()) return;
      if (this.#registrations.get(registration.key) === registration) {
        registration.callback(clock);
      }
    }
  }

  prepareTick(): void {
    if (this.#dirty) this.#rebuild();
  }

  #rebuild(): void {
    const entries = [...this.#registrations.values()];
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const successors = new Map(entries.map((entry) => [entry.id, new Set<string>()]));
    const indegree = new Map(entries.map((entry) => [entry.id, 0]));
    const edge = (from: string, to: string) => {
      if (!byId.has(from) || !byId.has(to)) {
        throw new Error(`Unknown frame callback ordering id: ${!byId.has(from) ? from : to}`);
      }
      const next = successors.get(from)!;
      if (!next.has(to)) {
        next.add(to);
        indegree.set(to, indegree.get(to)! + 1);
      }
    };
    for (const entry of entries) {
      for (const id of entry.before) edge(entry.id, id);
      for (const id of entry.after) edge(id, entry.id);
    }
    // Explicit edges take precedence; phase and priority order ready callbacks.
    const compare = (a: Registration, b: Registration) =>
      a.phase - b.phase || a.priority - b.priority || a.order - b.order;
    const ready = entries.filter((entry) => indegree.get(entry.id) === 0);
    ready.sort(compare);
    const ordered: Registration[] = [];
    while (ready.length) {
      const entry = ready.shift()!;
      ordered.push(entry);
      for (const id of successors.get(entry.id)!) {
        const remaining = indegree.get(id)! - 1;
        indegree.set(id, remaining);
        if (remaining === 0) {
          ready.push(byId.get(id)!);
          ready.sort(compare);
        }
      }
    }
    if (ordered.length !== entries.length) {
      throw new Error("Frame callback ordering contains a cycle");
    }
    this.#ordered = ordered;
    this.#dirty = false;
  }
}
