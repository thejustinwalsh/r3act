import { CompiledBindings, type BindingEdge } from "./compiled_bindings.ts";
import type { ScalarSource } from "./jsx_binding_runtime.ts";

export interface RepeatedHostPlan {
  rootTag: string;
  rootProps: Readonly<Record<string, string>>;
  itemTag: string;
  itemProps: Readonly<Record<string, string>>;
  /** The repeated map item at index i binds to host item i. */
  sourceTargetLayout: "identity";
  bindings: readonly { property: string; sourceScope?: "item" | "shared"; sourcePath?: string; sourceSlot?: number; project(value: number): unknown }[];
  /** CSR adjacency from source slots to binding IDs in the item template. */
  dependencyGraph: {
    sourceCount: number;
    sourcePaths?: readonly string[];
    sourceBindingOffsets: readonly number[];
    bindingIds: readonly number[];
    /** Shared-source CSR metadata is emitted by OXC but not dispatched by this runtime yet. */
    sharedSourceCount?: number;
    sharedSourcePaths?: readonly string[];
    sharedSourceBindingOffsets?: readonly number[];
    sharedBindingIds?: readonly number[];
  };
}

export type RepeatedPlanSource = ScalarSource | { id: number; values: readonly number[] };

/** Static host-property writers emitted by the UI compiler for a plan. */
export interface RepeatedHostWriters {
  writeItem(element: HTMLElement, sourceSlot: number, value: number): void;
  writeShared(element: HTMLElement, sourceSlot: number, value: number): void;
}

export interface CompiledPlanMount {
  readonly bindingCount: number;
  set(sourceId: number, value: number, sourceSlot?: number): void;
  setShared(sourceSlot: number, value: number): void;
  flush(): void;
  dispose(): void;
}

function setStyle(element: HTMLElement, property: string, value: unknown) {
  if (property.startsWith("--")) element.style.setProperty(property, String(value));
  else (element.style as any)[property] = value == null ? "" : String(value);
}

function setStaticProps(element: HTMLElement, props: Readonly<Record<string, string>>) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "className") element.className = value;
    else element.setAttribute(name, value);
  }
}

function validateGraphTable(
  plan: RepeatedHostPlan,
  scope: "item" | "shared",
  sourceCount: number,
  sourceBindingOffsets: readonly number[],
  bindingIds: readonly number[],
): readonly number[] {
  if (!Number.isInteger(sourceCount) || sourceCount < (scope === "item" ? 1 : 0) || sourceBindingOffsets.length !== sourceCount + 1 ||
    sourceBindingOffsets[0] !== 0 || sourceBindingOffsets[sourceCount] !== bindingIds.length) {
    throw new Error("Generated plan has invalid source-to-binding CSR offsets");
  }
  const sourcePaths = scope === "item" ? plan.dependencyGraph.sourcePaths : plan.dependencyGraph.sharedSourcePaths;
  if (sourcePaths && sourcePaths.length !== sourceCount) {
    throw new Error("Generated plan source paths must match the source slot count");
  }
  for (let slot = 0; slot < sourceCount; slot++) {
    if (!Number.isInteger(sourceBindingOffsets[slot]) || sourceBindingOffsets[slot] > sourceBindingOffsets[slot + 1]) {
      throw new Error("Generated plan CSR offsets must be monotonic integers");
    }
  }
  const seen = new Uint8Array(plan.bindings.length);
  for (const bindingId of bindingIds) {
    if (!Number.isInteger(bindingId) || bindingId < 0 || bindingId >= plan.bindings.length || seen[bindingId]) {
      throw new Error("Generated dependency graph contains an invalid or duplicate binding ID");
    }
    const bindingScope = plan.bindings[bindingId].sourceScope ?? "item";
    if (bindingScope !== scope) throw new Error(`Generated ${scope} graph references a ${bindingScope} binding`);
    seen[bindingId] = 1;
  }
  for (let slot = 0; slot < sourceCount; slot++) {
    for (let edge = sourceBindingOffsets[slot]; edge < sourceBindingOffsets[slot + 1]; edge++) {
      if ((plan.bindings[bindingIds[edge]].sourceSlot ?? 0) !== slot) {
        throw new Error("Generated plan binding sourceSlot does not match CSR adjacency");
      }
    }
  }
  return bindingIds;
}

