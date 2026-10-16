import * as THREE from "three";
import type { Intersection } from "three";
import { createThreePropertyWriterResolver } from "./three_property_writer.ts";
export type { ThreeIntrinsicElements, ThreeHostInstance, ThreeRef } from "./three_intrinsic_types.ts";
import {
  createNativeRoot,
  type NativeRootOptions,
  type VDOMHost,
} from "./native_runtime_api.ts";

export type ThreeParent = THREE.Object3D | ThreeHandle;

export type ThreeObjectHandle = {
  readonly kind: "object";
  readonly tag: string;
  readonly object: THREE.Object3D;
  readonly owned: boolean;
  readonly creationArgs: readonly unknown[];
  live: boolean;
  originalParent?: THREE.Object3D | null;
  originalIndex?: number;
};

export type ThreeResourceHandle = {
  readonly kind: "resource";
  readonly tag: string;
  readonly resource: THREE.BufferGeometry | THREE.Material;
  readonly resourceKind: "geometry" | "material";
  readonly owned: boolean;
  readonly creationArgs: readonly unknown[];
  readonly requestedAttachment?: string;
  live: boolean;
  attachment?: {
    readonly parent: THREE.Object3D;
    readonly property: string;
    readonly previous: unknown;
  };
};

export type ThreeHandle = ThreeObjectHandle | ThreeResourceHandle;

export type ThreeHostFactory = (
  args: readonly unknown[],
  props: Readonly<Record<string, unknown>>,
) => THREE.Object3D | THREE.BufferGeometry | THREE.Material;

export type ThreeHostFactoryRegistry = Readonly<
  Record<string, ThreeHostFactory>
>;

export type ThreePropertyWriter = (
  handle: ThreeHandle,
  value: unknown,
  previous: unknown,
) => void;

export type ThreeHostPropertyRegistry = Readonly<
  Record<string, ThreePropertyWriter>
>;

export interface ThreeHostDiagnostics {
  readonly createdResources: number;
  readonly disposedResources: number;
  readonly liveResources: number;
  readonly liveHandles: number;
  readonly eventRegistrations: number;
}

export interface ThreeHost extends VDOMHost<ThreeHandle, ThreeParent> {
  readonly diagnostics: ThreeHostDiagnostics;
  dispatchPointerEvent(
    target: THREE.Object3D | ThreeObjectHandle,
    type: string,
    intersection?: Intersection<THREE.Object3D>,
    nativeEvent?: Event,
  ): boolean;
  dispose(handle: ThreeHandle): void;
  dispose(): void;
  getPublicInstance(
    handle: ThreeHandle,
  ): THREE.Object3D | THREE.BufferGeometry | THREE.Material;
}

export interface ThreeHostOptions {
  readonly registry?: ThreeHostFactoryRegistry;
  readonly propertyWriters?: ThreeHostPropertyRegistry;
  readonly namespace?: object;
}

interface AttachmentState {
  readonly baseValue: unknown;
  readonly handles: ThreeResourceHandle[];
}

export interface NativeThreePointerEvent {
  readonly type: string;
  readonly target: THREE.Object3D;
  readonly object: THREE.Object3D;
  readonly intersection?: Intersection<THREE.Object3D>;
  readonly nativeEvent?: Event;
  readonly point?: Intersection<THREE.Object3D>["point"];
  readonly distance?: number;
  readonly face?: Intersection<THREE.Object3D>["face"];
  readonly uv?: Intersection<THREE.Object3D>["uv"];
  readonly instanceId?: number;
}

const defaultPropertyWriters: Record<string, ThreePropertyWriter> = {
  args: (handle, value, previous) => {
    if (previous !== undefined && !sameArgs(value, previous)) {
      throw new Error(
        `Three args for <${handle.tag}> are immutable; change the element key to replace the object.`,
      );
    }
    if (previous === undefined && !sameArgs(value, handle.creationArgs)) {
      throw new Error(
        `Three args for <${handle.tag}> changed during creation.`,
      );
    }
  },
  attach: (handle, value, previous) => {
    if (previous !== undefined && value !== previous) {
      throw new Error(
        `Three attach for <${handle.tag}> is immutable; change the element key to replace the attachment.`,
      );
    }
  },
  object: (handle, value, previous) => {
    if (previous !== undefined && value !== previous) {
      throw new Error(
        "Three <primitive> object is immutable; change the element key to replace it.",
      );
    }
    const expected = handle.kind === "object" ? handle.object : handle.resource;
    if (value !== expected) {
      throw new Error(
        "Three <primitive> object prop must remain the same borrowed Three object.",
      );
    }
  },

};

