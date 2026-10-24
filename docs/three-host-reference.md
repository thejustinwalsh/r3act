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

The application owns the supplied scene, renderer, render loop and any borrowed assets. The root wrapper disposes native owners before its host; its `dispose()` is idempotent and aggregates cleanup errors. A geometry or material returned by a non-primitive factory is host-owned. The host disposes that resource once after its final live handle is released, even when multiple factory elements return the same object or the last handle is a primitive alias. A primitive alias can precede the owning handle and still pins the resource after ownership is established. Geometry/material values supplied only through mesh constructor `args` or `<primitive object={...}>` remain borrowed; the caller disposes them after all users finish. The installed scene checks both lifetimes. A Three object graph alone does not establish WebGL presentation.

## Elements, props and extension

`createThreeHost({ namespace, registry, propertyWriters, propertyCapabilities })` accepts an optional constructor namespace, explicit factory overrides and custom property writers. Factories return `Object3D`, `BufferGeometry` or `Material`. Constructor `args`, primitive `object` and attachment identity are fixed for a mounted element; change its key to replace it. Resource children attach to geometry/material or an explicit `attach` property. Ordinary mutable Three fields and nested dash paths use host property writers; invalid paths and malformed tuples are rejected. One live host handle may represent a particular `Object3D` at a time; a second admission is rejected before it can replace the first handle's event mapping. A resource the host has already disposed cannot be admitted again.

Ownership is local to one Three host. A borrowed alias never makes a resource owned by itself, and a borrowed-only resource is never disposed by that host. Shared resources used by separate hosts require caller-managed coordination: each host only knows its own handles and ownership, so the caller must keep cross-host borrowed assets alive until every consumer has finished. This contract does not provide distributed or cross-renderer atomicity. Attachment restoration and owned-resource disposal are both attempted during handle cleanup; if either throws, errors are aggregated and the remaining host cleanup continues. A disposal listener may reenter host cleanup without causing a second disposal of the resource already being released. If a custom factory disposes the host before returning, its new owned geometry or material is disposed and admission fails; any cleanup error is reported with the retired-host error. An already borrowed resource returned during that callback remains caller-owned.

`describePropertyWrite(handle, name, next)` reports an observed value policy of `scalar`, `copy`, `borrow-call`, `retain` or `unknown`, and identifies target/value resources as `owned`, `borrowed` or `shared-owned` when applicable. `shared-owned` covers host fallbacks and a host-owned resource with multiple live aliases; after one alias remains, that resource is described as `owned`. A custom writer without a matching `propertyCapabilities` declaration reports `unknown`. Descriptions can throw and do not establish callback purity, no-throw writes or compiled-cut admission. A `copy` declaration requires the writer to keep an independent copy after the call; a `retain` writer may keep the caller's value. The [public Canvas host example](../examples/custom-host/README.md) shows a separate consumer-defined `VDOMHost` without private reconciler imports.

### Copied prop inputs

Host property capabilities explicitly report `mayThrow: true` and `mayReenter: true`, including scalar and copied values. These describe possible synchronous callbacks, not purity. Mounted Store bindings reuse static target geometry while retaining live writer checks around application.

An ordinary JSX prop can reuse a supported Vector2/3/4, Quaternion, Euler, Color, Matrix3/4 or numeric tuple input after changing its components. Trigger the normal component or source invalidation to publish that change; mutating an untracked global alone schedules no work. The Three adapter captures independent values for supported built-in `copy`/`fromArray` paths and compares them with its accepted component history. An unchanged input reference with unchanged components skips the write. A distinct input reference still reaches the writer, preserving observable Three change callbacks. Host object identity and resource ownership stay with the adapter.

This finite capture requires the installed built-in prototype/method and ordinary data-field layout. Accessors, unusual own fields, method/constructor overrides, custom property writers and other shapes retain the generic reference contract. A value equal to the host target itself preserves the existing no-op. Proxy reflection can execute caller code and does not certify purity. Descriptive `propertyCapabilities` alone does not opt a custom writer into capture.

Consumer-owned hosts can implement the optional `VDOMHost.capturePropertyValue(node, name, next)` data method before constructing the root. It returns `null` or a public `HostCopyValueCapture`: `{ kind: "copy", writeValue, comparison }`. `writeValue` must be an independent stable input with the writer's equivalent copy semantics; `comparison` contains the exported `HostCopyComparisonScalar` values. The runtime passes that exact input to the writer and privately copies the comparison tuple. Retaining writers keep their original references and equality behavior. Capture may run for a considered object prop even when the eventual write is skipped; it is a fallible host operation that can reenter, and its method must remain valid for the root's lifetime.

Copy history advances through the existing publication authority only after host success. A capture error or changed method follows the host failure contract, with old managed accepted history and quarantine where application has begun. Existing snapshots remain structural descriptions with their documented live binding references; copy comparison records are private. Capture does not grant compiler specialization, callback-free admission or cross-renderer visual atomicity. The [installed copy-host contract](../implementation/2026-10-19-host-value-diff/consumer/copy-host.ts) uses public packages only; [consolidated and installed results](../implementation/2026-10-19-host-value-diff/results.md) record the tested scope and costs.