function validateDependencyGraphs(plan: RepeatedHostPlan): { item: readonly number[]; shared: readonly number[] } {
  const itemGraph = plan.dependencyGraph;
  const item = validateGraphTable(plan, "item", itemGraph.sourceCount, itemGraph.sourceBindingOffsets, itemGraph.bindingIds);
  const sharedCount = itemGraph.sharedSourceCount ?? 0;
  const sharedOffsets = itemGraph.sharedSourceBindingOffsets ?? [0];
  const sharedIds = itemGraph.sharedBindingIds ?? [];
  const shared = validateGraphTable(plan, "shared", sharedCount, sharedOffsets, sharedIds);
  const seen = new Uint8Array(plan.bindings.length);
  for (const id of [...item, ...shared]) seen[id] = 1;
  if (seen.some((value) => value === 0)) throw new Error("Generated dependency graphs must reference every binding exactly once");
  return { item, shared };
}

function sourceValue(source: RepeatedPlanSource, slot: number, sourceCount: number): number {
  if ("values" in source) {
    if (source.values.length !== sourceCount) throw new Error("Generated plan source row has the wrong slot count");
    return source.values[slot];
  }
  if (sourceCount !== 1 || slot !== 0) throw new Error("Multi-slot plans require source rows with a values array");
  return source.value;
}

/**
 * Instantiates a compiler-emitted repeated host template. The template shape,
 * static attributes, target path, and projector come from generated code; this
 * helper does not construct JSX objects or discover bindings by inspecting props.
 */