type ThreeConstructorResolution =
  | {
    readonly kind: "constructor";
    readonly exportName: string;
    readonly constructor: Function;
  }
  | { readonly kind: "not-constructor"; readonly exportName: string }
  | undefined;

const firstUpper = (value: string) =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const isConstructable = (value: unknown): value is Function => {
  if (typeof value !== "function") return false;
  try {
    Reflect.construct(String, [], value);
    return true;
  } catch {
    return false;
  }
};

const resolveThreeConstructor = (
  namespace: object,
  tag: string,
): ThreeConstructorResolution => {
  const names = tag === firstUpper(tag) ? [tag] : [tag, firstUpper(tag)];
  for (const exportName of names) {
    if (!Object.hasOwn(namespace, exportName)) continue;
    const candidate = Reflect.get(namespace, exportName) as unknown;
    if (isConstructable(candidate)) {
      return { kind: "constructor", exportName, constructor: candidate };
    }
    return { kind: "not-constructor", exportName };
  }
  return undefined;
};

const constructorFactory =
  (constructor: Function): ThreeHostFactory => (args) =>
    Reflect.construct(constructor, [...args]) as
      | THREE.Object3D
      | THREE.BufferGeometry
      | THREE.Material;

const namespaceFactories = (
  namespace: object,
): Record<string, ThreeHostFactory> => {
  const factories: Record<string, ThreeHostFactory> = {};
  for (const [exportName, candidate] of Object.entries(namespace)) {
    if (isConstructable(candidate)) {
      factories[exportName[0].toLowerCase() + exportName.slice(1)] =
        constructorFactory(candidate);
    }
  }
  return factories;
};

export const threeHostFactoryRegistry: ThreeHostFactoryRegistry = Object.freeze(
  {
    ...namespaceFactories(THREE),
  },
);

export const threeHostPropertyRegistry: ThreeHostPropertyRegistry = Object
  .freeze({
    ...defaultPropertyWriters,
  });

const sameArgs = (next: unknown, previous: unknown): boolean =>
  Array.isArray(next) && Array.isArray(previous) &&
  next.length === previous.length &&
  next.every((value, index) => Object.is(value, previous[index]));

const objectFor = (handle: ThreeHandle): THREE.Object3D => {
  if (handle.kind !== "object") {
    throw new Error(
      `Three <${handle.tag}> is a resource and cannot contain children.`,
    );
  }
  return handle.object;
};

const objectForParent = (parent: ThreeParent): THREE.Object3D =>
  parent instanceof THREE.Object3D ? parent : objectFor(parent);

const resourceType = (
  value: THREE.Object3D | THREE.BufferGeometry | THREE.Material,
): "object" | "geometry" | "material" => {
  if (value instanceof THREE.Object3D) return "object";
  if (value instanceof THREE.BufferGeometry) return "geometry";
  if (value instanceof THREE.Material) return "material";
  throw new TypeError(
    "Three host factory must return an Object3D, BufferGeometry, or Material.",
  );
};

// Conversion is generic; projection invalidation is an explicit host policy.
const invalidateProjection = (_root: object, target: object, name: string) => {
  const camera = target as { isCamera?: boolean; updateProjectionMatrix?: () => void };
  if (camera.isCamera && typeof camera.updateProjectionMatrix === "function" &&
    ["fov", "aspect", "near", "far", "zoom", "left", "right", "top", "bottom"].includes(name)) camera.updateProjectionMatrix();
};