## Events, refs and publication

Three `onPointerDown`, `onPointerUp`, `onPointerMove`, `onPointerEnter`, `onPointerLeave`, `onPointerOver`, `onPointerOut` and `onPointerCancel` handlers receive `NativeThreePointerEvent` with target/object and optional intersection/native-event fields. `host.dispatchPointerEvent(...)`, `dispatchThreePointerEvent(...)` and `raycastThreePointer(...)` connect application raycasting to those handlers. The application owns its DOM listeners and renderer/camera bootstrap. These native callbacks do not promise React synthetic events, ancestor bubbling, hover/capture policy or full R3F event parity. Refs expose raw Three instances after native publication.

Declared DOM/Three transactions coordinate managed accepted state; required Three writes must finish before the application calls `renderer.render` for that view. Arbitrary custom setters can observe intermediate physical writes and may leave partial mutations if they throw. The affected root keeps old managed accepted history and requires disposal/remount after terminal host failure. The renderer's displayed frames and React islands have separate publication boundaries; cross-renderer visual atomicity is not established. Shared mutable Three resources also have one physical state across roots, so independently projected values require separate resource ownership.

When several roots use the exact same `ThreeHost` object, their host writes and accepted publication share one host domain across direct calls and separate native work queues. A busy second root waits before invoking unknown component bodies or writing the scene. A declared group claims its host domains together; one group may include several roots using the same `ThreeHost` and a separate DOM host. A partial Three writer failure quarantines every root using that damaged host; dispose those roots and construct a fresh host for recovery. Merely sharing a scene, renderer or borrowed resource across distinct `ThreeHost` objects does not merge their publication domains or coordinate their resource lifetimes. This rule does not guarantee a single WebGL frame, cross-renderer visual atomicity, or rollback of a partially mutated Three object.

For grouped DOM/Three work, all members finish public validation before the group checks its private live receipts and starts the first host writer. A late callback can therefore revoke a Three or DOM member without leaving a partially applied group. A writer that actually begins and fails still requires quarantine and fresh-host recovery.

## Frame ownership

Native [`useFrame` and `FrameLoop`](native-authoring-reference.md#native-frame-hooks) express clock-derived and stateful motion through props. The built-in declarative driver currently owns one root. For explicit Store groups, `createNativeFrameLoop` from `@r3act/core` owns one RAF callback and coordinates explicitly selected root/Store participants through the existing publication queue. Components still declare their scene props with JSX and `use(clock)`. The controller starts paused:

```ts
const loop = createNativeFrameLoop({
  roots: [{ root: sceneRoot, stores: [clock] }],
  update({ deltaMs }) {
    clock.dispatch(frame => storeRecord({ phase: frame.phase + deltaMs * .001 }));
  },
  draw() { renderer.render(scene, camera); },
});
loop.start();
// On application teardown, dispose the loop before its roots and renderer.
```

`update` runs once for a new frame. The selected Store readers must qualify for scoped publication; opaque readers decline instead of replaying unknown component bodies. `draw` runs after every declared group member accepts. An unrelated pending health resource need not block an eligible clock group. A delayed group waits without accumulating updates; its completion is checked against participating roots' current publication versions before a later draw. Frame timing describes the requested update, not a guarantee that external Store dispatch stopped or that all pending root work was consumed. An intervening commit can require fresh preparation of the selected group.

`stop()` cancels the owned callback and pending work. `dispose()` additionally detaches the controller; it does not dispose caller-owned roots, Stores, renderers or GPU resources. Participant retirement disposes the controller. Update, scheduler, publication and draw errors stop automatic scheduling; a draw error occurs after publication and cannot roll accepted state back. Failed publications stay latched: later `advance()` returns the failure and `start()` throws its error. Failed partial host writes retain the existing quarantine rule; recover by remounting the damaged root and creating a new controller. Reentrant advancement is rejected. `start()` resets driver delta timing; the first update has zero delta, later deltas are clamped to 50 ms by default. Manual `advance(timeMs)` uses the same publication/draw path without browser globals; custom RAF request/cancel functions must be supplied together.

The [Three workbench](../src/browser/native_three_host.tsx) uses this controller, with ordinary scene scheduling for Studio controls and one explicit scene-clock group for motion. Its declarative epoch marker is observable diagnostics, not draw readiness authority. Existing `rootOptions.scheduleCommit` and `root.flush()` remain available for application scheduling; flush's boolean reports whether work published, not whether a particular frame input was consumed. A frame controller promises managed publication order, not a hard deadline, GPU presentation or cross-renderer visual atomicity.

DOM and canvas may consume shared state on different schedules. Use a declared publication group when the application requires outputs to advance together; sharing a Store does not automatically impose a draw barrier. Cancellation and disposal must release frame callbacks and registered setters as well as host resources.

The current example and finite host tests establish object-scene behavior and resource lifetime. Physical GPU presentation, broad R3F compatibility, equivalent-feature bundle size and general performance remain separate qualification work. The older [checkout Three guide](../three-host-api.md) preserves dated private-source examples and milestones.