export function mountRepeatedHostPlan(
  sources: readonly RepeatedPlanSource[],
  container: HTMLElement,
  plan: RepeatedHostPlan,
  sharedSourceValues: readonly number[] = [],
  writers?: RepeatedHostWriters,
): CompiledPlanMount {
  const root = document.createElement(plan.rootTag);
  setStaticProps(root, plan.rootProps);

  // The compiler proves a one-to-one map-item binding for this plan. Keep the
  // runtime graph in dense columns: source value, dirty bit, dirty ID, and host
  // target all share the same numeric index. No per-edge tuples, CSR build,
  // closure per target, or generic host-operation dispatch is needed.
  const sourceCount = plan.dependencyGraph.sourceCount;
  const sourceInstances = sources.length * sourceCount;
  const sharedSourceCount = plan.dependencyGraph.sharedSourceCount ?? 0;
  const values = new Float64Array(sourceInstances);
  const dirty = new Uint8Array(sourceInstances + sharedSourceCount);
  const sharedOffsets = plan.dependencyGraph.sharedSourceBindingOffsets ?? [0];
  const sharedBindingIds = plan.dependencyGraph.sharedBindingIds ?? [];
  if (sharedSourceValues.length !== sharedSourceCount) throw new Error("Shared source values must match the generated shared source count");
  const sharedValues = Float64Array.from(sharedSourceValues);
  const dirtyIds = new Uint32Array(sourceInstances + sharedSourceCount);
  const targets = new Array<HTMLElement>(sources.length);
  let dirtyCount = 0;
  if (plan.bindings.length === 0) throw new Error("Generated repeated plans require at least one binding");
  const { item: bindingIds } = validateDependencyGraphs(plan);

  for (let id = 0; id < sources.length; id++) {
    const source = sources[id];
    if (!Number.isInteger(source.id) || source.id < 0 || source.id >= sources.length) {
      throw new Error("Generated repeated plans require dense source IDs starting at zero");
    }
    if (source.id !== id) {
      throw new Error("Generated repeated plans require source order to match dense IDs");
    }
    const element = document.createElement(plan.itemTag);
    setStaticProps(element, plan.itemProps);
    targets[id] = element;
    for (let slot = 0; slot < sourceCount; slot++) {
      const sourceId = id * sourceCount + slot;
      const value = sourceValue(source, slot, sourceCount);
      values[sourceId] = value;
      const start = plan.dependencyGraph.sourceBindingOffsets[slot];
      const end = plan.dependencyGraph.sourceBindingOffsets[slot + 1];
      if (writers) {
        writers.writeItem(element, slot, value);
      } else {
        for (let edge = start; edge < end; edge++) {
          const binding = plan.bindings[bindingIds[edge]];
          setStyle(element, binding.property, binding.project(value));
        }
      }
    }
    root.appendChild(element);
  }

  for (let entityId = 0; entityId < targets.length; entityId++) {
    const element = targets[entityId];
    for (let slot = 0; slot < sharedSourceCount; slot++) {
      const value = sharedValues[slot];
      if (writers) {
        writers.writeShared(element, slot, value);
      } else {
        for (let edge = sharedOffsets[slot]; edge < sharedOffsets[slot + 1]; edge++) {
          const binding = plan.bindings[sharedBindingIds[edge]];
          setStyle(element, binding.property, binding.project(value));
        }
      }
    }
  }

  container.replaceChildren(root);

  return {
    get bindingCount() { return targets.length * plan.bindings.length; },
    set(entityId, value, sourceSlot = 0) {
      if (!Number.isInteger(entityId) || entityId < 0 || entityId >= sources.length ||
        !Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= sourceCount) {
        throw new RangeError(`Generated plan entity or source slot out of range: ${entityId}/${sourceSlot}`);
      }
      const sourceId = entityId * sourceCount + sourceSlot;
      if (Object.is(values[sourceId], value)) return;
      values[sourceId] = value;
      if (dirty[sourceId] === 0) {
        dirty[sourceId] = 1;
        dirtyIds[dirtyCount++] = sourceId;
      }
    },
    setShared(sourceSlot, value) {
      if (!Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= sharedSourceCount) {
        throw new RangeError(`Generated plan shared source slot out of range: ${sourceSlot}`);
      }
      if (Object.is(sharedValues[sourceSlot], value)) return;
      sharedValues[sourceSlot] = value;
      const dirtyId = sourceInstances + sourceSlot;
      if (dirty[dirtyId] === 0) {
        dirty[dirtyId] = 1;
        dirtyIds[dirtyCount++] = dirtyId;
      }
    },
    flush() {
      for (let i = 0; i < dirtyCount; i++) {
        const id = dirtyIds[i];
        if (id >= sourceInstances) {
          const sharedSlot = id - sourceInstances;
          const start = sharedOffsets[sharedSlot];
          const end = sharedOffsets[sharedSlot + 1];
          for (let entityId = 0; entityId < targets.length; entityId++) {
            const element = targets[entityId];
            if (writers) {
              writers.writeShared(element, sharedSlot, sharedValues[sharedSlot]);
            } else {
              for (let edge = start; edge < end; edge++) {
                const binding = plan.bindings[sharedBindingIds[edge]];
                setStyle(element, binding.property, binding.project(sharedValues[sharedSlot]));
              }
            }
          }
          dirty[id] = 0;
          continue;
        }
        const entityId = Math.floor(id / sourceCount);
        const sourceSlot = id % sourceCount;
        const element = targets[entityId];
        const start = plan.dependencyGraph.sourceBindingOffsets[sourceSlot];
        const end = plan.dependencyGraph.sourceBindingOffsets[sourceSlot + 1];
        if (writers) {
          writers.writeItem(element, sourceSlot, values[id]);
        } else {
          for (let edge = start; edge < end; edge++) {
            const bindingId = bindingIds[edge];
            const binding = plan.bindings[bindingId];
            setStyle(element, binding.property, binding.project(values[id]));
          }
        }
        dirty[id] = 0;
      }
      dirtyCount = 0;
    },
    dispose() {
      if (root.parentNode === container) root.remove();
    },
  };
}

/**
 * Reference implementation for the same generated template using a generic
 * CSR source-to-target graph. This keeps the input, projection, DOM output,
 * and source IDs identical to the specialized runtime so the browser study can
 * isolate identity-layout specialization in one session.
 */
