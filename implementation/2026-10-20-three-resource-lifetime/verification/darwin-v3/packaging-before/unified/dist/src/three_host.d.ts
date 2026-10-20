import * as THREE from "three";
import type { Intersection } from "three";
import { type HostCopyValueCapture, type HostPropertyCapability, type HostValuePolicy } from "./host_property_contract.ts";
export type { ThreeIntrinsicElements, ThreeHostInstance, ThreeRef } from "./three_intrinsic_types.ts";
import { type NativeRootOptions, type VDOMHost } from "./native_runtime_api.ts";
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
export type ThreeHostFactory = (args: readonly unknown[], props: Readonly<Record<string, unknown>>) => THREE.Object3D | THREE.BufferGeometry | THREE.Material;
export type ThreeHostFactoryRegistry = Readonly<Record<string, ThreeHostFactory>>;
export type ThreePropertyWriter = (handle: ThreeHandle, value: unknown, previous: unknown) => void;
export type ThreeHostPropertyRegistry = Readonly<Record<string, ThreePropertyWriter>>;
export interface ThreeHostDiagnostics {
    readonly createdResources: number;
    readonly disposedResources: number;
    readonly liveResources: number;
    readonly liveHandles: number;
    readonly eventRegistrations: number;
}
export interface ThreeHost extends VDOMHost<ThreeHandle, ThreeParent> {
    readonly diagnostics: ThreeHostDiagnostics;
    capturePropertyValue(handle: ThreeHandle, name: string, next: unknown): HostCopyValueCapture | null;
    describePropertyWrite(handle: ThreeHandle, name: string, next: unknown): HostPropertyCapability;
    dispatchPointerEvent(target: THREE.Object3D | ThreeObjectHandle, type: string, intersection?: Intersection<THREE.Object3D>, nativeEvent?: Event): boolean;
    dispose(handle: ThreeHandle): void;
    dispose(): void;
    getPublicInstance(handle: ThreeHandle): THREE.Object3D | THREE.BufferGeometry | THREE.Material;
}
export interface ThreeHostOptions {
    readonly registry?: ThreeHostFactoryRegistry;
    readonly propertyWriters?: ThreeHostPropertyRegistry;
    readonly propertyCapabilities?: Readonly<Record<string, HostValuePolicy>>;
    readonly namespace?: object;
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
export declare const threeHostFactoryRegistry: ThreeHostFactoryRegistry;
export declare const threeHostPropertyRegistry: ThreeHostPropertyRegistry;
export declare const nativePointerEvent: (type: string, intersection?: Intersection<THREE.Object3D>, nativeEvent?: Event) => NativeThreePointerEvent;
export declare function createThreeHost(options?: ThreeHostOptions): ThreeHost;
export declare const dispatchThreePointerEvent: (host: ThreeHost, type: string, intersection: Intersection<THREE.Object3D>) => boolean;
export declare const raycastThreePointer: (host: ThreeHost, raycaster: THREE.Raycaster, scene: THREE.Object3D, type: string) => readonly Intersection<THREE.Object3D>[];
export declare const createThreeNativeRoot: (scene: THREE.Object3D, options?: ThreeHostOptions & {
    readonly rootOptions?: NativeRootOptions;
}) => {
    host: ThreeHost;
    root: import("./component_state_runtime.ts").ComponentStateRoot<ThreeHandle, ThreeParent>;
    dispose(): void;
};
//# sourceMappingURL=three_host.d.ts.map