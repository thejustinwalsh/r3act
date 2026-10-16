# Public Three host (private alpha)

All authored native TSX requires `nativeModulePlugin()` from
`compiler/vite_native_plugin.ts`. It discovers native runtime imports and emits
owner/source plans and JavaScript. See `src/browser/native_three_host.tsx` for
an actual scene and `native-three-host.html` for its page.

## Root and ownership

```ts
import { Scene } from "three";
import { createWorld } from "./src/native_runtime_api.ts";
import { createThreeNativeRoot } from "./src/three_host.ts";

const scene = new Scene();
const world = createWorld();
const native = createThreeNativeRoot(scene, {
  rootOptions: { world, rootId: "my-scene" },
});
// In a compiled TSX module: native.root.mount(<MyScene />).
// Updates use ordinary JSX props and native state/store reads.
native.dispose();
```

The supplied Scene and renderer belong to the application. Root disposal releases
native owners, events, refs and host handles; full host disposal releases its
fallback assets as well. JSX-created geometry/material resources are owned and
disposed once. Resources passed in mesh args or primitive object props remain
borrowed. The caller disposes those assets when their shared lifetime ends.

Constructor `args`, primitive `object` and attachment identity are immutable for
a mounted element. Change its key to replace it. This deliberately differs from
R3F's automatic reconstruction. Resource children attach to geometry/material
(or the documented string `attach` property); replacement uses an attachment
stack so removing the previous child does not overwrite its replacement.

## Namespace constructors and inferred types

The default host resolves camelCase or PascalCase tags from the public Three
namespace and caches constructor resolution at mount. `Reflect.construct`
forwards `args`; no per-class factory list is maintained. A supplied `namespace`
replaces the default catalog. Legacy `registry` factory overrides remain supported.

```ts
class ProbeGroup extends THREE.Group {
  probeMode = 0;
  constructor(size: number) { super(); this.name = String(size); }
}
const native = createThreeNativeRoot(scene, {
  namespace: { ...THREE, ProbeGroup },
});
// Compiled TSX: <probeGroup args={[3]} probeMode={2} />
```

`ThreeIntrinsicElements<typeof catalog>` infers tags, constructor arguments,
instance data props and raw instance refs. Methods and readonly identity fields
are excluded. Required constructor arguments remain required. Use
`jsxImportSource: "@compiled-ui/runtime/three"` for the optional strict Three JSX
backend; custom namespaces can augment its `JSX.IntrinsicElements` with the
inferred map. The default cross-host JSX backend stays permissive.

The current lifecycle supports Object3D, BufferGeometry and Material instances;
textures, buffer attributes and other standalone resource classes need a further
attachment/lifetime contract. Namespace lookup does not promise every export is
renderable. Importing the full namespace may retain more of Three than generated
static imports. No static catalog generation or bundle improvement is claimed.

## Declarative frame props

Named native components can use numeric `useState` and ordinary intrinsic props
such as `rotation-y={phase * 0.42}`. Supported pure expressions compile to direct
writers. The workbench's KineticForm uses this path; its frame test asserts that
objects change while component render counts stay fixed. Unsupported expressions
may require an owner render. There is no blanket no-render promise.

Existing public data fields use generic writers. Dash paths traverse nested
objects, including indexed material arrays. Vector scalar/tuple/instance inputs,
Euler tuples/instances and Color representations preserve mutable value identity.
Removing a prop restores its captured default for the actual target. A replaced
material is resolved on subsequent writes, with separate defaults for each target.
Unknown fields, methods, unsafe paths and malformed numeric tuples are rejected.
Property paths are parsed once; nested target identity is resolved per write.

Projection-matrix invalidation remains an explicit camera policy. Constructor
replacement, attachment callbacks and full R3F event behavior remain unsupported.
The exported property registry contains reserved lifecycle policies; it is no
longer an exhaustive property inventory. Factory/property overrides are optional
escape hatches for custom semantics.

## Extension seam

```ts
const native = createThreeNativeRoot(scene, {
  registry: {
    probeGeometry(args) { return new ProbeGeometry(Number(args[0])); },
  },
  propertyWriters: {
    "probe-mode"(handle, value) {
      if (handle.kind !== "resource" || !(handle.resource instanceof ProbeGeometry)) {
        throw new TypeError("probe-mode requires ProbeGeometry");
      }
      handle.resource.mode = value == null ? "default" : String(value);
    },
  },
});
```

Factories return Object3D, BufferGeometry or Material. Custom writers own their
value validation and removal/reset behavior. Registration does not require
private reconciler access or a kernel edit. The exact compiled extension fixture
is `compiler/three_host_extension_execution_test.mjs`.

Refs expose raw Three instances after native publication, before effects;
unchanged refs stay attached. Callback cleanup and object.current are supported.
Animation in the example uses props, not ref mutations.

## Events and limits

The host stores handlers on explicit object targets. Pointer dispatch/raycast
helpers deliver intersection data and can carry a native event; there is no
ancestor bubbling. Hover/capture/missed-event policy and R3F event parity are not
claimed. The application owns DOM event listeners and renderer/camera bootstrap.

Host exceptions fail publication terminally; arbitrary GPU/object side effects
cannot be rolled back. Shared mutable Three resources are shared physical state:
writing their material props affects every consumer. Different root projections
cannot independently display contradictory values through the same mutable
material. Clone or independently own materials for that use; this is not a
proof of async isolation for arbitrary shared GPU resources.

React component/library compatibility, packaging, general performance superiority
and long-term maintenance results remain separate gates.

## Cleanup review follow-up — 12 October 2026

Sol's prerequisite review found that per-node cleanup discarded a caught Three
resource disposal exception. The current host surfaces those exceptions through
an `AggregateError`, while the native root continues attempting remaining
cleanup. A resource is marked released before calling its disposer, so repeated
root disposal does not retry a throwing disposer. Diagnostic disposal counts
measure attempts, not successful GPU resource release.

The actual Rust/OXC-compiled `CleanupScene` regression uses a throwing geometry
dispose listener and three other owned resources. It requires the original error
to reach the caller, all four disposal attempts, an empty scene, zero live handles,
resources and event registrations, and no repeated attempt on a second disposal.
The frozen Sol report and prior checkpoint describe the pre-fix source; this
follow-up does not change their observations or establish comparative maintenance.
