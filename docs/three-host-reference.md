# Public Three host reference

**Status:** private alpha. This page describes the current `@r3act/host-three` package surface for an author using local `@r3act/*` tarballs. For installation and compiler setup, use the [package guide](../native-package-integration.md); for supported component syntax, use the [native authoring reference](native-authoring-reference.md). The [installed scene](../examples/installed-scene/README.md) is the public-import example.

## Imports and TSX types

Import native state, stores and hooks from `@r3act/core`; import the Three root and host functions from `@r3act/host-three`. Native TSX requires `nativeModulePlugin()` from `@r3act/vite`, including when its JSX types are accepted by TypeScript. A Three TSX module can select the host-specific intrinsic map while a DOM module uses the project's `@r3act/core` default:

This is the `ScenePosition` excerpt from the installed example:

```tsx
/** @jsxImportSource @r3act/host-three */
// @native-ui
import { use } from "@r3act/core";
import type { SceneDomain } from "./state";

export function ScenePosition(props: { point: SceneDomain["point"] }) {
  const x = use(props.point);
  return <mesh key="cursor" name="cursor" position={[x, 0, 0]} />;
}
```

The complete [installed `scene.tsx`](../examples/installed-scene/scene.tsx) uses the same import source and direct native imports. The package exports `ThreeIntrinsicElements`, `ThreeHostInstance`, `ThreeRef`, `createThreeHost`, `createThreeNativeRoot`, `dispatchThreePointerEvent`, `raycastThreePointer`, and the related host types through its main entry (`packages/host-three/package.json` re-exports the core Three entry). The JSX runtime subpaths select Three's intrinsic types; they do not replace compiler lowering. The default map derives supported constructor tags, arguments, mutable data props and instance refs from the public Three namespace. A custom namespace can use `ThreeIntrinsicElements<typeof catalog>` and generated JSX declarations; type generation does not make every namespace export renderable.

## Root and scene ownership

`createThreeNativeRoot(scene, options?)` creates a `ThreeHost` and a native root on a caller-owned `THREE.Object3D` scene, returning `{ host, root, dispose() }`. `rootOptions` accepts the same native root options as other hosts, including a shared World and a root ID. The [installed application](../examples/installed-scene/main.tsx) uses:

```tsx
import { createWorld } from "@r3act/core";
import { createThreeNativeRoot } from "@r3act/host-three";
import { Scene } from "three";

const world = createWorld();
const scene = new Scene();
const three = createThreeNativeRoot(scene, {
  rootOptions: { world, rootId: "installed-three" },
});
// Mount the compiled scene component for this application's domain.
// When this root's lifetime ends: three.dispose().
```

The application owns the supplied scene, renderer, render loop and any borrowed assets. The root wrapper disposes native owners before its host; its `dispose()` is idempotent and aggregates cleanup errors. JSX-created geometry/material resources are host-owned and disposed once. Geometry/material values supplied through mesh constructor `args` or a `<primitive object={...}>` are borrowed; the caller disposes them after all users finish. The installed scene checks both lifetimes. A Three object graph alone does not establish WebGL presentation.

## Elements, props and extension

`createThreeHost({ namespace, registry, propertyWriters, propertyCapabilities })` accepts an optional constructor namespace, explicit factory overrides and custom property writers. Factories return `Object3D`, `BufferGeometry` or `Material`. Constructor `args`, primitive `object` and attachment identity are fixed for a mounted element; change its key to replace it. Resource children attach to geometry/material or an explicit `attach` property. Ordinary mutable Three fields and nested dash paths use host property writers; invalid paths and malformed tuples are rejected.

`describePropertyWrite(handle, name, next)` reports an observed value policy of `scalar`, `copy`, `borrow-call`, `retain` or `unknown`, and identifies target/value resources as `owned`, `borrowed` or `shared-owned` when applicable. A custom writer without a matching `propertyCapabilities` declaration reports `unknown`. Descriptions can throw and do not establish callback purity, no-throw writes or compiled-cut admission. A `copy` declaration requires the writer to keep an independent copy after the call; a `retain` writer may keep the caller's value. The [public Canvas host example](../examples/custom-host/README.md) shows a separate consumer-defined `VDOMHost` without private reconciler imports.

## Events, refs and publication

Three `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerEnter`, `onPointerLeave`, `onPointerOver`, `onPointerOut` and `onPointerCancel` handlers receive `NativeThreePointerEvent` with target/object and optional intersection/native-event fields. `host.dispatchPointerEvent(...)`, `dispatchThreePointerEvent(...)` and `raycastThreePointer(...)` connect application raycasting to those handlers. The application owns its DOM listeners and renderer/camera bootstrap. These native callbacks do not promise React synthetic events, ancestor bubbling, hover/capture policy or full R3F event parity. Refs expose raw Three instances after native publication.

Declared DOM/Three transactions coordinate managed accepted state; required Three writes must finish before the application calls `renderer.render` for that view. Arbitrary custom setters can observe intermediate physical writes and may leave partial mutations if they throw. The affected root keeps old managed accepted history and requires disposal/remount after terminal host failure. The renderer's displayed frames and React islands have separate publication boundaries; cross-renderer visual atomicity is not established. Shared mutable Three resources also have one physical state across roots, so independently projected values require separate resource ownership.

The current example and finite host tests establish object-scene behavior and resource lifetime. Physical GPU presentation, broad R3F compatibility, equivalent-feature bundle size and general performance remain separate qualification work. The older [checkout Three guide](../three-host-api.md) preserves dated private-source examples and milestones.