const materialFor = (handle: ThreeHandle): THREE.Material => {
  const instance = handle.kind === "object" ? handle.object : handle.resource;
  if (instance instanceof THREE.Material) return instance;
  const material = (instance as THREE.Mesh).material;
  if (!material || Array.isArray(material)) throw new Error(`Three <${handle.tag}> requires an indexed path for material arrays.`);
  return material;
};

const eventTypeForProp = (name: string): string | undefined => {
  const match = /^onPointer(Down|Up|Move|Enter|Leave|Over|Out|Cancel)$/.exec(
    name,
  );
  return match ? `pointer${match[1].toLowerCase()}` : undefined;
};

export const nativePointerEvent = (
  type: string,
  intersection?: Intersection<THREE.Object3D>,
  nativeEvent?: Event,
): NativeThreePointerEvent => {
  if (!type.startsWith("pointer")) {
    throw new TypeError(`Unsupported Three native event type "${type}".`);
  }
  const object = intersection?.object;
  if (!object) {
    throw new TypeError(
      "A Three pointer event requires an intersection with an Object3D.",
    );
  }
  return {
    type,
    target: object,
    object,
    intersection,
    nativeEvent,
    point: intersection.point,
    distance: intersection.distance,
    face: intersection.face,
    uv: intersection.uv,
    instanceId: intersection.instanceId,
  };
};

