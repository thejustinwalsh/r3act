import type { BufferGeometry, Color, ColorRepresentation, Euler, Material, Object3D, Vector2, Vector3, Vector4 } from "three";
import type { RuntimeNode } from "./jsx_binding_runtime.ts";
import type { NativeThreePointerEvent } from "./three_host.ts";
/** Instances supported by the current Three host's object/resource lifecycle. */
export type ThreeHostInstance = Object3D | BufferGeometry | Material;
export type ThreeRef<T extends ThreeHostInstance> = ((instance: T | null) => unknown) | {
    current: T | null;
};
type ConcreteConstructor = new (...args: any[]) => any;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type IsSupportedConstructor<C> = C extends ConcreteConstructor ? IsAny<InstanceType<C>> extends true ? false : InstanceType<C> extends ThreeHostInstance ? true : false : false;
type ConstructorKeys<Namespace> = {
    [Key in keyof Namespace]-?: IsSupportedConstructor<Namespace[Key]> extends true ? Key : never;
}[keyof Namespace] & string;
type LowerInitial<Tag extends string> = Uncapitalize<Tag>;
type Vector2Value = Vector2 | number | readonly [number, number];
type Vector3Value = Vector3 | number | readonly [number, number, number];
type Vector4Value = Vector4 | number | readonly [number, number, number, number];
type EulerValue = Euler | readonly [number, number, number];
type ColorValue = Color | ColorRepresentation;
type DataValue<Value> = Value extends (...args: any[]) => unknown ? never : Value extends Vector2 ? Vector2Value : Value extends Vector3 ? Vector3Value : Value extends Vector4 ? Vector4Value : Value extends Euler ? EulerValue : Value extends Color ? ColorValue : Value;
type ReservedProp = "key" | "ref" | "children" | "args" | "attach";
type IfEquals<X, Y, Yes = true, No = false> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? Yes : No;
type ReadonlyKeys<Instance> = {
    [Key in keyof Instance]-?: IfEquals<{
        [Property in Key]: Instance[Key];
    }, {
        -readonly [Property in Key]: Instance[Key];
    }, never, Key>;
}[keyof Instance];
type HostMutableReadonlyValue<Value> = Value extends Vector2 | Vector3 | Vector4 | Euler | Color ? true : false;
type InstanceDataProps<Instance> = {
    [Key in keyof Instance as Key extends string ? Key extends ReservedProp ? never : Instance[Key] extends (...args: any[]) => unknown ? never : Key extends ReadonlyKeys<Instance> ? HostMutableReadonlyValue<Instance[Key]> extends true ? Key : never : Key : never]?: DataValue<Instance[Key]> | null;
};
type PropsFor<C extends ConcreteConstructor> = InstanceDataProps<InstanceType<C>> & ([] extends ConstructorParameters<C> ? {
    args?: ConstructorParameters<C>;
} : {
    args: ConstructorParameters<C>;
}) & {
    [Event in `onPointer${"Down" | "Up" | "Move" | "Enter" | "Leave" | "Over" | "Out" | "Cancel"}`]?: (event: NativeThreePointerEvent) => void;
} & {
    key?: string | number | null;
    ref?: ThreeRef<InstanceType<C>>;
    children?: RuntimeNode;
    attach?: string;
};
/**
 * Inferred JSX props for constructable Three exports whose instances are
 * Object3D, BufferGeometry, or Material. It is a type map only; tags still
 * are resolved by the selected Three host and its registry.
 */
export type ThreeIntrinsicElements<Namespace = typeof import("three")> = {
    [Key in ConstructorKeys<Namespace> as LowerInitial<Key>]: PropsFor<Extract<Namespace[Key], ConcreteConstructor>>;
};
export {};
//# sourceMappingURL=three_intrinsic_types.d.ts.map