export function mountRepeatedHostPlanCsr(
  sources: readonly RepeatedPlanSource[],
  container: HTMLElement,
  plan: RepeatedHostPlan,
  sharedSourceValues: readonly number[] = [],
): CompiledPlanMount {
  const root = document.createElement(plan.rootTag);
  setStaticProps(root, plan.rootProps);
  const targets: Array<(value: number) => void> = [];
  const edges: BindingEdge[] = [];
  if (plan.bindings.length === 0) throw new Error("Generated repeated plans require at least one binding");
  const { item: bindingIds, shared: sharedBindingIds } = validateDependencyGraphs(plan);
  const sourceCount = plan.dependencyGraph.sourceCount;
  const sharedSourceCount = plan.dependencyGraph.sharedSourceCount ?? 0;
  const sharedValues = Float64Array.from(sharedSourceValues);
  if (sharedValues.length !== sharedSourceCount) throw new Error("Shared source values must match the generated shared source count");
  const sharedOffsets = plan.dependencyGraph.sharedSourceBindingOffsets ?? [0];

  for (const source of sources) {
    if (!Number.isInteger(source.id) || source.id < 0 || source.id >= sources.length) {
      throw new Error("Generated repeated plans require dense source IDs starting at zero");
    }
    const element = document.createElement(plan.itemTag);
    setStaticProps(element, plan.itemProps);
    for (let slot = 0; slot < sourceCount; slot++) {
      const sourceId = source.id * sourceCount + slot;
      const value = sourceValue(source, slot, sourceCount);
      const start = plan.dependencyGraph.sourceBindingOffsets[slot];
      const end = plan.dependencyGraph.sourceBindingOffsets[slot + 1];
      for (let dependency = start; dependency < end; dependency++) {
        const binding = plan.bindings[bindingIds[dependency]];
        const target = targets.length;
        const write = (nextValue: number) => setStyle(element, binding.property, binding.project(nextValue));
        targets.push(write);
        edges.push([sourceId, target]);
        write(value);
      }
    }
    for (let slot = 0; slot < sharedSourceCount; slot++) {
      const value = sharedValues[slot];
      for (let dependency = sharedOffsets[slot]; dependency < sharedOffsets[slot + 1]; dependency++) {
        const binding = plan.bindings[sharedBindingIds[dependency]];
        const target = targets.length;
        const write = (nextValue: number) => setStyle(element, binding.property, binding.project(nextValue));
        targets.push(write);
        edges.push([sources.length * sourceCount + slot, target]);
        write(value);
      }
    }
    root.appendChild(element);
  }

  container.replaceChildren(root);
  const sharedBase = sources.length * sourceCount;
  const graph = new CompiledBindings(sharedBase + sharedSourceCount, targets.length, edges);
  for (const source of sources) {
    for (let slot = 0; slot < sourceCount; slot++) {
      graph.set(source.id * sourceCount + slot, sourceValue(source, slot, sourceCount));
    }
  }
  for (let slot = 0; slot < sharedSourceCount; slot++) graph.set(sharedBase + slot, sharedValues[slot]);

  return {
    get bindingCount() { return targets.length; },
    set(entityId, value, sourceSlot = 0) {
      if (!Number.isInteger(entityId) || entityId < 0 || entityId >= sources.length ||
        !Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= sourceCount) {
        throw new RangeError(`Generated plan entity or source slot out of range: ${entityId}/${sourceSlot}`);
      }
      graph.set(entityId * sourceCount + sourceSlot, value);
    },
    setShared(sourceSlot, value) {
      if (!Number.isInteger(sourceSlot) || sourceSlot < 0 || sourceSlot >= sharedSourceCount) {
        throw new RangeError(`Generated plan shared source slot out of range: ${sourceSlot}`);
      }
      graph.set(sharedBase + sourceSlot, value);
    },
    flush() {
      graph.flush((target, value) => targets[target](value), false);
    },
    dispose() {
      if (root.parentNode === container) root.remove();
    },
  };
}