export function createThreeHost(options: ThreeHostOptions = {}): ThreeHost {
  const customFactories = { ...options.registry };
  const namespace = options.namespace ?? THREE;
  const constructorCache = new Map<string, ThreeConstructorResolution | null>();
  const propertyWriters = {
    ...threeHostPropertyRegistry,
    ...options.propertyWriters,
  };
  const propertyResolvers = new WeakMap<ThreeHandle, ReturnType<typeof createThreePropertyWriterResolver>>();
const writeGenericProp = (handle: ThreeHandle, name: string, value: unknown) => {
  let instance: object = handle.kind === "object" ? handle.object : handle.resource;
  // Legacy mesh aliases coexist with generic instance fields and nested paths.
  if (!(name in instance) && !name.includes("-") && handle.kind === "object" &&
    "material" in instance && name in materialFor(handle)) instance = materialFor(handle);
  let resolver = propertyResolvers.get(handle);
  if (!resolver) propertyResolvers.set(handle, resolver = createThreePropertyWriterResolver());
  const writer = resolver.resolve(instance, name);
  if (value == null) writer.reset(invalidateProjection);
  else writer.write(value, invalidateProjection);
};

  const objectHandles = new WeakMap<THREE.Object3D, ThreeObjectHandle>();
  const eventHandlers = new Map<
    THREE.Object3D,
    Map<string, (event: NativeThreePointerEvent) => void>
  >();
  const handles = new Set<ThreeHandle>();
  const liveResources = new Set<THREE.BufferGeometry | THREE.Material>();
  const disposedResources = new WeakSet<
    THREE.BufferGeometry | THREE.Material
  >();
  const pendingMaterialProps = new WeakMap<
    THREE.Object3D,
    Map<string, unknown>
  >();
  const attachmentStates = new WeakMap<
    THREE.Object3D,
    Map<string, AttachmentState>
  >();
  let createdResourceCount = 0;
  let disposedResourceCount = 0;
  let hostDisposed = false;
  const fallbackGeometry = new THREE.BufferGeometry();
  const fallbackMaterial = new THREE.MeshBasicMaterial();

  const ownResource = <T extends THREE.BufferGeometry | THREE.Material>(
    resource: T,
  ) => {
    liveResources.add(resource);
    createdResourceCount++;
    return resource;
  };

  const disposeResource = (resource: THREE.BufferGeometry | THREE.Material) => {
    if (disposedResources.has(resource)) return;
    disposedResources.add(resource);
    if (liveResources.delete(resource)) disposedResourceCount++;
    resource.dispose();
  };

  const removeEvents = (object: THREE.Object3D) => {
    eventHandlers.delete(object);
  };

  const restoreBorrowedObject = (handle: ThreeObjectHandle) => {
    if (!handle.originalParent) return;
    handle.originalParent.add(handle.object);
    const current = handle.originalParent.children.indexOf(handle.object);
    if (current >= 0) handle.originalParent.children.splice(current, 1);
    const index = Math.max(
      0,
      Math.min(
        handle.originalIndex ?? 0,
        handle.originalParent.children.length,
      ),
    );
    handle.originalParent.children.splice(index, 0, handle.object);
  };

  const releaseHandle = (handle: ThreeHandle, errors: unknown[] = []) => {
    if (!handle.live) return;
    handle.live = false;
    handles.delete(handle);
    propertyResolvers.delete(handle);
    try {
      if (handle.kind === "object") {
        removeEvents(handle.object);
        if (!handle.owned) restoreBorrowedObject(handle);
      } else {
        restoreAttachment(handle);
        if (handle.owned) disposeResource(handle.resource);
      }
    } catch (error) {
      errors.push(error);
    }
  };

  const restoreAttachment = (handle: ThreeResourceHandle) => {
    const attachment = handle.attachment;
    if (!attachment) return;
    const parent = attachment.parent as unknown as Record<string, unknown>;
    const propertyStates = attachmentStates.get(attachment.parent);
    const state = propertyStates?.get(attachment.property);
    const isCurrent = parent[attachment.property] === handle.resource;
    if (state) {
      const index = state.handles.indexOf(handle);
      if (index >= 0) state.handles.splice(index, 1);
      if (isCurrent) {
        const replacement = state.handles.at(-1);
        parent[attachment.property] = replacement?.resource ?? state.baseValue;
      }
      if (state.handles.length === 0) {
        propertyStates?.delete(attachment.property);
      }
    } else if (isCurrent) {
      parent[attachment.property] = attachment.previous;
    }
    handle.attachment = undefined;
  };

  const attachResource = (
    parent: THREE.Object3D,
    handle: ThreeResourceHandle,
    requested?: string,
  ) => {
    if (handle.attachment?.parent === parent) return;
    restoreAttachment(handle);
    const property = requested ?? handle.resourceKind;
    if (!(property in parent)) {
      throw new Error(
        `Cannot attach Three ${handle.resourceKind} to Object3D property "${property}".`,
      );
    }
    const parentProperties = parent as unknown as Record<string, unknown>;
    const previous = parentProperties[property];
    const propertyStates = attachmentStates.get(parent) ??
      new Map<string, AttachmentState>();
    let state = propertyStates.get(property);
    if (!state) {
      state = { baseValue: previous, handles: [] };
      propertyStates.set(property, state);
      attachmentStates.set(parent, propertyStates);
    }
    state.handles.push(handle);
    parentProperties[property] = handle.resource;
    handle.attachment = { parent, property, previous };
    if (property === "material" && handle.resource instanceof THREE.Material) {
      const pending = pendingMaterialProps.get(parent);
      if (pending) {
        const parentHandle = objectHandles.get(parent);
        if (!parentHandle) {
          throw new Error(
            "Three material attachment has no owning Object3D handle.",
          );
        }
        for (const [name, value] of pending) {
          const writer = propertyWriters[`material-${name}`];
          if (writer) writer(parentHandle, value, undefined);
          else writeGenericProp(parentHandle, `material-${name}`, value);
        }
      }
    }
  };

  const host: ThreeHost = {
    get diagnostics() {
      let eventRegistrations = 0;
      for (const handlers of eventHandlers.values()) {
        eventRegistrations += handlers.size;
      }
      return Object.freeze({
        createdResources: createdResourceCount,
        disposedResources: disposedResourceCount,
        liveResources: liveResources.size,
        liveHandles: handles.size,
        eventRegistrations,
      });
    },
    createElement(tag, parent, creationProps = {}) {
      if (hostDisposed) throw new Error("Three host is disposed.");
      if (creationProps.args !== undefined && !Array.isArray(creationProps.args)) throw new TypeError("Three constructor args must be an array.");
      const args = Array.isArray(creationProps.args) ? creationProps.args : [];
      let produced: THREE.Object3D | THREE.BufferGeometry | THREE.Material;
      let owned = tag !== "primitive";
      if (tag === "primitive") {
        const primitive = creationProps.object;
        if (
          !(primitive instanceof THREE.Object3D ||
            primitive instanceof THREE.BufferGeometry ||
            primitive instanceof THREE.Material)
        ) {
          throw new TypeError(
            "Three <primitive> requires an Object3D, BufferGeometry, or Material object prop.",
          );
        }
        produced = primitive;
        owned = false;
      } else {
        const customFactory = customFactories[tag];
        if (customFactory) {
          produced = customFactory(args, creationProps);
        } else {
          if (!constructorCache.has(tag)) {
            constructorCache.set(
              tag,
              resolveThreeConstructor(namespace, tag) ?? null,
            );
          }
          const resolution = constructorCache.get(tag) ?? undefined;
          if (resolution?.kind === "not-constructor") {
            throw new TypeError(
              `Three namespace export ${resolution.exportName} for <${tag}> is not constructable.`,
            );
          }
          if (!resolution) {
            throw new Error(`Unsupported Three host tag <${tag}>.`);
          }
          // Default Mesh resources are host-owned fallbacks, not hidden
          // constructor allocations. All explicit arguments retain Three semantics.
          const constructorArgs = resolution.constructor === THREE.Mesh
            ? [args[0] ?? fallbackGeometry, args[1] ?? fallbackMaterial, ...args.slice(2)]
            : args;
          produced = constructorFactory(resolution.constructor)(constructorArgs, creationProps);
        }
      }
      const kind = resourceType(produced);
      const handle: ThreeHandle = kind === "object"
        ? {
          kind,
          tag,
          object: produced as THREE.Object3D,
          owned,
          creationArgs: args,
          live: true,
          ...(tag === "primitive"
            ? {
              originalParent: (produced as THREE.Object3D).parent,
              originalIndex:
                (produced as THREE.Object3D).parent?.children.indexOf(
                  produced as THREE.Object3D,
                ) ?? -1,
            }
            : {}),
        }
        : {
          kind: "resource",
          tag,
          resource: produced as THREE.BufferGeometry | THREE.Material,
          resourceKind: kind,
          owned,
          creationArgs: args,
          ...(typeof creationProps.attach === "string"
            ? { requestedAttachment: creationProps.attach }
            : {}),
          live: true,
        };
      if (handle.kind === "object") objectHandles.set(handle.object, handle);
      else if (owned) ownResource(handle.resource);
      handles.add(handle);
      // Resource elements attach at insertion, after their parent exists.
      void parent;
      return handle;
    },
    createText() {
      throw new Error(
        "Three host does not support text children; use numeric or vector props instead.",
      );
    },
    setText() {
      throw new Error("Three host does not support text children.");
    },
    setProp(handle, name, value, previous) {
      if (hostDisposed) throw new Error("Three host is disposed.");
      const eventType = eventTypeForProp(name);
      if (eventType) {
        if (handle.kind !== "object") {
          throw new Error(`Three event ${name} requires an Object3D target.`);
        }
        const handlers = eventHandlers.get(handle.object) ?? new Map();
        if (typeof value === "function") {
          handlers.set(
            eventType,
            value as (event: NativeThreePointerEvent) => void,
          );
          eventHandlers.set(handle.object, handlers);
        } else {
          handlers.delete(eventType);
          if (handlers.size === 0) eventHandlers.delete(handle.object);
        }
        return;
      }
      if (handle.kind === "object" && name.startsWith("material-")) {
        const materialProperty = name.slice("material-".length);
        const pending = pendingMaterialProps.get(handle.object) ??
          new Map<string, unknown>();
        if (value == null) pending.delete(materialProperty);
        else pending.set(materialProperty, value);
        pendingMaterialProps.set(handle.object, pending);
        const activeMaterial = (handle.object as THREE.Mesh).material;
        if (
          activeMaterial === fallbackMaterial &&
          !(materialProperty.split("-")[0] in activeMaterial)
        ) return;
      }
      const writer = propertyWriters[name];
      if (writer) writer(handle, value, previous);
      else writeGenericProp(handle, name, value);
    },
    place(parent, handle, before) {
      if (!handle.live) {
        throw new Error(`Cannot place disposed Three <${handle.tag}>.`);
      }
      const target = objectForParent(parent);
      if (handle.kind === "resource") {
        attachResource(target, handle, handle.requestedAttachment);
        return;
      }
      const object = handle.object;
      target.add(object);
      const current = target.children.indexOf(object);
      if (current >= 0) target.children.splice(current, 1);
      if (before) {
        const index = before.kind === "object"
          ? target.children.indexOf(before.object)
          : -1;
        if (index >= 0) target.children.splice(index, 0, object);
        else target.children.push(object);
      } else target.children.push(object);
    },
    remove(parent, handle) {
      if (handle.kind === "resource") {
        restoreAttachment(handle);
        return;
      }
      const target = objectForParent(parent);
      if (!handle.owned && handle.originalParent) {
        restoreBorrowedObject(handle);
      } else {
        target.remove(handle.object);
      }
    },
    dispose(handle?: ThreeHandle) {
      if (handle) {
        const errors: unknown[] = [];
        releaseHandle(handle, errors);
        if (errors.length) {
          throw new AggregateError(errors, "Three node cleanup failed.");
        }
        return;
      }
      if (hostDisposed) return;
      hostDisposed = true;
      const errors: unknown[] = [];
      for (const remaining of [...handles]) {
        releaseHandle(remaining, errors);
        if (
          remaining.kind === "object" &&
          (remaining.owned || !remaining.originalParent)
        ) {
          try {
            remaining.object.parent?.remove(remaining.object);
          } catch (error) {
            errors.push(error);
          }
        }
      }
      for (const resource of [fallbackGeometry, fallbackMaterial]) {
        try {
          disposeResource(resource);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) {
        throw new AggregateError(errors, "Three host cleanup failed.");
      }
    },
    getPublicInstance(handle) {
      return handle.kind === "object" ? handle.object : handle.resource;
    },
    dispatchPointerEvent(target, type, intersection, nativeEvent) {
      const object = target instanceof THREE.Object3D ? target : target.object;
      const handlers = eventHandlers.get(object);
      const handler = handlers?.get(
        type.startsWith("onPointer") ? eventTypeForProp(type) ?? type : type,
      );
      if (!handler) return false;
      if (intersection && intersection.object !== object) {
        throw new Error(
          "Three pointer intersection target does not match the dispatched Object3D.",
        );
      }
      const hit = intersection ?? {
        object,
        point: object.getWorldPosition(new THREE.Vector3()),
        distance: 0,
        face: null,
        uv: undefined,
        instanceId: undefined,
      } as unknown as Intersection<THREE.Object3D>;
      handler(
        nativePointerEvent(
          type.startsWith("onPointer") ? eventTypeForProp(type)! : type,
          hit,
          nativeEvent,
        ),
      );
      return true;
    },
  };

  return host;
}

export const dispatchThreePointerEvent = (
  host: ThreeHost,
  type: string,
  intersection: Intersection<THREE.Object3D>,
): boolean =>
  host.dispatchPointerEvent(intersection.object, type, intersection);

export const raycastThreePointer = (
  host: ThreeHost,
  raycaster: THREE.Raycaster,
  scene: THREE.Object3D,
  type: string,
): readonly Intersection<THREE.Object3D>[] => {
  const intersections = raycaster.intersectObject(scene, true);
  for (const intersection of intersections) {
    dispatchThreePointerEvent(host, type, intersection);
  }
  return intersections;
};

export const createThreeNativeRoot = (
  scene: THREE.Object3D,
  options: ThreeHostOptions & { readonly rootOptions?: NativeRootOptions } = {},
) => {
  const host = createThreeHost(options);
  const root = createNativeRoot<ThreeHandle, ThreeParent>(
    host,
    scene,
    options.rootOptions,
  );
  let disposed = false;
  return {
    host,
    root,
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      try {
        root.dispose();
      } catch (error) {
        errors.push(error);
      } finally {
        try {
          host.dispose();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length) {
        throw new AggregateError(errors, "Three native root cleanup failed.");
      }
    },
  };
};
